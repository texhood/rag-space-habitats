// PricingPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PricingPage.css';

function PricingPage({ user, onClose }) {
  const [tiers, setTiers] = useState([]);
  const [betaMode, setBetaMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(null);

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      // Get tier pricing
      const pricingRes = await axios.get('http://localhost:5000/api/pricing', {
        withCredentials: true
      });
      
      // Get beta mode status
      const betaRes = await axios.get('http://localhost:5000/api/beta-mode', {
        withCredentials: true
      });
      
      setTiers(pricingRes.data.tiers || []);
      setBetaMode(betaRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
      setLoading(false);
    }
  };

  const handleUpgrade = async (tierKey) => {
    setProcessingCheckout(tierKey);
    
    try {
      const res = await axios.post(
        'http://localhost:5000/api/subscriptions/create-checkout',
        { tier: tierKey },
        { withCredentials: true }
      );
      
      // Redirect to Stripe Checkout
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      alert('Failed to start checkout: ' + (err.response?.data?.error || err.message));
      setProcessingCheckout(null);
    }
  };

  const isCurrentTier = (tierKey) => {
    return user?.subscription_tier === tierKey;
  };

  const canUpgrade = (tierKey) => {
    const tierOrder = ['free', 'basic', 'pro', 'enterprise', 'beta'];
    const currentIndex = tierOrder.indexOf(user?.subscription_tier || 'free');
    const targetIndex = tierOrder.indexOf(tierKey);
    return targetIndex > currentIndex;
  };

  if (loading) {
    return (
      <div className="pricing-page">
        <div className="pricing-container">
          <p>Loading pricing...</p>
        </div>
      </div>
    );
  }

  // Filter out beta if not enabled
  const visibleTiers = betaMode?.enabled 
    ? tiers 
    : tiers.filter(t => t.tier_key !== 'beta');

  return (
    <div className="pricing-page">
      <div className="pricing-container">
        <button onClick={onClose} className="close-pricing-btn">✕</button>
        
        <div className="pricing-header">
          <h1>Choose Your Plan</h1>
          <p>Select the perfect plan for your needs</p>
          {user && (
            <p className="current-plan">
              Current Plan: <strong>{user.subscription_tier || 'free'}</strong>
            </p>
          )}
        </div>

        {betaMode?.enabled && (
          <div className="beta-banner">
            🚀 <strong>Beta Special:</strong> Get Pro features for ${betaMode.price}/month!
          </div>
        )}

        <div className="pricing-grid">
          {visibleTiers.map(tier => {
            const isFree = tier.price === 0 || tier.tier_key === 'free';
            const isCurrent = isCurrentTier(tier.tier_key);
            const canUpgradeToThis = canUpgrade(tier.tier_key);
            const isBeta = tier.tier_key === 'beta';

            return (
              <div 
                key={tier.id} 
                className={`pricing-card ${isCurrent ? 'current' : ''} ${isBeta ? 'beta' : ''} ${tier.tier_key === 'pro' ? 'popular' : ''}`}
              >
                {tier.tier_key === 'pro' && <div className="popular-badge">Most Popular</div>}
                {isBeta && <div className="beta-badge">🚀 Beta</div>}
                
                <div className="pricing-card-header">
                  <h3>{tier.name}</h3>
                  <div className="price">
                    {isFree ? (
                      <>
                        <span className="price-amount">Free</span>
                      </>
                    ) : (
                      <>
                        <span className="price-currency">$</span>
                        <span className="price-amount">{parseFloat(tier.price).toFixed(0)}</span>
                        <span className="price-period">/month</span>
                      </>
                    )}
                  </div>
                  <p className="tier-description">{tier.description}</p>
                </div>

                <div className="pricing-card-features">
                  <ul>
                    <li>
                      <span className="feature-icon">✓</span>
                      {tier.features.queries_per_day === -1 
                        ? 'Unlimited queries' 
                        : `${tier.features.queries_per_day} queries per day`}
                    </li>
                    <li>
                      <span className="feature-icon">✓</span>
                      {tier.features.uploads_per_month === -1 
                        ? 'Unlimited uploads' 
                        : tier.features.uploads_per_month === 0
                        ? 'View only (no uploads)'
                        : `${tier.features.uploads_per_month} uploads per month`}
                    </li>
                    <li>
                      <span className="feature-icon">✓</span>
                      {tier.features.max_file_size_mb 
                        ? `${tier.features.max_file_size_mb}MB max file size`
                        : 'No file uploads'}
                    </li>
                    <li>
                      <span className="feature-icon">✓</span>
                      {tier.features.llm_access?.includes('claude') && tier.features.llm_access?.includes('grok')
                        ? 'Both Grok & Claude AI'
                        : tier.features.llm_access?.includes('grok')
                        ? 'Grok AI access'
                        : 'AI access'}
                    </li>
                    {tier.tier_key === 'enterprise' && (
                      <>
                        <li>
                          <span className="feature-icon">✓</span>
                          Priority support
                        </li>
                        <li>
                          <span className="feature-icon">✓</span>
                          API access
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="pricing-card-action">
                  {isCurrent ? (
                    <button className="pricing-btn current" disabled>
                      Current Plan ✓
                    </button>
                  ) : isFree && !user ? (
                    <button 
                      className="pricing-btn free"
                      onClick={() => window.location.href = '/'}
                    >
                      Sign Up Free
                    </button>
                  ) : canUpgradeToThis && !isFree ? (
                    <button 
                      className="pricing-btn upgrade"
                      onClick={() => handleUpgrade(tier.tier_key)}
                      disabled={processingCheckout === tier.tier_key}
                    >
                      {processingCheckout === tier.tier_key ? 'Processing...' : 'Upgrade Now'}
                    </button>
                  ) : (
                    <button className="pricing-btn" disabled>
                      {isFree ? 'Free Tier' : 'Not Available'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pricing-footer">
          <p>All plans include access to our knowledge base of space habitat information.</p>
          <p>Cancel anytime. No hidden fees.</p>
        </div>
      </div>
    </div>
  );
}

export default PricingPage;