export const STARTER_QUESTIONS = [
  {
    topic: 'Gravity',
    text: 'What rotation rate produces 1g at a 50 meter radius?'
  },
  {
    topic: 'Radiation',
    text: 'How much shielding mass is typically required against galactic cosmic rays?'
  },
  {
    topic: 'Life support',
    text: 'What are the main options for closing the water loop in a habitat?'
  },
  {
    topic: 'Structure',
    text: 'What materials are proposed for the hull of an O\'Neill cylinder?'
  }
];

export const DEMO_QUESTION = STARTER_QUESTIONS[0].text;

export function formatCorpusLabel(stats) {
  if (!stats || !stats.documents) return '';
  const parts = [`${stats.documents} documents`];
  if (stats.sources?.ntrs) parts.push(`${stats.sources.ntrs} NASA`);
  if (stats.sources?.arxiv) parts.push(`${stats.sources.arxiv} arXiv`);
  if (stats.chunks) parts.push(`${stats.chunks} passages`);
  return parts.join(' · ');
}
