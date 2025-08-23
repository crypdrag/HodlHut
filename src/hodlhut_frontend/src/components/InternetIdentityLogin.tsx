import React, { useState } from 'react';
import { Lock, ChevronDown, ChevronUp, Shield, Smartphone, Key, AlertCircle } from 'lucide-react';
import '../styles/InternetIdentityLogin.css';

interface InternetIdentityLoginProps {
  onLogin: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const InternetIdentityLogin: React.FC<InternetIdentityLoginProps> = ({
  onLogin,
  onCancel,
  isLoading = false
}) => {
  const [showAllTips, setShowAllTips] = useState(false);
  
  const handleLogin = async () => {
    try {
      await onLogin();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="ii-overlay">
      <div className="ii-modal">
        <div className="ii-header">
          <h2 className="ii-title">Connect with Internet Identity</h2>
          <button className="ii-close" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ii-content">
          {/* URL Verification */}
          <div className="ii-url-verification">
            <div className="ii-url">
              <Shield size={16} className="ii-url-icon" />
              <span className="ii-url-text">
                rdmx6-jaaaa-aaaaa-aaadq-cai.ic0.app
              </span>
              <span className="ii-url-badge">✅ Verified</span>
            </div>
          </div>

          {/* Security Tip Card */}
          <div className="ii-security-tip">
            <div className="ii-security-tip-header">
              <Lock size={20} className="ii-security-tip-icon" />
              <div className="ii-security-tip-content">
                <h3 className="ii-security-tip-title">Stay Secure</h3>
                <p className="ii-security-tip-message">
                  Use Face ID, Touch ID, or a hardware security key for the strongest protection
                </p>
              </div>
              <button 
                className="ii-security-expand-btn"
                onClick={() => setShowAllTips(!showAllTips)}
                aria-label={showAllTips ? "Hide tips" : "Show more tips"}
              >
                {showAllTips ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span>{showAllTips ? 'Less' : 'More tips'}</span>
              </button>
            </div>

            {/* Expanded Security Tips */}
            {showAllTips && (
              <div className="ii-security-expanded">
                <div className="ii-security-tips-grid">
                  <div className="ii-security-tip-item">
                    <Smartphone size={16} />
                    <span>Add multiple devices for backup access</span>
                  </div>
                  <div className="ii-security-tip-item">
                    <Key size={16} />
                    <span>Use hardware keys when available</span>
                  </div>
                  <div className="ii-security-tip-item">
                    <Shield size={16} />
                    <span>Always verify this URL ends with .ic0.app</span>
                  </div>
                  <div className="ii-security-tip-item">
                    <AlertCircle size={16} />
                    <span>Always log out when finished</span>
                  </div>
                </div>
                <div className="ii-security-learn-more">
                  <a href="#" className="ii-security-link">
                    Complete security guide →
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Login Button */}
          <div className="ii-login-section">
            <button 
              className="ii-login-btn"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="ii-loading">
                  <div className="ii-spinner"></div>
                  Connecting...
                </span>
              ) : (
                <>
                  <Shield size={20} />
                  Continue with Internet Identity
                </>
              )}
            </button>
            
            <p className="ii-login-description">
              You'll be redirected to Internet Identity to authenticate securely. 
              No passwords required - just your device's biometrics or security key.
            </p>
          </div>

          {/* Cancel Option */}
          <div className="ii-cancel-section">
            <button 
              className="ii-cancel-btn"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="ii-footer">
          <p className="ii-footer-text">
            Powered by <strong>Internet Computer Protocol</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default InternetIdentityLogin;