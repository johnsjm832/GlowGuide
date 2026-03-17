import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toPng } from "html-to-image";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Sparkles, FlaskConical, LayoutDashboard, ShieldCheck, ArrowRight, Info, LogIn, LogOut, CheckCircle2, AlertCircle, Sun, Moon, Palette, X, Plus, Trash2, Calendar, Activity, GitCompare, Bookmark, Target, Star, Lightbulb, Beaker, User as UserIcon, Droplets, Zap, AlertTriangle, CheckCircle, Check, Eye, Trash, Share, Download, TrendingUp, Award, Clock, ChevronRight, ChevronDown, ChevronUp, Settings, CreditCard } from "lucide-react";
import { api } from "./services/api";
import { geminiService } from "./services/geminiService";
import { validateSkincareInput } from "./utils/validation";
import { RoutineResponse, AnalysisResponse, User, DashboardData, RoutineProduct, RoutineAnalysis, ComparisonResponse, RoutineLog, SkinLog } from "./types.ts";

// --- Components ---

const Navbar = ({ activeTab, setActiveTab, user, onLogout, darkMode, toggleDarkMode }: { activeTab: string, setActiveTab: (t: string) => void, user: User | null, onLogout: () => void, darkMode: boolean, toggleDarkMode: () => void }) => (
  <nav className="fixed top-0 left-0 right-0 bg-theme-primary/80 backdrop-blur-md border-b border-theme-secondary/10 z-50">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setActiveTab(user ? "dashboard" : "routine")}>
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-sm shadow-accent/20">
          <Sparkles className="text-white w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-theme-secondary tracking-tight text-lg leading-none">GlowGuide</span>
          <span className="text-[10px] font-medium text-theme-secondary opacity-50 tracking-tight hidden sm:block">Smarter skincare routines</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar py-1">
        <button 
          onClick={() => setActiveTab("routine")}
          className={`text-sm font-semibold transition-all relative py-1 shrink-0 ${activeTab === "routine" ? "text-accent" : "text-theme-secondary/60 hover:text-theme-secondary"}`}
        >
          Routine Generator
          {activeTab === "routine" && <motion.div layoutId="nav-underline" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        <button 
          onClick={() => setActiveTab("analyze")}
          className={`text-sm font-semibold transition-all relative py-1 shrink-0 ${activeTab === "analyze" ? "text-accent" : "text-theme-secondary/60 hover:text-theme-secondary"}`}
        >
          Analyze
          {activeTab === "analyze" && <motion.div layoutId="nav-underline" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        <button 
          onClick={() => setActiveTab("compare")}
          className={`text-sm font-semibold transition-all relative py-1 shrink-0 ${activeTab === "compare" ? "text-accent" : "text-theme-secondary/60 hover:text-theme-secondary"}`}
        >
          Compare
          {activeTab === "compare" && <motion.div layoutId="nav-underline" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        <button 
          onClick={() => setActiveTab("routine-builder")}
          className={`text-sm font-semibold transition-all relative py-1 shrink-0 ${activeTab === "routine-builder" ? "text-accent" : "text-theme-secondary/60 hover:text-theme-secondary"}`}
        >
          Routine Builder
          {activeTab === "routine-builder" && <motion.div layoutId="nav-underline" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        <button 
          onClick={() => setActiveTab("dashboard")}
          className={`text-sm font-semibold transition-all relative py-1 shrink-0 ${activeTab === "dashboard" ? "text-accent" : "text-theme-secondary/60 hover:text-theme-secondary"}`}
        >
          Dashboard
          {activeTab === "dashboard" && <motion.div layoutId="nav-underline" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        
        <div className="h-4 w-px bg-theme-secondary/10 mx-1 shrink-0" />

        <button 
          onClick={toggleDarkMode}
          className="p-2 text-theme-secondary/60 hover:text-theme-secondary transition-colors shrink-0"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {user ? (
          <button onClick={onLogout} className="flex items-center gap-2 text-sm font-bold text-theme-secondary/60 hover:text-theme-secondary shrink-0">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        ) : (
          <button onClick={() => setActiveTab("dashboard")} className="flex items-center gap-2 text-sm font-bold text-theme-secondary/60 hover:text-theme-secondary shrink-0">
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </div>
  </nav>
);

const RoutineShareCard = React.forwardRef<HTMLDivElement, { 
  score: number, 
  safety?: number, 
  compat?: number, 
  balance?: number, 
  conflicts?: { ingredients: string }[], 
  amProducts: string[], 
  pmProducts: string[] 
}>(({ score, safety, compat, balance, conflicts, amProducts, pmProducts }, ref) => {
  return (
    <div 
      ref={ref}
      className="w-[400px] bg-theme-primary p-8 border-2 border-theme-secondary/10 rounded-[40px] space-y-8"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-theme-secondary tracking-tight leading-none">GlowGuide</span>
            <span className="text-[8px] font-medium text-theme-secondary opacity-50 tracking-tight">Smarter skincare routines</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black opacity-30 uppercase tracking-widest">Routine Score</div>
          <div className="text-4xl font-black text-accent">{score}</div>
        </div>
      </div>

      {(safety !== undefined || compat !== undefined || balance !== undefined) && (
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-theme-secondary/5 rounded-2xl">
            <div className="text-[8px] font-black opacity-30 uppercase mb-1">Safety</div>
            <div className="text-sm font-bold text-theme-secondary">{safety || '-'}</div>
          </div>
          <div className="text-center p-2 bg-theme-secondary/5 rounded-2xl">
            <div className="text-[8px] font-black opacity-30 uppercase mb-1">Compat</div>
            <div className="text-sm font-bold text-theme-secondary">{compat || '-'}</div>
          </div>
          <div className="text-center p-2 bg-theme-secondary/5 rounded-2xl">
            <div className="text-[8px] font-black opacity-30 uppercase mb-1">Balance</div>
            <div className="text-sm font-bold text-theme-secondary">{balance || '-'}</div>
          </div>
        </div>
      )}

      {conflicts && conflicts.length > 0 && (
        <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
          <div className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1">
            <AlertTriangle className="w-2 h-2" /> Detected Issue
          </div>
          <p className="text-xs font-bold text-theme-secondary leading-tight">{conflicts[0].ingredients}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black opacity-30 uppercase tracking-widest">
            <Sun className="w-3 h-3" /> Morning
          </div>
          <div className="space-y-1">
            {amProducts.slice(0, 5).map((name, i) => (
              <div key={i} className="text-xs font-medium text-theme-secondary opacity-80 truncate">• {name}</div>
            ))}
            {amProducts.length > 5 && <div className="text-[10px] opacity-40">+{amProducts.length - 5} more</div>}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black opacity-30 uppercase tracking-widest">
            <Moon className="w-3 h-3" /> Evening
          </div>
          <div className="space-y-1">
            {pmProducts.slice(0, 5).map((name, i) => (
              <div key={i} className="text-xs font-medium text-theme-secondary opacity-80 truncate">• {name}</div>
            ))}
            {pmProducts.length > 5 && <div className="text-[10px] opacity-40">+{pmProducts.length - 5} more</div>}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-theme-secondary/5 text-center">
        <p className="text-[10px] font-bold text-theme-secondary opacity-20 uppercase tracking-[0.3em]">GlowGuide • Skincare Intelligence</p>
      </div>
    </div>
  );
});

const PrivacyNotice = () => (
  <div className="bg-theme-primary border-2 border-theme-secondary/30 rounded-2xl p-6 flex gap-4 items-start shadow-sm">
    <div className="p-2 bg-theme-secondary/5 rounded-lg border-2 border-theme-secondary/20">
      <ShieldCheck className="w-5 h-5 text-theme-secondary opacity-80" />
    </div>
    <div>
      <h4 className="text-sm font-semibold text-theme-secondary mb-1">Privacy First</h4>
      <p className="text-sm text-theme-secondary opacity-80 leading-relaxed">
        Anonymous usage is completely stateless. We do not store or track your skincare data unless you explicitly create an account for long-term tracking.
      </p>
    </div>
  </div>
);

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-theme-secondary/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-theme-primary border-2 border-theme-secondary/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b-2 border-theme-secondary/10 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-bold text-theme-secondary">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-theme-secondary/5 rounded-xl transition-colors text-theme-secondary opacity-50 hover:opacity-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const AuthGateModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onLogin: (email: string) => void;
  title: string;
  description: string;
  preview?: { am?: string[]; pm?: string[] };
}> = ({ isOpen, onClose, onLogin, title, description, preview }) => {
  const [email, setEmail] = useState("");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-accent" />
          </div>
          <p className="text-theme-secondary opacity-70 leading-relaxed">{description}</p>
        </div>

        {preview && (
          <div className="p-6 bg-theme-secondary/5 rounded-3xl border border-theme-secondary/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Sparkles className="w-12 h-12" />
            </div>
            <h4 className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-4">Routine Preview</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-theme-secondary opacity-50 uppercase">
                  <Sun className="w-3 h-3" /> AM
                </div>
                <div className="p-3 bg-theme-primary/50 border border-theme-secondary/5 rounded-xl text-xs font-medium text-theme-secondary truncate">
                  {preview.am?.[0] || "No AM products"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-theme-secondary opacity-50 uppercase">
                  <Moon className="w-3 h-3" /> PM
                </div>
                <div className="p-3 bg-theme-primary/50 border border-theme-secondary/5 rounded-xl text-xs font-medium text-theme-secondary truncate">
                  {preview.pm?.[0] || "No PM products"}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-theme-secondary/5 text-center">
              <p className="text-[10px] font-bold text-accent uppercase tracking-widest">Create a free account to save your routine</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-theme-secondary opacity-40 uppercase tracking-widest ml-1">Email Address</label>
            <input 
              type="email"
              placeholder="Enter your email"
              className="w-full p-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-2xl outline-none focus:border-accent/50 transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => onLogin(email || "demo@example.com")}
              className="py-4 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
            >
              Create Free Account
            </button>
            <button 
              onClick={() => onLogin(email || "demo@example.com")}
              className="py-4 bg-theme-primary border-2 border-theme-secondary text-theme-secondary rounded-2xl font-bold hover:bg-theme-secondary/5 transition-all"
            >
              Sign In
            </button>
          </div>
          <p className="text-center text-[10px] text-theme-secondary opacity-40">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </Modal>
  );
};

const OnboardingModal: React.FC<{ 
  isOpen: boolean; 
  user: User; 
  onComplete: (profile: Partial<User>) => void;
}> = ({ isOpen, user, onComplete }) => {
  const [step, setStep] = useState(-1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [profile, setProfile] = useState<Partial<User>>({
    skinType: user.skinType || "",
    concerns: user.concerns || [],
    breakoutFrequency: user.breakoutFrequency || "",
    sensitivity: user.sensitivity || "",
    routineSize: user.routineSize || "",
    avoidIngredients: user.avoidIngredients || [],
    sunscreenUsage: user.sunscreenUsage || "",
  });

  const questions = [
    {
      id: "skinType",
      title: "Skin Type",
      type: "single",
      options: ["Oily", "Dry", "Combination", "Normal", "Sensitive", "Not sure"],
    },
    {
      id: "concerns",
      title: "Primary Skin Concerns",
      type: "multi",
      options: ["Acne / Breakouts", "Aging / Fine Lines", "Dark Spots / Hyperpigmentation", "Dryness", "Redness / Sensitivity", "Texture / Large Pores"],
    },
    {
      id: "breakoutFrequency",
      title: "Breakout Frequency",
      type: "single",
      options: ["Rarely", "Occasionally", "Monthly", "Weekly", "Frequently"],
    },
    {
      id: "sensitivity",
      title: "Skin Sensitivity",
      type: "single",
      options: ["Very sensitive", "Somewhat sensitive", "Not very sensitive", "Unsure"],
    },
    {
      id: "routineSize",
      title: "Current Routine Size",
      type: "single",
      options: ["1–2 products", "3–4 products", "5–6 products", "7+ products"],
    },
    {
      id: "avoidIngredients",
      title: "Ingredients to Avoid",
      type: "multi",
      options: ["Fragrance", "Alcohol", "Essential oils", "Retinoids", "None"],
    },
    {
      id: "sunscreenUsage",
      title: "Sunscreen Usage",
      type: "single",
      options: ["Daily", "Most days", "Occasionally", "Rarely", "Never"],
    },
  ];

  const currentQuestion = questions[step];

  const handleSelect = (option: string) => {
    if (currentQuestion.type === "single") {
      const updated = { ...profile, [currentQuestion.id]: option };
      setProfile(updated);
      if (step < questions.length - 1) {
        setStep(step + 1);
      } else {
        setShowConfirmation(true);
      }
    } else {
      const current = (profile[currentQuestion.id as keyof User] as string[]) || [];
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      setProfile({ ...profile, [currentQuestion.id]: updated });
    }
  };

  const handleFinish = () => {
    onComplete({ ...profile, onboardingCompleted: true });
  };

  const progress = step === -1 ? 0 : ((step + 1) / questions.length) * 100;

  if (showConfirmation) {
    return (
      <Modal isOpen={isOpen} onClose={() => {}} title="Profile Ready">
        <div className="text-center space-y-8 py-4">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-theme-secondary">Your skin profile is ready</h3>
            <p className="text-theme-secondary opacity-60">We'll use this to personalize your routine analysis.</p>
          </div>
          <button 
            onClick={handleFinish}
            className="w-full py-4 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
          >
            Get Started
          </button>
        </div>
      </Modal>
    );
  }

  if (step === -1) {
    return (
      <Modal isOpen={isOpen} onClose={() => {}} title="Quick skin profile">
        <div className="text-center space-y-8 py-4">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto">
            <UserIcon className="w-10 h-10 text-accent" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-theme-secondary">Quick skin profile</h3>
            <p className="text-theme-secondary opacity-60">Takes less than 30 seconds</p>
          </div>
          <button 
            onClick={() => setStep(0)}
            className="w-full py-4 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
          >
            Start
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Skin Profile">
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="h-1.5 w-full bg-theme-secondary/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-accent"
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-black opacity-30 uppercase tracking-widest">
            <span>Step {step + 1} of {questions.length}</span>
            <button onClick={() => step < questions.length - 1 ? setStep(step + 1) : setShowConfirmation(true)} className="hover:opacity-100 transition-opacity">Skip</button>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-theme-secondary">{currentQuestion.title}</h3>
          <div className="grid gap-3">
            {currentQuestion.options.map((option) => {
              const isSelected = currentQuestion.type === "single" 
                ? profile[currentQuestion.id as keyof User] === option
                : ((profile[currentQuestion.id as keyof User] as string[]) || []).includes(option);
              
              return (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                    isSelected 
                      ? "border-accent bg-accent/5 text-accent" 
                      : "border-theme-secondary/10 hover:border-theme-secondary/30 text-theme-secondary"
                  }`}
                >
                  <span className="font-medium">{option}</span>
                  {isSelected && <CheckCircle2 className="w-5 h-5" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-4">
          {step > 0 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="flex-1 py-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-2xl font-bold hover:bg-theme-secondary/5 transition-all"
            >
              Back
            </button>
          )}
          {currentQuestion.type === "multi" && (
            <button 
              onClick={() => step < questions.length - 1 ? setStep(step + 1) : setShowConfirmation(true)}
              className="flex-[2] py-4 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
            >
              {step === questions.length - 1 ? "Finish" : "Next"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

const LearnMoreModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="How this skincare assistant works">
    <div className="space-y-8 text-theme-secondary">
      <section>
        <h4 className="font-bold text-lg mb-2">Private by default</h4>
        <p className="opacity-80 leading-relaxed">
          You can generate routines and analyze products without creating an account.
          Your inputs and results are not stored unless you choose to sign up.
        </p>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">What this tool does</h4>
        <ul className="list-disc pl-5 space-y-2 opacity-80 leading-relaxed">
          <li>This assistant helps you understand how skincare products and routines may fit different skin types and goals.</li>
          <li>It focuses on ingredient function, routine compatibility, and barrier-friendly guidance.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2 text-red-500/80">What this tool does not do</h4>
        <ul className="list-disc pl-5 space-y-2 opacity-80 leading-relaxed">
          <li>It does not diagnose skin conditions.</li>
          <li>It does not replace professional medical advice.</li>
          <li>It does not recommend prescription treatments.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">About product analysis</h4>
        <p className="opacity-80 leading-relaxed">
          Product analysis is based on the ingredient list you provide.
          Results are educational and reflect common cosmetic science usage of ingredients.
        </p>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">Why create an account</h4>
        <div className="opacity-80 leading-relaxed space-y-2">
          <p>Creating an account lets you:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>save routines and product analyses</li>
            <li>track how your skin responds over time</li>
            <li>customize your app experience</li>
          </ul>
          <p>You can use the app without an account.</p>
        </div>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">Limits for free use</h4>
        <ul className="list-disc pl-5 space-y-2 opacity-80 leading-relaxed">
          <li>Anonymous users can analyze up to 3 products per 24 hours.</li>
          <li>Routine generation is always free.</li>
        </ul>
      </section>
    </div>
  </Modal>
);

const PrivacyPolicyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Privacy Policy">
    <div className="space-y-6 text-theme-secondary">
      <p className="text-sm opacity-50">Last updated: March 3, 2026</p>
      
      <p className="font-medium">We built this app to be private by default.</p>

      <section>
        <h4 className="font-bold text-lg mb-3">What we collect</h4>
        <div className="space-y-4">
          <div>
            <h5 className="font-semibold mb-1">If you use the app without creating an account:</h5>
            <p className="opacity-80">We do not collect your name, email, or personal identifiers.</p>
            <p className="opacity-80 mt-2">We temporarily store:</p>
            <ul className="list-disc pl-5 mt-1 opacity-80">
              <li>a random anonymous identifier used only to enforce feature limits (such as daily product analysis limits)</li>
              <li>technical request data required to operate the service</li>
            </ul>
            <p className="opacity-80 mt-2 italic">This anonymous identifier cannot be used to identify you.</p>
          </div>
          
          <div>
            <h5 className="font-semibold mb-1">If you create an account:</h5>
            <p className="opacity-80">We store:</p>
            <ul className="list-disc pl-5 mt-1 opacity-80">
              <li>your email and login credentials</li>
              <li>your saved routines and product analyses</li>
              <li>your theme and personalization settings</li>
            </ul>
            <p className="opacity-80 mt-2">We only store data that is required to provide account features.</p>
          </div>
        </div>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">How your inputs are used</h4>
        <p className="opacity-80">Your skincare information, product ingredients, and routine inputs are used only to generate results for you.</p>
        <ul className="list-disc pl-5 mt-2 opacity-80">
          <li>We do not sell your data.</li>
          <li>We do not use your personal data for advertising.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">Tracking and analytics</h4>
        <p className="opacity-80">We do not use third-party tracking, fingerprinting, or behavioral advertising.</p>
        <p className="opacity-80 mt-2">Anonymous usage limits are enforced using short-lived identifiers only.</p>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">Data retention</h4>
        <ul className="list-disc pl-5 opacity-80">
          <li>Anonymous usage data used for limits automatically expires.</li>
          <li>Account data is stored only while your account remains active.</li>
          <li>You may request deletion of your account and data.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">Third-party services</h4>
        <p className="opacity-80">We use AI services to generate skincare guidance. Your inputs may be processed by those services solely to generate results.</p>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">Your choices</h4>
        <p className="opacity-80">You can use this app without creating an account.</p>
        <p className="opacity-80 mt-2">Creating an account is optional and only required for saving and tracking features.</p>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">Contact</h4>
        <p className="opacity-80">For questions about privacy, contact: privacy@glowguide.ai</p>
      </section>
    </div>
  </Modal>
);

const TermsConditionsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Terms & Conditions">
    <div className="space-y-6 text-theme-secondary">
      <p className="text-sm opacity-50">Last updated: March 3, 2026</p>
      
      <p className="font-medium">By using this application, you agree to the following terms.</p>

      <section>
        <h4 className="font-bold text-lg mb-2">Educational use only</h4>
        <p className="opacity-80">This application provides educational and informational skincare guidance only.</p>
        <p className="opacity-80 mt-2">It does not:</p>
        <ul className="list-disc pl-5 mt-1 opacity-80">
          <li>diagnose skin conditions</li>
          <li>provide medical advice</li>
          <li>replace professional dermatological care</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">No medical claims</h4>
        <p className="opacity-80">Results are based on general cosmetic science and common ingredient usage.</p>
        <p className="opacity-80 mt-2">Individual results may vary. You should consult a qualified professional for medical concerns.</p>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">Feature availability</h4>
        <ul className="list-disc pl-5 opacity-80">
          <li>We may modify, suspend, or limit features at any time.</li>
          <li>Anonymous users are subject to usage limits for certain tools, such as product analysis.</li>
          <li>Routine generation remains free.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">Accounts</h4>
        <ul className="list-disc pl-5 opacity-80">
          <li>If you create an account, you are responsible for maintaining the security of your login credentials.</li>
          <li>You may not use the service for unlawful or abusive purposes.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">Accuracy of information</h4>
        <p className="opacity-80">We do not guarantee that all information provided by the application is complete, error-free, or suitable for your specific needs.</p>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">Limitation of liability</h4>
        <p className="opacity-80">To the maximum extent permitted by law, we are not responsible for any damages or losses arising from the use of this application.</p>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">Intellectual property</h4>
        <p className="opacity-80">All application content, branding, and software remain the property of the application owner.</p>
      </section>

      <section>
        <h4 className="font-bold text-lg mb-2">Changes to these terms</h4>
        <ul className="list-disc pl-5 opacity-80">
          <li>We may update these terms and policies from time to time.</li>
          <li>Continued use of the app means you accept any updated versions.</li>
        </ul>
      </section>
    </div>
  </Modal>
);

const RoutineBuilder: React.FC<{ 
  user: User | null, 
  onUpdateRoutine: (r: RoutineProduct[]) => void,
  onLogin: (u: User) => void
}> = ({ user, onUpdateRoutine, onLogin }) => {
  const [products, setProducts] = useState<RoutineProduct[]>(user?.routine || []);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<RoutineProduct>>({
    time: "AM",
    frequency: "daily",
    name: "",
    ingredients: ""
  });
  const [analysis, setAnalysis] = useState<RoutineAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    setIsSharing(true);

    // Workaround for html-to-image btoa issue with non-Latin1 characters
    const originalBtoa = window.btoa;
    window.btoa = (str) => {
      try {
        return originalBtoa(str);
      } catch (err) {
        return originalBtoa(unescape(encodeURIComponent(str)));
      }
    };

    try {
      const dataUrl = await toPng(shareCardRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `glowguide-routine-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to share card:', err);
      alert('Failed to generate share card. Please try again.');
    } finally {
      window.btoa = originalBtoa;
      setIsSharing(false);
    }
  };

  useEffect(() => {
    if (user?.routine) {
      setProducts(user.routine);
    }
  }, [user]);

  const addProduct = () => {
    setError(null);
    const nameValidation = validateSkincareInput(newProduct.name || "");
    if (!nameValidation.isValid) {
      setError(nameValidation.error || "Invalid product name.");
      return;
    }

    if (newProduct.ingredients) {
      const ingredientsValidation = validateSkincareInput(newProduct.ingredients);
      if (!ingredientsValidation.isValid) {
        setError(ingredientsValidation.error || "Invalid ingredients.");
        return;
      }
    }

    const product: RoutineProduct = {
      id: Math.random().toString(36).substring(7),
      name: newProduct.name!,
      ingredients: newProduct.ingredients,
      time: newProduct.time as any,
      frequency: newProduct.frequency as any,
      customDays: newProduct.customDays
    };
    const updated = [...products, product];
    setProducts(updated);
    onUpdateRoutine(updated);
    setIsAdding(false);
    setNewProduct({ time: "AM", frequency: "daily", name: "", ingredients: "" });
  };

  const removeProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    onUpdateRoutine(updated);
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await geminiService.analyzeRoutine(products);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to analyze routine";
      setError(msg);
      
      if (msg.includes("Requested entity was not found") || msg.includes("API key not valid")) {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
          window.aistudio.openSelectKey();
        }
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const RoutineSection = ({ time, title }: { time: "AM" | "PM", title: string }) => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-accent flex items-center gap-2">
        {time === "AM" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        {title}
      </h3>
      <div className="grid gap-4">
        {products.filter(p => p.time === time || p.time === "BOTH").map(p => (
          <div key={p.id} className="bg-theme-primary border-2 border-theme-secondary/20 p-4 rounded-2xl flex justify-between items-center group">
            <div>
              <h4 className="font-bold text-theme-secondary">{p.name}</h4>
              <p className="text-xs text-theme-secondary opacity-50 uppercase tracking-wider font-bold">
                {p.frequency} {p.customDays?.length ? `(${p.customDays.join(', ')})` : ''}
              </p>
            </div>
            <button 
              onClick={() => removeProduct(p.id)}
              className="p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {products.filter(p => p.time === time || p.time === "BOTH").length === 0 && (
          <div className="border-2 border-dashed border-theme-secondary/10 p-8 rounded-2xl text-center text-theme-secondary opacity-30">
            No {time} products added.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto py-20 px-6">
      <div className="flex justify-between items-start mb-12">
        <div>
          <h2 className="text-3xl font-bold text-accent mb-2">Routine Builder</h2>
          <p className="text-theme-secondary opacity-60">Organize your products and detect potential ingredient conflicts.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAdding(true)}
            className="px-6 py-3 bg-theme-primary border-2 border-theme-secondary text-theme-secondary rounded-2xl font-bold hover:bg-theme-secondary/5 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" /> Add Product
          </button>
          {user && (
            <button 
              onClick={() => {
                onUpdateRoutine(products);
                alert("Routine saved to profile!");
              }}
              className="px-6 py-3 bg-theme-secondary text-theme-primary rounded-2xl font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
            >
              <CheckCircle2 className="w-5 h-5" /> Save Routine
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12 mb-12">
        <RoutineSection time="AM" title="Morning Routine" />
        <RoutineSection time="PM" title="Evening Routine" />
      </div>

      <div className="flex justify-center mb-12">
        <button 
          onClick={runAnalysis}
          disabled={analyzing || products.length === 0}
          className="px-10 py-4 bg-theme-primary border-2 border-theme-secondary text-theme-secondary rounded-2xl font-bold hover:bg-theme-secondary/5 transition-all flex items-center gap-3 shadow-md disabled:opacity-50"
        >
          {analyzing ? "Analyzing..." : <><Activity className="w-5 h-5" /> Analyze Routine</>}
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-theme-secondary/5 border border-theme-secondary/20 rounded-2xl flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-theme-secondary opacity-60 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-theme-secondary">Analysis Failed</h4>
            <p className="text-sm text-theme-secondary opacity-80">
              {error.includes("503") || error.includes("high demand") || error.includes("UNAVAILABLE")
                ? "The AI service is currently experiencing high demand. We've retried automatically, but if this persists, please try again in a few minutes."
                : error}
            </p>
          </div>
        </div>
      )}

      {analysis && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-theme-primary border-2 border-theme-secondary/40 rounded-[40px] p-10 shadow-xl relative overflow-hidden"
        >
          {!user && (
            <div className="absolute inset-0 z-10 bg-theme-primary/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-theme-secondary mb-4">Unlock Routine Analysis</h3>
              <div className="text-theme-secondary opacity-60 mb-8 space-y-2 text-sm max-w-sm">
                <p>Create a free account to:</p>
                <ul className="space-y-1">
                  <li>• See your Routine Health Score</li>
                  <li>• Get Compatibility Alerts</li>
                  <li>• Save your routine history</li>
                </ul>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowAuthGate(true)}
                  className="px-8 py-4 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                >
                  Create Free Account
                </button>
                <button 
                  onClick={() => setShowAuthGate(true)}
                  className="px-8 py-4 bg-theme-primary border-2 border-theme-secondary text-theme-secondary rounded-2xl font-bold hover:bg-theme-secondary/5 transition-all"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-theme-secondary mb-2 tracking-tight">Routine Conflict Analysis</h3>
              <p className="text-xs font-bold opacity-40 uppercase tracking-widest">AI-Powered Ingredient Check</p>
            </div>
            <div className="flex items-center gap-6">
              {user && (
                <button 
                  onClick={handleShare}
                  disabled={isSharing}
                  className="flex flex-col items-center gap-1 text-theme-secondary opacity-40 hover:opacity-100 transition-all"
                >
                  <div className="w-10 h-10 rounded-full border border-theme-secondary/20 flex items-center justify-center">
                    {isSharing ? <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" /> : <Share className="w-4 h-4" />}
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest">Share Score</span>
                </button>
              )}
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-theme-secondary opacity-30 uppercase tracking-widest mb-1">Routine Score</span>
                <div className="text-5xl font-black text-accent">
                  {analysis.score}<span className="text-lg opacity-30">/100</span>
                </div>
              </div>
            </div>
          </div>
 
          <RoutineScoreBreakdown 
            safety={analysis.safetyScore} 
            compatibility={analysis.compatibilityScore} 
            balance={analysis.balanceScore} 
          />

          <div className="space-y-8">
            {analysis.conflicts.length > 0 ? (
              <div className="space-y-6">
                <h4 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Potential Ingredient Conflicts
                </h4>
                <div className="grid gap-4">
                  {analysis.conflicts.map((conflict, i) => (
                    <div key={i} className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl space-y-3">
                      <div className="font-bold text-red-500 text-lg">{conflict.ingredients}</div>
                      <p className="text-sm text-theme-secondary opacity-80 leading-relaxed">{conflict.explanation}</p>
                      <div className="pt-3 border-t border-red-500/10">
                        <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Recommendation</div>
                        <p className="text-sm font-medium text-theme-secondary">{conflict.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-10 bg-accent/5 border-2 border-accent/10 rounded-[32px] text-center">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-accent" />
                </div>
                <p className="text-lg font-bold text-theme-secondary">{analysis.summary}</p>
              </div>
            )}

            {analysis.conflicts.length > 0 && (
              <div className="p-6 bg-theme-secondary/5 rounded-3xl">
                <h4 className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-2">Summary</h4>
                <p className="text-sm text-theme-secondary opacity-70 leading-relaxed italic">"{analysis.summary}"</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-theme-secondary/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-theme-primary border-2 border-theme-secondary/30 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-theme-secondary mb-6">Add Product</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-theme-secondary opacity-50 uppercase tracking-wider">Product Name</label>
                  <input 
                    type="text"
                    autoFocus
                    className="w-full p-3 bg-theme-primary border-2 border-theme-secondary/20 text-theme-secondary rounded-xl outline-none focus:border-theme-secondary/50"
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-theme-secondary opacity-50 uppercase tracking-wider">Ingredients (Optional, for analysis)</label>
                  <textarea 
                    className="w-full p-3 bg-theme-primary border-2 border-theme-secondary/20 text-theme-secondary rounded-xl outline-none focus:border-theme-secondary/50 min-h-[100px]"
                    value={newProduct.ingredients}
                    onChange={e => setNewProduct({...newProduct, ingredients: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-theme-secondary opacity-50 uppercase tracking-wider">Time</label>
                    <select 
                      className="w-full p-3 bg-theme-primary border-2 border-theme-secondary/20 text-theme-secondary rounded-xl outline-none"
                      value={newProduct.time}
                      onChange={e => setNewProduct({...newProduct, time: e.target.value as any})}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                      <option value="BOTH">Both</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-theme-secondary opacity-50 uppercase tracking-wider">Frequency</label>
                    <select 
                      className="w-full p-3 bg-theme-primary border-2 border-theme-secondary/20 text-theme-secondary rounded-xl outline-none"
                      value={newProduct.frequency}
                      onChange={e => setNewProduct({...newProduct, frequency: e.target.value as any})}
                    >
                      <option value="daily">Daily</option>
                      <option value="every-other-day">Every Other Day</option>
                      <option value="weekly">Weekly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={addProduct}
                  className="w-full py-4 bg-theme-primary border-2 border-theme-secondary text-theme-secondary rounded-2xl font-bold hover:bg-theme-secondary/5 transition-all mt-4"
                >
                  Add to Routine
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AuthGateModal 
        isOpen={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        onLogin={async (email) => {
          const u = await api.login(email);
          onLogin(u);
          setShowAuthGate(false);
          alert("Account created! Your routine is now saved to your profile.");
        }}
        title="Unlock Routine Analysis"
        description="Create a free account to see your health score, compatibility alerts, and save your routine history."
        preview={{
          am: products.filter(p => p.time === "AM" || p.time === "BOTH").map(p => p.name),
          pm: products.filter(p => p.time === "PM" || p.time === "BOTH").map(p => p.name)
        }}
      />

      {/* Off-screen share card */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none">
        {analysis && (
          <RoutineShareCard 
            ref={shareCardRef} 
            score={analysis.score}
            safety={analysis.safetyScore}
            compat={analysis.compatibilityScore}
            balance={analysis.balanceScore}
            conflicts={analysis.conflicts}
            amProducts={products.filter(p => p.time === "AM" || p.time === "BOTH").map(p => p.name)}
            pmProducts={products.filter(p => p.time === "PM" || p.time === "BOTH").map(p => p.name)}
          />
        )}
      </div>
    </motion.div>
  );
};

const ProductComparator: React.FC<{ user: User | null }> = ({ user }) => {
  const [productA, setProductA] = useState({ name: "", ingredients: "" });
  const [productB, setProductB] = useState({ name: "", ingredients: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResponse | null>(null);
  const [userRoutine, setUserRoutine] = useState<RoutineProduct[]>([]);
  const [showSelector, setShowSelector] = useState<{ active: boolean, target: 'A' | 'B' }>({ active: false, target: 'A' });

  useEffect(() => {
    if (user) {
      api.getRoutine(user.id).then(setUserRoutine);
    }
  }, [user]);

  const handleSelectProduct = (product: RoutineProduct) => {
    if (showSelector.target === 'A') {
      setProductA({ name: product.name, ingredients: product.ingredients || "" });
    } else {
      setProductB({ name: product.name, ingredients: product.ingredients || "" });
    }
    setShowSelector({ ...showSelector, active: false });
  };

  const handleCompare = async () => {
    setError(null);
    
    const validateA = validateSkincareInput(productA.name + " " + productA.ingredients);
    if (!validateA.isValid) {
      setError(`Product A: ${validateA.error}`);
      return;
    }

    const validateB = validateSkincareInput(productB.name + " " + productB.ingredients);
    if (!validateB.isValid) {
      setError(`Product B: ${validateB.error}`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await geminiService.compareProducts(productA, productB);
      setResult(data);
      if (user) {
        await api.saveComparison(user.id, { productA, productB, result: data });
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const ScoreRow = ({ label, scoreA, scoreB, explanation }: { label: string, scoreA: number, scoreB: number, explanation: string }) => (
    <div className="bg-theme-primary border-2 border-theme-secondary/10 rounded-[32px] p-8 space-y-6 shadow-sm hover:border-theme-secondary/20 transition-all group">
      <div className="flex justify-between items-start">
        <h4 className="text-xl font-black text-theme-secondary tracking-tight group-hover:text-accent transition-colors">{label}</h4>
        <div className="flex gap-8">
          <div className="text-center">
            <div className="text-[9px] opacity-30 font-black uppercase tracking-[0.2em] mb-2">Prod A</div>
            <div className={`text-3xl font-black tracking-tighter ${scoreA > scoreB ? 'text-accent' : 'opacity-20'}`}>{scoreA}<span className="text-xs opacity-30 font-bold ml-0.5">/10</span></div>
          </div>
          <div className="text-center">
            <div className="text-[9px] opacity-30 font-black uppercase tracking-[0.2em] mb-2">Prod B</div>
            <div className={`text-3xl font-black tracking-tighter ${scoreB > scoreA ? 'text-accent' : 'opacity-20'}`}>{scoreB}<span className="text-xs opacity-30 font-bold ml-0.5">/10</span></div>
          </div>
        </div>
      </div>
      <p className="text-sm text-theme-secondary opacity-60 leading-relaxed border-t border-theme-secondary/5 pt-6 font-medium">{explanation}</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto py-20 px-6">
      <div className="mb-12">
        <h2 className="text-4xl font-bold text-accent mb-4 tracking-tight">Product Comparison</h2>
        <p className="text-lg text-theme-secondary opacity-60 leading-relaxed">Compare two products side-by-side to find the best fit for your skin.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="space-y-4">
          <div className="p-8 bg-theme-primary border-2 border-theme-secondary/10 rounded-3xl space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-theme-secondary opacity-50 font-bold uppercase text-[10px] tracking-widest">
                <div className="w-2 h-2 rounded-full bg-accent" /> Product A
              </div>
              {user && userRoutine.length > 0 && (
                <button 
                  onClick={() => setShowSelector({ active: true, target: 'A' })}
                  className="text-[10px] font-bold text-accent hover:opacity-100 border-2 border-accent/20 px-3 py-1 rounded-xl transition-all"
                >
                  Select from Routine
                </button>
              )}
            </div>
            <input 
              type="text"
              placeholder="Product Name"
              className="w-full p-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-2xl outline-none focus:border-accent transition-all"
              value={productA.name}
              onChange={e => setProductA({...productA, name: e.target.value})}
            />
            <textarea 
              placeholder="Paste ingredients here..."
              className="w-full p-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-2xl outline-none focus:border-accent transition-all min-h-[180px] leading-relaxed"
              value={productA.ingredients}
              onChange={e => setProductA({...productA, ingredients: e.target.value})}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="p-8 bg-theme-primary border-2 border-theme-secondary/10 rounded-3xl space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-theme-secondary opacity-50 font-bold uppercase text-[10px] tracking-widest">
                <div className="w-2 h-2 rounded-full bg-theme-secondary/30" /> Product B
              </div>
              {user && userRoutine.length > 0 && (
                <button 
                  onClick={() => setShowSelector({ active: true, target: 'B' })}
                  className="text-[10px] font-bold text-accent hover:opacity-100 border-2 border-accent/20 px-3 py-1 rounded-xl transition-all"
                >
                  Select from Routine
                </button>
              )}
            </div>
            <input 
              type="text"
              placeholder="Product Name"
              className="w-full p-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-2xl outline-none focus:border-accent transition-all"
              value={productB.name}
              onChange={e => setProductB({...productB, name: e.target.value})}
            />
            <textarea 
              placeholder="Paste ingredients here..."
              className="w-full p-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-2xl outline-none focus:border-accent transition-all min-h-[180px] leading-relaxed"
              value={productB.ingredients}
              onChange={e => setProductB({...productB, ingredients: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-center mb-20">
        <button 
          onClick={handleCompare}
          disabled={loading}
          className="px-16 py-5 bg-accent text-white rounded-3xl font-black text-xl hover:opacity-90 transition-all flex items-center gap-4 shadow-xl shadow-accent/20 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : <><GitCompare className="w-6 h-6" /> Compare Products</>}
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-500 text-sm text-center">
          {error}
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ScoreRow label="Hydration Support" scoreA={result.hydrationSupport.scoreA} scoreB={result.hydrationSupport.scoreB} explanation={result.hydrationSupport.explanation} />
            <ScoreRow label="Irritation Risk" scoreA={result.irritationRisk.scoreA} scoreB={result.irritationRisk.scoreB} explanation={result.irritationRisk.explanation} />
            <ScoreRow label="Pore-Clog Risk" scoreA={result.poreClogRisk.scoreA} scoreB={result.poreClogRisk.scoreB} explanation={result.poreClogRisk.explanation} />
            <ScoreRow label="Barrier Support" scoreA={result.barrierSupport.scoreA} scoreB={result.barrierSupport.scoreB} explanation={result.barrierSupport.explanation} />
            <ScoreRow label="Active Strength" scoreA={result.activeStrength.scoreA} scoreB={result.activeStrength.scoreB} explanation={result.activeStrength.explanation} />
            
            <div className="bg-theme-primary border-2 border-theme-secondary/10 rounded-[32px] p-8 space-y-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-accent" />
                </div>
                <h4 className="text-xl font-black text-theme-secondary tracking-tight">Skin Type Fit</h4>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-theme-secondary/5 rounded-2xl border border-theme-secondary/5">
                  <div className="text-[9px] font-black text-accent uppercase tracking-[0.2em] mb-2">Product A</div>
                  <div className="text-xs font-bold text-theme-secondary opacity-70">{result.skinTypeCompatibility.productA}</div>
                </div>
                <div className="p-4 bg-theme-secondary/5 rounded-2xl border border-theme-secondary/5">
                  <div className="text-[9px] font-black text-theme-secondary opacity-30 uppercase tracking-[0.2em] mb-2">Product B</div>
                  <div className="text-xs font-bold text-theme-secondary opacity-70">{result.skinTypeCompatibility.productB}</div>
                </div>
              </div>
              <p className="text-sm text-theme-secondary opacity-60 leading-relaxed border-t border-theme-secondary/5 pt-6 font-medium italic">"{result.skinTypeCompatibility.comparison}"</p>
            </div>
          </div>

          <div className="bg-theme-primary border-2 border-theme-secondary/10 rounded-[40px] p-12 shadow-sm">
            <h3 className="text-3xl font-black text-theme-secondary mb-12 tracking-tight">Comparison Summary</h3>
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-10">
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-theme-secondary/5 flex items-center justify-center shrink-0">
                    <Droplets className="w-6 h-6 text-theme-secondary opacity-40" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-theme-secondary opacity-30 uppercase tracking-[0.2em] mb-3">Better for Dry Skin</h4>
                    <p className="text-theme-secondary opacity-80 leading-relaxed font-medium">{result.summary.betterForDry}</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-theme-secondary/5 flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6 text-theme-secondary opacity-40" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-theme-secondary opacity-30 uppercase tracking-[0.2em] mb-3">Better for Oily Skin</h4>
                    <p className="text-theme-secondary opacity-80 leading-relaxed font-medium">{result.summary.betterForOily}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-10">
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-theme-secondary/5 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-theme-secondary opacity-40" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-theme-secondary opacity-30 uppercase tracking-[0.2em] mb-3">Irritation Risk</h4>
                    <p className="text-theme-secondary opacity-80 leading-relaxed font-medium">{result.summary.higherIrritationRisk}</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-theme-secondary/5 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6 text-accent opacity-40" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-3">Hydration Winner</h4>
                    <p className="text-theme-secondary opacity-80 leading-relaxed font-medium">{result.summary.strongerHydration}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-12 pt-12 border-t-2 border-theme-secondary/5 flex gap-8 items-start">
              <div className="w-16 h-16 rounded-[24px] bg-accent/10 flex items-center justify-center shrink-0">
                <Star className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-4">Final Verdict</h4>
                <p className="text-2xl font-bold text-theme-secondary leading-relaxed tracking-tight">{result.summary.finalVerdict}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showSelector.active && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSelector({ ...showSelector, active: false })}
              className="absolute inset-0 bg-theme-primary/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-theme-primary border-2 border-theme-secondary/10 rounded-[40px] p-10 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-theme-secondary mb-8">Select Product</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {userRoutine.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectProduct(p)}
                    className="w-full p-5 text-left bg-theme-primary border-2 border-theme-secondary/5 rounded-2xl hover:border-accent/30 transition-all flex justify-between items-center group"
                  >
                    <div>
                      <div className="font-bold text-theme-secondary group-hover:text-accent transition-colors">{p.name}</div>
                      <div className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-1">{p.time} • {p.frequency}</div>
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-20 group-hover:opacity-100 group-hover:text-accent transition-all" />
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowSelector({ ...showSelector, active: false })}
                className="w-full mt-8 py-4 bg-theme-primary border-2 border-theme-secondary/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-theme-secondary/5 transition-all"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Home: React.FC<{ onStartRoutine: () => void, onLearnMore: () => void }> = ({ onStartRoutine, onLearnMore }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="max-w-3xl mx-auto py-20 px-6"
  >
    <div className="text-center mb-16">
      <h1 className="text-5xl font-bold text-theme-secondary tracking-tight mb-6">
        Your skin, <span className="opacity-70">simplified.</span>
      </h1>
      <p className="text-xl text-theme-secondary opacity-80 mb-10 leading-relaxed">
        Neutral, science-backed skincare guidance. Generate routines or analyze ingredients without the marketing hype.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={onStartRoutine}
          className="px-8 py-4 bg-theme-primary border-2 border-theme-secondary text-theme-secondary rounded-2xl font-semibold hover:bg-theme-secondary/5 transition-all flex items-center justify-center gap-2 shadow-md shadow-theme-secondary/5"
        >
          Start Free Routine <ArrowRight className="w-5 h-5" />
        </button>
        <button 
          onClick={onLearnMore}
          className="px-8 py-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary opacity-80 rounded-2xl font-semibold hover:bg-theme-secondary/5 transition-all"
        >
          Learn More
        </button>
      </div>
    </div>
    <PrivacyNotice />
  </motion.div>
);

const RoutineScoreBreakdown = ({ safety, compatibility, balance }: { safety: number, compatibility: number, balance: number }) => (
  <div className="grid grid-cols-3 gap-4 mb-8">
    <div className="p-4 bg-theme-secondary/5 rounded-2xl border border-theme-secondary/10 flex flex-col items-center justify-center relative group">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Safety</span>
        <Info className="w-3 h-3 opacity-30" />
      </div>
      <div className="text-2xl font-black text-theme-secondary">{safety}</div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-theme-secondary text-theme-primary rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 text-[10px] leading-relaxed shadow-xl text-center">
        Measures the lack of harsh ingredient combinations and overall formulation safety.
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-theme-secondary"></div>
      </div>
    </div>
    <div className="p-4 bg-theme-secondary/5 rounded-2xl border border-theme-secondary/10 flex flex-col items-center justify-center relative group">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Compatibility</span>
        <Info className="w-3 h-3 opacity-30" />
      </div>
      <div className="text-2xl font-black text-theme-secondary">{compatibility}</div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-theme-secondary text-theme-primary rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 text-[10px] leading-relaxed shadow-xl text-center">
        How well your products work together without neutralizing each other or causing irritation.
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-theme-secondary"></div>
      </div>
    </div>
    <div className="p-4 bg-theme-secondary/5 rounded-2xl border border-theme-secondary/10 flex flex-col items-center justify-center relative group">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Balance</span>
        <Info className="w-3 h-3 opacity-30" />
      </div>
      <div className="text-2xl font-black text-theme-secondary">{balance}</div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-theme-secondary text-theme-primary rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 text-[10px] leading-relaxed shadow-xl text-center">
        The ratio of active treatments to hydrating/soothing barrier support.
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-theme-secondary"></div>
      </div>
    </div>
  </div>
);

const RoutineGenerator: React.FC<{ user: User | null }> = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoutineResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState({
    skinType: "normal",
    mainConcern: "barrier support",
    breakoutsPerWeek: 0,
    currentProducts: "",
    feelsTight: false
  });
  const [isSharing, setIsSharing] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    setIsSharing(true);

    // Workaround for html-to-image btoa issue with non-Latin1 characters
    const originalBtoa = window.btoa;
    window.btoa = (str) => {
      try {
        return originalBtoa(str);
      } catch (err) {
        return originalBtoa(unescape(encodeURIComponent(str)));
      }
    };

    try {
      const dataUrl = await toPng(shareCardRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `glowguide-routine-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to share card:', err);
      alert('Failed to generate share card. Please try again.');
    } finally {
      window.btoa = originalBtoa;
      setIsSharing(false);
    }
  };

  const parseProducts = (markdown: string) => {
    return markdown
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
      .map(line => line.replace(/^[-*]\s*/, '').trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.currentProducts.trim()) {
      const validation = validateSkincareInput(formData.currentProducts);
      if (!validation.isValid) {
        setError(validation.error || "Invalid current products list.");
        return;
      }
    }

    setLoading(true);
    setSaveSuccess(false);
    try {
      const data = await geminiService.generateRoutine(formData);
      setResult(data);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to generate routine";
      setError(msg);
      
      if (msg.includes("Requested entity was not found") || msg.includes("API key not valid")) {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
          window.aistudio.openSelectKey().then(() => {
            setError("API key updated. Please try again.");
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !result) return;
    setIsSaving(true);
    try {
      await api.saveGeneratedRoutine(user.id, result);
      setSaveSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to save routine");
    } finally {
      setIsSaving(false);
    }
  };

  if (result) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto py-20 px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-bold text-theme-secondary mb-2">Your AI Routine</h2>
            <p className="text-theme-secondary opacity-50 font-medium">Personalized for your skin profile</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleShare}
              disabled={isSharing}
              className="px-6 py-4 bg-theme-primary border-2 border-theme-secondary/20 text-theme-secondary rounded-3xl font-bold hover:bg-theme-secondary/5 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSharing ? <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" /> : <Share className="w-5 h-5" />}
              Share Score
            </button>
            <div className="px-6 py-4 rounded-3xl border-2 border-accent/20 bg-accent/5 flex flex-col items-center justify-center text-accent">
              <span className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Routine Score</span>
              <div className="text-3xl font-black">{result.score}<span className="text-sm opacity-40"> / 100</span></div>
            </div>
            {user && (
              <button 
                onClick={handleSave}
                disabled={isSaving || saveSuccess}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  saveSuccess 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                    : "bg-theme-primary border-theme-secondary/20 text-theme-secondary hover:border-theme-secondary/50"
                }`}
              >
                {saveSuccess ? <CheckCircle2 className="w-6 h-6" /> : <Bookmark className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>

        <RoutineScoreBreakdown 
          safety={result.safetyScore} 
          compatibility={result.compatibilityScore} 
          balance={result.balanceScore} 
        />

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Morning Card */}
          <div className="bg-theme-primary border-2 border-theme-secondary/10 p-8 rounded-3xl shadow-sm">
            <h3 className="text-xl font-bold text-theme-secondary mb-6 flex items-center gap-3">
              <Sun className="w-6 h-6 text-amber-500" /> Morning Routine
            </h3>
            <div className="text-theme-secondary opacity-80 whitespace-pre-wrap leading-relaxed">
              {result.morningRoutine}
            </div>
          </div>

          {/* Evening Card */}
          <div className="bg-theme-primary border-2 border-theme-secondary/10 p-8 rounded-3xl shadow-sm">
            <h3 className="text-xl font-bold text-theme-secondary mb-6 flex items-center gap-3">
              <Moon className="w-6 h-6 text-indigo-500" /> Evening Routine
            </h3>
            <div className="text-theme-secondary opacity-80 whitespace-pre-wrap leading-relaxed">
              {result.eveningRoutine}
            </div>
          </div>

          {/* Warning Card - What to pause */}
          <div className="bg-theme-primary border-2 border-rose-500/20 p-8 rounded-3xl shadow-sm">
            <h3 className="text-lg font-bold text-rose-500 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> What to Pause
            </h3>
            <p className="text-theme-secondary opacity-80 leading-relaxed">{result.whatToPause}</p>
          </div>

          {/* Suggestions Card - Introduce slowly */}
          <div className="bg-theme-primary border-2 border-accent/20 p-8 rounded-3xl shadow-sm">
            <h3 className="text-lg font-bold text-accent mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" /> Introduction Strategy
            </h3>
            <p className="text-theme-secondary opacity-80 leading-relaxed">{result.whatToIntroduceSlowly}</p>
          </div>

          {/* Likely Mistakes Card */}
          <div className="bg-theme-primary border-2 border-theme-secondary/10 p-8 rounded-3xl shadow-sm md:col-span-2">
            <h3 className="text-lg font-bold text-theme-secondary mb-6 flex items-center gap-2">
              <Info className="w-5 h-5 opacity-60" /> Likely Routine Mistakes
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {result.likelyMistakes.map((m, i) => (
                <div key={i} className="flex gap-3 p-4 bg-theme-secondary/5 rounded-2xl text-sm text-theme-secondary opacity-80">
                  <span className="text-rose-500 font-bold">!</span>
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Expected Results Card */}
          <div className="bg-theme-primary border-2 border-theme-secondary/10 p-8 rounded-3xl shadow-sm md:col-span-2">
            <h3 className="text-lg font-bold text-theme-secondary mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" /> Expected Results (2–4 weeks)
            </h3>
            <p className="text-theme-secondary opacity-80 leading-relaxed">{result.expectedResults}</p>
          </div>
        </div>

        <button 
          onClick={() => setResult(null)}
          className="w-full py-4 text-theme-secondary opacity-40 hover:opacity-100 font-medium transition-colors"
        >
          Generate a Different Routine
        </button>

        {/* Off-screen share card */}
        <div className="fixed -left-[2000px] top-0 pointer-events-none">
          {result && (
            <RoutineShareCard 
              ref={shareCardRef} 
              score={result.score}
              safety={result.safetyScore}
              compat={result.compatibilityScore}
              balance={result.balanceScore}
              amProducts={parseProducts(result.morningRoutine)}
              pmProducts={parseProducts(result.eveningRoutine)}
            />
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto py-20 px-6">
      <div className="mb-12">
        <h2 className="text-4xl font-bold text-accent mb-4 tracking-tight">Routine Generator</h2>
        <p className="text-lg text-theme-secondary opacity-60 leading-relaxed">
          Answer a few questions and our AI will generate a skincare routine tailored to your skin type, concerns, and current products.
        </p>
      </div>

      {error && (
        <div className="mb-10 p-5 bg-rose-500/5 border border-rose-500/20 rounded-3xl flex gap-4 items-start">
          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-500 mb-1">Generation Failed</h4>
            <p className="text-sm text-theme-secondary opacity-80 leading-relaxed">
              {error.includes("API key not valid") 
                ? "The Gemini API key is invalid or missing. Please ensure your API key is correctly configured in the AI Studio secrets." 
                : error.includes("503") || error.includes("high demand") || error.includes("UNAVAILABLE")
                ? "The AI service is currently experiencing high demand. We're retrying automatically, but if this persists, please try again in a few minutes."
                : error}
            </p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid sm:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-sm font-bold text-theme-secondary opacity-60 uppercase tracking-widest">Skin Type</label>
            <select 
              className="w-full p-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-2xl focus:border-accent outline-none transition-all appearance-none cursor-pointer"
              value={formData.skinType}
              onChange={e => setFormData({...formData, skinType: e.target.value})}
            >
              <option value="dry">Dry</option>
              <option value="oily">Oily</option>
              <option value="combination">Combination</option>
              <option value="sensitive">Sensitive</option>
              <option value="normal">Normal</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-theme-secondary opacity-60 uppercase tracking-widest">Main Concern</label>
            <select 
              className="w-full p-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-2xl focus:border-accent outline-none transition-all appearance-none cursor-pointer"
              value={formData.mainConcern}
              onChange={e => setFormData({...formData, mainConcern: e.target.value})}
            >
              <option value="breakouts">Breakouts</option>
              <option value="dryness">Dryness</option>
              <option value="texture">Texture</option>
              <option value="tone">Tone</option>
              <option value="barrier support">Barrier Support</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-theme-secondary opacity-60 uppercase tracking-widest">Breakouts per week</label>
          <input 
            type="number"
            className="w-full p-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-2xl focus:border-accent outline-none transition-all"
            value={formData.breakoutsPerWeek}
            onChange={e => setFormData({...formData, breakoutsPerWeek: parseInt(e.target.value) || 0})}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-theme-secondary opacity-60 uppercase tracking-widest">Current Products</label>
          <textarea 
            placeholder={`Example:\nCeraVe Foaming Cleanser\nThe Ordinary Niacinamide\nLa Roche Posay Moisturizer`}
            className="w-full p-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-2xl focus:border-accent outline-none min-h-[140px] transition-all leading-relaxed"
            value={formData.currentProducts}
            onChange={e => setFormData({...formData, currentProducts: e.target.value})}
          />
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-theme-secondary opacity-60 uppercase tracking-widest">Does your skin feel tight after cleansing?</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setFormData({...formData, feelsTight: true})}
              className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-all ${formData.feelsTight ? "bg-accent border-accent text-white" : "bg-theme-primary border-theme-secondary/10 text-theme-secondary opacity-60 hover:border-theme-secondary/30"}`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, feelsTight: false})}
              className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-all ${!formData.feelsTight ? "bg-accent border-accent text-white" : "bg-theme-primary border-theme-secondary/10 text-theme-secondary opacity-60 hover:border-theme-secondary/30"}`}
            >
              No
            </button>
          </div>
        </div>

        <div className="pt-6 text-center">
          <button 
            disabled={loading}
            className="w-full py-5 bg-accent text-white rounded-3xl font-black text-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-xl shadow-accent/20 mb-4"
          >
            {loading ? "Generating..." : "Generate My Routine"}
          </button>
          <p className="text-sm font-bold text-theme-secondary opacity-40">Free • No account required</p>
        </div>
      </form>
    </motion.div>
  );
};

const IngredientAnalyzer: React.FC<{ 
  user: User | null, 
  anonClientId: string | null,
  setActiveTab: (t: string) => void,
  onUpdateRoutine: (r: RoutineProduct[]) => void,
  onLogin: (u: User) => void
}> = ({ user, anonClientId, setActiveTab, onUpdateRoutine, onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [formData, setFormData] = useState({ productName: "", ingredients: "" });
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAddingToRoutine, setIsAddingToRoutine] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [vagueNotice, setVagueNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsage = async () => {
      const usage = await api.checkUsage(anonClientId, user?.id || null);
      setUsageCount(usage.count ?? 0);
    };
    fetchUsage();
  }, [anonClientId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVagueNotice(null);

    const validation = validateSkincareInput(formData.productName + " " + formData.ingredients);
    if (!validation.isValid) {
      setError(validation.error || "Invalid input.");
      return;
    }

    if (validation.isVague) {
      setVagueNotice("It looks like you entered a product or ingredient name. For a detailed analysis, please paste the full ingredient list from the product label or website.");
    }

    setLoading(true);
    setError(null);
    setSaveSuccess(false);
    try {
      // Check usage limit before proceeding
      const usage = await api.checkUsage(anonClientId, user?.id || null);
      setUsageCount(usage.count ?? 0);
      
      if (!usage.allowed) {
        setError("ANALYZE_LIMIT_REACHED");
        setLoading(false);
        return;
      }

      const data = await geminiService.analyzeIngredients(formData);
      
      // Log successful usage
      await api.logUsage(anonClientId, user?.id || null);
      
      // Refresh usage count
      const updatedUsage = await api.checkUsage(anonClientId, user?.id || null);
      setUsageCount(updatedUsage.count ?? 0);
      
      setResult(data);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to analyze ingredients";
      setError(msg);

      if (msg.includes("Requested entity was not found") || msg.includes("API key not valid")) {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
          window.aistudio.openSelectKey().then(() => {
            setError("API key updated. Please try again.");
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !result) return;
    setIsSaving(true);
    try {
      await api.saveAnalysis(user.id, { productName: formData.productName, ...result });
      setSaveSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to save analysis");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToRoutine = async () => {
    if (!result) return;
    
    if (!user) {
      setShowAuthGate(true);
      return;
    }

    setIsAddingToRoutine(true);
    try {
      const currentRoutine = user?.routine || [];
      const newProduct: RoutineProduct = {
        id: Math.random().toString(36).substring(7),
        name: formData.productName,
        ingredients: formData.ingredients,
        time: "BOTH",
        frequency: "daily"
      };
      onUpdateRoutine([...currentRoutine, newProduct]);
      alert("Product added to your routine! You can adjust the time and frequency in the Routine Builder.");
    } catch (err) {
      console.error(err);
      alert("Failed to add to routine");
    } finally {
      setIsAddingToRoutine(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 border-emerald-500/20 bg-emerald-500/5";
    if (score >= 60) return "text-amber-500 border-amber-500/20 bg-amber-500/5";
    return "text-rose-500 border-rose-500/20 bg-rose-500/5";
  };

  if (result) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto py-20 px-6">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-bold text-theme-secondary mb-2">{formData.productName}</h2>
            <p className="text-theme-secondary opacity-50 font-medium">Ingredient Analysis Result</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-6 py-4 rounded-3xl border-2 flex flex-col items-center justify-center relative group ${getScoreColor(result.compatibilityScore)}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  {user ? "Personal Compatibility" : "Compatibility Score"}
                </span>
                <Info className="w-3 h-3 opacity-40 cursor-help" />
              </div>
              <div className="text-3xl font-black">{result.compatibilityScore}<span className="text-sm opacity-40"> / 100</span></div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-theme-secondary text-theme-primary rounded-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl border border-theme-primary/10 translate-y-2 group-hover:translate-y-0">
                <div className="text-xs font-bold mb-2 border-b border-theme-primary/10 pb-2">
                  {user ? "Personal Compatibility" : "Compatibility Score"}
                </div>
                <div className="text-[11px] leading-relaxed opacity-90">
                  {user ? (
                    <div className="space-y-1">
                      <p>Adjusted for your:</p>
                      <ul className="list-disc pl-4">
                        <li>{user.skinType || "Skin type"}</li>
                        <li>{user.sensitivity || "Sensitivity"}</li>
                        <li>{user.concerns?.join(", ") || "Acne concerns"}</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p>Measures how well the ingredients in your routine work together.</p>
                      <p>Based on known ingredient interactions and irritation risk. Assumes average skin tolerance.</p>
                    </div>
                  )}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-theme-secondary"></div>
              </div>
            </div>
            {user && (
              <button 
                onClick={handleSave}
                disabled={isSaving || saveSuccess}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  saveSuccess 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                    : "bg-theme-primary border-theme-secondary/20 text-theme-secondary hover:border-theme-secondary/50"
                }`}
                title="Save to Dashboard"
              >
                {saveSuccess ? <CheckCircle2 className="w-6 h-6" /> : <Bookmark className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>

        {vagueNotice && (
          <div className="mb-12 p-6 bg-accent/5 border-2 border-accent/20 rounded-[32px] flex gap-4 items-center">
            <Info className="w-6 h-6 text-accent shrink-0" />
            <p className="text-sm font-medium text-theme-secondary opacity-80 leading-relaxed">
              {vagueNotice}
            </p>
          </div>
        )}

        {/* Card Layout */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Strengths */}
          <div className="bg-theme-primary border-2 border-theme-secondary/10 p-8 rounded-3xl shadow-sm">
            <h3 className="text-lg font-bold text-theme-secondary mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Strengths
            </h3>
            <ul className="space-y-4">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-theme-secondary opacity-80 leading-relaxed">
                  <span className="text-emerald-500 shrink-0 mt-1">✔</span>
                  {s.replace(/^✔\s*/, '')}
                </li>
              ))}
            </ul>
          </div>

          {/* Potential Concerns */}
          <div className="bg-theme-primary border-2 border-theme-secondary/10 p-8 rounded-3xl shadow-sm">
            <h3 className="text-lg font-bold text-theme-secondary mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" /> Potential Concerns
            </h3>
            <ul className="space-y-4">
              {result.potentialConcerns.map((c, i) => (
                <li key={i} className="flex items-start gap-3 text-theme-secondary opacity-80 leading-relaxed">
                  <span className="text-amber-500 shrink-0 mt-1">⚠</span>
                  {c.replace(/^⚠\s*/, '')}
                </li>
              ))}
            </ul>
          </div>

          {/* Best For */}
          <div className="bg-theme-primary border-2 border-theme-secondary/10 p-8 rounded-3xl shadow-sm">
            <h3 className="text-lg font-bold text-theme-secondary mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-theme-secondary opacity-60" /> Best For
            </h3>
            <ul className="space-y-4">
              {result.bestFor.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-theme-secondary opacity-80 leading-relaxed">
                  <span className="text-theme-secondary opacity-40 shrink-0 mt-1">•</span>
                  {b.replace(/^•\s*/, '')}
                </li>
              ))}
            </ul>
          </div>

          {/* Ingredient Highlights */}
          <div className="bg-theme-primary border-2 border-theme-secondary/10 p-8 rounded-3xl shadow-sm">
            <h3 className="text-lg font-bold text-theme-secondary mb-6 flex items-center gap-2">
              <Beaker className="w-5 h-5 text-theme-secondary opacity-60" /> Ingredient Highlights
            </h3>
            <div className="space-y-6">
              {result.ingredientHighlights.map((h, i) => (
                <div key={i}>
                  <h4 className="font-bold text-theme-secondary mb-1">{h.name}</h4>
                  <p className="text-sm text-theme-secondary opacity-70 leading-relaxed">{h.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => setActiveTab("compare")}
            className="flex-1 py-4 bg-theme-primary border-2 border-theme-secondary text-theme-secondary rounded-2xl font-bold hover:bg-theme-secondary/5 transition-all flex items-center justify-center gap-3"
          >
            <GitCompare className="w-5 h-5" /> Compare Product
          </button>
          <button 
            onClick={handleAddToRoutine}
            disabled={isAddingToRoutine}
            className="flex-1 py-4 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-accent/20"
          >
            <Plus className="w-5 h-5" /> {isAddingToRoutine ? "Adding..." : "Add to Routine"}
          </button>
        </div>

        <button 
          onClick={() => setResult(null)}
          className="w-full mt-12 py-4 text-theme-secondary opacity-40 hover:opacity-100 font-medium transition-colors"
        >
          Analyze Another Product
        </button>

        <AuthGateModal 
          isOpen={showAuthGate}
          onClose={() => setShowAuthGate(false)}
          onLogin={async (email) => {
            const u = await api.login(email);
            onLogin(u);
            setShowAuthGate(false);
            // After login, we could automatically add it, but for now let's just close
            alert("Account created! You can now add products to your routine.");
          }}
          title="Save products to your routine"
          description="Create a free account to build and track your skincare routine, see compatibility scores, and save product history."
          preview={{
            am: [formData.productName],
            pm: [formData.productName]
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto py-20 px-6">
      <div className="mb-12 flex justify-between items-start">
        <div>
          <h2 className="text-4xl font-bold text-accent mb-4 tracking-tight">Ingredient Analyzer</h2>
          <p className="text-lg text-theme-secondary opacity-60 leading-relaxed">Paste an ingredient list to understand skin compatibility and routine fit.</p>
        </div>
        {!user && usageCount !== null && (
          <div className="flex flex-col items-end opacity-60 hover:opacity-100 transition-opacity shrink-0">
            <span className="text-[10px] font-bold text-theme-secondary opacity-50 uppercase tracking-widest mb-1">Daily Limit</span>
            <div className="text-sm font-bold text-theme-secondary bg-theme-primary px-3 py-1 rounded-xl border-2 border-theme-secondary/10">
              {usageCount} <span className="opacity-40">/ 3</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-10 p-5 bg-rose-500/5 border border-rose-500/20 rounded-3xl flex gap-4 items-start">
          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-500 mb-1">
              {error === "ANALYZE_LIMIT_REACHED" ? "Limit Reached" : "Analysis Failed"}
            </h4>
            <p className="text-sm text-theme-secondary opacity-80 leading-relaxed">
              {error === "ANALYZE_LIMIT_REACHED" ? (
                <>
                  You’ve used your free product analyses for today.<br />
                  Create a free account to save your scans and unlock more analyses.<br />
                  We only store your data if you choose to create an account.
                </>
              ) : error.includes("API key not valid") 
                ? "The Gemini API key is invalid or missing. Please ensure your API key is correctly configured in the AI Studio secrets." 
                : error.includes("503") || error.includes("high demand") || error.includes("UNAVAILABLE")
                ? "The AI service is currently experiencing high demand. We're retrying automatically, but if this persists, please try again in a few minutes."
                : error}
            </p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-3">
          <label className="text-sm font-bold text-theme-secondary opacity-60 uppercase tracking-widest">Product Name</label>
          <input 
            type="text"
            placeholder="e.g. Gentle Hydrating Cleanser"
            className="w-full p-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-2xl focus:border-accent outline-none transition-all"
            value={formData.productName}
            onChange={e => setFormData({...formData, productName: e.target.value})}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-theme-secondary opacity-60 uppercase tracking-widest">Ingredient List</label>
          <textarea 
            placeholder="Paste ingredients here..."
            className="w-full p-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-2xl focus:border-accent outline-none min-h-[200px] transition-all leading-relaxed"
            value={formData.ingredients}
            onChange={e => setFormData({...formData, ingredients: e.target.value})}
          />
        </div>

        <button 
          disabled={loading}
          className="w-full py-5 bg-accent text-white rounded-3xl font-black text-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-xl shadow-accent/20"
        >
          {loading ? "Analyzing..." : "Analyze Ingredients"}
        </button>
      </form>
    </motion.div>
  );
};

const THEMES = [
  { id: 'glow', name: 'Glow', accent: '#10b981' },
  { id: 'calm', name: 'Calm', accent: '#6366f1' },
  { id: 'clinical', name: 'Clinical', accent: '#0ea5e9' },
  { id: 'midnight', name: 'Midnight', accent: '#64748b' },
  { id: 'rose', name: 'Rose', accent: '#f43f5e' },
];

const ThemeSettings: React.FC<{ user: User, darkMode: boolean, onUpdateTheme: (themeId: string, accent: string) => void }> = ({ user, darkMode, onUpdateTheme }) => {
  const [selectedTheme, setSelectedTheme] = useState(user?.theme_id || 'glow');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (themeId: string) => {
    if (!user) return;
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;

    setSelectedTheme(themeId);
    setError(null);
    setSaving(true);
    try {
      const res = await api.saveTheme(user.id, themeId, theme.accent, theme.accent);
      if (res.success) {
        onUpdateTheme(themeId, theme.accent);
      } else {
        setError(res.error || "Failed to save theme");
      }
    } catch (err) {
      setError("An error occurred while saving theme");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => handleSave(theme.id)}
            disabled={saving}
            className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
              selectedTheme === theme.id 
                ? "border-accent bg-accent/5" 
                : "border-theme-secondary/10 bg-theme-secondary/5 hover:border-theme-secondary/30"
            }`}
          >
            <div 
              className="w-8 h-8 rounded-full shadow-inner" 
              style={{ backgroundColor: theme.accent }}
            />
            <div>
              <div className="font-bold text-sm text-theme-secondary">{theme.name}</div>
              <div className="text-[10px] opacity-50 uppercase tracking-wider">Preset</div>
            </div>
            {selectedTheme === theme.id && (
              <div className="ml-auto w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold">
          {error}
        </div>
      )}
    </div>
  );
};

const DetailModal = ({ item, type, onClose }: { item: any, type: 'routine' | 'analysis' | 'comparison', onClose: () => void }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-theme-primary/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-theme-primary border-2 border-theme-secondary/10 rounded-[40px] p-10 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-2xl font-black text-theme-secondary mb-2 tracking-tight">
              {type === 'routine' && `Routine Details`}
              {type === 'analysis' && `Analysis: ${item.productName}`}
              {type === 'comparison' && `Comparison: ${item.productA.name} vs ${item.productB.name}`}
            </h3>
            <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Saved on {new Date(item.createdAt).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-theme-secondary/5 rounded-full transition-all">
            <X className="w-6 h-6 text-theme-secondary opacity-40" />
          </button>
        </div>

        <div className="space-y-8">
          {type === 'routine' && (
            <div className="space-y-6">
              {(item.safetyScore || item.compatibilityScore || item.balanceScore) && (
                <RoutineScoreBreakdown 
                  safety={item.safetyScore} 
                  compatibility={item.compatibilityScore} 
                  balance={item.balanceScore} 
                />
              )}
              <div className="p-6 bg-theme-secondary/5 rounded-3xl">
                <h4 className="text-xs font-black text-accent uppercase tracking-widest mb-4">Morning Routine</h4>
                <p className="text-theme-secondary opacity-80 leading-relaxed whitespace-pre-wrap">{item.morningRoutine}</p>
              </div>
              <div className="p-6 bg-theme-secondary/5 rounded-3xl">
                <h4 className="text-xs font-black text-accent uppercase tracking-widest mb-4">Evening Routine</h4>
                <p className="text-theme-secondary opacity-80 leading-relaxed whitespace-pre-wrap">{item.eveningRoutine}</p>
              </div>
              {item.tips && (
                <div className="p-6 bg-theme-secondary/5 rounded-3xl">
                  <h4 className="text-xs font-black text-accent uppercase tracking-widest mb-4">AI Tips</h4>
                  <ul className="space-y-2">
                    {item.tips.map((tip: string, i: number) => (
                      <li key={i} className="text-sm text-theme-secondary opacity-70 flex gap-2">
                        <span className="text-accent">•</span> {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {type === 'analysis' && (
            <div className="space-y-6">
              {(item.safetyScore || item.compatibilityScore || item.balanceScore) && (
                <RoutineScoreBreakdown 
                  safety={item.safetyScore} 
                  compatibility={item.compatibilityScore} 
                  balance={item.balanceScore} 
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-theme-secondary/5 rounded-3xl">
                  <div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Score</div>
                  <div className="text-3xl font-black text-accent">{item.compatibilityScore}/100</div>
                </div>
                <div className="p-6 bg-theme-secondary/5 rounded-3xl">
                  <div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Suitable For</div>
                  <div className="text-sm font-bold text-theme-secondary">{item.suitableFor}</div>
                </div>
              </div>
              <div className="p-6 bg-theme-secondary/5 rounded-3xl">
                <h4 className="text-xs font-black text-accent uppercase tracking-widest mb-4">Key Benefits</h4>
                <div className="flex flex-wrap gap-2">
                  {item.strengths.map((s: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest rounded-full">{s}</span>
                  ))}
                </div>
              </div>
              <div className="p-6 bg-theme-secondary/5 rounded-3xl">
                <h4 className="text-xs font-black text-accent uppercase tracking-widest mb-4">Potential Concerns</h4>
                <div className="flex flex-wrap gap-2">
                  {item.concerns.map((c: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {type === 'comparison' && (
            <div className="space-y-6">
              <div className="p-6 bg-accent/5 border-2 border-accent/10 rounded-3xl">
                <h4 className="text-xs font-black text-accent uppercase tracking-widest mb-2">Final Verdict</h4>
                <p className="text-lg font-bold text-theme-secondary leading-tight">{item.result.summary.finalVerdict}</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black opacity-30 uppercase tracking-widest">Product A</h4>
                  <p className="text-xs font-bold text-theme-secondary">{item.productA.name}</p>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black opacity-30 uppercase tracking-widest">Product B</h4>
                  <p className="text-xs font-bold text-theme-secondary">{item.productB.name}</p>
                </div>
              </div>
              <div className="p-6 bg-theme-secondary/5 rounded-3xl">
                <h4 className="text-xs font-black text-theme-secondary opacity-40 uppercase tracking-widest mb-4">Comparison Summary</h4>
                <p className="text-sm text-theme-secondary opacity-70 leading-relaxed">{item.result.summary.betterForDry}</p>
                <p className="text-sm text-theme-secondary opacity-70 leading-relaxed mt-2">{item.result.summary.betterForOily}</p>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-10 py-4 bg-theme-primary border-2 border-theme-secondary/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-theme-secondary/5 transition-all"
        >
          Close
        </button>
      </motion.div>
    </div>
  );
};

const SavedComparisons: React.FC<{ user: User, onViewDetail: (item: any) => void, onDelete: (id: number) => void }> = ({ user, onViewDetail, onDelete }) => {
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getComparisons(user.id).then(setComparisons).finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <div className="text-center py-10 opacity-50">Loading comparisons...</div>;
  if (comparisons.length === 0) return <div className="text-center py-10 opacity-50">No saved comparisons yet.</div>;

  return (
    <div className="space-y-4">
      {comparisons.map((comp, idx) => (
        <div key={idx} className="p-4 bg-theme-primary border-2 border-theme-secondary/10 rounded-2xl flex justify-between items-center group hover:border-theme-secondary/30 transition-all">
          <div className="flex-1">
            <div className="font-bold text-theme-secondary">{comp.productA.name} vs {comp.productB.name}</div>
            <div className="text-xs opacity-50">{new Date(comp.createdAt).toLocaleDateString()}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button 
                onClick={() => onViewDetail(comp)}
                className="p-2 hover:bg-theme-secondary/5 rounded-lg text-theme-secondary opacity-60 hover:opacity-100 transition-all"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  if (confirm("Delete this comparison?")) {
                    onDelete(comp.id);
                    setComparisons(prev => prev.filter(c => c.id !== comp.id));
                  }
                }}
                className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 opacity-60 hover:opacity-100 transition-all"
                title="Delete"
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs font-bold text-theme-secondary opacity-70 bg-theme-secondary/5 px-3 py-1 rounded-full">
              {comp.result.summary.finalVerdict.split('.')[0]}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ProfileSettings: React.FC<{ user: User, onUpdate: (profile: Partial<User>) => void }> = ({ user, onUpdate }) => {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<Partial<User>>({
    skinType: user?.skinType || "",
    concerns: user?.concerns || [],
    breakoutFrequency: user?.breakoutFrequency || "",
    sensitivity: user?.sensitivity || "",
    routineSize: user?.routineSize || "",
    avoidIngredients: user?.avoidIngredients || [],
    sunscreenUsage: user?.sunscreenUsage || "",
  });

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const res = await api.updateProfile(user.id, profile);
      if (res.success) {
        onUpdate(profile);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black opacity-30 uppercase tracking-widest">Skin Type</label>
          <select 
            value={profile.skinType}
            onChange={e => setProfile({...profile, skinType: e.target.value})}
            className="w-full p-3 bg-theme-secondary/5 border border-theme-secondary/10 rounded-xl text-xs font-bold outline-none"
          >
            <option value="">Select...</option>
            {["Oily", "Dry", "Combination", "Normal", "Sensitive", "Not sure"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black opacity-30 uppercase tracking-widest">Sensitivity</label>
          <select 
            value={profile.sensitivity}
            onChange={e => setProfile({...profile, sensitivity: e.target.value})}
            className="w-full p-3 bg-theme-secondary/5 border border-theme-secondary/10 rounded-xl text-xs font-bold outline-none"
          >
            <option value="">Select...</option>
            {["Very sensitive", "Somewhat sensitive", "Not very sensitive", "Unsure"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black opacity-30 uppercase tracking-widest">Primary Concerns</label>
        <div className="flex flex-wrap gap-2">
          {["Acne / Breakouts", "Aging / Fine Lines", "Dark Spots / Hyperpigmentation", "Dryness", "Redness / Sensitivity", "Texture / Large Pores"].map(c => {
            const isSelected = profile.concerns?.includes(c);
            return (
              <button 
                key={c}
                onClick={() => {
                  const current = profile.concerns || [];
                  const updated = isSelected ? current.filter(o => o !== c) : [...current, c];
                  setProfile({...profile, concerns: updated});
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${isSelected ? "bg-accent text-white" : "bg-theme-secondary/5 text-theme-secondary opacity-60 hover:opacity-100"}`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black opacity-30 uppercase tracking-widest">Breakouts</label>
          <select 
            value={profile.breakoutFrequency}
            onChange={e => setProfile({...profile, breakoutFrequency: e.target.value})}
            className="w-full p-3 bg-theme-secondary/5 border border-theme-secondary/10 rounded-xl text-xs font-bold outline-none"
          >
            <option value="">Select...</option>
            {["Rarely", "Occasionally", "Monthly", "Weekly", "Frequently"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black opacity-30 uppercase tracking-widest">Sunscreen</label>
          <select 
            value={profile.sunscreenUsage}
            onChange={e => setProfile({...profile, sunscreenUsage: e.target.value})}
            className="w-full p-3 bg-theme-secondary/5 border border-theme-secondary/10 rounded-xl text-xs font-bold outline-none"
          >
            <option value="">Select...</option>
            {["Daily", "Most days", "Occasionally", "Rarely", "Never"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-accent text-white rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50"
      >
        {saving ? "Saving..." : "Update Profile"}
      </button>
      {success && <div className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-2 text-center">Saved!</div>}
    </div>
  );
};

const RoutineTracker: React.FC<{ 
  data: DashboardData | null, 
  userId: number, 
  onRefresh: () => void 
}> = ({ data, userId, onRefresh }) => {
  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async (type: "morning" | "night") => {
    setIsLogging(true);
    try {
      const res = await api.logRoutine(userId, type);
      if (res.success) {
        onRefresh();
      } else if (res.error === "ALREADY_LOGGED_TODAY") {
        alert(`You've already logged your ${type} routine today!`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <section className="bg-theme-primary border-2 border-theme-secondary/10 rounded-[32px] p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-accent flex items-center gap-2">
            <Award className="w-5 h-5 text-accent" /> Routine Tracker
          </h3>
          <p className="text-xs text-theme-secondary opacity-40 uppercase tracking-widest mt-1">Consistency is key</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-theme-secondary">{data?.streak || 0}</div>
          <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Day Streak</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          onClick={() => handleLog("morning")}
          disabled={isLogging}
          className="flex flex-col items-center justify-center p-6 bg-theme-secondary/5 border border-theme-secondary/10 rounded-2xl hover:bg-theme-secondary/10 transition-all group disabled:opacity-50"
        >
          <Sun className="w-6 h-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold text-theme-secondary">Morning</span>
          <span className="text-[10px] opacity-40 uppercase tracking-tighter mt-1">Log Completion</span>
        </button>
        <button 
          onClick={() => handleLog("night")}
          disabled={isLogging}
          className="flex flex-col items-center justify-center p-6 bg-theme-secondary/5 border border-theme-secondary/10 rounded-2xl hover:bg-theme-secondary/10 transition-all group disabled:opacity-50"
        >
          <Moon className="w-6 h-6 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold text-theme-secondary">Night</span>
          <span className="text-[10px] opacity-40 uppercase tracking-tighter mt-1">Log Completion</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-xs font-bold opacity-40 uppercase tracking-widest">Weekly Progress</span>
          <span className="text-sm font-bold text-theme-secondary">{data?.weeklyCompletionRate || 0}%</span>
        </div>
        <div className="h-2 bg-theme-secondary/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${data?.weeklyCompletionRate || 0}%` }}
            className="h-full bg-accent"
          />
        </div>
        {data?.lastRoutine && (
          <div className="flex items-center gap-2 text-[10px] text-theme-secondary opacity-50 italic">
            <Clock className="w-3 h-3" /> 
            Last logged: {data.lastRoutine.type} at {new Date(data.lastRoutine.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </section>
  );
};

const SkinTrendsChart: React.FC<{ trends: SkinLog[] }> = ({ trends }) => {
  const chartData = trends.map(log => ({
    date: new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    Acne: log.acne,
    Oiliness: log.oiliness,
    Dryness: log.dryness,
    Irritation: log.irritation
  }));

  return (
    <section className="bg-theme-primary border-2 border-theme-secondary/10 rounded-[32px] p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-accent flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" /> Skin Progress
          </h3>
          <p className="text-xs text-theme-secondary opacity-40 uppercase tracking-widest mt-1">Last 30 days trend</p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        {trends.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorAcne" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOil" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, opacity: 0.5 }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, opacity: 0.5 }}
                domain={[0, 10]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--theme-primary)', 
                  border: '1px solid rgba(var(--theme-secondary-rgb), 0.1)',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
              <Area type="monotone" dataKey="Acne" stroke="#ef4444" fillOpacity={1} fill="url(#colorAcne)" strokeWidth={2} />
              <Area type="monotone" dataKey="Oiliness" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOil)" strokeWidth={2} />
              <Area type="monotone" dataKey="Dryness" stroke="#10b981" fillOpacity={0} strokeWidth={2} />
              <Area type="monotone" dataKey="Irritation" stroke="#f59e0b" fillOpacity={0} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-theme-secondary opacity-40 space-y-2">
            <Activity className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">Log more check-ins to see trends</p>
            <p className="text-[10px] uppercase tracking-widest">Need at least 2 entries</p>
          </div>
        )}
      </div>
    </section>
  );
};

const SkinHealthScore = ({ score, trend }: { score: number, trend: number }) => {
  const [showInfo, setShowInfo] = useState(false);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <section className="bg-theme-primary border-2 border-theme-secondary/10 p-6 rounded-[32px] relative overflow-hidden shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-theme-secondary flex items-center gap-2">
            Skin Health Score
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className="p-1 hover:bg-theme-secondary/5 rounded-full transition-all"
            >
              <Info className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
            </button>
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-bold flex items-center gap-0.5 ${trend >= 0 ? 'text-accent' : 'text-rose-500'}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
              {trend >= 0 ? '+' : ''}{trend}
            </span>
            <span className="text-[10px] font-bold opacity-30 uppercase tracking-wider">Weekly Trend</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center relative py-2">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            className="text-theme-secondary/5"
          />
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="text-accent"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-accent">{score}</span>
          <span className="text-[8px] font-black opacity-30 uppercase tracking-widest">Health Index</span>
        </div>
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-0 bg-theme-primary/95 backdrop-blur-sm p-6 flex flex-col justify-center z-10"
          >
            <button 
              onClick={() => setShowInfo(false)}
              className="absolute top-4 right-4 p-2 hover:bg-theme-secondary/5 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="font-bold text-theme-secondary mb-3 text-sm">Score Calculation</h4>
            <ul className="text-[11px] text-theme-secondary opacity-70 space-y-2">
              <li>• <span className="font-bold">40% Consistency:</span> Based on your routine logging frequency.</li>
              <li>• <span className="font-bold">60% Condition:</span> Based on acne, irritation, and oil/dry balance logs.</li>
            </ul>
            <p className="text-[9px] opacity-40 mt-4 leading-relaxed italic">
              Weighted towards your most recent check-ins.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

const CompactSkinHealthScore = ({ score, trend }: { score: number, trend: number }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-theme-primary border-2 border-theme-secondary/10 p-6 rounded-3xl flex items-center justify-between shadow-sm">
      <div>
        <div className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Skin Health</div>
        <div className="text-3xl font-black text-accent">{score}%</div>
        <div className={`text-[10px] font-bold flex items-center gap-0.5 mt-1 ${trend >= 0 ? 'text-accent' : 'text-rose-500'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
          {trend >= 0 ? '+' : ''}{trend}
        </div>
      </div>
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="w-16 h-16 transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            className="text-theme-secondary/5"
          />
          <motion.circle
            cx="32"
            cy="32"
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="text-accent"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-black text-theme-secondary opacity-40">{score}</span>
        </div>
      </div>
    </div>
  );
};

const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = false }: { title: string, icon: any, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <section className="bg-theme-primary border-2 border-theme-secondary/10 rounded-3xl overflow-hidden shadow-sm">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between hover:bg-theme-secondary/5 transition-all"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-accent" />
          <h3 className="font-bold text-theme-secondary">{title}</h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 opacity-40" /> : <ChevronDown className="w-5 h-5 opacity-40" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

const SavedItems = ({ 
  data, 
  setDetailItem, 
  handleDeleteRoutine, 
  handleDeleteAnalysis, 
  handleDeleteComparison,
  user
}: {
  data: DashboardData | null,
  setDetailItem: (item: any) => void,
  handleDeleteRoutine: (id: number) => void,
  handleDeleteAnalysis: (id: number) => void,
  handleDeleteComparison: (id: number) => void,
  user: User
}) => {
  return (
    <div className="space-y-8">
      <CollapsibleSection title="Saved Routines" icon={Bookmark}>
        <div className="pt-4">
          {data?.savedRoutines && data.savedRoutines.length > 0 ? (
            <div className="space-y-4">
              {data.savedRoutines.map((r, idx) => (
                <div key={idx} className="p-4 bg-theme-primary border-2 border-theme-secondary/10 rounded-2xl group hover:border-theme-secondary/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-theme-secondary">Routine from {new Date(r.createdAt).toLocaleDateString()}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => setDetailItem({ item: r, type: 'routine' })}
                          className="p-1.5 hover:bg-theme-secondary/5 rounded-lg text-theme-secondary opacity-60 hover:opacity-100 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRoutine(r.id)}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 opacity-60 hover:opacity-100 transition-all"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">AI Generated</div>
                    </div>
                  </div>
                  <p className="text-xs text-theme-secondary opacity-60 line-clamp-2">{r.morningRoutine}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-theme-primary border-2 border-theme-secondary/30 rounded-2xl p-8 text-center text-theme-secondary opacity-40">
              No saved routines yet.
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Saved Analyses" icon={FlaskConical}>
        <div className="pt-4">
          {data?.savedAnalyses && data.savedAnalyses.length > 0 ? (
            <div className="space-y-4">
              {data.savedAnalyses.map((a, idx) => (
                <div key={idx} className="p-4 bg-theme-primary border-2 border-theme-secondary/10 rounded-2xl flex justify-between items-center group hover:border-theme-secondary/30 transition-all">
                  <div>
                    <div className="font-bold text-theme-secondary">{a.productName}</div>
                    <div className="text-xs opacity-50">{new Date(a.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => setDetailItem({ item: a, type: 'analysis' })}
                        className="p-1.5 hover:bg-theme-secondary/5 rounded-lg text-theme-secondary opacity-60 hover:opacity-100 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteAnalysis(a.id)}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 opacity-60 hover:opacity-100 transition-all"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-xs font-bold text-theme-secondary opacity-70 bg-theme-secondary/5 px-3 py-1 rounded-full">
                      {a.compatibilityScore ? `${a.compatibilityScore}/100` : a.suitableFor.split(',')[0]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-theme-primary border-2 border-theme-secondary/30 rounded-2xl p-8 text-center text-theme-secondary opacity-40">
              No saved analyses yet.
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Saved Comparisons" icon={GitCompare}>
        <div className="pt-4">
          <SavedComparisons 
            user={user} 
            onViewDetail={(item) => setDetailItem({ item, type: 'comparison' })}
            onDelete={handleDeleteComparison}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
};

const Dashboard: React.FC<{ 
  user: User | null, 
  darkMode: boolean, 
  onLogin: (u: User) => void, 
  onUpdateTheme: (themeId: string, accent: string) => void, 
  onUpdateProfile: (p: Partial<User>) => void,
  setActiveTab: (t: string) => void
}> = ({ user, darkMode, onLogin, onUpdateTheme, onUpdateProfile, setActiveTab }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [email, setEmail] = useState("");
  const [detailItem, setDetailItem] = useState<{ item: any, type: 'routine' | 'analysis' | 'comparison' } | null>(null);
  const [checkInData, setCheckInData] = useState({
    acne: 5,
    oiliness: 5,
    dryness: 5,
    irritation: 5
  });
  const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempName, setTempName] = useState(user?.name || "");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const refreshData = () => {
    if (user) {
      api.getDashboardData(user.id).then(setData);
    }
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  useEffect(() => {
    if (data?.lastCheckIn) {
      setCheckInData({
        acne: data.lastCheckIn.acne,
        oiliness: data.lastCheckIn.oiliness,
        dryness: data.lastCheckIn.dryness,
        irritation: data.lastCheckIn.irritation
      });
    }
  }, [data?.lastCheckIn]);

  const handleSkinLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingCheckIn(true);
    try {
      await api.logSkin(user.id, checkInData);
      refreshData();
      alert("Daily check-in saved!");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingCheckIn(false);
    }
  };

  const handleDeleteRoutine = async (id: number) => {
    if (!confirm("Delete this routine?")) return;
    await api.deleteSavedRoutine(id);
    setData(prev => prev ? { ...prev, savedRoutines: prev.savedRoutines.filter(r => r.id !== id) } : null);
  };

  const handleDeleteAnalysis = async (id: number) => {
    if (!confirm("Delete this analysis?")) return;
    await api.deleteAnalysis(id);
    setData(prev => prev ? { ...prev, savedAnalyses: prev.savedAnalyses.filter(a => a.id !== id) } : null);
  };

  const handleDeleteComparison = async (id: number) => {
    await api.deleteComparison(id);
    setData(prev => prev ? { ...prev, savedComparisons: prev.savedComparisons.filter(c => c.id !== id) } : null);
  };

  const handleUpdateName = async () => {
    if (!user) return;
    setIsUpdatingName(true);
    try {
      await api.updateProfile(user.id, { name: tempName });
      onUpdateProfile({ name: tempName });
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingName(false);
    }
  };

  if (!user) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto py-32 px-6 text-center">
        <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-theme-secondary mb-4">Save your skincare journey</h2>
        <div className="text-theme-secondary opacity-60 mb-8 space-y-2 text-sm leading-relaxed">
          <p>Create a free account to:</p>
          <ul className="space-y-1">
            <li>• Build and track your skincare routine</li>
            <li>• See compatibility scores</li>
            <li>• Save product history</li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-[10px] font-black text-theme-secondary opacity-40 uppercase tracking-widest ml-1">Email Address</label>
            <input 
              type="email"
              placeholder="Enter your email"
              className="w-full p-4 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-2xl outline-none focus:border-accent/50 transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={async () => {
                const u = await api.login(email || "demo@example.com");
                onLogin(u);
              }}
              className="py-4 bg-accent text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
            >
              Create Free Account
            </button>
            <button 
              onClick={async () => {
                const u = await api.login(email || "demo@example.com");
                onLogin(u);
              }}
              className="py-4 bg-theme-primary border-2 border-theme-secondary text-theme-secondary rounded-2xl font-bold hover:bg-theme-secondary/5 transition-all"
            >
              Sign In
            </button>
          </div>
          <p className="text-xs text-theme-secondary opacity-40 mt-6">Unlock Routine History, Health Scores, and Compatibility Alerts.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto py-20 px-6">
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 z-[60] bg-theme-primary w-full max-w-md shadow-2xl overflow-y-auto"
            >
              <div className="p-6 pb-32">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-accent">Settings</h2>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-theme-secondary/10 rounded-xl">
                    <X className="w-6 h-6 text-theme-secondary" />
                  </button>
                </div>

              <div className="space-y-8">
                {/* Name Change */}
                <section className="bg-theme-secondary/5 p-6 rounded-3xl border border-theme-secondary/10">
                  <h3 className="text-sm font-bold opacity-40 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <UserIcon className="w-4 h-4" /> Profile
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-theme-secondary opacity-40 uppercase tracking-widest ml-1">Email Address</label>
                      <div className="p-3 bg-theme-primary/50 border-2 border-theme-secondary/5 text-theme-secondary rounded-xl opacity-60 text-sm">
                        {user.email}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-theme-secondary opacity-40 uppercase tracking-widest ml-1">Display Name</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={tempName}
                          onChange={e => setTempName(e.target.value)}
                          className="flex-1 p-3 bg-theme-primary border-2 border-theme-secondary/10 text-theme-secondary rounded-xl outline-none focus:border-accent/50 transition-all"
                          placeholder="Your name"
                        />
                        <button 
                          onClick={handleUpdateName}
                          disabled={isUpdatingName || tempName === user.name}
                          className="px-4 bg-accent text-white rounded-xl font-bold disabled:opacity-50 transition-all text-sm"
                        >
                          {isUpdatingName ? "..." : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Skin Profile */}
                <CollapsibleSection title="Skin Profile" icon={ShieldCheck}>
                  <div className="pt-4">
                    <ProfileSettings user={user} onUpdate={onUpdateProfile} />
                  </div>
                </CollapsibleSection>

                {/* Appearance */}
                <CollapsibleSection title="Appearance" icon={Palette}>
                  <div className="pt-4">
                    <ThemeSettings user={user} darkMode={darkMode} onUpdateTheme={onUpdateTheme} />
                  </div>
                </CollapsibleSection>

                {/* Saved Items */}
                <CollapsibleSection title="Saved Items" icon={Bookmark}>
                  <div className="pt-4">
                    <SavedItems 
                      data={data}
                      user={user}
                      setDetailItem={setDetailItem}
                      handleDeleteRoutine={handleDeleteRoutine}
                      handleDeleteAnalysis={handleDeleteAnalysis}
                      handleDeleteComparison={handleDeleteComparison}
                    />
                  </div>
                </CollapsibleSection>

                {/* Membership */}
                <section className="bg-theme-secondary/5 p-6 rounded-3xl border border-theme-secondary/10">
                  <h3 className="text-sm font-bold opacity-40 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Membership
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-theme-primary rounded-2xl border border-theme-secondary/10">
                    <div>
                      <div className="font-bold text-theme-secondary">Pro Plan</div>
                      <div className="text-xs opacity-50">Active until March 2027</div>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      Active
                    </div>
                  </div>
                  <button className="w-full mt-4 py-3 bg-theme-secondary/10 text-theme-secondary rounded-xl font-bold text-sm hover:bg-theme-secondary/20 transition-all">
                    Manage Subscription
                  </button>
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

      <div className="flex justify-between items-end mb-12">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-accent mb-2">Welcome back, {user.name || 'User'}</h2>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 bg-theme-secondary/10 text-theme-secondary rounded-2xl hover:bg-theme-secondary/20 transition-all"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
        <div className="hidden md:block px-4 py-2 bg-theme-secondary/10 text-theme-secondary rounded-full text-sm font-bold">
          PRO MODE
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <div className="bg-theme-primary border-2 border-theme-secondary/10 p-6 rounded-3xl">
          <div className="text-xs font-bold opacity-40 uppercase tracking-widest mb-1">Total Scans</div>
          <div className="text-3xl font-black text-accent">{data?.scansCount || 0}</div>
        </div>
        <CompactSkinHealthScore score={data?.healthScore || 0} trend={data?.healthScoreTrend || 0} />
        <div className="bg-theme-primary border-2 border-theme-secondary/10 p-6 rounded-3xl">
          <div className="text-xs font-bold opacity-40 uppercase tracking-widest mb-1">Check-in Streak</div>
          <div className="text-3xl font-black text-accent">{data?.streak || 0}<span className="text-sm opacity-30"> days</span></div>
        </div>
        <div className="bg-theme-primary border-2 border-theme-secondary/10 p-6 rounded-3xl">
          <div className="text-xs font-bold opacity-40 uppercase tracking-widest mb-1">Saved Items</div>
          <div className="text-3xl font-black text-accent">{(data?.savedRoutines.length || 0) + (data?.savedAnalyses.length || 0) + (data?.savedComparisons.length || 0)}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <RoutineTracker data={data} userId={user.id} onRefresh={refreshData} />
          
          <CollapsibleSection title="Skin Progress Chart" icon={Activity}>
            <div className="pt-4">
              <SkinTrendsChart trends={data?.skinTrends || []} />
            </div>
          </CollapsibleSection>

          <section className="bg-theme-secondary/5 rounded-[32px] p-8 border border-theme-secondary/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-accent">Your Current Routine</h3>
              <div className="flex items-center gap-2 text-accent font-bold text-sm">
                <Activity className="w-4 h-4" /> Balanced
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black opacity-30 uppercase tracking-widest">
                  <Sun className="w-3 h-3" /> Morning
                </div>
                <div className="space-y-2">
                  {user.routine && user.routine.filter(p => p.time === "AM" || p.time === "BOTH").length > 0 ? (
                    user.routine.filter(p => p.time === "AM" || p.time === "BOTH").map((p, i) => (
                      <div key={i} className="text-sm font-medium text-theme-secondary opacity-80 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent" /> {p.name}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-theme-secondary opacity-40 italic">No AM products</p>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black opacity-30 uppercase tracking-widest">
                  <Moon className="w-3 h-3" /> Evening
                </div>
                <div className="space-y-2">
                  {user.routine && user.routine.filter(p => p.time === "PM" || p.time === "BOTH").length > 0 ? (
                    user.routine.filter(p => p.time === "PM" || p.time === "BOTH").map((p, i) => (
                      <div key={i} className="text-sm font-medium text-theme-secondary opacity-80 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent" /> {p.name}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-theme-secondary opacity-40 italic">No PM products</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-theme-secondary/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Health Score</span>
                  <span className="text-xl font-black text-accent">{data?.healthScore || 0}%</span>
                </div>
                <div className="flex flex-col border-l border-theme-secondary/10 pl-4">
                  <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Alerts</span>
                  <span className="text-xl font-black text-rose-500">0</span>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab("routine-builder")}
                className="text-xs font-bold text-theme-secondary opacity-60 hover:opacity-100 transition-all flex items-center gap-1"
              >
                Edit Routine <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <CollapsibleSection title="Daily Check-in" icon={CheckCircle2} defaultOpen={true}>
            <form className="space-y-4" onSubmit={handleSkinLog}>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs uppercase tracking-wider font-bold opacity-50">Acne</label>
                  <span className="text-xs font-bold text-accent">{checkInData.acne}</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="10" 
                  value={checkInData.acne}
                  onChange={e => setCheckInData({...checkInData, acne: parseInt(e.target.value)})}
                  className="w-full accent-theme-secondary" 
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs uppercase tracking-wider font-bold opacity-50">Oiliness</label>
                  <span className="text-xs font-bold text-accent">{checkInData.oiliness}</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="10" 
                  value={checkInData.oiliness}
                  onChange={e => setCheckInData({...checkInData, oiliness: parseInt(e.target.value)})}
                  className="w-full accent-theme-secondary" 
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs uppercase tracking-wider font-bold opacity-50">Dryness</label>
                  <span className="text-xs font-bold text-accent">{checkInData.dryness}</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="10" 
                  value={checkInData.dryness}
                  onChange={e => setCheckInData({...checkInData, dryness: parseInt(e.target.value)})}
                  className="w-full accent-theme-secondary" 
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs uppercase tracking-wider font-bold opacity-50">Irritation</label>
                  <span className="text-xs font-bold text-accent">{checkInData.irritation}</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="10" 
                  value={checkInData.irritation}
                  onChange={e => setCheckInData({...checkInData, irritation: parseInt(e.target.value)})}
                  className="w-full accent-theme-secondary" 
                />
              </div>
              <button 
                type="submit"
                disabled={isSavingCheckIn}
                className="w-full py-3 bg-theme-primary border border-theme-secondary/20 rounded-xl font-bold hover:bg-theme-secondary/5 transition-all mt-4 shadow-sm disabled:opacity-50"
              >
                {isSavingCheckIn ? "Saving..." : "Save Check-in"}
              </button>
            </form>
          </CollapsibleSection>
        </div>
      </div>
      <AnimatePresence>
        {detailItem && (
          <DetailModal 
            item={detailItem.item} 
            type={detailItem.type} 
            onClose={() => setDetailItem(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("glowguide_user");
      return saved ? "dashboard" : "routine";
    }
    return "routine";
  });
  const [user, setUser] = useState<User | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [anonClientId, setAnonClientId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("glowguide_theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkApiKey();
    
    const saved = localStorage.getItem("glowguide_user");
    if (saved) setUser(JSON.parse(saved));

    let id = localStorage.getItem("anon_client_id");
    if (!id) {
      id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("anon_client_id", id);
    }
    setAnonClientId(id);
  }, []);

  useEffect(() => {
    const isValidColor = (c: string) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(c);
    
    const themeId = user?.theme_id || 'glow';
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    const accent = user?.theme_primary_color || theme.accent;

    try {
      if (isValidColor(accent)) {
        document.documentElement.style.setProperty('--accent', accent);
      }
    } catch (e) {
      console.warn("Error applying theme", e);
    }
  }, [user]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("glowguide_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("glowguide_theme", "light");
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem("glowguide_user", JSON.stringify(u));
    if (!u.onboardingCompleted) {
      setIsOnboardingOpen(true);
    }
  };

  const handleOnboardingComplete = async (profile: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...profile };
      setUser(updatedUser);
      localStorage.setItem("glowguide_user", JSON.stringify(updatedUser));
      await api.updateProfile(user.id, profile);
      setIsOnboardingOpen(false);
    }
  };

  const handleUpdateProfile = (profile: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...profile };
      setUser(updatedUser);
      localStorage.setItem("glowguide_user", JSON.stringify(updatedUser));
    }
  };

  const handleUpdateTheme = (themeId: string, accent: string) => {
    if (user) {
      const updatedUser = { ...user, theme_id: themeId, theme_primary_color: accent, theme_secondary_color: accent };
      setUser(updatedUser);
      localStorage.setItem("glowguide_user", JSON.stringify(updatedUser));
    }
  };

  const handleUpdateRoutine = async (routine: RoutineProduct[]) => {
    if (user) {
      const updatedUser = { ...user, routine };
      setUser(updatedUser);
      localStorage.setItem("glowguide_user", JSON.stringify(updatedUser));
      await api.saveRoutine(user.id, routine);
    } else {
      // For anonymous users, we just update the local state which resets on refresh/session end
      // as per requirements.
      const mockUser = { id: 0, email: "anon", token: "", routine };
      setUser(mockUser as any);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("glowguide_user");
    setActiveTab("routine");
  };

  return (
    <div className="min-h-screen bg-theme-primary text-theme-secondary font-sans selection:bg-theme-secondary/20 selection:text-theme-secondary transition-colors duration-300">
      {!hasApiKey && (
        <div className="fixed inset-0 bg-theme-secondary/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-theme-primary border-2 border-theme-secondary/30 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-theme-secondary/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 text-theme-secondary" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-theme-secondary">API Key Required</h2>
            <p className="text-theme-secondary opacity-80 mb-8">
              To use the Gemini 3 models for skincare analysis, you need to select a valid API key from a paid Google Cloud project.
            </p>
            <div className="space-y-4">
              <button 
                onClick={handleSelectKey}
                className="w-full py-4 bg-theme-primary border border-theme-secondary text-theme-secondary rounded-2xl font-bold hover:bg-theme-secondary/5 transition-all shadow-sm"
              >
                Select API Key
              </button>
              <p className="text-xs text-theme-secondary opacity-50">
                Learn more about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline">Gemini API billing</a>.
              </p>
            </div>
          </div>
        </div>
      )}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />

      {user && (
        <OnboardingModal 
          isOpen={isOnboardingOpen} 
          user={user} 
          onComplete={handleOnboardingComplete} 
        />
      )}
      
      <main className="pt-16 pb-20">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <Home 
              key="home" 
              onStartRoutine={() => setActiveTab("routine")} 
              onLearnMore={() => setIsLearnMoreOpen(true)}
            />
          )}
          {activeTab === "routine" && <RoutineGenerator key="routine" user={user} />}
          {activeTab === "analyze" && (
            <IngredientAnalyzer 
              key="analyze" 
              user={user} 
              anonClientId={anonClientId} 
              setActiveTab={setActiveTab}
              onUpdateRoutine={handleUpdateRoutine}
              onLogin={handleLogin}
            />
          )}
          {activeTab === "compare" && <ProductComparator key="compare" user={user} />}
          {activeTab === "routine-builder" && (
            <RoutineBuilder 
              key="routine-builder" 
              user={user} 
              onUpdateRoutine={handleUpdateRoutine} 
              onLogin={handleLogin}
            />
          )}
          {activeTab === "dashboard" && (
            <Dashboard 
              key="dashboard" 
              user={user} 
              darkMode={darkMode} 
              onLogin={handleLogin} 
              onUpdateTheme={handleUpdateTheme} 
              onUpdateProfile={handleUpdateProfile}
              setActiveTab={setActiveTab}
            />
          )}
        </AnimatePresence>
      </main>

      <LearnMoreModal isOpen={isLearnMoreOpen} onClose={() => setIsLearnMoreOpen(false)} />
      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsConditionsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      <footer className="border-t-2 border-theme-secondary/20 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-theme-secondary/10 rounded flex items-center justify-center">
              <Sparkles className="text-theme-secondary opacity-50 w-4 h-4" />
            </div>
            <span className="font-semibold text-theme-secondary opacity-40">GlowGuide</span>
          </div>
          <div className="flex gap-8 text-sm text-theme-secondary opacity-50 font-medium">
            <button onClick={() => setIsPrivacyOpen(true)} className="hover:opacity-100 transition-colors cursor-pointer">Privacy Policy</button>
            <button onClick={() => setIsTermsOpen(true)} className="hover:opacity-100 transition-colors cursor-pointer">Terms of Service</button>
            <a href="mailto:support@glowguide.ai" className="hover:opacity-100 transition-colors">Contact</a>
          </div>
          <p className="text-sm text-theme-secondary opacity-40">© 2026 GlowGuide. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
