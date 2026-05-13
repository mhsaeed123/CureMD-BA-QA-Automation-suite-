"""
ChromaDB RAG Wrapper
====================
One ingest pipeline, one query interface.
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_CHROMA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "chroma"


class ChromaRAG:
    """Thin wrapper over ChromaDB for document ingestion and retrieval."""

    def __init__(self, persist_dir: Path = DEFAULT_CHROMA_DIR):
        self.persist_dir = persist_dir
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self._client = None
        self._collections: Dict[str, any] = {}

    def _get_client(self):
        """Lazy-init ChromaDB client."""
        if self._client is None:
            try:
                import chromadb
                self._client = chromadb.PersistentClient(path=str(self.persist_dir))
                logger.info(f"ChromaDB initialized at {self.persist_dir}")
            except ImportError:
                raise ImportError("chromadb not installed. Run: pip install oneagent[vector]")
        return self._client

    def get_collection(self, name: str = "default"):
        """Get or create a collection."""
        if name not in self._collections:
            client = self._get_client()
            self._collections[name] = client.get_or_create_collection(name)
        return self._collections[name]

    def ingest(self, documents: List[str], metadatas: Optional[List[Dict]] = None,
               ids: Optional[List[str]] = None, collection: str = "default"):
        """Add documents to a collection."""
        col = self.get_collection(collection)
        if ids is None:
            ids = [f"doc_{i}" for i in range(len(documents))]
        col.add(documents=documents, metadatas=metadatas, ids=ids)
        logger.info(f"Ingested {len(documents)} docs into '{collection}'")

    def query(self, query_text: str, n_results: int = 5,
              collection: str = "default") -> Dict:
        """Query a collection."""
        col = self.get_collection(collection)
        return col.query(query_texts=[query_text], n_results=n_results)

    def count(self, collection: str = "default") -> int:
        """Count documents in a collection."""
        col = self.get_collection(collection)
        return col.count()

    def list_collections(self) -> List[str]:
        """List all collections."""
        client = self._get_client()
        return [c.name for c in client.list_collections()]

    def delete_collection(self, name: str):
        """Delete a collection."""
        client = self._get_client()
        client.delete_collection(name)
        self._collections.pop(name, None)
