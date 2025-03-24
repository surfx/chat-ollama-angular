# cd /home/emerson/projetos/chat-ollama-angular/rag-analise-yt/; ./run.sh
# ou
# cd /tmp/uv_environments; source my_env_3129/bin/activate
# uv run /home/emerson/projetos/chat-ollama-angular/rag-analise-yt/python/flask_server/server_flask_faiss.py

import os
import faiss
from langchain_community.vectorstores import FAISS
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_ollama import OllamaEmbeddings

class ConfigData:
    LANG = "por" # por | eng
    # Diretório onde o banco de dados será salvo
    PERSIST_DB_DIRECTORY = r"/home/emerson/projetos/chat-ollama-angular/db"
    UPLOAD_PATH_TEMP = r"/home/emerson/projetos/chat-ollama-angular/temp"  # Pasta onde os arquivos serão salvos no servidor

    LOCAL_MODEL = "deepseek-r1" # deepseek-r1 | llama3.2
    EMBEDDING_MODEL_NAME = 'nomic-embed-text' # nomic-embed-text | llama3

    ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'html'} # Extensões permitidas (opcional)
    EXTENSOES_IMAGENS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'] # Adicione outras extensões se necessário

    def __init__(self,
                 lang=LANG,
                 persist_db_directory=PERSIST_DB_DIRECTORY,
                 upload_path_temp=UPLOAD_PATH_TEMP,
                 local_model=LOCAL_MODEL,
                 embedding_model_name=EMBEDDING_MODEL_NAME,
                 allowed_extensions=ALLOWED_EXTENSIONS,
                 extensoes_imagens=EXTENSOES_IMAGENS):
        self.LANG = lang
        self.PERSIST_DB_DIRECTORY = persist_db_directory
        self.UPLOAD_PATH_TEMP = upload_path_temp
        self.LOCAL_MODEL = local_model
        self.EMBEDDING_MODEL_NAME = embedding_model_name
        self.ALLOWED_EXTENSIONS = set(allowed_extensions)
        self.EXTENSOES_IMAGENS = set(extensoes_imagens)

        if not os.path.exists(self.PERSIST_DB_DIRECTORY): os.makedirs(self.PERSIST_DB_DIRECTORY, exist_ok=True)
        if not os.path.exists(self.UPLOAD_PATH_TEMP): os.makedirs(self.UPLOAD_PATH_TEMP, exist_ok=True)

    def __str__(self):
        return (f"ConfigData(\n"
                f"  LANG='{self.LANG}',\n"
                f"  PERSIST_DB_DIRECTORY='{self.PERSIST_DB_DIRECTORY}',\n"
                f"  UPLOAD_PATH_TEMP='{self.UPLOAD_PATH_TEMP}',\n"
                f"  LOCAL_MODEL='{self.LOCAL_MODEL}',\n"
                f"  EMBEDDING_MODEL_NAME='{self.EMBEDDING_MODEL_NAME}',\n"
                f"  ALLOWED_EXTENSIONS={self.ALLOWED_EXTENSIONS}\n"
                f"  EXTENSOES_IMAGENS={self.EXTENSOES_IMAGENS}\n"
                f")")

configData = ConfigData()

#region torch
import torch

class TorchInit:

    def __init__(self):
        pass

    def init_torch(self):
        # setting device on GPU if available, else CPU
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print('Using device:', device)
        print()

        #Additional Info when using cuda
        if device.type == 'cuda':
            print(torch.cuda.get_device_name(0))
            print('Memory Usage:')
            print('Allocated:', round(torch.cuda.memory_allocated(0)/1024**3,1), 'GB')
            print('Cached:   ', round(torch.cuda.memory_reserved(0)/1024**3,1), 'GB')
        return device

# TorchInit().init_torch()
#endregion

#region faiss
class FaissAuxiliar:

    embedding_model = None
    persist_directory = ''

    def __init__(self, embedding_model_name, persist_directory):
        self.embedding_model = OllamaEmbeddings(model=embedding_model_name)
        self.persist_directory = persist_directory

    def persistir(self, vectorstore):
        vectorstore.save_local(self.persist_directory)

    def get_vector_store(self):
        index_file = os.path.join(self.persist_directory, "index.faiss") # Nome padrão do arquivo de índice FAISS
        if os.path.exists(index_file): # Verifica se o arquivo de índice FAISS existe
            return FAISS.load_local(self.persist_directory, self.embedding_model, allow_dangerous_deserialization=True)
        else:
            # 1. Obtenha a dimensão do embedding
            example_embedding = self.embedding_model.embed_query("texto de exemplo") # Use um texto de exemplo para obter um embedding
            embedding_dimension = len(example_embedding)

            # 2. Crie um índice FAISS vazio com a dimensão correta
            faiss_index = faiss.IndexFlatL2(embedding_dimension) # IndexFlatL2 é um índice FAISS comum

            # 3. Inicialize FAISS da Langchain com o índice FAISS vazio
            vectorstore = FAISS(
                embedding_function=self.embedding_model,    # 1. embedding_function
                index=faiss_index,                          # 2. index
                docstore=InMemoryDocstore(),                # 3. docstore (using InMemoryDocstore for clarity)
                index_to_docstore_id={},                    # 4. index_to_docstore_id
            )
            vectorstore.save_local(self.persist_directory)
            # print(f"Nova base FAISS vazia criada e salva em: {persist_directory}")
            return vectorstore

    def excluir_faiss(self):
        index_file = os.path.join(self.persist_directory, "index.faiss") # Nome padrão do arquivo de índice FAISS
        if os.path.exists(index_file):
            os.remove(index_file)

        index_pkl = os.path.join(self.persist_directory, "index.pkl") # Nome padrão do arquivo de pkl FAISS
        if os.path.exists(index_pkl):
            os.remove(index_pkl)

#vectorstore = FaissAuxiliar(embedding_model_name, persist_directory)
#endregion

#region docling

from docling.datamodel.base_models import InputFormat
from docling_core.types.doc import ImageRefMode
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions, TableFormerMode, EasyOcrOptions, TesseractOcrOptions, OcrMacOptions
from docling.datamodel.settings import settings

class DoclingAuxiliar:

    IMAGE_RESOLUTION_SCALE = 2.0
    doc_converter = None

    def __init__(self):
        pass

    def get_doc_converter(self):
        if (self.doc_converter is not None): return self.doc_converter
        # Define pipeline options for PDF processing
        pipeline_options = PdfPipelineOptions(
            do_table_structure=True,  # Enable table structure detection
            do_ocr=True,  # Enable OCR
            # full page ocr and language selection
            #ocr_options=EasyOcrOptions(force_full_page_ocr=True, lang=["en"]),  # Use EasyOCR for OCR
            ocr_options=TesseractOcrOptions(force_full_page_ocr=True, lang=[configData.LANG]),  # Uncomment to use Tesseract for OCR
            #ocr_options = OcrMacOptions(force_full_page_ocr=True, lang=['en-US']),
            table_structure_options=dict(
                do_cell_matching=False,  # Use text cells predicted from table structure model
                mode=TableFormerMode.ACCURATE  # Use more accurate TableFormer model
            ),
            generate_page_images=True,  # Enable page image generation
            generate_picture_images=True,  # Enable picture image generation
            images_scale=self.IMAGE_RESOLUTION_SCALE, # Set image resolution scale (scale=1 corresponds to a standard 72 DPI image)
        )

        # Initialize the DocumentConverter with the specified pipeline options
        self.doc_converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )
        return self.doc_converter

    def convert_file(self, caminho_arquivo):
        if (caminho_arquivo is None): return None
        if (self.doc_converter is None): self.doc_converter = self.get_doc_converter()
        if (self.doc_converter is None): return None

        try:
            return self.doc_converter.convert(caminho_arquivo)
        except Exception as e:
            print(f"Erro ao converter com arquivo temporário: {e}")
        finally:
            try:
                if os.path.exists: os.remove(caminho_arquivo)
            except Exception as e:
                print(f"Erro ao deletar arquivo '{caminho_arquivo}': {e}")
        return None

# DoclingAuxiliar().get_doc_converter()
#endregion

import os

class SepararDocumentos:

    def __init__(self):
        pass

    def separar_arquivos(self, diretorio):
        """
        Varre um diretório e suas subpastas, separando arquivos de imagem de outros tipos de arquivo.

        Args:
            diretorio (str): O caminho do diretório a ser varrido.

        Returns:
            tuple: Uma tupla contendo duas listas: imagens e documentos.
        """

        imagens = []
        documentos = []

        for raiz, subpastas, arquivos in os.walk(diretorio):
            for arquivo in arquivos:
                caminho_arquivo = os.path.join(raiz, arquivo)
                nome_arquivo, extensao = os.path.splitext(arquivo)
                extensao = extensao.lower()

                if extensao in configData.EXTENSOES_IMAGENS:
                    imagens.append(caminho_arquivo) #adiciona o caminho completo
                else:
                    documentos.append(caminho_arquivo) #adiciona o caminho completo

        return imagens, documentos

#imagens, documentos = SepararDocumentos().separar_arquivos(PATH_ARQUIVOS)

# print("Imagens:")
#for imagem in imagens: print(imagem)

# print("\nDocumentos:")
# for documento in documentos: print(documento)


from pathlib import Path
from langchain_ollama import OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma

# display(result.document.export_to_markdown())
from langchain_core.documents import Document

# img
import pytesseract
from PIL import Image
#pytesseract.pytesseract.tesseract_cmd = r"E:\programas\ia\Tesseract-OCR\tesseract.exe"
#end img

class ChunksAux:

    docling_aux = DoclingAuxiliar()

    # DoclingAuxiliar().get_doc_converter()
    def __init__(self, doc_converter_global = None):
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=7500, chunk_overlap=100)
        self.doc_converter_global = doc_converter_global if doc_converter_global is not None else self.docling_aux.get_doc_converter()

    #local_path = r"data\pdfs\monopoly.pdf"
    def get_chunks_doc(self, local_path):
        if (local_path is None): return None
        result = self.doc_converter_global.convert(Path(local_path))
        documento = Document(page_content=result.document.export_to_markdown(image_mode=ImageRefMode.EMBEDDED), metadata={"source": local_path})
        chunks = self.text_splitter.split_documents([documento])
        return chunks

    def get_chunks_doc_file(self, caminho_arquivo):
        if (caminho_arquivo is None or not os.path.exists(caminho_arquivo)): return None
        result = self.docling_aux.convert_file(caminho_arquivo)
        documento = Document(page_content=result.document.export_to_markdown(image_mode=ImageRefMode.EMBEDDED), metadata={"source": caminho_arquivo})
        chunks = self.text_splitter.split_documents([documento])
        return chunks

    def get_chunks_image(self, local_path):
        if (local_path is None): return None
        image = Image.open(local_path)
        extracted_text = pytesseract.image_to_string(image, lang=configData.LANG)

        documento = Document(page_content=extracted_text, metadata={"source": local_path})
        chunks = self.text_splitter.split_documents([documento])
        return chunks
    
    def get_chunks_image_file(self, caminho_arquivo, lang=configData.LANG):
        if (caminho_arquivo is None or not os.path.exists(caminho_arquivo)): return None

        try:
            extracted_text = pytesseract.image_to_string(caminho_arquivo, lang=lang)
            documento = Document(page_content=extracted_text, metadata={"source": caminho_arquivo})
            chunks = self.text_splitter.split_documents([documento])
            return chunks
        except Exception as e:
            print(f"Erro ao converter com arquivo temporário: {e}")
        finally:
            try:
                os.remove(caminho_arquivo)
            except Exception as e:
                print(f"Erro ao deletar arquivo '{caminho_arquivo}': {e}")
        return None

    def get_chunks_file(self, caminho_arquivo, lang=configData.LANG):
        _, extensao = os.path.splitext(caminho_arquivo)
        return self.get_chunks_image_file(caminho_arquivo, lang) \
                if extensao in configData.EXTENSOES_IMAGENS else \
                self.get_chunks_doc_file(caminho_arquivo)



import hashlib
import os
from langchain_community.vectorstores import FAISS
from langchain.docstore.document import Document
#from langchain_community.embeddings import OllamaEmbeddings
# from langchain_ollama import OllamaEmbeddings 
# from pathlib import Path
import traceback

class FaissBatch:

    status_indexacao = {
        "terminado": False,
        "porcentagem": 0.0
    }

    # embedding_model = OllamaEmbeddings(model="nomic-embed-text")
    # vectorstore = get_vector_store()

    def __init__(self, vectorstore=None, embedding_model_name=None, persist_directory=None):
        if vectorstore is not None:
            self.vectorstore = vectorstore
        elif embedding_model_name is not None and persist_directory is not None:
            self.vectorstore = FaissAuxiliar(embedding_model_name, persist_directory)
        else:
            raise ValueError("Você deve fornecer 'vectorstore' ou 'embedding_model_name' e 'persist_directory'.")

        doc_converter_global = DoclingAuxiliar().get_doc_converter()
        self.chunkAux = ChunksAux(doc_converter_global)
        self.separarDocumentos = SepararDocumentos()
        
        self.status_indexacao["porcentagem"] = 0
        self.status_indexacao["terminado"] = False

    def generate_id_filename(self, filename, page_index):
        filename = os.path.basename(filename)
        base_id = hashlib.sha256(filename.encode()).hexdigest()
        return f"{base_id}_{page_index}"    

    def generate_id(self, document, page_index):
        """Gera um ID único baseado no nome do arquivo e no índice da página."""
        source = document.metadata['source']
        return self.generate_id_filename(os.path.basename(source), page_index)


    # def faiss_indexing(
    #     self,
    #     path_arquivos=PATH_ARQUIVOS
    # ):
    #     """Indexa chunks em lote no FAISS."""

    #     self.status_indexacao["porcentagem"] = 0
    #     self.status_indexacao["terminado"] = False

    #     imagens, documentos = self.separarDocumentos.separar_arquivos(path_arquivos)
    #     total_arquivos = len(imagens) + len(documentos)
    #     arquivos_processados = 0

    #     for imagem in imagens:
    #         id_aux = self.generate_id_filename(imagem, 0)
    #         results = self.vectorstore.get_by_ids([id_aux]);
    #         if results and results[0].id and id_aux in results[0].id:
    #             print(f"Documento com ID {id_aux} | {os.path.basename(imagem)} já existe na coleção.")

    #             arquivos_processados += 1
    #             self.status_indexacao["porcentagem"] = int((arquivos_processados / total_arquivos) * 100)
    #             continue

    #         self.faiss_indexing_batch(imagem, self.chunkAux.get_chunks_image(imagem))
    #         arquivos_processados += 1
    #         self.status_indexacao["porcentagem"] = int((arquivos_processados / total_arquivos) * 100)

    #     for documento in documentos:
    #         id_aux = self.generate_id_filename(documento, 0)
    #         results = self.vectorstore.get_by_ids([id_aux]);
    #         if results and results[0].id and id_aux in results[0].id:
    #             print(f"Documento com ID {id_aux} | {os.path.basename(documento)} já existe na coleção.")

    #             arquivos_processados += 1
    #             self.status_indexacao["porcentagem"] = int((arquivos_processados / total_arquivos) * 100)
    #             continue

    #         self.faiss_indexing_batch(documento, self.chunkAux.get_chunks_doc(documento))
    #         arquivos_processados += 1
    #         self.status_indexacao["porcentagem"] = int((arquivos_processados / total_arquivos) * 100)

    #     self.status_indexacao["porcentagem"] = 100
    #     self.status_indexacao["terminado"] = True
    #     return self.vectorstore
    
    def faiss_indexing_files(self, lista_caminhos_arquivos):
        if (lista_caminhos_arquivos is None or len(lista_caminhos_arquivos) <= 0): return self.vectorstore

        total_arquivos = len(lista_caminhos_arquivos)
        arquivos_processados = 0

        try:
            for caminho_arquivo in lista_caminhos_arquivos:
                filename = os.path.basename(caminho_arquivo) if caminho_arquivo != '' else ''
                if caminho_arquivo == '' or filename == '': continue
                filename = filename.lower()
                document_id = self.generate_id_filename(filename, 0)
                results = self.vectorstore.get_by_ids([document_id]);

                if results and results[0].id and document_id in results[0].id:
                    print(f"Documento com ID {document_id} | {filename} já existe na coleção.")
                    if os.path.exists(caminho_arquivo): os.remove(caminho_arquivo)

                    arquivos_processados += 1
                    self.status_indexacao["porcentagem"] = int((arquivos_processados / total_arquivos) * 100)
                    continue

                self.faiss_indexing_batch(filename, self.chunkAux.get_chunks_file(caminho_arquivo))
                arquivos_processados += 1
                self.status_indexacao["porcentagem"] = int((arquivos_processados / total_arquivos) * 100)
                if os.path.exists(caminho_arquivo): os.remove(caminho_arquivo)

            self.status_indexacao["porcentagem"] = 100
            self.status_indexacao["terminado"] = True
        except Exception:
            print('-----------------------------')
            traceback.print_exc()
            print('-----------------------------')
            self.status_indexacao["terminado"] = True

        self.status_indexacao["porcentagem"] = 100
        self.status_indexacao["terminado"] = True
        return self.vectorstore


    def faiss_indexing_batch(self, filename, chunks):
        """Indexa chunks em lote no FAISS db."""

        if not chunks or not self.vectorstore:
            print('Sem chunks e/ou vectorstore is null')
            return

        documents_to_add = []
        ids_to_add = []
        # embeddings_to_add = []
        # metadatas_to_add = []

        for i, chunk in enumerate(chunks):
            document_id = self.generate_id_filename(filename, i)

            results = self.vectorstore.get_by_ids([document_id]);
            if results and results[0].id and document_id in results[0].id:
                print(f"Documento com ID {document_id} já existe na coleção.")
                continue

            #embedding = embedding_model.embed_documents([chunk.page_content])[0]

            documents_to_add.append(chunk)
            ids_to_add.append(document_id)
            #embeddings_to_add.append(embedding)
            #metadatas_to_add.append(chunk.metadata)

        if documents_to_add:
            # , metadatas=metadatas_to_add
            self.vectorstore.add_documents(documents=documents_to_add, ids=ids_to_add)
            print(f"Adicionados {len(documents_to_add)} documentos em lote.")

        if chunks:
            first_chunk_id = self.generate_id(chunks[0], 0)
            print(f"ID do primeiro chunk: {first_chunk_id}")



# faissAuxiliar = FaissAuxiliar(embedding_model_name, persist_directory)
# vectorstore = faissAuxiliar.get_vector_store()
# vectorstore = FaissBatch(vectorstore=vectorstore).faiss_indexing(PATH_ARQUIVOS)

# # salvar no disco
# faissAuxiliar.persistir(vectorstore)

# ------------------
# retrieve
# ------------------
from langchain.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_ollama.chat_models import ChatOllama
from langchain_core.runnables import RunnablePassthrough
from langchain.retrievers.multi_query import MultiQueryRetriever
from langchain_ollama import OllamaEmbeddings 
# from IPython.display import display, Markdown

class FaissRAG:

    QUERY_PROMPT = PromptTemplate(
        input_variables=["question"],
        template="""Você é um assistente de modelo de linguagem de IA. Sua tarefa é gerar cinco
        versões diferentes da pergunta do usuário fornecida para recuperar documentos relevantes de
        um banco de dados vetorial. Ao gerar múltiplas perspectivas sobre a pergunta do usuário, seu
        objetivo é ajudar o usuário a superar algumas das limitações da pesquisa de similaridade 
        baseada em distância. Forneça essas perguntas alternativas separadas por quebras de linha.
        Pergunta original: {question}""",
    )

    # RAG prompt
    template = """Responda à pergunta com base SOMENTE no seguinte contexto:
    {context}
    Pergunta: {question}
    """

    #embedding_model_name = 'nomic-embed-text' # nomic-embed-text | llama3
    #local_model = deepseek-r1 | llama3.2
    def __init__(self, vectorstore=None, embedding_model_name=None, persist_directory=None, local_model="deepseek-r1"):
        if vectorstore is not None:
            self.vectorstore = vectorstore
        elif embedding_model_name is not None and persist_directory is not None:
            self.vectorstore = FaissAuxiliar(embedding_model_name, persist_directory)
        else:
            raise ValueError("Você deve fornecer 'vectorstore' ou 'embedding_model_name' e 'persist_directory'.")

        llm = ChatOllama(model=local_model) # LLM from Ollama

        retriever = MultiQueryRetriever.from_llm(
            self.vectorstore.as_retriever(), 
            llm,
            prompt=self.QUERY_PROMPT
        )
        prompt = ChatPromptTemplate.from_template(self.template)

        self.chain = (
            {"context": retriever, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )

    def do_prompt(self, prompt):
        if prompt is None:
            raise ValueError("Você deve fornecer o 'prompt'.")
        return self.chain.invoke(prompt)

# faissAuxiliar = FaissAuxiliar(embedding_model_name, persist_directory)
# vectorstore = faissAuxiliar.get_vector_store()
# faissRAG = FaissRAG(vectorstore, embedding_model_name, persist_directory, local_model)

# #display(Markdown(faissRAG.do_prompt("Qual a cor do Monopoly ?")))
# print(faissRAG.do_prompt("Qual a cor do Monopoly ?"))
