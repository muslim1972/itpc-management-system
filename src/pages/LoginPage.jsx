import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/main');
      } else {
        alert(data.error);
      }
    } catch {
      alert('Cannot connect to server. Is the backend running?');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white flex items-center justify-center px-4 sm:px-6 lg:px-8 relative">
      {/* Home button at top-left corner */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8">
        <a
          href="https://inf-tele-karbala.vercel.app/"
          className="flex items-center gap-2 text-blue-700 hover:text-blue-800 font-medium text-sm sm:text-base transition-all duration-200 hover:underline bg-white/80 hover:bg-white px-3 py-1.5 rounded-lg shadow-sm"
        >
          <span>🏠</span>
          <span>الرئيسية</span>
        </a>
      </div>

      {/* Admin link at top-right corner */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
        <Link
          to="/admin"
          className="text-blue-700 hover:text-blue-800 font-medium text-sm sm:text-base transition-all duration-200 hover:underline"
        >
          Admin
        </Link>
      </div>

      {/* Centered login card */}
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 sm:p-10 md:p-12">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">ITPC Management System</h1>
            <p className="text-gray-600 text-sm sm:text-base">Sign in to your account</p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200 hover:border-gray-400"
                placeholder="Enter your username"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200 hover:border-gray-400"
                placeholder="Enter your password"
              />
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

