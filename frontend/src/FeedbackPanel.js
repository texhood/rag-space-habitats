// FeedbackPanel.js - Integrated Feedback System Component
import React, { useState } from 'react';
import axios from 'axios';
import API_URL from './config';
import './FeedbackPanel.css';

import FeedbackReaction from './FeedbackReaction';
import FeedbackRating from './FeedbackRating';
import FeedbackRelevance from './FeedbackRelevance';
import FeedbackForm from './FeedbackForm';

function FeedbackPanel({ queryId, onFeedbackSubmitted }) {
  const [expandedType, setExpandedType] = useState(null);
  const [submittedFeedback, setSubmittedFeedback] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleReactionSubmit = async (reaction) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/feedback`,
        {
          queryId,
          feedbackType: 'reaction',
          reaction
        },
        { withCredentials: true }
      );

      setSubmittedFeedback(prev => ({ ...prev, reaction }));
      setSuccess('Thank you for your feedback!');
      setExpandedType(null);

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(response.data);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Please login to provide feedback');
      } else {
        setError(err.response?.data?.error || 'Failed to submit feedback');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSubmit = async (rating) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/feedback`,
        {
          queryId,
          feedbackType: 'rating',
          rating: parseInt(rating)
        },
        { withCredentials: true }
      );

      setSubmittedFeedback(prev => ({ ...prev, rating }));
      setSuccess('Thank you for rating!');
      setExpandedType(null);

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(response.data);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Please login to provide feedback');
      } else {
        setError(err.response?.data?.error || 'Failed to submit feedback');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRelevanceSubmit = async (relevance) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/feedback`,
        {
          queryId,
          feedbackType: 'relevance',
          documentRelevance: relevance
        },
        { withCredentials: true }
      );

      setSubmittedFeedback(prev => ({ ...prev, documentRelevance: relevance }));
      setSuccess('Document relevance recorded!');
      setExpandedType(null);

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(response.data);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Please login to provide feedback');
      } else {
        setError(err.response?.data?.error || 'Failed to submit feedback');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGeneralFeedbackSubmit = async (comment) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/feedback`,
        {
          queryId,
          feedbackType: 'general',
          comment
        },
        { withCredentials: true }
      );

      setSubmittedFeedback(prev => ({ ...prev, general: true }));
      setSuccess('Thank you for your feedback!');
      setExpandedType(null);

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(response.data);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Please login to provide feedback');
      } else {
        setError(err.response?.data?.error || 'Failed to submit feedback');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feedback-panel">
      <div className="feedback-header">
        <h3>Share Your Feedback</h3>
        <p>Help us improve by providing your thoughts on this response</p>
      </div>

      {error && <div className="feedback-error">{error}</div>}
      {success && <div className="feedback-success">{success}</div>}

      <div className="feedback-types">
        <FeedbackReaction
          isExpanded={expandedType === 'reaction'}
          onExpand={() => setExpandedType(expandedType === 'reaction' ? null : 'reaction')}
          onSubmit={handleReactionSubmit}
          isSubmitted={!!submittedFeedback.reaction}
          isLoading={loading}
          submittedValue={submittedFeedback.reaction}
        />

        <FeedbackRating
          isExpanded={expandedType === 'rating'}
          onExpand={() => setExpandedType(expandedType === 'rating' ? null : 'rating')}
          onSubmit={handleRatingSubmit}
          isSubmitted={!!submittedFeedback.rating}
          isLoading={loading}
          submittedValue={submittedFeedback.rating}
        />

        <FeedbackRelevance
          isExpanded={expandedType === 'relevance'}
          onExpand={() => setExpandedType(expandedType === 'relevance' ? null : 'relevance')}
          onSubmit={handleRelevanceSubmit}
          isSubmitted={!!submittedFeedback.documentRelevance}
          isLoading={loading}
          submittedValue={submittedFeedback.documentRelevance}
        />

        <FeedbackForm
          isExpanded={expandedType === 'general'}
          onExpand={() => setExpandedType(expandedType === 'general' ? null : 'general')}
          onSubmit={handleGeneralFeedbackSubmit}
          isSubmitted={!!submittedFeedback.general}
          isLoading={loading}
        />
      </div>
    </div>
  );
}

export default FeedbackPanel;
