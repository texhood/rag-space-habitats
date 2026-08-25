const pool = require('../config/database');
const Project = require('./Project');
const {
  titleFromUserText,
  toClientMessage,
  toClientConversation
} = require('../services/projectConversationFormat');

class ProjectConversation {
  static async _requireProject(projectId, userId) {
    const project = await Project.getById(projectId, userId);
    if (!project) {
      const err = new Error('Project not found');
      err.status = 404;
      throw err;
    }
    return project;
  }

  static async list(projectId, userId) {
    await this._requireProject(projectId, userId);
    const result = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*)::int FROM project_conversation_messages m
                WHERE m.conversation_id = c.id) AS message_count
       FROM project_conversations c
       WHERE c.project_id = $1
       ORDER BY c.archived_at NULLS FIRST, c.updated_at DESC`,
      [projectId]
    );
    return result.rows.map(toClientConversation);
  }

  static async getMessages(conversationId) {
    const result = await pool.query(
      `SELECT * FROM project_conversation_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC, id ASC`,
      [conversationId]
    );
    return result.rows.map(toClientMessage);
  }

  static async getActive(projectId, userId) {
    await this._requireProject(projectId, userId);
    const result = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*)::int FROM project_conversation_messages m
                WHERE m.conversation_id = c.id) AS message_count
       FROM project_conversations c
       WHERE c.project_id = $1 AND c.archived_at IS NULL
       LIMIT 1`,
      [projectId]
    );
    return result.rows[0] ? toClientConversation(result.rows[0]) : null;
  }

  static async getOrCreateActive(projectId, userId) {
    await this._requireProject(projectId, userId);
    const existing = await this.getActive(projectId, userId);
    if (existing) {
      const messages = await this.getMessages(existing.id);
      return { conversation: existing, messages };
    }

    const created = await pool.query(
      `INSERT INTO project_conversations (project_id)
       VALUES ($1)
       RETURNING *`,
      [projectId]
    );
    const conversation = toClientConversation({ ...created.rows[0], message_count: 0 });
    return { conversation, messages: [] };
  }

  static async appendExchange(projectId, userId, { question, answer, queryId = null, sources = null }) {
    const { conversation } = await this.getOrCreateActive(projectId, userId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO project_conversation_messages (conversation_id, role, content)
         VALUES ($1, 'user', $2)`,
        [conversation.id, question]
      );
      await client.query(
        `INSERT INTO project_conversation_messages (conversation_id, role, content, query_id, sources)
         VALUES ($1, 'assistant', $2, $3, $4)`,
        [conversation.id, answer, queryId, sources && sources.length ? sources : null]
      );

      const title = conversation.messageCount === 0
        ? titleFromUserText(question)
        : conversation.title;

      await client.query(
        `UPDATE project_conversations
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

  static async startNew(projectId, userId) {
    await this._requireProject(projectId, userId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const active = await client.query(
        `SELECT c.*,
                (SELECT COUNT(*)::int FROM project_conversation_messages m
                  WHERE m.conversation_id = c.id) AS message_count
         FROM project_conversations c
         WHERE c.project_id = $1 AND c.archived_at IS NULL
         FOR UPDATE`,
        [projectId]
      );

      if (active.rows[0] && Number(active.rows[0].message_count) > 0) {
        await client.query(
          `UPDATE project_conversations
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
        `INSERT INTO project_conversations (project_id)
         VALUES ($1)
         RETURNING *`,
        [projectId]
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

  static async open(projectId, userId, conversationId) {
    await this._requireProject(projectId, userId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const target = await client.query(
        `SELECT * FROM project_conversations
         WHERE id = $1 AND project_id = $2
         FOR UPDATE`,
        [conversationId, projectId]
      );
      if (!target.rows[0]) {
        const err = new Error('Conversation not found');
        err.status = 404;
        throw err;
      }

      const active = await client.query(
        `SELECT c.*,
                (SELECT COUNT(*)::int FROM project_conversation_messages m
                  WHERE m.conversation_id = c.id) AS message_count
         FROM project_conversations c
         WHERE c.project_id = $1 AND c.archived_at IS NULL
         FOR UPDATE`,
        [projectId]
      );

      if (active.rows[0] && active.rows[0].id !== Number(conversationId)) {
        if (Number(active.rows[0].message_count) === 0) {
          await client.query(
            `DELETE FROM project_conversations WHERE id = $1`,
            [active.rows[0].id]
          );
        } else {
          await client.query(
            `UPDATE project_conversations
             SET archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [active.rows[0].id]
          );
        }
      }

      await client.query(
        `UPDATE project_conversations
         SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [conversationId]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return this.getOrCreateActive(projectId, userId);
  }
}

module.exports = ProjectConversation;
