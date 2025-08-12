# GlobeTrotter — AI Travel Planner

An AI-powered travel planning application that helps users plan trips through natural conversation and generates smart, budget-aware itineraries. The project consists of a React + Vite frontend and a FastAPI backend with AI, context, and multimodal capabilities.

![GlobeTrotter – Empowering Personalized Travel Planning](./GlobeTrotter%20%E2%80%93%20Empowering%20Personalized%20Travel%20Planning.png)

## Table of Contents

- Overview
- Features
- Tech Stack
- Architecture
- Quick Start
- Configuration (Env Vars)
- Running Locally
- API Overview
- Project Structure
- Development Scripts
- Contributing
- License

## Overview

GlobeTrotter combines conversational AI with real data sources to build personalized trip plans. Users can chat with the assistant, refine preferences, and receive an itinerary that includes day-by-day activities, budgets, and logistics. The system persists conversations and preferences, supports voice input, and offers advanced AI optimizations.

## Features

- Conversational trip planning via `POST /api/chat`
- Smart itinerary generation and transformation for UI
- Budget-aware and preference-aware planning
- User preferences persistence and recommendations
- Blacklist management (e.g., exclude hotels/cities/activities)
- Voice input: speech-to-text and voice chat workflow
- Advanced AI utilities (e.g., optimize hotels; travel alerts)
- Modern UI with Tailwind and shadcn-ui

## Tech Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS, shadcn-ui
- Backend: FastAPI (Python 3.13), Pydantic, LangGraph-style workflow
- Data/Infra: MongoDB (conversations), Redis (cache)

## Architecture

- `src/` React app calls the backend via `VITE_API_BASE_URL`.
- `backend/` FastAPI app exposes REST endpoints and orchestrates services:
  - `backend/agent/workflow.py`: AI Travel Agent workflow (`travel_agent`)
  - `backend/services/*`: Gemini chat, itinerary generator, context, multimodal, advanced AI
  - `backend/repositories/*`: conversation and city repositories
  - `backend/models/`: Pydantic models for trips, UI actions, etc.

## Quick Start

Prerequisites:

- Node.js 18+
- Python 3.13 (see `.python-version`)
- MongoDB running locally (default: `mongodb://localhost:27017`)
- Redis running locally (default: `redis://localhost:6379/0`)

Clone and install:

```bash
git clone <YOUR_REPO_URL>
cd travelcanvas-co-main

# Frontend
npm install

# Backend
pip install -r requirements.txt
```

Configure environment:

```bash
# Frontend (create at project root)
cp .env.example .env        # optional; set VITE_API_BASE_URL

# Backend
cd backend
cp .env.example .env        # fill keys: GEMINI_API_KEY, etc.
```

Start apps:

```bash
# Terminal 1: backend
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: frontend (in project root)
npm run dev
```

Open the app at the Vite URL (usually http://localhost:5173). Ensure `VITE_API_BASE_URL` in your `.env` points to the backend (default http://localhost:8000).

## Configuration (Env Vars)

Backend (`backend/.env`):

- GEMINI_API_KEY
- OPENWEATHER_API_KEY
- MAPBOX_ACCESS_TOKEN
- MONGO_URI (default: mongodb://localhost:27017)
- MONGO_DB_NAME (default: globetrotter)
- REDIS_URL (default: redis://localhost:6379/0)
- ENVIRONMENT (development|production)
- DEBUG (true|false)
- PORT (default: 8000)
- HOST (default: 0.0.0.0)
- CORS_ORIGINS (JSON list)
- API_PREFIX (default: /api)

Frontend (`.env` at repo root):

- VITE_API_BASE_URL (e.g., http://localhost:8000)

## Running Locally

1) Backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2) Frontend

```bash
npm run dev
```

## API Overview (selected)

Prefix: `/api` (configurable via `API_PREFIX`)

- POST `/api/chat` — main conversational endpoint
- GET `/api/health` — health check
- POST `/api/blacklist/add` — add item to blacklist
- DELETE `/api/blacklist/remove` — remove item from blacklist
- GET `/api/blacklist/{user_id}` — get user blacklist
- POST `/api/preferences/save` — save user preferences
- GET `/api/preferences/{user_id}` — get user preferences
- GET `/api/recommendations/{user_id}` — personalized recommendations
- POST `/api/voice/process` — process voice input
- POST `/api/voice/chat` — voice chat to AI response
- GET `/api/voice/capabilities` — voice feature capabilities
- POST `/api/ai/optimize-hotels` — hotel optimization
- POST `/api/ai/travel-alerts` — travel alerts

Note: The frontend primarily uses `POST /api/chat` and transforms the returned `trip_plan` into UI-friendly structures (`src/services/api.ts`). Ensure endpoint names match the backend; some legacy endpoints may differ.

## Project Structure

```text
.
├─ backend/
│  ├─ main.py                  # FastAPI app and endpoints
│  ├─ config.py                # Settings and env loading
│  ├─ agent/workflow.py        # AI travel agent workflow
│  ├─ services/                # Gemini, itinerary, context, multimodal, advanced AI
│  ├─ repositories/            # conversation, city repositories
│  └─ models/                  # Pydantic models
├─ src/                        # React + Vite frontend
│  ├─ pages/AIPlanner.tsx
│  └─ services/api.ts          # API client
├─ requirements.txt            # Python deps
├─ package.json                # Frontend scripts/deps
└─ vite.config.ts
```

## Development Scripts

Frontend (from repo root):

- npm run dev — start Vite dev server
- npm run build — build for production
- npm run preview — preview production build
- npm run lint — lint the frontend codebase

Backend (from `backend/`):

- uvicorn main:app --reload — run API server in dev
- pytest — run tests (if present)

## Contributing

Issues and PRs are welcome. Please open an issue to discuss significant changes.

## License

MIT

## Demo Video

![Demo Video](./video/demo.mp4)
