"""Import every model so `Base.metadata` is fully populated for Alembic
autogenerate -- nothing else in the app should need to import this module
directly.
"""
from app.models.activity import Activity
from app.models.activity_metrics import ActivityMetrics
from app.models.activity_raw import ActivityRaw
from app.models.conversation import Conversation
from app.models.conversation_message import ConversationMessage
from app.models.goal import Goal
from app.models.knowledge_chunk import KnowledgeChunk
from app.models.prediction import Prediction
from app.models.training_load import TrainingLoad
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.weather import WeatherCondition

__all__ = [
    "Activity",
    "ActivityMetrics",
    "ActivityRaw",
    "Conversation",
    "ConversationMessage",
    "Goal",
    "KnowledgeChunk",
    "Prediction",
    "TrainingLoad",
    "User",
    "UserProfile",
    "WeatherCondition",
]
