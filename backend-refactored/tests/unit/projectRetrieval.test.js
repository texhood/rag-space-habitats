const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { splitText, rankProjectPieces, projectPromptPieces } = require('../../services/projectRetrieval');

describe('splitText', () => {
  it('keeps a short note as one chunk', () => {
    assert.deepEqual(splitText('Hull thickness is 2 meters.'), ['Hull thickness is 2 meters.']);
  });

  it('splits a long upload into more than one piece', () => {
    const text = Array.from({ length: 20 }, (_, i) => `Section ${i} discusses radiation shielding.`).join(' ');
    const chunks = splitText(text, 80, 10);
    assert.ok(chunks.length > 1);
    assert.ok(chunks.every((chunk) => chunk.length > 0));
  });
});

describe('rankProjectPieces', () => {
  it('ranks a matching chunk above a full-file dump', () => {
    const ranked = rankProjectPieces([
      {
        kind: 'full-file',
        content: 'Entire upload pasted into the prompt.',
        similarity: 0.91
      },
      {
        kind: 'chunk',
        content: 'The habitat hull is 2 meters thick.',
        similarity: 0.62
      },
      {
        kind: 'chunk',
        content: 'Unrelated budget appendix.',
        similarity: 0.11
      }
    ]);

    assert.equal(ranked.length, 1);
    assert.equal(ranked[0].content, 'The habitat hull is 2 meters thick.');
  });
});

describe('projectPromptPieces', () => {
  it('includes objectives and the matching page, not the whole file', () => {
    const pieces = projectPromptPieces(
      { objectives: 'Size the hull.', constraints: '' },
      [{ file_name: 'hull.pdf', content: 'The habitat hull is 2 meters thick.' }]
    );
    assert.match(pieces[0], /Size the hull/);
    assert.match(pieces[1], /hull\.pdf/);
    assert.equal(pieces.some((piece) => piece.includes('Entire upload')), false);
  });
});
