from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, HttpUrl
from pydantic import ConfigDict
from bson.objectid import ObjectId

class CityModel(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    name: str
    country: str
    country_code: str
    description: str
    latitude: float
    longitude: float
    population: Optional[int] = None
    timezone: str
    currency: str
    languages: List[str] = []
    best_time_to_visit: List[str] = []
    avg_temperature: Dict[str, float] = {}  # Month: temperature
    must_see_attractions: List[Dict[str, Any]] = []
    local_cuisine: List[str] = []
    safety_rating: float = 0.0
    cost_index: float  # 1-5 scale where 1 is very cheap, 5 is very expensive
    image_urls: List[HttpUrl] = []
    is_featured: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []
    
    # Pydantic v2 configuration
    model_config = ConfigDict(
        json_encoders={ObjectId: str},
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "name": "Paris",
                "country": "France",
                "country_code": "FR",
                "description": "The city of love and lights, known for its art, fashion, and culture.",
                "latitude": 48.8566,
                "longitude": 2.3522,
                "population": 2148000,
                "timezone": "Europe/Paris",
                "currency": "EUR",
                "languages": ["French"],
                "best_time_to_visit": ["April-June", "September-October"],
                "avg_temperature": {"Jan": 4.9, "Feb": 5.6, "Mar": 8.8, "Apr": 11.5, "May": 15.2, "Jun": 18.1, 
                                   "Jul": 20.0, "Aug": 19.7, "Sep": 16.5, "Oct": 12.6, "Nov": 7.9, "Dec": 5.5},
                "must_see_attractions": [
                    {"name": "Eiffel Tower", "description": "Iconic iron tower with city views", "category": "Landmark"},
                    {"name": "Louvre Museum", "description": "World's largest art museum", "category": "Museum"}
                ],
                "local_cuisine": ["Croissant", "Baguette", "Escargot", "Macaron"],
                "safety_rating": 4.2,
                "cost_index": 4.0,
                "is_featured": True,
                "tags": ["europe", "france", "romantic", "art"]
            }
        }
    )
