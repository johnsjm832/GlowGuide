export interface RoutineResponse {
  score: number;
  safetyScore: number;
  compatibilityScore: number;
  balanceScore: number;
  morningRoutine: string;
  eveningRoutine: string;
  whatToPause: string;
  whatToIntroduceSlowly: string;
  likelyMistakes: string[];
  expectedResults: string;
}

export interface IngredientHighlight {
  name: string;
  description: string;
}

export interface AnalysisResponse {
  compatibilityScore: number;
  strengths: string[];
  potentialConcerns: string[];
  bestFor: string[];
  ingredientHighlights: IngredientHighlight[];
  suitableFor: string;
  lessSuitableFor: string;
  keyIngredients: string;
  irritationWatchouts: string;
  routineCompatibility: string;
}

export interface RoutineProduct {
  id: string;
  name: string;
  ingredients?: string;
  time: "AM" | "PM" | "BOTH";
  frequency: "daily" | "every-other-day" | "weekly" | "custom";
  customDays?: string[];
}

export interface RoutineConflict {
  ingredients: string;
  explanation: string;
  recommendation: string;
}

export interface RoutineAnalysis {
  score: number;
  safetyScore: number;
  compatibilityScore: number;
  balanceScore: number;
  conflicts: RoutineConflict[];
  summary: string;
}

export interface ComparisonScore {
  scoreA: number;
  scoreB: number;
  explanation: string;
}

export interface ComparisonResponse {
  hydrationSupport: ComparisonScore;
  irritationRisk: ComparisonScore;
  poreClogRisk: ComparisonScore;
  barrierSupport: ComparisonScore;
  activeStrength: ComparisonScore;
  skinTypeCompatibility: {
    productA: string;
    productB: string;
    comparison: string;
  };
  summary: {
    betterForDry: string;
    betterForOily: string;
    higherIrritationRisk: string;
    strongerHydration: string;
    finalVerdict: string;
  };
}

export interface User {
  id: number;
  email: string;
  token: string;
  theme_primary_color?: string;
  theme_secondary_color?: string;
  routine?: RoutineProduct[];
  skinType?: string;
  sensitivity?: string;
  concerns?: string[];
}

export interface DashboardData {
  savedRoutines: any[];
  savedAnalyses: any[];
  savedComparisons: any[];
  lastCheckIn: any;
  routineScore: number;
  scansCount: number;
  streak: number;
}
