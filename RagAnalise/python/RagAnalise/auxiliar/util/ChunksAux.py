# -*- coding: latin-1 -*-
import os
from pathlib import Path
from docling.document_converter import DocumentConverter
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
import pytesseract
from PIL import Image
from docling_core.types.doc import ImageRefMode
from typing import List

from auxiliar.flask.FlaskServer import DoclingAuxiliar

# from DoclingAuxiliar import DoclingAuxiliar

#pytesseract.pytesseract.tesseract_cmd = r"E:\programas\ia\Tesseract-OCR\tesseract.exe"

class ChunksAux:

    __docling_aux:DoclingAuxiliar = None

    def __init__(self, doc_converter:DocumentConverter, docling_aux:DoclingAuxiliar) -> None:
        self.__docling_aux = docling_aux
        self.__text_splitter = RecursiveCharacterTextSplitter(chunk_size=7500, chunk_overlap=100)
        self.__doc_converter = doc_converter if doc_converter else self.__docling_aux.get_doc_converter()

    def get_chunks_doc(self, local_path:str) -> List[Document]:
        if (local_path is None): return None
        result = self.__doc_converter.convert(Path(local_path))
        documento = Document(page_content=result.document.export_to_markdown(image_mode=ImageRefMode.EMBEDDED), metadata={"source": local_path})
        chunks = self.__text_splitter.split_documents([documento])
        return chunks

    def get_chunks_doc_file(self, caminho_arquivo:str) -> List[Document]:
        if (caminho_arquivo is None or not os.path.exists(caminho_arquivo)): return None
        result = self.__docling_aux.convert_file(caminho_arquivo)
        documento = Document(page_content=result.document.export_to_markdown(image_mode=ImageRefMode.EMBEDDED), metadata={"source": caminho_arquivo})
        chunks = self.__text_splitter.split_documents([documento])
        return chunks

    def get_chunks_image(self, local_path:str) -> List[Document]:
        if (local_path is None): return None
        image = Image.open(local_path)
        extracted_text = pytesseract.image_to_string(image, lang="por")

        documento = Document(page_content=extracted_text, metadata={"source": local_path})
        chunks = self.__text_splitter.split_documents([documento])
        return chunks
    
    def get_chunks_image_file(self, caminho_arquivo:str, lang:str="por") -> List[Document]:
        if (caminho_arquivo is None or not os.path.exists(caminho_arquivo)): return None

        try:
            extracted_text = pytesseract.image_to_string(caminho_arquivo, lang=lang)
            documento = Document(page_content=extracted_text, metadata={"source": caminho_arquivo})
            chunks = self.__text_splitter.split_documents([documento])
            return chunks
        except Exception as e:
            print(f"Erro ao converter com arquivo temporário: {e}")
        finally:
            try:
                os.remove(caminho_arquivo)
            except Exception as e:
                print(f"Erro ao deletar arquivo '{caminho_arquivo}': {e}")
        return None

    def get_chunks_file(self, caminho_arquivo:str, extensoes_imagens:list[str], lang:str="por") -> List[Document]:
        _, extensao = os.path.splitext(caminho_arquivo)
        return self.get_chunks_image_file(caminho_arquivo, lang) \
                if extensao in extensoes_imagens else \
                self.get_chunks_doc_file(caminho_arquivo)
