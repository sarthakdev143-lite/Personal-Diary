# Personal Diary

A private diary in the browser. Sign in with Google or GitHub, keep more than one diary, and write entries with headings, lists, links, and images.

The running app is the Next.js project in `frontend/`. Entries are stored in MongoDB and are visible only on the account that created them. They are not end-to-end encrypted: anyone with access to the database can read them.

`backend/` is an unfinished Spring Boot sketch. The website does not call it.

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

- Create a diary and choose one of the built-in covers.
- Search diaries by title, description, or the text of an entry.
- Edit or delete an entry, and rename or delete a diary.
