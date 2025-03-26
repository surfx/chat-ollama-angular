# -*- coding: latin-1 -*-
import os
from langchain_community.vectorstores import FAISS
from langchain.docstore.document import Document
import faiss
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_ollama import OllamaEmbeddings

# from docling.document_converter import DocumentConverter
# from rag.rag import (ChunksAux, IVectorStore, SepararDocumentos)

from auxiliar.db_vector.IVectorStore import Any, IVectorStore

class FaissAuxiliar:

    __embedding_model:str = None
    __persist_directory:str = ''

    def __init__(self, embedding_model_name:str, persist_directory:str) -> None:
        self.__embedding_model = OllamaEmbeddings(model=embedding_model_name)
        self.__persist_directory = persist_directory

    def persistir(self, vectorstore:FAISS) -> None:
        vectorstore.save_local(self.__persist_directory)

    def get_vector_store(self) -> FAISS:
        index_file:str = os.path.join(self.__persist_directory, "index.faiss") # Nome padrão do arquivo de índice FAISS
        if os.path.exists(index_file): # Verifica se o arquivo de índice FAISS existe
            return FAISS.load_local(self.__persist_directory, self.__embedding_model, allow_dangerous_deserialization=True)
        else:
            # 1. Obtenha a dimensão do embedding
            example_embedding = self.__embedding_model.embed_query("texto de exemplo") # Use um texto de exemplo para obter um embedding
            embedding_dimension = len(example_embedding)

            # 2. Crie um índice FAISS vazio com a dimensão correta
            faiss_index = faiss.IndexFlatL2(embedding_dimension) # IndexFlatL2 é um índice FAISS comum

            # 3. Inicialize FAISS da Langchain com o índice FAISS vazio
            vectorstore = FAISS(
                embedding_function=self.__embedding_model,    # 1. embedding_function
                index=faiss_index,                            # 2. index
                docstore=InMemoryDocstore(),                  # 3. docstore (using InMemoryDocstore for clarity)
                index_to_docstore_id={},                      # 4. index_to_docstore_id
            )
            vectorstore.save_local(self.__persist_directory)
            # print(f"Nova base FAISS vazia criada e salva em: {persist_directory}")
            return vectorstore

    def excluir_faiss(self) -> None:
        index_file:str = os.path.join(self.__persist_directory, "index.faiss") # Nome padrão do arquivo de índice FAISS
        if os.path.exists(index_file):
            os.remove(index_file)

        index_pkl:str = os.path.join(self.__persist_directory, "index.pkl") # Nome padrão do arquivo de pkl FAISS
        if os.path.exists(index_pkl):
            os.remove(index_pkl)


class FaissIVectorStore(IVectorStore):

    __faissAuxiliar: FaissAuxiliar = None

    def __init__(self, embedding_model_name:str, persist_directory:str) -> None:
        self.__faissAuxiliar = FaissAuxiliar(embedding_model_name, persist_directory)
        self.__vectorStore = self.__faissAuxiliar.get_vector_store()

    def set_vector(self, vector:Any) -> None:
        self.__vectorStore = vector

    def get_vector(self) -> Any:
        return self.__vectorStore

    def get_by_ids(self, ids: list[str]) -> list[Document]:
        if not ids or len(ids) <= 0: return None
        return self.__vectorStore.get_by_ids(ids)

    def add_documents(self, documents: list[Document], ids: list[str]) -> list[str]:
        if not documents or len(documents) <= 0: return None
        return self.__vectorStore.add_documents(documents=documents, ids=ids)

    def persistir(self) -> None:
        self.__faissAuxiliar.persistir(self.get_vector())

    def excluir_db(self) -> None:
        self.__faissAuxiliar.excluir_faiss()