from pydantic import BaseModel, Field


class EnvironmentRiskRequest(BaseModel):
    dog_id: int
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class EnvironmentRiskOut(BaseModel):
    dog_name: str
    location: dict
    risk_level: str
    environmental_risk_score: float
    ml_model_contribution: float
    allergy_impact_score: float
    allergy_severity_level: str
    allergy_trigger_detected: bool
    trigger_factors: list[str]
    vaccine_recommendations: dict
    urgency: str
    explanation: str
    disclaimer: str
    activity_guidance: list[dict]
    environmental_data: dict
    is_fallback: bool = False
    fallback_reasons: list[str] = []
