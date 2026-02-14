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
