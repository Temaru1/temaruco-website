"""Routes module - exports all routers"""
from .auth import router as auth_router
from .payments import router as payments_router

# List of all routers to include
all_routers = [
    auth_router,
    payments_router,
]
