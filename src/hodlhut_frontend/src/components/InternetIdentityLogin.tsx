import React, { useState } from 'react';
import { Lock } from 'lucide-react';
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
  const handleLogin = async () => {
    try {
      await onLogin();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="ii-overlay">
      <div className="ii-container">
        {/* Internet Identity Header */}
        <div className="ii-header">
          <div className="ii-logo">
            <div className="ii-infinity-symbol">∞</div>
            <h1 className="ii-title">Internet Identity</h1>
          </div>
          <button className="ii-close" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>

        {/* Main Content */}
        <div className="ii-main-content">
          <div className="ii-welcome-section">
            <h2 className="ii-welcome-title">Welcome to HodlHut</h2>
            <p className="ii-welcome-subtitle">
              Authenticate with Internet Identity to access your sovereign multi-chain hub
            </p>
          </div>

          {/* Security Notice */}
          <div className="ii-security-notice">
            <div className="ii-security-icon">
              <Lock size={16} />
            </div>
            <div className="ii-security-text">
              <strong>Stay Secure:</strong> Use Face ID, Touch ID, or a hardware security key for the strongest protection
            </div>
          </div>

          {/* Authentication Methods */}
          <div className="ii-auth-methods">
            <div className="ii-auth-option">
              <div className="ii-auth-icon">🔐</div>
              <div className="ii-auth-info">
                <h3>Cryptographic Authentication</h3>
                <p>No passwords, just your device's secure authentication</p>
              </div>
            </div>
            
            <div className="ii-auth-option">
              <div className="ii-auth-icon">🛡️</div>
              <div className="ii-auth-info">
                <h3>Hardware Security</h3>
                <p>Protected by your device's secure enclave</p>
              </div>
            </div>
          </div>

          {/* Connect Button */}
          <div className="ii-connect-section">
            <button 
              className="ii-connect-btn"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="ii-loading-state">
                  <div className="ii-spinner"></div>
                  <span>Connecting to Internet Identity...</span>
                </div>
              ) : (
                <span>Continue with Internet Identity</span>
              )}
            </button>
            
            <p className="ii-connect-description">
              You'll be redirected to <strong>identity.ic0.app</strong> to authenticate securely
            </p>
          </div>

          {/* URL Verification */}
          <div className="ii-url-info">
            <div className="ii-url-label">Authenticating with:</div>
            <div className="ii-url-value">rdmx6-jaaaa-aaaaa-aaadq-cai.ic0.app</div>
            <div className="ii-url-verified">✅ Verified Internet Identity Canister</div>
          </div>
        </div>

        {/* Footer */}
        <div className="ii-footer">
          <div className="ii-footer-links">
            <a href="#" onClick={onCancel}>Cancel</a>
            <a href="https://identity.ic0.app" target="_blank" rel="noopener noreferrer">
              Learn more about Internet Identity
            </a>
          </div>
          <div className="ii-footer-brand">
            <span>Powered by</span>
            <strong>Internet Computer</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternetIdentityLogin;