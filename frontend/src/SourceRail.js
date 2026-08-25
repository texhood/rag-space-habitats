import { Link } from 'react-router-dom';
import './SourceRail.css';

function SourceRail({ sources }) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="source-rail">
      <p className="source-rail-label">Sources</p>
      <ul>
        {sources.map((source) => {
          const label = (
            <>
              <span className="source-index">[{source.index}]</span>
              <span className="source-title">{source.title}</span>
              {source.source ? (
                <span className="source-origin">{source.source}</span>
              ) : null}
            </>
          );

          const key = source.sourceId || `${source.index}-${source.title}`;
          if (source.href && source.href.startsWith('/')) {
            return (
              <li key={key}>
                <Link to={source.href} className="source-link">
                  {label}
                </Link>
              </li>
            );
          }

          if (source.url) {
            return (
              <li key={key}>
                <a
                  className="source-link"
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label}
                </a>
              </li>
            );
          }

          return (
            <li key={key}>
              <span className="source-plain">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default SourceRail;
