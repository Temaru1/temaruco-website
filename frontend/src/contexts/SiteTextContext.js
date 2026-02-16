import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Default texts - fallback when API fails
const DEFAULT_TEXTS = {
  // Homepage
  "home.hero.subtitle": "PREMIUM CLOTHING MANUFACTURING",
  "home.hero.title1": "Quality Clothing,",
  "home.hero.title2": "Made for You",
  "home.hero.description": "From bulk orders for schools and corporates to custom print-on-demand services. Nigeria's trusted clothing factory delivering excellence since day one.",
  "home.hero.cta_primary": "Start Bulk Order",
  "home.hero.cta_secondary": "Track Order",
  "home.services.title": "Our Services",
  "home.services.subtitle": "Everything you need for quality clothing",
  "home.trust.title": "Trusted by Thousands",
  "home.trust.description": "Join hundreds of satisfied customers who trust Temaruco for their clothing needs.",
  
  // Bulk Orders
  "bulk.page.title": "Bulk Orders",
  "bulk.page.subtitle": "Quality clothing for schools, corporates, and events",
  "bulk.step1.title": "Select Item",
  "bulk.step2.title": "Choose Quality",
  "bulk.step3.title": "Select Colors & Sizes",
  "bulk.step4.title": "Review & Order",
  "bulk.min_quantity": "Minimum order: 10 pieces per item",
  
  // Print on Demand
  "pod.page.title": "Print on Demand",
  "pod.page.subtitle": "Custom printed clothing, one piece at a time",
  "pod.design.instructions": "Upload your design, position it on the garment, and add to cart. We'll print and deliver!",
  "pod.upload.button": "Upload Design",
  "pod.contact.title": "Your Contact Info",
  "pod.contact.note": "Required to save your design and process orders.",
  
  // Boutique
  "boutique.page.title": "Boutique",
  "boutique.page.subtitle": "Ready-to-wear Nigerian fashion",
  "boutique.filter.all": "All Products",
  "boutique.filter.traditional": "Traditional",
  "boutique.filter.modern": "Modern",
  
  // Fabrics
  "fabrics.page.title": "Fabrics",
  "fabrics.page.subtitle": "Premium quality fabrics for your projects",
  
  // Souvenirs
  "souvenirs.page.title": "Souvenirs",
  "souvenirs.page.subtitle": "Custom branded merchandise and gifts",
  
  // Cart & Checkout
  "cart.page.title": "Shopping Cart",
  "cart.empty.message": "Your cart is empty",
  "cart.empty.cta": "Continue Shopping",
  "cart.checkout.button": "Proceed to Checkout",
  "checkout.title": "Order Summary",
  "checkout.payment.title": "Payment Method",
  
  // Footer
  "footer.company.name": "Temaruco Clothing Factory",
  "footer.company.description": "Nigeria's trusted clothing manufacturer since day one.",
  "footer.contact.title": "Contact Us",
  "footer.links.title": "Quick Links",
  "footer.services.title": "Services",
  "footer.copyright": "© 2024 Temaruco Clothing Factory. All rights reserved.",
  
  // Navigation
  "nav.bulk_orders": "Bulk Orders",
  "nav.print_on_demand": "Print-On-Demand",
  "nav.custom_order": "Custom Order",
  "nav.boutique": "Boutique",
  "nav.fabrics": "Fabrics",
  "nav.souvenirs": "Souvenirs",
  "nav.design_services": "Design Services",
  "nav.contact": "Contact",
  
  // Common buttons
  "btn.add_to_cart": "Add to Cart",
  "btn.buy_now": "Buy Now",
  "btn.continue": "Continue",
  "btn.back": "Back",
  "btn.submit": "Submit",
  "btn.save": "Save",
  "btn.cancel": "Cancel",
  
  // Contact Page
  "contact.page.title": "Contact Us",
  "contact.page.subtitle": "We'd love to hear from you",
  "contact.form.title": "Send us a message",
  "contact.address.title": "Our Address",
  "contact.hours.title": "Business Hours",
  
  // About Page
  "about.page.title": "About Us",
  "about.page.subtitle": "Our story and mission",
  "about.mission.title": "Our Mission",
  "about.values.title": "Our Values",
  
  // Design Services
  "design_services.page.title": "Design Services",
  "design_services.page.subtitle": "Professional design help for your projects",
  
  // Order Tracking
  "tracking.page.title": "Track Your Order",
  "tracking.placeholder": "Enter your order code",
  "tracking.button": "Track Order",
};

// Cache configuration
const CACHE_TTL_MS = 60 * 1000; // 60 seconds
const CACHE_KEY = 'site_texts_cache';

const SiteTextContext = createContext();

export const SiteTextProvider = ({ children }) => {
  const [texts, setTexts] = useState(DEFAULT_TEXTS);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const fetchingRef = useRef(false);

  // Load texts from cache or API
  const loadTexts = useCallback(async (force = false) => {
    // Prevent concurrent fetches
    if (fetchingRef.current && !force) return;
    
    // Check cache first
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { texts: cachedTexts, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (age < CACHE_TTL_MS) {
            setTexts(prev => ({ ...DEFAULT_TEXTS, ...cachedTexts }));
            setLastFetch(new Date(timestamp));
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Cache read error:', e);
      }
    }
    
    fetchingRef.current = true;
    
    try {
      const response = await axios.get(`${API_URL}/api/site-texts`);
      const fetchedTexts = response.data.texts || {};
      
      // Merge with defaults
      const mergedTexts = { ...DEFAULT_TEXTS, ...fetchedTexts };
      setTexts(mergedTexts);
      
      // Update cache
      const cacheData = {
        texts: fetchedTexts,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setLastFetch(new Date());
      
    } catch (error) {
      console.error('Failed to fetch site texts:', error);
      // Keep using defaults/cached texts on error
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadTexts();
  }, [loadTexts]);

  // Re-fetch on page visibility change (when user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if cache is stale
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          if (age >= CACHE_TTL_MS) {
            loadTexts(true);
          }
        } else {
          loadTexts(true);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadTexts]);

  // Force refresh function (for admin use)
  const refreshTexts = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    return loadTexts(true);
  }, [loadTexts]);

  // Get text by key with fallback
  const getText = useCallback((key, fallback = '') => {
    return texts[key] || DEFAULT_TEXTS[key] || fallback;
  }, [texts]);

  return (
    <SiteTextContext.Provider value={{ 
      texts, 
      getText, 
      loading, 
      lastFetch, 
      refreshTexts,
      isReady: !loading 
    }}>
      {children}
    </SiteTextContext.Provider>
  );
};

// Hook for components
export const useSiteText = (key, fallback = '') => {
  const context = useContext(SiteTextContext);
  if (!context) {
    console.warn('useSiteText must be used within SiteTextProvider');
    return DEFAULT_TEXTS[key] || fallback;
  }
  return context.getText(key, fallback);
};

// Hook for multiple texts
export const useSiteTexts = () => {
  const context = useContext(SiteTextContext);
  if (!context) {
    return { 
      texts: DEFAULT_TEXTS, 
      getText: (key, fallback) => DEFAULT_TEXTS[key] || fallback,
      loading: false,
      refreshTexts: () => {}
    };
  }
  return context;
};

export default SiteTextContext;
