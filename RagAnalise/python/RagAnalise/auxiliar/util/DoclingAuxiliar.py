# -*- coding: latin-1 -*-
import os
from docling.datamodel.base_models import InputFormat
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions, TableFormerMode, TesseractOcrOptions # EasyOcrOptions, OcrMacOptions
from docling.datamodel.document import (ConversionResult)

class DoclingAuxiliar:

    __image_resolution_scale:float = 2.0
    __doc_converter:DocumentConverter = None
    __lang = "por"

    def __init__(self, lang="por") -> None:
        self.__lang = lang if lang else "por"

    def get_doc_converter(self) -> DocumentConverter:
        if (self.__doc_converter): return self.__doc_converter
        # Define pipeline options for PDF processing
        pipeline_options = PdfPipelineOptions(
            do_table_structure=True,  # Enable table structure detection
            do_ocr=True,  # Enable OCR
            # full page ocr and language selection
            #ocr_options=EasyOcrOptions(force_full_page_ocr=True, lang=["en"]),  # Use EasyOCR for OCR
            ocr_options=TesseractOcrOptions(force_full_page_ocr=True, lang=[self.__lang]),  # Uncomment to use Tesseract for OCR
            #ocr_options = OcrMacOptions(force_full_page_ocr=True, lang=['en-US']),
            table_structure_options=dict(
                do_cell_matching=False,  # Use text cells predicted from table structure model
                mode=TableFormerMode.ACCURATE  # Use more accurate TableFormer model
            ),
            generate_page_images=True,  # Enable page image generation
            generate_picture_images=True,  # Enable picture image generation
            images_scale=self.__image_resolution_scale, # Set image resolution scale (scale=1 corresponds to a standard 72 DPI image)
        )

        # Initialize the DocumentConverter with the specified pipeline options
        self.__doc_converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )
        return self.__doc_converter

    def convert_file(self, caminho_arquivo:str) -> ConversionResult:
        if (caminho_arquivo is None): return None
        if (self.__doc_converter is None): self.__doc_converter = self.get_doc_converter()
        if (self.__doc_converter is None): return None

        try:
            return self.__doc_converter.convert(caminho_arquivo)
        except Exception as e:
            print(f"Erro ao converter com arquivo temporário: {e}")
        finally:
            try:
                if os.path.exists: os.remove(caminho_arquivo)
            except Exception as e:
                print(f"Erro ao deletar arquivo '{caminho_arquivo}': {e}")
        return None
