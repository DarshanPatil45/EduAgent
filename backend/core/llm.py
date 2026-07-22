
from langchain_mistralai import ChatMistralAI, MistralAIEmbeddings
from core.config import MISTRAL_API_KEY

embeddings = MistralAIEmbeddings(model="mistral-embed", api_key=MISTRAL_API_KEY)

llm = ChatMistralAI(model="mistral-large-latest", api_key=MISTRAL_API_KEY)

classifier_llm = ChatMistralAI(model="mistral-small-latest", api_key=MISTRAL_API_KEY)

# JSON mode — bind instead of constructor kwarg (fixes the UserWarning)
json_llm = ChatMistralAI(
    model="mistral-large-latest",
    api_key=MISTRAL_API_KEY,
).bind(response_format={"type": "json_object"})