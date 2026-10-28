import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tractor, Store } from 'lucide-react';
import './UserTypeSelection.css';

const UserTypeSelection = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState(null);

  const handleSelect = (type) => {
    setSelectedType(type);
    // Store user type in sessionStorage to use during registration/login
    sessionStorage.setItem('userType', type);
    // Navigate to login with user type
    navigate('/login', { state: { userType: type } });
  };

  return (
    <div className="user-type-container">
      {/* Background Video */}
      <video 
        className="background-video" 
        autoPlay 
        loop 
        muted 
        playsInline
        preload="auto"
        poster="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&h=1080&fit=crop"
      >
        <source src="https://github.com/AvinashJ74/AgriShop/assets/83860778/dcc330e0-3690-48f4-a135-073c038b6b38" type='video/mp4' />
      </video>

      <div className="user-type-content">
        <div className="user-type-card">
          <h2 className="user-type-title">Welcome to AgriVision</h2>
          <p className="user-type-subtitle">Select your role to continue</p>

          <div className="user-type-options">
            {/* Farmer Option */}
            <div 
              className={`user-type-option ${selectedType === 'farmer' ? 'selected' : ''}`}
              onClick={() => handleSelect('farmer')}
            >
              <div className="user-type-icon farmer-icon">
                <Tractor className="w-16 h-16" />
              </div>
              <h3 className="user-type-name">Farmer</h3>
              <p className="user-type-description">
                Access farm management tools, soil analysis, crop monitoring, and connect with vendors
              </p>
              <div className="user-type-features">
                <span>Crop Management</span>
                <span>🌱 Soil Analysis</span>
                <span>Farm Analytics</span>
                <span>🤝 Find Customers</span>
              </div>
            </div>

            {/* Vendor Option */}
            <div 
              className={`user-type-option ${selectedType === 'vendor' ? 'selected' : ''}`}
              onClick={() => handleSelect('vendor')}
            >
              <div className="user-type-icon vendor-icon">
                <Store className="w-16 h-16" />
              </div>
              <h3 className="user-type-name">Vendor</h3>
              <p className="user-type-description">
                Offer services like insurance, machinery, logistics, and buy crops from farmers
              </p>
              <div className="user-type-features">
                <span>List Services</span>
                <span>🚚 Logistics</span>
                <span>Insurance</span>
                <span>🛒 Buy Crops</span>
              </div>
            </div>
          </div>

          <p className="user-type-note">
            Already have an account? <a href="/login" className="link">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserTypeSelection;

