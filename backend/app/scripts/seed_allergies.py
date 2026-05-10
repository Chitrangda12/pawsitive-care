import asyncio
import logging
from sqlalchemy import select
from app.database import async_session, engine, Base, init_db
from app.models.allergy import Allergy, AllergyCategory
from app.models.dog import Dog
from app.models.vaccination import VaccinationRecord
from app.models.fir import FIRRecord

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_allergies():
    print("Initializing database...")
    await init_db()
    
    async with async_session() as session:
        # Check if already seeded
        result = await session.execute(select(Allergy).limit(1))
        if result.scalar_one_or_none():
            print("Allergies already seeded.")
            return

        print("Seeding allergies...")
        allergies = [
            # Environmental
            Allergy(name="Dust Mites", category=AllergyCategory.ENVIRONMENTAL, description="Microscopic bugs that live in household dust."),
            Allergy(name="Pollen", category=AllergyCategory.ENVIRONMENTAL, description="Fine powder from plants, prominent in spring and summer."),
            Allergy(name="Mold", category=AllergyCategory.ENVIRONMENTAL, description="Fungal growth that thrives in damp conditions."),
            Allergy(name="Grass", category=AllergyCategory.ENVIRONMENTAL, description="Allergy to various types of lawn and wild grasses."),
            Allergy(name="Ragweed", category=AllergyCategory.ENVIRONMENTAL, description="Common weed pollen causing seasonal allergies."),
            
            # Food
            Allergy(name="Chicken", category=AllergyCategory.FOOD, description="Sensitivity to chicken protein."),
            Allergy(name="Beef", category=AllergyCategory.FOOD, description="Sensitivity to beef protein."),
            Allergy(name="Dairy", category=AllergyCategory.FOOD, description="Intolerance or allergy to milk products."),
            Allergy(name="Wheat", category=AllergyCategory.FOOD, description="Gluten or wheat protein sensitivity."),
            Allergy(name="Soy", category=AllergyCategory.FOOD, description="Sensitivity to soy-based ingredients."),
            
            # Sensitivity
            Allergy(name="Heat Sensitivity", category=AllergyCategory.SENSITIVITY, description="Reduced ability to tolerate high temperatures."),
            Allergy(name="Cold Sensitivity", category=AllergyCategory.SENSITIVITY, description="Reduced ability to tolerate low temperatures."),
            
            # Medication
            Allergy(name="Penicillin", category=AllergyCategory.MEDICATION, description="Allergic reaction to penicillin-based antibiotics."),
        ]

        session.add_all(allergies)
        await session.commit()
        print(f"Seeded {len(allergies)} allergies.")


if __name__ == "__main__":
    try:
        asyncio.run(seed_allergies())
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
        import traceback
        traceback.print_exc()
