import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createTicket } from '../api/tickets';
import { Upload, X, AlertCircle } from 'lucide-react';

const CAMPUS_BUILDINGS = {
  Arlegui: ['Arlegui (A)'],
  Casal: ["Founder's (F)", 'Building 2 (C)', 'PC 5', 'PC 12', 'PE Center'],
};

const CATEGORIES = [
  'ITSO',
  'Maintenance',
  'SOHAS',
  'Canteen',
  'OSA',
  'Guidance',
];

export default function CreateReport() {
  const location = useLocation();
  const navigate = useNavigate();

  // Form states
  const [campus, setCampus] = useState('Arlegui');
  const [building, setBuilding] = useState('Arlegui (A)');
  const [floor, setFloor] = useState('1');
  const [room, setRoom] = useState('');
  const [landmark, setLandmark] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState(location.state?.preloadedPhotos || []);

  // Validation & status states
  const [floorError, setFloorError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  // Constraint 1: Dynamically update building when campus changes
  const handleCampusChange = (e) => {
    const selectedCampus = e.target.value;
    setCampus(selectedCampus);
    const availableBuildings = CAMPUS_BUILDINGS[selectedCampus] || [];
    setBuilding(availableBuildings[0] || '');
  };

  // Constraint 2: Room first digit validation against floor
  const validateRoomFloor = (selectedFloor, roomInput) => {
    if (!roomInput.trim()) {
      setFloorError('');
      return true;
    }
    const match = String(roomInput).match(/\d/);
    if (!match || match[0] !== String(selectedFloor)) {
      setFloorError('Floor mismatch');
      return false;
    }
    setFloorError('');
    return true;
  };

  const handleRoomChange = (e) => {
    const val = e.target.value;
    setRoom(val);
    validateRoomFloor(floor, val);
  };

  const handleFloorChange = (e) => {
    const val = e.target.value;
    setFloor(val);
    if (room) {
      validateRoomFloor(val, room);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 5 - photos.length;
    if (remainingSlots <= 0) return;

    const filesToProcess = files.slice(0, remainingSlots);

    const readers = filesToProcess.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            name: file.name,
            size: file.size,
            dataUrl: reader.result,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((newPhotos) => {
      setPhotos((prev) => [...prev, ...newPhotos]);
    });
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    // Strict validation check
    const isFloorValid = validateRoomFloor(floor, room);
    if (!isFloorValid) {
      setFloorError('Floor mismatch');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        campus,
        building,
        floor: Number(floor),
        room: room.trim(),
        landmark: landmark.trim(),
        category,
        description: description.trim(),
        images: photos.map((p) => p.dataUrl || p),
      };

      await createTicket(payload);
      navigate('/my-reports');
    } catch (err) {
      setGeneralError(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="bg-surface border border-slate-700/60 rounded-xl p-6 sm:p-8 shadow-2xl">
        {/* Header - 1-2 words only, no subtitles */}
        <h1 className="text-xl font-bold text-text mb-6">Create Report</h1>

        {generalError && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 flex items-center space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campus & Building */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Campus
              </label>
              <select
                value={campus}
                onChange={handleCampusChange}
                className="w-full px-3 py-2.5 bg-background border border-slate-700 rounded-lg text-sm text-text focus:outline-none focus:border-primary transition-colors"
              >
                <option value="Arlegui">Arlegui</option>
                <option value="Casal">Casal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Building
              </label>
              <select
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-slate-700 rounded-lg text-sm text-text focus:outline-none focus:border-primary transition-colors"
              >
                {CAMPUS_BUILDINGS[campus].map((bld) => (
                  <option key={bld} value={bld}>
                    {bld}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Floor & Room with strict validation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Floor
              </label>
              <select
                value={floor}
                onChange={handleFloorChange}
                className="w-full px-3 py-2.5 bg-background border border-slate-700 rounded-lg text-sm text-text focus:outline-none focus:border-primary transition-colors"
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Room
              </label>
              <input
                type="text"
                required
                value={room}
                onChange={handleRoomChange}
                placeholder="Room"
                className={`w-full px-3 py-2.5 bg-background border rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none transition-colors ${
                  floorError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-700 focus:border-primary'
                }`}
              />
              {floorError && (
                <div className="text-red-400 text-xs font-medium mt-1">
                  Floor mismatch
                </div>
              )}
            </div>
          </div>

          {/* Landmark & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Landmark
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Landmark"
                className="w-full px-3 py-2.5 bg-background border border-slate-700 rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-slate-700 rounded-lg text-sm text-text focus:outline-none focus:border-primary transition-colors"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="w-full px-3 py-2.5 bg-background border border-slate-700 rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Photos / Media Gallery */}
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
              Photos
            </label>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-background group"
                  >
                    <img
                      src={photo.dataUrl || photo}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      aria-label="Remove"
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < 5 && (
              <label className="flex items-center justify-center p-4 border border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-primary transition-colors bg-background/50">
                <Upload className="w-5 h-5 text-muted mr-2" />
                <span className="text-xs text-muted font-medium">
                  Upload Photos
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !!floorError}
            className="w-full py-3 px-4 bg-primary hover:bg-amber-500 disabled:opacity-50 text-background font-semibold rounded-lg text-sm transition-colors mt-4"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
