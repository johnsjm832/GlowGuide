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
  insightObservation: string;
  insightCause: string;
  insightAction: string;
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
  insightObservation: string;
  insightCause: string;
  insightAction: string;
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
  insightObservation: string;
  insightCause: string;
  insightAction: string;
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
    insightObservation: string;
    insightCause: string;
    insightAction: string;
  };
}

export interface User {
  id: string | number;
  email: string;
  name?: string;
  token: string;
  theme_primary_color?: string;
  theme_secondary_color?: string;
  routine?: RoutineProduct[];
  skinType?: string;
  sensitivity?: string;
  concerns?: string[];
  breakoutFrequency?: string;
  routineSize?: string;
  avoidIngredients?: string[];
  sunscreenUsage?: string;
  onboardingCompleted?: boolean;
  theme_id?: string;
  language?: string;
  tier: 'free' | 'premium';
  subscriptionStatus?: 'active' | 'trialing' | 'canceled' | 'none';
  subscriptionEndDate?: string;
  trialEndDate?: string;
  notificationPreferences?: {
    routineReminders: boolean;
    progressCuriosity: boolean;
    insightAlerts: boolean;
    streakMilestones: boolean;
    skinTrackingNudges: boolean;
  };
  lastNotificationSentAt?: string;
  notificationsHistory?: string[]; // IDs of notification types sent recently to avoid repetition
}

export interface Notification {
  id: string;
  type: "routine" | "progress" | "insight" | "streak" | "tracking";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionLabel?: string;
  actionTab?: string;
}

export interface RoutineLog {
  id: number;
  userId: number;
  type: "morning" | "night";
  created_at: string;
}

export interface SkinLog {
  id: number;
  userId: number;
  acne: number;
  oiliness: number;
  dryness: number;
  irritation: number;
  created_at: string;
  zonesData?: any;
  zones_data?: any;
}

export interface DashboardData {
  savedRoutines: any[];
  savedAnalyses: any[];
  savedComparisons: any[];
  lastCheckIn: SkinLog | null;
  routineScore: number;
  scansCount: number;
  streak: number;
  weeklyCompletionRate: number;
  lastRoutine: RoutineLog | null;
  skinTrends: SkinLog[];
  healthScore: number;
  healthScoreTrend: number;
}

export interface ZoneCondition {
  acne: number;
  oiliness: number;
  dryness: number;
  irritation: number;
}

export interface ZonesData {
  forehead: ZoneCondition;
  nose: ZoneCondition;
  leftCheek: ZoneCondition;
  rightCheek: ZoneCondition;
  chin: ZoneCondition;
}
