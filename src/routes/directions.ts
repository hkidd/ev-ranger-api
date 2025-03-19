import express, { Request, Response, Router, RequestHandler } from 'express'
import mapboxgl from 'mapbox-gl'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const router: Router = express.Router()

// Initialize Mapbox with server-side token
const token = process.env.MAPBOX_SERVER_PUBLIC_TOKEN
if (!token) {
  throw new Error(
    'MAPBOX_SERVER_PUBLIC_TOKEN is not configured in environment variables'
  )
}
mapboxgl.accessToken = token

interface DirectionsRequest {
  start: [number, number]
  end: [number, number]
}

interface RouteGeometry {
  type: string
  coordinates: [number, number][]
}

interface Route {
  geometry: RouteGeometry
  distance: number // in miles
}

router.post('/', (async (
  req: Request<{}, {}, DirectionsRequest>,
  res: Response
) => {
  try {
    const { start, end } = req.body as DirectionsRequest

    // Validate input
    if (
      !Array.isArray(start) ||
      start.length !== 2 ||
      !Array.isArray(end) ||
      end.length !== 2
    ) {
      return res.status(400).json({ error: 'Invalid input parameters' })
    }

    // Construct the URL for the Mapbox Directions API
    const url = new URL(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}`
    )

    // Add required parameters
    if (!mapboxgl.accessToken) {
      throw new Error('Mapbox access token is not configured')
    }
    url.searchParams.append('access_token', mapboxgl.accessToken)
    url.searchParams.append('geometries', 'geojson')

    // Make the request
    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`Mapbox API Error: ${response.status}`)
    }

    const data = await response.json()

    // Transform the data to match our Route interface
    const route: Route = {
      geometry: data.routes[0].geometry,
      distance: data.routes[0].distance * 0.000621371 // Convert meters to miles
    }

    res.json({ route })
  } catch (error) {
    console.error('Error getting route:', error)
    res.status(500).json({ error: 'Failed to get route from Mapbox' })
  }
}) as RequestHandler)

export { router as directionsRouter }
