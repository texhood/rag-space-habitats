// FeedbackRating.js - Star Rating Component
import React, { useState } from 'react';

function FeedbackRating({
  isExpanded,
  onExpand,
  onSubmit,
  isSubmitted,
  isLoading,
  submittedValue
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const handleRating = (rating) => {
    if (!isLoading) {
      onSubmit(rating);
    }
  };

  const getRatingLabel = (rating) => {
    const labels = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    return labels[rating] || '';
  };

  return (
    <div className={`feedback-type ${isExpanded ? 'expanded' : ''}`}>
      <button className="feedback-type-header" onClick={onExpand} disabled={isSubmitted && !isExpanded}>
        <span className="feedback-type-icon">⭐</span>
        <span className="feedback-type-title">Rate this response</span>
        <span className={`feedback-type-status ${isSubmitted ? 'submitted' : ''}`}>
          {isSubmitted ? `✓ ${submittedValue} ${submittedValue === '1' ? 'star' : 'stars'}` : ''}
        </span>
        <span className="feedback-type-arrow">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && !isSubmitted && (
        <div className="feedback-type-content">
          <p>How would you rate the quality of this response?</p>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                className={`rating-star ${hoverRating >= rating ? 'hovered' : ''}`}
                onClick={() => handleRating(rating)}
                onMouseEnter={() => setHoverRating(rating)}
                onMouseLeave={() => setHoverRating(0)}
                disabled={isLoading}
                title={getRatingLabel(rating)}
              >
                ★
              </button>
            ))}
          </div>
          {hoverRating > 0 && (
            <p className="rating-label">{getRatingLabel(hoverRating)}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default FeedbackRating;
