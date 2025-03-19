import express, { Request, Response, Router, RequestHandler } from 'express'
import mapboxgl from 'mapbox-gl'

const router: Router = express.Router()

interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  environment: string
  mapbox: {
    configured: boolean
    tokenPresent: boolean
  }
  uptime: number
}

router.get('/', (async (req: Request, res: Response) => {
  try {
    const healthResponse: HealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      mapbox: {
        configured: !!mapboxgl.accessToken,
        tokenPresent: !!process.env.MAPBOX_SERVER_PUBLIC_TOKEN
      },
      uptime: process.uptime()
    }

    // If Mapbox is not configured, mark as unhealthy
    if (!mapboxgl.accessToken || !process.env.MAPBOX_SERVER_PUBLIC_TOKEN) {
      healthResponse.status = 'unhealthy'
      return res.status(503).json(healthResponse)
    }

    res.json(healthResponse)
  } catch (error) {
    console.error('Health check error:', error)
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Internal server error during health check'
    })
  }
}) as RequestHandler)

export { router as healthRouter }
