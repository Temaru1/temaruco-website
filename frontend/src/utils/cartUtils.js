/**
 * Shopping Cart Utility Functions
 * Handles cart operations with localStorage
 */

/**
 * Get all cart items
 */
export const getCartItems = () => {
  try {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
  } catch (error) {
    console.error('Error reading cart:', error);
    return [];
  }
};

/**
 * Add item to cart
 */
export const addToCart = (item) => {
  const cart = getCartItems();
  
  // Check if item already exists (by product_id)
  const existingItemIndex = cart.findIndex(
    cartItem => cartItem.product_id === item.product_id
  );

  if (existingItemIndex > -1) {
    // Update quantity if item exists
    cart[existingItemIndex].quantity += item.quantity || 1;
  } else {
    // Add new item
    cart.push({
      ...item,
      quantity: item.quantity || 1,
      added_at: new Date().toISOString()
    });
  }

  saveCart(cart);
  return cart;
};

/**
 * Update item quantity in cart
 */
export const updateCartItemQuantity = (product_id, quantity) => {
  const cart = getCartItems();
  const itemIndex = cart.findIndex(item => item.product_id === product_id);

  if (itemIndex > -1) {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      cart.splice(itemIndex, 1);
    } else {
      cart[itemIndex].quantity = quantity;
    }
    saveCart(cart);
  }

  return cart;
};

/**
 * Remove item from cart
 */
export const removeFromCart = (product_id) => {
  const cart = getCartItems();
  const filteredCart = cart.filter(item => item.product_id !== product_id);
  saveCart(filteredCart);
  return filteredCart;
};

/**
 * Clear entire cart
 */
export const clearCart = () => {
  localStorage.removeItem('cart');
  dispatchCartUpdate();
  return [];
};

/**
 * Save cart to localStorage
 */
const saveCart = (cart) => {
  localStorage.setItem('cart', JSON.stringify(cart));
  dispatchCartUpdate();
};

/**
 * Dispatch cart update event
 */
const dispatchCartUpdate = () => {
  window.dispatchEvent(new Event('cartUpdated'));
};

/**
 * Get cart total
 */
export const getCartTotal = () => {
  const cart = getCartItems();
  return cart.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
};

/**
 * Get cart item count
 */
export const getCartItemCount = () => {
  const cart = getCartItems();
  return cart.reduce((count, item) => count + item.quantity, 0);
};

/**
 * Check if item is in cart
 */
export const isInCart = (product_id) => {
  const cart = getCartItems();
  return cart.some(item => item.product_id === product_id);
};

/**
 * Get single cart item
 */
export const getCartItem = (product_id) => {
  const cart = getCartItems();
  return cart.find(item => item.product_id === product_id);
};
