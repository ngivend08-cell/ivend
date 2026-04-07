const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const { initializeDatabase } = require('./src/db/init');
const { UserService } = require('./src/services/user-service');
const { TrackService } = require('./src/services/track-service');
const { PlaylistService } = require('./src/services/playlist-service');
const { CommentService } = require('./src/services/comment-service');
const { ensureAuthenticated, ensureRole, ensureTrackOwnershipOrAdmin } = require('./src/middleware/auth');
const { hashPassword, verifyPassword } = require('./src/services/password-service');

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  const services = await initializeDatabase(path.join(__dirname, 'data', 'melodyhub.sqlite'));

  const userService = new UserService(services.db);
  const trackService = new TrackService(services.db);
  const playlistService = new PlaylistService(services.db);
  const commentService = new CommentService(services.db);

  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use('/public', express.static(path.join(__dirname, 'public')));
  app.use('/vendor/page', express.static(path.join(__dirname, 'node_modules', 'page')));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(
    session({
      secret: 'melodyhub-demo-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 1000 * 60 * 60 * 6 }
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email', passwordField: 'password' },
      async (email, password, done) => {
        try {
          const user = await userService.findByEmail(email);
          if (!user) {
            return done(null, false, { message: 'Email non trovata.' });
          }

          const isValid = await verifyPassword(password, user.password_hash);
          if (!isValid) {
            return done(null, false, { message: 'Password non valida.' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await userService.findById(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });

  app.use((req, res, next) => {
    res.locals.currentUser = req.user || null;
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    next();
  });

  function setFlash(req, type, message) {
    req.session.flash = { type, message };
  }

  function render(res, view, payload = {}) {
    return res.render(view, {
      title: payload.title || 'MelodyHub',
      path: payload.path || '/',
      ...payload
    });
  }

  app.get('/', async (req, res, next) => {
    try {
      const latestTracks = await trackService.getLatestTracks(6);
      const topGenres = await trackService.getGenreStats();
      render(res, 'home', {
        title: 'MelodyHub - Home',
        path: '/',
        latestTracks,
        topGenres
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/catalog', async (req, res, next) => {
    try {
      const query = (req.query.query || '').trim();
      const genre = (req.query.genre || '').trim();
      const tracks = await trackService.searchTracks({ query, genre });
      const genres = await trackService.getGenres();
      render(res, 'catalog', {
        title: 'MelodyHub - Catalogo',
        path: '/catalog',
        tracks,
        genres,
        filters: { query, genre }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/register', (req, res) => {
    render(res, 'register', { title: 'MelodyHub - Registrazione', path: '/register' });
  });

  app.post('/register', async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;
      const normalizedRole = ['listener', 'artist'].includes(role) ? role : 'listener';

      if (!name || !email || !password) {
        setFlash(req, 'error', 'Compila tutti i campi obbligatori.');
        return res.redirect('/register');
      }

      const existing = await userService.findByEmail(email);
      if (existing) {
        setFlash(req, 'error', 'Esiste già un account con questa email.');
        return res.redirect('/register');
      }

      const passwordHash = await hashPassword(password);
      const newUser = await userService.createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role: normalizedRole
      });

      req.login(newUser, (error) => {
        if (error) return next(error);
        setFlash(req, 'success', 'Registrazione completata con successo.');
        return res.redirect('/dashboard');
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/login', (req, res) => {
    render(res, 'login', { title: 'MelodyHub - Login', path: '/login' });
  });

  app.post('/login', (req, res, next) => {
    passport.authenticate('local', (error, user, info) => {
      if (error) return next(error);
      if (!user) {
        setFlash(req, 'error', info?.message || 'Login non riuscito.');
        return res.redirect('/login');
      }

      req.login(user, (loginError) => {
        if (loginError) return next(loginError);
        setFlash(req, 'success', `Benvenuto, ${user.name}.`);
        return res.redirect('/dashboard');
      });
    })(req, res, next);
  });

  app.post('/logout', (req, res, next) => {
    req.logout((error) => {
      if (error) return next(error);
      setFlash(req, 'success', 'Logout effettuato correttamente.');
      res.redirect('/');
    });
  });

  app.get('/dashboard', ensureAuthenticated, async (req, res, next) => {
    try {
      const dashboardData = await Promise.all([
        playlistService.getUserPlaylists(req.user.id),
        trackService.getFavoritesByUser(req.user.id),
        req.user.role === 'artist' || req.user.role === 'admin'
          ? trackService.getTracksByOwner(req.user.id)
          : Promise.resolve([])
      ]);

      render(res, 'dashboard', {
        title: 'MelodyHub - Dashboard',
        path: '/dashboard',
        playlists: dashboardData[0],
        favoriteTracks: dashboardData[1],
        ownTracks: dashboardData[2]
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/tracks/new', ensureAuthenticated, ensureRole('artist', 'admin'), (req, res) => {
    render(res, 'track-form', {
      title: 'MelodyHub - Nuovo brano',
      path: '/tracks/new'
    });
  });

  app.post('/tracks', ensureAuthenticated, ensureRole('artist', 'admin'), async (req, res, next) => {
    try {
      const { title, genre, duration_seconds, description, youtube_url } = req.body;
      if (!title || !genre || !duration_seconds) {
        setFlash(req, 'error', 'Titolo, genere e durata sono obbligatori.');
        return res.redirect('/tracks/new');
      }

      await trackService.createTrack({
        ownerId: req.user.id,
        title: title.trim(),
        genre: genre.trim(),
        durationSeconds: Number(duration_seconds),
        description: (description || '').trim(),
        youtubeUrl: (youtube_url || '').trim()
      });

      setFlash(req, 'success', 'Brano pubblicato con successo.');
      res.redirect('/dashboard');
    } catch (error) {
      next(error);
    }
  });

  app.post('/tracks/:id/comments', ensureAuthenticated, async (req, res, next) => {
    try {
      const content = (req.body.content || '').trim();
      if (!content) {
        setFlash(req, 'error', 'Il commento non può essere vuoto.');
        return res.redirect(`/tracks/${req.params.id}`);
      }

      await commentService.addComment({
        userId: req.user.id,
        trackId: Number(req.params.id),
        content
      });

      setFlash(req, 'success', 'Commento inserito.');
      res.redirect(`/tracks/${req.params.id}`);
    } catch (error) {
      next(error);
    }
  });

  app.get('/tracks/:id', async (req, res, next) => {
    try {
      const trackId = Number(req.params.id);
      const track = await trackService.findById(trackId);
      if (!track) {
        return res.status(404).render('404', { title: 'Brano non trovato', path: req.path });
      }

      const comments = await commentService.getCommentsByTrack(trackId);
      const playlists = req.user ? await playlistService.getUserPlaylists(req.user.id) : [];
      const alreadyFavorite = req.user ? await trackService.isFavorite(req.user.id, trackId) : false;

      render(res, 'track-detail', {
        title: `MelodyHub - ${track.title}`,
        path: req.path,
        track,
        comments,
        playlists,
        alreadyFavorite
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/tracks/:id/favorite', ensureAuthenticated, async (req, res, next) => {
    try {
      await trackService.toggleFavorite(req.user.id, Number(req.params.id));
      setFlash(req, 'success', 'Preferiti aggiornati.');
      res.redirect(`/tracks/${req.params.id}`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/tracks/:id/delete', ensureAuthenticated, ensureTrackOwnershipOrAdmin(trackService), async (req, res, next) => {
    try {
      await trackService.deleteTrack(Number(req.params.id));
      setFlash(req, 'success', 'Brano eliminato.');
      res.redirect('/dashboard');
    } catch (error) {
      next(error);
    }
  });

  app.get('/playlists/new', ensureAuthenticated, (req, res) => {
    render(res, 'playlist-form', {
      title: 'MelodyHub - Nuova playlist',
      path: '/playlists/new'
    });
  });

  app.post('/playlists', ensureAuthenticated, async (req, res, next) => {
    try {
      const name = (req.body.name || '').trim();
      const description = (req.body.description || '').trim();
      if (!name) {
        setFlash(req, 'error', 'Il nome playlist è obbligatorio.');
        return res.redirect('/playlists/new');
      }

      await playlistService.createPlaylist({ userId: req.user.id, name, description });
      setFlash(req, 'success', 'Playlist creata correttamente.');
      res.redirect('/dashboard');
    } catch (error) {
      next(error);
    }
  });

  app.post('/playlists/:id/add', ensureAuthenticated, async (req, res, next) => {
    try {
      await playlistService.addTrackToPlaylist({
        playlistId: Number(req.params.id),
        trackId: Number(req.body.track_id),
        userId: req.user.id
      });
      setFlash(req, 'success', 'Brano aggiunto alla playlist.');
      res.redirect(`/tracks/${req.body.track_id}`);
    } catch (error) {
      next(error);
    }
  });

  app.post('/playlists/:id/remove', ensureAuthenticated, async (req, res, next) => {
    try {
      await playlistService.removeTrackFromPlaylist({
        playlistId: Number(req.params.id),
        trackId: Number(req.body.track_id),
        userId: req.user.id
      });
      setFlash(req, 'success', 'Brano rimosso dalla playlist.');
      res.redirect('/dashboard');
    } catch (error) {
      next(error);
    }
  });

  app.get('/admin', ensureAuthenticated, ensureRole('admin'), async (req, res, next) => {
    try {
      const [users, comments, tracks] = await Promise.all([
        userService.listUsers(),
        commentService.listAllComments(),
        trackService.searchTracks({ query: '', genre: '' })
      ]);

      render(res, 'admin', {
        title: 'MelodyHub - Admin',
        path: '/admin',
        users,
        comments,
        tracks
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/admin/users/:id/delete', ensureAuthenticated, ensureRole('admin'), async (req, res, next) => {
    try {
      if (Number(req.params.id) === req.user.id) {
        setFlash(req, 'error', 'Non puoi eliminare il tuo account admin attuale.');
        return res.redirect('/admin');
      }
      await userService.deleteUser(Number(req.params.id));
      setFlash(req, 'success', 'Utente eliminato.');
      res.redirect('/admin');
    } catch (error) {
      next(error);
    }
  });

  app.post('/admin/comments/:id/delete', ensureAuthenticated, ensureRole('admin'), async (req, res, next) => {
    try {
      await commentService.deleteComment(Number(req.params.id));
      setFlash(req, 'success', 'Commento eliminato.');
      res.redirect('/admin');
    } catch (error) {
      next(error);
    }
  });

  app.use((req, res) => {
    res.status(404).render('404', { title: 'Pagina non trovata', path: req.path });
  });

  app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).render('error', {
      title: 'Errore interno',
      path: req.path,
      errorMessage: error.message || 'Errore interno del server.'
    });
  });

  app.listen(PORT, () => {
    console.log(`MelodyHub avviato su http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('Errore durante l\'avvio dell\'applicazione:', error);
  process.exit(1);
});
