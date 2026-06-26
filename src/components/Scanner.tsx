import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, Clock, ChevronRight } from 'lucide-react';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

interface RecentScanItem {
  barcode: string;
  name: string;
  brandText?: string;
  imageUrl?: string | null;
  timestamp: number;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = "reader";

  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  useEffect(() => {
    const stored = localStorage.getItem('skinlog_recent_scans');
    let list: RecentScanItem[] = [];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    
    // If empty, pre-populate with high quality real cosmetics examples to guide and test
    if (list.length === 0) {
      list = [
        {
          barcode: "8809660338341",
          name: "Advanced Snail 96 Mucin Power Essence",
          brandText: "COSRX",
          timestamp: Date.now() - 3600000 * 2,
        },
        {
          barcode: "3506308001801",
          name: "Sensibio H2O Micellar Water",
          brandText: "Bioderma",
          timestamp: Date.now() - 3600000 * 24,
        },
        {
          barcode: "3337875597366",
          name: "Effaclar Duo+ Acne Treatment",
          brandText: "La Roche-Posay",
          timestamp: Date.now() - 3600000 * 48,
        }
      ];
      localStorage.setItem('skinlog_recent_scans', JSON.stringify(list));
    }
    setRecentScans(list);
  }, []);

  const saveRecentScan = async (barcode: string) => {
    try {
      const stored = localStorage.getItem('skinlog_recent_scans');
      let list: RecentScanItem[] = stored ? JSON.parse(stored) : [];
      
      const existingIdx = list.findIndex(item => item.barcode === barcode);
      if (existingIdx > -1) {
        const existingItem = list[existingIdx];
        list.splice(existingIdx, 1);
        list.unshift({
          ...existingItem,
          timestamp: Date.now()
        });
      } else {
        const tempItem: RecentScanItem = {
          barcode,
          name: `Product ${barcode}`,
          brandText: 'Scanning...',
          timestamp: Date.now()
        };
        list.unshift(tempItem);
        
        // Fetch beauty API details asynchronously to replace temporary values
        import('../services/beautyService').then(async ({ fetchProductByBarcode }) => {
          const fetched = await fetchProductByBarcode(barcode);
          const reStored = localStorage.getItem('skinlog_recent_scans');
          let reList: RecentScanItem[] = reStored ? JSON.parse(reStored) : [];
          const idx = reList.findIndex(item => item.barcode === barcode);
          if (idx > -1) {
            if (fetched) {
              reList[idx] = {
                barcode,
                name: fetched.name || 'Unknown Product',
                brandText: fetched.brand || 'Unknown Brand',
                imageUrl: fetched.imageUrl || null,
                timestamp: Date.now()
              };
            } else {
              reList[idx] = {
                barcode,
                name: `Product #${barcode}`,
                brandText: 'Not Found',
                imageUrl: null,
                timestamp: Date.now()
              };
            }
            localStorage.setItem('skinlog_recent_scans', JSON.stringify(reList));
            setRecentScans(reList);
          }
        }).catch(err => console.error("Async load products error:", err));
      }
      
      localStorage.setItem('skinlog_recent_scans', JSON.stringify(list.slice(0, 10)));
      setRecentScans(list);
    } catch (err) {
      console.error("Failed to save scanned barcode", err);
    }
  };

  const playSuccessSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      // Beautiful warm dual-tone minor/major harmonic chord (A5 and C#6)
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc2.frequency.setValueAtTime(1108.73, ctx.currentTime); // C#6
      
      // Quick sweet attack and smooth decay
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02); // gentle volume
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3); // swift fade-out
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (err) {
      console.warn("AudioContext failed to play sound:", err);
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    // Soft dual-pulse vibration if supported
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate([50, 45, 50]);
      } catch (e) {
        // Safe fallback if permission or support is blocked in frame
      }
    }
    
    playSuccessSound();
    saveRecentScan(barcode);
    onScanSuccessRef.current(barcode);
  };

  const handleSelectRecent = (barcode: string) => {
    // Single subtle haptic click
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(35);
      } catch (e) {}
    }
    
    playSuccessSound();
    saveRecentScan(barcode);
    onScanSuccessRef.current(barcode);
  };

  const clearRecentScans = () => {
    localStorage.removeItem('skinlog_recent_scans');
    setRecentScans([]);
  };

  useEffect(() => {
    scannerRef.current = new Html5Qrcode(regionId);

    const startScanner = async () => {
      try {
        setIsScanning(true);
        const readerEl = document.getElementById(regionId);
        const containerWidth = readerEl?.clientWidth || 300;
        const containerHeight = readerEl?.clientHeight || 300;
        const boxWidth = Math.min(260, containerWidth - 40);
        const boxHeight = Math.min(150, Math.floor(boxWidth * 0.55));

        await scannerRef.current?.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: boxWidth, height: boxHeight },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
            ]
          },
          (decodedText) => {
            if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
              try {
                window.navigator.vibrate([50, 45, 50]);
              } catch (e) {}
            }
            playSuccessSound();
            saveRecentScan(decodedText);
            onScanSuccessRef.current(decodedText);
          },
          (errorMessage) => {
            // Silently handle scan failures (happens every frame if no barcode)
          }
        );
      } catch (err) {
        console.error("Scanner start error:", err);
        setError("Could not start camera. Please ensure you have given permission.");
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Scanner stop error:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-zinc-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-4">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-gradient-to-b from-zinc-900/90 via-zinc-900/95 to-zinc-950/98 rounded-[32px] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8),_0_0_40px_-10px_rgba(var(--accent-rgb,132,165,137),0.15)] border border-white/10 flex flex-col transition-all duration-300 relative">
        <div className="p-5 flex items-center justify-between border-b border-white/5 relative z-10 bg-zinc-900/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent animate-pulse">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black text-accent uppercase tracking-[0.2em] leading-none mb-1">Live Feed</p>
              <h3 className="text-sm font-bold text-white tracking-tight">Barcode Identifier</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-white/5 active:bg-white/10 rounded-full transition-all text-white/50 hover:text-white border border-transparent hover:border-white/5"
            aria-label="Close scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative aspect-square sm:aspect-video bg-black flex items-center justify-center overflow-visible">
          <div id={regionId} className="w-full h-full relative z-0"></div>
          
          {!isScanning && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 gap-3">
              <RefreshCw className="w-6 h-6 text-accent animate-spin" />
              <span className="text-xs font-semibold text-white/40 tracking-wider uppercase">Awakening Camera...</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/95 backdrop-blur-md z-20">
              <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-4 border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                <X className="w-7 h-7 text-rose-500" />
              </div>
              <p className="text-sm text-white/80 font-semibold mb-6 max-w-xs leading-relaxed">{error}</p>
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold hover:shadow-lg transition-all border border-white/5"
              >
                Go Back
              </button>
            </div>
          )}

          {isScanning && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              {/* Animated HUD Grid overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Viewfinder Target Zone */}
              <div className="relative w-[260px] h-[160px]">
                {/* Outliner aura */}
                <div className="absolute -inset-1 rounded-xl bg-accent/5 blur-sm animate-pulse" />
                
                {/* Viewfinder background */}
                <div className="absolute inset-0 border border-accent/20 rounded-xl bg-accent/[0.02]" />

                {/* Cyberpunk corner notches - enlarged white borders */}
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-lg" />

                {/* Sub-notch accents */}
                <div className="absolute top-1/2 left-0 w-1.5 h-3 bg-accent/65 -translate-y-1/2 -translate-x-[1.5px] rounded-r" />
                <div className="absolute top-1/2 right-0 w-1.5 h-3 bg-accent/65 -translate-y-1/2 translate-x-[1.5px] rounded-l" />

                {/* Futuristic Laser Guide Lines */}
                <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_12px_rgba(var(--accent-rgb,132,165,137),0.8)] animate-scan" />
              </div>

              {/* Central crosshair target dot */}
              <div className="absolute w-2 h-2 rounded-full bg-accent/80 shadow-[0_0_8px_rgba(var(--accent-rgb,132,165,137),0.6)] animate-ping" />
            </div>
          )}
        </div>

        <div className="py-3 px-5 text-center bg-zinc-900/50 backdrop-blur-sm border-b border-white/5">
          <p className="text-[11px] text-white/50 font-medium leading-normal tracking-wide flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Center product barcode inside the glowing viewfinder to scan
          </p>
        </div>

        {/* Recent Scans Section */}
        <div className="bg-zinc-950 p-6 flex-1 overflow-hidden flex flex-col relative">
          <div className="flex items-center justify-between mb-3.5 shrink-0 z-10">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-accent/80" /> Recent Scans
            </span>
            {recentScans.length > 0 && (
              <button 
                onClick={clearRecentScans}
                className="text-[10px] font-bold text-white/30 hover:text-rose-400 active:scale-95 transition-all uppercase tracking-wider"
              >
                Clear History
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[140px] max-h-[220px] pb-1 z-10">
            {recentScans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-xs text-white/20 font-medium">No previous scans found</p>
                <p className="text-[10px] text-white/10 mt-1 max-w-[200px] leading-relaxed">Your barcode history will appear here for fast recheck.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentScans.map((item, index) => (
                  <button
                    key={`${item.barcode}-${index}`}
                    onClick={() => handleSelectRecent(item.barcode)}
                    className="w-full text-left p-3.5 bg-gradient-to-r from-white/[0.02] to-white/[0.04] hover:from-white/[0.06] hover:to-white/[0.08] active:from-white/[0.03] active:to-white/[0.05] rounded-2xl border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300 flex items-center justify-between group h-[64px]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-accent/5 border border-accent/15 flex items-center justify-center text-accent shrink-0 font-bold text-[11px] tracking-wide uppercase transition-transform group-hover:scale-105 duration-300">
                        {item.brandText && item.brandText !== 'Scanning...' ? item.brandText.substring(0, 2) : 'PR'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {item.brandText && (
                            <span className="text-[9px] font-extrabold text-accent uppercase tracking-[0.1em] shrink-0 bg-accent/5 border border-accent/10 px-2 py-0.5 rounded-md leading-none">
                              {item.brandText}
                            </span>
                          )}
                          <span className="text-[10px] text-white/25 font-mono truncate leading-none">
                            #{item.barcode}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-white/85 truncate mt-1.5 leading-tight">
                          {item.name}
                        </p>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/30 group-hover:text-accent group-hover:border-accent/20 group-hover:translate-x-0.5 transition-all duration-300">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0%, 100% { transform: translateY(-80px); }
          50% { transform: translateY(80px); }
        }
        .animate-scan {
          animation: scan 2.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          width: 260px;
          margin: 0 auto;
        }
        #reader {
          background-color: black !important;
        }
        #reader video {
          object-fit: cover !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.01);
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
};
