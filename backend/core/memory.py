from typing import TypedDict, List, Dict
import uuid

class ChatTurn(TypedDict):
    role: str
    content: str
    intent: str

class SessionData(TypedDict):
    chat_history: List[ChatTurn]
    weak_concepts: List[str]
    last_quiz_question: str
    last_quiz_context: str

_sessions: Dict[str, SessionData] = {}

def _blank_session() -> SessionData:
    return {"chat_history": [], "weak_concepts": [], "last_quiz_question": "", "last_quiz_context": ""}

def create_session() -> str:
    session_id = str(uuid.uuid4())
    _sessions[session_id] = _blank_session()
    return session_id

def get_session(session_id: str) -> SessionData:
    if session_id not in _sessions:
        _sessions[session_id] = _blank_session()
    return _sessions[session_id]

def add_turn(session_id: str, role: str, content: str, intent: str = ""):
    session = get_session(session_id)
    session["chat_history"].append({"role": role, "content": content, "intent": intent})
    session["chat_history"] = session["chat_history"][-20:]

def add_weak_concept(session_id: str, concept: str):
    session = get_session(session_id)
    if concept and concept not in session["weak_concepts"]:
        session["weak_concepts"].append(concept)