# 🚀 Quick Deployment Steps

## Option 1: Vercel + Railway (Recommended)

### 1. Deploy Backend (Railway)
1. Go to [Railway.app](https://railway.app)
2. Click "Start a New Project" → "Deploy from GitHub repo"
3. Select your auction repo
4. In the root directory, click "Add variables":
   ```
   MONGODB_URI=mongodb+srv://clee1243:Sunningdale12!@auction.tpbymme.mongodb.net/player-trading-app
   JWT_SECRET=your-strong-secret-here
   PORT=8000
   NODE_ENV=production
   ```
5. Railway will auto-detect and deploy your Node.js app
6. Get your Railway domain: `https://yourapp.railway.app`

### 2. Deploy Frontend (Vercel)
1. Go to [Vercel.com](https://vercel.com)
2. Click "New Project" → Import from GitHub
3. Select your auction repo
4. In Environment Variables, add:
   ```
   NEXT_PUBLIC_API_URL=https://yourapp.railway.app
   NEXT_PUBLIC_WS_URL=wss://yourapp.railway.app
   ```
5. Deploy!

### 3. Share with Coaches
- Give coaches the Vercel URL: `https://yourapp.vercel.app`
- They can access on any phone/tablet browser
- For app-like experience: "Add to Home Screen"

## Option 2: DigitalOcean VPS ($6/month)

### Quick VPS Setup
```bash
# 1. Create $6 Ubuntu droplet on DigitalOcean
# 2. SSH into server
ssh root@your-server-ip

# 3. Install Node.js and MongoDB
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs nginx mongodb
npm install -g pm2

# 4. Clone and setup
git clone https://github.com/yourusername/auction.git
cd auction

# Setup backend
cd server
npm install
cp ../.env.production .env
pm2 start server.js --name auction-backend

# Setup frontend  
cd ..
npm install
npm run build
pm2 start npm --name auction-frontend -- start

# 5. Setup NGINX reverse proxy
# Copy nginx config to /etc/nginx/sites-available/
# Get SSL cert with certbot
```

## Mobile Tips for Coaches
- Use Chrome/Safari on phones
- Add to home screen for better experience
- Works best in portrait mode
- Stable WiFi recommended during auctions

## Cost Comparison
- **Vercel + Railway**: Free tier available, ~$5-20/month for production
- **DigitalOcean VPS**: $6/month (all included)
- **Heroku**: ~$14/month (more expensive)

## Security Notes
- HTTPS automatically handled by Vercel/Railway
- MongoDB Atlas includes security by default
- JWT tokens for secure authentication
- WebSocket connections are encrypted in production
