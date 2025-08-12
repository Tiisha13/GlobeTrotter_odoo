"""
Blacklist service for managing admin and user-specific blacklisted hotels, cities, and activities.
Integrates with MongoDB for persistent storage.
"""

from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import logging
from datetime import datetime
from enum import Enum

from ..config import settings

logger = logging.getLogger(__name__)

class BlacklistType(str, Enum):
    HOTEL = "hotel"
    CITY = "city"
    ACTIVITY = "activity"
    RESTAURANT = "restaurant"

class BlacklistService:
    """Service for managing blacklisted items"""
    
    def __init__(self):
        self.client = AsyncIOMotorClient(settings.MONGO_URI)
        self.db = self.client[settings.MONGO_DB_NAME]
        self.collection = self.db.blacklist
        self.admin_collection = self.db.admin_blacklist
    
    async def add_to_blacklist(
        self,
        user_id: str,
        item_name: str,
        item_type: BlacklistType,
        item_id: Optional[str] = None,
        reason: Optional[str] = None,
        is_admin: bool = False
    ) -> bool:
        """Add an item to user or admin blacklist"""
        try:
            blacklist_entry = {
                "user_id": user_id if not is_admin else "admin",
                "item_name": item_name.lower().strip(),
                "item_type": item_type.value,
                "item_id": item_id,
                "reason": reason,
                "created_at": datetime.utcnow(),
                "is_admin": is_admin
            }
            
            collection = self.admin_collection if is_admin else self.collection
            
            # Check if already blacklisted
            existing = await collection.find_one({
                "user_id": blacklist_entry["user_id"],
                "item_name": blacklist_entry["item_name"],
                "item_type": item_type.value
            })
            
            if existing:
                logger.info(f"Item {item_name} already blacklisted for user {user_id}")
                return False
            
            await collection.insert_one(blacklist_entry)
            logger.info(f"Added {item_name} to blacklist for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding to blacklist: {e}")
            return False
    
    async def remove_from_blacklist(
        self,
        user_id: str,
        item_name: str,
        item_type: BlacklistType,
        is_admin: bool = False
    ) -> bool:
        """Remove an item from blacklist"""
        try:
            collection = self.admin_collection if is_admin else self.collection
            
            result = await collection.delete_one({
                "user_id": user_id if not is_admin else "admin",
                "item_name": item_name.lower().strip(),
                "item_type": item_type.value
            })
            
            if result.deleted_count > 0:
                logger.info(f"Removed {item_name} from blacklist for user {user_id}")
                return True
            else:
                logger.info(f"Item {item_name} not found in blacklist for user {user_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error removing from blacklist: {e}")
            return False
    
    async def get_user_blacklist(self, user_id: str) -> List[str]:
        """Get all blacklisted items for a user (including admin blacklist)"""
        try:
            blacklisted_items = []
            
            # Get user-specific blacklist
            user_cursor = self.collection.find({"user_id": user_id})
            async for item in user_cursor:
                blacklisted_items.append(item["item_name"])
            
            # Get admin blacklist (applies to all users)
            admin_cursor = self.admin_collection.find({"user_id": "admin"})
            async for item in admin_cursor:
                blacklisted_items.append(item["item_name"])
            
            return list(set(blacklisted_items))  # Remove duplicates
            
        except Exception as e:
            logger.error(f"Error getting user blacklist: {e}")
            return []
    
    async def get_blacklist_by_type(self, user_id: str, item_type: BlacklistType) -> List[Dict[str, Any]]:
        """Get blacklisted items of specific type for a user"""
        try:
            blacklisted_items = []
            
            # Get user-specific blacklist
            user_cursor = self.collection.find({
                "user_id": user_id,
                "item_type": item_type.value
            })
            async for item in user_cursor:
                blacklisted_items.append({
                    "name": item["item_name"],
                    "type": item["item_type"],
                    "reason": item.get("reason"),
                    "created_at": item["created_at"],
                    "is_admin": False
                })
            
            # Get admin blacklist
            admin_cursor = self.admin_collection.find({
                "user_id": "admin",
                "item_type": item_type.value
            })
            async for item in admin_cursor:
                blacklisted_items.append({
                    "name": item["item_name"],
                    "type": item["item_type"],
                    "reason": item.get("reason"),
                    "created_at": item["created_at"],
                    "is_admin": True
                })
            
            return blacklisted_items
            
        except Exception as e:
            logger.error(f"Error getting blacklist by type: {e}")
            return []
    
    async def is_blacklisted(self, user_id: str, item_name: str, item_type: BlacklistType = None) -> bool:
        """Check if an item is blacklisted for a user"""
        try:
            item_name_lower = item_name.lower().strip()
            
            # Check user blacklist
            query = {"user_id": user_id, "item_name": item_name_lower}
            if item_type:
                query["item_type"] = item_type.value
            
            user_blacklisted = await self.collection.find_one(query)
            if user_blacklisted:
                return True
            
            # Check admin blacklist
            admin_query = {"user_id": "admin", "item_name": item_name_lower}
            if item_type:
                admin_query["item_type"] = item_type.value
            
            admin_blacklisted = await self.admin_collection.find_one(admin_query)
            return admin_blacklisted is not None
            
        except Exception as e:
            logger.error(f"Error checking blacklist status: {e}")
            return False
    
    async def filter_hotels(self, hotels: List[Dict[str, Any]], user_id: str) -> List[Dict[str, Any]]:
        """Filter out blacklisted hotels from search results"""
        try:
            if not hotels:
                return []
            
            filtered_hotels = []
            blacklisted_hotels = await self.get_blacklist_by_type(user_id, BlacklistType.HOTEL)
            blacklisted_names = {item["name"] for item in blacklisted_hotels}
            
            for hotel in hotels:
                hotel_name = hotel.get("name", "").lower().strip()
                
                # Check if hotel is blacklisted
                is_blacklisted = hotel_name in blacklisted_names
                
                # Also check for partial matches (in case of slight name variations)
                if not is_blacklisted:
                    for blacklisted_name in blacklisted_names:
                        if blacklisted_name in hotel_name or hotel_name in blacklisted_name:
                            is_blacklisted = True
                            break
                
                if not is_blacklisted:
                    filtered_hotels.append(hotel)
                else:
                    logger.info(f"Filtered out blacklisted hotel: {hotel.get('name')}")
            
            return filtered_hotels
            
        except Exception as e:
            logger.error(f"Error filtering hotels: {e}")
            return hotels  # Return original list if filtering fails
    
    async def filter_destinations(self, destinations: List[Dict[str, Any]], user_id: str) -> List[Dict[str, Any]]:
        """Filter out blacklisted cities/destinations from search results"""
        try:
            if not destinations:
                return []
            
            filtered_destinations = []
            blacklisted_cities = await self.get_blacklist_by_type(user_id, BlacklistType.CITY)
            blacklisted_names = {item["name"] for item in blacklisted_cities}
            
            for destination in destinations:
                dest_name = destination.get("name", "").lower().strip()
                
                if dest_name not in blacklisted_names:
                    filtered_destinations.append(destination)
                else:
                    logger.info(f"Filtered out blacklisted destination: {destination.get('name')}")
            
            return filtered_destinations
            
        except Exception as e:
            logger.error(f"Error filtering destinations: {e}")
            return destinations
    
    async def get_all_blacklists(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        """Get all blacklisted items organized by type"""
        try:
            all_blacklists = {}
            
            for item_type in BlacklistType:
                all_blacklists[item_type.value] = await self.get_blacklist_by_type(user_id, item_type)
            
            return all_blacklists
            
        except Exception as e:
            logger.error(f"Error getting all blacklists: {e}")
            return {}
    
    async def bulk_add_to_blacklist(
        self,
        user_id: str,
        items: List[Dict[str, Any]],
        is_admin: bool = False
    ) -> Dict[str, int]:
        """Bulk add items to blacklist"""
        try:
            added_count = 0
            skipped_count = 0
            
            for item in items:
                success = await self.add_to_blacklist(
                    user_id=user_id,
                    item_name=item["name"],
                    item_type=BlacklistType(item["type"]),
                    item_id=item.get("id"),
                    reason=item.get("reason"),
                    is_admin=is_admin
                )
                
                if success:
                    added_count += 1
                else:
                    skipped_count += 1
            
            return {"added": added_count, "skipped": skipped_count}
            
        except Exception as e:
            logger.error(f"Error bulk adding to blacklist: {e}")
            return {"added": 0, "skipped": len(items)}
    
    async def close_connection(self):
        """Close database connection"""
        if self.client:
            self.client.close()
