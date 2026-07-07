# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is **MyAiCrush** — a monolithic Node.js/Express NSFW AI companion chat platform. The entire backend is in `app.js` (~9000 lines). Frontend is vanilla HTML/CSS/JS served from `public/`.

### Required services

| Service | How to start |
|---------|-------------|
| MongoDB 7.0 | `mongod --dbpath /data/db --bind_ip 127.0.0.1 --port 27017` |
| Express app | `node app.js` (runs on port 3000) |

### Environment variables

A `.env` file at the project root is required. Minimum for local dev:

```
MONGO_URI=mongodb://127.0.0.1:27017/MyAICrush
PORT=3000
BASE_URL=http://localhost:3000
STRIPE_MODE=test
STRIPE_SECRET_KEY_TEST=sk_test_placeholder
EVENLABS_API_KEY=placeholder
FIREWORKS_API_KEY=placeholder
RESEND_API_KEY=re_placeholder_key_for_dev
ADMIN_SECRET=dev_admin_secret
```

For full AI chat responses, a real `FIREWORKS_API_KEY` is needed. Without it, signup/login/character-selection work but chat replies return "Internal server error" (401 from Fireworks API).

### Key gotchas

- The `Resend` client constructor throws immediately if `RESEND_API_KEY` is missing or empty. Must provide at least a prefix-valid placeholder like `re_placeholder_key_for_dev`.
- MongoDB must be running **before** starting the app — `app.js` calls `process.exit(1)` if the connection fails.
- No test suite exists (`npm test` is a stub). Manual or API-level testing only.
- No linter is configured in `package.json`. No ESLint config files exist.
- The app uses `package-lock.json` — use `npm install` (not yarn/pnpm).
- `node_modules/canvas` requires system libs (`libcairo2-dev`, etc.); these are already present in the VM image.
- The deprecated `punycode` warning on startup is harmless (from mongodb driver internals).

### Running the app

```bash
# Start MongoDB (in a background tmux session)
mongod --dbpath /data/db --bind_ip 127.0.0.1 --port 27017

# Start the app
cd /workspace && node app.js
```

### Testing API endpoints manually

```bash
# Signup
curl -X POST http://localhost:3000/api/signup -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"Pass123!"}'

# Login
curl -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"Pass123!"}'

# Select character
curl -X POST http://localhost:3000/setCharacter -H "Content-Type: application/json" -d '{"email":"test@example.com","name":"Anong"}'

# Send chat message (requires valid FIREWORKS_API_KEY)
curl -X POST http://localhost:3000/message -H "Content-Type: application/json" -d '{"message":"Hello!","email":"test@example.com"}'
```
