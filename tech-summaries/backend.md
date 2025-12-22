# Подготовка к собеседованию по бэкенду

> Документ для освежения знаний перед собеседованием. Фокус на продвинутых паттернах.
> Примеры из реального проекта nextjs-django-tutors.

## Содержание

1. [Event-Driven Architecture](#1-event-driven-architecture)
2. [CQRS и Read Model Projection](#2-cqrs-и-read-model-projection)
3. [Payment Processing](#3-payment-processing)
4. [Real-Time Communication](#4-real-time-communication)
5. [Feature Flags & A/B Testing](#5-feature-flags--ab-testing)
6. [Async Tasks & Scheduling](#6-async-tasks--scheduling)
7. [Ключевые файлы проекта](#7-ключевые-файлы-проекта)

---

## 1. Event-Driven Architecture

### 1.1 Проблема Dual-Write

При обновлении данных нужно:
1. Записать в PostgreSQL
2. Отправить событие в Kafka

**Проблема:** Что если запись в БД прошла, а Kafka недоступен? Или наоборот?

```
┌──────────────────────────────────────────────────────────┐
│                    Dual-Write Problem                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   Tutor.save()                                           │
│       │                                                  │
│       ├──► PostgreSQL ✓                                  │
│       │                                                  │
│       └──► Kafka ✗  (network timeout)                    │
│                                                          │
│   Результат: данные в БД есть, события в Kafka нет      │
│   Search index рассинхронизирован                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 1.2 Transactional Outbox Pattern

**Решение:** Записываем событие в ту же БД, в той же транзакции. Отдельный процесс читает события и отправляет в Kafka.

```
┌──────────────────────────────────────────────────────────┐
│                  Transactional Outbox                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   BEGIN TRANSACTION                                      │
│   │                                                      │
│   ├──► Tutor.save()           → tutors table            │
│   │                                                      │
│   └──► OutboxEvent.create()   → outbox_events table     │
│   │                                                      │
│   COMMIT  (атомарно!)                                   │
│                                                          │
│   ---  Celery Task (каждую секунду) ---                 │
│   │                                                      │
│   └──► SELECT * FROM outbox_events WHERE published=NULL │
│        │                                                 │
│        └──► Kafka.send()                                │
│             │                                            │
│             └──► UPDATE outbox_events SET published=NOW │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Гарантии:**
- **Atomicity** — событие и данные в одной транзакции
- **Ordering** — события отсортированы по created_at
- **At-least-once** — событие помечается published только после ACK от Kafka

### 1.3 Реализация: OutboxEvent Model

```python
# backend/apps/events/models.py

class OutboxEvent(models.Model):
    """
    Transactional Outbox pattern implementation.

    Events are written to this table in the same transaction as the business data change,
    then published to Kafka asynchronously by a Celery task.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    aggregate_type = models.CharField(max_length=50, db_index=True)   # "Tutor"
    aggregate_id = models.CharField(max_length=50, db_index=True)     # "123"
    event_type = models.CharField(max_length=50, db_index=True)       # "TutorCreated"
    payload = models.JSONField()                                       # Full tutor data
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["published_at", "created_at"]),  # Для polling query
        ]
```

### 1.4 Django Signals + transaction.on_commit()

**Ключевой момент:** событие создаётся только после успешного коммита транзакции.

```python
# backend/apps/tutors/signals.py

from django.db import transaction
from django.db.models.signals import post_save, post_delete
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

    # Событие создаётся ТОЛЬКО после успешного commit
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
```

**Почему `transaction.on_commit()`?**
- `post_save` вызывается ДО коммита транзакции
- Если транзакция откатится, событие не должно создаваться
- `on_commit` гарантирует выполнение только после успешного коммита

### 1.5 Thread-Safe Kafka Producer (Double-Checked Locking)

```python
# backend/apps/events/producer.py

import threading
from kafka import KafkaProducer


class EventProducer:
    """
    Thread-safe singleton Kafka producer for publishing events.
    Uses lazy initialization to avoid connection issues at import time.
    """

    _instance = None
    _producer = None
    _lock = threading.Lock()

    def __new__(cls):
        # First check (without lock) - fast path
        if cls._instance is None:
            with cls._lock:
                # Second check (with lock) - prevents race condition
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def _get_producer(self):
        # Same double-checked locking for producer initialization
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
        future.get(timeout=10)  # Synchronous send with timeout
```

**Double-Checked Locking:**
1. Первая проверка без lock — быстрый путь для большинства вызовов
2. Lock только когда нужна инициализация
3. Вторая проверка под lock — защита от race condition

### 1.6 Celery Task для публикации событий

```python
# backend/apps/events/tasks.py

from celery import shared_task
from django.utils import timezone

from apps.events.models import OutboxEvent
from apps.events.producer import EventProducer


@shared_task(bind=True)
def publish_outbox_events(self):
    """
    Publish unpublished events to Kafka.
    Runs every 1 second via Celery Beat.
    """
    producer = EventProducer()

    # Batch processing: до 100 событий за раз
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

            topic = f"{event.aggregate_type.lower()}-events"  # "tutor-events"
            producer.send(topic, key=event.aggregate_id, value=message)

            # Mark as published AFTER successful send
            event.published_at = timezone.now()
            event.save(update_fields=["published_at"])
            published_count += 1

        except Exception as e:
            # Log error but continue with other events
            logger.error("Failed to publish event %s: %s", event.id, e)
            failed_count += 1
            continue

    return published_count
```

**Error Resilience:**
- Ошибка одного события не блокирует остальные
- Непубликованные события будут обработаны в следующем цикле
- Celery Beat запускает task каждую секунду

---

## 2. CQRS и Read Model Projection

### 2.1 Архитектура

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CQRS Architecture                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   WRITE SIDE                    READ SIDE                           │
│   ──────────                    ─────────                           │
│                                                                      │
│   Django Admin                  Frontend Search                      │
│       │                              ▲                               │
│       ▼                              │                               │
│   PostgreSQL ──► Kafka ──► Go Service ──► OpenSearch                │
│   (source of     topic     (consumer)     (read model)              │
│    truth)                                                           │
│                                                                      │
│   Eventual Consistency: 1-2 секунды                                 │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Преимущества:**
- Независимое масштабирование read/write
- Оптимизированный поиск (OpenSearch vs PostgreSQL LIKE)
- Изоляция сбоев (Kafka — буфер)

### 2.2 Go Consumer: Event Handler

```go
// services/search/internal/handler/handler.go

type EventHandler struct {
    os     opensearch.SearchClient
    logger *slog.Logger
}

// Handle processes a single event and updates OpenSearch accordingly.
func (h *EventHandler) Handle(ctx context.Context, event kafka.Event) error {
    h.logger.Info("Processing event",
        "event_id", event.EventID,
        "event_type", event.EventType,
        "aggregate_id", event.AggregateID,
    )

    switch event.EventType {
    case "TutorCreated", "TutorUpdated":
        return h.handleTutorUpsert(ctx, event)
    case "TutorDeleted":
        return h.handleTutorDelete(ctx, event)
    default:
        h.logger.Warn("Unknown event type, skipping", "event_type", event.EventType)
        return nil  // Ignore unknown events
    }
}

func (h *EventHandler) handleTutorUpsert(ctx context.Context, event kafka.Event) error {
    var tutor domain.Tutor
    if err := json.Unmarshal(event.Payload, &tutor); err != nil {
        return fmt.Errorf("failed to unmarshal tutor payload: %w", err)
    }

    // UpsertTutor handles both create and update (idempotent)
    if err := h.os.UpsertTutor(ctx, &tutor); err != nil {
        return fmt.Errorf("failed to upsert tutor %d: %w", tutor.ID, err)
    }

    return nil
}
```

**Idempotent Operations:**
- `TutorCreated` и `TutorUpdated` оба используют `UpsertTutor()` — OpenSearch Index API идемпотентен
- `TutorDeleted` возвращает success если документ не найден
- Безопасно replay событий

### 2.3 Kafka Consumer Loop

```go
// services/search/internal/kafka/consumer.go

func (c *Consumer) Start(ctx context.Context) error {
    c.logger.Info("Starting Kafka consumer",
        "topic", c.reader.Config().Topic,
        "group_id", c.reader.Config().GroupID,
    )

    for {
        select {
        case <-ctx.Done():
            c.logger.Info("Kafka consumer stopping")
            return c.reader.Close()
        default:
            msg, err := c.reader.ReadMessage(ctx)
            if err != nil {
                if ctx.Err() != nil {
                    return nil  // Context cancelled, graceful shutdown
                }
                c.logger.Error("Failed to read message", "error", err)
                continue  // Continue on transient errors
            }

            var event Event
            if err := json.Unmarshal(msg.Value, &event); err != nil {
                c.logger.Error("Failed to unmarshal event", "error", err)
                continue  // Skip malformed events
            }

            if err := c.handler.Handle(ctx, event); err != nil {
                c.logger.Error("Failed to handle event",
                    "event_id", event.EventID,
                    "error", err,
                )
                continue  // Log and continue
            }
        }
    }
}
```

**Error Handling Strategy:**
- Transient errors → log and continue
- Malformed events → skip (log for debugging)
- Context cancellation → graceful shutdown

---

## 3. Payment Processing

### 3.1 Idempotency

**Проблема:** Клиент отправил запрос на оплату, получил timeout. Повторил запрос. Сняли деньги дважды?

**Решение:** `idempotency_key` — уникальный ключ от клиента.

```python
# backend/apps/payments/models.py

class Payment(models.Model):
    """Payment model representing a Stripe-like PaymentIntent."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    payment_intent_id = models.CharField(max_length=50, unique=True)  # pi_xxx
    idempotency_key = models.CharField(max_length=64, unique=True)    # От клиента

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="RUB")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    booking = models.ForeignKey("bookings.Booking", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    metadata = models.JSONField(default=dict)  # card_last4, card_type, etc.
```

**Как работает:**
1. Клиент генерирует `idempotency_key` (UUID)
2. Сервер проверяет: есть ли платёж с таким ключом?
3. Есть → возвращает существующий
4. Нет → создаёт новый

### 3.2 Payment State Machine

```
┌──────────────────────────────────────────────────────────┐
│                  Payment State Machine                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   ┌─────────┐    confirm()    ┌────────────┐            │
│   │ PENDING │ ──────────────► │ PROCESSING │            │
│   └─────────┘                 └─────┬──────┘            │
│                                     │                    │
│                           webhook   │                    │
│                      ┌──────────────┴──────────────┐    │
│                      │                             │    │
│                      ▼                             ▼    │
│              ┌───────────┐                 ┌────────┐   │
│              │ SUCCEEDED │                 │ FAILED │   │
│              └───────────┘                 └────────┘   │
│                    │                                    │
│                    │ refund()                           │
│                    ▼                                    │
│              ┌──────────┐                               │
│              │ REFUNDED │                               │
│              └──────────┘                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Ключевой принцип:** Финальный статус (succeeded/failed) устанавливается только через webhook, не через confirm endpoint.

### 3.3 Async Payment Flow

```python
# backend/apps/payments/tasks.py

# Test card numbers (Stripe-compatible)
TEST_CARD_SUCCESS = "4242424242424242"
TEST_CARD_DECLINED = "4000000000000002"
TEST_CARD_INSUFFICIENT = "4000000000009995"


@shared_task(bind=True, max_retries=3)
def simulate_payment_provider(self, payment_id: str, card_number: str | None = None):
    """
    Simulate payment provider processing.
    Determines outcome based on test card numbers.
    """
    # Simulate network delay
    time.sleep(random.uniform(0.5, 2.0))

    payment = Payment.objects.get(id=payment_id)

    # Determine outcome based on card
    if card_number == TEST_CARD_SUCCESS:
        event = "payment_intent.succeeded"
    elif card_number in (TEST_CARD_DECLINED, TEST_CARD_INSUFFICIENT):
        event = "payment_intent.failed"
    else:
        event = random.choice(["payment_intent.succeeded", "payment_intent.failed"])

    # Trigger internal webhook (как настоящий Stripe)
    process_webhook_event.delay(
        event_type=event,
        payment_intent_id=payment.payment_intent_id,
    )


@shared_task
def process_webhook_event(event_type: str, payment_intent_id: str):
    """
    Process webhook event and update payment status.
    This is the SINGLE SOURCE OF TRUTH for payment state changes.
    """
    payment = Payment.objects.get(payment_intent_id=payment_intent_id)

    if event_type == "payment_intent.succeeded":
        payment.status = Payment.Status.SUCCEEDED
        # Trigger side-effects (booking confirmation)
        process_successful_payment.delay(str(payment.id))

    elif event_type == "payment_intent.failed":
        payment.status = Payment.Status.FAILED

    payment.save()


@shared_task
def process_successful_payment(payment_id: str):
    """Handle successful payment side-effects."""
    payment = Payment.objects.select_related("booking").get(id=payment_id)

    # Confirm booking
    if payment.booking.status == Booking.Status.PENDING:
        payment.booking.status = Booking.Status.CONFIRMED
        payment.booking.save()
```

**Task Chain:**
```
CreatePaymentIntent → confirm() → simulate_payment_provider
                                        │
                                        ▼
                               process_webhook_event
                                        │
                                        ▼
                             process_successful_payment
```

---

## 4. Real-Time Communication

### 4.1 Django Channels Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  WebSocket Architecture                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   Browser ──► Nginx ──► Daphne (ASGI) ──► ChatConsumer  │
│      │                                          │        │
│      │                                          ▼        │
│      │                                    Redis Layer    │
│      │                                          │        │
│      │                                          ▼        │
│      │◄────────────────────────── Other Daphne instances │
│                                                          │
│   Multi-instance broadcasting через Redis Channel Layer │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 4.2 WebSocket Consumer

```python
# backend/apps/chat/consumers.py

class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for chat rooms.
    Handles: messages, typing indicators, read receipts.
    """

    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"chat_{self.room_id}"
        self.user = self.scope.get("user")

        # Authentication check
        if isinstance(self.user, AnonymousUser):
            await self.close(code=4001)  # Unauthorized
            return

        # Authorization check
        room = await self.get_room()
        if not await self.user_has_access(room):
            await self.close(code=4003)  # Forbidden
            return

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Send message history
        messages = await self.get_message_history()
        await self.send_json({"type": "message_history", "messages": messages})

    async def receive_json(self, content):
        message_type = content.get("type")

        if message_type == "message":
            await self.handle_message(content)
        elif message_type == "typing":
            await self.handle_typing(content)
        elif message_type == "read_batch":
            await self.handle_read_batch(content)

    async def handle_message(self, content):
        text = content.get("content", "").strip()
        if not text:
            return

        message = await self.save_message(text)
        message_data = await self.serialize_message(message)

        # Broadcast to all room members
        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "chat_message", "message": message_data},
        )
```

### 4.3 JWT Auth Middleware

```python
# backend/apps/chat/middleware.py

"""
SECURITY NOTE:
JWT tokens are passed via query parameters in WebSocket connections.
This is a common pattern but has security implications:
- Tokens may appear in server logs
- Tokens may be cached by proxies

Mitigations:
- Access tokens have short TTL (15 minutes)
- HTTPS in production
"""

@database_sync_to_async
def get_user_from_token(token_key: str) -> User | AnonymousUser:
    """Validate JWT token and return user."""
    try:
        access_token = AccessToken(token_key)
        user_id = access_token["user_id"]
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware to authenticate WebSocket connections using JWT tokens.
    Token is passed as query parameter: ws://host/ws/chat/room_id/?token=xxx
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        query_params = parse_qs(query_string)
        token_list = query_params.get("token", [])

        if token_list:
            scope["user"] = await get_user_from_token(token_list[0])
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
```

### 4.4 Batch Operations (N+1 Prevention)

```python
# backend/apps/chat/consumers.py

@database_sync_to_async
def mark_messages_read_batch(self, message_ids: list[str]) -> int:
    """Mark multiple messages as read in a single query."""
    # Validate UUIDs (skip temporary IDs like "temp-123")
    valid_ids = []
    for mid in message_ids:
        try:
            uuid.UUID(mid)
            valid_ids.append(mid)
        except ValueError:
            continue

    if not valid_ids:
        return 0

    # Single UPDATE query instead of N queries
    return (
        Message.objects.filter(id__in=valid_ids, room_id=self.room_id)
        .exclude(sender=self.user)  # Don't mark own messages
        .update(is_read=True)
    )
```

---

## 5. Feature Flags & A/B Testing

### 5.1 Unleash Integration

```python
# backend/apps/core/feature_flags.py

# Feature flags (on/off toggles)
FEATURE_FLAGS = [
    "semantic_search_enabled",
    "chat_reactions_enabled",
]

# Experiments (multi-variant)
EXPERIMENTS = [
    "tutor_card_experiment",
    "checkout_flow_experiment",
]


class UnleashClientHolder:
    """Singleton holder for Unleash client."""

    _instance: UnleashClient | None = None

    @classmethod
    def get_client(cls) -> UnleashClient:
        if cls._instance is None:
            cls._instance = UnleashClient(
                url=UNLEASH_URL,
                app_name=UNLEASH_APP_NAME,
                custom_headers={"Authorization": UNLEASH_API_TOKEN},
            )
            cls._instance.initialize_client()
            atexit.register(cls.cleanup)  # Cleanup on shutdown

        return cls._instance
```

### 5.2 API для Feature Flags

```python
# backend/apps/core/feature_flags.py

def is_enabled(flag: str, user: "User | None" = None) -> bool:
    """Check if feature flag is enabled (on/off toggle)."""
    context = {}
    if user is not None:
        context["userId"] = str(user.id)

    try:
        client = get_unleash_client()
        return client.is_enabled(flag, context)
    except Exception:
        return False  # Fail closed


def get_variant(flag: str, user: "User | None" = None) -> str:
    """Get experiment variant for user."""
    context = {}
    if user is not None:
        context["userId"] = str(user.id)

    try:
        client = get_unleash_client()
        variant = client.get_variant(flag, context)
        return variant.get("name", "control") if variant else "control"
    except Exception:
        return "control"  # Default to control


def get_all_flags(user: "User | None" = None) -> dict:
    """Get all feature flags and experiments for frontend bootstrap."""
    return {
        "flags": {flag: is_enabled(flag, user) for flag in FEATURE_FLAGS},
        "experiments": {exp: get_variant(exp, user) for exp in EXPERIMENTS},
    }
```

---

## 6. Async Tasks & Scheduling

### 6.1 Celery Patterns

```python
# Idempotent task with retries
@shared_task(bind=True, max_retries=3)
def process_payment(self, payment_id: str):
    try:
        # ... processing logic
    except TransientError as e:
        # Exponential backoff: 60s, 120s, 240s
        self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


# Periodic task (Celery Beat)
@shared_task
def publish_outbox_events():
    """Runs every 1 second via Celery Beat."""
    # ... see section 1.6
```

### 6.2 Celery Beat Configuration

```python
# config/celery.py

app.conf.beat_schedule = {
    "publish-outbox-events": {
        "task": "apps.events.tasks.publish_outbox_events",
        "schedule": 1.0,  # Every second
    },
}
```

### 6.3 Task Chaining Pattern

```python
# Payment processing flow
# confirm() endpoint:
simulate_payment_provider.delay(payment_id, card_number)

# simulate_payment_provider:
process_webhook_event.delay(event_type, payment_intent_id)

# process_webhook_event (on success):
process_successful_payment.delay(payment_id)
```

---

## 7. Ключевые файлы проекта

| Файл | Описание |
|------|----------|
| [events/models.py](backend/apps/events/models.py) | OutboxEvent model (Transactional Outbox) |
| [events/producer.py](backend/apps/events/producer.py) | Thread-safe Kafka producer singleton |
| [events/tasks.py](backend/apps/events/tasks.py) | Celery task для публикации событий |
| [tutors/signals.py](backend/apps/tutors/signals.py) | Django signals с transaction.on_commit |
| [payments/models.py](backend/apps/payments/models.py) | Payment model с idempotency |
| [payments/tasks.py](backend/apps/payments/tasks.py) | Payment processing tasks |
| [chat/consumers.py](backend/apps/chat/consumers.py) | WebSocket consumer |
| [chat/middleware.py](backend/apps/chat/middleware.py) | JWT auth для WebSocket |
| [core/feature_flags.py](backend/apps/core/feature_flags.py) | Unleash integration |
| [handler/handler.go](services/search/internal/handler/handler.go) | Go event handler |
| [kafka/consumer.go](services/search/internal/kafka/consumer.go) | Go Kafka consumer |

---

*Документ создан на основе реального кода проекта nextjs-django-tutors.*
