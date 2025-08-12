from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, Union
import logging
import os
import json
from datetime import datetime
import sys

# Import the new endpoints
from backend.api.endpoints import trips, cities, conversations

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.agent.workflow import travel_agent, AgentState
from backend.models import TravelAssistantResponse, UIActions, TripPlan, Activity, DayPlan, CityVisit
from backend.config import settings
from backend.repositories import ConversationRepository
from backend.db import close_connections
from backend.services.blacklist_service import BlacklistService, BlacklistType
from backend.services.context_service import ContextService
from backend.services.multimodal_service import MultiModalService, VoiceInput
from backend.services.advanced_ai_service import AdvancedAIService
from backend.repositories.city_repository import city_repository

# Configure logging
logging.basicConfig(level=logging.INFO if settings.DEBUG else logging.WARNING)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Travel Planning Assistant",
    version=settings.VERSION,
    debug=settings.DEBUG,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers for trips, cities, and conversations
app.include_router(trips.router)
app.include_router(cities.router)
app.include_router(conversations.router)

# Mount static files (optional)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
else:
    logger.warning(f"Static directory not found at {static_dir}; skipping static mount")

# Initialize Gemini service
from backend.services.gemini_service import GeminiChat, ItineraryGenerator

# Initialize services
try:
    gemini_chat = GeminiChat()
    itinerary_generator = ItineraryGenerator()
    blacklist_service = BlacklistService()
    context_service = ContextService()
    multimodal_service = MultiModalService()
    advanced_ai_service = AdvancedAIService()
except Exception as e:
    logger.error(f"Failed to initialize services: {str(e)}")
    raise

# Utility: serialize nested pydantic models to plain dicts
def to_jsonable(obj):
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if isinstance(obj, dict):
        return {k: to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [to_jsonable(v) for v in obj]
    return obj

# Request/Response Models
class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message sender (user/assistant)")
    content: str = Field(..., description="Content of the message")

class ChatRequest(BaseModel):
    message: str = Field(..., description="User's message content")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for multi-turn conversations")
    user_id: str = Field(..., description="User ID for personalization")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context for the conversation")
    preferences: Optional[Dict[str, Any]] = Field(None, description="User travel preferences")
    stream: bool = Field(False, description="Whether to stream the response")

class ChatResponse(BaseModel):
    message: str = Field(..., description="Assistant's response message")
    conversation_id: str = Field(..., description="Conversation ID")
    ui_actions: Optional[Dict[str, Any]] = Field(None, description="UI actions to perform")
    trip_plan: Optional[Dict[str, Any]] = Field(None, description="Generated trip plan")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class HealthCheck(BaseModel):
    status: str
    version: str
    environment: str

# Conversation repository will be initialized on startup
conv_repo: Optional[ConversationRepository] = None

# Helper function to get or create conversation
async def get_conversation(conversation_id: Optional[str] = None) -> tuple[str, AgentState]:
    """Get or create a conversation stored in MongoDB/Redis."""
    global conv_repo
    assert conv_repo is not None, "Conversation repository not initialized"
    if conversation_id:
        existing = await conv_repo.get(conversation_id)
        if existing:
            return conversation_id, existing  # type: ignore
        # Initialize new state under provided ID
        new_id = conversation_id
    else:
        # Create new random ID
        new_id = os.urandom(8).hex()
    state: AgentState = {
        "messages": [],
        "user_input": {},
        "trip_plan": None,
        "ui_actions": UIActions(),
        "missing_fields": [],
        "context": {}
    }
    await conv_repo.upsert(new_id, to_jsonable(state))
    return new_id, state

@app.post(f"{settings.API_PREFIX}/chat", response_model=ChatResponse)
async def chat(chat_request: ChatRequest):
    """Handle chat messages and return assistant responses using AI Travel Planning Agent."""
    try:
        # Process message through the AI Travel Planning Agent workflow
        response = await travel_agent.process_message(
            message=chat_request.message,
            user_id=chat_request.user_id,
            session_id=chat_request.conversation_id or f"session_{datetime.utcnow().timestamp()}",
            user_preferences=chat_request.preferences or {}
        )
        
        # Update conversation history
        await context_service.update_conversation_history(
            user_id=chat_request.user_id,
            session_id=chat_request.conversation_id or f"session_{datetime.utcnow().timestamp()}",
            message=chat_request.message,
            response=response.message,
            trip_data=response.trip.model_dump() if response.trip else None
        )
        
        # Convert to ChatResponse format
        chat_response = ChatResponse(
            conversation_id=chat_request.conversation_id or f"session_{datetime.utcnow().timestamp()}",
            message=response.message,
            ui_actions=response.ui_actions.model_dump() if response.ui_actions else None,
            trip_plan=response.trip.model_dump() if response.trip else None
        )
        
        return chat_response
        
    except Exception as e:
        logger.error(f"Error processing chat: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing your request: {str(e)}"
        )

@app.get(f"{settings.API_PREFIX}/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

# Blacklist Management Endpoints
class BlacklistRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    item_name: str = Field(..., description="Name of item to blacklist")
    item_type: str = Field(..., description="Type of item (hotel, city, activity, restaurant)")
    reason: Optional[str] = Field(None, description="Reason for blacklisting")
    is_admin: bool = Field(False, description="Whether this is an admin blacklist")

@app.post(f"{settings.API_PREFIX}/blacklist/add")
async def add_to_blacklist(request: BlacklistRequest):
    """Add item to blacklist"""
    try:
        success = await blacklist_service.add_to_blacklist(
            user_id=request.user_id,
            item_name=request.item_name,
            item_type=BlacklistType(request.item_type),
            reason=request.reason,
            is_admin=request.is_admin
        )
        
        if success:
            return {"status": "success", "message": f"Added {request.item_name} to blacklist"}
        else:
            return {"status": "error", "message": f"{request.item_name} is already blacklisted"}
            
    except Exception as e:
        logger.error(f"Error adding to blacklist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete(f"{settings.API_PREFIX}/blacklist/remove")
async def remove_from_blacklist(request: BlacklistRequest):
    """Remove item from blacklist"""
    try:
        success = await blacklist_service.remove_from_blacklist(
            user_id=request.user_id,
            item_name=request.item_name,
            item_type=BlacklistType(request.item_type),
            is_admin=request.is_admin
        )
        
        if success:
            return {"status": "success", "message": f"Removed {request.item_name} from blacklist"}
        else:
            return {"status": "error", "message": f"{request.item_name} not found in blacklist"}
            
    except Exception as e:
        logger.error(f"Error removing from blacklist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get(f"{settings.API_PREFIX}/blacklist/{{user_id}}")
async def get_user_blacklist(user_id: str):
    """Get all blacklisted items for a user"""
    try:
        blacklists = await blacklist_service.get_all_blacklists(user_id)
        return {"status": "success", "blacklists": blacklists}
        
    except Exception as e:
        logger.error(f"Error getting blacklist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# User Preferences Endpoints
class PreferencesRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    preferences: Dict[str, Any] = Field(..., description="User travel preferences")

@app.post(f"{settings.API_PREFIX}/preferences/save")
async def save_user_preferences(request: PreferencesRequest):
    """Save user travel preferences"""
    try:
        success = await context_service.save_user_preferences(
            user_id=request.user_id,
            preferences=request.preferences
        )
        
        if success:
            return {"status": "success", "message": "Preferences saved successfully"}
        else:
            return {"status": "error", "message": "Failed to save preferences"}
            
    except Exception as e:
        logger.error(f"Error saving preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get(f"{settings.API_PREFIX}/preferences/{{user_id}}")
async def get_user_preferences(user_id: str):
    """Get user travel preferences"""
    try:
        preferences = await context_service.get_user_preferences(user_id)
        return {"status": "success", "preferences": preferences.model_dump()}
        
    except Exception as e:
        logger.error(f"Error getting preferences: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get(f"{settings.API_PREFIX}/recommendations/{{user_id}}")
async def get_personalized_recommendations(user_id: str):
    """Get personalized travel recommendations"""
    try:
        recommendations = await context_service.get_personalized_recommendations(user_id)
        return {"status": "success", "recommendations": recommendations}
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Multi-modal Input Endpoints
@app.post(f"{settings.API_PREFIX}/voice/process")
async def process_voice_input(voice_input: VoiceInput):
    """Process voice input and convert to text"""
    try:
        result = await multimodal_service.process_voice_input(voice_input)
        return result
        
    except Exception as e:
        logger.error(f"Error processing voice input: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post(f"{settings.API_PREFIX}/voice/chat")
async def voice_chat(voice_input: VoiceInput, user_id: str, conversation_id: Optional[str] = None):
    """Process voice input and return chat response"""
    try:
        # Convert voice to chat request
        conversion_result = await multimodal_service.convert_voice_to_chat_request(
            voice_input, user_id, conversation_id
        )
        
        if conversion_result["status"] != "success":
            return conversion_result
        
        # Process through chat endpoint
        chat_request_data = conversion_result["chat_request"]
        chat_request = ChatRequest(**chat_request_data)
        
        # Get AI response
        chat_response = await chat(chat_request)
        
        # Add voice metadata to response
        response_dict = chat_response.model_dump()
        response_dict["voice_metadata"] = conversion_result["voice_metadata"]
        
        return response_dict
        
    except Exception as e:
        logger.error(f"Error processing voice chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get(f"{settings.API_PREFIX}/voice/capabilities")
async def get_voice_capabilities():
    """Get voice processing capabilities"""
    try:
        capabilities = await multimodal_service.get_voice_capabilities()
        return {"status": "success", "capabilities": capabilities}
        
    except Exception as e:
        logger.error(f"Error getting voice capabilities: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Advanced AI Features Endpoints
class OptimizationRequest(BaseModel):
    hotels: List[Dict[str, Any]] = Field(..., description="List of hotels to optimize")
    budget_max: float = Field(..., description="Maximum budget")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="User preferences")

@app.post(f"{settings.API_PREFIX}/ai/optimize-hotels")
async def optimize_hotel_selection(request: OptimizationRequest):
    """AI-powered hotel optimization for best value"""
    try:
        result = await advanced_ai_service.find_best_value_combination(
            hotels=request.hotels,
            budget_max=request.budget_max,
            preferences=request.preferences
        )
        return result
        
    except Exception as e:
        logger.error(f"Error optimizing hotel selection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class TravelAlertsRequest(BaseModel):
    destinations: List[str] = Field(..., description="List of destinations")
    travel_dates: Optional[Dict[str, str]] = Field(None, description="Travel dates")

@app.post(f"{settings.API_PREFIX}/ai/travel-alerts")
async def get_travel_alerts(request: TravelAlertsRequest):
    """Get travel alerts for destinations"""
    try:
        alerts = await advanced_ai_service.get_travel_alerts(
            destinations=request.destinations,
            travel_dates=request.travel_dates
        )
        return alerts
        
    except Exception as e:
        logger.error(f"Error getting travel alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class TravelTipsRequest(BaseModel):
    destination: str = Field(..., description="Destination")
    travel_style: str = Field(..., description="Travel style")
    duration: int = Field(..., description="Trip duration in days")
    budget: float = Field(..., description="Budget amount")

@app.post(f"{settings.API_PREFIX}/ai/travel-tips")
async def generate_travel_tips(request: TravelTipsRequest):
    """Generate AI-powered travel tips"""
    try:
        tips = await advanced_ai_service.generate_ai_travel_tips(
            destination=request.destination,
            travel_style=request.travel_style,
            duration=request.duration,
            budget=request.budget
        )
        return tips
        
    except Exception as e:
        logger.error(f"Error generating travel tips: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ItineraryOptimizationRequest(BaseModel):
    itinerary: Dict[str, Any] = Field(..., description="Current itinerary")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="User preferences")

@app.post(f"{settings.API_PREFIX}/ai/optimize-itinerary")
async def optimize_itinerary_timing(request: ItineraryOptimizationRequest):
    """Optimize itinerary timing using AI"""
    try:
        result = await advanced_ai_service.optimize_itinerary_timing(
            itinerary=request.itinerary,
            preferences=request.preferences
        )
        return result
        
    except Exception as e:
        logger.error(f"Error optimizing itinerary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-itinerary")
async def generate_itinerary_endpoint(user_input: Dict[str, Any]):
    """Generate itinerary matching the frontend service call."""
    try:
        result = itinerary_generator.generate_itinerary(user_input)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint with API documentation."""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs"
    }

@app.on_event("startup")
async def on_startup():
    global conv_repo
    conv_repo = await ConversationRepository.create()
    # Ensure DB indexes for cities are created on startup
    try:
        await city_repository.ensure_indexes()
    except Exception as e:
        logger.warning(f"Failed to ensure city indexes: {e}")
    # Initialize async services
    try:
        await context_service.init()
    except Exception as e:
        logger.warning(f"Failed to initialize context service: {e}")

@app.on_event("shutdown")
async def on_shutdown():
    await close_connections()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning"
    )
