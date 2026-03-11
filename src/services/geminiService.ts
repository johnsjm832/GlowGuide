import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { RoutineResponse, AnalysisResponse, ComparisonResponse, RoutineAnalysis } from "../types.ts";

// Initialize the Gemini AI client
// Note: process.env.GEMINI_API_KEY is injected by Vite via define in vite.config.ts
const getAI = () => {
  // Try to get the key from multiple sources
  // process.env.GEMINI_API_KEY is replaced by Vite at build time
  // process.env.API_KEY might be injected at runtime in some environments
  const apiKey = process.env.GEMINI_API_KEY || (typeof process !== 'undefined' && process.env ? process.env.API_KEY : null);
  
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // If the key is missing, we still return the instance but the call will likely fail
    // with a more descriptive error from the SDK, or the user will be prompted by the UI
    console.warn("Gemini API key is missing or placeholder. API calls may fail.");
  }
  
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

// Helper for retrying AI calls with exponential backoff
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errorMessage = err?.message || JSON.stringify(err) || "";
      const isUnavailable = 
        errorMessage.includes("503") || 
        errorMessage.includes("UNAVAILABLE") || 
        errorMessage.includes("high demand") ||
        errorMessage.includes("overloaded");

      if (isUnavailable && i < maxRetries - 1) {
        // Exponential backoff with jitter: 2^i * 1000ms + random jitter
        const delay = Math.pow(2, i) * 1500 + Math.random() * 1000;
        console.warn(`AI service busy (503/UNAVAILABLE), retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

export const geminiService = {
  async generateRoutine(data: any): Promise<RoutineResponse> {
    return withRetry(async () => {
      const ai = getAI();
      const prompt = `
        You are a neutral skincare assistant. Generate a routine for a user with:
        - Skin Type: ${data.skinType}
        - Main Concern: ${data.mainConcern}
        - Breakouts per week: ${data.breakoutsPerWeek}
        - Current products: ${data.currentProducts}
        - Feels tight/dry after cleansing: ${data.feelsTight ? 'Yes' : 'No'}

        Rules:
        - Avoid medical claims or diagnosing conditions.
        - Prioritize skin barrier health.
        - Prefer simple routines.
        - Do not use prescriptions or disease/treatment language.

        Output Structure (JSON):
        {
          "score": number,
          "safetyScore": number (0-100),
          "compatibilityScore": number (0-100),
          "balanceScore": number (0-100),
          "morningRoutine": "...",
          "eveningRoutine": "...",
          "whatToPause": "...",
          "whatToIntroduceSlowly": "...",
          "likelyMistakes": ["...", "..."],
          "expectedResults": "..."
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
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
              likelyMistakes: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              expectedResults: { type: Type.STRING }
            },
            required: ["score", "safetyScore", "compatibilityScore", "balanceScore", "morningRoutine", "eveningRoutine", "whatToPause", "whatToIntroduceSlowly", "likelyMistakes", "expectedResults"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      return JSON.parse(text);
    });
  },

  async analyzeIngredients(data: any): Promise<AnalysisResponse> {
    return withRetry(async () => {
      const ai = getAI();
      const prompt = `
        You are a neutral skincare assistant. Analyze these ingredients for "${data.productName}":
        ${data.ingredients}

        Rules:
        - Provide a numeric Compatibility Score (0-100) based on overall skin health and barrier support.
        - Do not classify ingredients as "toxic" or "unsafe".
        - Use educational and neutral language.
        - Avoid medical or regulatory claims.

        Output Structure (JSON):
        {
          "compatibilityScore": number,
          "strengths": ["✔ ...", "✔ ..."],
          "potentialConcerns": ["⚠ ...", "⚠ ..."],
          "bestFor": ["• ...", "• ..."],
          "ingredientHighlights": [
            { "name": "...", "description": "..." }
          ],
          "suitableFor": "...",
          "lessSuitableFor": "...",
          "keyIngredients": "...",
          "irritationWatchouts": "...",
          "routineCompatibility": "..."
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
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
              routineCompatibility: { type: Type.STRING }
            },
            required: ["compatibilityScore", "strengths", "potentialConcerns", "bestFor", "ingredientHighlights", "suitableFor", "lessSuitableFor", "keyIngredients", "irritationWatchouts", "routineCompatibility"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      return JSON.parse(text);
    });
  },

  async analyzeRoutine(products: any[]): Promise<RoutineAnalysis> {
    return withRetry(async () => {
      const ai = getAI();
      const routineDescription = products.map(p => 
        `- ${p.name} (${p.time}, ${p.frequency}${p.customDays ? ': ' + p.customDays.join(', ') : ''}) Ingredients: ${p.ingredients || 'Not provided'}`
      ).join('\n');

      const prompt = `
        You are a neutral skincare assistant. Analyze this skincare routine for ingredient conflicts:
        ${routineDescription}

        Evaluate for:
        - Ingredient conflicts (e.g., Retinol + AHA/BHA same routine, Retinol + Benzoyl Peroxide, Vitamin C + Benzoyl Peroxide, AHA + BHA + Retinol combinations, Overlapping exfoliants)
        - Potential irritation risks
        - Routine balance

        Generate a Routine Health Score (0–100) and three sub-scores:
        1. Ingredient Safety (0-100): Based on lack of harsh combinations.
        2. Compatibility (0-100): Based on how well products work together.
        3. Routine Balance (0-100): Based on hydration vs actives.

        Output Structure (JSON):
        {
          "score": number,
          "safetyScore": number,
          "compatibilityScore": number,
          "balanceScore": number,
          "conflicts": [
            {
              "ingredients": "Ingredient A + Ingredient B",
              "explanation": "Why they conflict...",
              "recommendation": "Safer usage schedule..."
            }
          ],
          "summary": "Overall summary of the routine. If no conflicts, say 'No major ingredient conflicts detected. Your routine looks balanced.'"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
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
              summary: { type: Type.STRING }
            },
            required: ["score", "safetyScore", "compatibilityScore", "balanceScore", "conflicts", "summary"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      return JSON.parse(text);
    });
  },

  async compareProducts(productA: { name: string, ingredients: string }, productB: { name: string, ingredients: string }): Promise<ComparisonResponse> {
    return withRetry(async () => {
      const ai = getAI();
      const prompt = `
        You are a neutral skincare assistant. Compare these two products:
        
        Product A: ${productA.name}
        Ingredients A: ${productA.ingredients}
        
        Product B: ${productB.name}
        Ingredients B: ${productB.ingredients}

        Evaluate both products side-by-side across these categories:
        1. Hydration Support (Score 0-10)
        2. Irritation Risk (Score 0-10, where 10 is high risk)
        3. Pore-Clog Risk (Score 0-10, where 10 is high risk)
        4. Barrier Support (Score 0-10)
        5. Active Ingredient Strength (Score 0-10)
        6. Skin Type Compatibility

        Generate a final summary comparing them.

        Output Structure (JSON):
        {
          "hydrationSupport": { "scoreA": number, "scoreB": number, "explanation": "string" },
          "irritationRisk": { "scoreA": number, "scoreB": number, "explanation": "string" },
          "poreClogRisk": { "scoreA": number, "scoreB": number, "explanation": "string" },
          "barrierSupport": { "scoreA": number, "scoreB": number, "explanation": "string" },
          "activeStrength": { "scoreA": number, "scoreB": number, "explanation": "string" },
          "skinTypeCompatibility": { "productA": "string", "productB": "string", "comparison": "string" },
          "summary": {
            "betterForDry": "string",
            "betterForOily": "string",
            "higherIrritationRisk": "string",
            "strongerHydration": "string",
            "finalVerdict": "string"
          }
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hydrationSupport: {
                type: Type.OBJECT,
                properties: {
                  scoreA: { type: Type.NUMBER },
                  scoreB: { type: Type.NUMBER },
                  explanation: { type: Type.STRING }
                },
                required: ["scoreA", "scoreB", "explanation"]
              },
              irritationRisk: {
                type: Type.OBJECT,
                properties: {
                  scoreA: { type: Type.NUMBER },
                  scoreB: { type: Type.NUMBER },
                  explanation: { type: Type.STRING }
                },
                required: ["scoreA", "scoreB", "explanation"]
              },
              poreClogRisk: {
                type: Type.OBJECT,
                properties: {
                  scoreA: { type: Type.NUMBER },
                  scoreB: { type: Type.NUMBER },
                  explanation: { type: Type.STRING }
                },
                required: ["scoreA", "scoreB", "explanation"]
              },
              barrierSupport: {
                type: Type.OBJECT,
                properties: {
                  scoreA: { type: Type.NUMBER },
                  scoreB: { type: Type.NUMBER },
                  explanation: { type: Type.STRING }
                },
                required: ["scoreA", "scoreB", "explanation"]
              },
              activeStrength: {
                type: Type.OBJECT,
                properties: {
                  scoreA: { type: Type.NUMBER },
                  scoreB: { type: Type.NUMBER },
                  explanation: { type: Type.STRING }
                },
                required: ["scoreA", "scoreB", "explanation"]
              },
              skinTypeCompatibility: {
                type: Type.OBJECT,
                properties: {
                  productA: { type: Type.STRING },
                  productB: { type: Type.STRING },
                  comparison: { type: Type.STRING }
                },
                required: ["productA", "productB", "comparison"]
              },
              summary: {
                type: Type.OBJECT,
                properties: {
                  betterForDry: { type: Type.STRING },
                  betterForOily: { type: Type.STRING },
                  higherIrritationRisk: { type: Type.STRING },
                  strongerHydration: { type: Type.STRING },
                  finalVerdict: { type: Type.STRING }
                },
                required: ["betterForDry", "betterForOily", "higherIrritationRisk", "strongerHydration", "finalVerdict"]
              }
            },
            required: ["hydrationSupport", "irritationRisk", "poreClogRisk", "barrierSupport", "activeStrength", "skinTypeCompatibility", "summary"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      return JSON.parse(text);
    });
  }
};
