import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_personalization():
    # 1. Create a dog with Dust Mites allergy
    dusty_data = {
        "name": "Dusty",
        "breed": "Beagle",
        "age_years": 5,
        "weight_kg": 15,
        "owner_name": "Test",
        "allergy_ids": [1] # Assuming 1 is Dust Mites (seeded first)
    }
    
    # 2. Create a dog with No allergies
    clean_data = {
        "name": "Clean",
        "breed": "Labrador",
        "age_years": 5,
        "weight_kg": 30,
        "owner_name": "Test",
        "allergy_ids": []
    }
    
    try:
        # Get allergies first to be sure of IDs
        allergies = requests.get(f"{BASE_URL}/allergies/").json()
        dust_mites_id = next(a["id"] for a in allergies if "dust" in a["name"].lower())
        dusty_data["allergy_ids"] = [dust_mites_id]
        print(f"Using Dust Mites ID: {dust_mites_id}")

        d1 = requests.post(f"{BASE_URL}/dogs/", json=dusty_data).json()
        d2 = requests.post(f"{BASE_URL}/dogs/", json=clean_data).json()
        
        print(f"Created Dogs: {d1['id']} (Dusty), {d2['id']} (Clean)")
        
        # 3. Assess Risk for both (New York coords)
        risk_req = {
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        # We need to manually set AQI > 100 to trigger the allergy logic if real API keys are missing
        # Since I'm using mocks when keys are missing, let's see what happens.
        
        r1 = requests.post(f"{BASE_URL}/environment/risk", json={"dog_id": d1["id"], **risk_req}).json()
        r2 = requests.post(f"{BASE_URL}/environment/risk", json={"dog_id": d2["id"], **risk_req}).json()
        
        print(f"Dusty Risk Score: {r1['environmental_risk_score']}")
        print(f"Clean Risk Score: {r2['environmental_risk_score']}")
        print(f"Dusty Allergy Impact: {r1.get('allergy_impact_score')}")
        print(f"Clean Allergy Impact: {r2.get('allergy_impact_score')}")
        
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test_personalization()
