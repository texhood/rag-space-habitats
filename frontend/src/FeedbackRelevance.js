// FeedbackRelevance.js - Document Relevance Component
import React from 'react';

function FeedbackRelevance({
  isExpanded,
  onExpand,
  onSubmit,
  isSubmitted,
  isLoading,
  submittedValue
}) {
  const handleRelevance = (relevance) => {
    if (!isLoading) {
      onSubmit(relevance);
    }
  };

  const relevanceOptions = [
    { value: 'relevant', label: '✓ Relevant', description: 'Documents are relevant to the query' },
    { value: 'partial', label: '◐ Partially Relevant', description: 'Some documents are relevant' },
    { value: 'not_relevant', label: '✗ Not Relevant', description: 'Documents are not relevant' }
  ];

  return (
    <div className={`feedback-type ${isExpanded ? 'expanded' : ''}`}>
      <button className="feedback-type-header" onClick={onExpand} disabled={isSubmitted && !isExpanded}>
        <span className="feedback-type-icon">📄</span>
        <span className="feedback-type-title">Document relevance</span>
        <span className={`feedback-type-status ${isSubmitted ? 'submitted' : ''}`}>
          {isSubmitted ? `✓ ${submittedValue === 'relevant' ? 'Relevant' : submittedValue === 'partial' ? 'Partially relevant' : 'Not relevant'}` : ''}
        </span>
        <span className="feedback-type-arrow">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && !isSubmitted && (
        <div className="feedback-type-content">
          <p>Were the retrieved documents relevant to your query?</p>
          <div className="relevance-options">
            {relevanceOptions.map((option) => (
              <button
                key={option.value}
                className="relevance-option"
                onClick={() => handleRelevance(option.value)}
                disabled={isLoading}
              >
                <span className="option-label">{option.label}</span>
                <span className="option-description">{option.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FeedbackRelevance;
