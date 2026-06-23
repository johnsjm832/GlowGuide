import { RoutineResponse, AnalysisResponse, RoutineProduct, RoutineAnalysis, ComparisonResponse } from "../types";
import { auth } from "../lib/firebase";

// Helper to get active user ID and client ID from localStorage
const getClientIdentifiers = () => {
  let userId: string | null = null;
  if (typeof window !== "undefined") {
    const savedUser = localStorage.getItem("klenly_user");
    if (savedUser && savedUser !== "undefined") {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed?.id) userId = String(parsed.id);
      } catch (e) {
        console.error("Error parsing user from localStorage:", e);
      }
    }
  }
  
  let clientId = "guest";
  if (typeof window !== "undefined") {
    clientId = localStorage.getItem("anon_client_id") || "guest";
  }
  
  return { userId, clientId };
};

const getAuthHeaders = async () => {
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    const token = await firebaseUser.getIdToken();
    return { "Authorization": `Bearer ${token}` };
  }
  return {};
};

export const geminiService = {
  async analyzeIngredients(data: { productName: string, ingredients: string, skinType?: string }, language?: string): Promise<AnalysisResponse> {
    const { userId, clientId } = getClientIdentifiers();
    const authHeaders = await getAuthHeaders();
    const response = await fetch("/api/gemini/analyze-ingredients", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify({
        productName: data.productName,
        ingredients: data.ingredients,
        skinType: data.skinType,
        language,
        clientId,
        userId
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to analyze ingredients (${response.status})`);
    }

    return await response.json();
  },

  async analyzeRoutine(products: RoutineProduct[], language?: string): Promise<RoutineAnalysis> {
    const { userId, clientId } = getClientIdentifiers();
    const authHeaders = await getAuthHeaders();
    const response = await fetch("/api/gemini/analyze-routine", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify({ products, language, userId, clientId })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to analyze routine (${response.status})`);
    }

    return await response.json();
  },

  async compareProducts(productA: { name: string, ingredients: string }, productB: { name: string, ingredients: string }, language?: string): Promise<ComparisonResponse> {
    const { userId, clientId } = getClientIdentifiers();
    const authHeaders = await getAuthHeaders();
    const response = await fetch("/api/gemini/compare-products", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify({ productA, productB, language, userId, clientId })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to compare products (${response.status})`);
    }

    return await response.json();
  },

  async generateRoutine(formData: any, language?: string): Promise<RoutineResponse> {
    const { userId, clientId } = getClientIdentifiers();
    const authHeaders = await getAuthHeaders();
    const response = await fetch("/api/gemini/generate-routine", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify({ formData, language, userId, clientId })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to generate routine (${response.status})`);
    }

    return await response.json();
  }
};
