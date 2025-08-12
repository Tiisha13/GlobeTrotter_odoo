from typing import List, Optional, Dict, Any
from datetime import datetime
from bson.objectid import ObjectId
from pymongo import ReturnDocument, IndexModel, ASCENDING, TEXT

from backend.db import get_db
from backend.models.city_model import CityModel

class CityRepository:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db.cities
        # Indexes are created on application startup via ensure_indexes()
    
    async def ensure_indexes(self):
        """Create necessary indexes for the cities collection (idempotent)"""
        indexes = [
            IndexModel([("name", TEXT), ("country", TEXT), ("description", TEXT)], name="search_text"),
            IndexModel([("country_code", ASCENDING)], name="country_code_idx"),
            IndexModel([("is_featured", ASCENDING)], name="featured_idx"),
            IndexModel([("cost_index", ASCENDING)], name="cost_idx"),
            IndexModel([("safety_rating", ASCENDING)], name="safety_idx"),
        ]
        await self.collection.create_indexes(indexes)

    async def create_city(self, city_data: dict) -> Optional[dict]:
        """Create a new city in the database"""
        city_data["created_at"] = datetime.utcnow()
        city_data["updated_at"] = datetime.utcnow()
        
        # Validate data against our model
        city = CityModel(**city_data)
        
        result = await self.collection.insert_one(city.dict())
        if result.inserted_id:
            return await self.get_city_by_id(str(result.inserted_id))
        return None

    async def get_city_by_id(self, city_id: str) -> Optional[dict]:
        """Get a city by its ID"""
        try:
            city = await self.collection.find_one({"_id": ObjectId(city_id)})
            if city:
                city["id"] = str(city["_id"])
                return city
            return None
        except:
            return None

    async def get_city_by_name_and_country(self, name: str, country: str) -> Optional[dict]:
        """Get a city by its name and country"""
        city = await self.collection.find_one({
            "name": {"$regex": f"^{name}$", "$options": "i"},
            "country": {"$regex": f"^{country}$", "$options": "i"}
        })
        
        if city:
            city["id"] = str(city["_id"])
            return city
        return None

    async def update_city(self, city_id: str, update_data: dict) -> Optional[dict]:
        """Update a city's information"""
        # Don't update these fields
        update_data.pop("created_at", None)
        update_data.pop("_id", None)
        update_data["updated_at"] = datetime.utcnow()
        
        # Validate the updated data
        existing = await self.get_city_by_id(city_id)
        if not existing:
            return None
            
        updated_data = {**existing, **update_data}
        city = CityModel(**updated_data)
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(city_id)},
            {"$set": city.dict()},
            return_document=ReturnDocument.AFTER
        )
        
        if result:
            result["id"] = str(result["_id"])
            return result
        return None

    async def delete_city(self, city_id: str) -> bool:
        """Delete a city by its ID"""
        result = await self.collection.delete_one({"_id": ObjectId(city_id)})
        return result.deleted_count > 0

    async def search_cities(
        self,
        query: str,
        limit: int = 20,
        skip: int = 0,
        filters: Optional[dict] = None
    ) -> List[dict]:
        """Search for cities with text search and filters"""
        if filters is None:
            filters = {}
            
        # Text search
        if query:
            search_query = {"$text": {"$search": query}}
        else:
            search_query = {}
        
        # Apply additional filters
        if filters:
            if "country" in filters:
                search_query["country"] = {"$regex": f"^{filters['country']}$", "$options": "i"}
            if "min_rating" in filters:
                search_query["safety_rating"] = {"$gte": float(filters["min_rating"])}
            if "max_cost" in filters:
                search_query["cost_index"] = {"$lte": float(filters["max_cost"])}
            if "tags" in filters and filters["tags"]:
                search_query["tags"] = {"$all": [tag.lower() for tag in filters["tags"]]}
        
        cursor = self.collection.find(search_query) \
            .sort([("is_featured", -1), ("safety_rating", -1)]) \
            .skip(skip) \
            .limit(limit)
        
        cities = []
        async for city in cursor:
            city["id"] = str(city["_id"])
            cities.append(city)
            
        return cities

    async def get_featured_cities(self, limit: int = 10) -> List[dict]:
        """Get featured cities"""
        cursor = self.collection.find({"is_featured": True}) \
            .sort("name", 1) \
            .limit(limit)
            
        cities = []
        async for city in cursor:
            city["id"] = str(city["_id"])
            cities.append(city)
            
        return cities

    async def get_cities_by_country(self, country_code: str) -> List[dict]:
        """Get all cities in a specific country"""
        cursor = self.collection.find({"country_code": country_code.upper()}) \
            .sort("name", 1)
            
        cities = []
        async for city in cursor:
            city["id"] = str(city["_id"])
            cities.append(city)
            
        return cities

    async def get_city_suggestions(self, query: str, limit: int = 5) -> List[dict]:
        """Get city name suggestions for autocomplete"""
        cursor = self.collection.find(
            {
                "$or": [
                    {"name": {"$regex": f"^{query}", "$options": "i"}},
                    {"country": {"$regex": f"^{query}$", "$options": "i"}}
                ]
            },
            {"name": 1, "country": 1, "country_code": 1, "image_urls": {"$slice": 1}}
        ).limit(limit)
        
        suggestions = []
        async for city in cursor:
            city["id"] = str(city["_id"])
            suggestions.append({
                "id": city["id"],
                "name": city["name"],
                "country": city["country"],
                "country_code": city["country_code"],
                "image_url": city.get("image_urls", [None])[0] if city.get("image_urls") else None
            })
            
        return suggestions

    async def get_search_facets(self) -> Dict[str, Any]:
        """Get facets for city search filtering"""
        try:
            # Get unique countries
            countries = await self.collection.distinct("country")
            
            # Get cost range
            cost_pipeline = [
                {"$group": {
                    "_id": None,
                    "min_cost": {"$min": "$cost_index"},
                    "max_cost": {"$max": "$cost_index"}
                }}
            ]
            cost_result = await self.collection.aggregate(cost_pipeline).to_list(1)
            cost_range = cost_result[0] if cost_result else {"min_cost": 0, "max_cost": 500}
            
            # Get unique tags
            tags_pipeline = [
                {"$unwind": "$tags"},
                {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 20}
            ]
            tags_result = await self.collection.aggregate(tags_pipeline).to_list(20)
            tags = [tag["_id"] for tag in tags_result if tag["_id"]]
            
            return {
                "countries": sorted(countries),
                "cost_range": {
                    "min": int(cost_range.get("min_cost", 0)),
                    "max": int(cost_range.get("max_cost", 500))
                },
                "tags": tags
            }
        except Exception as e:
            print(f"Error getting facets: {e}")
            return {
                "countries": [],
                "cost_range": {"min": 0, "max": 500},
                "tags": []
            }

# Create a singleton instance
city_repository = CityRepository()
