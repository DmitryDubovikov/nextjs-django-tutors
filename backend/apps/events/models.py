import uuid

from django.db import models


class OutboxEvent(models.Model):
    """
    Transactional Outbox pattern implementation.

    Events are written to this table in the same transaction as the business data change,
    then published to Kafka asynchronously by a Celery task.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    aggregate_type = models.CharField(max_length=50, db_index=True)
    aggregate_id = models.CharField(max_length=50, db_index=True)
    event_type = models.CharField(max_length=50, db_index=True)
    payload = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["published_at", "created_at"]),
            models.Index(fields=["aggregate_type", "published_at"]),
        ]

    def __str__(self):
        return f"{self.event_type}:{self.aggregate_id}"
