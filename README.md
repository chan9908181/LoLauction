# Player Trading App

A simple player trading application with bidding system built with Next.js, Node.js, and MongoDB.

## Features

- User authentication (register/login)
- Create and manage player listings
- Simple bidding system (+$10 per bid)
- Buy players at current bid price
- Player search functionality
- Responsive design with Tailwind CSS

## Player Attributes

Each player has these simple attributes:
- **Name**: Player's name
- **Description**: Player description
- **Starting Price**: Always $0 (free to start)
- **Current Price**: Increases by $10 with each bid
- **Buyer**: User who purchases the player (initially null)
- **Bids**: Array of all bids placed on the player

## How Bidding Works

1. Players start at $0
2. Users can bid by clicking a button
3. Each bid automatically increases the price by $10
4. Users can buy the player at the current price
5. Once bought, no more bids can be placed

## Tech Stack

### Frontend
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- React

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT Authentication
- RESTful API

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (running locally or MongoDB Atlas)

### Installation

1. Install frontend dependencies:
```bash
npm install
```

2. Install backend dependencies:
```bash
cd server
npm install
cd ..
```

### Environment Setup

1. Copy and configure environment variables:
```bash
# Frontend (.env.local)
MONGODB_URI=mongodb://localhost:27017/player-trading-app
API_URL=http://localhost:5000
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Backend (server/.env)
MONGODB_URI=mongodb://localhost:27017/player-trading-app
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
```

### Running the Application

#### Option 1: Run both frontend and backend together
```bash
npm run dev:all
```

#### Option 2: Run separately

**Start the backend server:**
```bash
cd server
npm run dev
```

**Start the frontend (in a new terminal):**
```bash
npm run dev
```

### Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Players
- `GET /api/players` - Get all players
- `GET /api/players/:id` - Get single player
- `POST /api/players` - Create player listing
- `PUT /api/players/:id` - Update player listing
- `DELETE /api/players/:id` - Delete player listing

### Bids
- `POST /api/bids` - Place a bid (+$10) (authenticated)
- `GET /api/bids/player/:playerId` - Get bids for player
- `GET /api/bids/user` - Get user's bids (authenticated)
- `POST /api/bids/buy/:playerId` - Buy player at current price (authenticated)

## Project Structure

```
player-trading-app/
├── src/                    # Next.js frontend
│   └── app/
│       ├── globals.css
│       ├── layout.tsx
│       └── page.tsx
├── server/                 # Node.js backend
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Player.js
│   │   └── Bid.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── players.js
│   │   └── bids.js
│   ├── .env
│   ├── package.json
│   └── server.js
├── .env.local
├── package.json
└── README.md
```

## Development

- Frontend runs on port 3000
- Backend runs on port 5000
- MongoDB should be running on port 27017

## Next Steps

1. Set up MongoDB (local or Atlas)
2. Configure environment variables
3. Start the application
4. Begin developing additional features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
