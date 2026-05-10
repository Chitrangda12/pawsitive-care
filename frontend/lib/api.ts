// API Client for Pawsitive Care Backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    console.log(`[API REQUEST] ${options?.method || 'GET'} ${API_BASE}${path}`);
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options?.headers,
            },
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: "Request failed" }));
            console.error(`[API ERROR] ${options?.method || 'GET'} ${path} - ${res.status}:`, error);
            throw new ApiError(res.status, error.detail || "Request failed");
        }

        if (res.status === 204) return undefined as T;
        return res.json();
    } catch (e: any) {
        console.error(`[NETWORK ERROR] Could not reach backend at ${API_BASE}${path}:`, e.message);
        throw new ApiError(503, "Unable to reach the server. Network/CORS failure.");
    }
}

// Dogs
export const api = {
    dogs: {
        list: (skip = 0, limit = 20) =>
            request<{ dogs: import("@/types").Dog[]; total: number }>(`/dogs/?skip=${skip}&limit=${limit}`),
        get: (id: number) => request<import("@/types").Dog>(`/dogs/${id}`),
        create: (data: import("@/types").DogCreate) =>
            request<import("@/types").Dog>("/dogs/", { method: "POST", body: JSON.stringify(data) }),
        update: (id: number, data: Partial<import("@/types").DogCreate>) =>
            request<import("@/types").Dog>(`/dogs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
        delete: (id: number) => request<void>(`/dogs/${id}`, { method: "DELETE" }),
    },
    allergies: {
        listMaster: () =>
            request<import("@/types").Allergy[]>(`/allergies/`),
        listForDog: (dogId: number) =>
            request<import("@/types").Allergy[]>(`/dogs/${dogId}/allergies/`),
        assign: (dogId: number, allergyIds: number[]) =>
            request<{ status: string; assigned_count: number }>(`/dogs/${dogId}/allergies/assign`, {
                method: "POST",
                body: JSON.stringify({ allergy_ids: allergyIds }),
            }),
    },
    vaccinations: {
        report: (dogId: number) =>
            request<import("@/types").VaccinationReport>(`/vaccinations/${dogId}/report`),
    },
    diet: {
        plan: (dogId: number, preferences?: string) =>
            request<import("@/types").MealPlan>("/diet/plan", {
                method: "POST",
                body: JSON.stringify({ dog_id: dogId, preferences }),
            }),
    },
    environment: {
        risk: (dogId: number, latitude: number, longitude: number) =>
            request<import("@/types").EnvironmentRisk>("/environment/risk", {
                method: "POST",
                body: JSON.stringify({ dog_id: dogId, latitude, longitude }),
            }),
    },
    fir: {
        generate: (
            dogId: number,
            symptoms: string,
            environmentalContext?: import("@/types").EnvironmentRisk
        ) =>
            request<import("@/types").FIRReport>("/fir/generate", {
                method: "POST",
                body: JSON.stringify({
                    dog_id: dogId,
                    symptoms,
                    environmental_context: environmentalContext,
                }),
            }),
    },
};
