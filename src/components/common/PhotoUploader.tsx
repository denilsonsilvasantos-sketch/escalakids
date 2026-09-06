import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Camera
} from 'lucide-react';

export interface PhotoUploaderProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
  theme?: 'dark' | 'light';
  nameFallback?: string;
  shape?: 'circle' | 'rounded';
}

/**
 * Resizes and compresses an image file to a clean avatar size using an offscreen canvas.
 * This prevents large phone camera files (5MB+) from bloating storage or sync payloads.
 */
async function compressImageFile(file: File, maxDim = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida (use JPG, PNG ou WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl); // Fallback to raw data URL
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  value = '',
  onChange,
  label = 'Foto de Perfil',
  helperText = 'Arraste uma foto, clique para procurar ou insira um link da web.',
  theme = 'dark',
  nameFallback = 'U',
  shape = 'rounded'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  // Handle file selection from input
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    // Reset file input so user can pick the same file again if desired
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Process dropped or selected file
  const processFile = async (file: File) => {
    setGeneralError(null);
    setIsProcessing(true);
    try {
      const compressed = await compressImageFile(file);
      onChange(compressed);
    } catch (err: any) {
      setGeneralError(err.message || 'Erro ao processar a imagem.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  // Apply URL Link
  const handleApplyUrl = () => {
    setUrlError(null);
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError('Insira um link de imagem válido.');
      return;
    }

    if (!/^https?:\/\/.+/i.test(trimmed) && !trimmed.startsWith('data:image/')) {
      setUrlError('O link deve começar com http:// ou https://');
      return;
    }

    onChange(trimmed);
    setUrlInput('');
    setMode('upload');
  };

  // Remove Photo
  const handleRemovePhoto = () => {
    onChange('');
    setUrlInput('');
    setGeneralError(null);
    setUrlError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const avatarRadiusClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  return (
    <div className="space-y-2.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {label}
          </label>
          {value && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className={`text-[11px] font-medium flex items-center space-x-1 ${
                isDark ? 'text-rose-400 hover:text-rose-300' : 'text-rose-600 hover:text-rose-700'
              } transition-colors`}
            >
              <Trash2 className="w-3 h-3" />
              <span>Remover foto</span>
            </button>
          )}
        </div>
      )}

      {/* Hidden file input triggered by click */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
        {/* Avatar Preview Box with Camera overlay */}
        <div className="relative shrink-0 flex items-center justify-center self-center sm:self-auto">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`w-20 h-20 sm:w-22 sm:h-22 ${avatarRadiusClass} overflow-hidden border-2 cursor-pointer transition-all group relative flex items-center justify-center ${
              value
                ? isDark
                  ? 'border-blue-500/60 shadow-md bg-slate-900'
                  : 'border-blue-400 shadow-md bg-white'
                : isDark
                ? 'border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/70'
                : 'border-dashed border-slate-300 hover:border-blue-500 bg-slate-100'
            }`}
            title="Clique para escolher uma foto"
          >
            {value ? (
              <>
                <img
                  src={value}
                  alt={nameFallback}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Broken image link fallback
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold space-y-1">
                  <Camera className="w-5 h-5 text-white" />
                  <span>Alterar</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-2">
                <Camera className={`w-6 h-6 mb-1 ${isDark ? 'text-slate-500 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-600'} transition-colors`} />
                <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {nameFallback.charAt(0).toUpperCase() || '+ Foto'}
                </span>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Dropzone & Input Options */}
        <div className="flex-1 min-w-0 space-y-2">
          {mode === 'upload' ? (
            /* Drag and Drop Zone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                isDragging
                  ? isDark
                    ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                    : 'border-blue-500 bg-blue-50 text-blue-800'
                  : isDark
                  ? 'border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-900/50 text-slate-300'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/80 text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-blue-950/80 text-blue-400 border border-blue-800/60' : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight truncate">
                    {isDragging ? 'Solte a imagem aqui...' : 'Clique para procurar ou arraste a foto'}
                  </p>
                  <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    JPG, PNG, WEBP ou GIF (otimização automática)
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMode('url');
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center space-x-1 ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Inserir link da web"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Usar Link</span>
                </button>
              </div>
            </div>
          ) : (
            /* URL Input Zone */
            <div
              className={`p-2.5 rounded-xl border space-y-2 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold flex items-center space-x-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <LinkIcon className="w-3 h-3 text-blue-400" />
                  <span>Inserir Link da Foto (URL)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('upload');
                    setUrlError(null);
                  }}
                  className={`text-[11px] font-semibold ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Voltar para arquivo
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => {
                    setUrlInput(e.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyUrl();
                    }
                  }}
                  placeholder="https://exemplo.com/minha-foto.jpg"
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 border ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center space-x-1 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aplicar</span>
                </button>
              </div>

              {urlError && (
                <p className="text-[11px] text-rose-500 font-medium flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{urlError}</span>
                </p>
              )}
            </div>
          )}

          {generalError && (
            <p className="text-[11px] text-rose-500 font-medium flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{generalError}</span>
            </p>
          )}

          {helperText && !generalError && (
            <p className={`text-[11px] leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {helperText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
