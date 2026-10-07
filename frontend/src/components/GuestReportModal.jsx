import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createGuestTicket } from '../api/tickets';
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';

const arleguiRooms = {
  '1': ['A-101', 'A-102', 'A-103', 'A-104', 'A-105', 'A-106', 'A-107', 'A-108', 'A-109', 'A-110'],
  '2': ['A-201', 'A-202', 'A-203', 'A-204', 'A-205', 'A-206', 'A-207', 'A-208', 'A-209', 'A-210', 'A-211', 'A-212', 'A-213', 'A-214', 'A-215', 'A-216', 'A-217', 'A-218', 'A-219', 'A-220', 'A-221', 'A-222', 'A-223', 'A-224A', 'A-225', 'A-226', 'A-227', 'A-228', 'A-229'],
  '3': ['A-301', 'A-302', 'A-303', 'A-304', 'A-305', 'A-306', 'A-307', 'A-308', 'A-309', 'A-310', 'A-311', 'A-312', 'A-313', 'A-314', 'A-315', 'A-316', 'A-317', 'A-318', 'A-319', 'A-320', 'A-321', 'A-322', 'A-323', 'A-324', 'A-325', 'A-326', 'A-327', 'A-328', 'A-329'],
  '4': ['A-401', 'A-402', 'A-403', 'A-404', 'A-405', 'A-406', 'A-407', 'A-408', 'A-409', 'A-410', 'A-411', 'A-412', 'A-413', 'A-414', 'A-415', 'A-416', 'A-417', 'A-418', 'A-419'],
  '6': ['A-601', 'A-602', 'A-603', 'A-604', 'A-605'],
  '7': ['A-701', 'A-702', 'A-703', 'A-704', 'A-705']
};

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

export default function GuestReportModal({
  isOpen = true,
  onClose,
  onSuccess,
  initialPhoto = null,
  initialPhotos = []
}) {
  // Form states
  const [campus, setCampus] = useState('Arlegui');
  const [building, setBuilding] = useState('Arlegui (A)');
  const [floor, setFloor] = useState('1');
  const [room, setRoom] = useState('');
  const [isRoomSpecific, setIsRoomSpecific] = useState(true);
  const [landmark, setLandmark] = useState('');
  // Constraint 2: Initialize category as empty string
  const [category, setCategory] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [description, setDescription] = useState('');

  // Photos state
  const [photos, setPhotos] = useState(() => {
    if (initialPhoto) {
      if (initialPhoto instanceof File) {
        return [
          {
            name: initialPhoto.name,
            size: initialPhoto.size,
            dataUrl: URL.createObjectURL(initialPhoto),
            file: initialPhoto,
          },
        ];
      }
      return [initialPhoto];
    }
    if (initialPhotos && initialPhotos.length > 0) return initialPhotos;
    return [];
  });

  // Sync photos when props change
  useEffect(() => {
    if (initialPhoto) {
      if (initialPhoto instanceof File) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotos([
            {
              name: initialPhoto.name,
              size: initialPhoto.size,
              dataUrl: reader.result,
              file: initialPhoto,
            },
          ]);
        };
        reader.readAsDataURL(initialPhoto);
      } else {
        setPhotos([initialPhoto]);
      }
    } else if (initialPhotos && initialPhotos.length > 0) {
      setPhotos(initialPhotos);
    }
  }, [initialPhoto, initialPhotos]);

  // Validation & status states
  const [floorError, setFloorError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email capture and success modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Constraint 2: Fetch categories on mount without defaulting category to first item
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);
        const res = await axios.get('/api/categories');
        const data = Array.isArray(res.data) ? res.data : [];
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Auto-clear room when floor or campus changes
  useEffect(() => {
    setRoom('');
    setFloorError('');
  }, [floor, campus]);

  // Floor options dynamically generated from 1 to maxFloor
  const availableCampuses = Object.keys(campusConfig);
  const availableBuildings = Object.keys(campusConfig[campus] || {});
  const currentBuildingConfig = campusConfig[campus]?.[building];
  const maxFloor = currentBuildingConfig?.maxFloor || 1;
  const availableFloors = Array.from({ length: maxFloor }, (_, i) => String(i + 1));

  const handleCampusChange = (e) => {
    const selectedCampus = e.target.value;
    setCampus(selectedCampus);
    const buildings = Object.keys(campusConfig[selectedCampus] || {});
    const newBuilding = buildings[0] || '';
    setBuilding(newBuilding);

    const bConfig = campusConfig[selectedCampus]?.[newBuilding];
    const newMaxFloor = bConfig?.maxFloor || 1;
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
    const bConfig = campusConfig[campus]?.[newBuilding];
    const newMaxFloor = bConfig?.maxFloor || 1;
    if (Number(floor) > newMaxFloor) {
      setFloor('1');
      if (room) validateRoomFloor('1', room);
    } else if (room) {
      validateRoomFloor(floor, room);
    }
  };

  const validateRoomFloor = (selectedFloor, roomInput) => {
    if (!isRoomSpecific || !roomInput.trim()) {
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

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setCategory(val);
    if (val) {
      setCategoryError('');
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

  // Constraint 2: Reset category to empty string on form reset
  const resetForm = () => {
    setCampus('Arlegui');
    setBuilding('Arlegui (A)');
    setFloor('1');
    setRoom('');
    setIsRoomSpecific(true);
    setLandmark('');
    setCategory('');
    setCategoryError('');
    setDescription('');
    setPhotos([]);
    setGuestEmail('');
    setFloorError('');
    setGeneralError('');
    setIsSubmitted(false);
    setShowEmailModal(false);
  };

  const buildFormData = (optionalEmail = '') => {
    const formData = new FormData();
    formData.append('campus', campus);
    formData.append('building', building);
    formData.append('floor', floor);
    const finalRoom = isRoomSpecific ? room.trim() : `${floor} - Common Area`;
    formData.append('room', finalRoom);
    if (landmark) formData.append('landmark', landmark.trim());
    formData.append('issueCategory', category.trim());
    formData.append('category', category.trim());
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

  // Constraint 3: Cross-Component Validation in form submission handler
  const handleSubmit = (e) => {
    e.preventDefault();
    setGeneralError('');

    // Block submission and display error if category is empty
    if (!category || !category.trim()) {
      setCategoryError('Please choose a category');
      return;
    }

    if (isRoomSpecific) {
      const isFloorValid = validateRoomFloor(floor, room);
      if (!isFloorValid) {
        setFloorError('Floor mismatch');
        return;
      }
    } else {
      setFloorError('');
    }

    // Intercept with optional email capture modal
    setShowEmailModal(true);
  };

  const executeSubmission = async (emailToSubmit = '') => {
    // Constraint 3: Ensure category is not empty before submitting
    if (!category || !category.trim()) {
      setCategoryError('Please choose a category');
      return;
    }

    setLoading(true);
    setGeneralError('');

    try {
      const formData = buildFormData(emailToSubmit);
      await createGuestTicket(formData);
      setIsSubmitted(true);
    } catch (err) {
      setGeneralError(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl relative my-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-8 shadow-2xl transition-colors duration-200">
        {/* Header title with subtle 'X' close button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Submit Tip</h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {generalError && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-500 dark:text-red-400 flex items-center space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campus & Building */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Campus
              </label>
              <select
                value={campus}
                onChange={handleCampusChange}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
              >
                {availableCampuses.map((camp) => (
                  <option key={camp} value={camp}>
                    {camp}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Building
              </label>
              <select
                value={building}
                onChange={handleBuildingChange}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
              >
                {availableBuildings.map((bld) => (
                  <option key={bld} value={bld}>
                    {bld}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Floor & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Floor
              </label>
              <select
                value={floor}
                onChange={handleFloorChange}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
              >
                {availableFloors.map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Room
              </label>
              {campus === 'Arlegui' ? (
                <select
                  required={isRoomSpecific}
                  disabled={!isRoomSpecific}
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none transition-colors ${
                    !isRoomSpecific
                      ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-primary'
                  }`}
                >
                  <option value="">Select a room</option>
                  {(arleguiRooms[floor] || []).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required={isRoomSpecific}
                  disabled={!isRoomSpecific}
                  value={room}
                  onChange={handleRoomChange}
                  placeholder="Room"
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors ${
                    !isRoomSpecific
                      ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      : floorError
                      ? 'bg-slate-50 dark:bg-slate-900 border-red-500 focus:border-red-500'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-primary'
                  }`}
                />
              )}

              {floorError && isRoomSpecific && campus !== 'Arlegui' && (
                <div className="text-red-500 dark:text-red-400 text-xs font-medium mt-1">
                  Floor mismatch
                </div>
              )}

              <label className="flex items-center space-x-2 mt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!isRoomSpecific}
                  onChange={(e) => {
                    const notInRoom = e.target.checked;
                    setIsRoomSpecific(!notInRoom);
                    if (notInRoom) {
                      setRoom('');
                      setFloorError('');
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary focus:ring-offset-0 bg-slate-50 dark:bg-slate-900 cursor-pointer"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Not in a specific room (e.g., hallway, lobby)
                </span>
              </label>
            </div>
          </div>

          {/* Landmark & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Landmark
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder={
                  !isRoomSpecific
                    ? "Describe the area (e.g., Near stairs, Main Lobby)"
                    : "Landmark"
                }
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Category
              </label>
              {/* Constraint 1: Category dropdown with name="category" and disabled Choose Category placeholder */}
              <select
                name="category"
                value={category}
                onChange={handleCategoryChange}
                required
                className={`w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none transition-colors ${
                  categoryError
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-200 dark:border-slate-700 focus:border-primary'
                }`}
              >
                <option value="" disabled>Choose Category</option>
                {categories.map((cat) => {
                  const name = typeof cat === 'string' ? cat : cat.issueName;
                  const key = cat._id || name;
                  return (
                    <option key={key} value={name}>
                      {name}
                    </option>
                  );
                })}
              </select>
              {categoryError && (
                <div className="text-red-500 dark:text-red-400 text-xs font-medium mt-1">
                  {categoryError}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Photos
            </label>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 group"
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
              <label className="flex items-center justify-center p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-primary transition-colors bg-slate-50/80 dark:bg-slate-900/50">
                <Upload className="w-5 h-5 text-slate-500 dark:text-slate-400 mr-2" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
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

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="py-3 px-5 bg-transparent border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!floorError}
              className="flex-1 py-3 px-4 bg-primary hover:bg-amber-500 disabled:opacity-50 text-slate-900 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>

        {/* Email Capture & Confirmation Sub-Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-2xl relative">
              {isSubmitted ? (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Report Received!</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Thank you for helping us keep the campus safe.
                    </p>
                    {guestEmail && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                        A confirmation has been sent to your email.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      if (onSuccess) onSuccess();
                      if (onClose) onClose();
                    }}
                    className="w-full py-2.5 bg-primary hover:bg-amber-500 text-slate-900 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    aria-label="Close"
                    className="absolute top-4 right-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 text-center">
                    Get status updates (Optional)
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => executeSubmission('')}
                        className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-primary text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-xs transition-colors"
                      >
                        Skip &amp; Submit
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => executeSubmission(guestEmail)}
                        className="flex-1 py-2.5 px-3 bg-primary hover:bg-amber-500 text-slate-900 font-semibold rounded-lg text-xs transition-colors"
                      >
                        {loading ? 'Submitting...' : 'Submit'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
