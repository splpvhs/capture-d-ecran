import React, { useState } from 'react';
import {
  Smartphone,
  X,
  Code2,
  FolderGit2,
  Terminal,
  Check,
  Copy,
  Layers,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Cpu,
  PlayCircle,
  FileCode,
} from 'lucide-react';

interface AndroidStudioGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidStudioGuideModal: React.FC<AndroidStudioGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 select-none animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                Compiler pour Android (Bouton flottant sur toutes les apps)
              </h3>
              <p className="text-xs text-slate-400">Guide GitHub → VS Code → Android Studio → Smartphone APK</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-200">
          {/* Native Overlay Explanation */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-950 to-indigo-950/40 border border-indigo-500/40 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Pourquoi passer par Android Studio ?</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Dans un navigateur web (Chrome/PWA), Android interdit à un site d'afficher un bouton par-dessus d'autres applications par sécurité.
              Le projet natif <strong>Capacitor / Android Studio</strong> que nous avons généré inclut la permission <code>SYSTEM_ALERT_WINDOW</code> et le service <code>FloatingWidgetService.java</code> : le bouton REC reste affiché en permanence sur votre smartphone (sur WhatsApp, YouTube, jeux, écran d'accueil) et se masque automatiquement lors des captures !
            </p>
          </div>

          {/* STEP 1 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white flex items-center gap-2 text-xs">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Récupérer le code sur GitHub &amp; Ouvrir dans VS Code</span>
              </h4>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px]">
              <p className="text-slate-400">Clonez votre dépôt depuis GitHub dans votre terminal ou invite de commande :</p>
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg text-emerald-400">
                <code>git clone &lt;URL_DE_VOTRE_DEPOT_GITHUB&gt;</code>
                <button
                  onClick={() => copyToClipboard('git clone <URL_DE_VOTRE_DEPOT_GITHUB>', 1)}
                  className="p-1 hover:text-white"
                >
                  {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-slate-400">Puis ouvrez le dossier dans VS Code :</p>
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg text-emerald-400">
                <code>code .</code>
                <button
                  onClick={() => copyToClipboard('code .', 2)}
                  className="p-1 hover:text-white"
                >
                  {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Installer les dépendances et synchroniser Capacitor</span>
            </h4>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px]">
              <p className="text-slate-400">Dans le terminal intégré de VS Code (Ctrl + `), lancez :</p>
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg text-emerald-400">
                <code>npm install &amp;&amp; npm run build &amp;&amp; npx cap sync android</code>
                <button
                  onClick={() => copyToClipboard('npm install && npm run build && npx cap sync android', 3)}
                  className="p-1 hover:text-white"
                >
                  {copiedIndex === 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-slate-400">Cette commande compile l'application web et met à jour le dossier <code>android/</code> avec toutes les fonctionnalités.</p>
            </div>
          </div>

          {/* STEP 3 */}
          <div className="space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Ouvrir le projet dans Android Studio</span>
            </h4>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px]">
              <p className="text-slate-400">Pour lancer automatiquement Android Studio sur le projet :</p>
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg text-emerald-400">
                <code>npx cap open android</code>
                <button
                  onClick={() => copyToClipboard('npx cap open android', 4)}
                  className="p-1 hover:text-white"
                >
                  {copiedIndex === 4 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-slate-400">Ou ouvrez manuellement Android Studio et cliquez sur <strong>Open an existing project</strong>, puis sélectionnez le dossier <code>android</code>.</p>
            </div>
          </div>

          {/* STEP 4 */}
          <div className="space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">4</span>
              <span>Compiler et installer sur votre smartphone Android</span>
            </h4>
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-slate-300">
              <ul className="space-y-2 list-disc list-inside text-[11px] text-slate-300">
                <li>
                  <strong>Brancher votre smartphone</strong> par câble USB à votre PC et activer le <strong>Débogage USB</strong> dans les <em>Options de développement</em> d'Android.
                </li>
                <li>
                  Dans Android Studio, votre smartphone apparaît dans la barre d'outils en haut. Cliquez simplement sur le bouton vert <strong>Run (▶)</strong>.
                </li>
                <li>
                  <strong>Ou pour générer un fichier APK</strong> : Allez dans le menu <code>Build</code> → <code>Build Bundle(s) / APK(s)</code> → <code>Build APK(s)</code>. L'APK généré peut être copié directement sur n'importe quel smartphone Android !
                </li>
              </ul>
            </div>
          </div>

          {/* Verification info */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              Fichiers déjà prêts dans votre code source :
            </p>
            <p>• <code>android/app/src/main/AndroidManifest.xml</code> (Permissions overlay &amp; screen recording)</p>
            <p>• <code>android/app/src/main/java/com/screendroid/capture/FloatingWidgetService.java</code> (Bouton flottant natif déplaçable au doigt et invisible lors des captures)</p>
            <p>• <code>capacitor.config.json</code> (Configuration Capacitor Android)</p>
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
