from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from pydantic import HttpUrl

from backend.repositories.city_repository import city_repository
from backend.models.city_model import CityModel
from backend.auth import get_current_user

router = APIRouter(prefix="/api/cities", tags=["cities"])

@router.get("/", response_model=List[Dict[str, Any]])
async def search_cities(
    query: str = Query("", description="Search query for city name, country, or description"),
    country: Optional[str] = Query(None, description="Filter by country code (e.g., 'US', 'FR')"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Minimum safety rating (0-5)"),
    max_cost: Optional[float] = Query(None, ge=1, le=5, description="Maximum cost index (1-5)"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags (e.g., 'beach', 'mountain')"),
    limit: int = Query(20, le=100, description="Number of results to return"),
    skip: int = Query(0, ge=0, description="Number of results to skip"),
    include_facets: bool = Query(False, description="Include facets for filtering")
):
    """
    Search for cities with optional filters and facets
    """
    filters = {}
    if country:
        filters["country"] = country
    if min_rating is not None:
        filters["min_rating"] = min_rating
    if max_cost is not None:
        filters["max_cost"] = max_cost
    if tags:
        filters["tags"] = tags
    
    results = await city_repository.search_cities(query, limit, skip, filters)
    
    if include_facets:
        facets = await city_repository.get_search_facets()
        return {
            "items": results,
            "facets": facets
        }
    
    return results

@router.get("/featured", response_model=List[Dict[str, Any]])
async def get_featured_cities(
    limit: int = Query(10, le=20, description="Number of featured cities to return")
):
    """
    Get featured cities
    """
    return await city_repository.get_featured_cities(limit)

@router.get("/country/{country_code}", response_model=List[Dict[str, Any]])
async def get_cities_by_country(country_code: str):
    """
    Get all cities in a specific country
    """
    return await city_repository.get_cities_by_country(country_code)

@router.get("/autocomplete", response_model=List[Dict[str, Any]])
async def get_city_suggestions(
    q: str = Query(..., min_length=2, description="Search query for city or country"),
    limit: int = Query(5, le=10, description="Number of suggestions to return")
):
    """
    Get city name suggestions for autocomplete
    """
    return await city_repository.get_city_suggestions(q, limit)

@router.get("/{city_id}", response_model=Dict[str, Any])
async def get_city(city_id: str):
    """
    Get detailed information about a specific city
    """
    city = await city_repository.get_city_by_id(city_id)
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    return city

@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_city(
    city_data: CityModel,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new city (Admin only)
    """
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Check if city already exists
    existing_city = await city_repository.get_city_by_name_and_country(
        city_data.name, city_data.country
    )
    if existing_city:
        raise HTTPException(status_code=400, detail="City already exists")
    
    created_city = await city_repository.create_city(city_data.dict())
    if not created_city:
        raise HTTPException(status_code=400, detail="Failed to create city")
    
    return created_city

@router.put("/{city_id}", response_model=Dict[str, Any])
async def update_city(
    city_id: str,
    city_data: CityModel,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a city's information (Admin only)
    """
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated_city = await city_repository.update_city(city_id, city_data.dict(exclude_unset=True))
    if not updated_city:
        raise HTTPException(status_code=404, detail="City not found")
    
    return updated_city

@router.delete("/{city_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_city(
    city_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a city (Admin only)
    """
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    success = await city_repository.delete_city(city_id)
    if not success:
        raise HTTPException(status_code=404, detail="City not found")
