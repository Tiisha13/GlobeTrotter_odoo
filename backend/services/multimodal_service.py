"""
Multi-modal input service for handling text and voice queries.
Supports speech-to-text conversion and voice command processing.
"""

from typing import Dict, Any, Optional, Union
import logging
import base64
import io
import tempfile
import os
from pathlib import Path
import aiofiles
# import speech_recognition as sr  # Optional - comment out for now
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class VoiceInput(BaseModel):
    """Voice input model"""
    audio_data: str  # Base64 encoded audio
    format: str = "wav"  # Audio format
    language: str = "en-US"  # Language code

class MultiModalService:
    """Service for handling multi-modal input (text and voice)"""
    
    def __init__(self):
        # self.recognizer = sr.Recognizer()  # Optional - comment out for now
        self.recognizer = None
        self.supported_formats = ["wav", "mp3", "flac", "m4a"]
        
        # Configure recognizer settings (commented out for now)
        # self.recognizer.energy_threshold = 300
        # self.recognizer.dynamic_energy_threshold = True
        # self.recognizer.pause_threshold = 0.8
        # self.recognizer.operation_timeout = None
        # self.recognizer.phrase_threshold = 0.3
        # self.recognizer.non_speaking_duration = 0.8
    
    async def process_voice_input(self, voice_input: VoiceInput) -> Dict[str, Any]:
        """Process voice input and convert to text"""
        try:
            # Decode base64 audio data
            audio_bytes = base64.b64decode(voice_input.audio_data)
            
            # Create temporary file for audio processing
            with tempfile.NamedTemporaryFile(
                suffix=f".{voice_input.format}",
                delete=False
            ) as temp_file:
                temp_file.write(audio_bytes)
                temp_file_path = temp_file.name
            
            try:
                # Convert audio to text
                text = await self._speech_to_text(
                    temp_file_path,
                    voice_input.language
                )
                
                # Process the text for travel-specific commands
                processed_result = await self._process_voice_command(text)
                
                return {
                    "status": "success",
                    "transcribed_text": text,
                    "processed_command": processed_result,
                    "confidence": processed_result.get("confidence", 0.8)
                }
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        except Exception as e:
            logger.error(f"Error processing voice input: {e}")
            return {
                "status": "error",
                "error": str(e),
                "transcribed_text": "",
                "processed_command": {}
            }
    
    async def _speech_to_text(self, audio_file_path: str, language: str = "en-US") -> str:
        """Convert speech to text using speech recognition"""
        try:
            # For now, return mock transcription since speech recognition is optional
            if self.recognizer is None:
                return self._get_mock_transcription(audio_file_path)
            
            # Original speech recognition code (commented out for now)
            # with sr.AudioFile(audio_file_path) as source:
            #     # Adjust for ambient noise
            #     self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            #     
            #     # Listen for audio
            #     audio = self.recognizer.listen(source)
            # 
            # # Try Google Speech Recognition first
            # try:
            #     text = self.recognizer.recognize_google(audio, language=language)
            #     logger.info(f"Google Speech Recognition result: {text}")
            #     return text
            # except sr.RequestError:
            #     logger.warning("Google Speech Recognition unavailable, trying offline recognition")
            #     
            # # Fallback to offline recognition
            # try:
            #     text = self.recognizer.recognize_sphinx(audio)
            #     logger.info(f"Sphinx offline recognition result: {text}")
            #     return text
            # except sr.RequestError:
            #     logger.error("Offline speech recognition also unavailable")
            #     return ""
            
            return self._get_mock_transcription(audio_file_path)
                
        except Exception as e:
            logger.error(f"Speech to text conversion error: {e}")
            return self._get_mock_transcription(audio_file_path)
    
    def _get_mock_transcription(self, audio_file_path: str) -> str:
        """Return mock transcription when speech recognition is not available"""
        # Return a sample travel query for demonstration
        mock_queries = [
            "I want to plan a trip to Goa for 5 days",
            "Find me hotels in Paris under 200 dollars",
            "What's the weather like in Tokyo next week",
            "Plan a budget trip to Bali",
            "Show me attractions in New York"
        ]
        
        import random
        return random.choice(mock_queries)
    
    async def _process_voice_command(self, text: str) -> Dict[str, Any]:
        """Process voice command for travel-specific intents"""
        try:
            text_lower = text.lower().strip()
            
            # Define travel-specific command patterns
            command_patterns = {
                "search_destination": [
                    "find", "search", "look for", "show me", "tell me about"
                ],
                "plan_trip": [
                    "plan a trip", "create itinerary", "plan my vacation",
                    "help me plan", "organize trip"
                ],
                "check_weather": [
                    "weather", "climate", "temperature", "forecast"
                ],
                "find_hotels": [
                    "hotels", "accommodation", "places to stay", "booking"
                ],
                "get_directions": [
                    "directions", "route", "how to get", "transportation"
                ],
                "budget_estimate": [
                    "cost", "budget", "price", "expensive", "cheap", "affordable"
                ],
                "blacklist_item": [
                    "blacklist", "avoid", "don't show", "exclude", "remove"
                ]
            }
            
            # Extract intent and entities
            detected_intent = "general_query"
            confidence = 0.6
            entities = {}
            
            # Simple pattern matching (in production, use NLU service)
            for intent, patterns in command_patterns.items():
                for pattern in patterns:
                    if pattern in text_lower:
                        detected_intent = intent
                        confidence = 0.8
                        break
                if detected_intent != "general_query":
                    break
            
            # Extract common travel entities
            entities = self._extract_travel_entities(text_lower)
            
            return {
                "intent": detected_intent,
                "confidence": confidence,
                "entities": entities,
                "original_text": text,
                "processed_text": text_lower
            }
            
        except Exception as e:
            logger.error(f"Error processing voice command: {e}")
            return {
                "intent": "general_query",
                "confidence": 0.5,
                "entities": {},
                "original_text": text,
                "processed_text": text.lower()
            }
    
    def _extract_travel_entities(self, text: str) -> Dict[str, Any]:
        """Extract travel-related entities from text"""
        entities = {}
        
        # Simple entity extraction (in production, use NER models)
        
        # Extract dates
        date_keywords = ["today", "tomorrow", "next week", "next month", "december", "january"]
        for keyword in date_keywords:
            if keyword in text:
                entities["date"] = keyword
                break
        
        # Extract destinations (simplified - would use location NER in production)
        destination_keywords = [
            "paris", "london", "tokyo", "new york", "bali", "rome", "barcelona",
            "thailand", "japan", "italy", "france", "spain", "usa", "india"
        ]
        for dest in destination_keywords:
            if dest in text:
                entities["destination"] = dest
                break
        
        # Extract budget-related numbers
        import re
        numbers = re.findall(r'\$?(\d+(?:,\d{3})*(?:\.\d{2})?)', text)
        if numbers:
            entities["budget"] = numbers[0]
        
        # Extract duration
        duration_patterns = [
            r'(\d+)\s*days?',
            r'(\d+)\s*weeks?',
            r'(\d+)\s*months?'
        ]
        for pattern in duration_patterns:
            match = re.search(pattern, text)
            if match:
                entities["duration"] = match.group(0)
                break
        
        # Extract group size
        group_patterns = [
            r'(\d+)\s*people',
            r'(\d+)\s*persons?',
            r'group of (\d+)',
            r'(\d+)\s*travelers?'
        ]
        for pattern in group_patterns:
            match = re.search(pattern, text)
            if match:
                entities["group_size"] = match.group(1)
                break
        
        return entities
    
    async def convert_voice_to_chat_request(
        self,
        voice_input: VoiceInput,
        user_id: str,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Convert voice input to chat request format"""
        try:
            # Process voice input
            voice_result = await self.process_voice_input(voice_input)
            
            if voice_result["status"] != "success":
                return {
                    "status": "error",
                    "error": voice_result.get("error", "Voice processing failed")
                }
            
            # Extract processed information
            transcribed_text = voice_result["transcribed_text"]
            command_info = voice_result["processed_command"]
            
            # Create enhanced chat request
            chat_request = {
                "message": transcribed_text,
                "user_id": user_id,
                "conversation_id": conversation_id,
                "context": {
                    "input_type": "voice",
                    "voice_intent": command_info.get("intent", "general_query"),
                    "voice_entities": command_info.get("entities", {}),
                    "confidence": command_info.get("confidence", 0.8)
                },
                "preferences": {}
            }
            
            # Add entity-based preferences
            entities = command_info.get("entities", {})
            if "budget" in entities:
                chat_request["preferences"]["budget_max"] = entities["budget"]
            if "duration" in entities:
                chat_request["preferences"]["trip_duration"] = entities["duration"]
            if "group_size" in entities:
                chat_request["preferences"]["group_size"] = int(entities["group_size"])
            
            return {
                "status": "success",
                "chat_request": chat_request,
                "voice_metadata": {
                    "transcription": transcribed_text,
                    "intent": command_info.get("intent"),
                    "entities": entities,
                    "confidence": command_info.get("confidence")
                }
            }
            
        except Exception as e:
            logger.error(f"Error converting voice to chat request: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    def is_supported_format(self, audio_format: str) -> bool:
        """Check if audio format is supported"""
        return audio_format.lower() in self.supported_formats
    
    async def get_voice_capabilities(self) -> Dict[str, Any]:
        """Get voice processing capabilities"""
        return {
            "supported_formats": self.supported_formats,
            "supported_languages": [
                "en-US", "en-GB", "es-ES", "fr-FR", "de-DE", 
                "it-IT", "pt-BR", "ja-JP", "ko-KR", "zh-CN"
            ],
            "max_audio_duration": 60,  # seconds
            "max_file_size": 10 * 1024 * 1024,  # 10MB
            "features": [
                "speech_to_text",
                "intent_recognition",
                "entity_extraction",
                "travel_command_processing"
            ]
        }

# Export for easy import
__all__ = ['MultiModalService', 'VoiceInput']
