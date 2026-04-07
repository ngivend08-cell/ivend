class PlaylistService {
  constructor(db) {
    this.db = db;
  }

  async createPlaylist({ userId, name, description }) {
    return this.db.run(
      'INSERT INTO playlists (user_id, name, description) VALUES (?, ?, ?)',
      [userId, name, description]
    );
  }

  async getUserPlaylists(userId) {
    const playlists = await this.db.all(
      `SELECT p.id, p.name, p.description, p.created_at,
              COUNT(pt.track_id) AS total_tracks
       FROM playlists p
       LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
       WHERE p.user_id = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC, p.id DESC`,
      [userId]
    );

    const detailedPlaylists = [];
    for (const playlist of playlists) {
      const tracks = await this.db.all(
        `SELECT t.id, t.title, t.genre, t.duration_seconds, u.name AS artist_name
         FROM playlist_tracks pt
         JOIN tracks t ON t.id = pt.track_id
         JOIN users u ON u.id = t.owner_id
         WHERE pt.playlist_id = ?
         ORDER BY pt.added_at DESC`,
        [playlist.id]
      );
      detailedPlaylists.push({ ...playlist, tracks });
    }

    return detailedPlaylists;
  }

  async addTrackToPlaylist({ playlistId, trackId, userId }) {
    const playlist = await this.db.get(
      'SELECT id, user_id FROM playlists WHERE id = ?',
      [playlistId]
    );
    if (!playlist || playlist.user_id !== userId) {
      throw new Error('Playlist non valida o non autorizzata.');
    }

    return this.db.run(
      'INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id) VALUES (?, ?)',
      [playlistId, trackId]
    );
  }

  async removeTrackFromPlaylist({ playlistId, trackId, userId }) {
    const playlist = await this.db.get(
      'SELECT id, user_id FROM playlists WHERE id = ?',
      [playlistId]
    );
    if (!playlist || playlist.user_id !== userId) {
      throw new Error('Playlist non valida o non autorizzata.');
    }

    return this.db.run(
      'DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?',
      [playlistId, trackId]
    );
  }
}

module.exports = { PlaylistService };
