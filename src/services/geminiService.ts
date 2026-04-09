import * as GenAIModule from "@google/genai";
import { RoutineResponse, AnalysisResponse, ComparisonResponse, RoutineAnalysis } from "../types.ts";

// Safely extract GoogleGenAI and Type from the module to handle interop issues
const GoogleGenAI = (GenAIModule as any).GoogleGenAI || (GenAIModule as any).default?.GoogleGenAI || (GenAIModule as any).default || GenAIModule;
const Type = (GenAIModule as any).Type || (GenAIModule as any).default?.Type;

// Initialize the Gemini AI client
// Note: process.env.GEMINI_API_KEY is injected by Vite via define in vite.config.ts
const getAI = () => {
  // Try to get the key from multiple sources
  const apiKey = process.env.GEMINI_API_KEY || (typeof process !== 'undefined' && process.env ? process.env.API_KEY : null);
  
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("Gemini API key is missing or placeholder. API calls may fail.");
  }
  
  if (typeof GoogleGenAI !== 'function') {
    console.error("GoogleGenAI is not a constructor:", GoogleGenAI);
    throw new Error("GoogleGenAI constructor not found in @google/genai module");
  }
  
  try {
    return new (GoogleGenAI as any)({ apiKey: apiKey || "" });
  } catch (error) {
    console.error("Error instantiating GoogleGenAI:", error);
    throw error;
  }
};

// Helper for retrying AI calls with exponential backoff
const safeJsonParse = (str: string | null, fallback: any = {}) => {
  if (!str || str === "undefined") return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error("Failed to parse AI JSON:", e, "String:", str);
    return fallback;
  }
};

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
          "expectedResults": "...",
          "insightObservation": "A personalized observation of what was detected in the routine (e.g., 'Your routine is heavy on exfoliants but light on barrier repair').",
          "insightCause": "A personalized explanation of why this affects the user's skin (e.g., 'Using AHA and BHA daily without ceramides can thin the stratum corneum, leading to the tightness you mentioned').",
          "insightAction": "A personalized, simple, actionable recommendation (e.g., 'Switch to the gentle cleanser on nights you exfoliate and add a ceramide-rich cream')."
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
              expectedResults: { type: Type.STRING },
              insightObservation: { type: Type.STRING },
              insightCause: { type: Type.STRING },
              insightAction: { type: Type.STRING }
            },
            required: ["score", "safetyScore", "compatibilityScore", "balanceScore", "morningRoutine", "eveningRoutine", "whatToPause", "whatToIntroduceSlowly", "likelyMistakes", "expectedResults", "insightObservation", "insightCause", "insightAction"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      return safeJsonParse(text);
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
          "routineCompatibility": "...",
          "insightObservation": "A personalized observation of what was detected in the product (e.g., 'This product contains high concentrations of Niacinamide and Zinc').",
          "insightCause": "A personalized explanation of why this affects the user's skin (e.g., 'Niacinamide regulates sebum, but at 10% it can be sensitizing for your reported sensitivity level').",
          "insightAction": "A personalized, simple, actionable recommendation (e.g., 'Patch test on your jawline for 48 hours before full-face application')."
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
              routineCompatibility: { type: Type.STRING },
              insightObservation: { type: Type.STRING },
              insightCause: { type: Type.STRING },
              insightAction: { type: Type.STRING }
            },
            required: ["compatibilityScore", "strengths", "potentialConcerns", "bestFor", "ingredientHighlights", "suitableFor", "lessSuitableFor", "keyIngredients", "irritationWatchouts", "routineCompatibility", "insightObservation", "insightCause", "insightAction"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      return safeJsonParse(text);
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
          "summary": "Overall summary...",
          "insightObservation": "A personalized observation of what was detected in the routine (e.g., 'We found a direct conflict between your Retinol and the Glycolic Acid toner').",
          "insightCause": "A personalized explanation of why this affects the user's skin (e.g., 'Both are potent actives that increase cell turnover; using them together can compromise your skin barrier').",
          "insightAction": "A personalized, simple, actionable recommendation (e.g., 'Alternate nights: use Retinol on Mon/Wed/Fri and Glycolic Acid on Tue/Thu')."
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
              summary: { type: Type.STRING },
              insightObservation: { type: Type.STRING },
              insightCause: { type: Type.STRING },
              insightAction: { type: Type.STRING }
            },
            required: ["score", "safetyScore", "compatibilityScore", "balanceScore", "conflicts", "summary", "insightObservation", "insightCause", "insightAction"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      return safeJsonParse(text);
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
            "finalVerdict": "string",
            "insightObservation": "A personalized observation comparing the two (e.g., 'Product A is a pure hydrator, while Product B is a treatment-focused serum').",
            "insightCause": "A personalized explanation (e.g., 'Product B contains Salicylic Acid which is better for your acne, but Product A has Panthenol which suits your sensitivity').",
            "insightAction": "A personalized recommendation (e.g., 'Choose Product A for daily use and keep Product B for spot treatments')."
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
                  finalVerdict: { type: Type.STRING },
                  insightObservation: { type: Type.STRING },
                  insightCause: { type: Type.STRING },
                  insightAction: { type: Type.STRING }
                },
                required: ["betterForDry", "betterForOily", "higherIrritationRisk", "strongerHydration", "finalVerdict", "insightObservation", "insightCause", "insightAction"]
              }
            },
            required: ["hydrationSupport", "irritationRisk", "poreClogRisk", "barrierSupport", "activeStrength", "skinTypeCompatibility", "summary"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      return safeJsonParse(text);
    });
  }
};
