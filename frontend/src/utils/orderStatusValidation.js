/**
 * Order Status Validation Utility
 * Prevents invalid status transitions (e.g., backwards movement)
 */

// Define the status hierarchy (order matters!)
export const STATUS_HIERARCHY = [
  'pending_payment',
  'payment_submitted', 
  'payment_verified',
  'in_production',
  'ready_for_delivery',
  'completed',
  'delivered',
  'cancelled' // Can be set from any status
];

// Map status to readable labels
export const STATUS_LABELS = {
  'pending_payment': 'Pending Payment',
  'payment_submitted': 'Payment Submitted',
  'payment_verified': 'Payment Verified',
  'in_production': 'In Production',
  'ready_for_delivery': 'Ready for Delivery',
  'completed': 'Completed',
  'delivered': 'Delivered',
  'cancelled': 'Cancelled'
};

/**
 * Validate if status transition is allowed
 * @param {string} currentStatus - Current order status
 * @param {string} newStatus - New status to transition to
 * @param {boolean} isSuperAdmin - Whether user is super admin
 * @returns {object} { isValid: boolean, message: string }
 */
export const validateStatusTransition = (currentStatus, newStatus, isSuperAdmin = false) => {
  // Super admin can do anything
  if (isSuperAdmin) {
    return { 
      isValid: true, 
      message: 'Super admin override: All status changes allowed' 
    };
  }

  // Same status - no change needed
  if (currentStatus === newStatus) {
    return { 
      isValid: false, 
      message: 'Order is already in this status' 
    };
  }

  // Cancelled can be set from any status
  if (newStatus === 'cancelled') {
    return { 
      isValid: true, 
      message: 'Order can be cancelled from any status' 
    };
  }

  // Cannot change from cancelled to anything else (unless super admin)
  if (currentStatus === 'cancelled') {
    return { 
      isValid: false, 
      message: 'Cannot change status of cancelled orders. Only super admin can override.' 
    };
  }

  // Cannot move from completed/delivered backwards (unless super admin)
  if ((currentStatus === 'completed' || currentStatus === 'delivered') && 
      newStatus !== 'delivered' && newStatus !== 'completed') {
    return {
      isValid: false,
      message: `Cannot move backwards from ${STATUS_LABELS[currentStatus]}. Only super admin can override.`
    };
  }

  // Get positions in hierarchy
  const currentIndex = STATUS_HIERARCHY.indexOf(currentStatus);
  const newIndex = STATUS_HIERARCHY.indexOf(newStatus);

  // If status not found in hierarchy
  if (currentIndex === -1 || newIndex === -1) {
    return {
      isValid: false,
      message: 'Invalid status value'
    };
  }

  // Cannot move backwards (unless super admin)
  if (newIndex < currentIndex) {
    return {
      isValid: false,
      message: `Cannot move backwards from ${STATUS_LABELS[currentStatus]} to ${STATUS_LABELS[newStatus]}. Only super admin can override.`
    };
  }

  // Cannot skip more than 1 step forward (to maintain proper workflow)
  if (newIndex - currentIndex > 2) {
    return {
      isValid: false,
      message: `Cannot skip multiple steps. Please progress through intermediate statuses.`
    };
  }

  // Valid forward transition
  return {
    isValid: true,
    message: `Status can be updated from ${STATUS_LABELS[currentStatus]} to ${STATUS_LABELS[newStatus]}`
  };
};

/**
 * Get allowed next statuses for current status
 * @param {string} currentStatus - Current order status
 * @param {boolean} isSuperAdmin - Whether user is super admin
 * @returns {Array} Array of allowed status values
 */
export const getAllowedNextStatuses = (currentStatus, isSuperAdmin = false) => {
  // Super admin can transition to any status
  if (isSuperAdmin) {
    return STATUS_HIERARCHY;
  }

  const currentIndex = STATUS_HIERARCHY.indexOf(currentStatus);
  
  if (currentIndex === -1) {
    return [];
  }

  // Cancelled orders cannot be changed
  if (currentStatus === 'cancelled') {
    return ['cancelled'];
  }

  // Completed/Delivered orders can only move between themselves or cancel
  if (currentStatus === 'completed' || currentStatus === 'delivered') {
    return ['completed', 'delivered', 'cancelled'];
  }

  // Can move to next status, skip one, or cancel
  const allowedStatuses = [];
  
  // Current status
  allowedStatuses.push(currentStatus);
  
  // Next status
  if (currentIndex + 1 < STATUS_HIERARCHY.length) {
    allowedStatuses.push(STATUS_HIERARCHY[currentIndex + 1]);
  }
  
  // Can skip one step
  if (currentIndex + 2 < STATUS_HIERARCHY.length) {
    allowedStatuses.push(STATUS_HIERARCHY[currentIndex + 2]);
  }
  
  // Can always cancel
  if (!allowedStatuses.includes('cancelled')) {
    allowedStatuses.push('cancelled');
  }

  return allowedStatuses;
};

/**
 * Get status badge color
 */
export const getStatusColor = (status) => {
  const colors = {
    'pending_payment': 'bg-yellow-100 text-yellow-800',
    'payment_submitted': 'bg-blue-100 text-blue-800',
    'payment_verified': 'bg-green-100 text-green-800',
    'in_production': 'bg-purple-100 text-purple-800',
    'ready_for_delivery': 'bg-indigo-100 text-indigo-800',
    'completed': 'bg-gray-100 text-gray-800',
    'delivered': 'bg-green-200 text-green-900',
    'cancelled': 'bg-red-100 text-red-800'
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800';
};
