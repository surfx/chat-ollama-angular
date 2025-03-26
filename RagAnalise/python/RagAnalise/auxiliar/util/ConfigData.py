# -*- coding: latin-1 -*-
import os

class ConfigData:

    QUERY_PROMPT: str = """
    Voc� � um assistente de modelo de linguagem de IA. Sua tarefa � gerar cinco
    vers�es diferentes da pergunta do usu�rio fornecida para recuperar documentos relevantes de
    um banco de dados vetorial. Ao gerar m�ltiplas perspectivas sobre a pergunta do usu�rio, seu
    objetivo � ajudar o usu�rio a superar algumas das limita��es da pesquisa de similaridade 
    baseada em dist�ncia. Forne�a essas perguntas alternativas separadas por quebras de linha.
    """
    LANG: str = "por"  # por | eng
    PERSIST_DB_DIRECTORY: str = r"C:\Users\emerson\Desktop\projetos\pastas_aux"
    UPLOAD_PATH_TEMP: str = r"C:\Users\emerson\Desktop\projetos\pastas_aux"
    #PERSIST_DB_DIRECTORY: str = r"/home/emerson/projetos/chat-ollama-angular/db" # Diret�rio onde o banco de dados ser� salvo
    #UPLOAD_PATH_TEMP: str = r"/home/emerson/projetos/chat-ollama-angular/temp"  # Pasta tempor�ria

    LOCAL_MODEL: str = "deepseek-r1"  # deepseek-r1 | llama3.2
    EMBEDDING_MODEL_NAME: str = 'nomic-embed-text'  # nomic-embed-text | llama3

    ALLOWED_EXTENSIONS: set[str] = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'html'}
    EXTENSOES_IMAGENS: set[str] = {'.jpg', '.jpeg', '.png', '.gif', '.bmp'}

    def __init__(self,
                 query_prompt: str = QUERY_PROMPT,
                 lang: str = LANG,
                 persist_db_directory: str = PERSIST_DB_DIRECTORY,
                 upload_path_temp: str = UPLOAD_PATH_TEMP,
                 local_model: str = LOCAL_MODEL,
                 embedding_model_name: str = EMBEDDING_MODEL_NAME,
                 allowed_extensions: set[str] = ALLOWED_EXTENSIONS,
                 extensoes_imagens: set[str] = EXTENSOES_IMAGENS) -> None:
        self.QUERY_PROMPT = query_prompt
        self.LANG = lang
        self.PERSIST_DB_DIRECTORY = persist_db_directory
        self.UPLOAD_PATH_TEMP = upload_path_temp
        self.LOCAL_MODEL = local_model
        self.EMBEDDING_MODEL_NAME = embedding_model_name
        self.ALLOWED_EXTENSIONS = set(allowed_extensions)
        self.EXTENSOES_IMAGENS = set(extensoes_imagens)

        if not os.path.exists(self.PERSIST_DB_DIRECTORY):
            os.makedirs(self.PERSIST_DB_DIRECTORY, exist_ok=True)
        if not os.path.exists(self.UPLOAD_PATH_TEMP):
            os.makedirs(self.UPLOAD_PATH_TEMP, exist_ok=True)

    def __str__(self) -> str:
        return (f"ConfigData(\n"
                f"  QUERY_PROMPT='{self.QUERY_PROMPT}',\n"
                f"  LANG='{self.LANG}',\n"
                f"  PERSIST_DB_DIRECTORY='{self.PERSIST_DB_DIRECTORY}',\n"
                f"  UPLOAD_PATH_TEMP='{self.UPLOAD_PATH_TEMP}',\n"
                f"  LOCAL_MODEL='{self.LOCAL_MODEL}',\n"
                f"  EMBEDDING_MODEL_NAME='{self.EMBEDDING_MODEL_NAME}',\n"
                f"  ALLOWED_EXTENSIONS={self.ALLOWED_EXTENSIONS}\n"
                f"  EXTENSOES_IMAGENS={self.EXTENSOES_IMAGENS}\n"
                f")")

    def __json__(self) -> dict[str, str | list[str]]:
        """
        M�todo para tornar o objeto ConfigData serializ�vel em JSON.
        Converte o objeto em um dicion�rio que pode ser serializado.
        """
        return {
            'QUERY_PROMPT': self.QUERY_PROMPT,
            'LANG': self.LANG,
            'PERSIST_DB_DIRECTORY': self.PERSIST_DB_DIRECTORY,
            'UPLOAD_PATH_TEMP': self.UPLOAD_PATH_TEMP,
            'LOCAL_MODEL': self.LOCAL_MODEL,
            'EMBEDDING_MODEL_NAME': self.EMBEDDING_MODEL_NAME,
            'ALLOWED_EXTENSIONS': list(self.ALLOWED_EXTENSIONS),
            'EXTENSOES_IMAGENS': list(self.EXTENSOES_IMAGENS)
        }