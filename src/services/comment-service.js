class CommentService {
  constructor(db) {
    this.db = db;
  }

  async addComment({ userId, trackId, content }) {
    return this.db.run(
      'INSERT INTO comments (user_id, track_id, content) VALUES (?, ?, ?)',
      [userId, trackId, content]
    );
  }

  async getCommentsByTrack(trackId) {
    return this.db.all(
      `SELECT c.*, u.name AS author_name, u.role AS author_role
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.track_id = ?
       ORDER BY c.created_at DESC, c.id DESC`,
      [trackId]
    );
  }

  async listAllComments() {
    return this.db.all(
      `SELECT c.id, c.content, c.created_at, u.name AS author_name, t.title AS track_title
       FROM comments c
       JOIN users u ON u.id = c.user_id
       JOIN tracks t ON t.id = c.track_id
       ORDER BY c.created_at DESC, c.id DESC`
    );
  }

  async deleteComment(id) {
    return this.db.run('DELETE FROM comments WHERE id = ?', [id]);
  }
}

module.exports = { CommentService };
