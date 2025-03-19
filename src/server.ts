import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { chargingStationsRouter } from './routes/chargingStations'
import { geocodingRouter } from './routes/geocoding'
import { directionsRouter } from './routes/directions'
import { healthRouter } from './routes/health'
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

// Security middleware
app.use(helmet())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173']
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          'The CORS policy for this site does not allow access from the specified Origin.'
        return callback(new Error(msg), false)
      }
      return callback(null, true)
    },
    methods: ['GET', 'POST'],
    credentials: true,
    maxAge: 86400 // 24 hours
  })
)

app.use(express.json())

// Routes
app.use('/api/charging-stations', chargingStationsRouter)
app.use('/api/geocoding', geocodingRouter)
app.use('/api/directions', directionsRouter)
app.use('/api/health', healthRouter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

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
