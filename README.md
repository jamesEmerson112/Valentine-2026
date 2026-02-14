# Valentine 2026

A Valentine's Day themed web app with a React frontend and Rust backend. Features floating hearts, a pink/red gradient palette, and random love quotes served from a Rocket API.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Rocket 0.5.1

## Prerequisites

- Rust (with Cargo)
- Node.js (with npm)

## Running

Start both servers in separate terminals:

**Backend** (port 8000):
```bash
cd backend
cargo run
```

**Frontend** (port 5173):
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 to see the Valentine card. Click "Get Another Valentine" for a new random love quote.

## API Endpoints

- `GET /health` - Health check
- `GET /api/valentine` - Returns a random love quote
