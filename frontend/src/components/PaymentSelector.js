import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PaystackPayment from './PaystackPayment';
import StripePayment from './StripePayment';
import { Globe, MapPin } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

const PaymentSelector = ({
  orderId,
  orderType,
  amount,  // Amount in NGN
  email,
  customerName,
  onSuccess,
  onClose
}) => {
  const [provider, setProvider] = useState(null);
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [manualOverride, setManualOverride] = useState(false);

  useEffect(() => {
    // Detect user location and recommended payment provider
    const detectProvider = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/payments/provider`);
        setProvider(response.data.provider);
        setDetectedLocation({
          isNigerian: response.data.is_nigerian,
          country: response.data.country_detected
        });
      } catch {
        // Default to Paystack for Nigeria
        setProvider('paystack');
        setDetectedLocation({ isNigerian: true, country: 'NG' });
      } finally {
        setLoading(false);
      }
    };

    detectProvider();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-zinc-600">Detecting your location...</span>
      </div>
    );
  }

  const currentProvider = manualOverride ? (provider === 'paystack' ? 'stripe' : 'paystack') : provider;

  return (
    <div className="space-y-4">
      {/* Location indicator */}
      <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-zinc-500" />
          <span className="text-sm text-zinc-600">
            {detectedLocation?.isNigerian ? 'Nigeria' : 'International'} payment
          </span>
        </div>
        <button
          onClick={() => setManualOverride(!manualOverride)}
          className="text-xs text-primary hover:underline flex items-center gap-1"
          data-testid="switch-payment-provider"
        >
          <Globe size={14} />
          {manualOverride ? 'Use detected location' : 'Pay in different currency'}
        </button>
      </div>

      {/* Payment buttons */}
      {currentProvider === 'paystack' ? (
        <div>
          <PaystackPayment
            orderId={orderId}
            orderType={orderType}
            amount={amount}
            email={email}
            customerName={customerName}
            onSuccess={onSuccess}
            onClose={onClose}
          />
          {!detectedLocation?.isNigerian && (
            <p className="text-xs text-amber-600 text-center mt-2">
              Note: Paystack is optimized for Nigerian cards. International cards may not work.
            </p>
          )}
        </div>
      ) : (
        <div>
          <StripePayment
            orderId={orderId}
            orderType={orderType}
            amountNGN={amount}
            email={email}
            customerName={customerName}
            onSuccess={onSuccess}
            onClose={onClose}
          />
          {detectedLocation?.isNigerian && (
            <p className="text-xs text-amber-600 text-center mt-2">
              Note: Stripe charges in USD. Exchange rate applied.
            </p>
          )}
        </div>
      )}

      {/* Payment info */}
      <div className="border-t pt-4 mt-4">
        <p className="text-xs text-zinc-500 text-center">
          {currentProvider === 'paystack' 
            ? '🇳🇬 Best for Nigerian bank cards and transfers'
            : '🌍 Best for international Visa/Mastercard payments'
          }
        </p>
      </div>
    </div>
  );
};

export default PaymentSelector;
