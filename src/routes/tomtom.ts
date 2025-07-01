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

        const {
            latitude,
            longitude,
            radius = 50000,
            limit = 100,
            chargerType
        } = req.body

        if (!latitude || !longitude) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message: 'latitude and longitude are required'
            })
        }

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

        let allStations: any[] = []
        const stationIds = new Set()

        for (const search of searches) {
            try {
                // Remove undefined properties from params to avoid TS error
                const paramsObj: Record<string, string> = {}
                for (const [k, v] of Object.entries(search.params)) {
                    if (typeof v !== 'undefined') {
                        paramsObj[k] = v
                    }
                }
                const searchUrl = `${search.url}?${new URLSearchParams(
                    paramsObj
                )}`

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
                }
            } catch (error) {
                console.error('Search failed:', error)
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

// TomTom POI Search API endpoint
router.post('/pois', async (req, res) => {
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
            radius = 50000, // 50km default
            limit = 100,
            categories = ['9927'] // Default to natural/recreational areas (national parks)
        } = req.body

        if (!latitude || !longitude) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message: 'latitude and longitude are required'
            })
        }

        // POI category mapping
        const categoryMap: Record<string, string> = {
            'parks': '9927',        // Natural/Recreational areas
            'attractions': '9909',   // Tourist attractions  
            'museums': '9902',      // Museums
            'restaurants': '9376',  // Restaurants
            'hotels': '9373',       // Hotels/Lodging
            'scenic': '9927',       // Scenic areas (same as parks)
            'camping': '9911'       // Camping/RV parks
        }

        let allPOIs: any[] = []
        const poiIds = new Set()

        // Search for each requested category
        for (const category of categories) {
            try {
                const categoryCode = categoryMap[category] || category
                
                const params = {
                    key: TOMTOM_API_KEY,
                    lat: latitude.toString(),
                    lon: longitude.toString(),
                    radius: radius.toString(),
                    limit: '100',
                    categorySet: categoryCode,
                    view: 'Unified'
                }

                const searchUrl = `${TOMTOM_BASE_URL}/search/2/categorySearch/${encodeURIComponent(category === 'parks' ? 'national park' : category)}.json?${new URLSearchParams(params)}`

                const response = await fetch(searchUrl)
                if (response.ok) {
                    const data = await response.json()
                    const pois = data.results || []

                    // Deduplicate POIs by ID
                    pois.forEach((poi: any) => {
                        if (!poiIds.has(poi.id)) {
                            poiIds.add(poi.id)
                            allPOIs.push({
                                ...poi,
                                category: category
                            })
                        }
                    })
                }
            } catch (error) {
                console.error(`Failed to fetch ${category} POIs:`, error)
            }
        }

        // Add specific text searches for each requested category
        const specificSearches: { [key: string]: string[] } = {
            'parks': ['national park', 'state park', 'national monument', 'national forest', 'regional park'],
            'attractions': ['tourist attraction', 'landmark', 'scenic viewpoint', 'observation deck', 'visitor center'],
            'museums': ['museum', 'art gallery', 'science center', 'history center', 'cultural center'],
            'restaurants': ['restaurant', 'cafe', 'diner', 'food court', 'brewery'],
            'hotels': ['hotel', 'motel', 'resort', 'inn', 'lodge'],
            'camping': ['campground', 'rv park', 'camping', 'national forest campground', 'state park camping']
        }

        // Only search for categories that were requested
        for (const category of categories) {
            const searchTerms = specificSearches[category] || []
            
            for (const searchTerm of searchTerms) {
                try {
                    const params = {
                        key: TOMTOM_API_KEY,
                        lat: latitude.toString(),
                        lon: longitude.toString(),
                        radius: radius.toString(),
                        limit: '50',  // Keep good limit for plenty of POIs
                        view: 'Unified'
                    }

                    const searchUrl = `${TOMTOM_BASE_URL}/search/2/poiSearch/${encodeURIComponent(searchTerm)}.json?${new URLSearchParams(params)}`

                    const response = await fetch(searchUrl)
                    if (response.ok) {
                        const data = await response.json()
                        const pois = data.results || []

                        pois.forEach((poi: any) => {
                            if (!poiIds.has(poi.id)) {
                                poiIds.add(poi.id)
                                allPOIs.push({
                                    ...poi,
                                    category: category  // Assign the correct category based on search
                                })
                            }
                        })
                    }
                } catch (error) {
                    console.error(`Failed to search for ${searchTerm}:`, error)
                }
            }
        }

        // Transform POIs to consistent format
        const transformedPOIs = allPOIs.map((poi: any) => ({
            id: poi.id,
            name: poi.poi?.name || 'Unknown POI',
            category: poi.category,
            address: poi.address?.freeformAddress || '',
            latitude: poi.position?.lat,
            longitude: poi.position?.lon,
            distance: poi.dist,
            phone: poi.poi?.phone || null,
            url: poi.poi?.url || null,
            categories: poi.poi?.categories || [],
            source: 'tomtom'
        }))

        res.json({
            success: true,
            data: {
                pois: transformedPOIs,
                totalResults: transformedPOIs.length
            },
            source: 'tomtom'
        })
    } catch (error) {
        console.error('TomTom POI search error:', error)
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch POIs'
        })
    }
})

export default router
