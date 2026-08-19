'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Zap } from 'lucide-react';
import type { IScannerControls } from '@zxing/browser';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let rafId: number;
    let zxingControls: IScannerControls | null = null;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (typeof window !== 'undefined' && window.BarcodeDetector) {
          const detector = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
          });

          const tick = async () => {
            if (cancelled || detectedRef.current || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0 && codes[0]) {
                detectedRef.current = true;
                onDetected(codes[0].rawValue);
                return;
              }
            } catch {
              // transient decode error — keep scanning
            }
            rafId = requestAnimationFrame(tick);
          };
          rafId = requestAnimationFrame(tick);
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          const zxingReader = new BrowserMultiFormatReader();
          if (videoRef.current) {
            zxingControls = await zxingReader.decodeFromVideoElement(videoRef.current, (result) => {
              if (result && !detectedRef.current) {
                detectedRef.current = true;
                onDetected(result.getText());
              }
            });
            if (cancelled) zxingControls.stop();
          }
        }
      } catch {
        if (!cancelled) setError('Camera access denied. Allow camera permission to scan barcodes.');
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      zxingControls?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pt-safe-top pt-4">
        <div className="flex items-center gap-2 text-white">
          <Zap className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Scan barcode</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close scanner"
          className="flex h-tap w-tap items-center justify-center rounded-full bg-white/10 transition active:scale-[0.98]"
        >
          <X className="h-6 w-6 text-white" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-72 rounded-2xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
        </div>
        {error && (
          <div className="absolute inset-x-6 bottom-24 rounded-xl bg-danger/90 px-4 py-3 text-center text-sm text-white">
            {error}
          </div>
        )}
      </div>

      <p className="pb-safe-bottom px-6 pb-8 pt-4 text-center text-sm text-white/70">
        Hold steady over the barcode
      </p>
    </div>
  );
}
