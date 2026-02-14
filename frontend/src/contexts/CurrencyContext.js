import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

// Exchange rate: 1 USD = ~1,580 NGN (adjust as needed)
const USD_TO_NGN_RATE = 1580;

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState({
    code: 'NGN',
    symbol: '₦',
    isNigeria: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/currency/detect`);
      const isNigeria = response.data.country_code === 'NG';
      
      setCurrency({
        code: isNigeria ? 'NGN' : 'USD',
        symbol: isNigeria ? '₦' : '$',
        isNigeria: isNigeria
      });
    } catch (error) {
      console.error('Failed to detect location:', error);
      // Default to NGN if detection fails
      setCurrency({
        code: 'NGN',
        symbol: '₦',
        isNigeria: true
      });
    } finally {
      setLoading(false);
    }
  };

  // Convert NGN amount to USD (for non-Nigerian visitors)
  const convertPrice = (amountNGN) => {
    if (!amountNGN || isNaN(amountNGN)) return 0;
    if (currency.isNigeria) return amountNGN;
    // Convert NGN to USD
    return Math.round((amountNGN / USD_TO_NGN_RATE) * 100) / 100;
  };

  // Format price with currency symbol
  const formatPrice = (amountNGN) => {
    const converted = convertPrice(amountNGN);
    
    if (currency.isNigeria) {
      // Nigerian format: ₦2,500
      return `₦${converted.toLocaleString()}`;
    } else {
      // USD format: $1.58
      return `$${converted.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      loading,
      convertPrice,
      formatPrice,
      isNigeria: currency.isNigeria
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
