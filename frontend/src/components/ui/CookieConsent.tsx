"use client";

import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been accepted
    const hasAccepted = localStorage.getItem("cookie_consent_accepted");
    if (!hasAccepted) {
      // Show the cookie banner after a 1.5s delay to be non-intrusive and elegant
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie_consent_accepted", "true");
    setIsVisible(false);
  };

  const handleDecline = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="cookie-banner-overlay">
      <div className="cookie-banner-container surface-panel">
        <div className="cookie-banner-content">
          <span style={{ fontSize: "1.5rem" }}>🍪</span>
          <div className="cookie-banner-text">
            <strong>Thông báo Cookie</strong>
            <p>
              New Star Tour sử dụng cookie nhằm lưu trữ tùy chọn và nâng cao trải nghiệm của bạn trên website. 
              Bằng cách nhấp vào "Đồng ý", bạn chấp thuận chính sách cookie của chúng tôi.
            </p>
          </div>
        </div>
        <div className="cookie-banner-actions">
          <button 
            type="button" 
            className="cookie-btn cookie-btn--secondary" 
            onClick={handleDecline}
          >
            Từ chối
          </button>
          <button 
            type="button" 
            className="cookie-btn cookie-btn--primary" 
            onClick={handleAccept}
          >
            Đồng ý tất cả
          </button>
        </div>
      </div>
    </div>
  );
}
