from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.events.models import OutboxEvent
from apps.tutors.models import Tutor
from apps.tutors.serializers import TutorSearchSerializer


@receiver(post_save, sender=Tutor)
def on_tutor_save(sender, instance, created, **kwargs):
    """Create outbox event when tutor is created or updated."""
    event_type = "TutorCreated" if created else "TutorUpdated"
    payload = TutorSearchSerializer(instance).data

    def create_event():
        OutboxEvent.objects.create(
            aggregate_type="Tutor",
            aggregate_id=str(instance.id),
            event_type=event_type,
            payload=payload,
        )

    transaction.on_commit(create_event)


@receiver(post_delete, sender=Tutor)
def on_tutor_delete(sender, instance, **kwargs):
    """Create outbox event when tutor is deleted."""
    tutor_id = instance.id

    def create_event():
        OutboxEvent.objects.create(
            aggregate_type="Tutor",
            aggregate_id=str(tutor_id),
            event_type="TutorDeleted",
            payload={"id": tutor_id},
        )

    transaction.on_commit(create_event)
