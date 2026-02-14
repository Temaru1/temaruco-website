import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './hooks/useAuth';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import AuthCallback from './components/AuthCallback';
import { trackVisit } from './utils/analytics';

// Pages - will be created
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import BulkOrdersPage from './pages/BulkOrdersPage';
import PODPage from './pages/PODPage';
import BoutiquePage from './pages/BoutiquePage';
import BoutiqueNigerianPage from './pages/BoutiqueNigerianPage';
import BoutiqueModernPage from './pages/BoutiqueModernPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PaymentCallbackPage from './pages/PaymentCallbackPage';
import CustomOrderPage from './pages/CustomOrderPage';
import FabricPage from './pages/FabricPage';
import OrderSummaryPage from './pages/OrderSummaryPage';
import CartPage from './pages/CartPage';
import CustomOrderConfirmationPage from './pages/CustomOrderConfirmationPage';
import AdminLoginPage from './pages/AdminLoginPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import AdminStaffPage from './pages/AdminStaffPage';
import CareersPage from './pages/CareersPage';
import ApplyJobPage from './pages/ApplyJobPage';
import AdminInventoryPage from './pages/AdminInventoryPage';
import AdminMaterialsPage from './pages/AdminMaterialsPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import AdminRevenueAnalyticsPage from './pages/AdminRevenueAnalyticsPage';
import ReceiptLookupPage from './pages/ReceiptLookupPage';
import AdminEnquiriesPage from './pages/AdminEnquiriesPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminPODOrdersPage from './pages/AdminPODOrdersPage';
import AdminClothingItemsPage from './pages/AdminClothingItemsPage';

// New Pages
import FabricsPage from './pages/FabricsPage';
import SouvenirsPage from './pages/SouvenirsPage';
import DesignLabPage from './pages/DesignLabPage';
import PriceCalculatorPage from './pages/PriceCalculatorPage';

// Components
import Chatbot from './components/Chatbot';
import WhatsAppButton from './components/WhatsAppButton';

import './App.css';

// Scroll to top on route change and track visits
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Track page visit
    trackVisit();
  }, [pathname]);

  return null;
}

const ProtectedRoute = ({ children, requireAuth = true, requireAdmin = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" />;
  }

  // Allow both admin and super_admin users
  if (requireAdmin && (!user || (!user.is_admin && !user.is_super_admin))) {
    return <Navigate to="/" />;
  }

  return children;
};

function AppRouter() {
  const location = useLocation();
  const { user, loginUser, logoutUser } = useAuth();
  
  // Check for session_id in URL fragment (handle Google OAuth callback)
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <>
      <ScrollToTop />
      <Navigation user={user} onLogout={logoutUser} />
      
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Super Admin Login - Username/Password at /login */}
        <Route path="/login" element={<AdminLoginPage loginUser={loginUser} isSuperAdmin={true} />} />
        
        {/* Admin Login - Username/Password at /admin */}
        <Route path="/admin" element={<AdminLoginPage loginUser={loginUser} isSuperAdmin={false} />} />
        
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/track" element={<OrderTrackingPage />} />
        <Route path="/receipts" element={<ReceiptLookupPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/boutique" element={<BoutiquePage />} />
        <Route path="/boutique/nigerian" element={<BoutiqueNigerianPage />} />
        <Route path="/boutique/modern" element={<BoutiqueModernPage />} />
        <Route path="/payment/callback" element={<PaymentCallbackPage />} />
        
        {/* Order Summary - Bank Transfer Page - NO AUTH REQUIRED */}
        <Route path="/order-summary/:orderId" element={<OrderSummaryPage />} />
        
        {/* Public pages - no auth required */}
        <Route path="/bulk-orders" element={<BulkOrdersPage />} />
        <Route path="/pod" element={<PODPage />} />
        <Route path="/custom-order" element={<CustomOrderPage />} />
        <Route path="/custom-order-confirmation" element={<CustomOrderConfirmationPage />} />
        <Route path="/fabric" element={<FabricPage />} />
        
        {/* New Service Pages */}
        <Route path="/fabrics" element={<FabricsPage />} />
        <Route path="/souvenirs" element={<SouvenirsPage />} />
        <Route path="/design-lab" element={<DesignLabPage />} />
        <Route path="/price-calculator" element={<PriceCalculatorPage />} />
        
        {/* Careers - Public */}
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/careers/apply/:jobId" element={<ApplyJobPage />} />
        
        {/* Admin Staff Management - auth required */}
        <Route
          path="/admin/staff"
          element={
            <ProtectedRoute requireAuth={true} requireAdmin={true}>
              <AdminStaffPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Inventory Management - auth required */}
        <Route
          path="/admin/inventory"
          element={
            <ProtectedRoute requireAuth={true} requireAdmin={true}>
              <AdminInventoryPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Analytics - auth required */}
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requireAuth={true} requireAdmin={true}>
              <AdminAnalyticsPage />
            </ProtectedRoute>
          }
        />
        
        {/* Revenue Analytics - auth required */}
        <Route
          path="/admin/revenue-analytics"
          element={
            <ProtectedRoute requireAuth={true} requireAdmin={true}>
              <AdminRevenueAnalyticsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Enquiries - auth required */}
        <Route
          path="/admin/enquiries"
          element={
            <ProtectedRoute requireAuth={true} requireAdmin={true}>
              <AdminEnquiriesPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Settings - auth required */}
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requireAuth={true} requireAdmin={true}>
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin POD Orders - auth required */}
        <Route
          path="/admin/pod-orders"
          element={
            <ProtectedRoute requireAuth={true} requireAdmin={true}>
              <AdminPODOrdersPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Clothing Items Management - auth required */}
        <Route
          path="/admin/clothing-items"
          element={
            <ProtectedRoute requireAuth={true} requireAdmin={true}>
              <AdminClothingItemsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard - auth required - at /admin/dashboard */}
        <Route
          path="/admin/dashboard/*"
          element={
            <ProtectedRoute requireAuth={true} requireAdmin={true}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>

      <Footer />
      <Chatbot />
      <WhatsAppButton phoneNumber="+2348000000000" defaultMessage="Hello Temaruco, I need assistance with my order." />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <div className="App">
        <AppRouter />
      </div>
    </BrowserRouter>
  );
}

export default App;
