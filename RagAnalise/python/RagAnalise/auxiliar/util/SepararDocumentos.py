# -*- coding: latin-1 -*-
import os

class SepararDocumentos:

    @staticmethod
    def separar_arquivos(diretorio:str, extensoes_imagens:list[str]) -> tuple[list[str], list[str]]:
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

                if extensao in extensoes_imagens:
                    imagens.append(caminho_arquivo) #adiciona o caminho completo
                else:
                    documentos.append(caminho_arquivo) #adiciona o caminho completo

        return imagens, documentos