# -*- coding: latin-1 -*-
import hashlib
import os
from langchain.docstore.document import Document
import traceback
from typing import List

from auxiliar.db_vector import IVectorStore
from auxiliar.flask.FlaskServer import ChunksAux

class IndexarArquivos:

    status_indexacao: dict[str, bool | float] = {
        "terminado": False,
        "porcentagem": 0.0
    }

    __vectorstore:IVectorStore = None
    __chunkAux:ChunksAux = None

    def __init__(self, chunkAux: ChunksAux, vectorstore: IVectorStore) -> None:
        # if not isinstance(vectorstore, IVectorStore): raise ValueError("vectorstore deve implementar IVectorStore")
        if chunkAux is None: raise ValueError("chunkAux é obrigatório")
        
        self.__vectorstore = vectorstore
        self.__chunkAux = chunkAux
        self.status_indexacao = {
            "terminado": False,
            "porcentagem": 0.0
        }

    def generate_id_filename(self, filename:str, page_index:int = 0) -> str:
        filename = os.path.basename(filename)
        base_id = hashlib.sha256(filename.encode()).hexdigest()
        return f"{base_id}_{page_index}"    

    def generate_id(self, document:Document, page_index:int = 0) -> str:
        """Gera um ID único baseado no nome do arquivo e no índice da página."""
        source = document.metadata['source']
        return self.generate_id_filename(os.path.basename(source), page_index)


    def indexing_files(self, lista_caminhos_arquivos:list[str], extensoes_imagens:list[str], lang:str="por", excluir_arquivo:bool = True) -> IVectorStore:
        if (lista_caminhos_arquivos is None or len(lista_caminhos_arquivos) <= 0): return self.__vectorstore

        total_arquivos = len(lista_caminhos_arquivos)
        arquivos_processados = 0

        try:
            for caminho_arquivo in lista_caminhos_arquivos:
                filename = os.path.basename(caminho_arquivo) if caminho_arquivo != '' else ''
                if caminho_arquivo == '' or filename == '': continue
                filename = filename.lower()
                document_id = self.generate_id_filename(filename, 0)
                results = self.__vectorstore.get_by_ids([document_id]);

                if results and results[0].id and document_id in results[0].id:
                    print(f"Documento com ID {document_id} | {filename} já existe na coleção.")
                    if excluir_arquivo and os.path.exists(caminho_arquivo): os.remove(caminho_arquivo)

                    arquivos_processados += 1
                    self.status_indexacao["porcentagem"] = int((arquivos_processados / total_arquivos) * 100)
                    continue

                self.__indexing_batch(filename, self.__chunkAux.get_chunks_file(caminho_arquivo, extensoes_imagens, lang))
                arquivos_processados += 1
                self.status_indexacao["porcentagem"] = int((arquivos_processados / total_arquivos) * 100)
                if excluir_arquivo and os.path.exists(caminho_arquivo): os.remove(caminho_arquivo)

            self.status_indexacao["porcentagem"] = 100
            self.status_indexacao["terminado"] = True

            if (arquivos_processados>0): self.__vectorstore.persistir()
        except Exception:
            print('-----------------------------')
            traceback.print_exc()
            print('-----------------------------')
            self.status_indexacao["terminado"] = True

        self.status_indexacao["porcentagem"] = 100
        self.status_indexacao["terminado"] = True
        return self.__vectorstore


    def __indexing_batch(self, filename:str, chunks:List[Document]) -> None:
        """Indexa chunks em lote no vector db."""

        if not chunks or not self.__vectorstore:
            print('Sem chunks e/ou vectorstore is null')
            return

        documents_to_add = []
        ids_to_add = []
        # embeddings_to_add = []
        # metadatas_to_add = []

        for i, chunk in enumerate(chunks):
            document_id = self.generate_id_filename(filename, i)

            results = self.__vectorstore.get_by_ids([document_id]);
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
            self.__vectorstore.add_documents(documents=documents_to_add, ids=ids_to_add)
            print(f"Adicionados {len(documents_to_add)} documentos em lote.")

        if chunks:
            first_chunk_id = self.generate_id(chunks[0], 0)
            print(f"ID do primeiro chunk: {first_chunk_id}")
