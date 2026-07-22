from core.llm import classifier_llm

async def orchestrator_node(state: dict) -> dict:
    prompt = f"""You are an intent classifier for a student tutoring chat system.
Classify the user's query into exactly one of these categories:
- 'question': The user is asking a general question, requesting an explanation, asking to summarize a document, or chatting.
- 'quiz': The user is explicitly asking to be tested, asking for a quiz, or requesting a test question.
- 'answer_check': The user is responding to a question previously asked by the tutor, answering a test/guiding question, or saying yes/no to a prompt.

Respond with exactly one word (either 'question', 'quiz', or 'answer_check'), and nothing else. Do not include formatting, quotes, or punctuation.

Query: {state['query']}"""
    result = await classifier_llm.ainvoke(prompt)
    state["intent"] = result.content.strip().lower().replace("'", "").replace('"', "").replace(".", "")
    return state