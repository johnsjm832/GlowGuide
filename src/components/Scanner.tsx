import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Loader2, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isReady, setIsReady] = useState(false);
  const scannerId = "barcode-scanner-container";

  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      scannerId,
      { 
        fps: 10, 
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION
        ]
      },
      /* verbose= */ false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        // Success
        console.log("Barcode detected:", decodedText);
        onScan(decodedText);
        scanner.clear();
      },
      (errorMessage) => {
        // Silently handle errors (scanning)
      }
    );

    setIsReady(true);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => {
          console.error("Failed to clear scanner on unmount", err);
        });
      }
    };
  }, [onScan]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-theme-secondary/80 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-lg bg-theme-primary rounded-3xl shadow-2xl overflow-hidden border-2 border-theme-secondary/10"
      >
        <div className="p-6 border-b border-theme-secondary/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <Scan className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-theme-secondary">Scan Barcode</h3>
              <p className="text-xs text-theme-secondary opacity-50">Point your camera at the product label</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-secondary/5 rounded-xl transition-colors text-theme-secondary opacity-50 hover:opacity-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div 
            id={scannerId} 
            className="w-full aspect-square bg-black/5 rounded-2xl overflow-hidden border-2 border-dashed border-theme-secondary/20 relative"
          >
            {!isReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-theme-primary/50">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
            )}
          </div>
          
          <div className="mt-6 flex items-center gap-4 p-4 bg-accent/5 rounded-2xl border border-accent/10">
            <Camera className="w-5 h-5 text-accent shrink-0" />
            <p className="text-xs text-theme-secondary/70 leading-relaxed">
              Ensure you have good lighting and the barcode is flat. We support EAN and UPC common product barcodes.
            </p>
          </div>
        </div>

        <div className="p-6 bg-theme-secondary/5 border-t border-theme-secondary/10">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-bold text-theme-secondary/60 hover:text-theme-secondary transition-colors"
          >
            Cancel and use manual input
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Scanner;
