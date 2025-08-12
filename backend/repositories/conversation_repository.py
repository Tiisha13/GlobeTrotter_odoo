from __future__ import annotations

import json
from typing import Optional, Dict, Any
from datetime import timedelta

from motor.motor_asyncio import AsyncIOMotorDatabase
from redis import asyncio as aioredis
from pymongo import ReturnDocument

from backend.db import get_db, get_redis

CONV_CACHE_TTL_SECONDS = int(timedelta(days=1).total_seconds())


class ConversationRepository:
    def __init__(self, db: AsyncIOMotorDatabase, redis: aioredis.Redis):
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
        # Fallback to Mongo (async)
        doc = await self.collection.find_one({"_id": conversation_id})
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
        await self.collection.update_one(
            {"_id": conversation_id},
            {"$set": {"state": state}},
            upsert=True,
        )
        try:
            await self.redis.set(self._cache_key(conversation_id), json.dumps(state), ex=CONV_CACHE_TTL_SECONDS)
        except Exception:
            pass

    async def create_conversation(self, conversation_id: str, state: Dict[str, Any], user_id: Optional[str] = None) -> None:
        doc = {
            "_id": conversation_id,
            "state": state,
            "user_id": user_id,
        }
        await self.collection.update_one({"_id": conversation_id}, {"$setOnInsert": doc, "$set": {"state": state}}, upsert=True)
        try:
            await self.redis.set(self._cache_key(conversation_id), json.dumps(state), ex=CONV_CACHE_TTL_SECONDS)
        except Exception:
            pass

    async def delete(self, conversation_id: str) -> bool:
        res = await self.collection.delete_one({"_id": conversation_id})
        try:
            await self.redis.delete(self._cache_key(conversation_id))
        except Exception:
            pass
        return res.deleted_count > 0

    async def clear(self, conversation_id: str) -> bool:
        update = await self.collection.update_one({"_id": conversation_id}, {"$set": {"state": {}}})
        try:
            await self.redis.delete(self._cache_key(conversation_id))
        except Exception:
            pass
        return update.modified_count > 0

    async def list_by_user(self, user_id: str, limit: int = 20, skip: int = 0) -> list[Dict[str, Any]]:
        cursor = self.collection.find({"user_id": user_id}).skip(skip).limit(limit).sort("_id")
        results: list[Dict[str, Any]] = []
        async for doc in cursor:
            results.append({
                "conversation_id": doc.get("_id"),
                "has_state": bool(doc.get("state")),
            })
        return results

    async def append_message(self, conversation_id: str, message: Dict[str, Any]) -> Dict[str, Any]:
        # Append into state.messages array; initialize structure if missing
        update_result = await self.collection.find_one_and_update(
            {"_id": conversation_id},
            {
                "$setOnInsert": {"state": {"messages": []}},
                "$push": {"state.messages": message},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        # Invalidate cache and set new state
        state = (update_result or {}).get("state", {})
        try:
            await self.redis.set(self._cache_key(conversation_id), json.dumps(state), ex=CONV_CACHE_TTL_SECONDS)
        except Exception:
            pass
        return state
