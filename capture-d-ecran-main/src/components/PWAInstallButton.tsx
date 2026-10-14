import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'full') {
      return (
        <button
          onClick={install}
          className={`flex items-center justify-between w-full p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg shadow-indigo-600/20 hover:from-blue-500 hover:to-indigo-500 transition active:scale-[0.98] ${className}`}
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">Installer l'application Android</p>
              <p className="text-xs text-blue-100">Bouton flottant système &amp; accès hors-ligne</p>
            </div>
          </div>
          <span className="text-xs bg-white text-blue-700 font-bold px-3 py-1.5 rounded-xl shadow-sm">
            Installer
          </span>
        </button>
      );
    }

    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:brightness-110 active:scale-95 transition ${className}`}
        title="Installer ScreenDroid sur votre appareil"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer l'app</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          <span>Installer sur mobile</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                  Installer sur votre appareil
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                Pour utiliser ScreenDroid en plein écran comme une vraie application :
              </p>
              <ol className="text-xs text-slate-300 space-y-2.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                  <span>Touchez le bouton <strong>Partager</strong> dans la barre du navigateur.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                  <span>Faites défiler vers le bas et sélectionnez <strong>Sur l'écran d'accueil</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">3</span>
                  <span>Appuyez sur <strong>Ajouter</strong> en haut à droite.</span>
                </li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
