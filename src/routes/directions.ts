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

interface DirectionsResponse {
  route: {
    geometry: {
      coordinates: [number, number][]
      type: string
    }
    distance: number
    duration: number
  }
  waypoints: {
    location: [number, number]
    name: string
  }[]
}

router.post('/', (async (
  req: Request<{}, {}, DirectionsRequest>,
  res: Response
) => {
  try {
    const { start, end } = req.body

    // Validate input coordinates
    if (!start || !end || !Array.isArray(start) || !Array.isArray(end)) {
      return res.status(400).json({
        error:
          'Invalid coordinates. Please provide start and end coordinates as [longitude, latitude] arrays.'
      })
    }

    if (start.length !== 2 || end.length !== 2) {
      return res.status(400).json({
        error:
          'Invalid coordinate format. Each coordinate must be [longitude, latitude].'
      })
    }

    // Construct the URL for the Mapbox Directions API
    const url = new URL(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}`
    )

    // Add required parameters
    url.searchParams.append('access_token', mapboxgl.accessToken as string)
    url.searchParams.append('geometries', 'geojson')
    url.searchParams.append('overview', 'full')
    url.searchParams.append('steps', 'true')

    // Make the request
    const response = await fetch(url.toString())

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response body:', errorText)
      return res.status(response.status).json({
        error: `Mapbox API Error: ${response.status} - ${errorText}`
      })
    }

    const data = await response.json()

    // Validate the response data
    if (
      !data.routes ||
      !Array.isArray(data.routes) ||
      data.routes.length === 0
    ) {
      return res.status(404).json({
        error: 'No route found between the specified coordinates.'
      })
    }

    const route = data.routes[0]
    if (!route.geometry || !route.geometry.coordinates) {
      return res.status(500).json({
        error: 'Invalid route geometry received from Mapbox.'
      })
    }

    // Transform the data to match our DirectionsResponse interface
    const transformedData: DirectionsResponse = {
      route: {
        geometry: {
          coordinates: route.geometry.coordinates,
          type: route.geometry.type || 'LineString'
        },
        distance: route.distance || 0,
        duration: route.duration || 0
      },
      waypoints: data.waypoints.map((waypoint: any) => ({
        location: waypoint.location,
        name: waypoint.name || ''
      }))
    }

    res.json(transformedData)
  } catch (error) {
    console.error('Error getting route:', error)
    res.status(500).json({ error: 'Failed to get route' })
  }
}) as RequestHandler)

export { router as directionsRouter }
