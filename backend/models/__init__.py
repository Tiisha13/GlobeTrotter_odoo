from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from datetime import date, time
from enum import Enum

class TransportType(str, Enum):
    TRAIN = "train"
    BUS = "bus"
    FLIGHT = "flight"

class Activity(BaseModel):
    activity_id: str
    time: str  # HH:MM
    name: str
    description: str
    estimated_cost: float
    currency: str = "USD"
    crowd_score: Optional[float] = None  # 0-100
    weather_summary: Optional[str] = None
    place_coords: Dict[str, float]  # lat, lng
    estimated: bool = False

class TransportOption(BaseModel):
    id: str
    departure_time: str  # ISO format
    arrival_time: str    # ISO format
    duration_minutes: int
    price: float
    currency: str = "USD"
    provider: str
    booking_link: Optional[str] = None
    estimated: bool = False

class Hotel(BaseModel):
    hotel_id: str
    name: str
    rating: float  # 1-5
    price_per_night: float
    currency: str = "USD"
    distance_from_center_km: float
    blacklisted: bool = False
    eco_rating: Optional[float] = None  # 1-5 if available

class DayPlan(BaseModel):
    day_number: int
    date: date
    activities: List[Activity] = []
    daily_budget_total: float

class CityVisit(BaseModel):
    city_name: str
    country: str
    arrival: Dict[str, str]  # date, time, by
    departure: Dict[str, str]  # date, time, by
    hotels: List[Hotel] = []
    days: List[DayPlan] = []
    transport_options: Dict[TransportType, List[TransportOption]] = {
        TransportType.TRAIN: [],
        TransportType.BUS: [],
        TransportType.FLIGHT: []
    }

class TripPlan(BaseModel):
    trip_title: str
    total_days: int
    start_date: date
    end_date: date
    total_budget: float
    currency: str = "USD"
    eco_mode: bool = False
    cities: List[CityVisit] = []

class UIActions(BaseModel):
    collapse_chat: bool = False
    animate_itinerary: Literal["drip", "fade", "slide"] = "drip"
    map_center: Optional[Dict[str, float]] = None  # lat, lng, zoom
    open_panel: Literal["itinerary", "search", "none"] = "itinerary"

class TravelAssistantResponse(BaseModel):
    message: str
    ui_actions: Optional[UIActions] = None
    trip_plan: Optional[TripPlan] = None
    trip: Optional[TripPlan] = None  # Keep for backward compatibility
    pdf_payload: Optional[Dict[str, str]] = None  # title, content_html
    conversation_id: Optional[str] = None
