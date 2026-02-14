import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const PAYSTACK_PUBLIC_KEY = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;

const PaystackPayment = ({ 
  orderId, 
  orderType, 
  amount, 
  email, 
  customerName,
  onSuccess, 
  onClose 
}) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!window.PaystackPop) {
      toast.error('Payment service not loaded. Please refresh the page.');
      return;
    }

    setLoading(true);

    try {
      // Initialize payment on backend to get reference
      const initResponse = await axios.post(`${API_URL}/api/payments/initialize`, {
        email: email,
        amount: amount,
        order_id: orderId,
        order_type: orderType,
        metadata: {
          customer_name: customerName
        }
      });

      const paymentData = initResponse.data.data;

      // Open Paystack popup
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: amount * 100, // Convert to kobo
        ref: paymentData.reference,
        onClose: function() {
          toast.info('Payment cancelled');
          setLoading(false);
          if (onClose) onClose();
        },
        callback: async function(response) {
          // Verify payment on backend
          try {
            const verifyResponse = await axios.get(
              `${API_URL}/api/payments/verify/${response.reference}`
            );

            if (verifyResponse.data.status === 'success') {
              toast.success('Payment successful!');
              
              // Send status update email
              try {
                await axios.post(`${API_URL}/api/orders/${orderId}/send-status-email`);
              } catch (emailError) {
                console.error('Failed to send email:', emailError);
              }
              
              if (onSuccess) {
                onSuccess(verifyResponse.data);
              }
            } else {
              toast.error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error(error.response?.data?.detail || 'Payment verification failed');
          } finally {
            setLoading(false);
          }
        }
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error(error.response?.data?.detail || 'Failed to initialize payment');
      setLoading(false);
    }
  };

  return (
    <div className="payment-section mt-6">
      <button
        onClick={handlePayment}
        disabled={loading || !PAYSTACK_PUBLIC_KEY}
        className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
        data-testid="pay-with-paystack-btn"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            Processing...
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Pay ₦{amount.toLocaleString()} with Paystack
          </>
        )}
      </button>

      {!PAYSTACK_PUBLIC_KEY && (
        <p className="text-sm text-red-600 mt-2 text-center">
          Payment configuration error. Please contact support.
        </p>
      )}

      <p className="text-xs text-zinc-500 text-center mt-3">
        Secure payment powered by Paystack
      </p>
    </div>
  );
};

export default PaystackPayment;
