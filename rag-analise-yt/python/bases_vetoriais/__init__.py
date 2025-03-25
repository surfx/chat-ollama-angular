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