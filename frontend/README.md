# AgriVision Frontend

Frontend React application for the AgriVision platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Add your Firebase configuration to `.env`

4. Start the development server:
```bash
npm run dev
```

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── auth/        # Authentication components
│   │   ├── header/      # Header component
│   │   └── landing/     # Landing page component
│   ├── contexts/        # React contexts
│   │   └── authcontext/ # Authentication context
│   ├── firebase/        # Firebase configuration
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── api/             # API call functions
│   └── assets/          # Images, icons, etc.
├── public/              # Static assets
├── .env                 # Environment variables (not in git)
├── .env.example         # Environment variables template
└── package.json         # Dependencies
```

## Environment Variables

See `.env.example` for required environment variables. You need to set up:
- Firebase API key
- Firebase Auth Domain
- Firebase Project ID
- And other Firebase configuration

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack

- React 19
- Vite
- React Router DOM
- Firebase Authentication
- Tailwind CSS
