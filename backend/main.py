"""
Temaruco Clothing Factory API
Modular Backend Structure

This is the new modular entry point. The original server.py is kept for backward 
compatibility but new development should use this structure.

Structure:
- /core - Configuration, database, authentication
- /models - Pydantic schemas
- /routes - API route handlers
- /services - Business logic
"""
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core import CORS_ORIGINS
from core.database import connect_db, close_db
from routes import all_routers

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    await connect_db()
    logger.info("Application started")
    yield
    # Shutdown
    await close_db()
    logger.info("Application shutdown")

# Create FastAPI app
app = FastAPI(
    title="Temaruco Clothing Factory API",
    description="Modular backend for Temaruco e-commerce platform",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers with /api prefix
for router in all_routers:
    app.include_router(router, prefix="/api")

@app.get("/api/")
async def root():
    return {"message": "Temaruco API v2.0 - Modular Architecture"}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "version": "2.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
