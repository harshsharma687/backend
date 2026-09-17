# NovaPlay — Deployment Guide

Ye project **ek hi server** mein sab kuch serve karta hai: frontend (`public/`) + API. Isliye deploy karna aasan hai — bas Node process chalao.

## Vercel deploy (ready — `api/index.js` + `vercel.json` added)

1. GitHub pe push karo (repo: `harshsharma687/backend`)
2. [vercel.com](https://vercel.com) → **Add New → Project** → GitHub repo import karo
3. **Environment Variables** mein ye sab daalo (values apne `.env` se):
   - `MONGODB_URI`, `DB_NAME`
   - `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_EXPIRY`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `NODE_ENV=production`
   - `CORS_ORIGIN=*` (ya apna frontend domain)
   - `PORT` ki zaroorat **nahi** (Vercel khud deta hai)
4. Deploy → `https://your-app.vercel.app` live

**Vercel limits (free Hobby plan):**
- Serverless function **60s timeout** (`vercel.json` mein set) — **video upload ~100MB+ nahi chalega**; Cloudinary free tier bhi ~100MB hai. Posts/images theek chalenge.
- Filesystem **read-only** — temp files `/tmp` mein jati hain (code handle karta hai)
- Atlas **Network Access** mein `0.0.0.0/0` add karna zaroori hai

Alternatives for heavy video: **Render / Railway** (normal Node server, `npm start`) — koi timeout nahi.

## Do URL confusion se bacho (common galti)

Vercel pe **har import alag project** hota hai. Agar aapne kabhi dobara import kiya to purana project uska purana broken deployment hi serve karta rehta hai (jaise `backend-pi-hazel.vercel.app` "temporarily unavailable" deta tha). Hamesha **latest project ka URL** use karo (Vercel dashboard me jo project GitHub repo se linked hai, uska `*-projects.vercel.app` ya `*-git-main-*.vercel.app` URL).

**Deployment Protection band karo** (warna site sirf aapko dikhegi, duniya ko nahi):
Project → Settings → Deployment Protection → **Disabled**. Iske bina har visitor ko Vercel login wall (SSO 302) milega.

## Quick deploy (Render / Railway / Fly / Koyeb)

1. GitHub pe push karo
2. Hosting dashboard pe "New Web Service" → repo select karo
3. Settings:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Environment variables:** `.env.example` mein sab kuch (real values ke saath), plus:
     - `NODE_ENV=production`
     - `CORS_ORIGIN=` (same-origin deploy mein khali rehne do)
4. Deploy. Health check: `https://your-domain/healthz`

## Pehle jo dikkat aati thi, ab kya fix hai

| Purani dikkat | Permanent fix |
|---|---|
| `PORT=0` leak hone se random port pe bind | `src/index.js` invalid PORT ignore karke 8000 use karta hai; host ka PORT bhi respect hota hai |
| ISP/DNS se Atlas connect nahi hota | `src/db/index.js` Google/Cloudflare DNS + **5 retries with backoff** |
| `public/temp` missing → upload crash | `multer.middlewares.js` ab **absolute path** + folder auto-create |
| Frontend hardcoded `localhost:8000` | `public/app.js` ab **same-origin** API use karta hai (kisi bhi domain pe chalega) |
| Cookie/CORS production pe tootna | `NODE_ENV=production` pe secure cookies + `trust proxy` + CORS allow-list (`CORS_ORIGIN`) |
| Aadhi config pe server chal jata tha | `src/index.js` **fail-fast validation** — missing env pe saaf error ke saath ruk jata hai |
| Token expire → roz login | Frontend 401 pe **silent refresh + retry** karta hai |

## MongoDB Atlas checklist (deployment ke liye zaroori)

1. Atlas dashboard → **Network Access** → `0.0.0.0/0` add karo (hosting platforms ka IP change hota rehta hai)
2. Database user ka username/password `MONGODB_URI` mein sahi ho

## Cloudinary checklist

- Free tier: video ~100MB tak per upload. Uploads Cloudinary pe hote hain, server disk pe sirf temporary file rehti hai — isliye chhote/ephemeral-disk hosts bhi chalega.

## Local development

```bash
cp .env.example .env   # phir real values bharo
npm install
npm run dev            # http://localhost:8000
```

## Alag frontend domain pe host karna ho to

1. Frontend domain ko `CORS_ORIGIN` mein daalo (comma-separated)
2. Frontend mein `window.API_HOST = "https://api.your-domain.com"` set karo (index.html mein chhota script tag)
3. Hosting pe dono domains HTTPS pe honi chahiye (secure cookies ke liye)
