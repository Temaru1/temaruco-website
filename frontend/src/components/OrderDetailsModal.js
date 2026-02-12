import React from 'react';
import { X, Package, User, MapPin, Calendar, DollarSign, FileText, CheckCircle, ArrowLeft } from 'lucide-react';
import { STATUS_LABELS, getStatusColor } from '../utils/orderStatusValidation';
import { useNavigate } from 'react-router-dom';

const OrderDetailsModal = ({ order, onClose, fromNotification }) => {
  const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
  const navigate = useNavigate();

  if (!order) return null;

  const handleBack = () => {
    // Check if there's a return path stored from notification
    const returnPath = sessionStorage.getItem('notificationReturnPath');
    if (returnPath && fromNotification) {
      sessionStorage.removeItem('notificationReturnPath');
      navigate(returnPath);
    } else {
      onClose();
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₦${Number(amount || 0).toLocaleString()}`;
  };

  return (
    <div className="modal-overlay" onClick={handleBack}>
      <div 
        className="modal-content max-w-5xl max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b">
          <div className="flex items-start gap-4">
            {fromNotification && (
              <button
                onClick={handleBack}
                className="text-zinc-500 hover:text-zinc-700 p-2 hover:bg-zinc-100 rounded-lg transition-colors flex items-center gap-2"
                data-testid="back-button"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-medium">Back</span>
              </button>
            )}
            <div>
              <h2 className="font-oswald text-3xl font-bold mb-2">Order Details</h2>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg text-zinc-600">{order.order_id || order.id}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                  {order.type?.toUpperCase() || 'ORDER'}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleBack}
            className="text-zinc-500 hover:text-zinc-700 p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Information */}
          <div className="bg-zinc-50 p-6 rounded-lg">
            <h3 className="font-oswald text-xl font-semibold mb-4 flex items-center gap-2">
              <User size={20} className="text-primary" />
              Customer Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-zinc-600">Name</p>
                <p className="font-semibold">{order.user_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Email</p>
                <p className="font-semibold">{order.user_email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Phone</p>
                <p className="font-semibold">{order.user_phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Order Timeline */}
          <div className="bg-zinc-50 p-6 rounded-lg">
            <h3 className="font-oswald text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-primary" />
              Timeline
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-zinc-600">Created</p>
                <p className="font-semibold text-sm">{formatDate(order.created_at)}</p>
              </div>
              {order.payment_verified_at && (
                <div>
                  <p className="text-sm text-zinc-600">Payment Verified</p>
                  <p className="font-semibold text-sm">{formatDate(order.payment_verified_at)}</p>
                </div>
              )}
              {order.production_started_at && (
                <div>
                  <p className="text-sm text-zinc-600">Production Started</p>
                  <p className="font-semibold text-sm">{formatDate(order.production_started_at)}</p>
                </div>
              )}
              {order.production_deadline && (
                <div>
                  <p className="text-sm text-zinc-600">Production Deadline</p>
                  <p className="font-semibold text-sm">{formatDate(order.production_deadline)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Type Specific Details */}
        {order.type === 'bulk' && (
          <div className="bg-white border-2 border-zinc-200 p-6 rounded-lg mt-6">
            <h3 className="font-oswald text-xl font-semibold mb-4 flex items-center gap-2">
              <Package size={20} className="text-primary" />
              Bulk Order Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-zinc-600">Clothing Item</p>
                <p className="font-semibold">{order.clothing_item}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Quantity</p>
                <p className="font-semibold">{order.quantity}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Print Type</p>
                <p className="font-semibold capitalize">{order.print_type?.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Fabric Quality</p>
                <p className="font-semibold capitalize">{order.fabric_quality}</p>
              </div>
            </div>

            {/* Size Breakdown */}
            {order.size_breakdown && (
              <div className="mt-4">
                <p className="text-sm text-zinc-600 mb-2">Size Breakdown</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {Object.entries(order.size_breakdown).map(([size, qty]) => (
                    qty > 0 && (
                      <div key={size} className="bg-zinc-100 px-3 py-2 rounded text-center">
                        <p className="text-xs text-zinc-600">{size}</p>
                        <p className="font-bold">{qty}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Colors */}
            {order.colors && order.colors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-zinc-600 mb-2">Colors</p>
                <div className="flex flex-wrap gap-2">
                  {order.colors.map((color, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Design Preview */}
            {order.design_url && (
              <div className="mt-4">
                <p className="text-sm text-zinc-600 mb-2">Design File</p>
                <img 
                  src={`${API_URL}${order.design_url}`}
                  alt="Design" 
                  className="max-w-xs h-auto border-2 border-zinc-200 rounded-lg"
                />
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div className="mt-4">
                <p className="text-sm text-zinc-600 mb-1">Additional Notes</p>
                <p className="text-sm bg-zinc-100 p-3 rounded">{order.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* POD Order Details */}
        {order.type === 'pod' && (
          <div className="bg-white border-2 border-zinc-200 p-6 rounded-lg mt-6">
            <h3 className="font-oswald text-xl font-semibold mb-4 flex items-center gap-2">
              <Package size={20} className="text-primary" />
              Print-On-Demand Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-zinc-600">Quantity</p>
                <p className="font-semibold">{order.quantity}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Shirt Quality</p>
                <p className="font-semibold">{order.shirt_quality}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Print Size</p>
                <p className="font-semibold">{order.print_size}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-600">Price per Item</p>
                <p className="font-semibold">{formatCurrency(order.price_per_item)}</p>
              </div>
            </div>

            {/* Size Breakdown */}
            {order.size_breakdown && (
              <div className="mt-4">
                <p className="text-sm text-zinc-600 mb-2">Size Breakdown</p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {Object.entries(order.size_breakdown).map(([size, qty]) => (
                    qty > 0 && (
                      <div key={size} className="bg-zinc-100 px-3 py-2 rounded text-center">
                        <p className="text-xs text-zinc-600">{size}</p>
                        <p className="font-bold">{qty}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Colors */}
            {order.colors && order.colors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-zinc-600 mb-2">Colors</p>
                <div className="flex flex-wrap gap-2">
                  {order.colors.map((color, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Design Preview */}
            {order.design_url && (
              <div className="mt-4">
                <p className="text-sm text-zinc-600 mb-2">Design File</p>
                <img 
                  src={`${API_URL}${order.design_url}`}
                  alt="Design" 
                  className="max-w-xs h-auto border-2 border-zinc-200 rounded-lg"
                />
              </div>
            )}

            {/* Delivery Information */}
            {order.delivery_option === 'deliver_to_me' && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin size={16} />
                  Delivery Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-zinc-600">Recipient</p>
                    <p className="font-semibold">{order.recipient_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-600">Phone</p>
                    <p className="font-semibold">{order.delivery_phone || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-zinc-600">Address</p>
                    <p className="font-semibold">
                      {order.delivery_address || 'N/A'}
                      {order.delivery_city && `, ${order.delivery_city}`}
                      {order.delivery_state && `, ${order.delivery_state}`}
                    </p>
                  </div>
                  {order.delivery_notes && (
                    <div className="col-span-2">
                      <p className="text-zinc-600">Notes</p>
                      <p className="font-semibold">{order.delivery_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Boutique Order Details */}
        {order.type === 'boutique' && order.cart_items && (
          <div className="bg-white border-2 border-zinc-200 p-6 rounded-lg mt-6">
            <h3 className="font-oswald text-xl font-semibold mb-4 flex items-center gap-2">
              <Package size={20} className="text-primary" />
              Boutique Order Details
            </h3>
            <div className="space-y-3">
              {order.cart_items.map((item, index) => (
                <div key={index} className="flex justify-between items-center bg-zinc-50 p-4 rounded-lg">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-zinc-600">
                      Size: {item.size} | Quantity: {item.quantity}
                    </p>
                  </div>
                  <p className="font-bold">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            {/* Delivery Information */}
            {order.delivery_address && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin size={16} />
                  Delivery Information
                </h4>
                <p className="text-sm">
                  {order.delivery_address}
                  {order.delivery_city && `, ${order.delivery_city}`}
                  {order.delivery_state && `, ${order.delivery_state}`}
                </p>
                {order.delivery_notes && (
                  <p className="text-sm mt-2 text-zinc-600">{order.delivery_notes}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pricing Information */}
        <div className="bg-zinc-50 p-6 rounded-lg mt-6">
          <h3 className="font-oswald text-xl font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-primary" />
            Pricing
          </h3>
          <div className="space-y-2">
            {order.price_breakdown && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Base Price</span>
                  <span>{formatCurrency(order.price_breakdown.base_price)}</span>
                </div>
                {order.price_breakdown.print_cost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Print Cost</span>
                    <span>{formatCurrency(order.price_breakdown.print_cost)}</span>
                  </div>
                )}
                {order.price_breakdown.discount_percentage > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({order.price_breakdown.discount_percentage}%)</span>
                    <span>-{formatCurrency(order.price_breakdown.base_price * order.quantity * (order.price_breakdown.discount_percentage / 100))}</span>
                  </div>
                )}
              </>
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-oswald text-lg font-semibold">Total Amount</span>
                <span className="font-oswald text-2xl font-bold text-primary">
                  {formatCurrency(order.total_price)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-white border-2 border-zinc-200 p-6 rounded-lg mt-6">
          <h3 className="font-oswald text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle size={20} className="text-primary" />
            Payment Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-zinc-600">Payment Status</p>
              <p className="font-semibold capitalize">{order.payment_status?.replace('_', ' ')}</p>
            </div>
            {order.payment_reference && (
              <div>
                <p className="text-sm text-zinc-600">Payment Reference</p>
                <p className="font-semibold font-mono text-sm">{order.payment_reference}</p>
              </div>
            )}
            {order.payment_proof_url && (
              <div className="col-span-2">
                <p className="text-sm text-zinc-600 mb-2">Payment Proof</p>
                <img 
                  src={`${API_URL}${order.payment_proof_url}`}
                  alt="Payment Proof" 
                  className="max-w-md h-auto border-2 border-zinc-200 rounded-lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* Production Information */}
        {order.tailor_assigned && (
          <div className="bg-yellow-50 border-2 border-yellow-200 p-6 rounded-lg mt-6">
            <h3 className="font-oswald text-xl font-semibold mb-4">Production Assignment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-zinc-600">Assigned Tailor</p>
                <p className="font-semibold">{order.tailor_assigned}</p>
              </div>
              {order.production_deadline && (
                <div>
                  <p className="text-sm text-zinc-600">Deadline</p>
                  <p className="font-semibold">{formatDate(order.production_deadline)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Notes */}
        {order.admin_notes && (
          <div className="bg-red-50 border-2 border-red-200 p-4 rounded-lg mt-6">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <FileText size={16} />
              Admin Notes
            </h4>
            <p className="text-sm">{order.admin_notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="btn-primary flex-1"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
