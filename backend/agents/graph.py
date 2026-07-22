from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from starlette.concurrency import run_in_threadpool
from core.vectorstore import get_collection
from core.llm import embeddings
from core.config import TOP_K
from core.logger import get_logger
from agents.orchestrator import orchestrator_node
from agents.tutor import tutor_node
from agents.evaluator import evaluator_node

logger = get_logger(__name__)

class AgentState(TypedDict):
    query: str
    intent: str
    context: str
    answer: str
    session_id: str
    document_id: Optional[str]   # scopes RAG to this document when set
    document_filename: Optional[str]  # resolved filename for ChromaDB filter
    chat_history: List[dict]
    weak_concepts: List[str]
    last_quiz_question: str
    last_quiz_context: str
    sources: List[dict]
    grounded: bool

async def retrieve_node(state: AgentState) -> AgentState:
    query_vector = await embeddings.aembed_query(state["query"])
    collection = get_collection()

    # Build optional where-filter to scope results to the selected document
    where_filter = None
    if state.get("document_filename"):
        where_filter = {"source": state["document_filename"]}

    results = await run_in_threadpool(
        collection.query,
        query_embeddings=[query_vector],
        n_results=TOP_K,
        where=where_filter,
    )
    docs = results["documents"][0] if results["documents"] else []
    metadatas = results["metadatas"][0] if results["metadatas"] else []
    distances = results["distances"][0] if results.get("distances") else []

    state["context"] = "\n\n".join(docs)
    state["sources"] = [
        {"source": m.get("source", "unknown"), "page": m.get("page_number", 0)}
        for m in metadatas
    ]
    state["grounded"] = bool(distances) and distances[0] < 1.0

    if not docs:
        logger.warning("No documents retrieved for query: %s", state["query"])
    return state

def route(state: AgentState) -> str:
    intent = state["intent"]
    if intent == "answer_check":
        return "evaluator"
    return "tutor"

def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("orchestrator", orchestrator_node)
    graph.add_node("tutor", tutor_node)
    graph.add_node("evaluator", evaluator_node)

    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "orchestrator")
    graph.add_conditional_edges(
        "orchestrator", route, {"tutor": "tutor", "evaluator": "evaluator"}
    )
    graph.add_edge("tutor", END)
    graph.add_edge("evaluator", END)

    return graph.compile()

app_graph = build_graph()