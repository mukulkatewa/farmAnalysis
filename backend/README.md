# AgriVision Backend

Backend API server for the AgriVision application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`

4. Start the development server:
```bash
npm run dev
```

## Project Structure

```
backend/
├── src/
│   ├── controllers/      # Request handlers
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── models/          # Data models
│   ├── services/        # Business logic & external services
│   ├── config/          # Configuration files
│   └── utils/           # Utility functions
├── .env                 # Environment variables (not in git)
├── .env.example         # Environment variables template
├── server.js            # Entry point
└── package.json         # Dependencies
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### User
- `GET /api/user/profile` - Get user profile (protected)
- `PUT /api/user/update` - Update user profile (protected)

## Environment Variables

See `.env.example` for required environment variables.

## Firebase Admin Setup

If using Firebase Admin SDK:
1. Go to Firebase Console
2. Project Settings > Service Accounts
3. Generate new private key
4. Add credentials to `.env` file

