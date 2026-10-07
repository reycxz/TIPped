import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import TippedLogo from '../components/TippedLogo';
import CreateReport from './CreateReport';
import CameraFAB from '../components/CameraFAB';
import Login from './Login';
import Register from './Register';
import { Camera, X } from 'lucide-react';

export default function Landing({ onLoginSuccess }) {
  const location = useLocation();
  const [showReportModal, setShowReportModal] = useState(false);
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

  const handleCapture = (photos) => {
    setCapturedPhotos(photos);
    setShowReportModal(true);
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      {/* Header */}
      <header className="w-full border-b border-surface/50 bg-surface/50 backdrop-blur-md sticky top-0 z-30 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="landing-brand"
            aria-label="TIPped"
          >
            <TippedLogo />
          </Link>
        </div>
      </header>

      {/* Main Section - Constraint 1: Perfectly Vertically Centered on Y-Axis */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center my-auto">
          {/* Left Column: Hero Text + Constraint 2: Prominent Guest CTA Button */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text leading-tight max-w-lg">
              Got issues? <br className="hidden sm:inline" />
              <span className="text-primary">TIP it.</span>
            </h1>

            <p className="text-base sm:text-lg text-muted max-w-md leading-relaxed">
              See it. Snap it. TIP it. Report campus facilities and service issues instantly.
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

        {/* Create Report Modal for Guest Flow (Triggered by either CTA Button or FAB) */}
        {showReportModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-4 flex items-center justify-center">
            <div className="w-full max-w-2xl relative my-8">
              <CreateReport
                isGuest={true}
                initialPhotos={capturedPhotos}
                onCancel={() => {
                  setShowReportModal(false);
                  setCapturedPhotos([]);
                }}
                onClose={() => {
                  setShowReportModal(false);
                  setCapturedPhotos([]);
                }}
                onSuccess={() => {
                  setShowReportModal(false);
                  setCapturedPhotos([]);
                }}
              />
            </div>
          </div>
        )}

        {/* Constraint 3: Mobile-First Camera FAB strictly hidden on desktop screens (md:hidden) */}
        <CameraFAB onCapture={handleCapture} className="md:hidden" />
      </main>
    </div>
  );
}
