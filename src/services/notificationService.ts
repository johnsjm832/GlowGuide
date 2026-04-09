import { User, DashboardData, Notification } from "../types";

const NOTIFICATION_LIMIT_PER_DAY = 2;

export const notificationService = {
  generateSmartNotifications(user: User, dashboard: DashboardData): Notification[] {
    const now = new Date();
    const hour = now.getHours();
    const todayStr = now.toISOString().split('T')[0];
    
    // Check if we already sent too many today
    const lastSentDate = user.lastNotificationSentAt ? user.lastNotificationSentAt.split('T')[0] : null;
    const sentTodayCount = lastSentDate === todayStr ? (user.notificationsHistory?.length || 0) : 0;
    
    if (sentTodayCount >= NOTIFICATION_LIMIT_PER_DAY) {
      return [];
    }

    const notifications: Notification[] = [];
    const prefs = user.notificationPreferences || {
      routineReminders: true,
      progressCuriosity: true,
      insightAlerts: true,
      streakMilestones: true,
      skinTrackingNudges: true,
    };

    // 1. Routine Reminders (Morning: 6-10 AM, Night: 8-11 PM)
    if (prefs.routineReminders) {
      const isMorning = hour >= 6 && hour <= 10;
      const isNight = hour >= 20 && hour <= 23;
      
      const lastRoutineDate = dashboard.lastRoutine?.created_at.split('T')[0];
      const alreadyDoneToday = lastRoutineDate === todayStr;

      if (isMorning && !alreadyDoneToday) {
        notifications.push({
          id: `routine-am-${todayStr}`,
          type: "routine",
          title: "Morning Glow Up",
          message: "Ready to start your day? Your skin is waiting for its morning refresh. ✨",
          timestamp: now.toISOString(),
          read: false,
          actionLabel: "Complete Routine",
          actionTab: "routine-builder"
        });
      } else if (isNight && !alreadyDoneToday) {
        notifications.push({
          id: `routine-pm-${todayStr}`,
          type: "routine",
          title: "Evening Wind Down",
          message: "Time to wash away the day. Your evening routine is the perfect way to prep for beauty sleep. 🌙",
          timestamp: now.toISOString(),
          read: false,
          actionLabel: "Complete Routine",
          actionTab: "routine-builder"
        });
      }
    }

    // 2. Skin Tracking Nudges
    if (prefs.skinTrackingNudges && notifications.length < NOTIFICATION_LIMIT_PER_DAY) {
      const lastCheckInDate = dashboard.lastCheckIn?.created_at.split('T')[0];
      const checkedInToday = lastCheckInDate === todayStr;

      if (!checkedInToday && hour >= 12) { // Only nudge after noon
        notifications.push({
          id: `tracking-${todayStr}`,
          type: "tracking",
          title: "How's your skin today?",
          message: "A quick 30-second check-in helps us track your progress more accurately. How are you feeling? 😊",
          timestamp: now.toISOString(),
          read: false,
          actionLabel: "Log Skin",
          actionTab: "dashboard"
        });
      }
    }

    // 3. Streak Notifications
    if (prefs.streakMilestones && notifications.length < NOTIFICATION_LIMIT_PER_DAY) {
      if (dashboard.streak > 0 && dashboard.streak % 3 === 0) {
        notifications.push({
          id: `streak-${dashboard.streak}-${todayStr}`,
          type: "streak",
          title: `${dashboard.streak} Day Streak!`,
          message: `You're on fire! ${dashboard.streak} days of consistent care. Your skin barrier thanks you. 🔥`,
          timestamp: now.toISOString(),
          read: false,
          actionLabel: "View Progress",
          actionTab: "dashboard"
        });
      }
    }

    // 4. Progress Curiosity
    if (prefs.progressCuriosity && notifications.length < NOTIFICATION_LIMIT_PER_DAY) {
      if (dashboard.healthScore < 85 && dashboard.streak > 2) {
        notifications.push({
          id: `progress-${todayStr}`,
          type: "progress",
          title: "Boost Your Score",
          message: "We've spotted a few small tweaks that could push your skin health score even higher. Want to see? 📈",
          timestamp: now.toISOString(),
          read: false,
          actionLabel: "See Tips",
          actionTab: "routine"
        });
      }
    }

    // 5. Inactivity Adjustment (2+ days)
    const lastActiveDate = dashboard.lastRoutine?.created_at || dashboard.lastCheckIn?.created_at;
    if (lastActiveDate) {
      const lastActive = new Date(lastActiveDate);
      const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 3600 * 24));
      
      if (diffDays >= 2 && notifications.length === 0) {
        notifications.push({
          id: `inactivity-${todayStr}`,
          type: "routine",
          title: "We miss your glow!",
          message: "It's been a couple of days. Consistency is the secret to great skin. Let's get back on track together? 💖",
          timestamp: now.toISOString(),
          read: false,
          actionLabel: "Start Routine",
          actionTab: "routine-builder"
        });
      }
    }

    return notifications.slice(0, NOTIFICATION_LIMIT_PER_DAY);
  }
};
