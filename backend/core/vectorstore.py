import chromadb
from typing import List
from core.config import CHROMA_PATH, COLLECTION_NAME

chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

def get_collection():
    return chroma_client.get_or_create_collection(name=COLLECTION_NAME)

def get_chunks_by_source(source: str) -> List[str]:
    collection = get_collection()
    results = collection.get(where={"source": source})
    return results.get("documents") or []