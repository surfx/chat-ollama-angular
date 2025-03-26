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
        if chunkAux is None: raise ValueError("chunkAux � obrigat�rio")
        
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
        """Gera um ID �nico baseado no nome do arquivo e no �ndice da p�gina."""
        source = document.metadata['source']
        return self.generate_id_filename(os.path.basename(source), page_index)


    def indexing_files(self, lista_caminhos_arquivos: list[str], extensoes_imagens: list[str], 
                      lang: str = "por", excluir_arquivo: bool = True) -> IVectorStore:
        
        if not lista_caminhos_arquivos: return self.__vectorstore

        total_arquivos = len(lista_caminhos_arquivos)
        arquivos_processados = 0

        try:
            for caminho_arquivo in lista_caminhos_arquivos:
                if not caminho_arquivo: continue
                filename = os.path.basename(caminho_arquivo).lower()
                if not filename: continue

                document_id = self.generate_id_filename(filename, 0)
                results = self.__vectorstore.get_by_ids([document_id])

                if results and isinstance(results, (list, tuple)):  # Verifica se � uma sequ�ncia
                    try:
                        first_result = results[0]  # Tenta acessar o primeiro elemento
                        if hasattr(first_result, 'id') and document_id == first_result.id:
                            print(f"Documento com ID {document_id} | {filename} j� existe na cole��o.")
                            if excluir_arquivo and os.path.exists(caminho_arquivo):
                                os.remove(caminho_arquivo)
                            arquivos_processados += 1
                            self._update_progress(arquivos_processados, total_arquivos)
                            continue
                    except (IndexError, AttributeError):
                        pass  # Se falhar, continua com o processamento normal

                # Processa o arquivo se n�o existir ou se a verifica��o falhar
                chunks = self.__chunkAux.get_chunks_file(caminho_arquivo, extensoes_imagens, lang)
                self.__indexing_batch(filename, chunks)
            
                arquivos_processados += 1
                self._update_progress(arquivos_processados, total_arquivos)
            
                if excluir_arquivo and os.path.exists(caminho_arquivo):
                    os.remove(caminho_arquivo)

            self._mark_completion(arquivos_processados)
        
        except Exception as e:
            print('-' * 30)
            traceback.print_exc()
            print('-' * 30)
            self._mark_completion()

        return self.__vectorstore

    # M�todos auxiliares para melhor organiza��o
    def _update_progress(self, processed: int, total: int):
        self.status_indexacao["porcentagem"] = int((processed / total) * 100)

    def _mark_completion(self, processed: int = 0):
        self.status_indexacao["porcentagem"] = 100
        self.status_indexacao["terminado"] = True
        if processed > 0:
            self.__vectorstore.persistir()

    def __indexing_batch(self, filename: str, chunks: List[Document]) -> None:
        """Indexa chunks em lote no vector db com verificações de segurança."""
        
        if not chunks or len(chunks) == 0:
            print('Nenhum chunk fornecido para indexação.')
            return
            
        if not self.__vectorstore:
            print('VectorStore não está inicializado.')
            return

        documents_to_add = []
        ids_to_add = []
        skipped_documents = 0

        try:
            for i, chunk in enumerate(chunks):
                if not chunk or not hasattr(chunk, 'page_content'):
                    print(f'Chunk inválido no índice {i}, ignorando...')
                    skipped_documents += 1
                    continue

                # Garante que o conteúdo seja string
                if not isinstance(chunk.page_content, str):
                    chunk.page_content = str(chunk.page_content)

                document_id = self.generate_id_filename(filename, i)
                
                try:
                    results = self.__vectorstore.get_by_ids([document_id])
                    if (results and isinstance(results, (list, tuple)) and \
                    len(results) > 0 and hasattr(results[0], 'id') and \
                    results[0].id == document_id):
                        print(f"Documento com ID {document_id} já existe na coleção.")
                        skipped_documents += 1
                        continue
                except Exception as e:
                    print(f"Erro ao verificar documento existente: {str(e)}")
                    continue

                documents_to_add.append(chunk)
                ids_to_add.append(document_id)

            if documents_to_add:
                try:
                    # Garante que todos os documentos tenham conteúdo string
                    final_docs = []
                    for doc in documents_to_add:
                        if not isinstance(doc.page_content, str):
                            doc.page_content = str(doc.page_content)
                        final_docs.append(doc)
                    
                    self.__vectorstore.add_documents(
                        documents=final_docs,
                        ids=ids_to_add
                    )
                    print(f"Adicionados {len(documents_to_add)} documentos em lote.")
                except Exception as e:
                    print(f"Erro ao adicionar documentos em lote: {str(e)}")
                    traceback.print_exc()
        except Exception as e:
            print(f"Erro inesperado durante a indexação em lote: {str(e)}")
            traceback.print_exc()