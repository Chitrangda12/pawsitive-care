from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.allergy import Allergy
from app.models.dog import Dog
from app.schemas.allergy import AllergyCreate, AllergyOut, AllergyUpdate, DogAllergyAssign
from sqlalchemy.orm import selectinload

router = APIRouter(tags=["Allergy Master"])


@router.get("/", response_model=list[AllergyOut])
async def list_master_allergies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Allergy))
    return result.scalars().all()


@router.post("/", response_model=AllergyOut, status_code=201)
async def create_master_allergy(data: AllergyCreate, db: AsyncSession = Depends(get_db)):
    allergy = Allergy(**data.model_dump())
    db.add(allergy)
    await db.commit()
    await db.refresh(allergy)
    return allergy


# Dog-specific Allergy Management
dog_allergy_router = APIRouter(tags=["Dog Allergies"])


@dog_allergy_router.get("/", response_model=list[AllergyOut])
async def list_dog_allergies(dog_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Dog).options(selectinload(Dog.allergies)).where(Dog.id == dog_id)
    )
    dog = result.scalar_one_or_none()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found")
    return dog.allergies


@dog_allergy_router.post("/assign", status_code=200)
async def assign_allergies(dog_id: int, data: DogAllergyAssign, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Dog).options(selectinload(Dog.allergies)).where(Dog.id == dog_id)
    )
    dog = result.scalar_one_or_none()
    if not dog:
        raise HTTPException(status_code=404, detail="Dog not found")

    if not data.allergy_ids:
        dog.allergies = []
    else:
        res = await db.execute(select(Allergy).where(Allergy.id.in_(data.allergy_ids)))
        dog.allergies = list(res.scalars().all())

    await db.commit()
    return {"status": "success", "assigned_count": len(dog.allergies)}
