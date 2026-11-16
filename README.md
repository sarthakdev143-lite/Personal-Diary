# Personal Diary

A private diary in the browser. Sign in with Google or GitHub, keep more than one diary, and write entries with headings, lists, links, and images.

The running app is the Next.js project in `frontend/`. Entries are stored in MongoDB and are visible only on the account that created them. They are not end-to-end encrypted: anyone with access to the database can read them.

`backend/` is a Spring Boot API for the same diaries. It reads the website's `next-auth.session-token` cookie and stores its own copy of the diaries in the `personal-diary-api` database, so it does not write into the website's database. The website still uses its Next.js routes.

## Run the API

The `backend` directory is a separate Spring Boot service. It stores diaries in the `personal-diary-api` database and reads the website's `next-auth.session-token` cookie, so a signed-in browser can call it directly.

```bash
cd backend
./mvnw spring-boot:run
```

The API listens on http://localhost:8080. A request without that session cookie receives 401. `GET /api/diaries` lists the signed-in person's diaries, with pinned diaries first. `GET /api/diaries?q=rain` returns only diaries whose title, description, or page matches, including the page date and the word “edited”. A page match includes `match`, `matchEntry`, `matchAt`, and `matchCount`. Diaries that match by a page are ordered by the newest of those pages, and a pinned diary still comes first. `POST /api/diaries` creates one. `GET /api/diaries/{id}/export?format=json` downloads that diary as a JSON backup. `format=md` downloads the same diary as Markdown, oldest page first. `POST /api/diaries/import` reads that backup, keeps its pin, and skips an empty page. `GET /api/diaries/{id}` returns that diary and its entries. `GET /api/diaries/{id}/entries?q=rain` returns the pages in that diary whose writing, date, time, or the word “edited” matches, newest first. A blank query returns every page. `PUT /api/diaries/{id}` renames it or changes its cover; a pin change leaves the updated time alone. `DELETE /api/diaries/{id}` removes the diary and its entries. `POST /api/diaries/{id}/entries` adds a page. Send `createdAt` to keep a past day, and `updatedAt` when bringing an edited page back; a page with no date is saved as now. A page that is only its date is refused. A pasted PNG, JPEG, GIF, or WebP stays on the page. `PUT /api/diaries/{id}/entries/{entryId}` changes the writing or moves the day. Moving only the day leaves an unedited page unedited. `DELETE` removes that page. `./mvnw test` runs the diary tests.

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

- Create a diary, name it, and choose a cover. Change the name, description, and cover later. Pin a diary to keep it at the top of the list.
- Write an entry with headings, lists, quotes, links, code, tables, and pictures. Date it today or on an earlier day, then edit it later. Undo and redo stay with the writing.
- Search your diaries by title, description, or the words in an entry. Inside a diary, narrow the list to one month and find a phrase on the open page.
- Download a diary as Markdown or as a JSON backup, and import that backup from the diary list. A pin comes back with the backup.
