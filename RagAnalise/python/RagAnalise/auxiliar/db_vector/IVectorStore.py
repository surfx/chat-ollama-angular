from abc import ABC, abstractmethod
from typing import Any
from langchain_core.documents import Document

class IVectorStore(ABC):
    @abstractmethod
    def set_vector(self, vector:Any) -> None: pass
    @abstractmethod
    def get_vector(self) -> Any: pass

    @abstractmethod
    def get_by_ids(self, ids: list[str]) -> list[Document]: pass
    @abstractmethod
    def add_documents(self, documents: list[Document], ids: list[str]) -> list[str]: pass
    @abstractmethod
    def persistir(self) -> None: pass
    @abstractmethod
    def excluir_db(self) -> None: pass