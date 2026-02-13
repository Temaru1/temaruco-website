import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MessageCircle } from 'lucide-react';

const Chatbot = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [closingMessage, setClosingMessage] = useState('');

  const fullGreeting = "Hi there, welcome to Temaruco. What would you like to do today?";

  const options = [
    { label: 'Bulk Order', path: '/bulk-orders' },
    { label: 'Print-On-Demand', path: '/pod' },
    { label: 'Custom Orders', path: '/custom-order' },
    { label: 'Buy Fabrics', path: '/fabrics' },
    { label: 'Boutique', path: '/boutique' },
    { label: 'Buy Souvenirs', path: '/souvenirs' },
    { label: 'Design Lab', path: '/design-lab' },
    { label: 'Contact Temaruco', path: '/contact' },
    { label: 'Visit Site', path: '/' }
  ];

  useEffect(() => {
    if (isOpen && !showOptions) {
      setIsTyping(true);
      let index = 0;
      const typingInterval = setInterval(() => {
        if (index < fullGreeting.length) {
          setGreeting(fullGreeting.substring(0, index + 1));
          index++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
          setTimeout(() => setShowOptions(true), 300);
        }
      }, 30);
      return () => clearInterval(typingInterval);
    }
  }, [isOpen]);

  const handleOptionClick = (option) => {
    setSelectedOption(option.label);
    setShowOptions(false);
    setClosingMessage("Thank you, we hope you find exactly what you're looking for.");
    
    setTimeout(() => {
      setIsOpen(false);
      setTimeout(() => {
        navigate(option.path);
      }, 300);
    }, 2000);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setGreeting('');
      setShowOptions(false);
      setSelectedOption(null);
      setClosingMessage('');
    }, 300);
  };

  return (
    <>
      {/* Chatbot Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-[#D90429] hover:bg-[#B00320] text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110"
          aria-label="Open chatbot"
          data-testid="chatbot-button"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div 
          className={`fixed bottom-6 right-6 z-50 w-[380px] bg-white rounded-2xl shadow-2xl border-4 border-[#D90429] transition-all duration-300 ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          data-testid="chatbot-window"
        >
          {/* Header */}
          <div className="bg-[#D90429] text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
            <div>
              <h3 className="font-oswald text-xl font-bold">Temaruco Assistant</h3>
              <p className="text-xs text-white/90">How can we help you today?</p>
            </div>
            <button
              onClick={handleClose}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Close chatbot"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 min-h-[400px] max-h-[500px] overflow-y-auto">
            {/* Greeting Message */}
            {greeting && (
              <div className="mb-4 animate-fadeIn">
                <div className="bg-zinc-100 rounded-2xl rounded-tl-none px-4 py-3 inline-block max-w-[85%]">
                  <p className="text-zinc-800">
                    {greeting}
                    {isTyping && <span className="inline-block w-2 h-4 bg-[#D90429] ml-1 animate-pulse"></span>}
                  </p>
                </div>
              </div>
            )}

            {/* Options */}
            {showOptions && !selectedOption && (
              <div className="space-y-2">
                {options.map((option, index) => (
                  <button
                    key={option.label}
                    onClick={() => handleOptionClick(option)}
                    className="w-full text-left px-4 py-3 bg-white border-2 border-zinc-200 hover:border-[#D90429] hover:bg-red-50 rounded-lg transition-all duration-200 transform hover:scale-102"
                    style={{
                      animation: `slideIn 0.3s ease-out ${index * 0.05}s forwards`,
                      opacity: 0
                    }}
                    data-testid={`chatbot-option-${option.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <span className="font-semibold text-zinc-800 hover:text-[#D90429]">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Closing Message */}
            {closingMessage && (
              <div className="animate-fadeIn">
                <div className="bg-zinc-100 rounded-2xl rounded-tl-none px-4 py-3 inline-block max-w-[85%]">
                  <p className="text-zinc-800">{closingMessage}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in;
        }
      `}</style>
    </>
  );
};

export default Chatbot;
