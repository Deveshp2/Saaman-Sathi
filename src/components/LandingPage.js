import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/signup');
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(180deg, #FFFFFF 0%, #FFECFE 100%)'
    }}>
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {/* Decorative shapes matching the Figma design */}
        <div className="absolute top-[12%] left-[6%] w-3 h-3 rotate-45" style={{ backgroundColor: '#FF2B67' }}></div>
        <div className="absolute top-[20%] right-[12%] w-5 h-5 bg-warning-100 rounded-full"></div>
        <div className="absolute top-[40%] left-[8%] w-2.5 h-2.5 bg-success-100 rounded-full"></div>
        <div className="absolute bottom-[30%] right-[6%] w-4 h-4 rotate-45" style={{ backgroundColor: '#FF2B67' }}></div>
        <div className="absolute bottom-[15%] left-[15%] w-3 h-3 bg-info-100 rounded-full"></div>
        <div className="absolute top-[55%] right-[20%] w-2 h-2 rotate-45 bg-purple-200"></div>
        <div className="absolute top-[30%] right-[30%] w-1.5 h-1.5 bg-primary-100 rounded-full"></div>
        <div className="absolute bottom-[45%] right-[40%] w-2.5 h-2.5 rotate-45" style={{ backgroundColor: '#967EFF' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-center items-center pt-6 pb-8">
        <div className="flex gap-12 text-secondary-900 font-normal text-sm">
          <span className="cursor-pointer hover:text-primary-200 transition-colors">Team</span>
          <span className="cursor-pointer hover:text-primary-200 transition-colors">Marketplace</span>
          <span className="cursor-pointer hover:text-primary-200 transition-colors">Support</span>
          <span className="cursor-pointer hover:text-primary-200 transition-colors">About Us</span>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 pt-16 pb-20">
        <div className="max-w-4xl text-center">
          {/* Brand Name */}
          <div className="mb-12">
            <h1 className="text-lg font-medium text-secondary-900 mb-8 tracking-wide">
              Saaman Sathi
            </h1>

            {/* Main Heading */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-tight mb-16 px-4" style={{
              background: 'linear-gradient(135deg, #FF2B67 0%, #91183A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: '1.2'
            }}>
              Source nutrients rich<br />
              food at fingertips
            </h2>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center">
            <button
              onClick={handleGetStarted}
              className="bg-primary-200 hover:bg-primary-300 text-white font-medium px-10 py-4 rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg text-base"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;