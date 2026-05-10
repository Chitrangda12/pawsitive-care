from pydantic import BaseModel, Field
from datetime import datetime
from app.models.allergy import AllergyCategory


class AllergyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: AllergyCategory
    description: str | None = None


class AllergyCreate(AllergyBase):
    pass


class AllergyUpdate(BaseModel):
    name: str | None = None
    category: AllergyCategory | None = None
    description: str | None = None


class AllergyOut(AllergyBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DogAllergyAssign(BaseModel):
    allergy_ids: list[int]
