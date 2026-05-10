from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.fir_generator import FIRGenerator
from app.schemas.fir import FIRRequest, FIROutModel

router = APIRouter(tags=["FIR"])


@router.post("/generate", response_model=FIROutModel)
async def generate_fir(
    request: FIRRequest,
    db: AsyncSession = Depends(get_db),
):
    generator = FIRGenerator(db)
    try:
        result = await generator.generate_fir(
            dog_id=request.dog_id,
            symptoms=request.symptoms,
            environmental_context=request.environmental_context
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FIR generation failed: {str(e)}")
