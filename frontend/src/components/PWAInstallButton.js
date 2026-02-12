import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed or installed
    const isDismissed = localStorage.getItem('pwa-install-dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isDismissed || isStandalone) {
      return;
    }

    // Show prompt after a short delay
    setTimeout(() => {
      setShowPrompt(true);
    }, 3000);

    // Listen for the beforeinstallprompt event
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // Show iOS instructions
      alert('📱 Install Temaruco App on iOS:\n\n1. Tap the Share button (⬆️)\n2. Scroll and tap "Add to Home Screen"\n3. Tap "Add" to confirm\n\nEnjoy the app experience!');
      return;
    }

    if (deferredPrompt) {
      // Show the install prompt for Android/Desktop
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User installed the app');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      // Show instructions for other browsers
      alert('📱 Install Temaruco App:\n\nLook for the install icon in your browser\'s address bar or menu.\n\nOn Chrome: Menu → "Install Temaruco"\nOn Edge: "App available" icon in address bar');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }

  if (!showPrompt || dismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Install Banner */}
      <div className="fixed bottom-4 right-4 bg-white shadow-2xl rounded-lg p-4 max-w-sm z-50 border-2 border-primary">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-600"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 p-3 rounded-lg">
            <Smartphone className="text-primary" size={32} />
          </div>
          
          <div className="flex-1">
            <h3 className="font-oswald text-lg font-bold mb-1">Install Temaruco App</h3>
            <p className="text-sm text-zinc-600 mb-3">
              Access faster, work offline, get the full app experience!
            </p>
            
            <button
              onClick={handleInstallClick}
              className="btn-primary w-full flex items-center justify-center py-2"
            >
              <span>Install Now</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PWAInstallButton;
