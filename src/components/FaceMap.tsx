import React, { useState } from "react";
import { Info, Sparkles, Droplet, Flame, AlertCircle, Award, ChevronDown, ChevronUp, Maximize2, X } from "lucide-react";
import { ZoneCondition, ZonesData, SkinLog } from "../types";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface FaceMapProps {
  zonesData: ZonesData;
  onChange: (zones: ZonesData) => void;
  darkMode?: boolean;
  historicalLogs?: SkinLog[];
  isPremium?: boolean;
  onUpgrade?: () => void;
}

const zoneLabels: Record<keyof ZonesData, string> = {
  forehead: "Forehead",
  nose: "Nose / T-Zone",
  leftCheek: "Left Cheek",
  rightCheek: "Right Cheek",
  chin: "Chin / Jawline",
};

export const defaultZoneCondition = (): ZoneCondition => ({
  acne: 1,
  oiliness: 2,
  dryness: 2,
  irritation: 1,
});

export const defaultZonesData = (): ZonesData => ({
  forehead: defaultZoneCondition(),
  nose: defaultZoneCondition(),
  leftCheek: defaultZoneCondition(),
  rightCheek: defaultZoneCondition(),
  chin: defaultZoneCondition(),
});

export const FaceMap: React.FC<FaceMapProps> = ({ 
  zonesData, 
  onChange, 
  darkMode,
  historicalLogs = [],
  isPremium = false,
  onUpgrade
}) => {
  const [selectedZone, setSelectedZone] = useState<keyof ZonesData>("forehead");
  const [isSparklineExpanded, setIsSparklineExpanded] = useState<boolean>(false);
  const [isChartMaximized, setIsChartMaximized] = useState<boolean>(false);

  const currentConditions = zonesData[selectedZone] || defaultZoneCondition();

  const handleUpdateCondition = (key: keyof ZoneCondition, val: number) => {
    const updatedZone = {
      ...currentConditions,
      [key]: val,
    };
    const updatedZones = {
      ...zonesData,
      [selectedZone]: updatedZone,
    };
    onChange(updatedZones);
  };

  // Backup conditions if no fine-grained zone data is stored
  const getBackupZoneCondition = (zoneKey: string, log: SkinLog): ZoneCondition => {
    if (zoneKey === "forehead") {
      return { acne: log.acne, oiliness: log.oiliness, dryness: log.dryness, irritation: log.irritation };
    }
    if (zoneKey === "nose") {
      return { acne: log.acne, oiliness: Math.min(10, log.oiliness * 1.2), dryness: log.dryness * 0.8, irritation: log.irritation };
    }
    if (zoneKey === "chin") {
      return { acne: Math.min(10, log.acne * 1.3), oiliness: log.oiliness, dryness: log.dryness, irritation: log.irritation };
    }
    return { acne: log.acne, oiliness: log.oiliness * 0.8, dryness: log.dryness * 1.1, irritation: log.irritation };
  };

  const getZoneCondition = (zoneKey: string, log: SkinLog): ZoneCondition => {
    let zones: any = null;
    if (log.zonesData) {
      zones = log.zonesData;
    } else if (log.zones_data) {
      try {
        zones = typeof log.zones_data === "string" 
          ? JSON.parse(log.zones_data) 
          : log.zones_data;
      } catch (e) {
        console.error("Error parsing historical zones data:", e);
      }
    }
    if (zones && zones[zoneKey]) {
      return zones[zoneKey];
    }
    return getBackupZoneCondition(zoneKey, log);
  };

  const sparklineData = React.useMemo(() => {
    if (!historicalLogs || historicalLogs.length === 0) return [];
    return historicalLogs
      .slice(0, 10)
      .reverse() // ordered Chronologically
      .map(log => {
        const cond = getZoneCondition(selectedZone, log);
        return {
          date: new Date(log.created_at || (log as any).createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
          acne: cond.acne,
          oiliness: cond.oiliness,
        };
      });
  }, [historicalLogs, selectedZone]);

  const detailedSparklineData = React.useMemo(() => {
    if (!historicalLogs || historicalLogs.length === 0) return [];
    return historicalLogs
      .slice(0, 10)
      .reverse() // ordered Chronologically
      .map(log => {
        const cond = getZoneCondition(selectedZone, log);
        return {
          date: new Date(log.created_at || (log as any).createdAt).toLocaleDateString([], { month: "short", day: "numeric" }),
          acne: cond.acne,
          oiliness: cond.oiliness,
          dryness: cond.dryness,
          irritation: cond.irritation,
        };
      });
  }, [historicalLogs, selectedZone]);

  const getZoneFillColor = (zoneKey: keyof ZonesData) => {
    const cond = zonesData[zoneKey] || defaultZoneCondition();
    const isSelected = selectedZone === zoneKey;

    // Retrieve highest severity condition
    const maxVal = Math.max(cond.acne, cond.irritation, cond.oiliness, cond.dryness);

    if (isSelected) {
      return "rgba(6, 182, 212, 0.4)"; // Cyan highlight for selected zone
    }

    if (maxVal <= 1.5) {
      return "rgba(148, 163, 184, 0.1)"; // Slate neutral for clear zone
    }

    // Determine color based on dominant factor
    if (cond.acne >= cond.irritation && cond.acne >= cond.oiliness && cond.acne >= cond.dryness) {
      return `rgba(239, 68, 68, ${0.15 + (cond.acne / 10) * 0.35})`; // Rose/Red for Acne
    }
    if (cond.irritation >= cond.acne && cond.irritation >= cond.oiliness && cond.irritation >= cond.dryness) {
      return `rgba(244, 63, 94, ${0.15 + (cond.irritation / 10) * 0.35})`; // Hot Pink for Irritation
    }
    if (cond.oiliness >= cond.acne && cond.oiliness >= cond.irritation && cond.oiliness >= cond.dryness) {
      return `rgba(245, 158, 11, ${0.15 + (cond.oiliness / 10) * 0.35})`; // Amber for Oiliness
    }
    return `rgba(16, 185, 129, ${0.15 + (cond.dryness / 10) * 0.35})`; // Emerald for dryness
  };

  return (
    <div id="face-map-container" className="flex flex-col md:flex-row items-center gap-6 p-4 bg-theme-secondary/5 rounded-2xl border border-theme-secondary/5 hover:border-theme-secondary/10 transition-all duration-300">
      
      {/* Visual Interactive SVG Map of the Face */}
      <div className="relative flex flex-col items-center">
        <span className="text-[10px] font-bold text-theme-secondary/40 uppercase tracking-widest mb-3">
          Interactive Head Map
        </span>
        
        <div className="relative w-40 h-48 flex items-center justify-center">
          <svg viewBox="0 0 200 240" className="w-full h-full filter drop-shadow-sm select-none">
            {/* Outline Contour of the general face */}
            <path 
              d="M 100,12 C 43,12 33,62 33,125 C 33,188 73,222 100,228 C 127,222 167,188 167,125 C 167,62 157,12 100,12 Z" 
              fill="none" 
              stroke="rgba(148, 163, 184, 0.15)" 
              strokeWidth="2" 
            />

            {/* Forehead */}
            <path 
              d="M 40,75 C 43,42 68,20 100,20 C 132,20 157,42 160,75 L 140,88 C 120,81 80,81 60,88 Z" 
              fill={getZoneFillColor("forehead")}
              stroke={selectedZone === "forehead" ? "rgba(6, 182, 212, 0.9)" : "rgba(148, 163, 184, 0.2)"}
              strokeWidth={selectedZone === "forehead" ? "2" : "1"}
              className="cursor-pointer transition-all duration-300 hover:opacity-90"
              onClick={() => setSelectedZone("forehead")}
            />

            {/* Nose */}
            <path 
              d="M 88,92 L 112,92 L 116,146 L 100,162 L 84,146 Z" 
              fill={getZoneFillColor("nose")}
              stroke={selectedZone === "nose" ? "rgba(6, 182, 212, 0.9)" : "rgba(148, 163, 184, 0.2)"}
              strokeWidth={selectedZone === "nose" ? "2" : "1"}
              className="cursor-pointer transition-all duration-300 hover:opacity-90"
              onClick={() => setSelectedZone("nose")}
            />

            {/* Left Cheek */}
            <path 
              d="M 37,85 C 35,115 42,150 63,172 L 80,172 L 85,145 L 85,92 L 60,88 Z" 
              fill={getZoneFillColor("leftCheek")}
              stroke={selectedZone === "leftCheek" ? "rgba(6, 182, 212, 0.9)" : "rgba(148, 163, 184, 0.2)"}
              strokeWidth={selectedZone === "leftCheek" ? "2" : "1"}
              className="cursor-pointer transition-all duration-300 hover:opacity-90"
              onClick={() => setSelectedZone("leftCheek")}
            />

            {/* Right Cheek */}
            <path 
              d="M 163,85 C 165,115 158,150 137,172 L 120,172 L 115,145 L 115,92 L 140,88 Z" 
              fill={getZoneFillColor("rightCheek")}
              stroke={selectedZone === "rightCheek" ? "rgba(6, 182, 212, 0.9)" : "rgba(148, 163, 184, 0.2)"}
              strokeWidth={selectedZone === "rightCheek" ? "2" : "1"}
              className="cursor-pointer transition-all duration-300 hover:opacity-90"
              onClick={() => setSelectedZone("rightCheek")}
            />

            {/* Chin */}
            <path 
              d="M 63,172 L 80,172 L 85,145 L 115,145 L 120,172 L 137,172 C 121,198 111,218 100,221 C 89,218 79,198 63,172 Z" 
              fill={getZoneFillColor("chin")}
              stroke={selectedZone === "chin" ? "rgba(6, 182, 212, 0.9)" : "rgba(148, 163, 184, 0.2)"}
              strokeWidth={selectedZone === "chin" ? "2" : "1"}
              className="cursor-pointer transition-all duration-300 hover:opacity-90"
              onClick={() => setSelectedZone("chin")}
            />
          </svg>
        </div>

        <span className="text-[10px] mt-2 font-semibold text-cyan-500 bg-cyan-500/10 px-2.5 py-0.5 rounded-full select-none">
          Active: {zoneLabels[selectedZone]}
        </span>
      </div>

      {/* Inputs / Sliders for current zone condition */}
      <div className="flex-1 w-full space-y-3.5">
        <div className="flex justify-between items-center pb-2 border-b border-theme-secondary/5">
          <span className="text-xs font-bold text-theme-secondary flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-500" />
            <span>Zone: {zoneLabels[selectedZone]}</span>
          </span>
          <span className="text-[10px] text-theme-secondary/50 font-medium">
            Touch map to change area
          </span>
        </div>

        {/* Collapsible Historical Sparkline Section (Collapsed by Default) */}
        <div className="relative overflow-hidden bg-theme-primary border border-theme-secondary/10 rounded-2xl p-3 flex flex-col gap-2 shadow-sm transition-all duration-300">
          <button
            type="button"
            onClick={() => setIsSparklineExpanded(!isSparklineExpanded)}
            className="flex items-center justify-between w-full hover:opacity-80 transition-opacity text-left focus:outline-none"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-accent flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> {zoneLabels[selectedZone]} Historical Trend
            </span>
            <div className="flex items-center gap-1 bg-theme-secondary/5 hover:bg-theme-secondary/10 px-2 py-0.5 rounded text-[10px] font-semibold text-theme-secondary">
              <span className="text-[9px] opacity-65">Last 10 Logs</span>
              {isSparklineExpanded ? <ChevronUp className="w-3.5 h-3.5 opacity-60" /> : <ChevronDown className="w-3.5 h-3.5 opacity-60" />}
            </div>
          </button>

          {isSparklineExpanded && (
            <div className="mt-1 space-y-2 animate-fadeIn">
              {!isPremium ? (
                <div className="relative h-14 w-full flex items-center justify-center rounded-xl bg-theme-secondary/5 border border-theme-secondary/5 select-none overflow-hidden mt-1">
                  <div className="absolute inset-0 filter blur-[3px] opacity-25 flex items-center justify-around px-4">
                    <div className="w-1/4 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-1/3 h-5 bg-amber-400 rounded-full"></div>
                    <div className="w-1/5 h-2 bg-red-400 rounded-full"></div>
                  </div>
                  <div className="relative z-10 flex flex-col items-center justify-center p-2 text-center bg-theme-primary/85 backdrop-blur-sm inset-0 absolute">
                    <span className="text-[9px] font-extrabold text-accent flex items-center gap-1 uppercase tracking-wider">
                      🔒 Pro Feature
                    </span>
                    <button 
                      type="button"
                      onClick={onUpgrade}
                      className="text-[9px] font-bold text-theme-secondary hover:text-accent transition-colors underline mt-0.5"
                    >
                      Unlock zone-specific historical sparklines
                    </button>
                  </div>
                </div>
              ) : !historicalLogs || historicalLogs.length <= 1 ? (
                <div className="h-14 flex items-center justify-center rounded-xl border border-dashed border-theme-secondary/10 bg-theme-secondary/5 text-[10px] text-theme-secondary/50 font-medium text-center">
                  Log more check-ins to build zone trends
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsChartMaximized(true);
                      }}
                      className="text-[9px] text-accent hover:underline flex items-center gap-1 font-bold bg-accent/5 hover:bg-accent/10 px-2 py-0.5 rounded-lg transition-all"
                    >
                      <Maximize2 className="w-3 h-3" /> Enlarge View
                    </button>
                  </div>
                  <div className="h-16 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={[0, 10]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--theme-primary)",
                            border: "1px solid rgba(var(--theme-secondary-rgb), 0.1)",
                            borderRadius: "12px",
                            fontSize: "9px",
                            padding: "4px 8px",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
                          }}
                          labelStyle={{ fontWeight: "bold", color: "var(--theme-secondary)" }}
                        />
                        <Line type="monotone" name="Acne" dataKey="acne" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 3.5 }} />
                        <Line type="monotone" name="Oiliness" dataKey="oiliness" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 3.5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-start gap-4 text-[9px] font-bold text-theme-secondary/50 pl-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-0.5 bg-[#ef4444] rounded" /> Acne
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-0.5 bg-[#f59e0b] rounded" /> Oiliness
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Breakdown Condition Sliders */}
        <div className="grid grid-cols-1 gap-2.5">
          {/* Acne */}
          <div className="bg-theme-secondary/5 rounded-xl p-2.5 border border-theme-secondary/5">
            <div className="flex justify-between items-center text-[11px] font-semibold text-theme-secondary mb-1">
              <span className="opacity-70 flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" /> Acne / Blemishes</span>
              <span className="font-bold text-red-500">{Math.round(currentConditions.acne * 10)}%</span>
            </div>
            <div className="relative flex items-center h-4">
              <div className="absolute left-0 right-0 h-1.5 bg-theme-secondary/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all duration-300" 
                  style={{ width: `${currentConditions.acne * 10}%` }}
                />
              </div>
              <input 
                type="range" 
                min="0" 
                max="10" 
                step="0.1"
                value={currentConditions.acne}
                onChange={e => handleUpdateCondition("acne", parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-auto z-10"
              />
            </div>
          </div>

          {/* Oiliness */}
          <div className="bg-theme-secondary/5 rounded-xl p-2.5 border border-theme-secondary/5">
            <div className="flex justify-between items-center text-[11px] font-semibold text-theme-secondary mb-1">
              <span className="opacity-70 flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-500" /> Oiliness</span>
              <span className="font-bold text-amber-500">{Math.round(currentConditions.oiliness * 10)}%</span>
            </div>
            <div className="relative flex items-center h-4">
              <div className="absolute left-0 right-0 h-1.5 bg-theme-secondary/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-300" 
                  style={{ width: `${currentConditions.oiliness * 10}%` }}
                />
              </div>
              <input 
                type="range" 
                min="0" 
                max="10" 
                step="0.1"
                value={currentConditions.oiliness}
                onChange={e => handleUpdateCondition("oiliness", parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-auto z-10"
              />
            </div>
          </div>

          {/* Dryness */}
          <div className="bg-theme-secondary/5 rounded-xl p-2.5 border border-theme-secondary/5">
            <div className="flex justify-between items-center text-[11px] font-semibold text-theme-secondary mb-1">
              <span className="opacity-70 flex items-center gap-1"><Droplet className="w-3 h-3 text-emerald-500" /> Dryness</span>
              <span className="font-bold text-emerald-500">{Math.round(currentConditions.dryness * 10)}%</span>
            </div>
            <div className="relative flex items-center h-4">
              <div className="absolute left-0 right-0 h-1.5 bg-theme-secondary/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                  style={{ width: `${currentConditions.dryness * 10}%` }}
                />
              </div>
              <input 
                type="range" 
                min="0" 
                max="10" 
                step="0.1"
                value={currentConditions.dryness}
                onChange={e => handleUpdateCondition("dryness", parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-auto z-10"
              />
            </div>
          </div>

          {/* Irritation */}
          <div className="bg-theme-secondary/5 rounded-xl p-2.5 border border-theme-secondary/5">
            <div className="flex justify-between items-center text-[11px] font-semibold text-theme-secondary mb-1">
              <span className="opacity-70 flex items-center gap-1"><Flame className="w-3 h-3 text-rose-400" /> Irritation / Redness</span>
              <span className="font-bold text-rose-400">{Math.round(currentConditions.irritation * 10)}%</span>
            </div>
            <div className="relative flex items-center h-4">
              <div className="absolute left-0 right-0 h-1.5 bg-theme-secondary/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-400 rounded-full transition-all duration-300" 
                  style={{ width: `${currentConditions.irritation * 10}%` }}
                />
              </div>
              <input 
                type="range" 
                min="0" 
                max="10" 
                step="0.1"
                value={currentConditions.irritation}
                onChange={e => handleUpdateCondition("irritation", parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-auto z-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Maximized Detailed Historical Chart Modal (Premium Feature) */}
      {isChartMaximized && isPremium && (
        <div id="enlarged-zone-trend-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with elegant blur */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsChartMaximized(false)}
          />
          {/* Modal Card */}
          <div className="relative bg-theme-primary border-2 border-theme-secondary/10 rounded-[32px] p-6 max-w-2xl w-full shadow-2xl flex flex-col gap-4 animate-scaleUp text-theme-secondary">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-theme-secondary/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-accent/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5 text-accent animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-theme-secondary tracking-tight">
                    {zoneLabels[selectedZone]} Detailed Trend Analysis
                  </h3>
                  <p className="text-[10px] text-theme-secondary/60 uppercase tracking-wider font-semibold">
                    Comprehensive localized history of all conditions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChartMaximized(false)}
                className="p-2 hover:bg-theme-secondary/10 rounded-full text-theme-secondary/60 hover:text-theme-secondary transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Analysis text */}
            <p className="text-xs text-theme-secondary/70 leading-relaxed">
              Tracking individual dermatological components on your <span className="font-semibold text-accent">{zoneLabels[selectedZone]}</span>. This high-resolution temporal model lists standard deviations across your last 10 logged skin states to help isolate product triggers.
            </p>

            {/* The Expanded Chart View */}
            <div className="h-72 w-full mt-2 bg-theme-secondary/5 rounded-2xl p-4 border border-theme-secondary/5">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={detailedSparklineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--theme-secondary)', opacity: 0.5, fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 10]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--theme-secondary)', opacity: 0.5, fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--theme-primary)', 
                      border: '1px solid rgba(var(--theme-secondary-rgb), 0.1)',
                      borderRadius: '16px',
                      fontSize: '11px',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}
                    itemStyle={{ fontWeight: '600' }}
                  />
                  <Line type="monotone" name="Acne" dataKey="acne" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Oiliness" dataKey="oiliness" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" name="Dryness" dataKey="dryness" stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3 }} />
                  <Line type="monotone" name="Irritation" dataKey="irritation" stroke="#fb7185" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legends */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-2 text-xs font-bold text-theme-secondary/70">
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-1 bg-[#ef4444] rounded"></span> Acne / Blemishes
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-1 bg-[#f59e0b] rounded"></span> Oiliness
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#10b981]"></span> Dryness
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#fb7185]"></span> Irritation / Redness
              </span>
            </div>

            {/* Actionable tip */}
            <div className="mt-2 p-3.5 bg-accent/5 rounded-2xl border border-accent/10 flex items-start gap-2.5 text-xs text-theme-secondary/80 leading-relaxed">
              <span className="text-base text-accent">💡</span>
              <div>
                <span className="font-bold text-accent">Pro Zone Analysis:</span>{" "}
                Comparing levels enables pinpointing of acne triggers. For example, high oiliness + low acne suggests harmless moisture, while spikes in both point to comedogenic product blockages.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
