import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';

const MainPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/organizations');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load organizations');
        }

        setOrganizations(data.organizations || []);
      } catch (err) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' ? true : org.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleDetailsClick = (orgId) => {
    navigate(`/detail/${orgId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search organization…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base transition-all duration-200 hover:border-gray-400"
              />
            </div>

            <div className="sm:w-48">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base bg-white transition-all duration-200 hover:border-gray-400"
              >
                <option value="all">All Organizations</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 sm:px-8 py-5 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">Organizations</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-6 sm:px-8 py-12 text-center">
                <p className="text-gray-500 text-base sm:text-lg">
                  Loading organizations...
                </p>
              </div>
            ) : error ? (
              <div className="px-6 sm:px-8 py-12 text-center">
                <p className="text-red-500 text-base sm:text-lg">
                  {error}
                </p>
              </div>
            ) : filteredOrganizations.length > 0 ? (
              filteredOrganizations.map((org) => (
                <div
                  key={org.id}
                  className="px-6 sm:px-8 py-5 hover:bg-blue-50/50 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900">
                        {org.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {org.location || 'No location'} • {org.status || 'unknown'}
                      </p>
                    </div>

                    <div>
                      <button
                        onClick={() => handleDetailsClick(org.id)}
                        className="px-5 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:shadow-md hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:-translate-y-0.5"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 sm:px-8 py-12 text-center">
                <p className="text-gray-500 text-base sm:text-lg">
                  No organizations found matching your search.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainPage;