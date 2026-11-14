# Personal Diary

A private diary in the browser. Sign in with Google or GitHub, keep more than one diary, and write entries with headings, lists, links, and images.

The running app is the Next.js project in `frontend/`. Entries are stored in MongoDB and are visible only on the account that created them. They are not end-to-end encrypted: anyone with access to the database can read them.

`backend/` is a Spring Boot API for the same diaries. It reads the website's `next-auth.session-token` cookie and stores its own copy of the diaries in the `personal-diary-api` database, so it does not write into the website's database. The website still uses its Next.js routes.

## Run the API

```bash
cd backend
./mvnw spring-boot:run
```

The API listens on http://localhost:8080. `GET` and `POST /api/diaries` create and list diaries. `GET` and `POST /api/diaries/{id}/entries` add a page, `PUT` changes it, and `DELETE` removes it. All of them require that session cookie. `./mvnw test` runs the diary tests.

## Run the API

The `backend` directory is a separate Spring Boot service. It reads the same MongoDB database as the website and the same `next-auth.session-token` cookie, so a signed-in browser can call it directly.

```bash
cd backend
./mvnw spring-boot:run
```

The API listens on http://localhost:8080. A request without that session cookie receives 401. `GET /api/diaries` lists the signed-in person's diaries, with pinned diaries first. `GET /api/diaries?q=rain` keeps that order and returns only diaries whose title, description, or page matches, including the page date and the word “edited”. A page match includes `match` and `matchEntry`. `POST /api/diaries` creates one. `GET /api/diaries/{id}/export?format=json` downloads that diary as a JSON backup. `format=md` downloads the same diary as Markdown, oldest page first. `POST /api/diaries/import` reads that backup, keeps its pin, and skips an empty page. `GET /api/diaries/{id}` returns that diary and its entries. `PUT /api/diaries/{id}` renames it or changes its cover; a pin change leaves the updated time alone. `DELETE /api/diaries/{id}` removes the diary and its entries. Entry routes live under `/api/diaries/{id}/entries`. `./mvnw test` runs the diary tests.

## Run the website

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000. Fill in `.env.local` with a MongoDB connection string, a `NEXTAUTH_SECRET`, and Google or GitHub OAuth credentials. The callback URL is `{NEXTAUTH_URL}/api/auth/callback/{provider}`.

```bash
npm test
npm run lint
```

## What you can do

- Create a diary and choose one of the built-in covers. Change that cover later from the diary details.
- Date an entry today or on a past day.
- Search diaries by title, description, or the text of an entry. Inside a diary, narrow the list to one month.
- Edit or delete an entry, and rename or delete a diary.
- Download a diary as Markdown, or as a JSON backup from its details. Import that backup from the diary list. A pin comes back with the backup.
