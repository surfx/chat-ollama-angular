# cd /home/emerson/projetos/chat-ollama-angular/rag-analise-yt/; ./run.sh
# ou
# cd /tmp/uv_environments; source my_env_3129/bin/activate
# uv run /home/emerson/projetos/chat-ollama-angular/rag-analise-yt/python/flask_server/server_flask_faiss.py

import os
from langchain_community.vectorstores import FAISS


class ConfigData:
    QUERY_PROMPT:str = """
    Você é um assistente de modelo de linguagem de IA. Sua tarefa é gerar cinco
    versões diferentes da pergunta do usuário fornecida para recuperar documentos relevantes de
    um banco de dados vetorial. Ao gerar múltiplas perspectivas sobre a pergunta do usuário, seu
    objetivo é ajudar o usuário a superar algumas das limitações da pesquisa de similaridade 
    baseada em distância. Forneça essas perguntas alternativas separadas por quebras de linha.
    """
    LANG:str = "por" # por | eng
    # Diretório onde o banco de dados será salvo
    PERSIST_DB_DIRECTORY:str = r"/home/emerson/projetos/chat-ollama-angular/db"
    UPLOAD_PATH_TEMP:str = r"/home/emerson/projetos/chat-ollama-angular/temp"  # Pasta onde os arquivos serão salvos no servidor

    LOCAL_MODEL:str = "deepseek-r1" # deepseek-r1 | llama3.2
    EMBEDDING_MODEL_NAME:str = 'nomic-embed-text' # nomic-embed-text | llama3

    ALLOWED_EXTENSIONS:set[str] = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'html'} # Extensões permitidas (opcional)
    EXTENSOES_IMAGENS:set[str] = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'] # Adicione outras extensões se necessário

    def __init__(self,
                 query_prompt:str=QUERY_PROMPT,
                 lang:str=LANG,
                 persist_db_directory:str=PERSIST_DB_DIRECTORY,
                 upload_path_temp:str=UPLOAD_PATH_TEMP,
                 local_model:str=LOCAL_MODEL,
                 embedding_model_name:str=EMBEDDING_MODEL_NAME,
                 allowed_extensions:set[str]=ALLOWED_EXTENSIONS,
                 extensoes_imagens:set[str]=EXTENSOES_IMAGENS) -> None:
        self.QUERY_PROMPT = query_prompt
        self.LANG = lang
        self.PERSIST_DB_DIRECTORY = persist_db_directory
        self.UPLOAD_PATH_TEMP = upload_path_temp
        self.LOCAL_MODEL = local_model
        self.EMBEDDING_MODEL_NAME = embedding_model_name
        self.ALLOWED_EXTENSIONS = set(allowed_extensions)
        self.EXTENSOES_IMAGENS = set(extensoes_imagens)

        if not os.path.exists(self.PERSIST_DB_DIRECTORY): os.makedirs(self.PERSIST_DB_DIRECTORY, exist_ok=True)
        if not os.path.exists(self.UPLOAD_PATH_TEMP): os.makedirs(self.UPLOAD_PATH_TEMP, exist_ok=True)

    def __str__(self) -> str:
        return (f"ConfigData(\n"
                f"  QUERY_PROMPT='{self.QUERY_PROMPT}',\n"
                f"  LANG='{self.LANG}',\n"
                f"  PERSIST_DB_DIRECTORY='{self.PERSIST_DB_DIRECTORY}',\n"
                f"  UPLOAD_PATH_TEMP='{self.UPLOAD_PATH_TEMP}',\n"
                f"  LOCAL_MODEL='{self.LOCAL_MODEL}',\n"
                f"  EMBEDDING_MODEL_NAME='{self.EMBEDDING_MODEL_NAME}',\n"
                f"  ALLOWED_EXTENSIONS={self.ALLOWED_EXTENSIONS}\n"
                f"  EXTENSOES_IMAGENS={self.EXTENSOES_IMAGENS}\n"
                f")")

    def __json__(self) -> dict[str, str | list[str]]:
        """
        Método para tornar o objeto ConfigData serializável em JSON.
        Converte o objeto em um dicionário que pode ser serializado.
        """
        return {
            'QUERY_PROMPT': self.QUERY_PROMPT,
            'LANG': self.LANG,
            'PERSIST_DB_DIRECTORY': self.PERSIST_DB_DIRECTORY,
            'UPLOAD_PATH_TEMP': self.UPLOAD_PATH_TEMP,
            'LOCAL_MODEL': self.LOCAL_MODEL,
            'EMBEDDING_MODEL_NAME': self.EMBEDDING_MODEL_NAME,
            'ALLOWED_EXTENSIONS': list(self.ALLOWED_EXTENSIONS), # Sets não são serializáveis em JSON por padrão
            'EXTENSOES_IMAGENS': list(self.EXTENSOES_IMAGENS)   # Sets não são serializáveis em JSON por padrão
        }

configData:ConfigData = ConfigData()

#region torch
import torch

class TorchInit:

    def __init__(self) -> None:
        pass

    def init_torch(self) -> torch.device:
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


#region docling

from docling.datamodel.base_models import InputFormat
from docling_core.types.doc import ImageRefMode
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions, TableFormerMode, EasyOcrOptions, TesseractOcrOptions, OcrMacOptions
from docling.datamodel.settings import settings
from docling.datamodel.document import (ConversionResult)

class DoclingAuxiliar:

    IMAGE_RESOLUTION_SCALE:float = 2.0
    doc_converter:DocumentConverter = None

    def __init__(self) -> None:
        pass

    def get_doc_converter(self) -> DocumentConverter:
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

    def convert_file(self, caminho_arquivo:str) -> ConversionResult:
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

    def __init__(self) -> None:
        pass

    def separar_arquivos(self, diretorio:str) -> tuple[list[str], list[str]]:
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

# display(result.document.export_to_markdown())
from langchain_core.documents import Document

# img
import pytesseract
from PIL import Image
from typing import (List)
#pytesseract.pytesseract.tesseract_cmd = r"E:\programas\ia\Tesseract-OCR\tesseract.exe"
#end img

class ChunksAux:

    docling_aux:DoclingAuxiliar = DoclingAuxiliar()

    # DoclingAuxiliar().get_doc_converter()
    def __init__(self, doc_converter_global = None) -> None:
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=7500, chunk_overlap=100)
        self.doc_converter_global = doc_converter_global if doc_converter_global is not None else self.docling_aux.get_doc_converter()

    #local_path = r"data\pdfs\monopoly.pdf"
    def get_chunks_doc(self, local_path:str) -> List[Document]:
        if (local_path is None): return None
        result = self.doc_converter_global.convert(Path(local_path))
        documento = Document(page_content=result.document.export_to_markdown(image_mode=ImageRefMode.EMBEDDED), metadata={"source": local_path})
        chunks = self.text_splitter.split_documents([documento])
        return chunks

    def get_chunks_doc_file(self, caminho_arquivo:str) -> List[Document]:
        if (caminho_arquivo is None or not os.path.exists(caminho_arquivo)): return None
        result = self.docling_aux.convert_file(caminho_arquivo)
        documento = Document(page_content=result.document.export_to_markdown(image_mode=ImageRefMode.EMBEDDED), metadata={"source": caminho_arquivo})
        chunks = self.text_splitter.split_documents([documento])
        return chunks

    def get_chunks_image(self, local_path:str) -> List[Document]:
        if (local_path is None): return None
        image = Image.open(local_path)
        extracted_text = pytesseract.image_to_string(image, lang=configData.LANG)

        documento = Document(page_content=extracted_text, metadata={"source": local_path})
        chunks = self.text_splitter.split_documents([documento])
        return chunks
    
    def get_chunks_image_file(self, caminho_arquivo:str, lang:str=configData.LANG) -> List[Document]:
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

    def get_chunks_file(self, caminho_arquivo:str, lang:str=configData.LANG) -> List[Document]:
        _, extensao = os.path.splitext(caminho_arquivo)
        return self.get_chunks_image_file(caminho_arquivo, lang) \
                if extensao in configData.EXTENSOES_IMAGENS else \
                self.get_chunks_doc_file(caminho_arquivo)





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
        template="""Você é um assistente de modelo de linguagem de IA. 
        Sua tarefa é gerar respostas da pergunta do usuário fornecida para recuperar 
        documentos relevantes de um banco de dados vetorial. Ao gerar múltiplas
        perspectivas sobre a pergunta do usuário, seu objetivo é ajudar o usuário a 
        superar algumas das limitações da pesquisa de similaridade baseada em distância.
        Forneça sua resposta em formato markdown. 
        Pergunta original: {question}""",
    )

    # RAG prompt
    template = """Responda à pergunta com base SOMENTE no seguinte contexto:
    {context}
    Pergunta: {question}
    """

    #embedding_model_name = 'nomic-embed-text' # nomic-embed-text | llama3
    #local_model = deepseek-r1 | llama3.2
    def __init__(self, vectorstore:FAISS = None, query_prompt:str = QUERY_PROMPT.template, 
                 embedding_model_name:str=None, persist_directory:str=None, 
                 local_model:str="deepseek-r1") -> None:
        if vectorstore is not None:
            self.vectorstore = vectorstore
        elif embedding_model_name is not None and persist_directory is not None:
            self.vectorstore = FaissAuxiliar(embedding_model_name, persist_directory).get_vector_store()
        else:
            raise ValueError("Você deve fornecer 'vectorstore' ou 'embedding_model_name' e 'persist_directory'.")

        if query_prompt is not None:
            self.QUERY_PROMPT.template = query_prompt + " Pergunta original: {question}"

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

    def do_prompt(self, prompt:str) -> str:
        if prompt is None:
            raise ValueError("Você deve fornecer o 'prompt'.")
        return self.chain.invoke(prompt)

# faissAuxiliar = FaissAuxiliar(embedding_model_name, persist_directory)
# vectorstore = faissAuxiliar.get_vector_store()
# faissRAG = FaissRAG(vectorstore, embedding_model_name, persist_directory, local_model)

# #display(Markdown(faissRAG.do_prompt("Qual a cor do Monopoly ?")))
# print(faissRAG.do_prompt("Qual a cor do Monopoly ?"))
