# GlobeTrotter AI Travel Planning Assistant

An intelligent travel planning assistant built with LangChain and LangGraph that helps users create personalized travel itineraries.

## Features

- Natural language conversation interface
- Smart itinerary generation with real-time data
- Multi-modal transport options (flights, trains, buses)
- Budget-aware planning
- Eco-friendly travel options
- Interactive UI with map integration
- PDF export functionality

## Setup

1. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Create a `.env` file in the backend directory with your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_PLACES_API_KEY=your_google_places_key
   MAPBOX_ACCESS_TOKEN=your_mapbox_token
   ```

3. Start the FastAPI server:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

4. The API will be available at `http://localhost:8000`

## API Endpoints

- `POST /api/chat` - Main chat endpoint for interacting with the travel assistant
- `GET /api/health` - Health check endpoint

## Development

### Project Structure

```
backend/
├── agent/
│   └── workflow.py      # LangGraph workflow definition
├── models/
│   └── __init__.py      # Pydantic models
├── main.py             # FastAPI application
├── requirements.txt    # Python dependencies
└── README.md          # This file
```

### Testing

To run tests:
```bash
pytest
```

## Environment Variables

- `OPENAI_API_KEY`: Required for the OpenAI language model
- `GOOGLE_PLACES_API_KEY`: For place search and details
- `MAPBOX_ACCESS_TOKEN`: For map rendering and directions
- `PORT`: Port to run the server on (default: 8000)

## License

MIT
