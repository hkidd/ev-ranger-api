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

interface GeocodingRequest {
  query: string
  limit?: number
  proximity?: [number, number]
}

interface GeocodingFeature {
  id: string
  text: string
  place_name: string
  center: [number, number]
  bbox?: [number, number, number, number]
  properties?: Record<string, any>
  context?: any[]
  relevance?: number
  place_type?: string[]
}

interface GeocodingResponse {
  features: GeocodingFeature[]
  query: string[]
  attribution: string
}

router.post('/search', (async (
  req: Request<{}, {}, GeocodingRequest>,
  res: Response
) => {
  try {
    const { query, limit = 5, proximity } = req.body as GeocodingRequest

    // Validate input
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Invalid query parameter' })
    }

    // Construct the URL for the Mapbox Geocoding API
    const url = new URL(
      'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
        encodeURIComponent(query) +
        '.json'
    )

    // Add required parameters
    if (!mapboxgl.accessToken) {
      throw new Error('Mapbox access token is not configured')
    }

    url.searchParams.append('access_token', mapboxgl.accessToken)
    url.searchParams.append('limit', limit.toString())
    url.searchParams.append('language', 'en')
    url.searchParams.append('country', 'us')

    if (proximity) {
      url.searchParams.append('proximity', `${proximity[0]},${proximity[1]}`)
    }

    // Make the request
    const response = await fetch(url.toString())

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response body:', errorText)
      throw new Error(`Mapbox API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // Ensure we're sending the data in the expected format
    res.json({
      features: data.features || [],
      query: data.query || [],
      attribution: data.attribution || ''
    })
  } catch (error) {
    console.error('Error in geocoding:', error)
    res.status(500).json({ error: 'Failed to perform geocoding' })
  }
}) as RequestHandler)

export { router as geocodingRouter }
