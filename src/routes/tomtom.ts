import express from 'express'

const router = express.Router()

// TomTom API configuration
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY
const TOMTOM_BASE_URL = 'https://api.tomtom.com'

// TomTom Reachable Range API endpoint
router.post('/reachable-range', async (req, res) => {
    try {
        if (!TOMTOM_API_KEY) {
            return res.status(500).json({
                error: 'TomTom API key not configured',
                message: 'TOMTOM_API_KEY environment variable is required'
            })
        }

        const {
            latitude,
            longitude,
            energyBudgetInkWh,
            routeType = 'eco',
            constantSpeedConsumptionInkWhPerHundredkm
        } = req.body

        if (!latitude || !longitude || !energyBudgetInkWh) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message:
                    'latitude, longitude, and energyBudgetInkWh are required'
            })
        }

        const url = `${TOMTOM_BASE_URL}/routing/1/calculateReachableRange/${latitude},${longitude}/json`

        // Try specifying vehicle engine type explicitly for electric vehicles
        const params = new URLSearchParams({
            key: TOMTOM_API_KEY,
            energyBudgetInkWh: energyBudgetInkWh.toString(),
            vehicleEngineType: 'electric'
        })

        if (constantSpeedConsumptionInkWhPerHundredkm) {
            params.append(
                'constantSpeedConsumptionInkWhPerHundredkm',
                constantSpeedConsumptionInkWhPerHundredkm
            )
        } else {
            // Official TomTom format: speed,consumption:speed,consumption
            // Example: 50 km/h = 15 kWh/100km, 80 km/h = 20 kWh/100km, 120 km/h = 30 kWh/100km
            params.append(
                'constantSpeedConsumptionInkWhPerHundredkm',
                '50,15:80,20:120,30'
            )
        }

        const response = await fetch(`${url}?${params}`)

        if (!response.ok) {
            const errorData = await response.text()
            return res.status(response.status).json({
                error: 'TomTom API error',
                message: errorData
            })
        }

        const data = await response.json()

        res.json({
            success: true,
            data: data,
            source: 'tomtom'
        })
    } catch (error) {
        console.error('TomTom reachable range error:', error)
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to calculate reachable range'
        })
    }
})

// TomTom EV Routing API endpoint
router.post('/ev-route', async (req, res) => {
    try {
        if (!TOMTOM_API_KEY) {
            return res.status(500).json({
                error: 'TomTom API key not configured',
                message: 'TOMTOM_API_KEY environment variable is required'
            })
        }

        const {
            origin,
            destination,
            currentChargeInkWh,
            maxChargeInkWh,
            auxiliaryPowerInkW = 1.7,
            constantSpeedConsumptionInkWhPerHundredkm
        } = req.body

        if (!origin || !destination || !currentChargeInkWh || !maxChargeInkWh) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message:
                    'origin, destination, currentChargeInkWh, and maxChargeInkWh are required'
            })
        }

        const url = `${TOMTOM_BASE_URL}/routing/1/calculateRoute/${origin}:${destination}/json`
        const params = new URLSearchParams({
            key: TOMTOM_API_KEY,
            routeType: 'eco',
            traffic: 'true',
            currentChargeInkWh: currentChargeInkWh.toString(),
            maxChargeInkWh: maxChargeInkWh.toString(),
            auxiliaryPowerInkW: auxiliaryPowerInkW.toString()
        })

        // Add consumption data if provided
        if (constantSpeedConsumptionInkWhPerHundredkm) {
            params.append(
                'constantSpeedConsumptionInkWhPerHundredkm',
                constantSpeedConsumptionInkWhPerHundredkm
            )
        }

        const response = await fetch(`${url}?${params}`)

        if (!response.ok) {
            const errorData = await response.text()
            return res.status(response.status).json({
                error: 'TomTom API error',
                message: errorData
            })
        }

        const data = await response.json()

        res.json({
            success: true,
            data: data,
            source: 'tomtom'
        })
    } catch (error) {
        console.error('TomTom EV route error:', error)
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to calculate EV route'
        })
    }
})

// TomTom EV Charging Stations API endpoint
router.post('/charging-stations', async (req, res) => {
    try {
        if (!TOMTOM_API_KEY) {
            return res.status(500).json({
                error: 'TomTom API key not configured',
                message: 'TOMTOM_API_KEY environment variable is required'
            })
        }

        const { latitude, longitude, radius = 50000, limit = 100, chargerType } = req.body

        if (!latitude || !longitude) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message: 'latitude and longitude are required'
            })
        }

        console.log('TomTom Search API request:', {
            latitude,
            longitude,
            radius,
            radiusKm: Math.round(radius / 1000),
            radiusMiles: Math.round(radius / 1609.34),
            limit,
            chargerType,
            apiType: 'Charger Type Specific Search'
        })

        // Define searches based on charger type to get more targeted results
        let searches = []

        if (chargerType === 'fast') {
            searches = [
                {
                    url: `${TOMTOM_BASE_URL}/search/2/poiSearch/supercharger.json`,
                    params: {
                        key: TOMTOM_API_KEY,
                        lat: latitude.toString(),
                        lon: longitude.toString(),
                        radius: radius.toString(),
                        limit: '100',
                        view: 'Unified'
                    }
                },
                {
                    url: `${TOMTOM_BASE_URL}/search/2/poiSearch/fast%20charging.json`,
                    params: {
                        key: TOMTOM_API_KEY,
                        lat: latitude.toString(),
                        lon: longitude.toString(),
                        radius: radius.toString(),
                        limit: '100',
                        view: 'Unified'
                    }
                },
                {
                    url: `${TOMTOM_BASE_URL}/search/2/poiSearch/dc%20charging.json`,
                    params: {
                        key: TOMTOM_API_KEY,
                        lat: latitude.toString(),
                        lon: longitude.toString(),
                        radius: radius.toString(),
                        limit: '100',
                        view: 'Unified'
                    }
                }
            ]
        } else if (chargerType === 'level2') {
            searches = [
                {
                    url: `${TOMTOM_BASE_URL}/search/2/poiSearch/level%202%20charging.json`,
                    params: {
                        key: TOMTOM_API_KEY,
                        lat: latitude.toString(),
                        lon: longitude.toString(),
                        radius: radius.toString(),
                        limit: '100',
                        view: 'Unified'
                    }
                },
                {
                    url: `${TOMTOM_BASE_URL}/search/2/poiSearch/destination%20charging.json`,
                    params: {
                        key: TOMTOM_API_KEY,
                        lat: latitude.toString(),
                        lon: longitude.toString(),
                        radius: radius.toString(),
                        limit: '100',
                        view: 'Unified'
                    }
                },
                {
                    url: `${TOMTOM_BASE_URL}/search/2/categorySearch/electric%20vehicle%20station.json`,
                    params: {
                        key: TOMTOM_API_KEY,
                        lat: latitude.toString(),
                        lon: longitude.toString(),
                        radius: radius.toString(),
                        limit: '100',
                        categorySet: '7309',
                        view: 'Unified'
                    }
                }
            ]
        } else {
            // Default: all charging stations (for level1 or general search)
            searches = [
                {
                    url: `${TOMTOM_BASE_URL}/search/2/categorySearch/electric%20vehicle%20station.json`,
                    params: {
                        key: TOMTOM_API_KEY,
                        lat: latitude.toString(),
                        lon: longitude.toString(),
                        radius: radius.toString(),
                        limit: '100',
                        categorySet: '7309',
                        view: 'Unified'
                    }
                },
                {
                    url: `${TOMTOM_BASE_URL}/search/2/poiSearch/charging%20station.json`,
                    params: {
                        key: TOMTOM_API_KEY,
                        lat: latitude.toString(),
                        lon: longitude.toString(),
                        radius: radius.toString(),
                        limit: '100',
                        view: 'Unified'
                    }
                }
            ]
        }

        let allStations = []
        const stationIds = new Set()

        for (const search of searches) {
            try {
                const searchUrl = `${search.url}?${new URLSearchParams(search.params)}`
                console.log('Trying search:', searchUrl)
                
                const searchResponse = await fetch(searchUrl)
                if (searchResponse.ok) {
                    const searchData = await searchResponse.json()
                    const stations = searchData.results || []
                    
                    // Deduplicate stations by ID
                    stations.forEach((station: any) => {
                        if (!stationIds.has(station.id)) {
                            stationIds.add(station.id)
                            allStations.push(station)
                        }
                    })
                    
                    console.log(`Search returned ${stations.length} stations, total unique: ${allStations.length}`)
                }
            } catch (error) {
                console.log('Search failed:', error)
            }
        }

        const data = {
            results: allStations,
            summary: {
                totalResults: allStations.length
            }
        }

        // Transform TomTom data to match existing charging station format
        const transformedStations =
            data.results?.map((station: any) => ({
                id: station.id,
                name: station.poi?.name || 'Unknown Station',
                address: station.address?.freeformAddress || '',
                latitude: station.position?.lat,
                longitude: station.position?.lon,
                distance: station.dist,
                phone: station.poi?.phone || null,
                url: station.poi?.url || null,
                categories: station.poi?.categories || [],
                source: 'tomtom'
            })) || []

        console.log('TomTom Charger Type Search API response:', {
            resultsCount: data.results?.length || 0,
            totalResults: data.summary?.totalResults || 0,
            chargerType: chargerType || 'all',
            apiType: 'Charger Type Specific Search',
            hasMoreResults: (data.summary?.totalResults || 0) > (data.results?.length || 0)
        })

        res.json({
            success: true,
            data: {
                stations: transformedStations,
                totalResults: data.summary?.totalResults || 0
            },
            source: 'tomtom'
        })
    } catch (error) {
        console.error('TomTom charging stations error:', error)
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch charging stations'
        })
    }
})

export default router
