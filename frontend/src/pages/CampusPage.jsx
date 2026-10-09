import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import CampusMap from '../components/CampusMap/CampusMap';
import GuestReportModal from '../components/GuestReportModal';

export default function CampusPage({ currentUser, onLogout }) {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');

  const handleOpenModal = (locationString) => {
    setSelectedLocation(locationString);
    setIsReportModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar user={currentUser} onLogout={onLogout} />
      <main className="flex-1 relative w-full h-[calc(100vh-4rem)] overflow-hidden">
        <CampusMap mode="public" onLocationSelect={handleOpenModal} />
      </main>

      {isReportModalOpen && (
        <GuestReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          initialLocation={selectedLocation}
        />
      )}
    </div>
  );
}
