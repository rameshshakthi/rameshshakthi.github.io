# rameshshakthi.github.io

## Run locally with the AI portfolio assistant

1. Copy `.env.example` to `.env` and add the Ollama Cloud API key.
2. Run `node scripts/portfolio-server.mjs`.
3. Open `http://127.0.0.1:8000`.

The API key stays on the server and is never sent to browser code. GitHub Pages
can still host the static site, but its AI endpoint must be deployed on a
server/serverless platform because GitHub Pages cannot run backend code.
