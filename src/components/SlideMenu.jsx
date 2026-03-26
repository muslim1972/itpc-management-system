import React from 'react';
import { useNavigate } from 'react-router-dom';

const SlideMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    if (path === 'logout') {
      // Redirect to the main portal (InfTeleKarbala launcher)
      localStorage.removeItem('user');
      window.location.href = 'https://inf-tele-karbala.vercel.app/';
      return;
    }
    navigate(path);
    onClose();
  };

  const menuItems = [
    { label: 'لوحة التحكم الإدارية', path: '/admin' },
    { label: 'Add', path: '/add' },
    { label: 'Statistics', path: '/statistics' },
    { label: 'History', path: '/history' },
    { label: 'Logout', path: 'logout' },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Slide menu */}
      <div
        className={`fixed top-0 right-0 h-full w-64 sm:w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-200"
              aria-label="Close menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Menu items */}
          <div className="flex-1 p-4">
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className="w-full text-left px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-all duration-200 flex items-center"
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default SlideMenu;

