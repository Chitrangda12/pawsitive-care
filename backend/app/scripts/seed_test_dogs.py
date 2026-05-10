import asyncio
import logging
from sqlalchemy import select
from app.database import async_session, init_db
from app.models.dog import Dog
from app.models.allergy import Allergy, AllergyCategory
from app.models.vaccination import VaccinationRecord
from app.models.fir import FIRRecord

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_test_data():
    await init_db()
    
    async with async_session() as session:
        # 1. Check for allergies
        res = await session.execute(select(Allergy))
        allergies = res.scalars().all()
        if not allergies:
            print("Please run seed_allergies.py first.")
            return

        # 2. Add a test dog
        res = await session.execute(select(Dog).where(Dog.name == "Buddy"))
        if res.scalar_one_or_none():
            print("Buddy already exists.")
        else:
            buddy = Dog(
                name="Buddy",
                breed="Golden Retriever",
                age_years=5.0,
                weight_kg=30.0,
                owner_name="Hasdeep"
            )
            # Add Dust and Heat Sensitivity to Buddy
            for a in allergies:
                if a.name in ["Dust Mites", "Heat Sensitivity", "Mold"]:
                    buddy.allergies.append(a)
            
            session.add(buddy)
            print("Added Buddy with Dust and Heat allergies.")

        # 3. Add another dog without allergies
        res = await session.execute(select(Dog).where(Dog.name == "Max"))
        if res.scalar_one_or_none():
            print("Max already exists.")
        else:
            max_dog = Dog(
                name="Max",
                breed="Beagle",
                age_years=3.0,
                weight_kg=12.0,
                owner_name="Singh"
            )
            session.add(max_dog)
            print("Added Max with no allergies.")
            
        await session.commit()
        print("Test data seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_test_data())
