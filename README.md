# Fake News Detection Application

A full-stack, containerized application that uses machine learning to detect fake news in real-time. Built with a React frontend, Node.js backend, Python ML service, and MongoDB — all orchestrated via Docker Compose.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Quick Start (Docker)](#quick-start-docker)
  - [Manual Setup](#manual-setup)
- [Environment Variables](#environment-variables)
- [Google OAuth Setup](#google-oauth-setup)
- [Real-Time WebSocket](#real-time-websocket)
- [API Reference](#api-reference)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Overview

This project is a capstone-level Fake News Detection platform. Users can submit news articles (as text or URL) and receive an instant ML-based prediction on whether the content is likely real or fake. The system supports Google OAuth login, real-time WebSocket-based analysis, and a live community feed showing analyses from all connected users.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        User Browser                     │
│                    React Frontend (:3000)                │
└────────────────────────┬────────────────────────────────┘
                         │  REST + WebSocket (Socket.IO)
┌────────────────────────▼────────────────────────────────┐
│                  Node.js Backend (:5000)                 │
│         Express API + Socket.IO Server + JWT Auth        │
└──────────┬──────────────────────────────────────────────┘
           │                        │
     ┌─────▼──────┐          ┌──────▼──────┐
     │  MongoDB   │          │  Python ML  │
     │  (:27018)  │          │  Flask API  │
     │  Database  │          │   (:5001)   │
     └────────────┘          └─────────────┘
```

All four services are managed by `docker-compose.yml` and communicate over the `fakenews-network` bridge network.

---

## Tech Stack

| Layer     | Technology                                  |
|-----------|---------------------------------------------|
| Frontend  | React, Socket.IO Client, @react-oauth/google |
| Backend   | Node.js, Express.js, Socket.IO, JWT, Mongoose |
| ML        | Python, Flask, scikit-learn / NLP models    |
| Database  | MongoDB 7.0                                 |
| Auth      | JWT + Google OAuth 2.0                      |
| DevOps    | Docker, Docker Compose, Jenkins (CI/CD)     |

Languages breakdown: JavaScript (63.6%), CSS (19.8%), Python (14.8%), Other (1.8%).

---

## Project Structure

```
fakenews-project/
├── docker-compose.yml           # Orchestrates all services
├── Jenkinsfile                  # CI/CD pipeline
├── GOOGLE_OAUTH_SETUP.md        # Detailed OAuth guide
├── REALTIME_WEBSOCKET_GUIDE.md  # WebSocket implementation guide
├── .gitignore
│
├── fakenews-frontend/           # React application
│   ├── src/
│   │   ├── pages/
│   │   │   └── Login.jsx        # Email + Google login
│   │   ├── components/
│   │   │   ├── NewsChecker.jsx  # Main analysis UI
│   │   │   └── LiveFeed.jsx     # Real-time community feed
│   │   ├── context/
│   │   │   └── AuthContext.js   # Auth state management
│   │   └── services/
│   │       ├── api.js           # REST API calls
│   │       └── socketService.js # WebSocket singleton
│   └── Dockerfile
│
├── fakenews-backend/            # Node.js REST + WebSocket server
│   ├── routes/
│   │   └── auth.js              # /api/auth/google, /api/auth/login
│   ├── models/
│   │   └── User.js              # User schema (googleId, avatar)
│   ├── services/
│   │   └── socketEvents.js      # Socket.IO event handlers
│   ├── server.js                # Express + Socket.IO entrypoint
│   └── Dockerfile
│
└── fakenews-ml/                 # Python Flask ML service
    ├── app.py                   # Flask API entrypoint
    ├── model/
    │   └── runtime_models/      # Trained model files (volume-mounted)
    └── Dockerfile
```

---

## Features

- **ML-Powered Detection** — Submit text or a URL; the Python ML service returns a real vs. fake prediction with a confidence score.
- **Real-Time Analysis** — Results are delivered via Socket.IO WebSocket, with no page refresh required.
- **Live Community Feed** — See analyses from all connected users in real time, along with an online user count.
- **Google OAuth Login** — One-click "Sign in with Google"; accounts are auto-created for new users.
- **JWT Authentication** — Standard email/password login also supported; sessions managed with JWTs.
- **Fully Dockerized** — All services start with a single `docker compose up` command.
- **CI/CD Pipeline** — Jenkins `Jenkinsfile` included for automated build and deployment.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- A free [NewsAPI key](https://newsapi.org/register) (100 requests/day on the free tier)
- A Google OAuth Client ID (see [Google OAuth Setup](#google-oauth-setup))

---

## Getting Started

### Quick Start (Docker)

1. **Clone the repository**

   ```bash
   git clone https://github.com/ishan-sharma23/fakenews-project.git
   cd fakenews-project
   ```

2. **Create your environment file**

   ```bash
   cp .env.example .env
   ```

   Then open `.env` and fill in the required values (see [Environment Variables](#environment-variables)).

3. **Start all services**

   ```bash
   docker compose up --build
   ```

   On first run, Docker will build all images and the ML service will download/load models (~60 second startup). Subsequent starts are much faster.

4. **Open the app**

   Navigate to [http://localhost:3000](http://localhost:3000).

   | Service         | URL                        |
   |-----------------|----------------------------|
   | Frontend        | http://localhost:3000      |
   | Backend API     | http://localhost:5000/api  |
   | ML Service      | http://localhost:5001      |
   | MongoDB         | mongodb://localhost:27018  |

---

### Manual Setup

If you prefer to run services without Docker:

**1. MongoDB**

Start a local MongoDB instance (or use MongoDB Atlas) and note the connection URI.

**2. ML Service**

```bash
cd fakenews-ml
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5001
```

**3. Backend**

```bash
cd fakenews-backend
npm install
# Create .env with values from the Environment Variables section
npm start
# Runs on http://localhost:5000
```

**4. Frontend**

```bash
cd fakenews-frontend
npm install
# Create .env with values from the Environment Variables section
npm start
# Runs on http://localhost:3000
```

---

## Environment Variables

### Root `.env` (used by Docker Compose)

```env
# NewsAPI key — https://newsapi.org/register
NEWSAPI_KEY=your_newsapi_key_here

# Google OAuth credentials
GOOGLE_CLIENT_ID=your_google_client_id_here

# Frontend URL for the React app (used in backend CORS + build arg)
REACT_APP_API_URL=http://localhost:5000/api
```

### `fakenews-backend/.env`

```env
MONGO_URI=mongodb://localhost:27018/fakenews
JWT_SECRET=your_super_secret_jwt_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
PORT=5000
ML_SERVICE_URL=http://localhost:5001
FRONTEND_URL=http://localhost:3000
NEWS_API_KEY=your_newsapi_key_here
```

### `fakenews-frontend/.env`

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
```

> **Security:** Never commit `.env` files to Git. They are already listed in `.gitignore`.

---

## Google OAuth Setup

To enable "Sign in with Google":

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Navigate to **APIs & Services → OAuth consent screen** and configure it with your app name and email.
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**.
4. Select **Web application** and add:
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000` and `http://localhost:3000/login`
5. Copy the generated **Client ID** and paste it into both `.env` files as `GOOGLE_CLIENT_ID` / `REACT_APP_GOOGLE_CLIENT_ID`.

For full step-by-step instructions, see [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md).

### How the OAuth flow works

```
User clicks "Continue with Google"
  → Google popup → user selects account
  → Google credential token returned to frontend
  → Frontend POSTs token to POST /api/auth/google
  → Backend verifies token with Google servers
  → New users are auto-registered; returning users are logged in
  → Backend issues a JWT → user is redirected to home
```

---

## Real-Time WebSocket

The application uses **Socket.IO** for live, bidirectional communication between the frontend and backend.

### Key Events

| Direction       | Event               | Description                              |
|-----------------|---------------------|------------------------------------------|
| Client → Server | `analyze`           | Submit news text/URL for analysis        |
| Client → Server | `user-online`       | Notify server of user presence           |
| Server → Client | `analysis-started`  | Acknowledgement that analysis has begun  |
| Server → Client | `analysis-complete` | Final prediction result                  |
| Server → Client | `analysis-error`    | Error during analysis                    |
| Server → Client | `new-analysis`      | Broadcast to all users (live feed)       |
| Server → Client | `users-online`      | Current connected user count             |

### Quick usage example

```javascript
import socketService from '../services/socketService';

socketService.connect();

socketService.sendAnalysis('Your news article text...', 'text', userId);

socketService.onAnalysisComplete((result) => {
  console.log('Prediction:', result);
});

socketService.onNewAnalysisBroadcast((analysis) => {
  // Update live feed
});
```

For the full implementation guide, see [REALTIME_WEBSOCKET_GUIDE.md](./REALTIME_WEBSOCKET_GUIDE.md).

---

## API Reference

### Auth Routes (`/api/auth`)

| Method | Endpoint         | Description                        | Auth Required |
|--------|------------------|------------------------------------|---------------|
| POST   | `/login`         | Email/password login → JWT         | No            |
| POST   | `/register`      | Register new user                  | No            |
| POST   | `/google`        | Google OAuth token → JWT           | No            |

### Analysis Routes (`/api/analyze`)

| Method | Endpoint    | Description                          | Auth Required |
|--------|-------------|--------------------------------------|---------------|
| POST   | `/text`     | Analyze raw text for fake news       | Yes           |
| POST   | `/url`      | Analyze article from URL             | Yes           |

### ML Service Routes (internal, port 5001)

| Method | Endpoint    | Description                          |
|--------|-------------|--------------------------------------|
| GET    | `/`         | Health check                         |
| POST   | `/predict`  | Run ML model on provided text        |

---

## CI/CD

A `Jenkinsfile` is included at the root of the repository. The pipeline covers:

1. **Checkout** — Pull latest code from the repository.
2. **Build** — Build all Docker images.
3. **Test** — Run unit and integration tests.
4. **Deploy** — Push images and restart containers.

To use it, configure a Jenkins pipeline job pointing to this repository. Ensure the Jenkins agent has Docker and Docker Compose installed.

---

## Troubleshooting

**ML service takes too long to start**
The ML service has a 60-second `start_period` in its Docker healthcheck to allow models to load. The backend depends on `ml-service: condition: service_healthy`, so it will wait automatically.

**"Invalid Client ID" on Google login**
Verify that `REACT_APP_GOOGLE_CLIENT_ID` in `fakenews-frontend/.env` exactly matches the Client ID from Google Cloud Console. Restart the frontend after any `.env` change.

**"Redirect URI mismatch" from Google**
In Google Cloud Console → Credentials, ensure `http://localhost:3000` and `http://localhost:3000/login` are listed under both **Authorized JavaScript origins** and **Authorized redirect URIs**.

**WebSocket connection fails**
Confirm the backend is running on port 5000. Check CORS settings in `server.js` and verify `REACT_APP_API_URL` in the frontend `.env`.

**MongoDB connection refused**
Note that Docker exposes MongoDB on port `27018` (not the default 27017) to avoid conflicts with any local MongoDB instance. Update `MONGO_URI` accordingly if running without Docker.

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit your changes: `git commit -m "Add your feature"`.
4. Push to your branch: `git push origin feature/your-feature`.
5. Open a Pull Request.

Please ensure all services start cleanly with `docker compose up --build` before submitting a PR.

---

*Built as a capstone project for demonstrating full-stack development, machine learning integration, real-time communication, and containerized deployment.*
