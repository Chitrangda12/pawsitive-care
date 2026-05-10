"""Centralized Prompt Manager — all LLM prompts live here to prevent prompt drift."""


class PromptManager:
    @staticmethod
    def diet_plan_prompt(
        breed: str, age: float, weight: float,
        allergy_constraints: str, preferences: str | None = None,
    ) -> str:
        pref_line = f"\nOwner Preferences: {preferences}" if preferences else ""
        return f"""You are a veterinary nutritionist AI assistant. Generate a personalized diet plan for a dog.

DOG PROFILE:
- Breed: {breed}
- Age: {age} years
- Weight: {weight} kg
{pref_line}

{allergy_constraints}

IMPORTANT RULES:
1. NEVER include any ingredient that matches the allergy constraints above.
2. Consider breed-specific nutritional needs.
3. Provide practical, actionable meal plans.
4. Include supplements appropriate for the breed and age.

Respond ONLY with valid JSON in this exact format:
{{
  "meal_plan": {{
    "morning": "description of morning meal",
    "evening": "description of evening meal",
    "snacks": "description of safe snack options"
  }},
  "avoid_list": ["allergen1", "allergen2"],
  "supplements": ["supplement1", "supplement2"],
  "feeding_schedule": {{
    "meals_per_day": 2,
    "morning": "7:00 AM",
    "evening": "6:00 PM",
    "notes": "any special instructions"
  }}
}}"""

    @staticmethod
    def fir_prompt(
        breed: str, age: float, weight: float,
        symptoms: str, visual_summary: str,
        allergy_constraints: str, environmental_context: str
    ) -> str:
        return f"""You are a veterinary triage AI assistant. Generate a First Information Report (FIR) for a dog health concern.

DOG PROFILE:
- Breed: {breed}
- Age: {age} years
- Weight: {weight} kg

OWNER'S DECLARED SYMPTOMS:
{symptoms}

VISUAL ANALYSIS (from separate multimodal stage):
{visual_summary}

ENVIRONMENTAL RISK DATA (Injected from Environment layer):
{environmental_context}

{allergy_constraints}

IMPORTANT RULES:
1. Do NOT provide a medical diagnosis.
2. Do NOT prescribe medication.
3. Consider breed-specific health predispositions.
4. If Environmental Risk is High/Critical, heavily weigh that in the 'environmental_summary'.
5. Always include disclaimer EXACTLY as: 'This is an AI-assisted assessment, not a medical diagnosis'

Respond ONLY with valid JSON in this exact format:
{{
  "observations": "string detailing what is reported and observed",
  "possible_concerns": "string of non-diagnostic concerns",
  "risk_level": "Use Risk Level from Environmental Data if relevant, else string",
  "urgency": "LOW|MEDIUM|HIGH",
  "allergy_trigger_detected": true or false,
  "environmental_summary": "string analyzing if environment is contributing",
  "explanation": "string explaining reasoning",
  "disclaimer": "This is an AI-assisted assessment, not a medical diagnosis"
}}"""

    @staticmethod
    def vision_analysis_prompt(breed: str) -> str:
        return f"""Analyze this image of a {breed} dog. Describe:
1. Any visible symptoms or abnormalities (skin, eyes, posture, coat)
2. General condition assessment
3. Any areas of concern

Be factual and objective. Do NOT diagnose. Just describe what you observe."""
