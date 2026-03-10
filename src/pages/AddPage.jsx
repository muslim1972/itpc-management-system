import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SlideMenu from '../components/SlideMenu';

const AddPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');
  const navigate = useNavigate();

  // Dummy company data
  const companies = [
    { name: 'Baghdad Telecom', type: 'Government' },
    { name: 'Karbala Net', type: 'Private' },
    { name: 'Basra Fiber', type: 'ISP' },
    { name: 'Najaf Wireless', type: 'Private' },
  ];

  // Filter companies based on search and filter
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'All' || company.type === filter;
    return matchesSearch && matchesFilter;
  });

  const handleAddClick = (companyName) => {
    navigate('/new-contract', { state: { companyName } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-100 to-white">
      <Navbar onMenuClick={() => setIsMenuOpen(true)} />
      <SlideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Add New Entry</h1>
          
          {/* Search bar and filter */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search bar */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base transition-all duration-200 hover:border-gray-400"
                />
              </div>
              
              {/* Filter dropdown */}
              <div className="sm:w-48">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base bg-white transition-all duration-200 hover:border-gray-400"
                >
                  <option value="All">All</option>
                  <option value="Government">Government</option>
                  <option value="Private">Private</option>
                  <option value="ISP">ISP</option>
                </select>
              </div>
            </div>
          </div>

          {/* Companies list */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 sm:px-8 py-5 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900">Companies</h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company, index) => (
                  <div
                    key={index}
                    className="px-6 sm:px-8 py-5 hover:bg-blue-50/50 transition-all duration-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {/* Company name */}
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-medium text-gray-900">
                          {company.name}
                        </h3>
                      </div>
                      
                      {/* Add button */}
                      <div>
                        <button
                          onClick={() => handleAddClick(company.name)}
                          className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 hover:shadow-md hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:-translate-y-0.5"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 sm:px-8 py-12 text-center">
                  <p className="text-gray-500 text-base sm:text-lg">
                    No companies found matching your search.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddPage;

