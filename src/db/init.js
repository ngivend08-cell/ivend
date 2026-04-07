const { Database } = require('./database');
const { hashPassword } = require('../services/password-service');

async function initializeDatabase(filename) {
  const db = new Database(filename);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'artist', 'listener')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      genre TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL CHECK(duration_seconds > 0),
      description TEXT DEFAULT '',
      youtube_url TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      track_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id INTEGER NOT NULL,
      track_id INTEGER NOT NULL,
      added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (playlist_id, track_id),
      FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL,
      track_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, track_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );
  `);

  const userCount = await db.get('SELECT COUNT(*) AS total FROM users');

  if (userCount.total === 0) {
    const users = [
      {
        name: 'Admin MelodyHub',
        email: 'admin@melodyhub.it',
        password: 'Admin123!',
        role: 'admin'
      },
      {
        name: 'Lina Artist',
        email: 'artist@melodyhub.it',
        password: 'Artist123!',
        role: 'artist'
      },
      {
        name: 'Marco Listener',
        email: 'listener@melodyhub.it',
        password: 'Listener123!',
        role: 'listener'
      }
    ];

    for (const user of users) {
      const passwordHash = await hashPassword(user.password);
      await db.run(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [user.name, user.email, passwordHash, user.role]
      );
    }

    await db.run(
      `INSERT INTO tracks (owner_id, title, genre, duration_seconds, description, youtube_url)
       VALUES
       (2, 'Clouds Over Turin', 'Lo-fi', 194, 'Brano chill perfetto per studiare.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
       (2, 'Midnight Campus', 'Indie', 226, 'Sonorità leggere per una piattaforma universitaria.', 'https://www.youtube.com/watch?v=ysz5S6PUM-U'),
       (2, 'Binary Heartbeat', 'Electronic', 201, 'Un mix tra codice e ritmo elettronico.', 'https://www.youtube.com/watch?v=jNQXAC9IVRw'),
       (2, 'Caffè e Compiti', 'Acoustic', 168, 'Atmosfera rilassata per il pomeriggio.', 'https://www.youtube.com/watch?v=oHg5SJYRHA0'),
       (2, 'Rain in Vercelli', 'Jazz', 252, 'Traccia ispirata alle serate di pioggia.', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ')`
    );

    await db.run(
      'INSERT INTO playlists (user_id, name, description) VALUES (?, ?, ?)',
      [3, 'Studio Session', 'Playlist per concentrarsi durante lo studio.']
    );

    await db.run('INSERT INTO playlist_tracks (playlist_id, track_id) VALUES (?, ?)', [1, 1]);
    await db.run('INSERT INTO playlist_tracks (playlist_id, track_id) VALUES (?, ?)', [1, 3]);
    await db.run('INSERT INTO favorites (user_id, track_id) VALUES (?, ?)', [3, 2]);
    await db.run(
      'INSERT INTO comments (user_id, track_id, content) VALUES (?, ?, ?)',
      [3, 1, 'Ottimo brano per ripassare database e Node.js.']
    );
  }

  return { db };
}

module.exports = { initializeDatabase };
