import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Phone, Mail, Clock } from 'lucide-react';

const CustomOrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get order_id from state (new format) or fallback to enquiry_code (old format)
  const orderData = location.state || {};
  const orderId = orderData.order_id || orderData.enquiryCode || 'N/A';

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 rounded-full p-6">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
          </div>

          {/* Main Message */}
          <h1 className="font-oswald text-4xl font-bold mb-4" data-testid="confirmation-title">
            Your custom order details have been received.
          </h1>
          
          <p className="text-xl text-zinc-700 mb-8">
            A quote will be sent to your email within 24 hours.
          </p>

          {/* Order ID Box */}
          <div className="bg-primary/10 border-2 border-primary rounded-lg p-6 mb-6">
            <p className="text-sm font-semibold text-primary mb-2">ORDER ID</p>
            <p className="text-3xl font-bold font-mono text-primary mb-3" data-testid="order-id">{orderId}</p>
            <div className="bg-white rounded p-4 text-left">
              <p className="text-sm font-semibold mb-2">📋 What is this code for?</p>
              <ul className="text-sm text-zinc-700 space-y-1">
                <li>• <strong>Keep this code safe</strong> - You'll need it to track your request</li>
                <li>• <strong>Call or WhatsApp us</strong> with this code if we don't reach out within 48 hours</li>
                <li>• <strong>We'll use this code</strong> to quickly find your custom order request</li>
                <li>• <strong>Quote this code</strong> when you contact us about this order</li>
              </ul>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
            <div className="flex items-start gap-3 mb-4">
              <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">What Happens Next?</h3>
                <ol className="list-decimal list-inside space-y-2 text-zinc-700">
                  <li>Our team will carefully review your custom order request</li>
                  <li>We'll prepare a detailed quote including pricing and timeline</li>
                  <li>You'll receive the quote via email within 24 hours</li>
                  <li>You can accept, modify, or discuss the quote with our team</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="flex items-center justify-center gap-3 bg-zinc-100 p-4 rounded-lg">
              <Mail className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="text-xs text-zinc-600">Email Us</p>
                <p className="font-semibold">temarucoltd@gmail.com</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 bg-zinc-100 p-4 rounded-lg">
              <Phone className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="text-xs text-zinc-600">Call/WhatsApp</p>
                <p className="font-semibold">+234 912 542 3902</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
              data-testid="go-home-btn"
            >
              Back to Homepage
            </button>
            <button
              onClick={() => navigate('/custom-order')}
              className="btn-outline"
              data-testid="new-request-btn"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomOrderConfirmationPage;
