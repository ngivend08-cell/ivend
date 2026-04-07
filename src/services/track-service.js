class TrackService {
  constructor(db) {
    this.db = db;
  }

  async createTrack({ ownerId, title, genre, durationSeconds, description, youtubeUrl }) {
    return this.db.run(
      `INSERT INTO tracks (owner_id, title, genre, duration_seconds, description, youtube_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ownerId, title, genre, durationSeconds, description, youtubeUrl]
    );
  }

  async getLatestTracks(limit = 6) {
    return this.db.all(
      `SELECT t.*, u.name AS artist_name
       FROM tracks t
       JOIN users u ON u.id = t.owner_id
       ORDER BY t.created_at DESC, t.id DESC
       LIMIT ?`,
      [limit]
    );
  }

  async searchTracks({ query, genre }) {
    const normalizedQuery = `%${query || ''}%`;
    const normalizedGenre = genre || '';

    return this.db.all(
      `SELECT t.*, u.name AS artist_name,
              (SELECT COUNT(*) FROM comments c WHERE c.track_id = t.id) AS comments_count,
              (SELECT COUNT(*) FROM favorites f WHERE f.track_id = t.id) AS favorites_count
       FROM tracks t
       JOIN users u ON u.id = t.owner_id
       WHERE (? = '' OR t.genre = ?)
         AND (
           ? = '%%' OR
           t.title LIKE ? OR
           t.genre LIKE ? OR
           u.name LIKE ? OR
           t.description LIKE ?
         )
       ORDER BY t.created_at DESC, t.id DESC`,
      [normalizedGenre, normalizedGenre, normalizedQuery, normalizedQuery, normalizedQuery, normalizedQuery, normalizedQuery]
    );
  }

  async getGenres() {
    return this.db.all('SELECT DISTINCT genre FROM tracks ORDER BY genre');
  }

  async getGenreStats() {
    return this.db.all(
      `SELECT genre, COUNT(*) AS total
       FROM tracks
       GROUP BY genre
       ORDER BY total DESC, genre ASC
       LIMIT 5`
    );
  }

  async findById(id) {
    return this.db.get(
      `SELECT t.*, u.name AS artist_name, u.role AS artist_role
       FROM tracks t
       JOIN users u ON u.id = t.owner_id
       WHERE t.id = ?`,
      [id]
    );
  }

  async getTracksByOwner(ownerId) {
    return this.db.all(
      `SELECT t.*, u.name AS artist_name
       FROM tracks t
       JOIN users u ON u.id = t.owner_id
       WHERE t.owner_id = ?
       ORDER BY t.created_at DESC`,
      [ownerId]
    );
  }

  async toggleFavorite(userId, trackId) {
    const existing = await this.db.get(
      'SELECT user_id, track_id FROM favorites WHERE user_id = ? AND track_id = ?',
      [userId, trackId]
    );

    if (existing) {
      return this.db.run('DELETE FROM favorites WHERE user_id = ? AND track_id = ?', [userId, trackId]);
    }

    return this.db.run('INSERT INTO favorites (user_id, track_id) VALUES (?, ?)', [userId, trackId]);
  }

  async isFavorite(userId, trackId) {
    const favorite = await this.db.get(
      'SELECT user_id, track_id FROM favorites WHERE user_id = ? AND track_id = ?',
      [userId, trackId]
    );
    return Boolean(favorite);
  }

  async getFavoritesByUser(userId) {
    return this.db.all(
      `SELECT t.*, u.name AS artist_name
       FROM favorites f
       JOIN tracks t ON t.id = f.track_id
       JOIN users u ON u.id = t.owner_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );
  }

  async deleteTrack(id) {
    return this.db.run('DELETE FROM tracks WHERE id = ?', [id]);
  }
}

module.exports = { TrackService };
