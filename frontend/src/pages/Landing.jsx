import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CreateReport from './CreateReport';
import GuestReportModal from '../components/GuestReportModal';
import Login from './Login';
import Register from './Register';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

export default function Landing({ onLoginSuccess }) {
  const location = useLocation();
  const navigate = useNavigate();
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const words = ['See', 'Snap', 'TIP'];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[currentWordIndex];
    let timer;

    if (!isDeleting) {
      if (displayText.length < currentWord.length) {
        timer = setTimeout(() => {
          setDisplayText(currentWord.slice(0, displayText.length + 1));
        }, 100);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 1500);
      }
    } else {
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(currentWord.slice(0, displayText.length - 1));
        }, 50);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(false);
          setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length);
        }, 200);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentWordIndex]);

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
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
      {/* Header */}
      <Navbar isLanding={true} />

      {/* Main Section - Constraint 1: Perfectly Vertically Centered on Y-Axis */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center my-auto">
          {/* Left Column: Hero Text + Constraint 2: Prominent Guest CTA Button */}
          <div className="relative flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            {/* Constraint 2: Decorative Background Watermark */}
            <div
              className="absolute -top-12 -left-12 sm:-top-16 sm:-left-20 w-80 h-80 sm:w-[460px] sm:h-[460px] opacity-5 dark:opacity-10 pointer-events-none -z-10 select-none text-[#F59E0B]"
              aria-hidden="true"
            >
              <svg viewBox="0 0 400 400" className="w-full h-full" fill="none" stroke="currentColor">
                <g strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M66 140V76a10 10 0 0 1 10-10h64" />
                  <path d="M260 66h64a10 10 0 0 1 10 10v64" />
                  <path d="M66 260v64a10 10 0 0 0 10 10h64" />
                  <path d="M260 334h64a10 10 0 0 0 10-10v-64" />
                </g>
                <path
                  d="M200 92C154 92 118 128 118 174c0 52 56 100 82 126 26-26 82-74 82-126 0-46-36-82-82-82z"
                  fill="currentColor"
                />
              </svg>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight max-w-lg font-display flex items-baseline justify-center lg:justify-start">
              <span
                className={`inline-block transition-colors duration-150 ${
                  words[currentWordIndex] === 'TIP'
                    ? 'text-[#F59E0B]'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {displayText}
              </span>
              <span
                className="inline-block w-[2px] h-[0.75em] bg-current mx-1 transform translate-y-[0.1em]"
                style={{ animation: 'blink 1s step-start infinite' }}
              ></span>
              <span className="text-slate-900 dark:text-white">{" it."}</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
              Report campus facilities and service issues instantly.
            </p>

            {/* Inline Responsive "Submit Tip" Button & Selection Menu */}
            <div className="relative pt-2 flex flex-col items-center lg:items-start w-full">
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="Submit Tip"
                aria-expanded={isMenuOpen}
                className="p-4 sm:px-6 sm:py-3 rounded-full bg-primary hover:bg-amber-500 text-slate-900 font-bold text-sm shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95"
              >
                <Camera className="w-7 h-7 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline ml-2">Submit Tip</span>
              </button>

              {/* Selection Menu (Dark/Light mode brand colors) */}
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute top-full mt-3 z-30 w-52 py-2 bg-mist dark:bg-midnight bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-all">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        cameraInputRef.current?.click();
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-amber-600 dark:hover:text-amber-400 flex items-center transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4 mr-3 text-amber-500" />
                      <span>Open Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        galleryInputRef.current?.click();
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-amber-600 dark:hover:text-amber-400 flex items-center transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 mr-3 text-amber-500" />
                      <span>Upload Photo</span>
                    </button>
                  </div>
                </>
              )}
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

        {/* Constraint 2: Hidden inputs for native mobile Camera & Gallery triggers */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={cameraInputRef}
          onChange={handlePhotoCapture}
        />
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={galleryInputRef}
          onChange={handlePhotoCapture}
        />

        {/* Create Report Modal for Guest Flow (Triggered by either CTA Button or FAB) */}
        {showReportModal && (
          <GuestReportModal
            isOpen={showReportModal}
            initialPhoto={capturedFile}
            initialPhotos={capturedPhotos}
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
        )}

      </main>
    </div>
  );
}
