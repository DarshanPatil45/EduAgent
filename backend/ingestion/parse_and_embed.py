import os
from unstructured.partition.pdf import partition_pdf
from core.llm import embeddings
from core.vectorstore import get_collection

def ingest_pdf(filepath: str) -> tuple[int, str]:
    collection = get_collection()
    try:
        raw_elements = partition_pdf(filepath, strategy="fast")
    except Exception:
        raw_elements = []

    elements = [el for el in raw_elements if str(el).strip()]
    chunks = [str(el) for el in elements]

    if not chunks:
        return 0, ""

    vectors = embeddings.embed_documents(chunks)
    ids = [f"{os.path.basename(filepath)}_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "source": os.path.basename(filepath),
            "chunk_index": i,
            "page_number": getattr(elements[i].metadata, "page_number", None) or 0,
        }
        for i in range(len(chunks))
    ]

    # Use upsert so re-uploading the same file doesn't crash with duplicate ID errors
    collection.upsert(ids=ids, embeddings=vectors, documents=chunks, metadatas=metadatas)
    return len(chunks), "\n\n".join(chunks)