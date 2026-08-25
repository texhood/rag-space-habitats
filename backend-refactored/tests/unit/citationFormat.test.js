const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeRetrievedChunk,
  formatSourcesForClient,
  buildLabeledContext,
  sourceLabel
} = require('../../services/citationFormat');

describe('normalizeRetrievedChunk', () => {
  it('keeps title, source, and source_id from metadata', () => {
    const chunk = normalizeRetrievedChunk({
      content: 'Centrifugal gravity at 1 rpm needs a large radius.',
      metadata: {
        title: 'Space Settlements: A Design Study',
        source: 'ntrs',
        license: 'Public Domain (U.S. Government Work)'
      },
      source_id: 'abc123',
      source_type: 'crawler',
      chunk_index: 4,
      similarity: 0.81
    });

    assert.equal(chunk.title, 'Space Settlements: A Design Study');
    assert.equal(chunk.source, 'ntrs');
    assert.equal(chunk.sourceId, 'abc123');
    assert.equal(chunk.chunkIndex, 4);
    assert.equal(chunk.similarity, 0.81);
  });

  it('parses JSON metadata strings', () => {
    const chunk = normalizeRetrievedChunk({
      content: 'Shielding.',
      metadata: JSON.stringify({ title: 'GCR notes', source: 'arxiv' }),
      source_id: 'doc-9'
    });
    assert.equal(chunk.title, 'GCR notes');
    assert.equal(chunk.source, 'arxiv');
  });
});

describe('formatSourcesForClient', () => {
  it('dedupes by source id and builds a library href', () => {
    const sources = formatSourcesForClient([
      {
        content: 'Passage one',
        title: 'NASA SP-413',
        source: 'ntrs',
        sourceId: '111'
      },
      {
        content: 'Passage two from the same paper',
        title: 'NASA SP-413',
        source: 'ntrs',
        sourceId: '111'
      },
      {
        content: 'A preprint',
        title: 'Closed-loop ECLSS',
        source: 'arxiv',
        sourceId: '222',
        url: 'https://arxiv.org/abs/1234.5678'
      }
    ]);

    assert.equal(sources.length, 2);
    assert.equal(sources[0].index, 1);
    assert.equal(sources[0].source, 'NASA NTRS');
    assert.equal(sources[0].href, '/browse?doc=111');
    assert.equal(sources[1].title, 'Closed-loop ECLSS');
    assert.equal(sources[1].href, '/browse?doc=222');
  });

  it('skips unlabeled string chunks used as project context', () => {
    const sources = formatSourcesForClient([
      '[PROJECT CONTEXT]\nObjectives: 50 m torus',
      {
        content: 'A habitat paper',
        title: 'Torus studies',
        source: 'ntrs',
        sourceId: '333'
      }
    ]);
    assert.equal(sources.length, 1);
    assert.equal(sources[0].title, 'Torus studies');
  });
});

describe('buildLabeledContext', () => {
  it('numbers retrieved papers and leaves project strings unlabeled', () => {
    const labeled = buildLabeledContext([
      '[PROJECT CONTEXT]\nRadius: 50 m',
      {
        content: 'Use a large radius to keep rpm low.',
        title: 'Space Settlements: A Design Study',
        source: 'ntrs',
        sourceId: 'abc'
      }
    ]);
    assert.match(labeled.text, /\[PROJECT CONTEXT\]/);
    assert.match(labeled.text, /\[1\] Space Settlements: A Design Study — NASA NTRS/);
    assert.equal(labeled.sourceCount, 1);
  });
});

describe('sourceLabel', () => {
  it('names NASA and arXiv collections', () => {
    assert.equal(sourceLabel('ntrs'), 'NASA NTRS');
    assert.equal(sourceLabel('arxiv'), 'arXiv');
    assert.equal(sourceLabel('19770014162_update.pdf'), 'Corpus');
  });
});
