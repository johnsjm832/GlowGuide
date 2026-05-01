import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { RoutineResponse, AnalysisResponse, User, DashboardData, SkinLog, RoutineLog } from "../types.ts";

export const api = {
  // Fixed login method - now just fetches by ID or returns a fallback
  // In a real app, this would be triggered AFTER firebase auth success
  async login(userId: string): Promise<User> {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error("User document not found");
    }
    
    return userSnap.data() as User;
  },

  async getDashboardData(userId: string | number): Promise<DashboardData> {
    const userUid = String(userId);
    
    try {
      // Fetch logs from subcollections
      const skinLogsRef = collection(db, `users/${userUid}/skinLogs`);
      const skinLogsQuery = query(skinLogsRef, orderBy("createdAt", "desc"), limit(14));
      const skinLogsSnap = await getDocs(skinLogsQuery);
      const skinTrends = skinLogsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      
      const routineLogsRef = collection(db, `users/${userUid}/routineLogs`);
      const routineLogsQuery = query(routineLogsRef, orderBy("createdAt", "desc"), limit(1));
      const routineLogsSnap = await getDocs(routineLogsQuery);
      const lastRoutine = routineLogsSnap.docs.length > 0 ? routineLogsSnap.docs[0].data() as any : null;

      // Fetch user doc for counts and summaries
      const userRef = doc(db, "users", userUid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data() || {};

      return {
        savedRoutines: userData.savedRoutines || [],
        savedAnalyses: userData.savedAnalyses || [],
        savedComparisons: userData.savedComparisons || [],
        lastCheckIn: skinTrends[0] || null,
        routineScore: userData.routineScore || 0,
        scansCount: (userData.savedAnalyses?.length || 0),
        streak: userData.streak || 0,
        weeklyCompletionRate: userData.weeklyCompletionRate || 0,
        lastRoutine: lastRoutine,
        skinTrends: skinTrends.reverse(),
        healthScore: userData.healthScore || 0,
        healthScoreTrend: 0
      };
    } catch (err) {
      console.error("Dashboard data fetch failed:", err);
      // Return empty state instead of crashing if possible
      return {
        savedRoutines: [],
        savedAnalyses: [],
        savedComparisons: [],
        lastCheckIn: null,
        routineScore: 0,
        scansCount: 0,
        streak: 0,
        weeklyCompletionRate: 0,
        lastRoutine: null,
        skinTrends: [],
        healthScore: 0,
        healthScoreTrend: 0
      };
    }
  },

  async submitCheckIn(data: any): Promise<void> {
    if (!data.userId) return;
    const skinLogsRef = collection(db, `users/${data.userId}/skinLogs`);
    await addDoc(skinLogsRef, {
      ...data,
      createdAt: serverTimestamp()
    });
  },

  async logRoutine(userId: string | number, type: "morning" | "night"): Promise<{ success: boolean; error?: string }> {
    try {
      const routineLogsRef = collection(db, `users/${userId}/routineLogs`);
      await addDoc(routineLogsRef, {
        type,
        createdAt: serverTimestamp()
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async logSkin(userId: string | number, data: { acne: number; oiliness: number; dryness: number; irritation: number }): Promise<{ success: boolean; error?: string }> {
    try {
      const skinLogsRef = collection(db, `users/${userId}/skinLogs`);
      await addDoc(skinLogsRef, {
        ...data,
        createdAt: serverTimestamp()
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
  
  async checkUsage(_clientId: string | null, _userId: string | number | null): Promise<{ allowed: boolean; error?: string; count?: number }> {
    return { allowed: true };
  },

  async logUsage(_clientId: string | null, _userId: string | number | null): Promise<void> {
  },

  async saveTheme(userId: string | number, themeId: string, primaryColor?: string, secondaryColor?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, "users", String(userId));
      await updateDoc(userRef, {
        theme_id: themeId,
        theme_primary_color: primaryColor,
        theme_secondary_color: secondaryColor
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async saveRoutine(userId: string | number, routine: any[]): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, "users", String(userId));
      await updateDoc(userRef, { routine });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async saveGeneratedRoutine(userId: string | number, routine: RoutineResponse): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, "users", String(userId));
      const userSnap = await getDoc(userRef);
      const saved = userSnap.data()?.savedRoutines || [];
      await updateDoc(userRef, {
        savedRoutines: [{ ...routine, id: Date.now(), createdAt: new Date().toISOString() }, ...saved]
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async saveAnalysis(userId: string | number, analysis: any): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, "users", String(userId));
      const userSnap = await getDoc(userRef);
      const saved = userSnap.data()?.savedAnalyses || [];
      await updateDoc(userRef, {
        savedAnalyses: [{ ...analysis, id: Date.now(), createdAt: new Date().toISOString() }, ...saved]
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async getRoutine(userId: string | number): Promise<any[]> {
    const userRef = doc(db, "users", String(userId));
    const userSnap = await getDoc(userRef);
    return userSnap.data()?.routine || [];
  },

  async saveComparison(userId: string | number, comparison: any): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, "users", String(userId));
      const userSnap = await getDoc(userRef);
      const saved = userSnap.data()?.savedComparisons || [];
      await updateDoc(userRef, {
        savedComparisons: [{ ...comparison, id: Date.now(), createdAt: new Date().toISOString() }, ...saved]
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async updateProfile(userId: string | number, profile: Partial<User>): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, "users", String(userId));
      await updateDoc(userRef, { ...profile });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async getComparisons(userId: string | number): Promise<any[]> {
    const userRef = doc(db, "users", String(userId));
    const userSnap = await getDoc(userRef);
    return userSnap.data()?.savedComparisons || [];
  },
  
  async deleteAnalysis(id: number): Promise<void> {
  },

  async deleteSavedRoutine(id: number): Promise<void> {
  },

  async deleteComparison(id: number): Promise<void> {
  },

  async startTrial(userId: string | number): Promise<{ success: boolean; user: any }> {
    const userRef = doc(db, "users", String(userId));
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    const update = { 
      subscriptionStatus: 'trialing', 
      trialEndDate: trialEndDate.toISOString(),
      tier: 'premium'
    };
    await updateDoc(userRef, update);
    const snap = await getDoc(userRef);
    return { success: true, user: snap.data() };
  },

  async subscribe(userId: string | number, plan: 'monthly' | 'yearly'): Promise<{ success: boolean; user: any }> {
    const userRef = doc(db, "users", String(userId));
    const endDate = new Date();
    if (plan === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
    else endDate.setFullYear(endDate.getFullYear() + 1);
    
    const update = { 
      subscriptionStatus: 'active', 
      subscriptionEndDate: endDate.toISOString(),
      tier: 'premium'
    };
    await updateDoc(userRef, update);
    const snap = await getDoc(userRef);
    return { success: true, user: snap.data() };
  },

  async cancelSubscription(userId: string | number): Promise<{ success: boolean; user: any }> {
    const userRef = doc(db, "users", String(userId));
    const update = { 
      subscriptionStatus: 'canceled'
    };
    await updateDoc(userRef, update);
    const snap = await getDoc(userRef);
    return { success: true, user: snap.data() };
  },
  
  async sendFeedback(userId: string | number | null, email: string | null, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      const feedbackRef = collection(db, "feedback");
      await addDoc(feedbackRef, {
        userId: userId ? String(userId) : null,
        email,
        message,
        createdAt: serverTimestamp()
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },
};
