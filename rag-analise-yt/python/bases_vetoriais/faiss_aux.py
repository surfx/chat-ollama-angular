import hashlib
import os
from langchain_community.vectorstores import FAISS
from langchain.docstore.document import Document
import traceback
import faiss
from typing import List
from langchain_community.docstore.in_memory import InMemoryDocstore
from langchain_ollama import OllamaEmbeddings

# from docling.document_converter import DocumentConverter
from rag.rag import (ChunksAux, SepararDocumentos)

class FaissAuxiliar:

    embedding_model:str = None
    persist_directory:str = ''

    def __init__(self, embedding_model_name:str, persist_directory:str) -> None:
        self.embedding_model = OllamaEmbeddings(model=embedding_model_name)
        self.persist_directory = persist_directory

    def persistir(self, vectorstore:FAISS) -> None:
        vectorstore.save_local(self.persist_directory)

    def get_vector_store(self) -> FAISS:
        index_file:str = os.path.join(self.persist_directory, "index.faiss") # Nome padrão do arquivo de índice FAISS
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

    def excluir_faiss(self) -> None:
        index_file:str = os.path.join(self.persist_directory, "index.faiss") # Nome padrão do arquivo de índice FAISS
        if os.path.exists(index_file):
            os.remove(index_file)

        index_pkl:str = os.path.join(self.persist_directory, "index.pkl") # Nome padrão do arquivo de pkl FAISS
        if os.path.exists(index_pkl):
            os.remove(index_pkl)

#vectorstore = FaissAuxiliar(embedding_model_name, persist_directory)

class FaissBatch:

    status_indexacao: dict[str, bool | float] = {
        "terminado": False,
        "porcentagem": 0.0
    }

    vectorstore:FAISS = None
    chunkAux:ChunksAux = None
    separarDocumentos:SepararDocumentos = None

    def __init__(
            self, 
            chunkAux:ChunksAux,
            separarDocumentos:SepararDocumentos,
            vectorstore:FAISS
        ) -> None:
        if vectorstore is None or chunkAux is None or separarDocumentos is None:
            raise ValueError("Você deve fornecer 'vectorstore'.")

        self.vectorstore = vectorstore
        self.chunkAux = chunkAux
        self.separarDocumentos = separarDocumentos
        self.status_indexacao["porcentagem"] = 0
        self.status_indexacao["terminado"] = False

    def generate_id_filename(self, filename:str, page_index:int = 0) -> str:
        filename = os.path.basename(filename)
        base_id = hashlib.sha256(filename.encode()).hexdigest()
        return f"{base_id}_{page_index}"    

    def generate_id(self, document:Document, page_index:int = 0) -> str:
        """Gera um ID único baseado no nome do arquivo e no índice da página."""
        source = document.metadata['source']
        return self.generate_id_filename(os.path.basename(source), page_index)


    def faiss_indexing_files(self, lista_caminhos_arquivos:list[str]) -> FAISS:
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

                self._faiss_indexing_batch(filename, self.chunkAux.get_chunks_file(caminho_arquivo))
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


    def _faiss_indexing_batch(self, filename:str, chunks:List[Document]) -> None:
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

