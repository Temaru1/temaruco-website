import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
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

  const config = {
    reference: `${orderId}-${Date.now()}`,
    email: email,
    amount: amount * 100, // Convert to kobo
    publicKey: PAYSTACK_PUBLIC_KEY,
    metadata: {
      order_id: orderId,
      order_type: orderType,
      customer_name: customerName
    }
  };

  const initializePaystackPayment = usePaystackPayment(config);

  const handlePaystackSuccess = async (reference) => {
    setLoading(true);
    try {
      // Verify payment on backend
      const response = await axios.post(
        `${API_URL}/api/payment/verify`,
        { reference: reference.reference },
        { withCredentials: true }
      );

      if (response.data.status === 'success') {
        toast.success('Payment successful!');
        
        // Send status update email
        try {
          await axios.post(`${API_URL}/api/orders/${orderId}/send-status-email`);
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }
        
        if (onSuccess) {
          onSuccess(response.data);
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
  };

  const handlePaystackClose = () => {
    toast.info('Payment cancelled');
    if (onClose) {
      onClose();
    }
  };

  const handlePayment = () => {
    initializePaystackPayment(handlePaystackSuccess, handlePaystackClose);
  };

  return (
    <div className="payment-section">
      <button
        onClick={handlePayment}
        disabled={loading || !PAYSTACK_PUBLIC_KEY}
        className="w-full btn-primary py-4 text-lg"
        data-testid="pay-with-paystack-btn"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            Processing...
          </div>
        ) : (
          `Pay ₦${amount.toLocaleString()} with Paystack`
        )}
      </button>

      {!PAYSTACK_PUBLIC_KEY && (
        <p className="text-sm text-red-600 mt-2">
          Payment configuration error. Please contact support.
        </p>
      )}
    </div>
  );
};

export default PaystackPayment;
