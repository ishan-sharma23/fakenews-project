# FakeNews Backend API

Backend API for the FakeNews detection application with user authentication.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update `MONGO_URI` with your MongoDB connection string
   - Change `JWT_SECRET` to a secure random string

3. Start MongoDB (if using local):
   ```bash
   mongod
   ```

4. Run the server:
   ```bash
   # Development mode (with auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

## MongoDB In Docker vs Local (Important)

When backend runs in Docker Compose, it must use Docker DNS host `mongodb`.
When backend runs directly on your machine (not in Docker), it must use `localhost`.

- Docker backend URI: `mongodb://mongodb:27017/capstoneproject`
- Local backend URI: `mongodb://localhost:27017/capstoneproject`
- Local backend + Docker Mongo host mapping: `mongodb://localhost:27018/capstoneproject`

In this project:
- `docker-compose.yml` sets backend `MONGO_URI` to Docker URI by default.
- You can override it with environment variable `BACKEND_MONGO_URI` if needed.

## MongoDB Compass (Local Machine) Connection

If you are using Docker and Compass on Windows/macOS/Linux host, connect to Mongo like this:

1. Open MongoDB Compass.
2. Use this URI:
  `mongodb://localhost:27018/capstoneproject?directConnection=true`
3. Connect and open database `capstoneproject`.
4. Check collections `users` and `analyses`.
5. Click refresh after creating user/analyzing content in app.

If `localhost` does not work, try:
`mongodb://127.0.0.1:27018/capstoneproject?directConnection=true`

Note: `mongodb://mongodb:27017/capstoneproject` will not work in Compass on your host machine.
That hostname only works inside Docker network.

## API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/me` | Get current user | Private |

### Register User
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### Login User
```json
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Response (Register/Login)
```json
{
  "_id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "token": "jwt_token_here"
}
```

## Using with Frontend

In your React frontend, store the token and include it in requests:

```javascript
// After login, store token
localStorage.setItem('token', response.data.token);

// For protected routes, add header
const config = {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
};
axios.get('/api/auth/me', config);
```
