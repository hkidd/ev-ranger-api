import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { chargingStationsRouter } from './routes/chargingStations'
import { geocodingRouter } from './routes/geocoding'
import { directionsRouter } from './routes/directions'
import { healthRouter } from './routes/health'
import tomtomRouter from './routes/tomtom'
import path from 'path'

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development'
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${env}`)
})

// Log environment (without sensitive data)
console.log(`Running in ${env} mode`)

const app = express()
const port = process.env.PORT || 3001

// CORS configuration - must come before other middleware
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173']
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL)
}

app.use(
  cors({
    origin: process.env.NODE_ENV === 'development' ? true : allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
)

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
app.use(limiter)

app.use(express.json())

// Root route with API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'EV Ranger API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/api/health',
      geocoding: '/api/geocoding/search',
      directions: '/api/directions',
      chargingStations: '/api/charging-stations',
      tomtom: {
        reachableRange: '/api/tomtom/reachable-range',
        evRoute: '/api/tomtom/ev-route',
        chargingStations: '/api/tomtom/charging-stations'
      }
    },
    documentation: 'https://github.com/yourusername/ev-ranger-api#readme'
  })
})

// API Routes
app.use('/api/health', healthRouter)
app.use('/api/charging-stations', chargingStationsRouter)
app.use('/api/geocoding', geocodingRouter)
app.use('/api/directions', directionsRouter)
app.use('/api/tomtom', tomtomRouter)

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Something went wrong!' })
  }
)

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
