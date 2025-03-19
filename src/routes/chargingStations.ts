import express, { Request, Response, Router, RequestHandler } from 'express'
import mapboxgl from 'mapbox-gl'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const router: Router = express.Router()

// Initialize Mapbox with server-side token
const token = process.env.MAPBOX_SERVER_SECRET_TOKEN
if (!token) {
  throw new Error(
    'MAPBOX_SERVER_SECRET_TOKEN is not configured in environment variables'
  )
}
mapboxgl.accessToken = token

interface ChargingStationRequest {
  center: [number, number]
  radius: number
}

interface ChargingStation {
  id: string
  name: string
  location: [number, number]
  type: string
  status: 'available' | 'occupied' | 'unknown'
  connectors: {
    type: string
    power: number
    count: number
  }[]
}

router.post('/', (async (
  req: Request<{}, {}, ChargingStationRequest>,
  res: Response
) => {
  try {
    const { center, radius } = req.body as ChargingStationRequest

    // Validate input
    if (
      !Array.isArray(center) ||
      center.length !== 2 ||
      typeof radius !== 'number'
    ) {
      return res.status(400).json({ error: 'Invalid input parameters' })
    }

    // Convert radius from miles to meters (1 mile ≈ 1609.34 meters)
    const radiusInMeters = radius * 1609.34

    // Construct the URL for the Mapbox EV Charger Finder API
    const url = new URL(
      'https://api.mapbox.com/geocoding/v5/mapbox.places/ev-charger.json'
    )

    // Add required parameters
    if (!mapboxgl.accessToken) {
      throw new Error('Mapbox access token is not configured')
    }
    url.searchParams.append('access_token', mapboxgl.accessToken)
    url.searchParams.append('proximity', `${center[0]},${center[1]}`)
    url.searchParams.append('radius', radiusInMeters.toString())
    url.searchParams.append('limit', '50')
    url.searchParams.append('types', 'poi')

    // Make the request
    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`Mapbox API Error: ${response.status}`)
    }

    const data = await response.json()

    // Transform the data to match our ChargingStation interface
    const stations: ChargingStation[] = data.features.map((feature: any) => ({
      id: feature.id,
      name: feature.text,
      location: feature.center,
      type: feature.properties?.type || 'unknown',
      status: 'unknown', // Mapbox doesn't provide real-time status
      connectors: [] // Mapbox doesn't provide connector details
    }))

    res.json({ stations })
  } catch (error) {
    console.error('Error fetching charging stations:', error)
    res.status(500).json({ error: 'Failed to fetch charging stations' })
  }
}) as RequestHandler)

export { router as chargingStationsRouter }
