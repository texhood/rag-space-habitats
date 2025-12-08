// PricingPage.js - Enhanced with US Best Practice messaging
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from './config';
import './PricingPage.css';

function PricingPage({ user, onClose }) {
  const [tiers, setTiers] = useState([]);
  const [betaMode, setBetaMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(null);

  useEffect(() => {
    fetchPricing();
    if (user) {
      fetchSubscriptionInfo();
    }
  }, [user]);

  const fetchPricing = async () => {
    try {
      const pricingRes = await axios.get(`${API_URL}/api/pricing`, {
        withCredentials: true
      });

      const betaRes = await axios.get(`${API_URL}/api/beta-mode`, {
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

  const fetchSubscriptionInfo = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/subscriptions/current`, {
        withCredentials: true
      });
      setSubscriptionInfo(res.data);
    } catch (err) {
      console.error('Failed to fetch subscription info:', err);
    }
  };

  // Calculate prorated amount for upgrade
  const calculateProration = (newPrice) => {
    if (!subscriptionInfo?.current_period_end) return null;
    
    const now = new Date();
    const periodEnd = new Date(subscriptionInfo.current_period_end);
    const periodStart = new Date(subscriptionInfo.current_period_start);
    
    const totalDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));
    
    if (remainingDays <= 0) return newPrice;
    
    const dailyRate = newPrice / 30; // Approximate monthly
    const currentDailyRate = (subscriptionInfo.price || 0) / 30;
    const proratedAmount = (dailyRate - currentDailyRate) * remainingDays;
    
    return Math.max(0, proratedAmount).toFixed(2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleUpgradeClick = (tier) => {
    const proratedAmount = calculateProration(parseFloat(tier.price));
    setShowConfirmModal({
      type: 'upgrade',
      tier: tier,
      proratedAmount: proratedAmount,
      nextBillingDate: subscriptionInfo?.current_period_end 
        ? formatDate(subscriptionInfo.current_period_end)
        : formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // 30 days from now
    });
  };

  const handleDowngradeClick = (tier) => {
    setShowConfirmModal({
      type: 'downgrade',
      tier: tier,
      effectiveDate: subscriptionInfo?.current_period_end 
        ? formatDate(subscriptionInfo.current_period_end)
        : 'end of current billing period'
    });
  };

  const confirmUpgrade = async () => {
    const tier = showConfirmModal.tier;
    setProcessingCheckout(tier.tier_key);
    setShowConfirmModal(null);

    try {
      const res = await axios.post(
        `${API_URL}/api/subscriptions/create-checkout`,
        { tier: tier.tier_key },
        { withCredentials: true }
      );

      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      alert('Failed to start checkout: ' + (err.response?.data?.error || err.message));
      setProcessingCheckout(null);
    }
  };

  const confirmDowngrade = async () => {
    const tier = showConfirmModal.tier;
    setShowConfirmModal(null);

    try {
      await axios.post(
        `${API_URL}/api/subscriptions/schedule-downgrade`,
        { tier: tier.tier_key },
        { withCredentials: true }
      );

      alert(`✅ Downgrade scheduled!\n\nYour plan will change to ${tier.name} on ${showConfirmModal.effectiveDate}.\n\nYou'll keep your current features until then.`);
      onClose();
    } catch (err) {
      alert('Failed to schedule downgrade: ' + (err.response?.data?.error || err.message));
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

  const canDowngrade = (tierKey) => {
    const tierOrder = ['free', 'basic', 'pro', 'enterprise', 'beta'];
    const currentIndex = tierOrder.indexOf(user?.subscription_tier || 'free');
    const targetIndex = tierOrder.indexOf(tierKey);
    return targetIndex < currentIndex && targetIndex >= 0;
  };

  // Get features helper
  const getFeatures = (tier) => {
    const features = tier.features || {};
    return {
      queriesPerDay: features.queries_per_day ?? tier.queries_per_day ?? 0,
      uploadsPerMonth: features.uploads_per_month ?? tier.uploads_per_month ?? 0,
      maxFileSize: features.max_file_size_mb ?? tier.max_file_size_mb ?? 0,
      llmAccess: features.llm_access || tier.llm_access || ['grok']
    };
  };

  if (loading) {
    return (
      <div className="pricing-page">
        <div className="pricing-container">
          <button className="close-pricing-btn" onClick={onClose}>×</button>
          <p style={{ color: 'white', textAlign: 'center', fontSize: '18px' }}>Loading pricing...</p>
        </div>
      </div>
    );
  }

  const visibleTiers = tiers.filter(tier => {
    if (tier.tier_key === 'beta' && !betaMode?.enabled) return false;
    return true;
  });

  return (
    <div className="pricing-page">
      <div className="pricing-container">
        <button className="close-pricing-btn" onClick={onClose}>×</button>

        <div className="pricing-header">
          <h1>Choose Your Plan</h1>
          <p>Unlock the full potential of Space Habitats RAG</p>
          {user && (
            <div className="current-plan-info">
              <div className="current-plan">
                Current Plan: <strong>{user.subscription_tier?.toUpperCase() || 'FREE'}</strong>
              </div>
              {subscriptionInfo?.current_period_end && user.subscription_tier !== 'free' && (
                <div className="next-billing">
                  Next billing date: <strong>{formatDate(subscriptionInfo.current_period_end)}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {betaMode?.enabled && (
          <div className="beta-banner">
            🎉 Beta Special: Get Pro features at a discounted rate!
          </div>
        )}

        <div className="pricing-grid">
          {visibleTiers.map(tier => {
            const isFree = parseFloat(tier.price) === 0 && tier.tier_key === 'free';
            const isCurrent = isCurrentTier(tier.tier_key);
            const isBeta = tier.tier_key === 'beta';
            const isPopular = tier.tier_key === 'pro';
            const features = getFeatures(tier);

            return (
              <div
                key={tier.tier_key}
                className={`pricing-card ${isCurrent ? 'current' : ''} ${isBeta ? 'beta' : ''} ${isPopular ? 'popular' : ''}`}
              >
                {isPopular && <div className="popular-badge">Most Popular</div>}
                {isBeta && <div className="beta-badge">Beta Special</div>}
                {isCurrent && <div className="current-badge">Current Plan</div>}

                <div className="pricing-card-header">
                  <h2>{tier.name}</h2>
                  <div className="price">
                    <span className="currency">$</span>
                    <span className="amount">{parseFloat(tier.price).toFixed(0)}</span>
                    <span className="period">/mo</span>
                  </div>
                  <p className="description">{tier.description}</p>
                </div>

                <div className="pricing-features">
                  <ul>
                    <li>
                      <span className="feature-icon">✓</span>
                      {features.queriesPerDay === -1 ? 'Unlimited' : features.queriesPerDay} queries/day
                    </li>
                    <li>
                      <span className="feature-icon">✓</span>
                      {features.uploadsPerMonth === -1 ? 'Unlimited' : features.uploadsPerMonth} uploads/month
                    </li>
                    <li>
                      <span className="feature-icon">✓</span>
                      {features.maxFileSize}MB max file size
                    </li>
                    <li>
                      <span className="feature-icon">✓</span>
                      {Array.isArray(features.llmAccess)
                        ? features.llmAccess.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(' + ')
                        : 'Grok'
                      } AI
                    </li>
                  </ul>
                </div>

                <div className="pricing-card-footer">
                  {isCurrent ? (
                    <button className="pricing-btn current" disabled>
                      Current Plan ✓
                    </button>
                  ) : canUpgrade(tier.tier_key) ? (
                    <button
                      className="pricing-btn upgrade"
                      onClick={() => handleUpgradeClick(tier)}
                      disabled={processingCheckout === tier.tier_key}
                    >
                      {processingCheckout === tier.tier_key ? 'Processing...' : 'Upgrade Now'}
                    </button>
                  ) : canDowngrade(tier.tier_key) ? (
                    <button
                      className="pricing-btn downgrade"
                      onClick={() => handleDowngradeClick(tier)}
                    >
                      Downgrade
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="confirm-modal-overlay" onClick={() => setShowConfirmModal(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            {showConfirmModal.type === 'upgrade' ? (
              <>
                <h2>🚀 Confirm Upgrade</h2>
                <div className="confirm-details">
                  <p className="plan-change">
                    <span className="from">{user?.subscription_tier?.toUpperCase() || 'FREE'}</span>
                    <span className="arrow">→</span>
                    <span className="to">{showConfirmModal.tier.name.toUpperCase()}</span>
                  </p>
                  
                  <div className="billing-info">
                    <div className="billing-row">
                      <span className="label">Features activate:</span>
                      <span className="value highlight">Immediately</span>
                    </div>
                    {showConfirmModal.proratedAmount && user?.subscription_tier !== 'free' && (
                      <div className="billing-row">
                        <span className="label">Today's charge (prorated):</span>
                        <span className="value">${showConfirmModal.proratedAmount}</span>
                      </div>
                    )}
                    {user?.subscription_tier === 'free' && (
                      <div className="billing-row">
                        <span className="label">Today's charge:</span>
                        <span className="value">${parseFloat(showConfirmModal.tier.price).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="billing-row">
                      <span className="label">Then monthly:</span>
                      <span className="value">${parseFloat(showConfirmModal.tier.price).toFixed(2)}/mo</span>
                    </div>
                    <div className="billing-row">
                      <span className="label">Next billing date:</span>
                      <span className="value">{showConfirmModal.nextBillingDate}</span>
                    </div>
                  </div>

                  <div className="feature-preview">
                    <h4>You'll get:</h4>
                    <ul>
                      {(() => {
                        const features = getFeatures(showConfirmModal.tier);
                        return (
                          <>
                            <li>✓ {features.queriesPerDay === -1 ? 'Unlimited' : features.queriesPerDay} queries/day</li>
                            <li>✓ {features.uploadsPerMonth === -1 ? 'Unlimited' : features.uploadsPerMonth} uploads/month</li>
                            <li>✓ {features.maxFileSize}MB max file size</li>
                            <li>✓ {Array.isArray(features.llmAccess) ? features.llmAccess.join(' + ') : 'Grok'} AI access</li>
                          </>
                        );
                      })()}
                    </ul>
                  </div>
                </div>
                <div className="confirm-buttons">
                  <button className="btn-confirm" onClick={confirmUpgrade}>
                    Confirm Upgrade
                  </button>
                  <button className="btn-cancel" onClick={() => setShowConfirmModal(null)}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>📉 Confirm Downgrade</h2>
                <div className="confirm-details">
                  <p className="plan-change">
                    <span className="from">{user?.subscription_tier?.toUpperCase()}</span>
                    <span className="arrow">→</span>
                    <span className="to">{showConfirmModal.tier.name.toUpperCase()}</span>
                  </p>

                  <div className="billing-info downgrade-info">
                    <div className="billing-row">
                      <span className="label">Current features available until:</span>
                      <span className="value">{showConfirmModal.effectiveDate}</span>
                    </div>
                    <div className="billing-row">
                      <span className="label">New plan starts:</span>
                      <span className="value">{showConfirmModal.effectiveDate}</span>
                    </div>
                    <div className="billing-row">
                      <span className="label">New monthly rate:</span>
                      <span className="value">${parseFloat(showConfirmModal.tier.price).toFixed(2)}/mo</span>
                    </div>
                  </div>

                  <div className="warning-box">
                    <p>⚠️ You'll lose access to these features on {showConfirmModal.effectiveDate}:</p>
                    <ul>
                      {/* Show features being lost - compare current vs new tier */}
                      <li>Reduced query limits</li>
                      <li>Reduced upload limits</li>
                      {user?.subscription_tier === 'pro' || user?.subscription_tier === 'enterprise' ? (
                        <li>Claude AI access</li>
                      ) : null}
                    </ul>
                  </div>
                </div>
                <div className="confirm-buttons">
                  <button className="btn-confirm downgrade" onClick={confirmDowngrade}>
                    Confirm Downgrade
                  </button>
                  <button className="btn-cancel" onClick={() => setShowConfirmModal(null)}>
                    Keep Current Plan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PricingPage;