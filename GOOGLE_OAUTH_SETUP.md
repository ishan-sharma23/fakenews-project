# Google OAuth Login Setup Guide

## Overview
Your Fake News Detection app now supports **"Sign in with Google"** functionality! This guide walks you through setting up Google OAuth credentials and configuring your application.

---

## What Was Implemented

### Backend Changes ✅
- **New endpoint**: `POST /api/auth/google` - Verifies Google tokens
- **Updated User model**: Added `googleId` and `avatar` fields
- **Google Auth Library**: Installed `google-auth-library` package
- **Auto-registration**: Creates account automatically for new Google users

### Frontend Changes ✅
- **Google OAuth Provider**: Wrapped app with `GoogleOAuthProvider`
- **Google Login Button**: Added official Google sign-in button
- **Auth Context**: Added `googleLogin()` function
- **API Service**: Added `googleLogin()` API call
- **Login Page**: Integrated Google OAuth UI

---

## Step 1: Get Google OAuth Credentials

### 1.1 Go to Google Cloud Console
Visit: **https://console.cloud.google.com/**

### 1.2 Create a New Project (or select existing)
1. Click on project dropdown (top left)
2. Click **"New Project"**
3. Name it: `Fake News Detector` (or your preferred name)
4. Click **"Create"**
5. Wait for project creation, then select it

### 1.3 Enable Google+ API
1. In the left sidebar, go to **"APIs & Services" → "Library"**
2. Search for: **"Google+ API"** or **"Google Identity"**
3. Click on it and click **"Enable"**

### 1.4 Configure OAuth Consent Screen
1. Go to **"APIs & Services" → "OAuth consent screen"**
2. Select **"External"** (for testing) or **"Internal"** (if using Google Workspace)
3. Click **"Create"**
4. Fill in the required fields:
   - **App name**: `Fake News Detector`
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **"Save and Continue"**
6. **Scopes**: Click **"Add or Remove Scopes"**
   - Add: `email`, `profile`, `openid` (usually pre-selected)
   - Click **"Update"** then **"Save and Continue"**
7. **Test users** (only for External apps):
   - Add your email and any test users
   - Click **"Save and Continue"**
8. Click **"Back to Dashboard"**

### 1.5 Create OAuth Credentials
1. Go to **"APIs & Services" → "Credentials"**
2. Click **"Create Credentials" → "OAuth client ID"**
3. Select **"Web application"**
4. Configure:
   - **Name**: `Fake News Web Client`
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - Add your production URL later (e.g., `https://yourdomain.com`)
   - **Authorized redirect URIs**:
     - `http://localhost:3000` (for development)
     - `http://localhost:3000/login`
     - Add production URLs later
5. Click **"Create"**

### 1.6 Save Your Credentials
You'll see a popup with:
- **Client ID**: `123456789-abc...googleusercontent.com`
- **Client Secret**: `GOCSPX-abc123...`

**Copy both of these!** You'll need them in the next step.

---

## Step 2: Configure Environment Variables

### 2.1 Backend Configuration

Create or edit `.env` file in `fakenews-backend/`:

```env
# MongoDB
MONGO_URI=mongodb://localhost:27018/fakenews

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Google OAuth
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE

# Port
PORT=5000

# ML Service
ML_SERVICE_URL=http://localhost:5001

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

**Replace `YOUR_GOOGLE_CLIENT_ID_HERE`** with the Client ID from Step 1.6

### 2.2 Frontend Configuration

Create or edit `.env` file in `fakenews-frontend/`:

```env
# Backend API URL
REACT_APP_API_URL=http://localhost:5000

# Google OAuth Client ID
REACT_APP_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
```

**Replace `YOUR_GOOGLE_CLIENT_ID_HERE`** with the same Client ID.

---

## Step 3: Test the Integration

### 3.1 Start All Services

**Terminal 1 - ML Service:**
```bash
cd fakenews-ml
python app.py
```

**Terminal 2 - Backend:**
```bash
cd fakenews-backend
npm start
```

**Terminal 3 - Frontend:**
```bash
cd fakenews-frontend
npm start
```

### 3.2 Test Google Login

1. Open browser: `http://localhost:3000/login`
2. You should see:
   - Regular email/password fields
   - Divider with "or"
   - **"Continue with Google"** button
3. Click the **Google button**
4. Select your Google account
5. Grant permissions
6. **You should be automatically logged in and redirected to Home!**

---

## Step 4: Verify It Works

### Check if login worked:
1. After clicking Google login, check:
   - ✅ Redirected to home page
   - ✅ Navbar shows your name (from Google account)
   - ✅ Can access protected features
   
2. Check browser **localStorage**:
   - Open DevTools (F12) → Application → Local Storage
   - You should see:
     - `token`: JWT token
     - `user`: User object with your Google info

3. Check backend logs:
   - Should see: `"Google OAuth successful for: your-email@gmail.com"`

---

## How It Works

### Authentication Flow:

```
1. User clicks "Continue with Google"
   ↓
2. Google popup appears → user selects account
   ↓
3. Google returns credential token to frontend
   ↓
4. Frontend sends token to backend: POST /api/auth/google
   ↓
5. Backend verifies token with Google servers
   ↓
6. Backend checks if user exists in database:
   - If exists: Log them in
   - If new: Create account automatically
   ↓
7. Backend sends JWT token back to frontend
   ↓
8. Frontend stores token and user info
   ↓
9. User is logged in and redirected to home
```

### Security Features:
- ✅ Token verified server-side with Google
- ✅ No passwords stored for Google users
- ✅ JWT token for session management
- ✅ Automatic account creation
- ✅ Profile picture saved from Google

---

## Files Modified/Created

### Backend:
- ✅ `routes/auth.js` - Added `/google` endpoint
- ✅ `models/User.js` - Added `googleId` and `avatar` fields
- ✅ `package.json` - Added `google-auth-library`
- ✅ `.env` - Added `GOOGLE_CLIENT_ID`

### Frontend:
- ✅ `App.js` - Wrapped with `GoogleOAuthProvider`
- ✅ `pages/Login.jsx` - Added Google login button & handler
- ✅ `context/AuthContext.js` - Added `googleLogin()` function
- ✅ `services/api.js` - Added Google login API call
- ✅ `package.json` - Added `@react-oauth/google`
- ✅ `.env` - Added `REACT_APP_GOOGLE_CLIENT_ID`

---

## Troubleshooting

### Issue: "Invalid Client ID" error
**Solution:**
- Verify `REACT_APP_GOOGLE_CLIENT_ID` in `.env` matches Google Console
- Restart frontend after changing `.env`: `npm start`
- Clear browser cache

### Issue: "Redirect URI mismatch"
**Solution:**
- Go to Google Console → Credentials
- Add `http://localhost:3000` to **Authorized JavaScript origins**
- Add `http://localhost:3000/login` to **Authorized redirect URIs**

### Issue: Google button doesn't appear
**Solution:**
- Check browser console for errors
- Verify `@react-oauth/google` is installed: `npm list @react-oauth/google`
- Ensure App.js has `GoogleOAuthProvider` wrapper

### Issue: "Google authentication failed" on backend
**Solution:**
- Verify `GOOGLE_CLIENT_ID` in backend `.env`
- Check backend logs for detailed error
- Ensure `google-auth-library` is installed: `npm list google-auth-library`

### Issue: User created but no avatar/profile picture
**Solution:**
- This is normal if Google doesn't provide picture
- Check Google account settings to ensure profile picture is set to public

---

## Production Deployment

### Before deploying to production:

1. **Update Google Console**:
   - Add production domain to Authorized JavaScript origins
   - Add production URLs to Authorized redirect URIs
   - Example: `https://yourdomain.com`, `https://yourdomain.com/login`

2. **Update Environment Variables**:
   - Backend `.env`: Update `FRONTEND_URL` to production URL
   - Frontend `.env`: Update `REACT_APP_API_URL` to production backend URL
   - Keep same `GOOGLE_CLIENT_ID` or create separate prod credentials

3. **Publish OAuth Consent Screen**:
   - Go to Google Console → OAuth consent screen
   - Click **"Publish App"** (for External users)
   - Submit for verification if needed (for larger user base)

4. **Security Checklist**:
   - ✅ Never commit `.env` files to Git
   - ✅ Use HTTPS in production
   - ✅ Set proper CORS origins
   - ✅ Rotate JWT_SECRET

---

## Testing Checklist

Before going live, test:

- ✅ Google login with new user (creates account)
- ✅ Google login with existing user (logs in)
- ✅ Logout and login again
- ✅ Protected routes work after Google login
- ✅ Regular email/password login still works
- ✅ User profile shows Google avatar
- ✅ Error handling (wrong credentials, network errors)

---

## Additional Features You Can Add

### Optional Enhancements:

1. **Link Google to Existing Account**
   - Allow users to connect Google to email/password account

2. **Multiple OAuth Providers**
   - Add Facebook, GitHub, Twitter login
   - Use similar pattern as Google implementation

3. **Profile Management**
   - Show Google profile picture in navbar
   - Allow users to update profile info

4. **Remember Device**
   - Implement "Remember this device" checkbox
   - Use refresh tokens for longer sessions

---

## Support

If you encounter issues:
1. Check browser console for frontend errors
2. Check backend terminal for server errors
3. Verify all environment variables are set correctly
4. Ensure Google OAuth credentials are properly configured
5. Test with a different Google account

---

## Success! 🎉

Your fake news detection app now has professional Google OAuth login!

Users can now:
- ✅ Sign in with Google (one click)
- ✅ No password needed
- ✅ Automatic account creation
- ✅ Profile picture from Google
- ✅ Secure authentication

Enjoy your enhanced authentication system! 🔐✨
