import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, X, CheckCircle2, AlertCircle, Sparkles, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import { Notification, User, DashboardData } from "../types";
import { notificationService } from "../services/notificationService";

interface NotificationCenterProps {
  user: User | null;
  dashboard: DashboardData | null;
  setActiveTab: (tab: string) => void;
  onUpdateUser: (user: User) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  user, 
  dashboard, 
  setActiveTab,
  onUpdateUser
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    if (user && dashboard) {
      const generated = notificationService.generateSmartNotifications(user, dashboard);
      
      // Filter out notifications already in history to avoid repetition
      const filtered = generated.filter(n => !user.notificationsHistory?.includes(n.id));
      
      if (filtered.length > 0) {
        setNotifications(prev => [...filtered, ...prev]);
        setHasNew(true);
        
        // Update user history to avoid re-sending these specific ones today
        const newHistory = [...(user.notificationsHistory || []), ...filtered.map(n => n.id)];
        onUpdateUser({
          ...user,
          lastNotificationSentAt: new Date().toISOString(),
          notificationsHistory: newHistory
        });
      }
    }
  }, [user?.id, dashboard?.streak, dashboard?.lastRoutine?.created_at, dashboard?.lastCheckIn?.created_at]);

  const handleAction = (n: Notification) => {
    if (n.actionTab) {
      setActiveTab(n.actionTab);
    }
    markAsRead(n.id);
    setIsOpen(false);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const unread = notifications.filter(n => n.id !== id && !n.read);
    if (unread.length === 0) setHasNew(false);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const unread = notifications.filter(n => n.id !== id && !n.read);
    if (unread.length === 0) setHasNew(false);
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "routine": return <Calendar className="w-5 h-5 text-accent" />;
      case "progress": return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      case "insight": return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case "streak": return <Sparkles className="w-5 h-5 text-orange-500" />;
      case "tracking": return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
      default: return <Bell className="w-5 h-5 text-theme-secondary" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl hover:bg-theme-secondary/5 transition-all relative group"
      >
        <Bell className={`w-6 h-6 ${hasNew ? "text-accent" : "text-theme-secondary opacity-60"}`} />
        {hasNew && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-accent border-2 border-theme-primary rounded-full animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-4 w-80 sm:w-96 bg-theme-primary border-2 border-theme-secondary/10 rounded-[32px] shadow-2xl z-[101] overflow-hidden"
            >
              <div className="p-6 border-b border-theme-secondary/5 flex justify-between items-center bg-theme-secondary/[0.02]">
                <h3 className="font-black text-theme-secondary uppercase tracking-widest text-xs">Notifications</h3>
                <button onClick={() => setIsOpen(false)} className="opacity-40 hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 bg-theme-secondary/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-6 h-6 text-theme-secondary opacity-20" />
                    </div>
                    <p className="text-sm text-theme-secondary opacity-40 font-medium italic">No new notifications. Your skin is looking great! ✨</p>
                  </div>
                ) : (
                  <div className="divide-y divide-theme-secondary/5">
                    {notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={`p-6 transition-colors relative group ${n.read ? "bg-transparent" : "bg-accent/[0.02]"}`}
                      >
                        {!n.read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                        )}
                        <div className="flex gap-4">
                          <div className="shrink-0 mt-1">
                            {getIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className={`font-bold text-sm text-theme-secondary ${n.read ? "opacity-60" : "opacity-100"}`}>
                                {n.title}
                              </h4>
                              <button 
                                onClick={() => removeNotification(n.id)}
                                className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <p className={`text-xs leading-relaxed mb-3 ${n.read ? "text-theme-secondary/40" : "text-theme-secondary/70"}`}>
                              {n.message}
                            </p>
                            {n.actionLabel && (
                              <button 
                                onClick={() => handleAction(n)}
                                className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
                              >
                                {n.actionLabel} <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="p-4 bg-theme-secondary/[0.02] border-t border-theme-secondary/5 text-center">
                  <button 
                    onClick={() => {
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                      setHasNew(false);
                    }}
                    className="text-[10px] font-black text-theme-secondary opacity-30 uppercase tracking-widest hover:opacity-100 transition-opacity"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
