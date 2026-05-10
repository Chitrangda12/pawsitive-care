from pydantic import BaseModel, Field
from app.models.fir import UrgencyLevel


class FIRRequest(BaseModel):
    dog_id: int
    symptoms: str = Field(..., min_length=5, max_length=2000)
    environmental_context: dict | None = None


class FIROutModel(BaseModel):
    observations: str
    possible_concerns: str
    risk_level: str
    urgency: str
    allergy_trigger_detected: bool
    environmental_summary: str
    explanation: str
    disclaimer: str

    model_config = {"from_attributes": True}
