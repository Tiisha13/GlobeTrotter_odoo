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
        try:
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
        except Exception:
            # Mongo unavailable; no cached state
            return None

    async def upsert(self, conversation_id: str, state: Dict[str, Any]) -> None:
        try:
            await self.collection.update_one(
                {"_id": conversation_id},
                {"$set": {"state": state}},
                upsert=True,
            )
        except Exception:
            # ignore Mongo errors and proceed with cache-only
            pass
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
        try:
            await self.collection.update_one({"_id": conversation_id}, {"$setOnInsert": doc, "$set": {"state": state}}, upsert=True)
        except Exception:
            pass
        try:
            await self.redis.set(self._cache_key(conversation_id), json.dumps(state), ex=CONV_CACHE_TTL_SECONDS)
        except Exception:
            pass

    async def delete(self, conversation_id: str) -> bool:
        try:
            res = await self.collection.delete_one({"_id": conversation_id})
            deleted = res.deleted_count > 0
        except Exception:
            deleted = True  # consider deleted in cache-only mode
        try:
            await self.redis.delete(self._cache_key(conversation_id))
        except Exception:
            pass
        return deleted

    async def clear(self, conversation_id: str) -> bool:
        modified = True
        try:
            update = await self.collection.update_one({"_id": conversation_id}, {"$set": {"state": {}}})
            modified = update.modified_count > 0
        except Exception:
            pass
        try:
            await self.redis.delete(self._cache_key(conversation_id))
        except Exception:
            pass
        return modified

    async def list_by_user(self, user_id: str, limit: int = 20, skip: int = 0) -> list[Dict[str, Any]]:
        try:
            cursor = self.collection.find({"user_id": user_id}).skip(skip).limit(limit).sort("_id")
            results: list[Dict[str, Any]] = []
            async for doc in cursor:
                results.append({
                    "conversation_id": doc.get("_id"),
                    "has_state": bool(doc.get("state")),
                })
            return results
        except Exception:
            # In cache-only mode we cannot list by user from Mongo
            return []

    async def append_message(self, conversation_id: str, message: Dict[str, Any]) -> Dict[str, Any]:
        # Strategy: avoid conflicting updates on 'state' and 'state.messages' in the same operation.
        # 1) Try to push to an existing messages array.
        try:
            update_result = await self.collection.find_one_and_update(
                {"_id": conversation_id, "state.messages": {"$type": "array"}},
                {"$push": {"state.messages": message}},
                upsert=False,
                return_document=ReturnDocument.AFTER,
            )
        except Exception:
            update_result = None

        # 2) If no document or messages not initialized, initialize with the first message in a separate upsert.
        if not update_result:
            # Try initialize in Mongo; if it fails, fall back to Redis-only
            try:
                await self.collection.update_one(
                    {"_id": conversation_id},
                    {"$set": {"state": {"messages": [message]}}},
                    upsert=True,
                )
                update_result = await self.collection.find_one({"_id": conversation_id})
            except Exception:
                # Build state from cache, append message, and write back to cache
                cached = await self.redis.get(self._cache_key(conversation_id))
                state: Dict[str, Any] = {}
                if cached:
                    try:
                        state = json.loads(cached)
                    except Exception:
                        state = {}
                msgs = state.get("messages") or []
                msgs.append(message)
                state["messages"] = msgs
                try:
                    await self.redis.set(self._cache_key(conversation_id), json.dumps(state), ex=CONV_CACHE_TTL_SECONDS)
                except Exception:
                    pass
                return state

        # Update cache
        state = (update_result or {}).get("state", {})
        try:
            await self.redis.set(self._cache_key(conversation_id), json.dumps(state), ex=CONV_CACHE_TTL_SECONDS)
        except Exception:
            pass
        return state
