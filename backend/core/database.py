"""Database connection and utilities"""
from motor.motor_asyncio import AsyncIOMotorClient
from .config import MONGO_URL, DB_NAME
import logging

logger = logging.getLogger(__name__)

# MongoDB connection
client = None
db = None

async def connect_db():
    """Initialize database connection"""
    global client, db
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        # Test connection
        await client.admin.command('ping')
        logger.info(f"Successfully connected to MongoDB: {DB_NAME}")
        return db
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        raise

async def close_db():
    """Close database connection"""
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")

def get_db():
    """Get database instance"""
    global db
    return db
