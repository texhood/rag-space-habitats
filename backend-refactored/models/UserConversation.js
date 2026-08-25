const pool = require('../config/database');
const {
  titleFromUserText,
  toClientMessage,
  toClientConversation
} = require('../services/projectConversationFormat');

class UserConversation {
  static async list(userId) {
    const result = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*)::int FROM user_conversation_messages m
                WHERE m.conversation_id = c.id) AS message_count
       FROM user_conversations c
       WHERE c.user_id = $1
       ORDER BY c.archived_at NULLS FIRST, c.updated_at DESC`,
      [userId]
    );
    return result.rows.map((row) => toClientConversation({ ...row, user_id: row.user_id }));
  }

  static async getMessages(conversationId) {
    const result = await pool.query(
      `SELECT * FROM user_conversation_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC, id ASC`,
      [conversationId]
    );
    return result.rows.map(toClientMessage);
  }

  static async getActive(userId) {
    const result = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*)::int FROM user_conversation_messages m
                WHERE m.conversation_id = c.id) AS message_count
       FROM user_conversations c
       WHERE c.user_id = $1 AND c.archived_at IS NULL
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] ? toClientConversation(result.rows[0]) : null;
  }

  static async getOrCreateActive(userId) {
    const existing = await this.getActive(userId);
    if (existing) {
      const messages = await this.getMessages(existing.id);
      return { conversation: existing, messages };
    }

    const created = await pool.query(
      `INSERT INTO user_conversations (user_id)
       VALUES ($1)
       RETURNING *`,
      [userId]
    );
    const conversation = toClientConversation({ ...created.rows[0], message_count: 0 });
    return { conversation, messages: [] };
  }

  static async appendExchange(userId, { question, answer, queryId = null, sources = null }) {
    const { conversation } = await this.getOrCreateActive(userId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO user_conversation_messages (conversation_id, role, content)
         VALUES ($1, 'user', $2)`,
        [conversation.id, question]
      );
      await client.query(
        `INSERT INTO user_conversation_messages (conversation_id, role, content, query_id, sources)
         VALUES ($1, 'assistant', $2, $3, $4)`,
        [conversation.id, answer, queryId, sources && sources.length ? sources : null]
      );

      const title = conversation.messageCount === 0
        ? titleFromUserText(question)
        : conversation.title;

      await client.query(
        `UPDATE user_conversations
         SET title = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [title, conversation.id]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async startNew(userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const active = await client.query(
        `SELECT c.*,
                (SELECT COUNT(*)::int FROM user_conversation_messages m
                  WHERE m.conversation_id = c.id) AS message_count
         FROM user_conversations c
         WHERE c.user_id = $1 AND c.archived_at IS NULL
         FOR UPDATE`,
        [userId]
      );

      if (active.rows[0] && Number(active.rows[0].message_count) > 0) {
        await client.query(
          `UPDATE user_conversations
           SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [active.rows[0].id]
        );
      } else if (active.rows[0]) {
        await client.query('COMMIT');
        const conversation = toClientConversation(active.rows[0]);
        return { conversation, messages: [] };
      }

      const created = await client.query(
        `INSERT INTO user_conversations (user_id)
         VALUES ($1)
         RETURNING *`,
        [userId]
      );
      await client.query('COMMIT');
      return {
        conversation: toClientConversation({ ...created.rows[0], message_count: 0 }),
        messages: []
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = UserConversation;
