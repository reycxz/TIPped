import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, X } from 'lucide-react';

export default function CameraFAB({ onCapture, className = '' }) {
  const fileInputRef = useRef(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const navigate = useNavigate();

  const handleFabClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to max 5 photos
    const filesToProcess = files.slice(0, 5);

    const readers = filesToProcess.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            name: file.name,
            size: file.size,
            dataUrl: reader.result,
            file,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((results) => {
      setSelectedPhotos(results);
      setPreviewOpen(true);
      // Reset input value to allow re-selection
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    });
  };

  const handleConfirmAndNavigate = () => {
    setPreviewOpen(false);
    if (onCapture) {
      onCapture(selectedPhotos);
    } else {
      navigate('/report/new', {
        state: {
          preloadedPhotos: selectedPhotos,
        },
      });
    }
  };

  return (
    <>
      {/* Hidden File Input supporting device camera / photo selection */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Floating Action Button (Zero text, Camera Icon ONLY) */}
      <button
        type="button"
        onClick={handleFabClick}
        aria-label="Camera"
        className={`fixed z-40 p-4 rounded-full bg-primary hover:bg-amber-500 text-background shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none bottom-6 right-6 sm:bottom-8 sm:right-8 ${className}`}
      >
        <Camera className="w-6 h-6" />
      </button>

      {/* Photo Selection Preview with Check/Done Icon */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface border border-slate-700 rounded-xl p-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-3 text-muted hover:text-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-sm font-semibold text-text mb-3">
              Photos
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {selectedPhotos.map((photo, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-lg overflow-hidden border border-slate-700 bg-background"
                >
                  <img
                    src={photo.dataUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleConfirmAndNavigate}
                aria-label="Confirm"
                className="p-3 bg-primary hover:bg-amber-500 text-background rounded-full transition-colors flex items-center justify-center shadow-lg"
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
