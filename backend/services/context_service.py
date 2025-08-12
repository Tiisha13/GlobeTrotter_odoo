"""
Context service for managing user preferences and conversation context persistence.
Integrates with MongoDB and Redis for storage and caching.
"""

from typing import Dict, Any, Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis
import json
import logging
from datetime import datetime, timedelta
from pydantic import BaseModel

from ..config import settings

logger = logging.getLogger(__name__)

class UserPreferences(BaseModel):
    """User travel preferences model"""
    budget_range: Optional[Dict[str, float]] = None  # min, max
    preferred_accommodation_type: Optional[str] = None  # hotel, hostel, apartment
    travel_style: Optional[str] = None  # luxury, budget, adventure, cultural
    dietary_restrictions: List[str] = []
    accessibility_needs: List[str] = []
    preferred_activities: List[str] = []
    avoided_activities: List[str] = []
    preferred_climate: Optional[str] = None  # tropical, temperate, cold
    group_size: Optional[int] = None
    age_group: Optional[str] = None  # young_adult, family, senior
    language_preferences: List[str] = []

class ConversationContext(BaseModel):
    """Conversation context model"""
    user_id: str
    session_id: str
    current_trip_planning: Optional[Dict[str, Any]] = None
    previous_destinations: List[str] = []
    conversation_history: List[Dict[str, Any]] = []
    last_activity: datetime
    preferences: UserPreferences = UserPreferences()

class ContextService:
    """Service for managing user context and preferences"""
    
    def __init__(self):
        self.mongo_client = AsyncIOMotorClient(settings.MONGO_URI)
        self.db = self.mongo_client[settings.MONGO_DB_NAME]
        self.context_collection = self.db.user_contexts
        self.preferences_collection = self.db.user_preferences
        
        # Redis for caching active sessions
        self.redis_client = None

    async def init(self):
        """Public initializer to set up async resources (e.g., Redis)."""
        await self._init_redis()
    
    async def _init_redis(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.from_url(settings.REDIS_URL)
            await self.redis_client.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Will use MongoDB only.")
            self.redis_client = None
    
    async def get_user_context(self, user_id: str, session_id: str = None) -> Dict[str, Any]:
        """Get user context from cache or database"""
        try:
            # Try Redis cache first
            if self.redis_client and session_id:
                cache_key = f"context:{user_id}:{session_id}"
                cached_context = await self.redis_client.get(cache_key)
                if cached_context:
                    return json.loads(cached_context)
            
            # Fallback to MongoDB
            context_doc = await self.context_collection.find_one({"user_id": user_id})
            if context_doc:
                # Remove MongoDB ObjectId for JSON serialization
                context_doc.pop("_id", None)
                return context_doc
            
            # Return default context if none found
            default_context = {
                "user_id": user_id,
                "session_id": session_id or f"session_{datetime.utcnow().timestamp()}",
                "current_trip_planning": None,
                "previous_destinations": [],
                "conversation_history": [],
                "last_activity": datetime.utcnow(),
                "preferences": {}
            }
            
            return default_context
            
        except Exception as e:
            logger.error(f"Error getting user context: {e}")
            return {"user_id": user_id, "preferences": {}}
    
    async def save_user_context(
        self,
        user_id: str,
        context: Dict[str, Any],
        preferences: Dict[str, Any] = None,
        session_id: str = None
    ) -> bool:
        """Save user context to database and cache"""
        try:
            context["last_activity"] = datetime.utcnow()
            
            # Save to MongoDB
            await self.context_collection.update_one(
                {"user_id": user_id},
                {"$set": context},
                upsert=True
            )
            
            # Save preferences separately if provided
            if preferences:
                await self.save_user_preferences(user_id, preferences)
            
            # Cache in Redis if available
            if self.redis_client and session_id:
                cache_key = f"context:{user_id}:{session_id}"
                await self.redis_client.setex(
                    cache_key,
                    timedelta(hours=24),  # Cache for 24 hours
                    json.dumps(context, default=str)
                )
            
            logger.info(f"Saved context for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving user context: {e}")
            return False
    
    async def get_user_preferences(self, user_id: str) -> UserPreferences:
        """Get user travel preferences"""
        try:
            prefs_doc = await self.preferences_collection.find_one({"user_id": user_id})
            
            if prefs_doc:
                prefs_doc.pop("_id", None)
                prefs_doc.pop("user_id", None)
                return UserPreferences(**prefs_doc)
            
            return UserPreferences()
            
        except Exception as e:
            logger.error(f"Error getting user preferences: {e}")
            return UserPreferences()
    
    async def save_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> bool:
        """Save user travel preferences"""
        try:
            preferences["user_id"] = user_id
            preferences["updated_at"] = datetime.utcnow()
            
            await self.preferences_collection.update_one(
                {"user_id": user_id},
                {"$set": preferences},
                upsert=True
            )
            
            logger.info(f"Saved preferences for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving user preferences: {e}")
            return False
    
    async def update_conversation_history(
        self,
        user_id: str,
        session_id: str,
        message: str,
        response: str,
        trip_data: Dict[str, Any] = None
    ) -> bool:
        """Update conversation history"""
        try:
            conversation_entry = {
                "timestamp": datetime.utcnow(),
                "user_message": message,
                "ai_response": response,
                "trip_data": trip_data
            }
            
            # Update in MongoDB
            await self.context_collection.update_one(
                {"user_id": user_id},
                {
                    "$push": {
                        "conversation_history": {
                            "$each": [conversation_entry],
                            "$slice": -50  # Keep only last 50 conversations
                        }
                    },
                    "$set": {"last_activity": datetime.utcnow()}
                },
                upsert=True
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating conversation history: {e}")
            return False
    
    async def get_conversation_history(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent conversation history"""
        try:
            context_doc = await self.context_collection.find_one({"user_id": user_id})
            
            if context_doc and "conversation_history" in context_doc:
                history = context_doc["conversation_history"]
                return history[-limit:] if len(history) > limit else history
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []
    
    async def update_current_trip_planning(
        self,
        user_id: str,
        trip_data: Dict[str, Any]
    ) -> bool:
        """Update current trip planning data"""
        try:
            await self.context_collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "current_trip_planning": trip_data,
                        "last_activity": datetime.utcnow()
                    }
                },
                upsert=True
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error updating trip planning: {e}")
            return False
    
    async def add_to_previous_destinations(self, user_id: str, destination: str) -> bool:
        """Add destination to user's travel history"""
        try:
            await self.context_collection.update_one(
                {"user_id": user_id},
                {
                    "$addToSet": {"previous_destinations": destination.lower().strip()},
                    "$set": {"last_activity": datetime.utcnow()}
                },
                upsert=True
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error adding destination to history: {e}")
            return False
    
    async def get_personalized_recommendations(self, user_id: str) -> Dict[str, Any]:
        """Get personalized recommendations based on user history and preferences"""
        try:
            context = await self.get_user_context(user_id)
            preferences = await self.get_user_preferences(user_id)
            
            recommendations = {
                "suggested_destinations": [],
                "recommended_activities": [],
                "budget_tips": [],
                "seasonal_recommendations": []
            }
            
            # Analyze previous destinations
            previous_destinations = context.get("previous_destinations", [])
            if previous_destinations:
                # Suggest similar destinations (this would use ML in production)
                recommendations["suggested_destinations"] = self._get_similar_destinations(previous_destinations)
            
            # Analyze preferences
            if preferences.preferred_activities:
                recommendations["recommended_activities"] = preferences.preferred_activities
            
            # Budget recommendations
            if preferences.budget_range:
                recommendations["budget_tips"] = self._get_budget_tips(preferences.budget_range)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting personalized recommendations: {e}")
            return {}
    
    def _get_similar_destinations(self, previous_destinations: List[str]) -> List[str]:
        """Get similar destinations based on travel history"""
        # This is a simplified version - in production, this would use ML/AI
        destination_similarities = {
            "paris": ["london", "rome", "barcelona"],
            "tokyo": ["seoul", "singapore", "hong_kong"],
            "new_york": ["chicago", "san_francisco", "toronto"],
            "bali": ["thailand", "philippines", "vietnam"],
            "dubai": ["qatar", "singapore", "hong_kong"]
        }
        
        suggestions = []
        for dest in previous_destinations:
            if dest in destination_similarities:
                suggestions.extend(destination_similarities[dest])
        
        return list(set(suggestions))[:5]  # Return top 5 unique suggestions
    
    def _get_budget_tips(self, budget_range: Dict[str, float]) -> List[str]:
        """Get budget tips based on user's budget range"""
        tips = []
        max_budget = budget_range.get("max", 1000)
        
        if max_budget < 500:
            tips.extend([
                "Consider hostels or budget accommodations",
                "Look for free walking tours and activities",
                "Use public transportation",
                "Cook some meals yourself"
            ])
        elif max_budget < 1500:
            tips.extend([
                "Mix of mid-range and budget accommodations",
                "Book flights in advance for better deals",
                "Consider shoulder season travel"
            ])
        else:
            tips.extend([
                "Consider luxury experiences",
                "Private tours and premium accommodations available",
                "First-class transportation options"
            ])
        
        return tips
    
    async def cleanup_old_sessions(self, days_old: int = 30) -> int:
        """Clean up old session data"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            # Remove old contexts
            result = await self.context_collection.delete_many({
                "last_activity": {"$lt": cutoff_date}
            })
            
            # Clean up Redis cache
            if self.redis_client:
                # This would require scanning keys, which is expensive
                # In production, use Redis expiration instead
                pass
            
            logger.info(f"Cleaned up {result.deleted_count} old contexts")
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old sessions: {e}")
            return 0
    
    async def close_connections(self):
        """Close database connections"""
        if self.mongo_client:
            self.mongo_client.close()
        
        if self.redis_client:
            await self.redis_client.close()
