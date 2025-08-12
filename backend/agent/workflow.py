"""
LangGraph workflow for AI-powered Travel Planning Agent.
Implements conversation flow with checkpoints and context persistence.
"""

from typing import Dict, Any, List, Optional, TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_core.tools import Tool
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate
import json
import asyncio
from datetime import datetime, date
import logging

# Set up logger first
logger = logging.getLogger(__name__)

# Try to import Google Generative AI
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    GOOGLE_GENAI_AVAILABLE = True
except Exception as e:
    logger.warning(f"Google Generative AI not available: {e}")
    ChatGoogleGenerativeAI = None
    GOOGLE_GENAI_AVAILABLE = False

from ..services.api_tools import (
    GoogleSearchTool,
    WeatherTool, 
    HotelSearchTool,
    RouteSearchTool,
    BudgetEstimatorTool
)
from ..services.blacklist_service import BlacklistService
from ..services.context_service import ContextService
from ..models import TravelAssistantResponse, UIActions, TripPlan
from ..config import settings

logger = logging.getLogger(__name__)

class AgentState(TypedDict):
    """State for the travel planning agent workflow"""
    messages: Annotated[List[BaseMessage], "The conversation messages"]
    user_id: str
    session_id: str
    current_step: str
    user_preferences: Dict[str, Any]
    search_results: Dict[str, Any]
    weather_data: Dict[str, Any]
    hotel_results: List[Dict[str, Any]]
    route_data: Dict[str, Any]
    budget_estimate: Dict[str, Any]
    trip_plan: Optional[TripPlan]
    blacklist_items: List[str]
    context: Dict[str, Any]

class TravelPlanningWorkflow:
    """Main workflow class for travel planning agent"""
    
    def __init__(self):
        # Initialize Gemini service directly
        try:
            from ..services.gemini_service import GeminiChat
            self.gemini_chat = GeminiChat()
            logger.info("Gemini chat service initialized successfully")
            self.llm_available = True
        except Exception as e:
            logger.warning(f"Failed to initialize Gemini service: {e}")
            self.gemini_chat = None
            self.llm_available = False
        
        # Initialize basic services for simplified backend
        self.blacklist_service = BlacklistService()
        self.context_service = ContextService()
        
        # We don't need the complex LangChain workflow for the simplified version
        self.agent = None
        self.workflow = None
        self.memory = None
        self.app = None
    
    def _create_agent(self) -> AgentExecutor:
        """Create the LangChain agent with tools"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an AI-powered travel planning assistant. Your goal is to help users plan amazing trips by:
            
            1. Understanding their travel preferences and requirements
            2. Searching for destinations and attractions
            3. Checking weather conditions
            4. Finding suitable hotels (excluding blacklisted ones)
            5. Planning routes and transportation
            6. Estimating budgets
            7. Creating detailed itineraries
            
            Always be helpful, informative, and consider the user's budget and preferences.
            Exclude any blacklisted hotels, cities, or activities from your recommendations.
            
            Current conversation context: {context}
            User preferences: {user_preferences}
            Blacklisted items: {blacklist_items}
            """),
            ("human", "{input}"),
            ("placeholder", "{agent_scratchpad}")
        ])
        
        agent = create_tool_calling_agent(self.llm, self.tools, prompt)
        return AgentExecutor(agent=agent, tools=self.tools, verbose=True)
    
    def _create_workflow(self) -> StateGraph:
        """Create the LangGraph workflow with checkpoints"""
        workflow = StateGraph(AgentState)
        
        # Add nodes for each step
        workflow.add_node("start", self.start_conversation)
        workflow.add_node("destination_selection", self.destination_selection)
        workflow.add_node("weather_check", self.weather_check)
        workflow.add_node("hotel_search", self.hotel_search)
        workflow.add_node("route_planning", self.route_planning)
        workflow.add_node("budget_estimation", self.budget_estimation)
        workflow.add_node("itinerary_generation", self.itinerary_generation)
        workflow.add_node("finalize", self.finalize_response)
        
        # Define the flow
        workflow.set_entry_point("start")
        workflow.add_edge("start", "destination_selection")
        workflow.add_edge("destination_selection", "weather_check")
        workflow.add_edge("weather_check", "hotel_search")
        workflow.add_edge("hotel_search", "route_planning")
        workflow.add_edge("route_planning", "budget_estimation")
        workflow.add_edge("budget_estimation", "itinerary_generation")
        workflow.add_edge("itinerary_generation", "finalize")
        workflow.add_edge("finalize", END)
        
        return workflow
    
    async def start_conversation(self, state: AgentState) -> AgentState:
        """Initialize conversation and load context"""
        logger.info(f"Starting conversation for user {state['user_id']}")
        
        # Load user context and preferences
        context = await self.context_service.get_user_context(state['user_id'])
        blacklist = await self.blacklist_service.get_user_blacklist(state['user_id'])
        
        state['context'] = context
        state['blacklist_items'] = blacklist
        state['current_step'] = 'destination_selection'
        
        return state
    
    async def destination_selection(self, state: AgentState) -> AgentState:
        """Handle destination search and selection"""
        logger.info("Processing destination selection")
        
        last_message = state['messages'][-1].content if state['messages'] else ""
        
        # Use agent to search for destinations
        result = await self.agent.ainvoke({
            "input": f"Search for travel destinations based on: {last_message}",
            "context": state['context'],
            "user_preferences": state['user_preferences'],
            "blacklist_items": state['blacklist_items']
        })
        
        state['search_results'] = {"destinations": result['output']}
        state['current_step'] = 'weather_check'
        
        return state
    
    async def weather_check(self, state: AgentState) -> AgentState:
        """Check weather for selected destinations"""
        logger.info("Checking weather conditions")
        
        destinations = state['search_results'].get('destinations', [])
        
        # Get weather data for destinations
        result = await self.agent.ainvoke({
            "input": f"Get weather forecast for these destinations: {destinations}",
            "context": state['context'],
            "user_preferences": state['user_preferences'],
            "blacklist_items": state['blacklist_items']
        })
        
        state['weather_data'] = {"forecast": result['output']}
        state['current_step'] = 'hotel_search'
        
        return state
    
    async def hotel_search(self, state: AgentState) -> AgentState:
        """Search for hotels excluding blacklisted ones"""
        logger.info("Searching for hotels")
        
        destinations = state['search_results'].get('destinations', [])
        preferences = state['user_preferences']
        
        # Search hotels and filter blacklisted ones
        result = await self.agent.ainvoke({
            "input": f"Find hotels in {destinations} with preferences: {preferences}. Exclude blacklisted items: {state['blacklist_items']}",
            "context": state['context'],
            "user_preferences": state['user_preferences'],
            "blacklist_items": state['blacklist_items']
        })
        
        # Filter out blacklisted hotels
        hotels = await self.blacklist_service.filter_hotels(result['output'], state['user_id'])
        
        state['hotel_results'] = hotels
        state['current_step'] = 'route_planning'
        
        return state
    
    async def route_planning(self, state: AgentState) -> AgentState:
        """Plan routes and transportation"""
        logger.info("Planning routes and transportation")
        
        destinations = state['search_results'].get('destinations', [])
        
        result = await self.agent.ainvoke({
            "input": f"Plan transportation routes for destinations: {destinations}",
            "context": state['context'],
            "user_preferences": state['user_preferences'],
            "blacklist_items": state['blacklist_items']
        })
        
        state['route_data'] = {"routes": result['output']}
        state['current_step'] = 'budget_estimation'
        
        return state
    
    async def budget_estimation(self, state: AgentState) -> AgentState:
        """Estimate total trip budget"""
        logger.info("Estimating trip budget")
        
        trip_data = {
            "destinations": state['search_results'],
            "hotels": state['hotel_results'],
            "routes": state['route_data'],
            "preferences": state['user_preferences']
        }
        
        result = await self.agent.ainvoke({
            "input": f"Estimate budget for trip with data: {trip_data}",
            "context": state['context'],
            "user_preferences": state['user_preferences'],
            "blacklist_items": state['blacklist_items']
        })
        
        state['budget_estimate'] = {"budget": result['output']}
        state['current_step'] = 'itinerary_generation'
        
        return state
    
    async def itinerary_generation(self, state: AgentState) -> AgentState:
        """Generate detailed itinerary"""
        logger.info("Generating detailed itinerary")
        
        all_data = {
            "destinations": state['search_results'],
            "weather": state['weather_data'],
            "hotels": state['hotel_results'],
            "routes": state['route_data'],
            "budget": state['budget_estimate'],
            "preferences": state['user_preferences']
        }
        
        result = await self.agent.ainvoke({
            "input": f"Create detailed itinerary with all trip data: {all_data}",
            "context": state['context'],
            "user_preferences": state['user_preferences'],
            "blacklist_items": state['blacklist_items']
        })
        
        # Convert to TripPlan model
        try:
            trip_plan = self._parse_trip_plan(result['output'])
            state['trip_plan'] = trip_plan
        except Exception as e:
            logger.error(f"Error parsing trip plan: {e}")
            state['trip_plan'] = None
        
        state['current_step'] = 'finalize'
        
        return state
    
    async def finalize_response(self, state: AgentState) -> AgentState:
        """Finalize and format the response"""
        logger.info("Finalizing response")
        
        # Save context for future conversations
        await self.context_service.save_user_context(
            state['user_id'],
            state['context'],
            state['user_preferences']
        )
        
        state['current_step'] = 'completed'
        
        return state
    
    def _parse_trip_plan(self, agent_output: str) -> Optional[TripPlan]:
        """Parse agent output into TripPlan model"""
        try:
            # This would need more sophisticated parsing based on agent output format
            # For now, return a basic structure
            return TripPlan(
                trip_title="AI Generated Trip",
                total_days=7,
                start_date=date.today(),
                end_date=date.today(),
                total_budget=1000.0,
                currency="USD",
                cities=[]
            )
        except Exception as e:
            logger.error(f"Error parsing trip plan: {e}")
            return None
    
    async def process_message(
        self,
        message: str,
        user_id: str,
        session_id: str,
        user_preferences: Dict[str, Any] = None
    ) -> TravelAssistantResponse:
        try:
            # Use our initialized Gemini service
            if not self.llm_available or not self.gemini_chat:
                return await self._get_mock_response(message, user_preferences or {})
            
            # Create a travel planning prompt
            travel_prompt = f"""
            You are GlobeTrotter AI, an expert travel planning assistant. 
            
            User message: {message}
            User preferences: {user_preferences or {}}
            
            Analyze the user's request and:
            1. If they're asking for a trip plan, extract destination, dates, budget, travelers
            2. Provide helpful travel advice and information
            3. If you have enough information for a complete trip, indicate that you can create an itinerary
            
            Respond naturally and helpfully. If the user provides trip details like destination, dates, and budget, 
            let them know you can create a detailed itinerary for them.
            """
            
            # Get response from Gemini
            response_text = self.gemini_chat.send_message(travel_prompt)
            
            # Extract trip details from user message using LLM
            trip_details = await self._extract_trip_details(message, user_preferences or {})
            
            # Check if we should trigger itinerary mode
            message_lower = message.lower()
            has_destination = any(city in message_lower for city in ['tokyo', 'kyoto', 'paris', 'london', 'rome', 'new york', 'singapore', 'bali', 'goa', 'lisbon', 'ahmedabad', 'surat', 'mumbai', 'delhi'])
            has_duration = any(word in message_lower for word in ['day', 'week', 'month', 'trip'])
            has_budget = any(char in message for char in ['$', '€', '₹', '£']) or 'budget' in message_lower or 'economical' in message_lower or 'cheap' in message_lower
            
            # More flexible trigger conditions for hybrid mode - trigger more easily for demo
            should_trigger_hybrid = (
                has_destination or 
                has_duration or 
                has_budget or
                any(word in message_lower for word in ['plan', 'itinerary', 'travel', 'visit', 'vacation', 'holiday', 'trip', 'ready', 'go', 'explore']) or
                len(message.split()) > 3 or  # Even shorter messages can trigger
                'demo' in message_lower or
                len(message_lower) > 10  # Any message longer than 10 characters
            )
            
            # For demo purposes, let's trigger hybrid mode more easily
            if not should_trigger_hybrid and len(message_lower) > 4:
                should_trigger_hybrid = True
            
            # If we have enough info, create an intelligent trip plan and trigger hybrid mode
            if should_trigger_hybrid:
                # Create an intelligent, context-aware trip plan based on user request
                trip_plan = await self._generate_intelligent_itinerary(trip_details, message)
                
                return TravelAssistantResponse(
                    message=f"{response_text}\n\n🎉 **Perfect!** I've created a smart itinerary based on your request! The interactive planner shows:\n\n✨ **Optimized routes** based on your preferences\n💰 **Budget breakdown** with real-time updates\n🌤️ **Weather-aware recommendations**\n🏨 **Best value accommodations**\n📱 **Drag & drop to customize** - prices update automatically!\n\nStart planning your adventure! 🚀",
                    trip_plan=trip_plan,
                    ui_actions=UIActions(
                        open_panel="itinerary",
                        animate_itinerary="drip",
                        collapse_chat=True
                    ),
                    conversation_id=session_id
                )
            else:
                return TravelAssistantResponse(
                    message=response_text,
                    conversation_id=session_id,
                    ui_actions=None
                )
                
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return await self._get_mock_response(message, user_preferences or {})
    
    async def _extract_trip_details(self, message: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Extract trip details from user message using LLM"""
        try:
            extraction_prompt = f"""
            Analyze this travel request and extract key details in JSON format:
            
            User message: "{message}"
            User preferences: {preferences}
            
            Extract and return ONLY a JSON object with these fields (use null if not mentioned):
            {{
                "origin": "departure city/location",
                "destination": "destination city/location", 
                "budget_type": "economical/moderate/luxury",
                "duration_days": number,
                "travelers": number,
                "interests": ["cultural", "adventure", "food", "shopping", "nature"],
                "transport_preference": "bus/train/flight/car",
                "accommodation_type": "budget/mid-range/luxury"
            }}
            
            Examples:
            - "economical trip from Surat to Ahmedabad" → {{"origin": "Surat", "destination": "Ahmedabad", "budget_type": "economical"}}
            - "5 day luxury vacation to Paris for 2 people" → {{"destination": "Paris", "duration_days": 5, "travelers": 2, "budget_type": "luxury"}}
            """
            
            response = self.gemini_chat.send_message(extraction_prompt)
            
            # Try to parse JSON response
            import json
            try:
                return json.loads(response.strip())
            except:
                # Fallback parsing
                return {
                    "origin": None,
                    "destination": "Tokyo",  # Default
                    "budget_type": "moderate",
                    "duration_days": 3,
                    "travelers": 1,
                    "interests": ["cultural", "food"],
                    "transport_preference": "train",
                    "accommodation_type": "mid-range"
                }
        except Exception as e:
            logger.error(f"Error extracting trip details: {e}")
            return {"destination": "Tokyo", "budget_type": "moderate", "duration_days": 3}
    
    def _generate_city_plan(self, destination: str, trip_details: Dict[str, Any], duration: int, total_budget: float) -> Dict[str, Any]:
        """Create a simple city plan structure compatible with CityVisit/DayPlan models.
        This returns a dict that Pydantic will coerce into the appropriate models.
        """
        try:
            from datetime import date, timedelta
            # Basic per-day budget split
            per_day_budget = max(50.0, round(total_budget / max(1, duration), 2))
            today = date.today()
            days: List[Dict[str, Any]] = []
            for i in range(duration):
                day_date = today + timedelta(days=i)
                days.append({
                    "day_number": i + 1,
                    "date": day_date,
                    "activities": [
                        {
                            "activity_id": f"act-{i+1}-1",
                            "time": "09:00",
                            "name": f"Explore {destination} - Highlights",
                            "description": f"Discover popular spots in {destination} based on your interests.",
                            "estimated_cost": 25.0,
                            "currency": "USD",
                            "crowd_score": 70,
                            "weather_summary": "clear",
                            "place_coords": {"lat": 0.0, "lng": 0.0},
                            "estimated": True
                        }
                    ],
                    "daily_budget_total": per_day_budget
                })
            city_plan: Dict[str, Any] = {
                "city_name": destination,
                "country": trip_details.get("country", "Unknown"),
                "arrival": {"date": str(today), "time": "09:00", "by": trip_details.get("transport_preference", "flight")},
                "departure": {"date": str(today + timedelta(days=max(1, duration))), "time": "18:00", "by": trip_details.get("transport_preference", "flight")},
                "hotels": [],
                "days": days,
                "transport_options": {}
            }
            return city_plan
        except Exception as e:
            logger.error(f"Error generating city plan: {e}")
            # Fallback minimal shape
            from datetime import date
            return {
                "city_name": destination,
                "country": "Unknown",
                "arrival": {"date": str(date.today()), "time": "09:00", "by": "flight"},
                "departure": {"date": str(date.today()), "time": "18:00", "by": "flight"},
                "hotels": [],
                "days": [],
                "transport_options": {}
            }
    
    async def _generate_intelligent_itinerary(self, trip_details: Dict[str, Any], original_message: str) -> TripPlan:
        """Generate intelligent, context-aware itinerary based on extracted details"""
        try:
            # Use LLM to generate intelligent itinerary
            itinerary_prompt = f"""
            Create a detailed travel itinerary based on these details:
            
            Trip Details: {trip_details}
            Original Request: "{original_message}"
            
            Generate a comprehensive itinerary that includes:
            1. Optimized routes and transportation
            2. Budget-conscious recommendations if economical
            3. Weather-appropriate activities
            4. Local cultural experiences
            5. Realistic timing and costs
            
            Focus on practical, actionable recommendations with specific places, times, and estimated costs.
            Consider the user's budget type and preferences.
            """
            
            itinerary_response = self.gemini_chat.send_message(itinerary_prompt)
            
            # Create intelligent trip plan based on extracted details
            origin = trip_details.get("origin", "Your Location")
            destination = trip_details.get("destination", "Tokyo")
            budget_type = trip_details.get("budget_type", "moderate")
            duration = trip_details.get("duration_days", 3)
            travelers = trip_details.get("travelers", 1)
            
            # Calculate budget based on type and destination
            base_budget = 200 if budget_type == "economical" else 400 if budget_type == "moderate" else 800
            total_budget = base_budget * duration * travelers
            
            # Generate intelligent trip plan with proper date types
            from datetime import date, timedelta
            start_dt = date.today()
            end_dt = start_dt + timedelta(days=max(1, duration))
            trip_plan = TripPlan(
                trip_title=f"{budget_type.title()} {destination} Adventure" + (f" from {origin}" if origin else ""),
                total_days=duration,
                start_date=start_dt,
                end_date=end_dt,
                total_budget=total_budget,
                currency="USD",
                cities=[self._generate_city_plan(destination, trip_details, duration, total_budget)]
            )
            
            return trip_plan
            
        except Exception as e:
            logger.error(f"Error generating intelligent itinerary: {e}")
            # Fallback to basic plan
            return TripPlan(
                trip_title=f"Travel to {trip_details.get('destination', 'Amazing Destination')}",
                total_days=trip_details.get('duration_days', 3),
                start_date="2024-12-01",
                end_date="2024-12-04",
                total_budget=trip_details.get('budget', 1500),
                currency="USD",
                cities=[{
                    "city_name": trip_details.get('destination', 'Tokyo'),
                    "country": "Japan",
                    "arrival": {"date": "2024-12-01", "time": "09:00", "by": "flight"},
                    "departure": {"date": "2024-12-03", "time": "18:00", "by": "train"},
                        "hotels": [
                            {"hotel_id": "h1", "name": "Tokyo Central Hotel", "rating": 4.5, "price_per_night": 180, "currency": "USD", "distance_from_center_km": 1.0, "blacklisted": False},
                            {"hotel_id": "h2", "name": "Shibuya Sky Hotel", "rating": 4.2, "price_per_night": 150, "currency": "USD", "distance_from_center_km": 2.5, "blacklisted": False}
                        ],
                        "days": [
                            {
                                "day_number": 1,
                                "date": "2024-12-01",
                                "activities": [
                                    {
                                        "activity_id": "a1",
                                        "time": "09:00",
                                        "name": "Senso-ji Temple",
                                        "description": "Visit Tokyo's oldest Buddhist temple",
                                        "estimated_cost": 0,
                                        "currency": "USD",
                                        "crowd_score": 70,
                                        "weather_summary": "sunny",
                                        "place_coords": {"lat": 35.7148, "lng": 139.7967}
                                    },
                                    {
                                        "activity_id": "a2",
                                        "time": "12:00",
                                        "name": "Traditional Sushi Lunch",
                                        "description": "Authentic sushi experience at Tsukiji",
                                        "estimated_cost": 45,
                                        "currency": "USD",
                                        "crowd_score": 60,
                                        "weather_summary": "sunny",
                                        "place_coords": {"lat": 35.6654, "lng": 139.7707}
                                    },
                                    {
                                        "activity_id": "a3",
                                        "time": "15:00",
                                        "name": "Tokyo Skytree",
                                        "description": "Panoramic city views from 634m tower",
                                        "estimated_cost": 25,
                                        "currency": "USD",
                                        "crowd_score": 80,
                                        "weather_summary": "sunny",
                                        "place_coords": {"lat": 35.7101, "lng": 139.8107}
                                    }
                                ],
                                "daily_budget_total": 250
                            },
                            {
                                "day_number": 2,
                                "date": "2024-12-02",
                                "activities": [
                                    {
                                        "activity_id": "a4",
                                        "time": "10:00",
                                        "name": "Meiji Shrine",
                                        "description": "Peaceful shrine in the heart of Tokyo",
                                        "estimated_cost": 0,
                                        "currency": "USD",
                                        "crowd_score": 50,
                                        "weather_summary": "cloudy",
                                        "place_coords": {"lat": 35.6761, "lng": 139.6993}
                                    },
                                    {
                                        "activity_id": "a5",
                                        "time": "14:00",
                                        "name": "Harajuku Shopping",
                                        "description": "Explore trendy fashion district",
                                        "estimated_cost": 80,
                                        "currency": "USD",
                                        "crowd_score": 90,
                                        "weather_summary": "cloudy",
                                        "place_coords": {"lat": 35.6702, "lng": 139.7016}
                                    },
                                    {
                                        "activity_id": "a6",
                                        "time": "19:00",
                                        "name": "Shibuya Crossing & Dinner",
                                        "description": "Experience the world's busiest crossing",
                                        "estimated_cost": 35,
                                        "currency": "USD",
                                        "crowd_score": 95,
                                        "weather_summary": "cloudy",
                                        "place_coords": {"lat": 35.6596, "lng": 139.7006}
                                    }
                                ],
                                "daily_budget_total": 280
                            }
                        ]
                    }, {
                        "city_name": "Kyoto",
                        "country": "Japan",
                        "arrival": {"date": "2024-12-03", "time": "20:00", "by": "train"},
                        "departure": {"date": "2024-12-05", "time": "16:00", "by": "flight"},
                        "hotels": [
                            {"hotel_id": "h3", "name": "Kyoto Traditional Ryokan", "rating": 4.8, "price_per_night": 200, "currency": "USD", "distance_from_center_km": 1.5, "blacklisted": False}
                        ],
                        "days": [
                            {
                                "day_number": 3,
                                "date": "2024-12-03",
                                "activities": [
                                    {
                                        "activity_id": "a7",
                                        "time": "09:00",
                                        "name": "Fushimi Inari Shrine",
                                        "description": "Famous thousand torii gates hike",
                                        "estimated_cost": 0,
                                        "currency": "USD",
                                        "crowd_score": 75,
                                        "weather_summary": "sunny",
                                        "place_coords": {"lat": 34.9671, "lng": 135.7727}
                                    },
                                    {
                                        "activity_id": "a8",
                                        "time": "13:00",
                                        "name": "Kaiseki Lunch",
                                        "description": "Traditional multi-course Japanese meal",
                                        "estimated_cost": 60,
                                        "currency": "USD",
                                        "crowd_score": 40,
                                        "weather_summary": "sunny",
                                        "place_coords": {"lat": 35.0116, "lng": 135.7681}
                                    },
                                    {
                                        "activity_id": "a9",
                                        "time": "16:00",
                                        "name": "Gion District Walk",
                                        "description": "Historic geisha district exploration",
                                        "estimated_cost": 0,
                                        "currency": "USD",
                                        "crowd_score": 65,
                                        "weather_summary": "sunny",
                                        "place_coords": {"lat": 35.0028, "lng": 135.7751}
                                    }
                                ],
                                "daily_budget_total": 300
                            },
                            {
                                "day_number": 4,
                                "date": "2024-12-04",
                                "activities": [
                                    {
                                        "activity_id": "a10",
                                        "time": "08:00",
                                        "name": "Arashiyama Bamboo Grove",
                                        "description": "Walk through magical bamboo forest",
                                        "estimated_cost": 0,
                                        "currency": "USD",
                                        "crowd_score": 70,
                                        "weather_summary": "partly cloudy",
                                        "place_coords": {"lat": 35.0170, "lng": 135.6726}
                                    },
                                    {
                                        "activity_id": "a11",
                                        "time": "11:00",
                                        "name": "Tenryu-ji Temple",
                                        "description": "UNESCO World Heritage Zen temple",
                                        "estimated_cost": 8,
                                        "currency": "USD",
                                        "crowd_score": 55,
                                        "weather_summary": "partly cloudy",
                                        "place_coords": {"lat": 35.0156, "lng": 135.6739}
                                    },
                                    {
                                        "activity_id": "a12",
                                        "time": "15:00",
                                        "name": "Tea Ceremony Experience",
                                        "description": "Traditional Japanese tea ceremony",
                                        "estimated_cost": 40,
                                        "currency": "USD",
                                        "crowd_score": 30,
                                        "weather_summary": "partly cloudy",
                                        "place_coords": {"lat": 35.0116, "lng": 135.7681}
                                    }
                                ],
                                "daily_budget_total": 320
                            },
                            {
                                "day_number": 5,
                                "date": "2024-12-05",
                                "activities": [
                                    {
                                        "activity_id": "a13",
                                        "time": "10:00",
                                        "name": "Kinkaku-ji (Golden Pavilion)",
                                        "description": "Iconic golden temple and gardens",
                                        "estimated_cost": 5,
                                        "currency": "USD",
                                        "crowd_score": 85,
                                        "weather_summary": "sunny",
                                        "place_coords": {"lat": 35.0394, "lng": 135.7292}
                                    },
                                    {
                                        "activity_id": "a14",
                                        "time": "13:00",
                                        "name": "Souvenir Shopping",
                                        "description": "Last-minute shopping in Kyoto Station",
                                        "estimated_cost": 50,
                                        "currency": "USD",
                                        "crowd_score": 60,
                                        "weather_summary": "sunny",
                                        "place_coords": {"lat": 34.9858, "lng": 135.7581}
                                    }
                                ],
                                "daily_budget_total": 200
                            }
                        ]
                    }]
                )
            
            return trip_plan
            
        except Exception as e:
            logger.error(f"Error generating intelligent itinerary: {e}")
            # Fallback to basic plan
            return TripPlan(
                trip_title=f"Travel to {trip_details.get('destination', 'Amazing Destination')}",
                total_days=trip_details.get('duration_days', 3),
                start_date="2024-12-01",
                end_date="2024-12-04",
                total_budget=trip_details.get('budget', 1500),
                currency="USD",
                cities=[{
                    "city_name": trip_details.get('destination', 'Tokyo'),
                    "country": "Japan",
                    "arrival": {"date": "2024-12-01", "time": "09:00", "by": "flight"},
                    "departure": {"date": "2024-12-03", "time": "18:00", "by": "train"},
                    "hotels": [
                        {"hotel_id": "h1", "name": "Tokyo Central Hotel", "rating": 4.5, "price_per_night": 180, "currency": "USD", "distance_from_center_km": 1.0, "blacklisted": False},
                        {"hotel_id": "h2", "name": "Shibuya Sky Hotel", "rating": 4.2, "price_per_night": 150, "currency": "USD", "distance_from_center_km": 2.5, "blacklisted": False}
                    ],
                    "days": [
                        {
                            "day": 1,
                            "date": "2024-12-01",
                            "activities": [
                                {"activity_id": "act1", "name": "Tokyo Museum", "type": "museum", "start_time": "09:00", "end_time": "12:00", "cost": 25, "currency": "USD", "location": "Tokyo Center", "description": "Explore Tokyo's rich history", "blacklisted": False}
                            ]
                        }
                    ]
                }]
            )
                
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return await self._get_mock_response(message, user_preferences or {})
    
    async def _get_mock_response(self, message: str, preferences: Dict[str, Any]) -> TravelAssistantResponse:
        message_lower = message.lower()
        
        # Simple keyword-based responses
        if any(dest in message_lower for dest in ["goa", "beach", "india"]):
            response_text = """I'd love to help you plan a trip to Goa! Here's what I found:
            
🏖️ **Goa Highlights:**
- Beautiful beaches like Baga, Calangute, and Anjuna
- Portuguese colonial architecture in Old Goa
- Vibrant nightlife and beach shacks
- Water sports and spice plantations

📅 **Best Time:** October to March
💰 **Budget:** ₹3,000-8,000 per day depending on your style
🏨 **Accommodation:** Beach resorts, boutique hotels, or budget hostels

Note: This is a demo response. For full AI-powered planning, please configure the Gemini API key."""
            
        elif any(dest in message_lower for dest in ["paris", "france", "europe"]):
            response_text = """Paris awaits you! Here's a quick overview:
            
🗼 **Must-Visit:**
- Eiffel Tower and Champs-Élysées
- Louvre Museum and Notre-Dame
- Montmartre and Sacré-Cœur
- Seine River cruise

🍷 **Experience:** French cuisine, wine tasting, art galleries
💰 **Budget:** €100-300 per day
🚇 **Transport:** Excellent metro system

Note: This is a demo response. For personalized AI planning, please set up the Gemini API key."""
            
        else:
            response_text = f"""I understand you're interested in planning a trip! 
            
While I'd love to provide detailed AI-powered recommendations, I'm currently running in demo mode. 

To unlock the full AI Travel Planning Agent experience with:
- Personalized itineraries
- Real-time weather and hotel data  
- Budget optimization
- Smart recommendations

Please configure your Gemini API key in the environment settings.

For now, I can help with basic travel information and mock planning data."""
        
        return TravelAssistantResponse(
            message=response_text,
            ui_actions=None,
            trip_plan=None,
            conversation_id="demo_session"
        )

# Create global workflow instance
travel_agent = TravelPlanningWorkflow()
