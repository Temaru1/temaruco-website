/**
 * Shared Image Utilities
 * Used across all modules: Bulk, POD, Fabrics, Boutique, Souvenirs
 */

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Resolves image URL to full path
 * Handles various URL formats from backend
 */
export const getImageUrl = (url) => {
  if (!url) return '';
  
  // Already a full URL (http/https)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // API uploads path - prepend API URL
  if (url.startsWith('/api/uploads')) {
    return `${API_URL}${url}`;
  }
  
  // Legacy uploads path - convert to /api/uploads
  if (url.startsWith('/uploads')) {
    return `${API_URL}/api${url}`;
  }
  
  // Relative path without leading slash
  if (!url.startsWith('/')) {
    return `${API_URL}/api/uploads/${url}`;
  }
  
  return url;
};

/**
 * Default placeholder image generator
 */
export const getPlaceholderImage = (text, width = 400, height = 400) => {
  return `https://placehold.co/${width}x${height}/e2e8f0/64748b?text=${encodeURIComponent(text)}`;
};

/**
 * Image error handler - sets placeholder on load failure
 */
export const handleImageError = (e, productName) => {
  e.target.src = getPlaceholderImage(productName || 'Product');
};

/**
 * CSS classes for different image display modes
 */
export const imageStyles = {
  // For catalog/grid thumbnails - contain full outfit
  thumbnail: {
    className: 'w-full h-full object-contain object-center',
    containerStyle: { backgroundColor: '#ffffff' }
  },
  
  // For large preview on variation/selection pages
  largePreview: {
    className: 'object-contain max-h-[450px] w-auto',
    containerClassName: 'max-h-[450px] w-full flex justify-center items-center bg-white'
  },
  
  // For small inline previews
  smallPreview: {
    className: 'w-16 h-16 object-contain object-center rounded-lg',
    containerStyle: { backgroundColor: '#ffffff' }
  }
};

export default {
  getImageUrl,
  getPlaceholderImage,
  handleImageError,
  imageStyles
};
