from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db
from app.routers import dogs, allergies, vaccinations, diet, environment, fir

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Allergy-Aware Intelligent Veterinary Decision Support System",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
# Register routers
app.include_router(dogs.router, prefix="/api/v1/dogs")
from app.routers.allergies import router as allergy_master_router, dog_allergy_router
app.include_router(allergy_master_router, prefix="/api/v1/allergies")
app.include_router(dog_allergy_router, prefix="/api/v1/dogs/{dog_id}/allergies")
app.include_router(vaccinations.router, prefix="/api/v1/vaccinations")
app.include_router(diet.router, prefix="/api/v1/diet")
app.include_router(environment.router, prefix="/api/v1/environment")
app.include_router(fir.router, prefix="/api/v1/fir")


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}
