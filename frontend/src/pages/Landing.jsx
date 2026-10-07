import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CreateReport from './CreateReport';
import CameraFAB from '../components/CameraFAB';
import Login from './Login';
import Register from './Register';
import { Camera, X } from 'lucide-react';

export default function Landing({ onLoginSuccess }) {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [capturedFile, setCapturedFile] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState([]);

  // Flip-card animation state for embedded Login & Register
  const [isRegister, setIsRegister] = useState(
    location.state?.register === true
  );
  const [flipDegree, setFlipDegree] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  const flipTo = (toRegister) => {
    setIsFlipping(true);
    setFlipDegree(90);
    setTimeout(() => {
      setIsRegister(toRegister);
      setFlipDegree(-90);
      setTimeout(() => {
        setFlipDegree(0);
        setTimeout(() => {
          setIsFlipping(false);
        }, 250);
      }, 50);
    }, 250);
  };

  // Constraint 3 & 4: Photo capture handler for native camera / gallery selection
  const handlePhotoCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem('token');

    // Create preview object compatible with CreateReport
    const reader = new FileReader();
    reader.onloadend = () => {
      const photoObj = {
        name: file.name,
        size: file.size,
        dataUrl: reader.result,
        file: file,
      };

      if (token) {
        // Authenticated user: navigate directly to Create Report route
        navigate('/report/new', {
          state: {
            initialPhoto: file,
            preloadedPhotos: [photoObj],
          },
        });
      } else {
        // Guest user: hand off to Guest Report modal
        setCapturedFile(file);
        setCapturedPhotos([photoObj]);
        setShowReportModal(true);
      }
    };
    reader.readAsDataURL(file);

    // Reset input value to allow re-capturing same image if needed
    e.target.value = '';
  };

  const handleCapture = (photos) => {
    setCapturedPhotos(photos);
    setShowReportModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <Navbar isLanding={true} />

      {/* Main Section - Constraint 1: Perfectly Vertically Centered on Y-Axis */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center my-auto">
          {/* Left Column: Hero Text + Constraint 2: Prominent Guest CTA Button */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight max-w-lg">
              <span className="inline-block transition-transform duration-200 hover:-translate-y-2 cursor-default">S</span><span className="inline-block transition-transform duration-200 hover:-translate-y-2 cursor-default">e</span><span className="inline-block transition-transform duration-200 hover:-translate-y-2 cursor-default">e</span>
              {' '}
              <span className="inline-block transition-transform duration-200 hover:-translate-y-2 cursor-default">i</span><span className="inline-block transition-transform duration-200 hover:-translate-y-2 cursor-default">t</span><span className="inline-block transition-transform duration-200 hover:-translate-y-2 cursor-default">.</span>
              {' '}
              <span className="inline-block cursor-default transition-all duration-75 hover:scale-[1.02] hover:brightness-150 hover:text-white hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.9)]">
                Snap it.
              </span>{' '}
              <br className="hidden sm:inline" />
              <span className="text-amber-500 hover:text-amber-400 inline-block transition-all duration-300 hover:scale-110 hover:-translate-y-1 cursor-default hover:drop-shadow-lg hover:brightness-110">
                TIP it.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
              Report campus facilities and service issues instantly.
            </p>

            {/* Constraint 2: Prominent Guest "Submit Tip" Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setCapturedPhotos([]);
                  setShowReportModal(true);
                }}
                className="px-7 py-3.5 bg-primary hover:bg-amber-500 text-background font-bold rounded-xl text-sm transition-all shadow-lg hover:shadow-primary/25 flex items-center justify-center space-x-2.5 cursor-pointer active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Submit Tip</span>
              </button>
            </div>
          </div>

          {/* Right Column: Embedded Flip-Card with Unified Login & Register */}
          <div className="w-full flex justify-center lg:justify-end">
            <div className="w-full max-w-md perspective-1000">
              <div
                style={{
                  transform: `rotateY(${flipDegree}deg)`,
                  transition: isFlipping ? 'transform 0.25s ease-in-out' : 'none',
                  transformStyle: 'preserve-3d',
                }}
                className="w-full"
              >
                {!isRegister ? (
                  <Login
                    isEmbedded={true}
                    onLoginSuccess={onLoginSuccess}
                    onToggleRegister={() => flipTo(true)}
                  />
                ) : (
                  <Register
                    isEmbedded={true}
                    onLoginSuccess={onLoginSuccess}
                    onToggleLogin={() => flipTo(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Constraint 1: Hidden file input with accept="image/*" for native camera / gallery trigger */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handlePhotoCapture}
        />

        {/* Create Report Modal for Guest Flow (Triggered by either CTA Button or FAB) */}
        {showReportModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-4 flex items-center justify-center">
            <div className="w-full max-w-2xl relative my-8">
              <CreateReport
                isGuest={true}
                initialPhoto={capturedFile}
                initialPhotos={capturedPhotos}
                onCancel={() => {
                  setShowReportModal(false);
                  setCapturedPhotos([]);
                  setCapturedFile(null);
                }}
                onClose={() => {
                  setShowReportModal(false);
                  setCapturedPhotos([]);
                  setCapturedFile(null);
                }}
                onSuccess={() => {
                  setShowReportModal(false);
                  setCapturedPhotos([]);
                  setCapturedFile(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Constraint 2: Mobile-First Camera FAB with onClick executing fileInputRef.current.click() */}
        <CameraFAB
          onClick={() => fileInputRef.current.click()}
          className="md:hidden"
        />
      </main>
    </div>
  );
}
