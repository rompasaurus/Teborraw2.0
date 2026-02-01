# Teboraw Authentication System

This document describes the authentication architecture used in the Teboraw web application.

## Overview

Teboraw uses a **JWT (JSON Web Token) + Refresh Token** authentication pattern with support for:
- Email/password authentication
- Google OAuth 2.0

## Authentication Flow

### 1. Email/Password Login

```
┌──────────┐      POST /auth/login       ┌──────────┐
│  Client  │ ──────────────────────────► │   API    │
│          │   { email, password }       │          │
│          │                             │          │
│          │ ◄────────────────────────── │          │
│          │   { accessToken,            │          │
│          │     refreshToken,           │          │
│          │     user }                  │          │
└──────────┘                             └──────────┘
```

1. User submits email and password
2. API validates credentials against BCrypt-hashed password in database
3. On success, API generates JWT access token + refresh token
4. Tokens and user data returned to client

### 2. Google OAuth Login

```
┌──────────┐    Google Sign-In    ┌──────────┐
│  Client  │ ───────────────────► │  Google  │
│          │                      │          │
│          │ ◄─────────────────── │          │
│          │   Google ID Token    └──────────┘
│          │
│          │   POST /auth/google        ┌──────────┐
│          │ ─────────────────────────► │   API    │
│          │   { credential }           │          │
│          │                            │          │
│          │ ◄───────────────────────── │          │
│          │   { accessToken,           │          │
│          │     refreshToken,          │          │
│          │     user }                 │          │
└──────────┘                            └──────────┘
```

1. User clicks "Sign in with Google"
2. Google OAuth popup returns an ID token
3. Client sends ID token to API
4. API validates token with Google's servers
5. API creates/links user account and returns JWT tokens

### 3. User Registration

```
POST /auth/register
{
  "email": "user@example.com",
  "password": "securepassword",
  "displayName": "User Name"
}
```

1. API checks if email already exists
2. Password hashed with BCrypt
3. User record created with default settings
4. JWT tokens generated and returned

## Token Architecture

### Access Token (JWT)

| Property | Value |
|----------|-------|
| Algorithm | HMAC-SHA256 |
| Expiry | 60 minutes |
| Storage | localStorage (client) |

**JWT Claims:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "Display Name",
  "jti": "unique-token-id",
  "iss": "Teboraw",
  "aud": "Teboraw",
  "exp": 1234567890
}
```

### Refresh Token

| Property | Value |
|----------|-------|
| Format | 64 random bytes (Base64 encoded) |
| Expiry | 7 days |
| Storage | localStorage (client) + database (server) |

## Token Refresh Flow

```
┌──────────┐                              ┌──────────┐
│  Client  │  Request with expired JWT    │   API    │
│          │ ────────────────────────────►│          │
│          │                              │          │
│          │ ◄────────────────────────────│          │
│          │       401 Unauthorized       │          │
│          │                              │          │
│          │  POST /auth/refresh          │          │
│          │ ────────────────────────────►│          │
│          │  { refreshToken }            │          │
│          │                              │          │
│          │ ◄────────────────────────────│          │
│          │  { newAccessToken,           │          │
│          │    newRefreshToken }         │          │
│          │                              │          │
│          │  Retry original request      │          │
│          │ ────────────────────────────►│          │
└──────────┘                              └──────────┘
```

The frontend automatically handles token refresh via an Axios interceptor.

## API Request Authentication

All protected API requests include the JWT in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Server-Side Validation

1. JWT signature verified with secret key
2. Issuer and audience validated
3. Token expiry checked (zero clock skew)
4. User ID extracted from `sub` claim
5. All database queries filtered by user ID

## User Data Isolation

The user ID is **always** extracted from the validated JWT token, never from request parameters:

```csharp
private Guid GetUserId()
{
    var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    return Guid.Parse(userIdClaim!);
}

// All queries filtered by authenticated user
var activities = await _unitOfWork.Activities.Query()
    .Where(a => a.UserId == userId)
    .ToListAsync();
```

This prevents users from accessing other users' data by manipulating request parameters.

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create new account |
| POST | `/auth/login` | Email/password login |
| POST | `/auth/google` | Google OAuth login |
| POST | `/auth/refresh` | Refresh access token |

### Protected Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Revoke refresh token |
| * | `/activities/*` | All activity endpoints |
| * | `/thoughts/*` | All thought endpoints |

## Frontend Integration

### Auth Store (Zustand)

The frontend maintains authentication state in a Zustand store with localStorage persistence:

```typescript
interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user, accessToken, refreshToken) => void
  logout: () => void
  updateTokens: (accessToken, refreshToken) => void
}
```

### Route Protection

Protected routes are wrapped with a `ProtectedRoute` component that redirects unauthenticated users to `/login`.

## Security Features

| Feature | Implementation |
|---------|----------------|
| Password hashing | BCrypt |
| Token signing | HMAC-SHA256 |
| Token expiry | 60 min access / 7 day refresh |
| Refresh token rotation | Old tokens revoked on refresh |
| Google OAuth validation | Server-side token verification |
| Zero clock skew | Strict token expiry validation |
| CORS | Restricted origins in development |

## Configuration

### Environment Variables

```env
JWT_SECRET_KEY=your-secret-key-min-32-chars
```

### appsettings.json

```json
{
  "Jwt": {
    "SecretKey": "configured-via-env-var",
    "Issuer": "Teboraw",
    "Audience": "Teboraw",
    "AccessTokenExpiryMinutes": 60,
    "RefreshTokenExpiryDays": 7
  },
  "Google": {
    "ClientId": "your-google-client-id"
  }
}
```

## File References

| Component | Location |
|-----------|----------|
| JWT Service | `apps/api/Teboraw.Api/Services/JwtService.cs` |
| Auth Service | `apps/api/Teboraw.Api/Services/AuthService.cs` |
| Auth Controller | `apps/api/Teboraw.Api/Controllers/AuthController.cs` |
| JWT Configuration | `apps/api/Teboraw.Api/Program.cs` |
| Frontend Auth Store | `apps/web/src/store/authStore.ts` |
| API Client | `apps/web/src/services/api.ts` |
| Login Page | `apps/web/src/pages/Login.tsx` |
| Register Page | `apps/web/src/pages/Register.tsx` |
