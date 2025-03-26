# -*- coding: latin-1 -*-
from langchain.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_ollama.chat_models import ChatOllama
from langchain_core.runnables import RunnablePassthrough
from langchain.retrievers.multi_query import MultiQueryRetriever
from langchain_ollama import OllamaEmbeddings

from auxiliar.db_vector import IVectorStore 
# from IPython.display import display, Markdown

class ConsultaRag:

    QUERY_PROMPT = PromptTemplate(
        input_variables=["question"],
        template="""Você é um assistente de modelo de linguagem de IA. 
        Sua tarefa é gerar respostas da pergunta do usuário fornecida para recuperar 
        documentos relevantes de um banco de dados vetorial. Ao gerar múltiplas
        perspectivas sobre a pergunta do usuário, seu objetivo é ajudar o usuário a 
        superar algumas das limitações da pesquisa de similaridade baseada em distância.
        Forneça sua resposta em formato markdown. 
        Pergunta original: {question}""",
    )

    # RAG prompt
    template = """Responda à pergunta com base SOMENTE no seguinte contexto:
    {context}
    Pergunta: {question}
    """

    #embedding_model_name = 'nomic-embed-text' # nomic-embed-text | llama3
    #local_model = deepseek-r1 | llama3.2
    def __init__(self, 
                 vectorstore: IVectorStore, 
                 query_prompt_template:str = None, 
                 local_model:str="deepseek-r1") -> None:

        if not vectorstore: raise ValueError("Você deve fornecer 'vectorstore'.")
        if query_prompt_template is not None: self.QUERY_PROMPT.template = query_prompt_template + " Pergunta original: {question}"

        llm = ChatOllama(model=local_model) # LLM from Ollama

        retriever = MultiQueryRetriever.from_llm(
            vectorstore.get_vector().as_retriever(),
            llm,
            prompt=self.QUERY_PROMPT
        )
        prompt = ChatPromptTemplate.from_template(self.template)

        self.chain = (
            {"context": retriever, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )

    def do_prompt(self, prompt:str) -> str:
        if prompt is None: raise ValueError("Você deve fornecer o 'prompt'.")
        return self.chain.invoke(prompt)