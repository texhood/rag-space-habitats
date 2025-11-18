import React from 'react';
import './PricingPage.css';

function PricingPage({ user, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pricing-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Upgrade Your Plan</h2>
        <p>Premium features and pricing information coming soon!</p>
        <button onClick={onClose} className="close-btn">Close</button>
      </div>
    </div>
  );
}

export default PricingPage;
