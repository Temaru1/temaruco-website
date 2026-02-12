import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    
    // Prevent double execution in React StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          console.error('No session_id found');
          toast.error('Authentication failed. Please try again.');
          navigate('/login');
          return;
        }

        // Exchange session_id for user data
        const response = await axios.post(
          `${API_URL}/api/auth/google-session`,
          { session_id: sessionId },
          { withCredentials: true }
        );

        const { user } = response.data;

        // Store user in localStorage for quick access
        localStorage.setItem('user', JSON.stringify(user));

        // Show success message
        toast.success(`Welcome back, ${user.name}!`, {
          description: 'You have successfully signed in with Google.'
        });

        // Check for pending quote and redirect accordingly
        const pendingQuote = localStorage.getItem('pendingQuote');
        if (pendingQuote) {
          navigate('/bulk-orders', { state: { user }, replace: true });
        } else {
          navigate('/dashboard', { state: { user }, replace: true });
        }
      } catch (error) {
        console.error('Auth error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
      }
    };

    processSession();
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="text-center">
        <div className="loading-spinner mb-4"></div>
        <p className="font-manrope text-zinc-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
