import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

// Cache for CMS data to avoid repeated API calls
let cmsCache = {
  images: null,
  settings: null,
  lastFetch: 0
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch CMS images
 */
export const getCMSImages = async (forceRefresh = false) => {
  const now = Date.now();
  
  if (!forceRefresh && cmsCache.images && (now - cmsCache.lastFetch) < CACHE_DURATION) {
    return cmsCache.images;
  }

  try {
    const response = await axios.get(`${API_URL}/api/cms/images`);
    const imagesMap = {};
    response.data.forEach(img => {
      imagesMap[img.section] = `${API_URL}${img.file_path}`;
    });
    cmsCache.images = imagesMap;
    cmsCache.lastFetch = now;
    return imagesMap;
  } catch (error) {
    console.error('Failed to load CMS images:', error);
    return {};
  }
};

/**
 * Fetch CMS settings including logo
 */
export const getCMSSettings = async (forceRefresh = false) => {
  const now = Date.now();
  
  if (!forceRefresh && cmsCache.settings && (now - cmsCache.lastFetch) < CACHE_DURATION) {
    return cmsCache.settings;
  }

  try {
    const response = await axios.get(`${API_URL}/api/cms/settings`);
    cmsCache.settings = response.data;
    cmsCache.lastFetch = now;
    return response.data;
  } catch (error) {
    console.error('Failed to load CMS settings:', error);
    return {
      logo_url: '',
      company_name: 'Temaruco Clothing Factory'
    };
  }
};

/**
 * Get logo URL from CMS or images
 */
export const getLogoURL = async () => {
  // Try settings first
  const settings = await getCMSSettings();
  if (settings.logo_url) {
    return settings.logo_url.startsWith('http') ? settings.logo_url : `${API_URL}${settings.logo_url}`;
  }
  
  // Try CMS images
  const images = await getCMSImages();
  if (images.logo) {
    return images.logo;
  }
  
  // No fallback - return null to show text logo
  return null;
};

/**
 * Clear CMS cache (call after updates)
 */
export const clearCMSCache = () => {
  cmsCache = {
    images: null,
    settings: null,
    lastFetch: 0
  };
};
