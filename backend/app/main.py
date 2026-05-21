from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routes.papers import router as papers_router
from app.routes.settings import router as settings_router
from app.schemas import HealthResponse


app = FastAPI(title="PaperCat Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "file://"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


app.include_router(papers_router, prefix="/api/papers", tags=["papers"])
app.include_router(settings_router, prefix="/api/settings", tags=["settings"])
