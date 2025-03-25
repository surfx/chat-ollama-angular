# cd /home/emerson/projetos/chat-ollama-angular/rag-analise-yt/; ./run.sh
# ou
# cd /tmp/uv_environments; source my_env_3129/bin/activate
# uv run /home/emerson/projetos/chat-ollama-angular/rag-analise-yt/python/flask_server/server_flask_faiss.py

import sys
import os
import functools

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

import rag_python_faiss as rpf


class Configuracoes:
    configData = None

    docling_aux = None
    doc_converter = None
    chunks_aux = None
    faiss_auxiliar = None
    vectorstore = None
    faiss_rag = None
    faiss_batch = None

    def __init__(self, configData: None):
        self.configData = configData if configData is not None else rpf.ConfigData()
        if not os.path.exists(self.configData.PERSIST_DB_DIRECTORY): os.makedirs(self.configData.PERSIST_DB_DIRECTORY, exist_ok=True)
        if not os.path.exists(self.configData.UPLOAD_PATH_TEMP): os.makedirs(self.configData.UPLOAD_PATH_TEMP, exist_ok=True)

    def get_docling_aux(self):
        if (self.docling_aux is not None): return self.docling_aux
        self.docling_aux = rpf.DoclingAuxiliar()
        return self.docling_aux

    def get_doc_converter(self):
        if (self.doc_converter is not None): return self.doc_converter
        self.doc_converter = self.get_docling_aux().get_doc_converter()
        return self.doc_converter

    def get_chunks_aux(self):
        if (self.chunks_aux is not None): return self.chunks_aux
        self.chunks_aux = rpf.ChunksAux()
        return self.chunks_aux

    def get_faiss_auxiliar(self):
        if (self.faiss_auxiliar is not None): return self.faiss_auxiliar
        self.faiss_auxiliar = rpf.FaissAuxiliar(self.configData.EMBEDDING_MODEL_NAME, self.configData.PERSIST_DB_DIRECTORY)
        return self.faiss_auxiliar

    def get_vectorstore(self):
        if (self.vectorstore is not None): return self.vectorstore
        self.vectorstore = self.get_faiss_auxiliar().get_vector_store()
        return self.vectorstore

    def get_faiss_rag(self):
        if (self.faiss_rag is not None): return self.faiss_rag
        self.faiss_rag = rpf.FaissRAG(
            self.get_vectorstore(), 
            self.configData.QUERY_PROMPT,
            self.configData.EMBEDDING_MODEL_NAME,
            self.configData.PERSIST_DB_DIRECTORY,
            self.configData.LOCAL_MODEL
        )
        return self.faiss_rag

    def get_faiss_batch(self):
        if (self.faiss_batch is not None): return self.faiss_batch
        self.faiss_batch = rpf.FaissBatch(vectorstore = 
            self.get_vectorstore()
        )
        return self.faiss_batch

configuracoes = Configuracoes(rpf.configData)

# ------------------------------
# FLASK
# ------------------------------
import concurrent.futures
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)  # Ajuste max_workers conforme necessário

# Configuracoes
@app.route('/configuracoes', methods=['POST'])
def configuracoes_post():
    config_data_json = request.get_json() # Obtém os dados JSON do corpo da requisição
    if not config_data_json: # Verifica se recebeu algum JSON válido
        return jsonify({"success": False, "message": "Erro ao receber configurações JSON"}), 400

    try:
        # Atualiza os atributos do objeto configData global
        for key, value in config_data_json.items():
            if hasattr(rpf.configData, key.upper()): # Verifica se o atributo existe em ConfigData (case-insensitive)
                setattr(rpf.configData, key.upper(), value) # Atualiza o atributo de configData

        # configuracoes = ConfigData(**config_data_json) # Instancia ConfigData com os dados do JSON
        # print("Configurações Recebidas:")
        # print(rpf.configData)

        configuracoes = Configuracoes(rpf.configData)

        return jsonify({"success": True, "message": "Configurações salvas"}), 200
    except Exception as e: # Captura erros na instanciação de ConfigData (ex: tipo de dado incorreto)
        print(f"Erro ao processar configurações: {e}")
        return jsonify({"success": False, "message": f"Erro ao configurar o servidor: {e}"}), 400


def funcao_callback(future):
    try:
        vectorstore = future.result()
        if vectorstore is None: return
        configuracoes.get_faiss_auxiliar().persistir(vectorstore)
        print(f"Callback: Tarefa concluída com resultado: {vectorstore}")
    except Exception as e:
        print(f"Callback: Tarefa terminou com erro: {e}")
    finally:
        print("Callback: Ação pós-tarefa executada.")

def funcao_callback_arquivos(future, caminhos_arquivos):
    try:
        for caminho_arquivo in caminhos_arquivos:
            if os.path.exists(caminho_arquivo): os.remove(caminho_arquivo)

        vectorstore = future.result()
        if vectorstore is None: return
        configuracoes.get_faiss_auxiliar().persistir(vectorstore)
        print(f"Callback: Tarefa concluída com resultado: {vectorstore}")
    except Exception as e:
        print(f"Callback: Tarefa terminou com erro: {e}")
    finally:
        print("Callback: Ação pós-tarefa executada.")

# Deprecado
# @app.route('/indexarFaissdb', methods=['POST'])
# def indexar_faissdb():
#     """
#     Indexa os arquivos de uma pasta no faiss db
#     """
#     path_arquivos = request.data.decode('utf-8')  # Obtém o corpo da requisição como string

#     if not path_arquivos: 
#         return jsonify({"success": False, "message": "Nenhum parâmetro 'path_arquivos' fornecido."}), 400
    
#     # vectorstore = faissAuxiliar.get_vector_store()
#     # faissBatch = rpf.FaissBatch(vectorstore=vectorstore)
#     # vectorstore = faissBatch.faiss_indexing(path_arquivos)

#     future_indexacao = executor.submit(faissBatch.faiss_indexing, path_arquivos)
#     future_indexacao.add_done_callback(funcao_callback)

#     return jsonify({"success": True, "message": "Indexação iniciada em segundo plano."}), 200

@app.route('/doQuestion', methods=['GET'])
def do_question_llm():
    prompt = request.args.get('prompt')
    rt = "Nenhum parâmetro 'prompt' fornecido." if not prompt else configuracoes.get_faiss_rag().do_prompt(prompt)
    return jsonify({"success": True if prompt else False, "message": rt}), 400 if not prompt else 200

@app.route('/deleteFaiss', methods=['DELETE'])
def delete_faiss():
    configuracoes.get_faiss_auxiliar().excluir_faiss()
    vectorstore = configuracoes.get_faiss_auxiliar().get_vector_store()
    return jsonify({"success": True, "message": "Faiss deleted successfully"}), 200

@app.route('/status', methods=['GET'])
def status_service():
    return jsonify({"success": True, "message": "Serviço em execução"}), 200

@app.route('/statusIndexacao', methods=['GET'])
def status_indexacao_func():
    return jsonify(configuracoes.get_faiss_batch().status_indexacao), 200

@app.route('/configuracaoAtual')
def configuracao_atual():
    config = configuracoes.configData
    config_dict = { # Manually convert to dictionary
        'LANG': config.LANG,
        'PERSIST_DB_DIRECTORY': config.PERSIST_DB_DIRECTORY,
        'UPLOAD_PATH_TEMP': config.UPLOAD_PATH_TEMP,
        'LOCAL_MODEL': config.LOCAL_MODEL,
        'EMBEDDING_MODEL_NAME': config.EMBEDDING_MODEL_NAME,
        'ALLOWED_EXTENSIONS': list(config.ALLOWED_EXTENSIONS),
        'EXTENSOES_IMAGENS': list(config.EXTENSOES_IMAGENS)
    }
    return jsonify(config_dict), 200 # jsonify the dictionary

# -----------------------------
# UPLOAD FILES
# -----------------------------
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in configuracoes.configData.ALLOWED_EXTENSIONS


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'files' not in request.files:
        return jsonify({"success": False, "message": "Nenhum arquivo enviado"}), 400

    files = request.files.getlist('files')
    for file in files:
        if file.filename == '': return jsonify({"success": False, "message": "Um ou mais arquivos sem nome"}), 400

    lista_caminhos_arquivos = salvar_arquivos_temp(files, configuracoes.configData.UPLOAD_PATH_TEMP)
    if (lista_caminhos_arquivos is None or len(lista_caminhos_arquivos) <= 0):
        return jsonify({"success": False, "message": "Sem arquivos válidos para indexação"}), 200

    callback_com_args = functools.partial(funcao_callback_arquivos, caminhos_arquivos=lista_caminhos_arquivos)
    future_indexacao = executor.submit(configuracoes.get_faiss_batch().faiss_indexing_files, lista_caminhos_arquivos)
    future_indexacao.add_done_callback(callback_com_args)

    return jsonify({"success": True, "message": "Indexação iniciada em segundo plano."}), 200

def salvar_arquivos_temp(files, path_temporario = configuracoes.configData.UPLOAD_PATH_TEMP):
    arquivos_salvos = []
    if files is None or path_temporario is None: return None

    for file in files:
        if file is None: continue
        filename = file.filename
        filepath = os.path.join(path_temporario, filename)
        file.save(filepath)
        arquivos_salvos.append(filepath)

    return arquivos_salvos

@app.route('/', methods=['GET'])
def index():
    config_string = str(rpf.configData) # Chama o __str__() para obter a representação da string
    html_content = f"""
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



if __name__ == '__main__':
    rpf.TorchInit().init_torch()
    # app.run(debug=True, host='0.0.0.0', port=5000)
    app.run(debug=True)


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