import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart, User, LogOut } from 'lucide-react';
import { LOGO_BLACK } from '../utils/logoConstants';
import NotificationsDropdown from './NotificationsDropdown';

const Navigation = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use embedded base64 logo - black text for light background
  const logoURL = LOGO_BLACK;

  // Update cart count from localStorage
  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(cart.reduce((sum, item) => sum + item.quantity, 0));
    };

    // Initial count
    updateCartCount();

    // Listen for storage changes
    window.addEventListener('storage', updateCartCount);
    
    // Custom event for same-page cart updates
    window.addEventListener('cartUpdated', updateCartCount);

    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const handleCartClick = () => {
    // Save current page as referrer before going to cart
    localStorage.setItem('cartReferrer', location.pathname);
    navigate('/cart', { state: { from: location.pathname } });
  };

  return (
    <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center" data-testid="nav-home">
            <img 
              src={logoURL}
              alt="Temaruco Logo" 
              className="h-16 w-auto object-contain"
              onError={(e) => {
                console.error('Logo failed to load from:', logoURL);
                // Fallback to text if image fails
                e.target.style.display = 'none';
                const parent = e.target.parentElement;
                if (parent && !parent.querySelector('.text-fallback')) {
                  const span = document.createElement('span');
                  span.className = 'font-oswald text-2xl font-bold text-primary text-fallback';
                  span.textContent = 'TEMARUCO';
                  parent.appendChild(span);
                }
              }}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/bulk-orders" className="nav-link text-sm font-medium" data-testid="nav-bulk-orders">
              Bulk Orders
            </Link>
            <Link to="/print-on-demand" className="nav-link text-sm font-medium" data-testid="nav-pod">
              Print-On-Demand
            </Link>
            <Link to="/custom-order" className="nav-link text-sm font-medium" data-testid="nav-custom">
              Custom Order
            </Link>
            <Link to="/boutique" className="nav-link text-sm font-medium" data-testid="nav-boutique">
              Boutique
            </Link>
            <Link to="/fabrics" className="nav-link text-sm font-medium" data-testid="nav-fabrics">
              Fabrics
            </Link>
            <Link to="/souvenirs" className="nav-link text-sm font-medium" data-testid="nav-souvenirs">
              Souvenirs
            </Link>
            <Link to="/contact" className="nav-link text-sm font-medium" data-testid="nav-contact">
              Contact
            </Link>

            {/* Cart Icon with Badge */}
            <button 
              onClick={handleCartClick}
              className="relative p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              data-testid="nav-cart"
            >
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown (Admin Only) */}
            {user && (user.is_admin || user.is_super_admin) && (
              <NotificationsDropdown user={user} />
            )}

            {user && (user.is_admin || user.is_super_admin) && (
              <>
                <Link to="/admin/dashboard" className="nav-link text-sm font-medium" data-testid="nav-admin">
                  Admin
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                  data-testid="nav-logout"
                  title="Logout"
                >
                  <LogOut size={20} className="text-zinc-700" />
                </button>
              </>
            )}
            
            {/* Account link for logged-in non-admin users */}
            {user && !user.is_admin && !user.is_super_admin && (
              <>
                <Link to="/account" className="nav-link text-sm font-medium flex items-center gap-1" data-testid="nav-account">
                  <User size={18} /> Account
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                  data-testid="nav-logout"
                  title="Logout"
                >
                  <LogOut size={20} className="text-zinc-700" />
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            data-testid="mobile-menu-button"
          >
            {isOpen ? <X size={24} className="text-zinc-700" /> : <Menu size={24} className="text-zinc-700" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-zinc-200 pt-4" data-testid="mobile-menu">
            <Link to="/bulk-orders" className="block py-2 px-4 hover:bg-zinc-50 rounded-lg text-sm font-medium text-zinc-700" onClick={() => setIsOpen(false)}>
              Bulk Orders
            </Link>
            <Link to="/print-on-demand" className="block py-2 px-4 hover:bg-zinc-50 rounded-lg text-sm font-medium text-zinc-700" onClick={() => setIsOpen(false)}>
              Print-On-Demand
            </Link>
            <Link to="/custom-order" className="block py-2 px-4 hover:bg-zinc-50 rounded-lg text-sm font-medium text-zinc-700" onClick={() => setIsOpen(false)}>
              Custom Order
            </Link>
            <Link to="/boutique" className="block py-2 px-4 hover:bg-zinc-50 rounded-lg text-sm font-medium text-zinc-700" onClick={() => setIsOpen(false)}>
              Boutique
            </Link>
            <Link to="/fabrics" className="block py-2 px-4 hover:bg-zinc-50 rounded-lg text-sm font-medium text-zinc-700" onClick={() => setIsOpen(false)}>
              Fabrics
            </Link>
            <Link to="/souvenirs" className="block py-2 px-4 hover:bg-zinc-50 rounded-lg text-sm font-medium text-zinc-700" onClick={() => setIsOpen(false)}>
              Souvenirs
            </Link>
            <Link to="/contact" className="block py-2 px-4 hover:bg-zinc-50 rounded-lg text-sm font-medium text-zinc-700" onClick={() => setIsOpen(false)}>
              Contact
            </Link>
            <button 
              onClick={() => { handleCartClick(); setIsOpen(false); }}
              className="block w-full text-left py-2 px-4 hover:bg-zinc-50 rounded-lg text-sm font-medium text-zinc-700"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} />
                <span>Cart ({cartCount})</span>
              </div>
            </button>
            {user && (user.is_admin || user.is_super_admin) && (
              <>
                <Link to="/admin/dashboard" className="block py-2 px-4 hover:bg-zinc-50 rounded-lg text-sm font-medium text-zinc-700" onClick={() => setIsOpen(false)}>
                  Admin
                </Link>
                <button onClick={() => { handleLogout(); setIsOpen(false); }} className="block w-full text-left py-2 px-4 hover:bg-zinc-50 rounded-lg text-sm font-medium text-red-600">
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
