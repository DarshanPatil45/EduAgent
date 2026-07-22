from motor.motor_asyncio import AsyncIOMotorClient
from core.config import MONGODB_URL, MONGODB_DB_NAME

client: AsyncIOMotorClient = None

async def connect_db():
    global client
    if MONGODB_URL.startswith("mongodb+srv://"):
        try:
            import certifi
            ca_file = certifi.where()
        except ImportError:
            ca_file = None
            
        client = AsyncIOMotorClient(
            MONGODB_URL,
            tls=True,
            tlsCAFile=ca_file,
            serverSelectionTimeoutMS=30000,
        )
    else:
        # Local connection (no TLS/SSL)
        client = AsyncIOMotorClient(MONGODB_URL)
    
    # Ping to confirm connection works at startup
    await client.admin.command("ping")


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return client[MONGODB_DB_NAME]