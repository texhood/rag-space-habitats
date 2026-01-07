// FeedbackForm.js - General Feedback Text Input Component
import React, { useState } from 'react';

function FeedbackForm({
  isExpanded,
  onExpand,
  onSubmit,
  isSubmitted,
  isLoading
}) {
  const [comment, setComment] = useState('');
  const [charCount, setCharCount] = useState(0);
  const maxChars = 500;

  const handleCommentChange = (e) => {
    const text = e.target.value;
    if (text.length <= maxChars) {
      setComment(text);
      setCharCount(text.length);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (comment.trim() && !isLoading) {
      onSubmit(comment.trim());
      setComment('');
      setCharCount(0);
    }
  };

  return (
    <div className={`feedback-type ${isExpanded ? 'expanded' : ''}`}>
      <button className="feedback-type-header" onClick={onExpand} disabled={isSubmitted && !isExpanded}>
        <span className="feedback-type-icon">💬</span>
        <span className="feedback-type-title">General feedback</span>
        <span className={`feedback-type-status ${isSubmitted ? 'submitted' : ''}`}>
          {isSubmitted ? '✓ Sent' : ''}
        </span>
        <span className="feedback-type-arrow">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && !isSubmitted && (
        <div className="feedback-type-content">
          <p>Share any additional comments or suggestions (optional)</p>
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="form-group">
              <textarea
                value={comment}
                onChange={handleCommentChange}
                placeholder="Tell us what you think... (up to 500 characters)"
                className="feedback-textarea"
                rows="4"
                disabled={isLoading}
              />
              <div className="char-count">
                {charCount}/{maxChars}
              </div>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={!comment.trim() || isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Feedback'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default FeedbackForm;
