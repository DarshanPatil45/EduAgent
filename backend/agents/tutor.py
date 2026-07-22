from core.llm import llm

async def tutor_node(state: dict) -> dict:
    intent = state.get("intent", "question")
    
    if intent == "quiz":
        prompt = f"""You are an educational tutor. Generate a single quiz or test question based on the context to test the student's knowledge.
Context: {state['context']}
Do not provide the answer. Ask a clear, specific question to test their understanding.
Do not ask conversational follow-ups or meta-questions. End your response directly with the question itself."""
    else:
        # Check if the user is asking for an explanation, definition, summary, or to be taught a concept
        query_lower = state['query'].lower()
        is_explain_request = any(
            keyword in query_lower 
            for keyword in ["explain", "define", "what is", "tell me about", "teach", "summarise", "summarize", "detailed explanation"]
        )
        
        if is_explain_request:
            prompt = f"""You are an expert tutor. Provide a detailed, clear, and structured explanation of the topic/concept requested by the student based on the context.
Context: {state['context']}
Student query: {state['query']}
Explain the concept thoroughly, provide concrete real-world examples, and structure the explanation with clear sections or bullet points so it is highly readable and easy to study. Do not withhold the explanation or be Socratic here."""
        else:
            prompt = f"""You are a Socratic tutor. Do not give direct answers.
Context: {state['context']}
Student question: {state['query']}
Ask a guiding question that leads the student toward the answer, instead of answering directly.
Do not ask conversational follow-up questions or meta-questions at the end (such as 'Would you like to refine your answer?' or 'Does that make sense?'). End your response directly with the guiding question itself."""
        
    state["answer"] = (await llm.ainvoke(prompt)).content
    
    # Save the question and context as the last quiz state so that the student's response
    # can be checked by the evaluator node in the subsequent turn.
    state["last_quiz_question"] = state["answer"]
    state["last_quiz_context"] = state["context"]
    
    return state