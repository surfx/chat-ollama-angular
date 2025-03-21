# E: && cd E:\programas\ia\virtual_environment && my_env_3129\Scripts\activate
# uv run "D:\meus_documentos\workspace\ia\chat-ollama-angular\rag-analise-yt\python\flask_server\server_flask_faiss.py"

import sys
import os
import functools

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

import rag_python_faiss as rpf

LANG = "por" # por | eng
# Diretório onde o banco de dados será salvo
persist_directory = r"/home/emerson/projetos/chat-ollama-angular/db"
local_model = "deepseek-r1" # deepseek-r1 | llama3.2
embedding_model_name = 'nomic-embed-text' # nomic-embed-text | llama3

# ------------------------------
# FLASK
# ------------------------------
import concurrent.futures
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)  # Ajuste max_workers conforme necessário

faissAuxiliar = rpf.FaissAuxiliar(embedding_model_name, persist_directory)
vectorstore = faissAuxiliar.get_vector_store()
faissRAG = rpf.FaissRAG(vectorstore, embedding_model_name, persist_directory, local_model)
faissBatch = rpf.FaissBatch(vectorstore=vectorstore)

def funcao_callback(future):
    try:
        vectorstore = future.result()
        if vectorstore is None: return
        faissAuxiliar.persistir(vectorstore)
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
        faissAuxiliar.persistir(vectorstore)
        print(f"Callback: Tarefa concluída com resultado: {vectorstore}")
    except Exception as e:
        print(f"Callback: Tarefa terminou com erro: {e}")
    finally:
        print("Callback: Ação pós-tarefa executada.")

@app.route('/indexarFaissdb', methods=['POST'])
def indexar_faissdb():
    """
    Indexa os arquivos de uma pasta no faiss db
    """
    path_arquivos = request.data.decode('utf-8')  # Obtém o corpo da requisição como string

    if not path_arquivos: 
        return jsonify({"success": False, "message": "Nenhum parâmetro 'path_arquivos' fornecido."}), 400
    
    # vectorstore = faissAuxiliar.get_vector_store()
    # faissBatch = rpf.FaissBatch(vectorstore=vectorstore)
    # vectorstore = faissBatch.faiss_indexing(path_arquivos)

    future_indexacao = executor.submit(faissBatch.faiss_indexing, path_arquivos)
    future_indexacao.add_done_callback(funcao_callback)

    return jsonify({"success": True, "message": "Indexação iniciada em segundo plano."}), 200

@app.route('/doQuestion', methods=['GET'])
def do_question_llm():
    prompt = request.args.get('prompt')
    rt = "Nenhum parâmetro 'prompt' fornecido." if not prompt else faissRAG.do_prompt(prompt)
    return jsonify({"success": True, "message": rt}), 400 if not prompt else 200

@app.route('/deleteFaiss', methods=['DELETE'])
def delete_faiss():
    faissAuxiliar.excluir_faiss()
    vectorstore = faissAuxiliar.get_vector_store()
    return jsonify({"success": True, "message": "Faiss deleted successfully"}), 200

@app.route('/status', methods=['GET'])
def status_service():
    return jsonify({"success": True, "message": "Serviço em execução"}), 200

@app.route('/statusIndexacao', methods=['GET'])
def status_indexacao_func():
    return jsonify(faissBatch.status_indexacao), 200

# -----------------------------
# TESTE UPLOAD
# -----------------------------
UPLOAD_FOLDER = r"/home/emerson/projetos/chat-ollama-angular/temp"  # Pasta onde os arquivos serão salvos no servidor
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'html'} # Extensões permitidas (opcional)

# Certifique-se de que a pasta de uploads exista
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

docling_aux = rpf.DoclingAuxiliar()
doc_converter = docling_aux.get_doc_converter()

chunksAux = rpf.ChunksAux()

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'files' not in request.files:
        return jsonify({"success": False, "message": "Nenhum arquivo enviado"}), 400

    files = request.files.getlist('files')
    for file in files:
        if file.filename == '': return jsonify({"success": False, "message": "Um ou mais arquivos sem nome"}), 400

    lista_caminhos_arquivos = salvar_arquivos_temp(files, UPLOAD_FOLDER)
    if (lista_caminhos_arquivos is None or len(lista_caminhos_arquivos) <= 0):
        return jsonify({"success": False, "message": "Sem arquivos válidos para indexação"}), 200

    callback_com_args = functools.partial(funcao_callback_arquivos, caminhos_arquivos=lista_caminhos_arquivos)
    future_indexacao = executor.submit(faissBatch.faiss_indexing_files, lista_caminhos_arquivos)
    future_indexacao.add_done_callback(callback_com_args)

    return jsonify({"success": True, "message": "Indexação iniciada em segundo plano."}), 200

def salvar_arquivos_temp(files, path_temporario = UPLOAD_FOLDER):
    arquivos_salvos = []
    if files is None or path_temporario is None: return None

    for file in files:
        if file is None: continue
        filename = file.filename
        filepath = os.path.join(path_temporario, filename)
        file.save(filepath)
        arquivos_salvos.append(filepath)

    return arquivos_salvos

if __name__ == '__main__':
    rpf.TorchInit().init_torch()
    # app.run(debug=True, host='0.0.0.0', port=5000)
    app.run(debug=True)


# Como executar
# E: && cd E:\programas\ia\virtual_environment && my_env_3129\Scripts\activate
# uv run "D:\meus_documentos\workspace\ia\chat-ollama-angular\rag-analise-yt\python\flask_server\server_flask_faiss.py"

# curls
#  curl -X POST -H "Content-Type: text/plain" -d "D:\meus_documentos\workspace\ia\chat-ollama-angular\data" http://127.0.0.1:5000/indexarFaissdb
#  curl "http://127.0.0.1:5000/doQuestion?prompt=Como+jogar+monopoly+%3F"
#  curl -X DELETE "http://127.0.0.1:5000/deleteFaiss"
#  curl "http://127.0.0.1:5000/status"
#  curl http://127.0.0.1:5000/statusIndexacao