import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  X,
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface AndroidInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallGuideModal: React.FC<AndroidInstallGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const sharedAppUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-j7kbt3yvytvwyfk5kynuwm-87925596891.europe-west2.run.app';

  useEffect(() => {
    if (isOpen && sharedAppUrl) {
      QRCode.toDataURL(sharedAppUrl, {
        width: 240,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.warn('QR code generation error:', err));
    }
  }, [isOpen, sharedAppUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharedAppUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                Installer sur Android
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  100% Compatible
                </span>
              </h3>
              <p className="text-xs text-slate-400">Application PWA native sans passer par le Play Store</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-200 text-xs">
          {/* QR Code Quick Scan for Smartphone */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            {qrDataUrl ? (
              <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
                <img src={qrDataUrl} alt="QR Code ScreenDroid" className="w-28 h-28 object-contain" />
              </div>
            ) : (
              <div className="w-28 h-28 bg-slate-800 animate-pulse rounded-xl" />
            )}

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-indigo-400 font-bold">
                <QrCode className="w-4 h-4" />
                <span>Scannez avec votre appareil photo Android</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Pointez l'appareil photo de votre smartphone Android sur ce QR code pour ouvrir immédiatement l'application.
              </p>

              <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Lien copié !' : 'Copier le lien'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Installation Steps */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400">
              Guide d'installation pas-à-pas sur Android :
            </h4>

            <div className="space-y-2.5">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-white text-xs">Ouvrez le lien dans Google Chrome ou Samsung Internet</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Utilisez le navigateur par défaut de votre smartphone Android (Google Chrome ou Samsung Internet fonctionnent parfaitement).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-white text-xs">Appuyez sur "Installer l'application"</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Cliquez sur le bouton bleu <strong>"Installer l'app"</strong> en haut de l'écran, ou ouvrez le menu Chrome <strong>(les 3 points verticaux ⋮ en haut à droite)</strong> et choisissez <strong>"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong>.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-bold text-white text-xs">Validez l'installation</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Android va générer l'icône de l'application directement dans votre tiroir d'applications et sur votre écran d'accueil avec son icône ScreenDroid haute définition.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <p className="font-bold text-white text-xs">Testez la capture et le bouton flottant</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Ouvrez ScreenDroid depuis votre écran d'accueil. Appuyez sur le bouton flottant : Android vous demandera confirmation via sa boîte de dialogue système <em>"Enregistrer ou diffuser l'écran ?"</em>. Choisissez <strong>"Tout l'écran"</strong> puis validez !
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Android Screen Share Note */}
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-indigo-300/90 leading-relaxed">
              <strong>À propos de l'invisibilité :</strong> Le bouton flottant se déplace fluidement sous vos doigts et disparaît automatiquement au centième de seconde près lors de la prise de vue pour que vos captures d'écran restent impeccables.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 active:scale-95"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  );
};
