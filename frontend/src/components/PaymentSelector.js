import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FlutterwavePayment from './FlutterwavePayment';
import { Globe, MapPin, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const PaymentSelector = ({
  orderId,
  orderType,
  amount,  // Amount in NGN
  email,
  customerName,
  phone,
  onSuccess,
  onClose
}) => {
  const [currency, setCurrency] = useState('NGN');
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Detect user location for currency preference
    const detectLocation = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/payments/provider`);
        setCurrency(response.data.currency || 'NGN');
        setDetectedLocation({
          isNigerian: response.data.is_nigerian,
          country: response.data.country_detected
        });
      } catch {
        // Default to NGN
        setCurrency('NGN');
        setDetectedLocation({ isNigerian: true, country: 'NG' });
      } finally {
        setLoading(false);
      }
    };

    detectLocation();
  }, []);

  const toggleCurrency = () => {
    setCurrency(prev => prev === 'NGN' ? 'USD' : 'NGN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-zinc-600">Detecting your location...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Location indicator */}
      <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-zinc-500" />
          <span className="text-sm text-zinc-600">
            {detectedLocation?.isNigerian ? 'Nigeria' : 'International'} • {currency === 'NGN' ? '🇳🇬 Naira' : '🌍 USD'}
          </span>
        </div>
        <button
          onClick={toggleCurrency}
          className="text-xs text-primary hover:underline flex items-center gap-1"
          data-testid="switch-currency-btn"
        >
          <Globe size={14} />
          Switch to {currency === 'NGN' ? 'USD' : 'NGN'}
        </button>
      </div>

      {/* Flutterwave Payment Button */}
      <FlutterwavePayment
        orderId={orderId}
        orderType={orderType}
        amount={amount}
        email={email}
        customerName={customerName}
        phone={phone}
        currency={currency}
        onSuccess={onSuccess}
        onClose={onClose}
      />

      {/* Payment info */}
      <div className="border-t pt-4 mt-4">
        <p className="text-xs text-zinc-500 text-center">
          {currency === 'NGN' 
            ? '🇳🇬 Pay with Nigerian bank cards, bank transfer, USSD, or mobile money'
            : '🌍 Pay with international Visa/Mastercard'
          }
        </p>
      </div>
    </div>
  );
};

export default PaymentSelector;
