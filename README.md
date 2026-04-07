# MelodyHub - Progetto esame Programmazione Web

## Descrizione
MelodyHub è una piattaforma musica completa sviluppata con:
- HTML5
- CSS3
- JavaScript moderno (classi ES6, Promise, async/await)
- Node.js
- Express.js
- SQLite
- EJS
- Passport
- page.js

## Funzionalità principali
- Registrazione utenti
- Login / logout con Passport
- Ruoli multipli: `admin`, `artist`, `listener`
- Catalogo pubblico con ricerca per titolo, artista, genere, descrizione
- Pubblicazione di brani per artist/admin
- Commenti ai brani
- Preferiti
- Playlist personali
- Area admin per eliminare utenti e moderare commenti
- Navigazione migliorata lato client con page.js

## Struttura base dati
Tabelle SQLite:
- `users`
- `tracks`
- `comments`
- `playlists`
- `playlist_tracks`
- `favorites`

## Requisiti consigliati
- Node.js 20 LTS oppure 22 LTS
- npm aggiornato

## Installazione
Apri il terminale nella cartella del progetto e lancia:

```bash
npm install
npm start
```

L'app sarà disponibile su:

```bash
http://localhost:3000
```

## Account demo
- Admin
  - email: `admin@melodyhub.it`
  - password: `Admin123!`
- Artist
  - email: `artist@melodyhub.it`
  - password: `Artist123!`
- Listener
  - email: `listener@melodyhub.it`
  - password: `Listener123!`

## Note importanti per l'esame
- La base dati viene creata automaticamente al primo avvio in `data/melodyhub.sqlite`.
- Il progetto usa `crypto.scrypt` per l'hashing password, così eviti dipendenze native come bcrypt.
- `page.js` è usato per la navigazione progressiva su diverse pagine GET.
- `better-sqlite3` è usato per SQLite sul backend.

## Cosa devi ancora preparare tu
Il professore richiede anche una video-presentazione YouTube da 3-5 minuti. Questa ZIP include il progetto e il materiale testuale, ma la registrazione video devi farla tu con la tua voce.
# ivend
# ivend
