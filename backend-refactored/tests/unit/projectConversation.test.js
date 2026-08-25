const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  titleFromUserText,
  toClientMessage
} = require('../../services/projectConversationFormat');

describe('titleFromUserText', () => {
  it('uses the first question as the conversation title', () => {
    assert.equal(
      titleFromUserText('What mass of water should fill the outer shell?'),
      'What mass of water should fill the outer shell?'
    );
  });

  it('collapses whitespace and truncates long titles', () => {
    const title = titleFromUserText('  A  '.repeat(40), 24);
    assert.equal(title.endsWith('…'), true);
    assert.ok(title.length <= 24);
  });

  it('labels an empty prompt', () => {
    assert.equal(titleFromUserText(''), 'New conversation');
  });
});

describe('toClientMessage', () => {
  it('maps query_id to queryId for the Query UI', () => {
    const mapped = toClientMessage({
      id: 9,
      role: 'assistant',
      content: 'Use the outer shell as a water shield.',
      query_id: 44,
      created_at: '2026-08-24T00:00:00.000Z'
    });
    assert.equal(mapped.queryId, 44);
    assert.equal(mapped.role, 'assistant');
    assert.deepEqual(mapped.sources, []);
  });

  it('passes through stored sources on assistant messages', () => {
    const mapped = toClientMessage({
      id: 10,
      role: 'assistant',
      content: '4.23 rpm.',
      query_id: 45,
      sources: [{ index: 1, title: 'NASA SP-413', href: '/browse?doc=abc' }],
      created_at: '2026-08-24T00:00:00.000Z'
    });
    assert.equal(mapped.sources.length, 1);
    assert.equal(mapped.sources[0].title, 'NASA SP-413');
  });
});
