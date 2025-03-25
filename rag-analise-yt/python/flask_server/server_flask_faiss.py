# cd /home/emerson/projetos/chat-ollama-angular/rag-analise-yt/; ./run.sh
# ou
# cd /tmp/uv_environments; source my_env_3129/bin/activate
# uv run /home/emerson/projetos/chat-ollama-angular/rag-analise-yt/python/flask_server/server_flask_faiss.py

import sys
import os
import functools
from langchain_community.vectorstores import FAISS
from typing import List, Tuple, Dict, Optional

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from rag.rag import *
from bases_vetoriais.faiss_aux import *

class Configuracoes:
    configData:ConfigData = None

    docling_aux:DoclingAuxiliar = None
    doc_converter:DocumentConverter = None
    chunks_aux:ChunksAux = None
    faiss_auxiliar:FaissAuxiliar = None
    vectorstore:FAISS = None
    faiss_rag:FaissRAG = None
    separar_documentos:SepararDocumentos = None
    faiss_batch:FaissBatch = None

    def __init__(self, configData:ConfigData = None) -> None:
        self.configData = configData if configData is not None else ConfigData()
        if (self.configData is None): return
        if not os.path.exists(self.configData.PERSIST_DB_DIRECTORY): os.makedirs(self.configData.PERSIST_DB_DIRECTORY, exist_ok=True)
        if not os.path.exists(self.configData.UPLOAD_PATH_TEMP): os.makedirs(self.configData.UPLOAD_PATH_TEMP, exist_ok=True)

    def get_docling_aux(self) -> DoclingAuxiliar:
        if (self.docling_aux is not None): return self.docling_aux
        self.docling_aux = DoclingAuxiliar()
        return self.docling_aux

    def get_doc_converter(self) -> DocumentConverter:
        if (self.doc_converter is not None): return self.doc_converter
        self.doc_converter = self.get_docling_aux().get_doc_converter()
        return self.doc_converter

    def get_chunks_aux(self) -> ChunksAux:
        if (self.chunks_aux is not None): return self.chunks_aux
        self.chunks_aux = ChunksAux()
        return self.chunks_aux

    def get_faiss_auxiliar(self) -> FaissAuxiliar:
        if (self.faiss_auxiliar is not None): return self.faiss_auxiliar
        self.faiss_auxiliar = FaissAuxiliar(self.configData.EMBEDDING_MODEL_NAME, self.configData.PERSIST_DB_DIRECTORY)
        return self.faiss_auxiliar

    def get_vectorstore(self) -> FAISS:
        if (self.vectorstore is not None): return self.vectorstore
        self.vectorstore = self.get_faiss_auxiliar().get_vector_store()
        return self.vectorstore

    def get_faiss_rag(self) -> FaissRAG:
        if (self.faiss_rag is not None): return self.faiss_rag
        self.faiss_rag = FaissRAG(
            self.get_vectorstore(), 
            self.configData.QUERY_PROMPT,
            self.configData.EMBEDDING_MODEL_NAME,
            self.configData.PERSIST_DB_DIRECTORY,
            self.configData.LOCAL_MODEL
        )
        return self.faiss_rag

    def get_separar_documentos(self) -> SepararDocumentos:
        if (self.separar_documentos is not None): return self.separar_documentos
        self.separar_documentos = SepararDocumentos()
        return self.separar_documentos

    def get_faiss_batch(self) -> FaissBatch:
        if (self.faiss_batch is not None): return self.faiss_batch
        self.faiss_batch = FaissBatch(self.get_chunks_aux(), self.get_separar_documentos(), self.get_vectorstore())
        return self.faiss_batch

configuracoes:Configuracoes = Configuracoes(configData)

# ------------------------------
# FLASK
# ------------------------------
import concurrent.futures
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.datastructures import FileStorage

class FlaskServer:
    def __init__(self):
        self.app = Flask(__name__)
        CORS(self.app, resources={r"/*": {"origins": "*"}})
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)
        self.configuracoes = None
        
        # Configurar rotas
        self._setup_routes()
    
    def _setup_routes(self) -> None:
        """Configura todas as rotas do servidor Flask"""
        self.app.route('/configuracoes', methods=['POST'])(self.configuracoes_post)
        self.app.route('/doQuestion', methods=['GET'])(self.do_question_llm)
        self.app.route('/deleteFaiss', methods=['DELETE'])(self.delete_faiss)
        self.app.route('/status', methods=['GET'])(self.status_service)
        self.app.route('/statusIndexacao', methods=['GET'])(self.status_indexacao_func)
        self.app.route('/configuracaoAtual', methods=['GET'])(self.configuracao_atual)
        self.app.route('/upload', methods=['POST'])(self.upload_file)
        self.app.route('/', methods=['GET'])(self.index)
    
    def start_server(self, debug: bool = False, host: str = None, port: int = None) -> None:
        """Inicia o servidor Flask"""
        TorchInit().init_torch()
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
                if hasattr(configData, key.upper()):
                    setattr(configData, key.upper(), value)

            self.configuracoes = Configuracoes(configData)
            return jsonify({"success": True, "message": "Configurações salvas"}), 200
        except Exception as e:
            print(f"Erro ao processar configurações: {e}")
            return jsonify({"success": False, "message": f"Erro ao configurar o servidor: {e}"}), 400
    
    def _funcao_callback(self, future: concurrent.futures.Future) -> None:
        try:
            vectorstore: FAISS = future.result()
            if vectorstore is None: return
            self.configuracoes.get_faiss_auxiliar().persistir(vectorstore)
            print(f"Callback: Tarefa concluída com resultado: {vectorstore}")
        except Exception as e:
            print(f"Callback: Tarefa terminou com erro: {e}")
        finally:
            print("Callback: Ação pós-tarefa executada.")
    
    def _funcao_callback_arquivos(self, future: concurrent.futures.Future, caminhos_arquivos: List[str]) -> None:
        try:
            for caminho_arquivo in caminhos_arquivos:
                if os.path.exists(caminho_arquivo): os.remove(caminho_arquivo)

            vectorstore: FAISS = future.result()
            if vectorstore is None: return
            self.configuracoes.get_faiss_auxiliar().persistir(vectorstore)
            print(f"Callback: Tarefa concluída com resultado: {vectorstore}")
        except Exception as e:
            print(f"Callback: Tarefa terminou com erro: {e}")
        finally:
            print("Callback: Ação pós-tarefa executada.")
    
    def do_question_llm(self) -> Tuple[Dict[str, bool | str], int]:
        prompt: str = request.args.get('prompt')
        rt = "Nenhum parâmetro 'prompt' fornecido." if not prompt else self.configuracoes.get_faiss_rag().do_prompt(prompt)
        return jsonify({"success": True if prompt else False, "message": rt}), 400 if not prompt else 200
    
    def delete_faiss(self) -> Tuple[Dict[str, bool | str], int]:
        self.configuracoes.get_faiss_auxiliar().excluir_faiss()
        vectorstore = self.configuracoes.get_faiss_auxiliar().get_vector_store()
        return jsonify({"success": True, "message": "Faiss deleted successfully"}), 200
    
    def status_service(self) -> Tuple[Dict[str, bool | str], int]:
        return jsonify({"success": True, "message": "Serviço em execução"}), 200
    
    def status_indexacao_func(self) -> Tuple[Dict[str, bool | str], int]:
        return jsonify(self.configuracoes.get_faiss_batch().status_indexacao), 200
    
    def configuracao_atual(self) -> Tuple[Dict[str, bool | str], int]:
        config: ConfigData = self.configuracoes.configData
        config_dict = {
            'LANG': config.LANG,
            'PERSIST_DB_DIRECTORY': config.PERSIST_DB_DIRECTORY,
            'UPLOAD_PATH_TEMP': config.UPLOAD_PATH_TEMP,
            'LOCAL_MODEL': config.LOCAL_MODEL,
            'EMBEDDING_MODEL_NAME': config.EMBEDDING_MODEL_NAME,
            'ALLOWED_EXTENSIONS': list(config.ALLOWED_EXTENSIONS),
            'EXTENSOES_IMAGENS': list(config.EXTENSOES_IMAGENS)
        }
        return jsonify(config_dict), 200
    
    def allowed_file(self, filename: str) -> bool:
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in self.configuracoes.configData.ALLOWED_EXTENSIONS
    
    def upload_file(self) -> Tuple[Dict[str, bool | str], int]:
        if 'files' not in request.files:
            return jsonify({"success": False, "message": "Nenhum arquivo enviado"}), 400

        files: List[FileStorage] = request.files.getlist('files')
        for file in files:
            if file.filename == '': return jsonify({"success": False, "message": "Um ou mais arquivos sem nome"}), 400

        lista_caminhos_arquivos = self._salvar_arquivos_temp(files, self.configuracoes.configData.UPLOAD_PATH_TEMP)
        if (lista_caminhos_arquivos is None or len(lista_caminhos_arquivos) <= 0):
            return jsonify({"success": False, "message": "Sem arquivos válidos para indexação"}), 200

        callback_com_args = functools.partial(self._funcao_callback_arquivos, caminhos_arquivos=lista_caminhos_arquivos)
        future_indexacao = self.executor.submit(self.configuracoes.get_faiss_batch().faiss_indexing_files, lista_caminhos_arquivos)
        future_indexacao.add_done_callback(callback_com_args)

        return jsonify({"success": True, "message": "Indexação iniciada em segundo plano."}), 200
    
    def _salvar_arquivos_temp(self, files: List[FileStorage], path_temporario: str) -> Optional[List[str]]:
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
        config_string: str = str(configData)
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

            <h2>Delete Faiss</h2>
            <pre>curl -X DELETE "http://127.0.0.1:5000/deleteFaiss"</pre>
            
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


# Uso da classe
if __name__ == '__main__':
    server = FlaskServer()
    server.start_server(debug=False)


# Como executar
# cd /home/emerson/projetos/chat-ollama-angular/rag-analise-yt/; ./run.sh
# ou
# cd /tmp/uv_environments; source my_env_3129/bin/activate
# uv run /home/emerson/projetos/chat-ollama-angular/rag-analise-yt/python/flask_server/server_flask_faiss.py

# curls
#  deprecado: curl -X POST -H "Content-Type: text/plain" -d "D:\meus_documentos\workspace\ia\chat-ollama-angular\data" http://127.0.0.1:5000/indexarFaissdb
# curl -X POST \
#   -H "Content-Type: application/json" \
#   -d '{
#     "lang": "por",
#     "persist_db_directory": "/home/emerson/projetos/chat-ollama-angular/db",
#     "upload_path_temp": "/home/emerson/projetos/chat-ollama-angular/temp",
#     "local_model": "deepseek-r1",
#     "embedding_model_name": "nomic-embed-text",
#     "allowed_extensions": ["txt", "pdf", "png", "jpg", "jpeg", "gif", "html"]
#   }' \
#   http://127.0.0.1:5000/configuracoes
#  curl "http://127.0.0.1:5000/doQuestion?prompt=Como+jogar+monopoly+%3F"
#  curl -X DELETE "http://127.0.0.1:5000/deleteFaiss"
#  curl "http://127.0.0.1:5000/status"
#  curl http://127.0.0.1:5000/statusIndexacao
#  curl http://localhost:5000/configuracaoAtual
# upload
#  curl 'http://127.0.0.1:5000/upload' \
#    -H 'Accept: application/json, text/plain, */*' \
#    -H 'Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' \
#    -H 'Connection: keep-alive' \
#    -H 'Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryP9IhvgxGJbinBGj2' \
#    -H 'DNT: 1' \
#    -H 'Origin: http://localhost:4200' \
#    -H 'Referer: http://localhost:4200/' \
#    -H 'Sec-Fetch-Dest: empty' \
#    -H 'Sec-Fetch-Mode: cors' \
#    -H 'Sec-Fetch-Site: cross-site' \
#    -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36' \
#    -H 'sec-ch-ua: "Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"' \
#    -H 'sec-ch-ua-mobile: ?0' \
#    -H 'sec-ch-ua-platform: "Windows"' \
#    -H 'sec-gpc: 1' \
#    --data-raw $'------WebKitFormBoundaryP9IhvgxGJbinBGj2\r\nContent-Disposition: form-data; name="files"; filename="486377-2048x1310-desktop-hd-blade-runner-2049-background-photo.jpg"\r\nContent-Type: image/jpeg\r\n\r\n\r\n------WebKitFormBoundaryP9IhvgxGJbinBGj2--\r\n'