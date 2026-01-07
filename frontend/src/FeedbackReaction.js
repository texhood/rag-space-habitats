// FeedbackReaction.js - Thumbs Up/Down Reaction Component
import React from 'react';

function FeedbackReaction({
  isExpanded,
  onExpand,
  onSubmit,
  isSubmitted,
  isLoading,
  submittedValue
}) {
  const handleReaction = (reaction) => {
    if (!isLoading) {
      onSubmit(reaction);
    }
  };

  return (
    <div className={`feedback-type ${isExpanded ? 'expanded' : ''}`}>
      <button className="feedback-type-header" onClick={onExpand} disabled={isSubmitted && !isExpanded}>
        <span className="feedback-type-icon">👍</span>
        <span className="feedback-type-title">Was this helpful?</span>
        <span className={`feedback-type-status ${isSubmitted ? 'submitted' : ''}`}>
          {isSubmitted ? `✓ ${submittedValue === 'thumbs_up' ? 'Helpful' : 'Not helpful'}` : ''}
        </span>
        <span className="feedback-type-arrow">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && !isSubmitted && (
        <div className="feedback-type-content">
          <p>Let us know if this response was helpful</p>
          <div className="reaction-buttons">
            <button
              className="reaction-btn thumbs-up"
              onClick={() => handleReaction('thumbs_up')}
              disabled={isLoading}
              title="Helpful"
            >
              👍 Helpful
            </button>
            <button
              className="reaction-btn thumbs-down"
              onClick={() => handleReaction('thumbs_down')}
              disabled={isLoading}
              title="Not helpful"
            >
              👎 Not Helpful
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeedbackReaction;
