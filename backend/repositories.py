from __future__ import annotations

import json
from typing import Optional, Dict, Any
from datetime import timedelta
import asyncio

from pymongo.database import Database as PyMongoDatabase
from redis import asyncio as aioredis

from backend.db import get_db, get_redis

CONV_CACHE_TTL_SECONDS = int(timedelta(days=1).total_seconds())


class ConversationRepository:
    def __init__(self, db: PyMongoDatabase, redis: aioredis.Redis):
        self.db = db
        self.redis = redis
        self.collection = self.db["conversations"]

    @classmethod
    async def create(cls) -> "ConversationRepository":
        db = get_db()
        redis = await get_redis()
        return cls(db, redis)

    def _cache_key(self, conversation_id: str) -> str:
        return f"conv:{conversation_id}"

    async def get(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        # Try Redis first
        cached = await self.redis.get(self._cache_key(conversation_id))
        if cached:
            try:
                return json.loads(cached)
            except Exception:
                # ignore cache parse errors
                pass
        # Fallback to Mongo (run sync call in thread)
        doc = await asyncio.to_thread(self.collection.find_one, {"_id": conversation_id})
        if not doc:
            return None
        state = doc.get("state") or {}
        # refresh cache
        try:
            await self.redis.set(self._cache_key(conversation_id), json.dumps(state), ex=CONV_CACHE_TTL_SECONDS)
        except Exception:
            pass
        return state

    async def upsert(self, conversation_id: str, state: Dict[str, Any]) -> None:
        await asyncio.to_thread(
            self.collection.update_one,
            {"_id": conversation_id},
            {"$set": {"state": state}},
            True,
        )
        try:
            await self.redis.set(self._cache_key(conversation_id), json.dumps(state), ex=CONV_CACHE_TTL_SECONDS)
        except Exception:
            pass

