import { GoogleGenAI, Type } from "@google/genai";
import { RoutineResponse, AnalysisResponse, RoutineProduct, RoutineAnalysis, ComparisonResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const geminiService = {
  async analyzeIngredients(data: { productName: string, ingredients: string, skinType?: string }): Promise<AnalysisResponse> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these skincare ingredients for "${data.productName}"${data.skinType ? ` specifically for ${data.skinType} skin` : ""}:\n\n${data.ingredients}`,
      config: {
        systemInstruction: "You are an expert dermatological chemist. Analyze product ingredients objectively. Provide insights on compatibility, strengths, potential concerns, and best use cases. If no ingredients are provided, analyze based on the product name if possible, but prioritize the list. Include an 'insight' object with observation, cause, and action.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            compatibilityScore: { type: Type.NUMBER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            potentialConcerns: { type: Type.ARRAY, items: { type: Type.STRING } },
            bestFor: { type: Type.ARRAY, items: { type: Type.STRING } },
            ingredientHighlights: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["name", "description"]
              }
            },
            suitableFor: { type: Type.STRING },
            lessSuitableFor: { type: Type.STRING },
            keyIngredients: { type: Type.STRING },
            irritationWatchouts: { type: Type.STRING },
            routineCompatibility: { type: Type.STRING },
            insightObservation: { type: Type.STRING },
            insightCause: { type: Type.STRING },
            insightAction: { type: Type.STRING }
          },
          required: [
            "compatibilityScore", "strengths", "potentialConcerns", "bestFor", 
            "ingredientHighlights", "suitableFor", "lessSuitableFor", "keyIngredients", 
            "irritationWatchouts", "routineCompatibility", "insightObservation", 
            "insightCause", "insightAction"
          ]
        }
      }
    });

    return JSON.parse(response.text) as AnalysisResponse;
  },

  async analyzeRoutine(products: RoutineProduct[]): Promise<RoutineAnalysis> {
    const productsList = products.map(p => `${p.name} (${p.time}, ${p.frequency}): ${p.ingredients}`).join("\n\n");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this skincare routine for safety and compatibility:\n\n${productsList}`,
      config: {
        systemInstruction: "You are a professional esthetician. Evaluate the routine for ingredient conflicts, overall balance, and safety. Identify specific conflicts. Include an 'insight' section.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            safetyScore: { type: Type.NUMBER },
            compatibilityScore: { type: Type.NUMBER },
            balanceScore: { type: Type.NUMBER },
            conflicts: { 
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  ingredients: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  recommendation: { type: Type.STRING }
                },
                required: ["ingredients", "explanation", "recommendation"]
              }
            },
            summary: { type: Type.STRING },
            insightObservation: { type: Type.STRING },
            insightCause: { type: Type.STRING },
            insightAction: { type: Type.STRING }
          },
          required: [
            "score", "safetyScore", "compatibilityScore", "balanceScore", 
            "conflicts", "summary", "insightObservation", "insightCause", "insightAction"
          ]
        }
      }
    });

    return JSON.parse(response.text) as RoutineAnalysis;
  },

  async compareProducts(productA: { name: string, ingredients: string }, productB: { name: string, ingredients: string }): Promise<ComparisonResponse> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Compare product A: ${productA.name}\nIngredients: ${productA.ingredients}\n\nWith product B: ${productB.name}\nIngredients: ${productB.ingredients}`,
      config: {
        systemInstruction: "You are a skincare product formulator. Compare two products across hydration, irritation, pore clogging, barrier support, and active strength. Provide a detailed summary and verdict. Include an 'insight' section in the summary object.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hydrationSupport: { 
              type: Type.OBJECT, 
              properties: { scoreA: { type: Type.NUMBER }, scoreB: { type: Type.NUMBER }, explanation: { type: Type.STRING } },
              required: ["scoreA", "scoreB", "explanation"]
            },
            irritationRisk: { 
              type: Type.OBJECT, 
              properties: { scoreA: { type: Type.NUMBER }, scoreB: { type: Type.NUMBER }, explanation: { type: Type.STRING } },
              required: ["scoreA", "scoreB", "explanation"]
            },
            poreClogRisk: { 
              type: Type.OBJECT, 
              properties: { scoreA: { type: Type.NUMBER }, scoreB: { type: Type.NUMBER }, explanation: { type: Type.STRING } },
              required: ["scoreA", "scoreB", "explanation"]
            },
            barrierSupport: { 
              type: Type.OBJECT, 
              properties: { scoreA: { type: Type.NUMBER }, scoreB: { type: Type.NUMBER }, explanation: { type: Type.STRING } },
              required: ["scoreA", "scoreB", "explanation"]
            },
            activeStrength: { 
              type: Type.OBJECT, 
              properties: { scoreA: { type: Type.NUMBER }, scoreB: { type: Type.NUMBER }, explanation: { type: Type.STRING } },
              required: ["scoreA", "scoreB", "explanation"]
            },
            skinTypeCompatibility: {
              type: Type.OBJECT,
              properties: { productA: { type: Type.STRING }, productB: { type: Type.STRING }, comparison: { type: Type.STRING } },
              required: ["productA", "productB", "comparison"]
            },
            summary: {
              type: Type.OBJECT,
              properties: {
                betterForDry: { type: Type.STRING },
                betterForOily: { type: Type.STRING },
                higherIrritationRisk: { type: Type.STRING },
                strongerHydration: { type: Type.STRING },
                finalVerdict: { type: Type.STRING },
                insightObservation: { type: Type.STRING },
                insightCause: { type: Type.STRING },
                insightAction: { type: Type.STRING }
              },
              required: [
                "betterForDry", "betterForOily", "higherIrritationRisk", 
                "strongerHydration", "finalVerdict", "insightObservation", 
                "insightCause", "insightAction"
              ]
            }
          },
          required: [
            "hydrationSupport", "irritationRisk", "poreClogRisk", 
            "barrierSupport", "activeStrength", "skinTypeCompatibility", "summary"
          ]
        }
      }
    });

    return JSON.parse(response.text) as ComparisonResponse;
  },

  async generateRoutine(formData: any): Promise<RoutineResponse> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a skincare routine based on these preferences: ${JSON.stringify(formData)}`,
      config: {
        systemInstruction: "You are a clinical dermatologist. Generate a morning and evening routine. Identify what to pause and what to introduce slowly. Include an 'insight' section.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            safetyScore: { type: Type.NUMBER },
            compatibilityScore: { type: Type.NUMBER },
            balanceScore: { type: Type.NUMBER },
            morningRoutine: { type: Type.STRING },
            eveningRoutine: { type: Type.STRING },
            whatToPause: { type: Type.STRING },
            whatToIntroduceSlowly: { type: Type.STRING },
            likelyMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
            expectedResults: { type: Type.STRING },
            insightObservation: { type: Type.STRING },
            insightCause: { type: Type.STRING },
            insightAction: { type: Type.STRING }
          },
          required: [
            "score", "safetyScore", "compatibilityScore", "balanceScore", 
            "morningRoutine", "eveningRoutine", "whatToPause", 
            "whatToIntroduceSlowly", "likelyMistakes", "expectedResults", 
            "insightObservation", "insightCause", "insightAction"
          ]
        }
      }
    });

    return JSON.parse(response.text) as RoutineResponse;
  }
};
