import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './index.css';

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');

    try {
      const res = await axios.post('http://localhost:5000/ask', { question });
      setAnswer(res.data.answer || 'No answer returned.');
    } catch (err) {
      setAnswer(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>NASA Manual Q&A (RAG)</h1>

      <div className="input-group">
        <input
          type="text"
          placeholder="Ask about the manual..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && ask()}
        />
        <button onClick={ask} disabled={loading}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </div>

      {loading && <p className="loading">Searching the manual...</p>}

      {answer && (
        <div className="answer">
          <strong>Answer:</strong>
          <ReactMarkdown>{answer}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default App;