"""
Factory Boy factories for chat app models.

Provides test data factories for ChatRoom and Message models.
"""

import uuid

import factory
from factory.django import DjangoModelFactory

from apps.chat.models import ChatRoom, Message
from apps.core.tests.factories import StudentUserFactory, TutorUserFactory


class ChatRoomFactory(DjangoModelFactory):
    """Factory for ChatRoom model."""

    class Meta:
        model = ChatRoom

    id = factory.LazyFunction(uuid.uuid4)
    tutor = factory.SubFactory(TutorUserFactory)
    student = factory.SubFactory(StudentUserFactory)
    booking = None


class MessageFactory(DjangoModelFactory):
    """Factory for Message model."""

    class Meta:
        model = Message

    id = factory.LazyFunction(uuid.uuid4)
    room = factory.SubFactory(ChatRoomFactory)
    sender = factory.LazyAttribute(lambda obj: obj.room.student)
    content = factory.Faker("sentence", nb_words=10)
    is_read = False


class ReadMessageFactory(MessageFactory):
    """Factory for read Message."""

    is_read = True
