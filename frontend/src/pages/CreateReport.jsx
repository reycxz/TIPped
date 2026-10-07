import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createTicket, createGuestTicket } from '../api/tickets';
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';

const campusConfig = {
  Arlegui: {
    "Arlegui (A)": { prefix: "A", maxFloor: 6 }
  },
  Casal: {
    "Founder's (F)": { prefix: "F", maxFloor: 6 },
    "Building 2 (C)": { prefix: "C", maxFloor: 3 },
    "PC 5": { prefix: "PC5", maxFloor: 1 },
    "PC 12": { prefix: "PC12", maxFloor: 2 },
    "PE Center": { prefix: "PE", maxFloor: 1 }
  }
};

export default function CreateReport({
  isGuest = false,
  onSuccess,
  onCancel,
  onClose,
  initialPhotos = []
}) {
  const location = useLocation();
  const navigate = useNavigate();

  // Constraint 3: Safe return logic for guest and authenticated navigation
  const handleCancel = () => {
    // If conditionally rendered on the root '/' page with a close/cancel callback
    if (onCancel) {
      onCancel();
      return;
    }
    if (onClose) {
      onClose();
      return;
    }

    // If rendered via a route (like /report/new)
    const token = localStorage.getItem('token');
    if (isGuest || !token) {
      navigate('/');
    } else {
      navigate('/dashboard');
    }
  };

  // Form states
  const [campus, setCampus] = useState('Arlegui');
  const [building, setBuilding] = useState('Arlegui (A)');
  const [floor, setFloor] = useState('1');
  const [room, setRoom] = useState('');
  const [landmark, setLandmark] = useState('');
  const [issueCategory, setIssueCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState(
    initialPhotos.length > 0 ? initialPhotos : (location.state?.preloadedPhotos || [])
  );

  // Validation & status states
  const [floorError, setFloorError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  // Guest modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Fetch dynamic categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const res = await axios.get('/api/categories');
        const data = Array.isArray(res.data) ? res.data : [];
        setCategories(data);
        if (data.length > 0) {
          const firstCat = data[0];
          const firstName = typeof firstCat === 'string' ? firstCat : (firstCat.issueName || '');
          setIssueCategory(firstName);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Floor options dynamically generated from 1 to maxFloor of the selected building
  const availableCampuses = Object.keys(campusConfig);
  const availableBuildings = Object.keys(campusConfig[campus] || {});
  const currentBuildingConfig = campusConfig[campus]?.[building];
  const maxFloor = currentBuildingConfig?.maxFloor || 1;
  const availableFloors = Array.from({ length: maxFloor }, (_, i) => String(i + 1));

  // Dynamically update building and floor when campus changes
  const handleCampusChange = (e) => {
    const selectedCampus = e.target.value;
    setCampus(selectedCampus);
    const buildings = Object.keys(campusConfig[selectedCampus] || {});
    const newBuilding = buildings[0] || '';
    setBuilding(newBuilding);

    const buildingConfig = campusConfig[selectedCampus]?.[newBuilding];
    const newMaxFloor = buildingConfig?.maxFloor || 1;
    if (Number(floor) > newMaxFloor) {
      setFloor('1');
      if (room) validateRoomFloor('1', room);
    } else if (room) {
      validateRoomFloor(floor, room);
    }
  };

  const handleBuildingChange = (e) => {
    const newBuilding = e.target.value;
    setBuilding(newBuilding);
    const buildingConfig = campusConfig[campus]?.[newBuilding];
    const newMaxFloor = buildingConfig?.maxFloor || 1;
    if (Number(floor) > newMaxFloor) {
      setFloor('1');
      if (room) validateRoomFloor('1', room);
    } else if (room) {
      validateRoomFloor(floor, room);
    }
  };

  // Validate room first digit matches floor
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
            file,
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

  const buildFormData = (optionalEmail = '') => {
    const formData = new FormData();
    formData.append('campus', campus);
    formData.append('building', building);
    formData.append('floor', floor);
    formData.append('room', room.trim());
    if (landmark) formData.append('landmark', landmark.trim());
    formData.append('issueCategory', issueCategory);
    formData.append('category', issueCategory);
    formData.append('description', description.trim());
    if (optionalEmail) formData.append('guestEmail', optionalEmail.trim());

    photos.forEach((photo) => {
      if (photo.file instanceof File) {
        formData.append('images', photo.file);
      } else if (photo.dataUrl && photo.dataUrl.startsWith('data:image/')) {
        const arr = photo.dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        formData.append('images', blob, photo.name || 'photo.jpg');
      } else if (typeof photo === 'string' && photo.startsWith('data:image/')) {
        const arr = photo.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        formData.append('images', blob, 'photo.jpg');
      }
    });

    return formData;
  };

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    setGeneralError('');

    const isFloorValid = validateRoomFloor(floor, room);
    if (!isFloorValid) {
      setFloorError('Floor mismatch');
      return;
    }

    // Guest submission: intercept with Email Capture Modal
    if (isGuest) {
      setShowEmailModal(true);
      return;
    }

    // Authenticated user direct submission
    executeSubmission();
  };

  const executeSubmission = async (emailToSubmit = '') => {
    setLoading(true);
    setGeneralError('');

    try {
      const formData = buildFormData(emailToSubmit);
      let res;
      if (isGuest) {
        res = await createGuestTicket(formData);
        setSubmittedTicket(res.ticket);
        setShowEmailModal(false);
        if (onSuccess) onSuccess(res.ticket);
      } else {
        await createTicket(formData);
        navigate('/my-reports');
      }
    } catch (err) {
      setGeneralError(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="bg-surface border border-slate-700/60 rounded-xl p-6 sm:p-8 shadow-2xl">
        {/* Constraint 1: Header title horizontally aligned with subtle 'X' close button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-text">Create Report</h1>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Close"
            className="p-1.5 text-muted hover:text-text rounded-lg hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
                {availableCampuses.map((camp) => (
                  <option key={camp} value={camp}>
                    {camp}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                Building
              </label>
              <select
                value={building}
                onChange={handleBuildingChange}
                className="w-full px-3 py-2.5 bg-background border border-slate-700 rounded-lg text-sm text-text focus:outline-none focus:border-primary transition-colors"
              >
                {availableBuildings.map((bld) => (
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
                {availableFloors.map((num) => (
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
                value={issueCategory}
                onChange={(e) => setIssueCategory(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-background border border-slate-700 rounded-lg text-sm text-text focus:outline-none focus:border-primary transition-colors"
              >
                {categories.length === 0 ? (
                  <option value="">{categoriesLoading ? 'Loading categories...' : 'No categories available'}</option>
                ) : (
                  categories.map((cat) => {
                    const name = typeof cat === 'string' ? cat : cat.issueName;
                    const key = cat._id || name;
                    return (
                      <option key={key} value={name}>
                        {name}
                      </option>
                    );
                  })
                )}
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

          {/* Photos / Media Gallery: 2-5 files supported */}
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

          {/* Constraint 2: Secondary Cancel button to the left of the main Submit button */}
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="py-3 px-5 bg-transparent border border-slate-700 hover:border-slate-500 hover:bg-slate-800/40 text-muted hover:text-text font-semibold rounded-lg text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!floorError}
              className="flex-1 py-3 px-4 bg-primary hover:bg-amber-500 disabled:opacity-50 text-background font-semibold rounded-lg text-sm transition-colors cursor-pointer"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>

      {/* Guest Email Capture Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface border border-slate-700 rounded-xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowEmailModal(false)}
              aria-label="Close"
              className="absolute top-4 right-4 text-muted hover:text-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-sm font-semibold text-text mb-4 text-center">
              Get status updates (Optional)
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full px-3 py-2 bg-background border border-slate-700 rounded-lg text-sm text-text placeholder-slate-500 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => executeSubmission('')}
                  className="flex-1 py-2.5 px-3 bg-background border border-slate-700 hover:border-primary text-text font-semibold rounded-lg text-xs transition-colors"
                >
                  Skip & Submit
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => executeSubmission(guestEmail)}
                  className="flex-1 py-2.5 px-3 bg-primary hover:bg-amber-500 text-background font-semibold rounded-lg text-xs transition-colors"
                >
                  Submit Tip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guest Submission Success Modal */}
      {submittedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface border border-slate-700 rounded-xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h2 className="text-base font-bold text-text">Tip Submitted</h2>

            <div className="p-3 bg-background rounded-lg border border-slate-700 font-mono text-sm text-primary font-bold">
              {submittedTicket.ticketId}
            </div>

            <button
              type="button"
              onClick={() => {
                setSubmittedTicket(null);
                setRoom('');
                setLandmark('');
                const firstCat = categories[0];
                setIssueCategory(typeof firstCat === 'string' ? firstCat : (firstCat?.issueName || ''));
                setDescription('');
                setPhotos([]);
              }}
              className="w-full py-2.5 bg-primary hover:bg-amber-500 text-background font-semibold rounded-lg text-sm transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
