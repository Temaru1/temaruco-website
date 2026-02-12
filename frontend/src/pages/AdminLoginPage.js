import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
console.log('AdminLoginPage API_URL:', API_URL);

const AdminLoginPage = ({ loginUser, isSuperAdmin = false }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!credentials.username.trim()) {
      toast.error('Please enter your username');
      return;
    }
    
    if (!credentials.password) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        {
          email: credentials.username, // Backend accepts username in email field
          password: credentials.password
        },
        {
          withCredentials: true
        }
      );

      const user = response.data.user;
      
      // Check permissions based on login type
      if (isSuperAdmin) {
        if (!user.is_super_admin) {
          toast.error('Access denied. Super Admin credentials required.');
          return;
        }
      } else {
        if (!user.is_admin) {
          toast.error('Access denied. Admin credentials required.');
          return;
        }
      }

      toast.success(`Welcome back, ${user.name}!`);
      
      // Save to localStorage and update state - correct order: token first, then user
      loginUser(response.data.token, user);
      
      // Small delay to ensure state updates before redirect
      setTimeout(() => {
        navigate('/admin/dashboard/', { replace: true });
      }, 100);
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.status === 404) {
        toast.error('Invalid username. Please check your credentials.');
      } else if (error.response?.status === 401) {
        toast.error('Incorrect password. Please try again.');
      } else if (error.response?.status === 400) {
        // Handle 400 errors (like wrong email format or other validation)
        const detail = error.response?.data?.detail;
        const message = typeof detail === 'string' ? detail : 'Invalid credentials. Please try again.';
        toast.error(message);
      } else {
        // Generic error handling - ensure we always show a string
        const detail = error.response?.data?.detail;
        const message = typeof detail === 'string' ? detail : 'Login failed. Please try again.';
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="font-oswald text-4xl font-bold text-white mb-2">
            {isSuperAdmin ? 'Super Admin Portal' : 'Admin Portal'}
          </h1>
          <p className="text-zinc-400">
            {isSuperAdmin ? 'Super Admin access only' : 'Sign in to access the admin dashboard'}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </div>
              </label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your username"
                data-testid="admin-username-input"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </div>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your password"
                  data-testid="admin-password-input"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 transition-colors"
                  data-testid="toggle-password-visibility"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              data-testid="admin-login-btn"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Signing In...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  {isSuperAdmin ? 'Sign In as Super Admin' : 'Sign In as Admin'}
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-zinc-600">
              {isSuperAdmin ? 'Super Admin account only' : 'Admin accounts are created by Super Admin only'}
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-zinc-400 hover:text-white transition-colors text-sm"
          >
            ← Back to Homepage
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
