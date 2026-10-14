import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Film,
  Camera,
  Play,
  Edit3,
  Download,
  Trash2,
  Share2,
  Calendar,
  Layers,
  Search,
  ExternalLink,
  ZoomIn,
  X,
} from 'lucide-react';
import { MediaCaptureItem } from '../types';
import { downloadOrShareMediaItem } from '../services/storage';

interface GalleryViewProps {
  items: MediaCaptureItem[];
  onOpenEditor: (item: MediaCaptureItem) => void;
  onOpenVideo: (item: MediaCaptureItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onGoToStudio: () => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  items,
  onOpenEditor,
  onOpenVideo,
  onDeleteItem,
  onClearAll,
  onGoToStudio,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'photo' | 'video'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<MediaCaptureItem | null>(null);

  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '0:00';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleDownload = async (item: MediaCaptureItem, e: React.MouseEvent) => {
    e.stopPropagation();
    await downloadOrShareMediaItem(item.blob, item.title);
  };

  const handleShare = async (item: MediaCaptureItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.share) {
        const file = new File([item.blob], item.title, { type: item.blob.type });
        await navigator.share({
          title: item.title,
          files: [file],
        });
      } else {
        handleDownload(item, e);
      }
    } catch {
      // User cancelled or unsupported
    }
  };

  const totalSize = items.reduce((acc, curr) => acc + curr.sizeBytes, 0);

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 pb-28">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Galerie de Captures
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {items.length} capture{items.length > 1 ? 's' : ''} • {formatSize(totalSize)} d'espace utilisé
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Voulez-vous supprimer toutes les captures enregistrées ?')) {
                onClearAll();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 text-xs font-medium hover:bg-rose-500/10 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vider la galerie</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 bg-slate-900/80 p-1 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            filterType === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tout ({items.length})
        </button>
        <button
          onClick={() => setFilterType('photo')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            filterType === 'photo'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Photos ({items.filter((i) => i.type === 'photo').length})
        </button>
        <button
          onClick={() => setFilterType('video')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            filterType === 'video'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          Vidéos ({items.filter((i) => i.type === 'video').length})
        </button>
      </div>

      {/* Gallery Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Aucune capture pour le moment</h3>
          <p className="text-xs text-slate-400 max-w-xs mb-5">
            Utilisez le bouton flottant sur votre écran ou l'onglet Capture pour prendre des photos et vidéos.
          </p>
          <button
            onClick={onGoToStudio}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Faire une capture maintenant</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => (item.type === 'video' ? onOpenVideo(item) : setSelectedPhoto(item))}
              className="group relative flex flex-col rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 transition-all shadow-md hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer"
            >
              {/* Thumbnail preview */}
              <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden flex items-center justify-center">
                <img
                  src={item.thumbnailUrl || (item.type === 'photo' ? URL.createObjectURL(item.blob) : '')}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Video duration tag */}
                {item.type === 'video' && (
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold text-white flex items-center gap-1 border border-white/10">
                    <Play className="w-2.5 h-2.5 fill-current text-rose-400" />
                    <span>{formatDuration(item.durationSeconds)}</span>
                  </div>
                )}

                {/* Photo type badge */}
                {item.type === 'photo' && (
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-semibold text-slate-300 uppercase border border-white/10">
                    {item.format}
                  </div>
                )}

                {/* Resolution badge */}
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] text-slate-300 font-mono">
                  {item.width}×{item.height}
                </div>

                {/* Hover overlay with action buttons */}
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {item.type === 'photo' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditor(item);
                      }}
                      className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-lg"
                      title="Éditer avec les outils rapides"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenVideo(item);
                      }}
                      className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-500 transition shadow-lg"
                      title="Lire la vidéo"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  )}

                  <button
                    onClick={(e) => handleDownload(item, e)}
                    className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition shadow-lg"
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(item.id);
                    }}
                    className="p-2 rounded-xl bg-slate-800 text-rose-400 hover:bg-rose-600 hover:text-white transition shadow-lg"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title & Date bar */}
              <div className="p-2.5 flex items-center justify-between">
                <div className="overflow-hidden pr-2">
                  <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    • {formatSize(item.sizeBytes)}
                  </p>
                </div>

                <button
                  onClick={(e) => handleShare(item, e)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Partager"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Photo Preview */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800">
              <div className="truncate">
                <h4 className="text-sm font-bold text-white truncate">{selectedPhoto.title}</h4>
                <p className="text-[11px] text-slate-400">
                  {selectedPhoto.width} × {selectedPhoto.height} px • {formatSize(selectedPhoto.sizeBytes)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const itm = selectedPhoto;
                    setSelectedPhoto(null);
                    onOpenEditor(itm);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Éditeur Rapide</span>
                </button>
                <button
                  onClick={(e) => handleDownload(selectedPhoto, e)}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-2 bg-black min-h-[300px]">
              <img
                src={URL.createObjectURL(selectedPhoto.blob)}
                alt={selectedPhoto.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
