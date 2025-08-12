from __future__ import annotations

import asyncio
from typing import Optional
from datetime import timedelta

from pymongo import MongoClient
from pymongo.database import Database as PyMongoDatabase
from redis import asyncio as aioredis

from backend.config import settings

_mongo_client: Optional[MongoClient] = None
_db: Optional[PyMongoDatabase] = None
_redis: Optional[aioredis.Redis] = None


def _get_mongo_client() -> MongoClient:
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoClient(settings.MONGO_URI)
    return _mongo_client


def get_db() -> PyMongoDatabase:
    global _db
    if _db is None:
        client = _get_mongo_client()
        _db = client[settings.MONGO_DB_NAME]
    return _db


def _get_redis_client() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    return _redis


async def get_redis() -> aioredis.Redis:
    # For symmetry with async usage
    return _get_redis_client()


async def close_connections() -> None:
    global _mongo_client, _db, _redis
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
        _db = None
    if _redis is not None:
        await _redis.close()
        _redis = None
