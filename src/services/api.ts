import { RoutineResponse, AnalysisResponse, User, DashboardData } from "../types.ts";

export const api = {
  async login(email: string): Promise<User> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  async getDashboardData(userId: number): Promise<DashboardData> {
    const res = await fetch(`/api/dashboard/data/${userId}`);
    return res.json();
  },

  async submitCheckIn(data: any): Promise<void> {
    await fetch("/api/dashboard/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  async logRoutine(userId: number, type: "morning" | "night"): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/routine/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, type }),
    });
    return res.json();
  },

  async logSkin(userId: number, data: { acne: number; oiliness: number; dryness: number; irritation: number }): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/skin/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...data }),
    });
    return res.json();
  },
  
  async checkUsage(clientId: string | null, userId: number | null): Promise<{ allowed: boolean; error?: string; count?: number }> {
    const res = await fetch("/api/usage/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, userId }),
    });
    return res.json();
  },

  async logUsage(clientId: string | null, userId: number | null): Promise<void> {
    await fetch("/api/usage/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, userId }),
    });
  },

  async saveTheme(userId: number, themeId: string, primaryColor?: string, secondaryColor?: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/user/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, themeId, primaryColor, secondaryColor }),
    });
    return res.json();
  },

  async saveRoutine(userId: number, routine: any[]): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/user/routine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, routine }),
    });
    return res.json();
  },

  async saveGeneratedRoutine(userId: number, routine: RoutineResponse): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/user/saved-routine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, routine }),
    });
    return res.json();
  },

  async saveAnalysis(userId: number, analysis: any): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/user/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, analysis }),
    });
    return res.json();
  },

  async getRoutine(userId: number): Promise<any[]> {
    const res = await fetch(`/api/user/routine/${userId}`);
    const data = await res.json();
    return data.routine || [];
  },

  async saveComparison(userId: number, comparison: any): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/user/comparison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, comparison }),
    });
    return res.json();
  },

  async updateProfile(userId: number, profile: Partial<User>): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...profile }),
    });
    return res.json();
  },

  async getComparisons(userId: number): Promise<any[]> {
    const res = await fetch(`/api/user/comparisons/${userId}`);
    const data = await res.json();
    return data.comparisons || [];
  },
  
  async deleteAnalysis(id: number): Promise<void> {
    await fetch(`/api/user/analysis/${id}`, { method: "DELETE" });
  },

  async deleteSavedRoutine(id: number): Promise<void> {
    await fetch(`/api/user/saved-routine/${id}`, { method: "DELETE" });
  },

  async deleteComparison(id: number): Promise<void> {
    await fetch(`/api/user/comparison/${id}`, { method: "DELETE" });
  },

  async startTrial(userId: number): Promise<{ success: boolean; user: User }> {
    const res = await fetch("/api/subscription/start-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },

  async subscribe(userId: number, plan: 'monthly' | 'yearly'): Promise<{ success: boolean; user: User }> {
    const res = await fetch("/api/subscription/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, plan }),
    });
    return res.json();
  },

  async cancelSubscription(userId: number): Promise<{ success: boolean; user: User }> {
    const res = await fetch("/api/subscription/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return res.json();
  },
  
  async sendFeedback(userId: number | null, email: string | null, message: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, email, message }),
    });
    return res.json();
  },
};
