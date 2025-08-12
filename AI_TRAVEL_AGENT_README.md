# AI-Powered Travel Planning Agent

A comprehensive AI-powered travel planning assistant built with **LangGraph** for conversation flow & context memory and **LangChain** for API tool orchestration.

## 🌟 Features

### Core Capabilities
- **Intelligent Conversation Flow**: LangGraph-powered workflow with structured checkpoints
- **Multi-API Integration**: Google Search, OpenWeatherMap, Hotels, and Maps APIs via LangChain tools
- **Context Persistence**: Remember user preferences and conversation history across sessions
- **Blacklist Management**: Admin and user-specific blacklists for hotels, cities, and activities
- **Multi-modal Input**: Support for both text and voice queries
- **AI-Powered Optimization**: Smart hotel selection balancing price, quality, and preferences

### Advanced AI Features
- **Best Value Combination Finder**: AI algorithm that balances budget with quality
- **Travel Alerts**: Weather warnings, travel advisories, and health alerts
- **Personalized Recommendations**: Based on travel history and preferences
- **Dynamic Itinerary Generation**: Day-wise activities with costs and travel times
- **Budget Estimation**: Comprehensive breakdown of transportation, accommodation, food, and activities

## 🏗️ Architecture

### LangGraph Workflow
The agent follows a structured conversation flow with checkpoints:

1. **Start Conversation** → Load user context and preferences
2. **Destination Selection** → Search and filter destinations
3. **Weather Check** → Get weather forecasts for selected destinations
4. **Hotel Search** → Find and filter hotels (excluding blacklisted ones)
5. **Route Planning** → Plan transportation between locations
6. **Budget Estimation** → Calculate comprehensive trip costs
7. **Itinerary Generation** → Create detailed day-by-day plans
8. **Finalize** → Save context and return structured response

### LangChain Tools Integration
- **GoogleSearchTool**: Destination and attraction search
- **WeatherTool**: OpenWeatherMap API integration
- **HotelSearchTool**: Hotel search with filtering capabilities
- **RouteSearchTool**: Transportation route planning
- **BudgetEstimatorTool**: Intelligent cost estimation

### Database Schema
- **MongoDB**: User contexts, preferences, blacklists, conversation history
- **Redis**: Session caching and real-time data
- **Collections**:
  - `user_contexts`: Conversation history and current trip planning
  - `user_preferences`: Travel preferences and settings
  - `blacklist`: User-specific blacklisted items
  - `admin_blacklist`: Admin-managed blacklists

## 🚀 API Endpoints

### Core Chat Functionality
```
POST /api/chat
- Process text messages through AI workflow
- Returns structured travel recommendations

POST /api/voice/chat
- Process voice input and return AI responses
- Includes speech-to-text and intent recognition
```

### Blacklist Management
```
POST /api/blacklist/add
- Add items to user or admin blacklist

DELETE /api/blacklist/remove
- Remove items from blacklist

GET /api/blacklist/{user_id}
- Get all blacklisted items for user
```

### User Preferences
```
POST /api/preferences/save
- Save user travel preferences

GET /api/preferences/{user_id}
- Get user preferences

GET /api/recommendations/{user_id}
- Get personalized recommendations
```

### Advanced AI Features
```
POST /api/ai/optimize-hotels
- AI-powered hotel optimization for best value

POST /api/ai/travel-alerts
- Get travel alerts for destinations

POST /api/ai/travel-tips
- Generate AI-powered travel tips

POST /api/ai/optimize-itinerary
- Optimize itinerary timing using AI
```

### Multi-modal Input
```
POST /api/voice/process
- Convert voice to text with intent recognition

GET /api/voice/capabilities
- Get voice processing capabilities
```

## 🛠️ Setup Instructions

### 1. Environment Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp backend/.env.example backend/.env
```

### 2. Required API Keys
Add to `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
GOOGLE_SEARCH_API_KEY=your_google_search_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
MONGO_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379/0
```

### 3. Database Setup
```bash
# Start MongoDB
mongod

# Start Redis
redis-server

# The application will automatically create required collections
```

### 4. Run the Application
```bash
# Start the backend server
cd backend
python main.py

# The server will start on http://localhost:8000
# API documentation available at http://localhost:8000/docs
```

## 📱 Usage Examples

### Text Chat
```python
import requests

response = requests.post("http://localhost:8000/api/chat", json={
    "message": "I want to go to Goa in December for 5 days",
    "user_id": "user123",
    "preferences": {
        "budget_max": 1500,
        "travel_style": "adventure"
    }
})
```

### Voice Input
```python
import base64
import requests

# Convert audio file to base64
with open("voice_query.wav", "rb") as f:
    audio_data = base64.b64encode(f.read()).decode()

response = requests.post("http://localhost:8000/api/voice/chat", json={
    "audio_data": audio_data,
    "format": "wav",
    "language": "en-US"
}, params={"user_id": "user123"})
```

### Blacklist Management
```python
# Add hotel to blacklist
requests.post("http://localhost:8000/api/blacklist/add", json={
    "user_id": "user123",
    "item_name": "Hotel XYZ",
    "item_type": "hotel",
    "reason": "Poor service experience"
})
```

## 🔧 Configuration

### LangGraph Settings
- **Checkpointer**: Memory-based for development, Redis for production
- **State Management**: Persistent across conversation turns
- **Error Handling**: Graceful fallbacks at each checkpoint

### LangChain Tools Configuration
- **Temperature**: 0.7 for creative responses, 0.3 for optimization tasks
- **Model**: Gemini-1.5-Pro for advanced reasoning
- **Timeout**: Configurable per tool (default 30s)

### Blacklist Filtering
- **Real-time**: Applied during search operations
- **Fuzzy Matching**: Handles name variations
- **Inheritance**: User blacklists inherit admin blacklists

## 🧠 AI Intelligence Features

### Smart Hotel Optimization
The AI considers multiple factors:
- **Price vs Quality**: Weighted scoring based on user preferences
- **Location**: Distance from city center and attractions
- **Amenities**: Match with user needs and travel style
- **Reviews**: Aggregate rating and sentiment analysis

### Travel Alerts System
- **Weather Alerts**: Severe weather warnings for travel dates
- **Travel Advisories**: Government safety recommendations
- **Health Alerts**: Disease outbreaks and vaccination requirements
- **Real-time Updates**: Continuous monitoring during trip planning

### Personalized Recommendations
- **Learning**: Analyzes past trips and preferences
- **Similarity**: Recommends based on successful past experiences
- **Seasonal**: Considers best times to visit destinations
- **Budget-aware**: Tailored to user's financial preferences

## 🔒 Security & Privacy

### Data Protection
- **Encryption**: All sensitive data encrypted at rest
- **Session Management**: Secure session tokens with expiration
- **API Rate Limiting**: Prevents abuse and ensures fair usage
- **Input Validation**: Comprehensive sanitization of all inputs

### Privacy Features
- **Data Retention**: Configurable cleanup of old conversations
- **User Control**: Users can delete their data and preferences
- **Anonymization**: Personal data can be anonymized for analytics

## 🚦 Monitoring & Logging

### Application Monitoring
- **Health Checks**: `/api/health` endpoint for system status
- **Performance Metrics**: Response times and success rates
- **Error Tracking**: Comprehensive error logging and alerting
- **Usage Analytics**: Track popular destinations and features

### Debugging
- **Verbose Logging**: Detailed logs for each workflow step
- **State Inspection**: View conversation state at any checkpoint
- **Tool Tracing**: Track API calls and responses

## 🔮 Future Enhancements

### Planned Features
- **Real-time Collaboration**: Multiple users planning together
- **AR Integration**: Augmented reality for destination exploration
- **Blockchain Booking**: Decentralized hotel and flight booking
- **ML Personalization**: Advanced machine learning for recommendations

### API Integrations
- **Flight APIs**: Amadeus, Skyscanner integration
- **Restaurant APIs**: Yelp, TripAdvisor for dining recommendations
- **Activity APIs**: GetYourGuide, Viator for experiences
- **Payment APIs**: Stripe, PayPal for direct booking

## 📊 Performance Optimization

### Caching Strategy
- **Redis**: Hot data and session caching
- **MongoDB**: Persistent storage with indexing
- **CDN**: Static content delivery for images and maps

### Scalability
- **Horizontal Scaling**: Multiple worker processes
- **Load Balancing**: Distribute requests across instances
- **Database Sharding**: Scale MongoDB for large user bases

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Standards
- **Type Hints**: All functions must have type annotations
- **Documentation**: Docstrings for all public methods
- **Testing**: Unit tests for all new features
- **Linting**: Follow PEP 8 style guidelines

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **LangChain Team**: For the excellent framework
- **LangGraph Team**: For conversation flow capabilities
- **Google**: For Gemini AI integration
- **OpenWeather**: For weather data API
- **MongoDB**: For flexible document storage

---

**Built with ❤️ for travelers worldwide**
