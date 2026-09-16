# Streamly video platform

Streamly is a YouTube-style full-stack video platform built with Express, MongoDB, Cloudinary and a responsive vanilla HTML/CSS/JavaScript client.

## Run it

1. Keep the existing `.env` values for MongoDB, Cloudinary and JWT secrets.
2. Install packages once with `npm install`.
3. Start the app with `npm run dev` and open `http://localhost:8000`.

If another application already owns port 8000, stop that old application first, or start this project temporarily on another port in PowerShell:

```powershell
$env:PORT = '8001'
npm run dev
```

The frontend is served from `public/`, so no separate frontend server is required.

## Included product flows

- Home feed with search, filters, responsive navigation, light/dark theme and empty states
- Video upload to Cloudinary, publishing, editing, deleting and public/private status toggling
- Watch page with player, view count, comments, likes, sharing and playlist saving
- Register, login, session restoration and profile/channel views
- Channel subscriptions, subscribed feed, watch history and playlists
- Secure upload field/type validation and unique temporary upload filenames

## API groups

| Path | Purpose |
| --- | --- |
| `/api/v1/users` | registration, sign-in, profiles and history |
| `/api/v1/videos` | browse, search, watch, upload and manage videos |
| `/api/v1/comments` | public video comments and signed-in comment management |
| `/api/v1/likes` | like toggling and like counts |
| `/api/v1/playlists` | create and manage playlists |
| `/api/v1/subscriptions` | subscribe/unsubscribe and subscription feed data |
# fullstackproject
