import logging

from django.utils import timezone

from celery import shared_task

from apps.events.models import OutboxEvent
from apps.events.producer import EventProducer

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def publish_outbox_events(self):
    """
    Publish unpublished events to Kafka.

    Runs every 1 second via Celery Beat.
    Processes events in order (by created_at) to maintain consistency.
    Individual event failures are logged but don't stop batch processing.
    """
    producer = EventProducer()

    events = OutboxEvent.objects.filter(published_at__isnull=True).order_by("created_at")[:100]

    published_count = 0
    failed_count = 0
    for event in events:
        try:
            message = {
                "event_id": str(event.id),
                "event_type": event.event_type,
                "aggregate_type": event.aggregate_type,
                "aggregate_id": event.aggregate_id,
                "payload": event.payload,
                "created_at": event.created_at.isoformat(),
            }

            topic = f"{event.aggregate_type.lower()}-events"
            producer.send(topic, key=event.aggregate_id, value=message)

            event.published_at = timezone.now()
            event.save(update_fields=["published_at"])
            published_count += 1

        except Exception as e:
            logger.error("Failed to publish event %s: %s", event.id, e)
            failed_count += 1
            continue

    if published_count > 0:
        logger.info("Published %d events to Kafka", published_count)
    if failed_count > 0:
        logger.warning("Failed to publish %d events to Kafka", failed_count)

    return published_count
