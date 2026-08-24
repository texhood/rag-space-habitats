function titleFromUserText(text, max = 80) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  if (!compact) return 'New conversation';
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}…`;
}

function toClientMessage(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    queryId: row.query_id,
    createdAt: row.created_at
  };
}

function toClientConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    archived: Boolean(row.archived_at),
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messageCount: Number(row.message_count) || 0
  };
}

module.exports = {
  titleFromUserText,
  toClientMessage,
  toClientConversation
};
