from typing import List, Optional, Dict, Any
from datetime import datetime
from bson.objectid import ObjectId
from pymongo import ReturnDocument

from backend.db import get_db
from backend.models.trip_model import TripModel, TripDayModel, ActivityModel, BudgetItemModel

class TripRepository:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db.trips

    async def create_trip(self, trip_data: dict) -> Optional[dict]:
        """Create a new trip in the database"""
        trip_data["created_at"] = datetime.utcnow()
        trip_data["updated_at"] = datetime.utcnow()
        
        # Convert string IDs to ObjectId for MongoDB
        if "_id" in trip_data and not isinstance(trip_data["_id"], ObjectId):
            trip_data["_id"] = ObjectId(trip_data["_id"])
            
        result = await self.collection.insert_one(trip_data)
        if result.inserted_id:
            return await self.get_trip_by_id(str(result.inserted_id))
        return None

    async def get_trip_by_id(self, trip_id: str) -> Optional[dict]:
        """Get a trip by its ID"""
        try:
            trip = await self.collection.find_one({"_id": ObjectId(trip_id)})
            if trip:
                trip["id"] = str(trip["_id"])
                return trip
            return None
        except:
            return None

    async def update_trip(self, trip_id: str, update_data: dict) -> Optional[dict]:
        """Update a trip's information"""
        update_data["updated_at"] = datetime.utcnow()
        
        # Don't update these fields
        update_data.pop("created_at", None)
        update_data.pop("_id", None)
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(trip_id)},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER
        )
        
        if result:
            result["id"] = str(result["_id"])
            return result
        return None

    async def delete_trip(self, trip_id: str) -> bool:
        """Delete a trip by its ID"""
        result = await self.collection.delete_one({"_id": ObjectId(trip_id)})
        return result.deleted_count > 0

    async def get_user_trips(self, user_id: str, limit: int = 20, skip: int = 0) -> List[dict]:
        """Get all trips for a specific user with pagination"""
        cursor = self.collection.find({"user_id": user_id}) \
            .sort("created_at", -1) \
            .skip(skip) \
            .limit(limit)
            
        trips = []
        async for trip in cursor:
            trip["id"] = str(trip["_id"])
            trips.append(trip)
            
        return trips

    async def add_activity_to_day(
        self, 
        trip_id: str, 
        day_date: str, 
        activity_data: dict
    ) -> Optional[dict]:
        """Add an activity to a specific day in the trip"""
        activity = ActivityModel(**activity_data).dict()
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(trip_id), "itinerary.date": day_date},
            {
                "$push": {"itinerary.$.activities": activity},
                "$set": {"updated_at": datetime.utcnow()}
            },
            return_document=ReturnDocument.AFTER
        )
        
        if result:
            result["id"] = str(result["_id"])
            return result
        return None

    async def update_activity(
        self,
        trip_id: str,
        day_date: str,
        activity_id: str,
        activity_data: dict
    ) -> Optional[dict]:
        """Update an activity in a trip's day"""
        # First, find the activity's position in the array
        trip = await self.get_trip_by_id(trip_id)
        if not trip:
            return None
            
        day = next((d for d in trip.get("itinerary", []) if d["date"] == day_date), None)
        if not day:
            return None
            
        # Update the specific activity
        activity_data["updated_at"] = datetime.utcnow()
        
        # Build the update query dynamically
        update_data = {}
        for key, value in activity_data.items():
            update_data[f"itinerary.$.activities.$[activity].{key}"] = value
            
        result = await self.collection.update_one(
            {
                "_id": ObjectId(trip_id),
                "itinerary.date": day_date,
                "itinerary.activities.id": activity_id
            },
            {
                "$set": update_data,
                "$currentDate": {"updated_at": True}
            },
            array_filters=[{"activity.id": activity_id}]
        )
        
        if result.modified_count > 0:
            return await self.get_trip_by_id(trip_id)
        return None

    async def delete_activity(
        self,
        trip_id: str,
        day_date: str,
        activity_id: str
    ) -> bool:
        """Delete an activity from a trip's day"""
        result = await self.collection.update_one(
            {"_id": ObjectId(trip_id), "itinerary.date": day_date},
            {
                "$pull": {"itinerary.$.activities": {"id": activity_id}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        return result.modified_count > 0

    async def add_budget_item(self, trip_id: str, budget_data: dict) -> Optional[dict]:
        """Add a new budget item to a trip"""
        budget_item = BudgetItemModel(**budget_data).dict()
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(trip_id)},
            {
                "$push": {"budget": budget_item},
                "$set": {"updated_at": datetime.utcnow()}
            },
            return_document=ReturnDocument.AFTER
        )
        
        if result:
            result["id"] = str(result["_id"])
            return result
        return None

    async def update_budget_item(
        self,
        trip_id: str,
        item_id: str,
        update_data: dict
    ) -> Optional[dict]:
        """Update a budget item in a trip"""
        # Build the update query dynamically
        set_data = {f"budget.$.{k}": v for k, v in update_data.items()}
        
        result = await self.collection.update_one(
            {
                "_id": ObjectId(trip_id),
                "budget.id": item_id
            },
            {
                "$set": {
                    **set_data,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            return await self.get_trip_by_id(trip_id)
        return None

    async def delete_budget_item(self, trip_id: str, item_id: str) -> bool:
        """Delete a budget item from a trip"""
        result = await self.collection.update_one(
            {"_id": ObjectId(trip_id)},
            {
                "$pull": {"budget": {"id": item_id}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        return result.modified_count > 0

    async def add_city_to_trip(self, trip_id: str, city_data: dict) -> Optional[dict]:
        """Add a city to a trip's destination list"""
        from datetime import datetime
        
        # Add timestamp and ensure required fields
        city_item = {
            "city_id": city_data.get("city_id"),
            "name": city_data.get("name", ""),
            "country": city_data.get("country", ""),
            "start_date": city_data.get("start_date"),
            "end_date": city_data.get("end_date"),
            "notes": city_data.get("notes", ""),
            "added_at": datetime.utcnow()
        }
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(trip_id)},
            {
                "$push": {"cities": city_item},
                "$set": {"updated_at": datetime.utcnow()}
            },
            return_document=ReturnDocument.AFTER
        )
        
        if result:
            result["id"] = str(result["_id"])
            return result
        return None

    async def remove_city_from_trip(self, trip_id: str, city_id: str) -> bool:
        """Remove a city from a trip's destination list"""
        result = await self.collection.update_one(
            {"_id": ObjectId(trip_id)},
            {
                "$pull": {"cities": {"city_id": city_id}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        return result.modified_count > 0

# Create a singleton instance
trip_repository = TripRepository()
