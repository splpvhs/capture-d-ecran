import React from 'react';
import { Camera, Image as ImageIcon, Settings } from 'lucide-react';
import { ActiveTab } from '../types';

interface AndroidNavBarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  mediaCount: number;
}

export const AndroidNavBar: React.FC<AndroidNavBarProps> = ({
  activeTab,
  onChangeTab,
  mediaCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 pb-[max(env(safe-area-inset-bottom),8px)]">
      <div className="max-w-md mx-auto px-6 pt-2 pb-1 flex items-center justify-around">
        {/* Studio / Capture Tab */}
        <button
          onClick={() => onChangeTab('studio')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all ${
            activeTab === 'studio'
              ? 'text-indigo-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-full transition-all ${
              activeTab === 'studio' ? 'bg-indigo-500/20 ring-1 ring-indigo-500/40' : ''
            }`}
          >
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight">Capture</span>
        </button>

        {/* Gallery Tab */}
        <button
          onClick={() => onChangeTab('gallery')}
          className={`relative flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all ${
            activeTab === 'gallery'
              ? 'text-indigo-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-full transition-all relative ${
              activeTab === 'gallery' ? 'bg-indigo-500/20 ring-1 ring-indigo-500/40' : ''
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            {mediaCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                {mediaCount > 99 ? '99+' : mediaCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-tight">Galerie</span>
        </button>

        {/* Settings Tab */}
        <button
          onClick={() => onChangeTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all ${
            activeTab === 'settings'
              ? 'text-indigo-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-full transition-all ${
              activeTab === 'settings' ? 'bg-indigo-500/20 ring-1 ring-indigo-500/40' : ''
            }`}
          >
            <Settings className="w-5 h-5" />
          </div>
          <span className="text-[11px] tracking-tight">Paramètres</span>
        </button>
      </div>

      {/* Android System Home Pill indicator */}
      <div className="w-32 h-1 bg-slate-700/60 rounded-full mx-auto mt-1 mb-0.5" />
    </nav>
  );
};
