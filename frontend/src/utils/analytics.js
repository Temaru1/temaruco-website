import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

// Track page visit (excluding admins)
export const trackVisit = async () => {
  try {
    await axios.post(`${API_URL}/api/track-visit`, {}, { withCredentials: true });
  } catch (error) {
    // Silently fail - don't disrupt user experience
    console.log('Visit tracking failed:', error);
  }
};

// Get visitor analytics (admin only)
export const getVisitorStats = async (days = 30) => {
  try {
    const response = await axios.get(`${API_URL}/api/admin/analytics/visitors?days=${days}`, {
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
