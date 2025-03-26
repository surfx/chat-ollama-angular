# -*- coding: latin-1 -*-
import os
import functools
from typing import List, Tuple, Dict, Optional
from auxiliar.db_vector.db_faiss.FaissIVectorStore import FaissAuxiliar, FaissIVectorStore, IVectorStore
from auxiliar.util.TorchInit import TorchInit
from auxiliar.util.ConfigData import ConfigData

from auxiliar.util.DoclingAuxiliar import DoclingAuxiliar
from auxiliar.util.SepararDocumentos import SepararDocumentos
from auxiliar.util.ChunksAux import ChunksAux, DocumentConverter
from consultas_rag.ConsultaRag import ConsultaRag
from indexacao.IndexarArquivos import IndexarArquivos


import concurrent.futures
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.datastructures import FileStorage

class FlaskServer:

    __start_torch = False
    __use_faiss = True
    __config_data:ConfigData = None
    __docling_auxiliar:DoclingAuxiliar = None
    __doc_converter:DocumentConverter = None
    __chunks_aux:ChunksAux = None
    __ivector_store:IVectorStore = None
    __indexar_arquivos:IndexarArquivos = None
    __consulta_rag:ConsultaRag = None

    def __create_class_dependencies(self)->None:
        if (self.__start_torch): TorchInit().init_torch()
        self.__config_data = ConfigData()

        if self.__use_faiss:
            self.__ivector_store = FaissIVectorStore(self.__config_data.EMBEDDING_MODEL_NAME, self.__config_data.PERSIST_DB_DIRECTORY)

        self.__docling_auxiliar = DoclingAuxiliar(self.__config_data.LANG)
        self.__doc_converter = self.__docling_auxiliar.get_doc_converter()
        self.__chunks_aux = ChunksAux(self.__doc_converter, self.__docling_auxiliar)
        self.__consulta_rag = ConsultaRag(self.__ivector_store, self.__config_data.QUERY_PROMPT, self.__config_data.LOCAL_MODEL)
        self.__indexar_arquivos = IndexarArquivos(self.__chunks_aux, self.__ivector_store)

    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app, resources={r"/*": {"origins": "*"}})
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)
        self.configuracoes = None
        
        self.__create_class_dependencies()
        # Configurar rotas
        self.__setup_routes()

    
    def __setup_routes(self) -> None:
        """Configura todas as rotas do servidor Flask"""
        self.app.route('/configuracoes', methods=['POST'])(self.configuracoes_post)
        self.app.route('/doQuestion', methods=['GET'])(self.do_question_llm)
        self.app.route('/deleteDb', methods=['DELETE'])(self.delete_db)
        self.app.route('/status', methods=['GET'])(self.status_service)
        self.app.route('/statusIndexacao', methods=['GET'])(self.status_indexacao_func)
        self.app.route('/configuracaoAtual', methods=['GET'])(self.configuracao_atual)
        self.app.route('/upload', methods=['POST'])(self.upload_file)
        self.app.route('/', methods=['GET'])(self.index)
    
    def start_server(self, debug: bool = False, host: str = None, port: int = None) -> None:
        """Inicia o servidor Flask"""
        if host and port:
            self.app.run(debug=debug, host=host, port=port)
        else:
            self.app.run(debug=debug)
    
    # Métodos das rotas
    def configuracoes_post(self) -> Tuple[Dict[str, bool | str], int]:
        config_data_json = request.get_json()
        if not config_data_json:
            return jsonify({"success": False, "message": "Erro ao receber configurações JSON"}), 400

        try:
            for key, value in config_data_json.items():
                if hasattr(self.__config_data, key.upper()):
                    setattr(self.__config_data, key.upper(), value)

            return jsonify({"success": True, "message": "Configurações atribuídas"}), 200
        except Exception as e:
            print(f"Erro ao processar configurações: {e}")
            return jsonify({"success": False, "message": f"Erro ao configurar o servidor: {e}"}), 400
    
    def __funcao_callback(self, future: concurrent.futures.Future) -> None:
        try:
            vectorstore: IVectorStore = future.result()
            if vectorstore is None: return
            vectorstore.persistir()
            print(f"Callback: Tarefa concluída com resultado: {vectorstore}")
        except Exception as e:
            print(f"Callback: Tarefa terminou com erro: {e}")
        finally:
            print("Callback: Ação pós-tarefa executada.")
    
    def __funcao_callback_arquivos(self, future: concurrent.futures.Future, caminhos_arquivos: list[str]) -> None:
        try:
            for caminho_arquivo in caminhos_arquivos:
                if os.path.exists(caminho_arquivo): os.remove(caminho_arquivo)

            vectorstore: IVectorStore = future.result()
            if vectorstore is None: return
            vectorstore.persistir()
            print(f"Callback: Tarefa concluída com resultado: {vectorstore}")
        except Exception as e:
            print(f"Callback: Tarefa terminou com erro: {e}")
        finally:
            print("Callback: Ação pós-tarefa executada.")
    
    def do_question_llm(self) -> Tuple[Dict[str, bool | str], int]:
        prompt: str = request.args.get('prompt')
        rt = "Nenhum parâmetro 'prompt' fornecido." if not prompt else self.__consulta_rag.do_prompt(prompt)
        return jsonify({"success": True if prompt else False, "message": rt}), 400 if not prompt else 200
    
    def delete_db(self) -> Tuple[Dict[str, bool | str], int]:
        self.__ivector_store.excluir_db()
        return jsonify({"success": True, "message": "Db deleted successfully"}), 200
    
    def status_service(self) -> Tuple[Dict[str, bool | str], int]:
        return jsonify({"success": True, "message": "Serviço em execução"}), 200
    
    def status_indexacao_func(self) -> Tuple[Dict[str, bool | str], int]:
        return jsonify(self.__indexar_arquivos.status_indexacao), 200
    
    def configuracao_atual(self) -> Tuple[Dict[str, bool | str], int]:
        config_dict = {
            'LANG': self.__config_data.LANG,
            'PERSIST_DB_DIRECTORY': self.__config_data.PERSIST_DB_DIRECTORY,
            'UPLOAD_PATH_TEMP': self.__config_data.UPLOAD_PATH_TEMP,
            'LOCAL_MODEL': self.__config_data.LOCAL_MODEL,
            'EMBEDDING_MODEL_NAME': self.__config_data.EMBEDDING_MODEL_NAME,
            'ALLOWED_EXTENSIONS': list(self.__config_data.ALLOWED_EXTENSIONS),
            'EXTENSOES_IMAGENS': list(self.__config_data.EXTENSOES_IMAGENS)
        }
        return jsonify(config_dict), 200
    
    def allowed_file(self, filename: str) -> bool:
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in self.__config_data.ALLOWED_EXTENSIONS
    
    def upload_file(self) -> Tuple[Dict[str, bool | str], int]:
        if 'files' not in request.files:
            return jsonify({"success": False, "message": "Nenhum arquivo enviado"}), 400

        files: list[FileStorage] = request.files.getlist('files')
        for file in files:
            if file.filename == '': return jsonify({"success": False, "message": "Um ou mais arquivos sem nome"}), 400

        lista_caminhos_arquivos = self._salvar_arquivos_temp(files, self.__config_data.UPLOAD_PATH_TEMP)
        if (lista_caminhos_arquivos is None or len(lista_caminhos_arquivos) <= 0):
            return jsonify({"success": False, "message": "Sem arquivos válidos para indexação"}), 200

        callback_com_args = functools.partial(self.__funcao_callback_arquivos, caminhos_arquivos=lista_caminhos_arquivos)
        future_indexacao = self.executor.submit(self.__indexar_arquivos.indexing_files, lista_caminhos_arquivos, self.__config_data.EXTENSOES_IMAGENS, self.__config_data.LANG, True)
        future_indexacao.add_done_callback(callback_com_args)

        return jsonify({"success": True, "message": "Indexação iniciada em segundo plano."}), 200
    
    def _salvar_arquivos_temp(self, files: list[FileStorage], path_temporario: str) -> Optional[List[str]]:
        arquivos_salvos: List[str] = []
        if files is None or path_temporario is None: return None

        for file in files:
            if file is None: continue
            filename = file.filename
            filepath = os.path.join(path_temporario, filename)
            file.save(filepath)
            arquivos_salvos.append(filepath)

        return arquivos_salvos
    
    def index(self) -> str:
        config_string: str = str(self.__config_data)
        html_content: str = f"""
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>Service Flask docling RAG</title>
        </head>
        <body>
            <h1>Flask server</h1>
            <a href="https://github.com/surfx/chat-ollama-angular" target="_blank">Projeto Git chat-ollama-angular</a>
            
            <h2>Rag query</h2>
            <pre>curl "http://127.0.0.1:5000/doQuestion?prompt=Como+jogar+monopoly+%3F"</pre>

            <h2>Delete Db</h2>
            <pre>curl -X DELETE "http://127.0.0.1:5000/deleteDb"</pre>
            
            <h2>Status</h2>
            <pre>curl "http://127.0.0.1:5000/status"</pre>

            <h2>Status indexação (polling)</h2>
            <pre>curl http://127.0.0.1:5000/statusIndexacao</pre>

            <h2>Configuração Atual</h2>
            <pre>curl http://localhost:5000/configuracaoAtual</pre>
            
            <h2>Update Config</h2>
            <pre>
curl -X POST \
-H "Content-Type: application/json" \
-d '{{
    "query_prompt": "novo query prompt...",
    "lang": "por",
    "persist_db_directory": "/home/emerson/projetos/chat-ollama-angular/db",
    "upload_path_temp": "/home/emerson/projetos/chat-ollama-angular/temp",
    "local_model": "deepseek-r1",
    "embedding_model_name": "nomic-embed-text",
    "allowed_extensions": ["txt", "pdf", "png", "jpg", "jpeg", "gif", "html"],
    "extensoes_imagens": [".jpg", ".jpeg", ".png", ".gif", ".bmp"]
}}' \
http://127.0.0.1:5000/configuracoes
            </pre>

            <h2>Upload example</h2>
            <pre>
curl 'http://127.0.0.1:5000/upload' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryP9IhvgxGJbinBGj2' \
  -H 'DNT: 1' \
  -H 'Origin: http://localhost:4200' \
  -H 'Referer: http://localhost:4200/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: cross-site' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-gpc: 1' \
  --data-raw $'------WebKitFormBoundaryP9IhvgxGJbinBGj2\r\nContent-Disposition: form-data; name="files"; filename="486377-2048x1310-desktop-hd-blade-runner-2049-background-photo.jpg"\r\nContent-Type: image/jpeg\r\n\r\n\r\n------WebKitFormBoundaryP9IhvgxGJbinBGj2--\r\n'
            </pre>

            <h2>Configuração Atual</h2>
            <pre>{config_string}</pre>
        </body>
        </html>
        """
        return html_content