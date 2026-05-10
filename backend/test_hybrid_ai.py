import asyncio
from app.services.hf_ml_engine import hf_engine

async def test_fallback():
    print("Testing ML Engine Local & Fallback...")
    res = await hf_engine.predict_risk("Temperature is 38C, AQI is 150. Dog has allergy to pollen.")
    print("Result:", res)

if __name__ == "__main__":
    asyncio.run(test_fallback())
