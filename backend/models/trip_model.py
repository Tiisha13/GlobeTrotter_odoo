from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from pydantic import ConfigDict
from bson.objectid import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class ActivityModel(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    name: str
    description: Optional[str] = None
    location: str
    start_time: str
    end_time: Optional[str] = None
    cost: Optional[float] = 0.0
    category: str
    notes: Optional[str] = None
    booking_reference: Optional[str] = None
    image_url: Optional[str] = None
    website: Optional[str] = None
    order: Optional[int] = 0

class TripDayModel(BaseModel):
    date: str
    activities: List[ActivityModel] = []
    notes: Optional[str] = None

class BudgetItemModel(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    name: str
    amount: float
    category: str  # accommodation, transport, food, activities, shopping, other
    date: str
    notes: Optional[str] = None
    paid: bool = False

class TripModel(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    name: str
    description: str
    destination: str
    start_date: str
    end_date: str
    cover_photo_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: str
    is_public: bool = False
    itinerary: List[TripDayModel] = []
    budget: List[BudgetItemModel] = []
    tags: List[str] = []
    collaborators: List[str] = []

    # Pydantic v2 configuration
    model_config = ConfigDict(
        json_encoders={ObjectId: str},
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "name": "Summer Europe Trip",
                "description": "2-week trip through Europe",
                "destination": "Europe",
                "start_date": "2024-06-15",
                "end_date": "2024-06-30",
                "user_id": "user123",
                "is_public": True,
                "tags": ["europe", "summer"],
                "collaborators": ["user456"]
            }
        }
    )
