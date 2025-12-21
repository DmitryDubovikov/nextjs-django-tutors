import json
import logging
import threading

from django.conf import settings

from kafka import KafkaProducer

logger = logging.getLogger(__name__)


class EventProducer:
    """
    Thread-safe singleton Kafka producer for publishing events.

    Uses lazy initialization to avoid connection issues at import time.
    """

    _instance = None
    _producer = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def _get_producer(self):
        if self._producer is None:
            with self._lock:
                if self._producer is None:
                    self._producer = KafkaProducer(
                        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                        value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
                        key_serializer=lambda k: k.encode("utf-8") if k else None,
                    )
        return self._producer

    def send(self, topic: str, key: str, value: dict) -> None:
        """Send a message to a Kafka topic."""
        producer = self._get_producer()
        future = producer.send(topic, key=key, value=value)
        future.get(timeout=10)
        logger.debug("Sent message to topic %s with key %s", topic, key)

    def flush(self) -> None:
        """Flush any pending messages."""
        if self._producer:
            self._producer.flush()

    def close(self) -> None:
        """Close the producer connection."""
        with self._lock:
            if self._producer:
                self._producer.close()
                self._producer = None
