from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from typing import List, Optional, Dict, Any
from datetime import date

from backend.repositories.trip_repository import trip_repository
from backend.models.trip_model import TripModel, ActivityModel, BudgetItemModel
from backend.auth import get_current_user

router = APIRouter(prefix="/api/trips", tags=["trips"])

@router.get("/", response_model=List[Dict[str, Any]])
async def get_user_trips(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(20, le=50, description="Number of trips to return"),
    skip: int = Query(0, ge=0, description="Number of trips to skip")
):
    """
    Get all trips for the current user
    """
    return await trip_repository.get_user_trips(current_user["id"], limit, skip)

@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_trip(
    trip_data: TripModel,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new trip
    """
    trip_dict = trip_data.dict()
    trip_dict["user_id"] = current_user["id"]
    
    # Set created_at and updated_at timestamps
    now = date.today().isoformat()
    trip_dict["created_at"] = now
    trip_dict["updated_at"] = now
    
    created_trip = await trip_repository.create_trip(trip_dict)
    if not created_trip:
        raise HTTPException(status_code=400, detail="Failed to create trip")
    
    return created_trip

@router.get("/{trip_id}", response_model=Dict[str, Any])
async def get_trip(
    trip_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific trip by ID
    """
    trip = await trip_repository.get_trip_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Check if user has permission to view this trip
    if trip["user_id"] != current_user["id"] and not trip.get("is_public", False):
        raise HTTPException(status_code=403, detail="Not authorized to view this trip")
    
    return trip

@router.put("/{trip_id}", response_model=Dict[str, Any])
async def update_trip(
    trip_id: str,
    trip_data: TripModel,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a trip's information
    """
    # Check if trip exists and user has permission
    existing_trip = await trip_repository.get_trip_by_id(trip_id)
    if not existing_trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if existing_trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to update this trip")
    
    # Update the trip
    updated_trip = await trip_repository.update_trip(trip_id, trip_data.dict(exclude_unset=True))
    if not updated_trip:
        raise HTTPException(status_code=400, detail="Failed to update trip")
    
    return updated_trip

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a trip
    """
    # Check if trip exists and user has permission
    existing_trip = await trip_repository.get_trip_by_id(trip_id)
    if not existing_trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if existing_trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this trip")
    
    # Delete the trip
    success = await trip_repository.delete_trip(trip_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete trip")

# Activity endpoints
@router.post("/{trip_id}/days/{day_date}/activities", response_model=Dict[str, Any])
async def add_activity_to_day(
    trip_id: str,
    day_date: str,
    activity_data: ActivityModel,
    current_user: dict = Depends(get_current_user)
):
    """
    Add an activity to a specific day in the trip
    """
    # Check if trip exists and user has permission
    trip = await trip_repository.get_trip_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this trip")
    
    # Add the activity
    updated_trip = await trip_repository.add_activity_to_day(
        trip_id, day_date, activity_data.dict()
    )
    
    if not updated_trip:
        raise HTTPException(status_code=400, detail="Failed to add activity")
    
    return updated_trip

@router.put(
    "/{trip_id}/days/{day_date}/activities/{activity_id}", 
    response_model=Dict[str, Any]
)
async def update_activity(
    trip_id: str,
    day_date: str,
    activity_id: str,
    activity_data: ActivityModel,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an activity in a trip
    """
    # Check if trip exists and user has permission
    trip = await trip_repository.get_trip_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this trip")
    
    # Update the activity
    updated_trip = await trip_repository.update_activity(
        trip_id, day_date, activity_id, activity_data.dict(exclude_unset=True)
    )
    
    if not updated_trip:
        raise HTTPException(status_code=400, detail="Failed to update activity")
    
    return updated_trip

@router.delete(
    "/{trip_id}/days/{day_date}/activities/{activity_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_activity(
    trip_id: str,
    day_date: str,
    activity_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an activity from a trip
    """
    # Check if trip exists and user has permission
    trip = await trip_repository.get_trip_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this trip")
    
    # Delete the activity
    success = await trip_repository.delete_activity(trip_id, day_date, activity_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete activity")

# Budget item endpoints
@router.post("/{trip_id}/budget", response_model=Dict[str, Any])
async def add_budget_item(
    trip_id: str,
    budget_item: BudgetItemModel,
    current_user: dict = Depends(get_current_user)
):
    """
    Add a budget item to a trip
    """
    # Check if trip exists and user has permission
    trip = await trip_repository.get_trip_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this trip")
    
    # Add the budget item
    updated_trip = await trip_repository.add_budget_item(trip_id, budget_item.dict())
    if not updated_trip:
        raise HTTPException(status_code=400, detail="Failed to add budget item")
    
    return updated_trip

@router.put("/{trip_id}/budget/{item_id}", response_model=Dict[str, Any])
async def update_budget_item(
    trip_id: str,
    item_id: str,
    budget_item: BudgetItemModel,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a budget item in a trip
    """
    # Check if trip exists and user has permission
    trip = await trip_repository.get_trip_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this trip")
    
    # Update the budget item
    updated_trip = await trip_repository.update_budget_item(
        trip_id, item_id, budget_item.dict(exclude_unset=True)
    )
    
    if not updated_trip:
        raise HTTPException(status_code=400, detail="Failed to update budget item")
    
    return updated_trip

@router.delete(
    "/{trip_id}/budget/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_budget_item(
    trip_id: str,
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a budget item from a trip
    """
    # Check if trip exists and user has permission
    trip = await trip_repository.get_trip_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this trip")
    
    # Delete the budget item
    success = await trip_repository.delete_budget_item(trip_id, item_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete budget item")

# City-to-trip linking endpoints
@router.post("/{trip_id}/cities", response_model=Dict[str, Any])
async def add_city_to_trip(
    trip_id: str,
    city_data: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Add a city to a trip's destination list
    """
    # Check if trip exists and user has permission
    trip = await trip_repository.get_trip_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this trip")
    
    # Add the city
    updated_trip = await trip_repository.add_city_to_trip(trip_id, city_data)
    if not updated_trip:
        raise HTTPException(status_code=400, detail="Failed to add city to trip")
    
    return updated_trip

@router.get("/{trip_id}/cities", response_model=List[Dict[str, Any]])
async def get_trip_cities(
    trip_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all cities in a trip
    """
    # Check if trip exists and user has permission
    trip = await trip_repository.get_trip_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip["user_id"] != current_user["id"] and not trip.get("is_public", False):
        raise HTTPException(status_code=403, detail="Not authorized to view this trip")
    
    return trip.get("cities", [])

@router.delete("/{trip_id}/cities/{city_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_city_from_trip(
    trip_id: str,
    city_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove a city from a trip
    """
    # Check if trip exists and user has permission
    trip = await trip_repository.get_trip_by_id(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to modify this trip")
    
    # Remove the city
    success = await trip_repository.remove_city_from_trip(trip_id, city_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove city from trip")
