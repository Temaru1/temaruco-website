import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Package, User, Calendar, CheckCircle2, AlertCircle, Clock, Eye, ArrowLeft, CalendarIcon } from 'lucide-react';
import api from '../utils/api';
import { validateStatusTransition, getAllowedNextStatuses, STATUS_LABELS } from '../utils/orderStatusValidation';
import OrderDetailsModal from '../components/OrderDetailsModal';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import 'react-day-picker/dist/style.css';

const AdminProductionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [productionData, setProductionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [tailorName, setTailorName] = useState('');
  const [deadline, setDeadline] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const datePickerRef = useRef(null);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  useEffect(() => {
    loadProductionDashboard();
    loadCurrentUser();
  }, []);

  // Auto-open order modal if coming from notification
  useEffect(() => {
    if (location.state?.openOrderId && productionData) {
      // Don't auto-open modal - let user see the list first
      // Just scroll to the order instead
      const orderId = location.state.openOrderId;
      setTimeout(() => {
        const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderElement) {
          orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          orderElement.classList.add('highlight-order');
        }
      }, 500);
      // Clear the state to prevent highlighting on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, productionData]);

  const loadCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const loadProductionDashboard = async () => {
    try {
      const response = await api.get('/admin/production/dashboard');
      setProductionData(response.data);
    } catch (error) {
      toast.error('Failed to load production dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (orderId) => {
    try {
      await api.patch(`/admin/orders/${orderId}/verify-payment`);
      toast.success('Payment verified successfully!');
      await loadProductionDashboard();
    } catch (error) {
      toast.error('Failed to verify payment');
      console.error(error);
    }
  };

  const handleAssignTailor = async (orderId) => {
    if (!tailorName.trim()) {
      toast.error('Please enter tailor name');
      return;
    }

    try {
      await api.patch(`/admin/orders/${orderId}/assign-tailor`, {
        tailor_name: tailorName,
        deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null
      });
      
      toast.success(`Tailor "${tailorName}" assigned successfully!`);
      setSelectedOrder(null);
      setTailorName('');
      setDeadline(null);
      setShowDatePicker(false);
      await loadProductionDashboard();
    } catch (error) {
      toast.error('Failed to assign tailor');
      console.error(error);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus, currentStatus) => {
    // Validate status transition
    const isSuperAdmin = currentUser?.is_super_admin || false;
    const validation = validateStatusTransition(currentStatus, newStatus, isSuperAdmin);
    
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    try {
      await api.patch(`/admin/orders/${orderId}/status`, null, {
        params: { status: newStatus }
      });
      
      toast.success('Order status updated!');
      await loadProductionDashboard();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_payment: { label: 'Pending Payment', color: 'bg-yellow-500', icon: Clock },
      payment_submitted: { label: 'Payment Submitted', color: 'bg-blue-500', icon: AlertCircle },
      payment_verified: { label: 'Payment Verified', color: 'bg-green-500', icon: CheckCircle2 },
      in_production: { label: 'In Production', color: 'bg-purple-500', icon: Package },
      ready_for_delivery: { label: 'Ready for Delivery', color: 'bg-indigo-500', icon: Package },
      completed: { label: 'Completed', color: 'bg-gray-500', icon: CheckCircle2 },
      delivered: { label: 'Delivered', color: 'bg-green-600', icon: CheckCircle2 },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-500', icon: Package };
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const OrderCard = ({ order, section }) => (
    <Card 
      className="mb-4 hover:shadow-lg transition-shadow order-card" 
      data-testid={`order-card-${order.order_id}`}
      data-order-id={order.order_id || order.id}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-mono">{order.order_id || order.id}</CardTitle>
            <CardDescription>{order.user_name} • {order.user_email}</CardDescription>
          </div>
          {getStatusBadge(order.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-600">Order Type</p>
              <p className="font-semibold capitalize">{order.type}</p>
            </div>
            <div>
              <p className="text-zinc-600">Total Amount</p>
              <p className="font-semibold text-primary">₦{order.total_price?.toLocaleString()}</p>
            </div>
            {order.type === 'bulk' && (
              <div>
                <p className="text-zinc-600">Item</p>
                <p className="font-semibold">{order.clothing_item} ({order.quantity})</p>
              </div>
            )}
            {order.type === 'pod' && (
              <div>
                <p className="text-zinc-600">POD Order</p>
                <p className="font-semibold">{order.quantity} T-Shirts</p>
              </div>
            )}
            {order.tailor_assigned && (
              <div>
                <p className="text-zinc-600 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Tailor
                </p>
                <p className="font-semibold">{order.tailor_assigned}</p>
              </div>
            )}
            {order.production_deadline && (
              <div>
                <p className="text-zinc-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Deadline
                </p>
                <p className="font-semibold">{new Date(order.production_deadline).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {/* Actions based on section */}
          <div className="flex gap-2 pt-2 border-t flex-wrap">
            {/* View Details Button - Always visible */}
            <Button
              onClick={() => setViewingOrder(order)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              data-testid={`view-details-btn-${order.order_id}`}
            >
              <Eye size={16} />
              View Details
            </Button>

            {section === 'payment_verified' && (
              <>
                {selectedOrder === order.order_id ? (
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <div className="flex-1 min-w-[200px]">
                      <input
                        type="text"
                        placeholder="Enter tailor's full name"
                        value={tailorName}
                        onChange={(e) => {
                          e.stopPropagation();
                          setTailorName(e.target.value);
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        data-testid="tailor-name-input"
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex-1 relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDatePicker(!showDatePicker);
                        }}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-left flex items-center justify-between bg-white hover:bg-zinc-50"
                        data-testid="deadline-input"
                      >
                        <span className={deadline ? 'text-zinc-900' : 'text-zinc-500'}>
                          {deadline ? format(deadline, 'MMM dd, yyyy') : 'Select deadline'}
                        </span>
                        <CalendarIcon size={18} className="text-zinc-400" />
                      </button>
                      
                      {showDatePicker && (
                        <div 
                          ref={datePickerRef}
                          className="absolute z-50 mt-2 bg-white border border-zinc-300 rounded-lg shadow-lg p-3"
                          style={{ top: '100%', left: 0 }}
                        >
                          <DayPicker
                            mode="single"
                            selected={deadline}
                            onSelect={(date) => {
                              setDeadline(date);
                              setShowDatePicker(false);
                            }}
                            disabled={{before: new Date()}}
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAssignTailor(order.order_id)}
                        className="btn-primary px-4 py-2 whitespace-nowrap"
                        data-testid="assign-tailor-btn"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(null);
                          setTailorName('');
                          setDeadline(null);
                          setShowDatePicker(false);
                        }}
                        className="btn-outline px-4 py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedOrder(order.order_id)}
                    className="btn-outline px-4 py-2 text-sm"
                    data-testid={`assign-tailor-open-btn-${order.order_id}`}
                  >
                    Assign Tailor
                  </button>
                )}
              </>
            )}

            {section === 'in_production' && (
              <Button
                onClick={() => handleUpdateStatus(order.order_id || order.id, 'ready_for_delivery', order.status)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid={`mark-ready-btn-${order.order_id}`}
              >
                Mark as Ready for Delivery
              </Button>
            )}

            {section === 'ready_for_delivery' && (
              <>
                <Button
                  onClick={() => handleUpdateStatus(order.order_id || order.id, 'delivered', order.status)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  data-testid={`mark-delivered-btn-${order.order_id}`}
                >
                  Mark as Delivered
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(order.order_id || order.id, 'in_production', order.status)}
                  variant="outline"
                  size="sm"
                >
                  Back to Production
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-oswald text-4xl font-bold mb-2" data-testid="production-dashboard-title">
          Production Dashboard
        </h1>
        <p className="text-zinc-600">Manage production workflow and order assignments</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">In Production</p>
                <p className="text-3xl font-bold">{productionData?.statistics?.total_in_production || 0}</p>
              </div>
              <Package className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Pending Verification</p>
                <p className="text-3xl font-bold">{productionData?.statistics?.pending_verification || 0}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-600">Ready for Delivery</p>
                <p className="text-3xl font-bold">{productionData?.statistics?.ready_for_delivery || 0}</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Verified - Ready for Production */}
        <div>
          <h2 className="font-semibold text-xl mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Payment Verified ({productionData?.payment_verified?.length || 0})
          </h2>
          <div className="space-y-4">
            {productionData?.payment_verified?.length > 0 ? (
              productionData.payment_verified.map(order => (
                <OrderCard key={order.order_id || order.id} order={order} section="payment_verified" />
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-zinc-500">
                  No orders awaiting production
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* In Production */}
        <div>
          <h2 className="font-semibold text-xl mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-500" />
            In Production ({productionData?.in_production?.length || 0})
          </h2>
          <div className="space-y-4">
            {productionData?.in_production?.length > 0 ? (
              productionData.in_production.map(order => (
                <OrderCard key={order.order_id || order.id} order={order} section="in_production" />
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-zinc-500">
                  No orders in production
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Ready for Delivery */}
        <div>
          <h2 className="font-semibold text-xl mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-500" />
            Ready for Delivery ({productionData?.ready_for_delivery?.length || 0})
          </h2>
          <div className="space-y-4">
            {productionData?.ready_for_delivery?.length > 0 ? (
              productionData.ready_for_delivery.map(order => (
                <OrderCard key={order.order_id || order.id} order={order} section="ready_for_delivery" />
              ))
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-zinc-500">
                  No orders ready for delivery
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {viewingOrder && (
        <OrderDetailsModal 
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          fromNotification={location.state?.fromNotification || false}
        />
      )}
    </div>
  );
};

export default AdminProductionPage;
