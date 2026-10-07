import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createTicket, createGuestTicket } from '../api/tickets';
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';

// Constraint 1: Arlegui room data dictionary
const arleguiRooms = {
  '1': ['A-101', 'A-102', 'A-103', 'A-104', 'A-105', 'A-106', 'A-107', 'A-108', 'A-109', 'A-110'],
  '2': ['A-201', 'A-202', 'A-203', 'A-204', 'A-205', 'A-206', 'A-207', 'A-208', 'A-209', 'A-210', 'A-211', 'A-212', 'A-213', 'A-214', 'A-215', 'A-216', 'A-217', 'A-218', 'A-219', 'A-220', 'A-221', 'A-222', 'A-223', 'A-224A', 'A-225', 'A-226', 'A-227', 'A-228', 'A-229'],
  '3': ['A-301', 'A-302', 'A-303', 'A-304', 'A-305', 'A-306', 'A-307', 'A-308', 'A-309', 'A-310', 'A-311', 'A-312', 'A-313', 'A-314', 'A-315', 'A-316', 'A-317', 'A-318', 'A-319', 'A-320', 'A-321', 'A-322', 'A-323', 'A-324', 'A-325', 'A-326', 'A-327', 'A-328', 'A-329'],
  '4': ['A-401', 'A-402', 'A-403', 'A-404', 'A-405', 'A-406', 'A-407', 'A-408', 'A-409', 'A-410', 'A-411', 'A-412', 'A-413', 'A-414', 'A-415', 'A-416', 'A-417', 'A-418', 'A-419'],
  '6': ['A-601', 'A-602', 'A-603', 'A-604', 'A-605'],
  '7': ['A-701', 'A-702', 'A-703', 'A-704', 'A-705'] // Sixth Floor Mezzanine
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

export default function CreateReport({
  isGuest = false,
  onSuccess,
  onCancel,
  onClose,
  initialPhotos = [],
  initialPhoto = null
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
  const [isRoomSpecific, setIsRoomSpecific] = useState(true);
  const [landmark, setLandmark] = useState('');
  const [issueCategory, setIssueCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [description, setDescription] = useState('');
  
  // Constraint 4: Pre-fill photos with initialPhoto (File or object) or initialPhotos
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
    const routerPhoto = location.state?.initialPhoto;
    if (routerPhoto) {
      if (routerPhoto instanceof File) {
        return [
          {
            name: routerPhoto.name,
            size: routerPhoto.size,
            dataUrl: URL.createObjectURL(routerPhoto),
            file: routerPhoto,
          },
        ];
      }
      return [routerPhoto];
    }
    return location.state?.preloadedPhotos || [];
  });

  // Sync when initialPhoto or initialPhotos changes
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

  // Guest modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState(null);
  // Constraint 2: Tracks whether the guest submission has completed successfully
  const [isSubmitted, setIsSubmitted] = useState(false);

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

  // Constraint 4: Auto-clear room when floor or campus changes
  useEffect(() => {
    setRoom('');
    setFloorError('');
  }, [floor, campus]);

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
    // Constraint 1: Dynamically template room to start with floor number to satisfy backend floor matching
    const finalRoom = isRoomSpecific ? room.trim() : `${floor} - Common Area`;
    formData.append('room', finalRoom);
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

    if (isRoomSpecific) {
      const isFloorValid = validateRoomFloor(floor, room);
      if (!isFloorValid) {
        setFloorError('Floor mismatch');
        return;
      }
    } else {
      setFloorError('');
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
      if (isGuest) {
        // Constraint 3: On success, show the in-modal success view instead of immediately redirecting
        const res = await createGuestTicket(formData);
        setSubmittedTicket(res.ticket);
        setIsSubmitted(true);
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
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-8 shadow-lg dark:shadow-2xl transition-colors duration-200">
        {/* Constraint 1: Header title horizontally aligned with subtle 'X' close button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create Report</h1>
          <button
            type="button"
            onClick={handleCancel}
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

          {/* Floor & Room with strict validation */}
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

              {/* Constraint 2: Dropdown for Arlegui, free-text fallback for other campuses */}
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

              {/* Floor mismatch error — only relevant for free-text (non-Arlegui) path */}
              {floorError && isRoomSpecific && campus !== 'Arlegui' && (
                <div className="text-red-500 dark:text-red-400 text-xs font-medium mt-1">
                  Floor mismatch
                </div>
              )}

              {/* Constraint 3: Not in a specific room checkbox — preserved and functional */}
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
              <select
                value={issueCategory}
                onChange={(e) => setIssueCategory(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-colors"
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

          {/* Photos / Media Gallery: 2-5 files supported */}
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

          {/* Constraint 2: Secondary Cancel button to the left of the main Submit button */}
          <div className="flex items-center gap-3 mt-6">
            <button
              type="button"
              onClick={handleCancel}
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
      </div>

      {/* Guest Email Capture Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-2xl relative">

            {/* Constraint 4: Conditional UI — success view vs. email-capture form */}
            {isSubmitted ? (
              // Success state
              <div className="text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                {/* Constraint 1: Updated success heading and tagline */}
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Report Received!</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Thank you for helping us keep the campus safe.
                  </p>
                  {/* Constraint 1: Conditional subtext shown only when the guest provided an email */}
                  {guestEmail && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                      A confirmation has been sent to your email.
                    </p>
                  )}
                </div>

                {/* OK — tear down parent overlay first, then navigate to avoid flash */}
                <button
                  type="button"
                  onClick={() => {
                    // Unmount Landing's modal overlay before navigating so it doesn't flash
                    if (onSuccess) onSuccess();
                    // Close the inner email-modal state
                    setShowEmailModal(false);
                    // Redirect to landing page
                    navigate('/');
                  }}
                  className="w-full py-2.5 bg-primary hover:bg-amber-500 text-slate-900 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
                >
                  OK
                </button>
              </div>
            ) : (
              // Email-capture form (default / pre-submission state)
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
                    {/* Constraint 1: Renamed from "Submit Tip" → "Submit" */}
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
  );
}
