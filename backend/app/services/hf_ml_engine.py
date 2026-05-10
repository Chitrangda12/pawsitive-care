import logging
import httpx
from typing import Literal
from app.config import get_settings

logger = logging.getLogger("pawsitivecare.hf_engine")
settings = get_settings()

class HFMLEngine:
    def __init__(self):
        self.model_name = "typeform/distilbert-base-uncased-mnli"
        self.pipeline = None
        self._initialize_pipeline()

    def _initialize_pipeline(self):
        try:
            from transformers import pipeline
            logger.info("Initializing Hugging Face zero-shot pipeline locally...")
            self.pipeline = pipeline("zero-shot-classification", model=self.model_name)
        except Exception as e:
            logger.error(f"Failed to load local transformers model: {e}. Will rely on API fallback.")
            self.pipeline = None

    async def predict_risk(self, text: str) -> dict:
        """
        Predict environmental risk based on textual combination of weather + allergies.
        Expects a return dict mapping indicating highest label confidence.
        """
        candidate_labels = ["LOW", "MEDIUM", "HIGH"]
        
        # 1. Try local model
        if self.pipeline is not None:
            try:
                # Transformers pipeline is synchronous, running in thread pool or fast enough locally
                result = self.pipeline(text, candidate_labels)
                highest_idx = 0
                max_score = 0.0
                for i, score in enumerate(result['scores']):
                    if score > max_score:
                        max_score = score
                        highest_idx = i
                
                label = result['labels'][highest_idx]
                return {
                    "source": "hf_local_model",
                    "prediction": label,
                    "confidence": float(max_score)
                }
            except Exception as e:
                logger.error(f"Local HF prediction failed: {e}. Trying fallback.")
        
        # 2. Try Fallback Inference API
        return await self._predict_risk_fallback(text, candidate_labels)

    async def _predict_risk_fallback(self, text: str, candidate_labels: list[str]) -> dict:
        if settings.HF_TOKEN:
            api_url = f"https://api-inference.huggingface.co/models/{self.model_name}"
            headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"}
            payload = {
                "inputs": text,
                "parameters": {"candidate_labels": candidate_labels}
            }
            
            try:
                import httpx
                async with httpx.AsyncClient(timeout=10) as client:
                    res = await client.post(api_url, headers=headers, json=payload)
                    res.raise_for_status()
                    result = res.json()
                    
                    label = result['labels'][0]
                    confidence = result['scores'][0]
                    return {
                        "source": "hf_inference_api",
                        "prediction": label,
                        "confidence": float(confidence)
                    }
            except Exception as e:
                logger.error(f"HF API Fallback failed: {e}")
                
        # If no HF token or it failed, upgrade to Gemini API instead of rule-based fallback!
        try:
            from app.ai.llm_client import generate_json_response
            prompt = (
                f"{text}\n\n"
                "Return exactly this JSON format: {\"prediction\": \"LOW\" | \"MEDIUM\" | \"HIGH\", \"confidence\": 0.0-1.0}"
            )
            response = await generate_json_response(prompt)
            if "prediction" in response:
                return {
                    "source": "gemini_ai_engine",
                    "prediction": response["prediction"].upper(),
                    "confidence": response.get("confidence", 0.95)
                }
            else:
                return {
                    "source": "gemini_ai_engine",
                    "prediction": "HIGH", 
                    "confidence": 0.85
                }
        except Exception as e:
            logger.error(f"Gemini Risk API fallback failed: {e}")

        # Final absolute fallback if no internet
        return {"source": "rule_based_fallback", "prediction": "UNKNOWN", "confidence": 0.0}

# Global singleton
hf_engine = HFMLEngine()
