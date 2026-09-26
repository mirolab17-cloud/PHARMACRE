import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { sounds } from '../utils/audio';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-reader-viewport';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // فحص الكاميرات المتاحة
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // تفضيل الكاميرا الخلفية إن وجدت
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('خلفية')
          );
          const defaultCamId = backCam ? backCam.id : devices[devices.length - 1].id;
          setSelectedCameraId(defaultCamId);
          startScanner(defaultCamId);
        } else {
          setErrorMsg('لم يتم العثور على كاميرا في هذا الجهاز');
        }
      })
      .catch(err => {
        console.warn('Camera access issue:', err);
        setErrorMsg('يرجى منح صلاحية استخدام الكاميرا لمسح الباركود');
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async (cameraId: string) => {
    try {
      setErrorMsg(null);
      if (html5QrCodeRef.current && isScanning) {
        await stopScanner();
      }

      const scanner = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          sounds.playScanBeep();
          onScan(decodedText);
          stopScanner();
          onClose();
        },
        () => {
          // ignore transient frame decode misses
        }
      );

      setIsScanning(true);
    } catch (err: unknown) {
      console.error('فشل تشغيل ماسح الكاميرا:', err);
      setErrorMsg('تعذر تشغيل الكاميرا. يمكنك إدخال الباركود يدوياً في الأسفل.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      sounds.playScanBeep();
      onScan(manualCode.trim());
      stopScanner();
      onClose();
      setManualCode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-sky-600 px-4 py-3 text-white dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <h3 className="font-bold text-base">مسح باركود الدواء بالكاميرا</h3>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Camera Viewport */}
          <div className="relative overflow-hidden rounded-xl bg-slate-950 border-2 border-dashed border-sky-400/40 min-h-[220px] flex items-center justify-center">
            <div id={scannerContainerId} className="w-full h-full" />
            
            {/* Guide overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-28 w-56 rounded-lg border-2 border-sky-400 bg-sky-500/10 shadow-[0_0_15px_rgba(56,189,248,0.4)]"></div>
            </div>
          </div>

          {/* Switch Camera */}
          {cameras.length > 1 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">تبديل الكاميرا:</span>
              <select
                value={selectedCameraId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedCameraId(newId);
                  startScanner(newId);
                }}
                className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {cameras.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.label || `كاميرا ${c.id.substring(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Manual Barcode fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              أو اكتب رقم الباركود يدوياً:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="أدخل رقم الباركود..."
                dir="ltr"
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white text-center font-mono"
              />
              <button
                type="submit"
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
              >
                تأكيد
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
