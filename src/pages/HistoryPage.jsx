import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';

const HistoryPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">History</h1>
          <p className="text-gray-600 text-base sm:text-lg">Coming Soon</p>
        </div>
      </main>
    </div>
  );
};

export default HistoryPage;

