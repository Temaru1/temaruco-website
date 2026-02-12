import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, MapPin, Clock, Calendar, ArrowRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const CareersPage = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery, selectedDepartment]);

  const loadJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/careers/jobs`);
      setJobs(response.data);
    } catch (error) {
      toast.error('Failed to load jobs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    let filtered = jobs;

    if (selectedDepartment !== 'All') {
      filtered = filtered.filter(job => job.department === selectedDepartment);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(query) ||
        job.description.toLowerCase().includes(query) ||
        job.department.toLowerCase().includes(query)
      );
    }

    setFilteredJobs(filtered);
  };

  const departments = ['All', ...new Set(jobs.map(j => j.department))];

  const getEmploymentTypeColor = (type) => {
    const colors = {
      'Full-time': 'bg-green-100 text-green-800',
      'Part-time': 'bg-blue-100 text-blue-800',
      'Contract': 'bg-purple-100 text-purple-800',
      'Internship': 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-zinc-100 text-zinc-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Briefcase size={64} className="mx-auto mb-4 text-primary" />
          <h1 className="font-oswald text-5xl font-bold mb-4">Join Our Team</h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
            Build your career with Temaruco Clothing Factory. We're always looking for talented individuals to join our growing team.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
              <input
                type="text"
                placeholder="Search jobs by title, department, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="job-search-input"
              />
            </div>
            <div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-4 py-3 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
          {(searchQuery || selectedDepartment !== 'All') && (
            <p className="text-sm text-zinc-600 mt-3">
              Found {filteredJobs.length} {filteredJobs.length === 1 ? 'position' : 'positions'}
            </p>
          )}
        </div>

        {/* Job Listings */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Briefcase size={64} className="mx-auto mb-4 text-zinc-400" />
            <h3 className="text-2xl font-bold mb-2">No Positions Available</h3>
            <p className="text-zinc-600 mb-6">
              {searchQuery || selectedDepartment !== 'All'
                ? 'Try adjusting your search or filter criteria'
                : 'We don\'t have any open positions at the moment. Check back soon!'}
            </p>
            <p className="text-sm text-zinc-500">
              Want to stay updated? Follow us on social media for job announcements.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredJobs.map(job => (
              <div
                key={job.id}
                className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow"
                data-testid={`job-card-${job.id}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="font-oswald text-2xl font-bold mb-2">{job.title}</h2>
                    <div className="flex flex-wrap gap-3 mb-3">
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                        {job.department}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getEmploymentTypeColor(job.employment_type)}`}>
                        {job.employment_type}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/careers/apply/${job.id}`)}
                    className="btn-primary flex items-center gap-2"
                    data-testid={`apply-btn-${job.id}`}
                  >
                    Apply Now
                    <ArrowRight size={18} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-6 mb-4 text-sm text-zinc-600">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    {job.location}
                  </div>
                  {job.salary_range && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Salary:</span>
                      {job.salary_range}
                    </div>
                  )}
                  {job.application_deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      Apply by: {new Date(job.application_deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <p className="text-zinc-700 mb-4 line-clamp-2">{job.description}</p>

                {job.responsibilities && job.responsibilities.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Key Responsibilities:</h3>
                    <ul className="list-disc list-inside text-sm text-zinc-600 space-y-1">
                      {job.responsibilities.slice(0, 3).map((resp, index) => (
                        <li key={index}>{resp}</li>
                      ))}
                      {job.responsibilities.length > 3 && (
                        <li className="text-primary">+ {job.responsibilities.length - 3} more...</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-sm text-zinc-500">
                    Posted {new Date(job.posted_date).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => navigate(`/careers/${job.id}`)}
                    className="text-primary hover:underline font-semibold"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Why Join Us Section */}
        <div className="mt-16 bg-primary text-white rounded-xl shadow-xl p-12">
          <h2 className="font-oswald text-3xl font-bold mb-6 text-center">Why Work With Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-3">🚀</div>
              <h3 className="font-bold text-xl mb-2">Career Growth</h3>
              <p className="text-white/90">Opportunities for professional development and advancement</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🤝</div>
              <h3 className="font-bold text-xl mb-2">Great Team</h3>
              <p className="text-white/90">Work with talented and passionate individuals</p>
            </div>
            <div className="text-4xl mb-3 text-center">💼</div>
            <div className="text-center">
              <h3 className="font-bold text-xl mb-2">Competitive Benefits</h3>
              <p className="text-white/90">Attractive compensation and benefits package</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareersPage;
