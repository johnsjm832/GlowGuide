import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw } from 'lucide-react';

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = "reader";

  useEffect(() => {
    scannerRef.current = new Html5Qrcode(regionId);

    const startScanner = async () => {
      try {
        setIsScanning(true);
        await scannerRef.current?.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
            ]
          },
          (decodedText) => {
            onScanSuccess(decodedText);
            stopScanner();
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
  }, [onScanSuccess]);

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
    <div className="fixed inset-0 z-[110] bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-accent" />
            <span className="text-sm font-bold text-white uppercase tracking-widest">Barcode Scanner</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/50 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-square sm:aspect-video bg-black flex items-center justify-center">
          <div id={regionId} className="w-full h-full"></div>
          
          {!isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-white/20 animate-spin" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
                <X className="w-6 h-6 text-rose-500" />
              </div>
              <p className="text-sm text-white/70 font-medium mb-6">{error}</p>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 transition-all"
              >
                Go Back
              </button>
            </div>
          )}

          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Scan box indicators */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[150px] border-2 border-accent rounded-lg">
                <div className="absolute inset-0 animate-pulse bg-accent/5"></div>
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -translate-x-1 -translate-y-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white translate-x-1 -translate-y-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -translate-x-1 translate-y-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white translate-x-1 translate-y-1"></div>
              </div>
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-accent/30 animate-scan"></div>
            </div>
          )}
        </div>

        <div className="p-6 text-center">
          <p className="text-xs text-white/40 font-medium leading-relaxed">
            Align the barcode within the frame to automatically scan ingredients.
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0%, 100% { transform: translateY(-75px); }
          50% { transform: translateY(75px); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
          width: 250px;
          margin: 0 auto;
        }
        #reader {
          background-color: black !important;
        }
        #reader video {
          object-fit: cover !important;
        }
      `}} />
    </div>
  );
};
