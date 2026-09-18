from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database import init_db
from app.routers import auth, users, departments, courses, schedules, announcements, ai, analytics

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables on startup."""
    init_db()
    yield


app = FastAPI(
    title="GIST - AI-Powered Digital Campus",
    description="Geethanjali Institute of Science and Technology - Smart campus platform with AI assistance",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS Middleware ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routers ─────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(departments.router, prefix="/api/departments", tags=["Departments"])
app.include_router(courses.router, prefix="/api/courses", tags=["Courses"])
app.include_router(schedules.router, prefix="/api/schedules", tags=["Schedules"])
app.include_router(announcements.router, prefix="/api/announcements", tags=["Announcements"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Assistant"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


# ─── Health Check ─────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "GIST - AI-Powered Digital Campus",
        "version": "1.0.0",
    }
