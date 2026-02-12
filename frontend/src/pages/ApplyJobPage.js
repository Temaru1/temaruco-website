import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const ApplyJobPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    applicant_name: '',
    email: '',
    phone: '',
    address: '',
    cv_url: '',
    cover_letter: '',
    experience_years: '',
    education: ''
  });

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/careers/jobs/${jobId}`);
      setJob(response.data);
    } catch (error) {
      toast.error('Job not found');
      navigate('/careers');
    } finally {
      setLoading(false);
    }
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('CV file size must be less than 5MB');
      return;
    }

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await axios.post(
        `${API_URL}/api/admin/applications/upload`,
        formDataUpload,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setFormData({
        ...formData,
        cv_url: response.data.file_path
      });
      toast.success('CV uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload CV');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cv_url) {
      toast.error('Please upload your CV');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(`${API_URL}/api/careers/apply`, {
        ...formData,
        job_id: job.id,
        job_title: job.title
      });

      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <CheckCircle size={80} className="mx-auto mb-6 text-green-500" />
            <h1 className="font-oswald text-4xl font-bold mb-4">Application Submitted!</h1>
            <p className="text-xl text-zinc-600 mb-8">
              Thank you for applying for the {job.title} position. We've received your application and will review it shortly.
            </p>
            <p className="text-zinc-600 mb-8">
              You should receive a confirmation email at <strong>{formData.email}</strong>
            </p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => navigate('/careers')} className="btn-primary">
                View More Jobs
              </button>
              <button onClick={() => navigate('/')} className="btn-outline">
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/careers')}
          className="flex items-center gap-2 text-primary hover:underline mb-6"
        >
          <ArrowLeft size={20} />
          Back to Careers
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h1 className="font-oswald text-3xl font-bold mb-2">Apply for {job.title}</h1>
          <p className="text-zinc-600">{job.department} • {job.location}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <h2 className="font-oswald text-2xl font-bold mb-6">Application Form</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-semibold text-sm mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.applicant_name}
                onChange={(e) => setFormData({...formData, applicant_name: e.target.value})}
                className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
                data-testid="applicant-name-input"
              />
            </div>

            <div>
              <label className="block font-semibold text-sm mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-sm mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-sm mb-2">
                Years of Experience *
              </label>
              <input
                type="number"
                value={formData.experience_years}
                onChange={(e) => setFormData({...formData, experience_years: e.target.value})}
                className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-sm mb-2">
              Address *
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              rows="2"
              className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            ></textarea>
          </div>

          <div>
            <label className="block font-semibold text-sm mb-2">
              Education *
            </label>
            <textarea
              value={formData.education}
              onChange={(e) => setFormData({...formData, education: e.target.value})}
              rows="3"
              placeholder="e.g., Bachelor's Degree in Fashion Design from University of Lagos"
              className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            ></textarea>
          </div>

          <div>
            <label className="block font-semibold text-sm mb-2">
              Cover Letter *
            </label>
            <textarea
              value={formData.cover_letter}
              onChange={(e) => setFormData({...formData, cover_letter: e.target.value})}
              rows="6"
              placeholder="Tell us why you're a great fit for this position..."
              className="w-full px-4 py-2 border-2 border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            ></textarea>
          </div>

          <div>
            <label className="block font-semibold text-sm mb-2">
              Upload CV/Resume *
            </label>
            <div className="flex gap-3 items-center">
              <label className="btn-outline flex items-center gap-2 cursor-pointer">
                <Upload size={18} />
                {uploading ? 'Uploading...' : formData.cv_url ? 'Change CV' : 'Upload CV'}
                <input
                  type="file"
                  onChange={handleCVUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  disabled={uploading}
                />
              </label>
              {formData.cv_url && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <FileText size={16} />
                  CV uploaded
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Supported formats: PDF, DOC, DOCX (Max 5MB)
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || uploading}
              className="btn-primary w-full"
              data-testid="submit-application-btn"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyJobPage;
