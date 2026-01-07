// AdminFeedbackDashboard.js - Admin Feedback Analytics and Review
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from './config';
import './AdminFeedbackDashboard.css';

function AdminFeedbackDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchFeedbackData();
  }, [days]);

  const fetchFeedbackData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch analytics
      const analyticsRes = await axios.get(
        `${API_URL}/api/feedback/admin/analytics?days=${days}`,
        { withCredentials: true }
      );

      setAnalytics(analyticsRes.data.analytics);
      setSentiment(analyticsRes.data.sentiment);

      // Fetch recent feedback
      const feedbackRes = await axios.get(
        `${API_URL}/api/feedback/admin/all?limit=50`,
        { withCredentials: true }
      );

      setFeedback(feedbackRes.data.feedback);
    } catch (err) {
      console.error('Failed to fetch feedback data:', err);
      setError(err.response?.data?.error || 'Failed to load feedback data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReactionEmoji = (reaction) => {
    return reaction === 'thumbs_up' ? '👍' : '👎';
  };

  const getRelevanceColor = (relevance) => {
    switch (relevance) {
      case 'relevant':
        return '#4a9';
      case 'partial':
        return '#fb7';
      case 'not_relevant':
        return '#f44';
      default:
        return '#999';
    }
  };

  const filteredFeedback = selectedType
    ? feedback.filter(f => f.feedback_type === selectedType)
    : feedback;

  if (loading) {
    return <div className="feedback-dashboard loading">Loading feedback data...</div>;
  }

  if (error) {
    return <div className="feedback-dashboard error">{error}</div>;
  }

  return (
    <div className="feedback-dashboard">
      <div className="dashboard-header">
        <h2>Feedback Analytics</h2>
        <div className="period-selector">
          <label>Period: </label>
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="analytics-grid">
        <div className="stat-card">
          <div className="stat-label">Total Feedback</div>
          <div className="stat-value">{analytics?.totalFeedback || 0}</div>
          <div className="stat-sublabel">Users contributed</div>
          <div className="stat-subvalue">{analytics?.usersProvidedFeedback || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Sentiment</div>
          <div className="sentiment-breakdown">
            <div className="sentiment-item positive">
              <span className="sentiment-label">Positive</span>
              <span className="sentiment-count">{sentiment?.positive || 0}</span>
            </div>
            <div className="sentiment-item neutral">
              <span className="sentiment-label">Neutral</span>
              <span className="sentiment-count">{sentiment?.neutral || 0}</span>
            </div>
            <div className="sentiment-item negative">
              <span className="sentiment-label">Negative</span>
              <span className="sentiment-count">{sentiment?.negative || 0}</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Average Rating</div>
          <div className="stat-value">
            {analytics?.ratings?.average?.toFixed(1) || '0'} ⭐
          </div>
          <div className="stat-sublabel">Ratings submitted</div>
          <div className="stat-subvalue">{analytics?.ratings?.total || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Reactions</div>
          <div className="reactions-breakdown">
            <div className="reaction-item">
              <span className="reaction-emoji">👍</span>
              <span className="reaction-count">{analytics?.reactions?.thumbsUp || 0}</span>
            </div>
            <div className="reaction-item">
              <span className="reaction-emoji">👎</span>
              <span className="reaction-count">{analytics?.reactions?.thumbsDown || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="detailed-stats">
        <div className="stat-section">
          <h3>Document Relevance</h3>
          <div className="relevance-bars">
            <div className="bar-item">
              <span className="bar-label">Relevant</span>
              <div className="bar-background">
                <div
                  className="bar-fill"
                  style={{
                    width: `${((analytics?.relevance?.relevant || 0) / (analytics?.relevance?.total || 1)) * 100}%`,
                    backgroundColor: '#4a9'
                  }}
                />
              </div>
              <span className="bar-value">{analytics?.relevance?.relevant || 0}</span>
            </div>

            <div className="bar-item">
              <span className="bar-label">Partially Relevant</span>
              <div className="bar-background">
                <div
                  className="bar-fill"
                  style={{
                    width: `${((analytics?.relevance?.partial || 0) / (analytics?.relevance?.total || 1)) * 100}%`,
                    backgroundColor: '#fb7'
                  }}
                />
              </div>
              <span className="bar-value">{analytics?.relevance?.partial || 0}</span>
            </div>

            <div className="bar-item">
              <span className="bar-label">Not Relevant</span>
              <div className="bar-background">
                <div
                  className="bar-fill"
                  style={{
                    width: `${((analytics?.relevance?.notRelevant || 0) / (analytics?.relevance?.total || 1)) * 100}%`,
                    backgroundColor: '#f44'
                  }}
                />
              </div>
              <span className="bar-value">{analytics?.relevance?.notRelevant || 0}</span>
            </div>
          </div>
        </div>

        <div className="stat-section">
          <h3>Feedback Types</h3>
          <div className="type-buttons">
            <button
              className={`type-btn ${!selectedType ? 'active' : ''}`}
              onClick={() => setSelectedType(null)}
            >
              All ({feedback.length})
            </button>
            <button
              className={`type-btn ${selectedType === 'reaction' ? 'active' : ''}`}
              onClick={() => setSelectedType('reaction')}
            >
              Reactions ({analytics?.reactions?.total || 0})
            </button>
            <button
              className={`type-btn ${selectedType === 'rating' ? 'active' : ''}`}
              onClick={() => setSelectedType('rating')}
            >
              Ratings ({analytics?.ratings?.total || 0})
            </button>
            <button
              className={`type-btn ${selectedType === 'relevance' ? 'active' : ''}`}
              onClick={() => setSelectedType('relevance')}
            >
              Relevance ({analytics?.relevance?.total || 0})
            </button>
            <button
              className={`type-btn ${selectedType === 'general' ? 'active' : ''}`}
              onClick={() => setSelectedType('general')}
            >
              General ({analytics?.generalFeedback?.total || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="feedback-list-section">
        <h3>Recent Feedback ({filteredFeedback.length})</h3>
        <div className="feedback-list">
          {filteredFeedback.length === 0 ? (
            <div className="empty-state">No feedback found for the selected filter</div>
          ) : (
            filteredFeedback.map((item) => (
              <div key={item.id} className={`feedback-item feedback-type-${item.feedback_type}`}>
                <div className="feedback-item-header">
                  <span className="feedback-user">{item.username || 'Anonymous'}</span>
                  <span className="feedback-date">{formatDate(item.created_at)}</span>
                </div>

                <div className="feedback-item-content">
                  {item.feedback_type === 'reaction' && (
                    <>
                      <span className="feedback-label">Reaction:</span>
                      <span className="feedback-value">
                        {getReactionEmoji(item.reaction)} {item.reaction === 'thumbs_up' ? 'Helpful' : 'Not helpful'}
                      </span>
                    </>
                  )}

                  {item.feedback_type === 'rating' && (
                    <>
                      <span className="feedback-label">Rating:</span>
                      <span className="feedback-value">
                        {'⭐'.repeat(item.rating)} ({item.rating}/5)
                      </span>
                    </>
                  )}

                  {item.feedback_type === 'relevance' && (
                    <>
                      <span className="feedback-label">Relevance:</span>
                      <span
                        className="feedback-value"
                        style={{ color: getRelevanceColor(item.document_relevance) }}
                      >
                        {item.document_relevance === 'relevant'
                          ? '✓ Relevant'
                          : item.document_relevance === 'partial'
                          ? '◐ Partially Relevant'
                          : '✗ Not Relevant'}
                      </span>
                    </>
                  )}

                  {item.feedback_type === 'general' && (
                    <>
                      <span className="feedback-label">Feedback:</span>
                      <p className="feedback-comment">{item.comment}</p>
                    </>
                  )}
                </div>

                {item.question && (
                  <div className="feedback-context">
                    <span className="context-label">Related Query:</span>
                    <span className="context-value">{item.question.substring(0, 100)}...</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminFeedbackDashboard;
