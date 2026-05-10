"""Environmental Risk Module — aggregates external APIs and scores risk."""

import logging
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.dog import Dog
from app.models.allergy import AllergyCategory
from app.services.allergy_filter import AllergyFilter
from app.services.hf_ml_engine import hf_engine
from app.services.vaccination_engine import VaccinationEngine
from app.config import get_settings

logger = logging.getLogger("pawsitivecare.environment")
settings = get_settings()


class EnvironmentRiskService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.allergy_filter = AllergyFilter(db)

    async def assess_risk(self, dog_id: int, lat: float, lng: float) -> dict:
        result = await self.db.execute(
            select(Dog).options(selectinload(Dog.allergies)).where(Dog.id == dog_id)
        )
        dog = result.scalar_one_or_none()
        if not dog:
            raise ValueError(f"Dog with id {dog_id} not found")

        # Query environmental allergies (ALLERGY-FIRST)
        env_allergens = [a.name.lower() for a in dog.allergies if a.category in [AllergyCategory.ENVIRONMENTAL, AllergyCategory.SENSITIVITY]]

        # Fetch external data
        weather = await self._fetch_weather(lat, lng)
        aqi = await self._fetch_aqi(lat, lng)

        # ML Prediction Hook - Task 5: UPDATE ML INPUT
        weather_text = f"The current temperature is {weather.get('temp')}°C and humidity is {weather.get('humidity')}%."
        aqi_text = f"The Air Quality Index (AQI) is {aqi.get('aqi')}."
        if env_allergens:
            allergy_text = f"CRITICAL: This dog has the following environmental allergies: {', '.join(env_allergens)}. These allergies are sensitive to heat, dust, and humidity."
        else:
            allergy_text = "This dog has no known environmental allergies."
            
        ml_input_text = (
            f"Context: {weather_text} {aqi_text} {allergy_text} "
            "Task: Based on the dog's personal allergy profile and the environmental data, "
            "predict the health risk level as LOW, MEDIUM, or HIGH. "
            "Consider that allergies significantly amplify environmental risks."
        )
        
        ml_result = await hf_engine.predict_risk(ml_input_text)
        logger.info(f"ML Risk Prediction Result for {dog.name} (ID: {dog_id}): {ml_result}")

        # Calculate hybrid risk
        total_score, eval_level, alerts, ml_cont, allergy_impact, allergy_severity_level = self._calculate_risk(weather, aqi, env_allergens, ml_result)
        logger.info(f"Personalized Risk for {dog.name}: score={total_score}, impact={allergy_impact}, triggers={env_allergens}")

        # Activity guidance
        guidance = self._generate_guidance(eval_level, env_allergens, weather)

        # Get vaccination recommendations
        vaccine_engine = VaccinationEngine(self.db)
        vaccine_evals = await vaccine_engine.evaluate_all_vaccines(dog_id)
        
        safe_vaccines = []
        restricted_vaccines = []
        for v in vaccine_evals:
            v_data = {
                "name": v["vaccine_name"],
                "type": "general" if not v["contraindications"] else "allergy-sensitive",
                "contraindications": v["contraindications"],
                "reason": v["reason"]
            }
            if v["status"].value == "safe":
                safe_vaccines.append(v_data)
            else:
                restricted_vaccines.append(v_data)

        is_fallback = False
        fallback_reasons = []

        if weather.get("description") in ["API unavailable", "Mock data — set OPENWEATHER_API_KEY"]:
            is_fallback = True
            fallback_reasons.append("Environmental APIs")
            
        if ml_result.get("source", "") == "rule_based_fallback":
            is_fallback = True
            fallback_reasons.append("Advanced AI")

        # Build response payload
        return {
            "dog_name": dog.name,
            "location": {"latitude": lat, "longitude": lng},
            "risk_level": eval_level,
            "environmental_risk_score": total_score,
            "allergy_severity_level": allergy_severity_level,
            "allergy_impact_score": allergy_impact,
            "ml_model_contribution": ml_cont,
            "allergy_trigger_detected": allergy_impact > 0,
            "trigger_factors": alerts,
            "vaccine_recommendations": {
                "safe": safe_vaccines,
                "restricted": restricted_vaccines
            },
            "urgency": "high" if eval_level in ["high", "critical"] else "standard",
            "explanation": f"Risk assessed at {eval_level.upper()}. " 
                          f"{f'Allergy triggers ({', '.join(env_allergens)}) significantly increased the risk.' if allergy_impact > 0 else 'Based on general environmental conditions.'}",
            "disclaimer": "Environmental risk data is approximate. Always monitor your pet and consult a vet for unusual symptoms.",
            "activity_guidance": guidance,
            "environmental_data": {
                "temperature": weather.get("temp"),
                "humidity": weather.get("humidity"),
                "aqi": aqi.get("aqi")
            },
            "is_fallback": is_fallback,
            "fallback_reasons": fallback_reasons
        }

    async def _fetch_weather(self, lat: float, lng: float) -> dict:
        if not settings.OPENWEATHER_API_KEY:
            return {"temp": 25, "humidity": 60, "wind_speed": 10, "description": "Mock data — set OPENWEATHER_API_KEY"}

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={"lat": lat, "lon": lng, "appid": settings.OPENWEATHER_API_KEY, "units": "metric"},
                )
                data = resp.json()
                return {
                    "temp": data["main"]["temp"],
                    "humidity": data["main"]["humidity"],
                    "wind_speed": data["wind"]["speed"],
                    "description": data["weather"][0]["description"],
                }
        except Exception as e:
            logger.error(f"Weather API failed: {e}")
            return {"temp": 25, "humidity": 60, "wind_speed": 10, "description": "API unavailable"}

    async def _fetch_aqi(self, lat: float, lng: float) -> dict:
        if not settings.AQI_API_KEY:
            return {"aqi": 50, "category": "Moderate (mock data — set AQI_API_KEY)"}

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"https://api.waqi.info/feed/geo:{lat};{lng}/",
                    params={"token": settings.AQI_API_KEY},
                )
                data = resp.json()
                aqi_val = data.get("data", {}).get("aqi", 50)
                return {"aqi": aqi_val, "category": self._aqi_category(aqi_val)}
        except Exception as e:
            logger.error(f"AQI API failed: {e}")
            return {"aqi": 50, "category": "Unknown"}

    def _aqi_category(self, aqi: int) -> str:
        if aqi <= 50: return "Good"
        if aqi <= 100: return "Moderate"
        if aqi <= 150: return "Unhealthy for Sensitive Groups"
        if aqi <= 200: return "Unhealthy"
        if aqi <= 300: return "Very Unhealthy"
        return "Hazardous"

    def _calculate_risk(self, weather: dict, aqi: dict, allergens: list[str], ml_result: dict) -> tuple[float, str, list[str], float, float, str]:
        base_score = 0.0
        allergy_impact_score = 0.0
        alerts = []
        allergy_severity_level = "LOW"

        # Internal helper for flexible matching - Ensure lowercase for Task 4
        def has_allergy(*terms):
            normalized_allergens = [a.lower().strip() for a in allergens]
            return any(any(term.lower().strip() in a for term in terms) for a in normalized_allergens)

        # 1. Base Environmental Factors
        temp = weather.get("temp", 25)
        humidity = weather.get("humidity", 50)
        aqi_val = aqi.get("aqi", 50)

        # Base Temperature Risk
        if temp > 35:
            base_score = base_score + 30 # Task 1: Replace risk + value with risk = risk + value
            alerts.append("⚠️ Extreme heat detected")
        elif temp > 30:
            base_score = base_score + 15
            alerts.append("🌡️ High temperature detected")

        # Base AQI Risk
        if aqi_val > 150:
            base_score = base_score + 25
            alerts.append("🏭 Poor air quality detected")
        elif aqi_val > 100:
            base_score = base_score + 10
            alerts.append("💨 Moderate air quality detected")

        # 2. Allergy-Aware Logic (The Safety Layer)
        logger.info(f"DEBUG: Starting allergy logic check. Dog Allergies: {allergens}")
        score_before_allergies = base_score
        
        # Task 2: Implement Strong Allergy Impact
        # Dust Allergy
        if has_allergy("dust"):
            if aqi_val > 180:
                impact = 60
                allergy_impact_score += impact
                allergy_severity_level = "CRITICAL"
                alerts.append(f"🚨 ALLERGY ALERT: Severe dust allergy triggered by AQI {aqi_val}")
                logger.info(f"DEBUG: Triggered Severe Dust allergy impact +{impact}")
            elif aqi_val > 120:
                impact = 40
                allergy_impact_score += impact
                allergy_severity_level = "HIGH" if allergy_severity_level not in ["CRITICAL"] else allergy_severity_level
                alerts.append(f"🚨 ALLERGY ALERT: Dust allergy triggered by AQI {aqi_val}")
                logger.info(f"DEBUG: Triggered Dust allergy impact +{impact}")
        
        # Pollen/Mold Allergy
        if has_allergy("mold", "mildew", "pollen", "grass", "ragweed"):
            if humidity > 75:
                impact = 60
                allergy_impact_score += impact
                allergy_severity_level = "CRITICAL"
                alerts.append(f"🚨 ALLERGY ALERT: Molde/Pollen allergy triggered by high humidity ({humidity}%)")
                logger.info(f"DEBUG: Triggered Severe Mold/Pollen allergy impact +{impact}")
            elif humidity > 60:
                impact = 40
                allergy_impact_score += impact
                allergy_severity_level = "HIGH" if allergy_severity_level not in ["CRITICAL"] else allergy_severity_level
                alerts.append(f"🚨 ALLERGY ALERT: Mold/Pollen allergy triggered by high humidity ({humidity}%)")
                logger.info(f"DEBUG: Triggered Mold/Pollen allergy impact +{impact}")

        # Heat Sensitivity
        if has_allergy("heat", "sensitivity"):
            if temp > 35:
                impact = 60
                allergy_impact_score += impact
                allergy_severity_level = "CRITICAL"
                alerts.append(f"🚨 ALLERGY ALERT: Severe heat sensitivity triggered by temperature ({temp}°C)")
            elif temp > 30:
                impact = 40
                allergy_impact_score += impact
                allergy_severity_level = "HIGH" if allergy_severity_level not in ["CRITICAL"] else allergy_severity_level
                alerts.append(f"🚨 ALLERGY ALERT: Heat sensitivity triggered by temperature ({temp}°C)")

        # General Pollen/Grass check (base impact)
        if has_allergy("pollen", "grass", "ragweed") and allergy_impact_score == 0:
            impact = 15
            allergy_impact_score += impact
            allergy_severity_level = "MEDIUM" if allergy_severity_level == "LOW" else allergy_severity_level
            alerts.append("🌾 Allergy Trigger: Seasonal allergens detected")

        logger.info(f"DEBUG: Allergy logic complete. Score Before: {score_before_allergies}, Impact: {allergy_impact_score}")

        # 3. ML Model Contribution
        ml_contribution = 0.0
        prediction = ml_result.get("prediction", "UNKNOWN")
        
        if prediction == "HIGH":
            ml_contribution = 35.0
        elif prediction == "MEDIUM":
            ml_contribution = 15.0
            
        total_score = base_score + allergy_impact_score + ml_contribution
        
        # Task 3: ADD OVERRIDE LOGIC
        # If allergy trigger detected: Force risk_level to HIGH or CRITICAL
        if allergy_severity_level == "CRITICAL" or allergy_impact_score >= 60:
            total_score = max(total_score, 85) # Force Critical
            logger.info("DEBUG: Safety Override - Forcing score to CRITICAL due to severe allergy trigger")
        elif allergy_severity_level == "HIGH" or allergy_impact_score >= 40:
            total_score = max(total_score, 65) # Force High
            logger.info("DEBUG: Safety Override - Forcing score to HIGH due to allergy trigger")

        total_score = min(total_score, 100)
        
        # Final Level determination
        if total_score >= 85:
            level = "critical"
        elif total_score >= 60:
            level = "high"
        elif total_score >= 30:
            level = "moderate"
        else:
            level = "low"

        return round(total_score, 1), level, alerts, ml_contribution, allergy_impact_score, allergy_severity_level

    def _generate_guidance(self, risk_level: str, allergens: list[str], weather: dict) -> list[dict]:
        guidance = []

        if risk_level in ["high", "critical"]:
            guidance.append({
                "activity": "Outdoor walks",
                "recommendation": "Limit to 10-15 minutes, early morning or late evening",
                "icon": "🚶"
            })
            guidance.append({
                "activity": "Indoor play",
                "recommendation": "Preferred — use indoor enrichment toys",
                "icon": "🏠"
            })
        else:
            guidance.append({
                "activity": "Outdoor walks",
                "recommendation": "Normal duration, monitor for symptoms",
                "icon": "🚶"
            })

        if any(a in ["pollen", "grass"] for a in allergens):
            guidance.append({
                "activity": "Post-walk care",
                "recommendation": "Wipe paws and coat after outdoor activity",
                "icon": "🧹"
            })

        if weather.get("temp", 25) > 30:
            guidance.append({
                "activity": "Hydration",
                "recommendation": "Ensure fresh water available at all times",
                "icon": "💧"
            })

        return guidance
