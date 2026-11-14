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

The API listens on http://localhost:8080. A request without that session cookie receives 401. `GET /api/diaries` lists the signed-in person's diaries, with pinned diaries first. `GET /api/diaries?q=rain` keeps that order and returns only diaries whose title, description, or page matches, including the page date and the word “edited”. A page match includes `match` and `matchEntry`. `POST /api/diaries` creates one. `GET /api/diaries/{id}/export?format=json` downloads that diary as a JSON backup. `format=md` downloads the same diary as Markdown, oldest page first. `POST /api/diaries/import` reads that backup, keeps its pin, and skips an empty page. `GET /api/diaries/{id}` returns that diary and its entries. `GET /api/diaries/{id}/entries?q=rain` returns the pages in that diary whose writing, date, time, or the word “edited” matches, newest first. A blank query returns every page. `PUT /api/diaries/{id}` renames it or changes its cover; a pin change leaves the updated time alone. `DELETE /api/diaries/{id}` removes the diary and its entries. `POST /api/diaries/{id}/entries` adds a page. Send `createdAt` to keep a past day, and `updatedAt` when bringing an edited page back; a page with no date is saved as now. A page that is only its date is refused. A pasted PNG, JPEG, GIF, or WebP stays on the page. `PUT /api/diaries/{id}/entries/{entryId}` changes the writing or moves the day. Moving only the day leaves an unedited page unedited. `DELETE` removes that page. `./mvnw test` runs the diary tests.

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
- Date an entry today or on a past day. Writing stays under that date. The date line keeps its own line and stays plain, and pasting onto it puts the words under the date. Drop pictures onto the page, or add one from the toolbar. You see the picture while you name it, and that name stays under the picture in smaller type. Changing the line under the picture changes the name on the entry card and in search. Click the picture and delete it to remove the picture and its name. Undo brings that picture and its name back. A letter typed while the picture is selected is added to the name, and undo removes that letter. The arrow keys move from the line before a picture onto the picture, then on to the next line. A letter typed beside the picture stays in the writing when the page is saved.
- Search diaries by title, description, or the text of an entry. Inside a diary, narrow the list to one month.
- Edit or delete an entry, and rename or delete a diary.
- Download a diary as Markdown, or as a JSON backup from its details. Import that backup from the diary list. A pin comes back with the backup.
