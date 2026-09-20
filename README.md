# Videotube — Backend

A full-featured, YouTube-style video-sharing REST API built with Node.js, Express, and MongoDB. Handles authentication, video publishing, social features (subscriptions, likes, comments, playlists), and creator analytics.

**Live API:** https://video-tube-backend-rgfw.onrender.com/api/v1  
**Frontend repo:** [link](https://github.com/ashish-506/videoTube-frontend)

> Note: the backend runs on Render's free tier and spins down after 15 minutes of inactivity — the first request after idle may take 30–60s to respond.

---

## Tech Stack

- **Runtime:** Node.js, Express.js
- **Database:** MongoDB with Mongoose (schemas, aggregation pipelines, `mongoose-aggregate-paginate-v2` for pagination)
- **Auth:** JWT (access + refresh token rotation), bcrypt password hashing, httpOnly cookies
- **File uploads:** Multer (local staging) → Cloudinary (persistent storage) for videos, thumbnails, avatars, and cover images
- **Deployment:** Render

## Features

| Module | Capabilities |
|---|---|
| **User** | Register, login/logout, JWT refresh rotation, avatar/cover image upload, channel profile (subscriber counts), watch history, password change |
| **Video** | Publish (video + thumbnail upload), paginated/searchable feed, view counting, publish/unpublish toggle, owner-only edit/delete |
| **Subscription** | Toggle subscribe/unsubscribe, list a channel's subscribers, list channels a user subscribes to |
| **Comment** | Paginated comments per video, add/edit/delete (owner-only) |
| **Like** | Toggle like on videos, comments, and tweets; list a user's liked videos |
| **Playlist** | Create/update/delete, add/remove videos, owner-only management |
| **Tweet** | Short-form posts tied to a creator's profile — create/edit/delete |
| **Dashboard** | Channel stats (subscribers, total views, total likes) and video management for the logged-in creator |

## Architecture Notes

- Every controller is wrapped in an `asyncHandler` utility so errors propagate to a centralized error-handling middleware instead of requiring try/catch in every route.
- All responses follow a consistent shape via `ApiResponse`/`ApiError` classes.
- Complex reads (channel profiles, watch history, liked videos, dashboard stats) use MongoDB aggregation pipelines with `$lookup` joins rather than multiple round-trip queries.
- Refresh tokens are persisted per-user in MongoDB, allowing server-side invalidation on logout — not just relying on JWT expiry.

## API Overview

Base path: `/api/v1`

```
/users        — auth, profile, channel, watch history
/videos       — CRUD, search, publish toggle
/subscriptions
/comments
/likes
/playlists
/tweets
/dashboard
/healthcheck
```

## Getting Started

```bash
git clone <this-repo-url>
cd <repo>
npm install
```

Create a `.env` file:

```env
PORT=8000
MONGODB_URI=your_mongodb_atlas_connection_string
CORS_ORIGIN=http://localhost:5173

ACCESS_TOKEN_SECRET=your_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_secret
REFRESH_TOKEN_EXPIRY=10d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

```bash
npm run dev     # local dev, with nodemon
npm start       # production
```

## Deployment

Deployed as a Render Web Service (`npm install` → `npm start`), with all secrets set via Render's environment variable dashboard rather than a committed `.env`. `CORS_ORIGIN` must exactly match the deployed frontend's URL, and cookie options (`secure`, `sameSite`) are conditional on `NODE_ENV=production` to support the cross-origin cookie flow between the Render backend and Vercel frontend.