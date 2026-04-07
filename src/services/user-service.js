class UserService {
  constructor(db) {
    this.db = db;
  }

  async createUser({ name, email, passwordHash, role }) {
    const result = await this.db.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, role]
    );

    return this.findById(result.lastInsertRowid);
  }

  async findById(id) {
    return this.db.get(
      'SELECT id, name, email, password_hash, role, created_at FROM users WHERE id = ?',
      [id]
    );
  }

  async findByEmail(email) {
    return this.db.get(
      'SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ?',
      [email]
    );
  }

  async listUsers() {
    return this.db.all(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
              COUNT(DISTINCT t.id) AS total_tracks,
              COUNT(DISTINCT p.id) AS total_playlists
       FROM users u
       LEFT JOIN tracks t ON t.owner_id = u.id
       LEFT JOIN playlists p ON p.user_id = u.id
       GROUP BY u.id
       ORDER BY u.role, u.name`
    );
  }

  async deleteUser(id) {
    return this.db.run('DELETE FROM users WHERE id = ?', [id]);
  }
}

module.exports = { UserService };
