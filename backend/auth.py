from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import jwt
import os
from datetime import datetime, timedelta

# Simple auth implementation for development
# In production, you'd want proper JWT validation, user management, etc.

security = HTTPBearer()

# Mock user for development - replace with real user management
MOCK_USER = {
    "id": "user123",
    "email": "user@example.com",
    "is_admin": False,
    "created_at": datetime.utcnow()
}

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Get the current authenticated user
    For development, this returns a mock user
    In production, validate JWT token and return real user data
    """
    try:
        # For development, we'll just return the mock user
        # In production, you'd decode and validate the JWT token:
        # payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        # user_id = payload.get("sub")
        # user = await get_user_by_id(user_id)
        
        return MOCK_USER
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict[str, Any]]:
    """
    Get the current user if authenticated, otherwise return None
    """
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Create a JWT access token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    
    # In production, use a proper secret key from environment
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt
