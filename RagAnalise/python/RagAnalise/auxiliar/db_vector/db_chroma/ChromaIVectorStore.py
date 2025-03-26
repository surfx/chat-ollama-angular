# -*- coding: latin-1 -*-
import os
import shutil
from typing import List
from auxiliar.db_vector import IVectorStore
from langchain.docstore.document import Document
from auxiliar.db_vector.IVectorStore import Any, IVectorStore

import chromadb
from chromadb.config import Settings
from langchain_chroma import Chroma

class ChromaIVectorStore(IVectorStore):

    COLLECTION_NAME = "local-rag"

    def __initial_config(self, embedding_model_name:str, persist_directory:str) -> None:
        self.__embedding_model_name = embedding_model_name
        self.__persist_directory = persist_directory
        self.__chroma_client = chromadb.PersistentClient(path=persist_directory, settings=Settings(allow_reset=True))
        self.__collection = self.__chroma_client.get_or_create_collection(name=self.COLLECTION_NAME)
        self.__vector_db = Chroma(
            client=self.__chroma_client,
            collection_name=self.COLLECTION_NAME,
            embedding_function=self.__embedding_model_name
        )

    def __init__(self, embedding_model_name:str, persist_directory:str) -> None:
        self.__initial_config(embedding_model_name, persist_directory)

    def set_vector(self, vector:Any) -> None:
        self.__vector_db = vector

    def get_vector(self) -> Any:
        return self.__vector_db

    def get_by_ids(self, ids: list[str]) -> list[Document]:
        if not ids or len(ids) <= 0: return None
        return self.__collection.get(ids=ids)

    def add_documents(self, documents: List[Document], ids: List[str] = None):
        if not documents:
            return

        # Garante que todos os documentos sejam strings válidas
        validated_docs = []
        for doc in documents:
            if isinstance(doc, Document):
                content = str(doc.page_content) if doc.page_content else ""
                validated_docs.append(content)
            elif isinstance(doc, str):
                validated_docs.append(doc)
            else:
                validated_docs.append(str(doc))

        # Converte metadados se necessário
        metadatas = [doc.metadata if hasattr(doc, 'metadata') else {} for doc in documents]

        self.__collection.add(
            documents=validated_docs,
            metadatas=metadatas,
            ids=ids if ids else [str(i) for i in range(len(documents))]
        )

    def persistir(self) -> None:
        # Chroma não precisa dessa etapa
        # self.__faissAuxiliar.persistir(self.get_vector())
        pass

    def excluir_db(self) -> None:
        if (self.__chroma_client):
            self.__chroma_client.delete_collection(name=self.COLLECTION_NAME)
            self.__chroma_client.reset()
        self.__excluir_chroma()

    def __excluir_chroma(self) -> None:
        if not os.path.exists(self.__persist_directory):
            print(f"Diretório {self.__persist_directory} não existe.")
            return

        index_file:str = os.path.join(self.__persist_directory, "chroma.sqlite3") # Nome padrão do arquivo de índice ChromaDb
        if os.path.exists(index_file):
            os.remove(index_file)

        try:
            for item in os.listdir(self.__persist_directory):
                item_path = os.path.join(self.__persist_directory, item)
            
                if os.path.isdir(item_path):  # Se for uma pasta, deleta recursivamente
                    shutil.rmtree(item_path)
                    print(f"Pasta removida: {item_path}")
    
        except Exception as e:
            print(f"Erro ao limpar subpastas: {str(e)}")
        finally:
            self.__initial_config(self.__embedding_model_name, self.__persist_directory)