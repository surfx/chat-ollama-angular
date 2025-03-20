# Como executar:
# cd E:\programas\ia\virtual_environment && my_env_3129\Scripts\activate
# uv run D:\meus_documentos\workspace\ia\rag\rag002\python\rag_python_faiss.py

PATH_ARQUIVOS = r"D:\meus_documentos\workspace\ia\rag\rag002\data"
LANG = "por" # por | eng
# Diretório onde o banco de dados será salvo
persist_directory = r"D:\meus_documentos\workspace\ia\rag\rag002\db\faiss_db"
local_model = "deepseek-r1" # deepseek-r1 | llama3.2
embedding_model_name = 'nomic-embed-text' # nomic-embed-text | llama3

import os
import faiss
from langchain_community.vectorstores import FAISS
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_ollama import OllamaEmbeddings

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

    def __init__(self):
        pass

    def get_doc_converter(self):
        # Define pipeline options for PDF processing
        pipeline_options = PdfPipelineOptions(
            do_table_structure=True,  # Enable table structure detection
            do_ocr=True,  # Enable OCR
            # full page ocr and language selection
            #ocr_options=EasyOcrOptions(force_full_page_ocr=True, lang=["en"]),  # Use EasyOCR for OCR
            ocr_options=TesseractOcrOptions(force_full_page_ocr=True, lang=[LANG]),  # Uncomment to use Tesseract for OCR
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
        doc_converter_global = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )
        return doc_converter_global

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

        extensoes_imagens = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']  # Adicione outras extensões se necessário

        for raiz, subpastas, arquivos in os.walk(diretorio):
            for arquivo in arquivos:
                caminho_arquivo = os.path.join(raiz, arquivo)
                nome_arquivo, extensao = os.path.splitext(arquivo)
                extensao = extensao.lower()

                if extensao in extensoes_imagens:
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

    # DoclingAuxiliar().get_doc_converter()
    def __init__(self, doc_converter_global = None):
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=7500, chunk_overlap=100)
        self.doc_converter_global = doc_converter_global if doc_converter_global is not None else DoclingAuxiliar().get_doc_converter()

    #local_path = r"data\pdfs\monopoly.pdf"
    def get_chunks_doc(self, local_path):
        result = self.doc_converter_global.convert(Path(local_path))
        documento = Document(page_content=result.document.export_to_markdown(image_mode=ImageRefMode.EMBEDDED), metadata={"source": local_path})
        chunks = self.text_splitter.split_documents([documento])
        return chunks

    def get_chunks_image(self, local_path):
        image = Image.open(local_path)
        extracted_text = pytesseract.image_to_string(image, lang=LANG)

        documento = Document(page_content=extracted_text, metadata={"source": local_path})
        chunks = self.text_splitter.split_documents([documento])
        return chunks

import hashlib
import os
from langchain_community.vectorstores import FAISS
from langchain.docstore.document import Document
#from langchain_community.embeddings import OllamaEmbeddings
# from langchain_ollama import OllamaEmbeddings 
# from pathlib import Path

class FaissBatch:

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

    def generate_id_filename(self, filename, page_index):
        filename = os.path.basename(filename)
        base_id = hashlib.sha256(filename.encode()).hexdigest()
        return f"{base_id}_{page_index}"    

    def generate_id(self, document, page_index):
        """Gera um ID único baseado no nome do arquivo e no índice da página."""
        source = document.metadata['source']
        return self.generate_id_filename(os.path.basename(source), page_index)


    def faiss_indexing(
        self,
        path_arquivos=PATH_ARQUIVOS
    ):
        """Indexa chunks em lote no FAISS."""

        imagens, documentos = self.separarDocumentos.separar_arquivos(path_arquivos)

        for imagem in imagens:
            id_aux = self.generate_id_filename(imagem, 0)
            results = self.vectorstore.get_by_ids([id_aux]);
            if results and results[0].id and id_aux in results[0].id:
                print(f"Documento com ID {id_aux} | {os.path.basename(imagem)} já existe na coleção.")
                continue

            self.faiss_indexing_batch(self.chunkAux.get_chunks_image(imagem), self.vectorstore)

        for documento in documentos:
            id_aux = self.generate_id_filename(documento, 0)
            results = self.vectorstore.get_by_ids([id_aux]);
            if results and results[0].id and id_aux in results[0].id:
                print(f"Documento com ID {id_aux} | {os.path.basename(documento)} já existe na coleção.")
                continue

            self.faiss_indexing_batch(self.chunkAux.get_chunks_doc(documento), self.vectorstore)

        return self.vectorstore
        

    def faiss_indexing_batch(self, chunks):
        """Indexa chunks em lote no FAISS db."""

        if not chunks or not self.vectorstore:
            print('Sem chunks e/ou vectorstore is null')
            return

        documents_to_add = []
        ids_to_add = []
        #embeddings_to_add = []
        metadatas_to_add = []

        for i, chunk in enumerate(chunks):
            document_id = self.generate_id(chunk, i)
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
from IPython.display import display, Markdown

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

faissAuxiliar = FaissAuxiliar(embedding_model_name, persist_directory)
vectorstore = faissAuxiliar.get_vector_store()
faissRAG = FaissRAG(vectorstore, embedding_model_name, persist_directory, local_model)

#display(Markdown(faissRAG.do_prompt("Qual a cor do Monopoly ?")))
print(faissRAG.do_prompt("Qual a cor do Monopoly ?"))
