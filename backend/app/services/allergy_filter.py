"""Core Allergy Constraint Engine — the heart of Pawsitive Care's safety-first architecture.

Every module MUST query this engine before generating output.
All filtering decisions are logged for audit trails.
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.dog import Dog
from app.models.allergy import Allergy, AllergyCategory

logger = logging.getLogger("pawsitivecare.allergy_filter")


class AllergyFilter:
    """Centralized allergy constraint engine for the allergy-first pipeline."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dog_with_allergies(self, dog_id: int) -> Dog | None:
        result = await self.db.execute(
            select(Dog).options(selectinload(Dog.allergies)).where(Dog.id == dog_id)
        )
        return result.scalar_one_or_none()

    async def get_allergies(self, dog_id: int) -> list[Allergy]:
        dog = await self.get_dog_with_allergies(dog_id)
        return dog.allergies if dog else []

    async def get_food_allergies(self, dog_id: int) -> list[str]:
        allergies = await self.get_allergies(dog_id)
        food_allergens = [
            a.name.lower()
            for a in allergies
            if a.category == AllergyCategory.FOOD
        ]
        logger.info(f"Dog {dog_id} food allergens: {food_allergens}")
        return food_allergens

    async def get_environmental_allergies(self, dog_id: int) -> list[str]:
        allergies = await self.get_allergies(dog_id)
        env_allergens = [
            a.name.lower()
            for a in allergies
            if a.category in [AllergyCategory.ENVIRONMENTAL, AllergyCategory.SENSITIVITY]
        ]
        logger.info(f"Dog {dog_id} environmental/sensitivity allergens: {env_allergens}")
        return env_allergens

    async def get_medication_allergies(self, dog_id: int) -> list[str]:
        allergies = await self.get_allergies(dog_id)
        med_allergens = [
            a.name.lower()
            for a in allergies
            if a.category == AllergyCategory.MEDICATION
        ]
        logger.info(f"Dog {dog_id} medication allergens: {med_allergens}")
        return med_allergens

    def filter_items(self, items: list[str], allergens: list[str]) -> list[str]:
        """Remove items that match known allergens."""
        safe_items = []
        for item in items:
            is_safe = True
            for allergen in allergens:
                if allergen in item.lower():
                    logger.warning(f"BLOCKED: '{item}' contains allergen '{allergen}'")
                    is_safe = False
                    break
            if is_safe:
                safe_items.append(item)
        return safe_items

    async def get_allergy_constraint_prompt(self, dog_id: int) -> str:
        """Generate a constraint string for LLM prompts."""
        allergies = await self.get_allergies(dog_id)
        if not allergies:
            return "No known allergies."

        constraints = []
        for a in allergies:
            constraints.append(f"- {a.name} ({a.category.value})")

        return (
            "CRITICAL ALLERGY CONSTRAINTS — DO NOT recommend anything containing these:\n"
            + "\n".join(constraints)
        )
