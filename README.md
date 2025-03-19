# EV Ranger API

A Node.js/Express API service for the EV Ranger application, providing geocoding and range visualizations using the Mapbox API.

## Features

- Geocoding search
- Range visualization
- EV charging station locations (future update)

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Mapbox API token with appropriate scopes

## Environment Variables

Create the following environment files:

### Development (.env.development)

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
MAPBOX_SERVER_PUBLIC_TOKEN=your_public_token_here
NODE_ENV=development
```

### Production (.env.production)

```env
PORT=3001
FRONTEND_URL=https://ev-ranger.vercel.app
MAPBOX_SERVER_PUBLIC_TOKEN=your_public_token_here
NODE_ENV=production
```

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/ev-ranger-api.git
cd ev-ranger-api
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.development
# Edit .env.development with your values
```

## Development

Run the development server:

```bash
npm run dev
```

The server will start on `http://localhost:3001` with hot-reloading enabled.

## Production

Build and start the production server:

```bash
npm run build
npm start
```

## API Endpoints

### Geocoding

- `POST /api/geocoding/search`
  - Search for locations and get coordinates
  - Request body:
    ```json
    {
      "query": "string",
      "limit": number (optional, default: 5),
      "proximity": [number, number] (optional)
    }
    ```

### Directions

- `POST /api/directions`
  - Get route between two points
  - Request body:
    ```json
    {
      "start": [number, number],
      "end": [number, number]
    }
    ```

### Charging Stations

- `POST /api/charging-stations`
  - Find EV charging stations near a location
  - Request body:
    ```json
    {
      "center": [number, number],
      "radius": number
    }
    ```

## Security Features

- Rate limiting (100 requests per 15 minutes per IP)
- CORS protection with configurable origins
- Security headers with Helmet
- Environment variable protection
- Input validation
- Error handling

## Deployment

This project is configured for deployment on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Set up environment variables in Vercel project settings
4. Deploy!

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
