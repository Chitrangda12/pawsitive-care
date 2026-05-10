"""Multimodal FIR (First Information Report) Generator — Gemini Vision + allergy-aware analysis."""

import logging
import base64
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.dog import Dog
from app.models.fir import FIRRecord, UrgencyLevel
from app.services.allergy_filter import AllergyFilter
from app.ai.llm_client import generate_json_response, generate_vision_response
from app.ai.prompt_manager import PromptManager

logger = logging.getLogger("pawsitivecare.fir")


class FIRGenerator:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.allergy_filter = AllergyFilter(db)

    async def generate_fir(
        self, dog_id: int, symptoms: str,
        environmental_context: dict | None = None
    ) -> dict:
        # 1. Fetch dog profile
        result = await self.db.execute(
            select(Dog).where(Dog.id == dog_id)
        )
        dog = result.scalar_one_or_none()
        if not dog:
            raise ValueError(f"Dog with id {dog_id} not found")

        # 2. Query allergy constraints (ALLERGY-FIRST)
        allergy_constraint = await self.allergy_filter.get_allergy_constraint_prompt(dog_id)

        # 3. Vision analysis removed (text-only timeline)
        visual_summary = "Image analysis unavailable — text-only assessment."

        # 4. format environmental context string
        env_text = "No environmental context provided."
        if environmental_context:
            env_text = f"Risk Level: {environmental_context.get('risk_level', 'Unknown')}, " \
                       f"Score: {environmental_context.get('environmental_risk_score', 'N/A')}. " \
                       f"Trigger Factors: {', '.join(environmental_context.get('trigger_factors', []))}."

        # 5. Build FIR prompt
        prompt = PromptManager.fir_prompt(
            breed=dog.breed.value,
            age=dog.age_years,
            weight=dog.weight_kg,
            symptoms=symptoms,
            visual_summary=visual_summary or "No image provided",
            allergy_constraints=allergy_constraint,
            environmental_context=env_text
        )

        # 6. Generate FIR via LLM
        try:
            report = await generate_json_response(prompt)
        except Exception as e:
            logger.error(f"FIR generation failed: {e}")
            report = self._fallback_report(symptoms)

        # 7. Persist FIR record (Existing Architecture preservation)
        urgency_val = report.get("urgency", "MEDIUM").upper()
        if urgency_val not in [u.value for u in UrgencyLevel]:
            urgency_val = "MEDIUM"

        fir_record = FIRRecord(
            dog_id=dog_id,
            owner_description=symptoms,
            visual_summary=visual_summary,
            urgency=UrgencyLevel(urgency_val),
            full_report=report,
            disclaimer=report.get("disclaimer", "This is an AI-assisted assessment, not a medical diagnosis")
        )
        self.db.add(fir_record)
        await self.db.commit()

        # Return structured output
        return {
            "observations": report.get("observations", symptoms),
            "possible_concerns": report.get("possible_concerns", "Requires veterinary evaluation."),
            "risk_level": report.get("risk_level", environmental_context.get('risk_level', 'Unknown') if environmental_context else "Unknown"),
            "urgency": urgency_val,
            "allergy_trigger_detected": report.get("allergy_trigger_detected", False),
            "environmental_summary": report.get("environmental_summary", "Not assessed."),
            "explanation": report.get("explanation", "AI analysis completed."),
            "disclaimer": report.get("disclaimer", "This is an AI-assisted assessment, not a medical diagnosis")
        }

    async def _analyze_image_b64(self, b64_image: str, breed: str) -> str:
        prompt = PromptManager.vision_analysis_prompt(breed)
        return await generate_vision_response(prompt, b64_image)

    def _fallback_report(self, symptoms: str) -> dict:
        return {
            "observations": symptoms,
            "possible_concerns": "Unable to determine — consult veterinarian.",
            "risk_level": "Unknown",
            "urgency": "MEDIUM",
            "allergy_trigger_detected": False,
            "environmental_summary": "Analysis unavailable",
            "explanation": "Safe text-only fallback executed.",
            "disclaimer": "This is an AI-assisted assessment, not a medical diagnosis"
        }

    async def _analyze_image(self, image_data: bytes, breed: str) -> str:
        prompt = PromptManager.vision_analysis_prompt(breed)
        b64_image = base64.b64encode(image_data).decode("utf-8")
        return await generate_vision_response(prompt, b64_image)


