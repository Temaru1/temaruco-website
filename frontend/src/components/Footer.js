import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Instagram } from 'lucide-react';
import { LOGO_WHITE } from '../utils/logoConstants';

const Footer = () => {
  // Use white logo for dark footer background
  const logoURL = LOGO_WHITE;
  
  return (
    <footer className="bg-zinc-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="flex flex-col">
            <img 
              src={logoURL}
              alt="Temaruco Logo" 
              className="h-16 w-auto mb-4 object-contain"
              style={{ imageRendering: 'crisp-edges' }}
            />
            <p className="text-zinc-400 text-sm leading-relaxed">
              Premium clothing manufacturing for bulk orders, print-on-demand, and boutique collections.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-oswald text-lg font-semibold mb-4 tracking-wide">SERVICES</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/bulk-orders" className="text-zinc-400 hover:text-primary transition-colors inline-block">
                  Bulk Orders
                </Link>
              </li>
              <li>
                <Link to="/pod" className="text-zinc-400 hover:text-primary transition-colors inline-block">
                  Print-On-Demand
                </Link>
              </li>
              <li>
                <Link to="/boutique" className="text-zinc-400 hover:text-primary transition-colors inline-block">
                  Boutique Store
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-oswald text-lg font-semibold mb-4 tracking-wide">COMPANY</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/about" className="text-zinc-400 hover:text-primary transition-colors inline-block">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-zinc-400 hover:text-primary transition-colors inline-block">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/track" className="text-zinc-400 hover:text-primary transition-colors inline-block">
                  Track Order
                </Link>
              </li>
              <li>
                <Link to="/receipts" className="text-zinc-400 hover:text-primary transition-colors inline-block">
                  Find Receipt
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-oswald text-lg font-semibold mb-4 tracking-wide">CONTACT</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a 
                  href="tel:+2349125423902"
                  className="flex items-center gap-2 text-zinc-400 hover:text-primary transition-colors cursor-pointer"
                >
                  <Phone size={16} className="flex-shrink-0" />
                  <span>+234 912 542 3902</span>
                </a>
              </li>
              <li>
                <a 
                  href="mailto:temarucoltd@gmail.com"
                  className="flex items-center gap-2 text-zinc-400 hover:text-primary transition-colors cursor-pointer"
                >
                  <Mail size={16} className="flex-shrink-0" />
                  <span>temarucoltd@gmail.com</span>
                </a>
              </li>
              <li>
                <a 
                  href="https://instagram.com/temaruco_clothing_factory"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-zinc-400 hover:text-primary transition-colors cursor-pointer"
                >
                  <Instagram size={16} className="flex-shrink-0" />
                  <span>@temaruco_clothing_factory</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800 mt-12 pt-8">
          <p className="text-zinc-500 text-sm text-center">
            © {new Date().getFullYear()} Temaruco Clothing Factory. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
