# Конспект к собеседованию Python/Backend

---

## Часть 1: Общие вопросы по программированию

### 1.1 ООП — Принципы

**Абстракция** — скрытие сложных деталей реализации, предоставление упрощённого интерфейса.

**Инкапсуляция** — объединение данных и методов в классе; сокрытие внутренней реализации (`_protected`, `__private`).

**Наследование** — создание нового класса на основе существующего с переиспользованием атрибутов и методов.

**Полиморфизм** — единый интерфейс для разных типов объектов (один метод — разное поведение).

---

### 1.2 SOLID

| Принцип | Суть |
|---------|------|
| **S** — Single Responsibility | Один класс = одна ответственность |
| **O** — Open/Closed | Открыт для расширения, закрыт для модификации (используй абстракции) |
| **L** — Liskov Substitution | Подклассы должны быть взаимозаменяемы с базовым классом |
| **I** — Interface Segregation | Много специализированных интерфейсов лучше одного общего |
| **D** — Dependency Inversion | Зависеть от абстракций, а не от конкретных реализаций |

---

### 1.3 Паттерны проектирования

#### Порождающие
- **Фабрика** — метод создания объектов без указания конкретного класса
- **Синглтон** — единственный экземпляр класса
- **Строитель** — пошаговое создание сложных объектов (цепочка методов, `build()`)

#### Поведенческие
- **Итератор** — последовательный обход элементов (`__iter__`, `__next__`)
- **Стратегия** — семейство взаимозаменяемых алгоритмов
- **Наблюдатель (PubSub)** — подписка/уведомление об изменениях

#### Структурные
- **Адаптер** — приведение интерфейса к ожидаемому
- **Фасад** — упрощённый интерфейс к сложной подсистеме

---

### 1.4 Алгоритмическая сложность (Big O)

| Структура | Доступ | Поиск | Вставка | Удаление |
|-----------|--------|-------|---------|----------|
| **list** | O(1) | O(n) | O(n)* | O(n) |
| **dict** | O(1) | O(1) | O(1) | O(1) |
| **set** | — | O(1) | O(1) | O(1) |

*`append()` — O(1) амортизированно; `insert()` в середину — O(n)

**Сортировка Python (Timsort)**: O(n log n)

---

### 1.5 Хеш-таблица

- Структура данных для O(1) доступа по ключу
- Использует хеш-функцию для вычисления индекса
- Коллизии решаются цепочками или открытой адресацией
- Основа `dict` и `set` в Python

---

### 1.6 REST API

**Принципы REST:**
- Ресурсы идентифицируются URI
- Стандартные HTTP-методы: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Stateless — сервер не хранит состояние клиента
- Представление данных (JSON, XML)

**Идемпотентные методы:** GET, PUT, DELETE (повторный вызов не меняет результат)  
**Неидемпотентные:** POST, PATCH

---

### 1.7 HTTP Status Codes

| Код | Значение |
|-----|----------|
| 200 | OK |
| 201 | Created |
| 301/302 | Redirect |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |
| 502/504 | Bad Gateway / Timeout |

---

### 1.8 CAP-теорема

В распределённой системе можно обеспечить только 2 из 3:
- **C**onsistency — согласованность данных
- **A**vailability — доступность
- **P**artition Tolerance — устойчивость к разделению сети

---

### 1.9 ACID vs BASE

**ACID** (реляционные БД):
- Atomicity — атомарность
- Consistency — согласованность  
- Isolation — изолированность
- Durability — долговечность

**BASE** (NoSQL):
- Basically Available
- Soft state
- Eventually consistent

---

### 1.10 Микросервисы vs Монолит

| Микросервисы | Монолит |
|--------------|---------|
| Независимое масштабирование | Простота разработки |
| Отказоустойчивость | Простота отладки |
| Гибкость технологий | Меньше накладных расходов |
| Сложность управления | Труднее масштабировать |

---

## Часть 2: Python/Backend

### 2.1 Интерпретатор CPython

1. Исходный код → **байт-код** (`.pyc`)
2. Байт-код выполняется **PVM** (Python Virtual Machine)
3. Python — интерпретируемый язык с динамической типизацией

---

### 2.2 Типы данных

**Неизменяемые (immutable):** `int`, `float`, `str`, `tuple`, `frozenset`, `bool`, `None`  
**Изменяемые (mutable):** `list`, `dict`, `set`, пользовательские классы

**Хешируемые** — неизменяемые объекты, могут быть ключами `dict`/элементами `set`

```python
a == b  # сравнение значений
a is b  # сравнение идентичности (один объект в памяти)
```

---

### 2.3 Функции

**Передача аргументов:** по ссылке на объект
- Неизменяемые — создаётся новый объект при изменении
- Изменяемые — изменения видны снаружи функции

```python
def func(arg1, *args, kwarg1="default", **kwargs):
    pass
```

---

### 2.4 Итераторы и Генераторы

**Итератор** — объект с методами `__iter__()` и `__next__()`

**Генератор** — функция с `yield`, возвращает значения лениво (по требованию)

```python
def gen(n):
    for i in range(n):
        yield i

# Генераторное выражение
g = (x**2 for x in range(10))
```

---

### 2.5 Декораторы

Функция, модифицирующая поведение другой функции. Применяются **снизу вверх**.

```python
def decorator(func):
    def wrapper(*args, **kwargs):
        # до
        result = func(*args, **kwargs)
        # после
        return result
    return wrapper
```

---

### 2.6 Менеджеры контекста

```python
class MyContext:
    def __enter__(self):
        return self
    def __exit__(self, exc_type, exc_val, tb):
        # cleanup
        pass
```

Асинхронный: `__aenter__`, `__aexit__`

---

### 2.7 ООП в Python

**Методы класса:**
- `@staticmethod` — не имеет доступа к `self`/`cls`
- `@classmethod` — первый аргумент `cls`, доступ к атрибутам класса
- `@property` — геттер как атрибут

**Приватность:**
- `_protected` — конвенция
- `__private` — name mangling (`_ClassName__private`)

**`__repr__`** — для отладки, должен быть однозначным  
**`__str__`** — для пользователя, читаемый текст

---

### 2.8 Абстрактные классы

```python
from abc import ABC, abstractmethod

class Base(ABC):
    @abstractmethod
    def method(self):
        pass
```

---

### 2.9 GIL (Global Interpreter Lock)

- Mutex, позволяющий только одному потоку выполнять байт-код
- Причина: безопасность управления памятью в CPython
- **Потоки** — для I/O-bound задач
- **Процессы** — для CPU-bound задач (multiprocessing)

---

### 2.10 Асинхронное программирование

**Ключевые концепции:**
- `async def` — корутина
- `await` — точка приостановки
- Event Loop — планировщик задач
- Конкурентность, но не параллелизм (один поток)

```python
import asyncio

async def main():
    await asyncio.gather(task1(), task2())

asyncio.run(main())
```

**TaskGroup (3.11+):**
```python
async with asyncio.TaskGroup() as tg:
    tg.create_task(coro1())
    tg.create_task(coro2())
```

---

### 2.11 Проблемы многопоточности

**Race Condition** — несколько потоков конкурируют за ресурс  
**Deadlock** — взаимная блокировка потоков

Решения: `Lock`, `Semaphore`, `Condition`

---

### 2.12 Базы данных — SQL

**JOIN:**
- `INNER JOIN` — только совпадения
- `LEFT JOIN` — все из левой + совпадения справа
- `RIGHT JOIN` — все из правой + совпадения слева
- `FULL OUTER JOIN` — все записи из обеих таблиц

**Оконные функции:**
```sql
SUM(col) OVER (PARTITION BY group ORDER BY date)
```

---

### 2.13 Транзакции — Уровни изоляции

| Уровень | Dirty Read | Non-Repeatable | Phantom |
|---------|------------|----------------|---------|
| READ UNCOMMITTED | ✓ | ✓ | ✓ |
| READ COMMITTED | ✗ | ✓ | ✓ |
| REPEATABLE READ | ✗ | ✗ | ✓ |
| SERIALIZABLE | ✗ | ✗ | ✗ |

---

### 2.14 Индексы

- **Кластерный** — определяет физический порядок данных (один на таблицу)
- **Некластерный** — отдельная структура со ссылками на данные

**EXPLAIN** — анализ плана запроса. Признаки проблем:
- `Seq Scan` на больших таблицах
- Высокая стоимость (cost)
- Отсутствие использования индексов

---

### 2.15 Django

**Типы views:**
- FBV (Function-Based Views) — простые, явные
- CBV (Class-Based Views) — переиспользуемые, структурированные
- ViewSet (DRF) — CRUD из коробки

**ORM-оптимизация:**
- `select_related` — JOIN для ForeignKey/OneToOne
- `prefetch_related` — отдельные запросы для ManyToMany

```python
Q(field1=val) & Q(field2=val)  # AND
Q(field1=val) | Q(field2=val)  # OR
F('field1') - F('field2')       # операции над полями
```

---

### 2.16 FastAPI

**Особенности:**
- Асинхронный из коробки
- Автодокументация (Swagger/ReDoc)
- Валидация через Pydantic
- Dependency Injection через `Depends()`

```python
@app.get("/items/")
async def read(db: Session = Depends(get_db)):
    pass
```

---

### 2.17 Тестирование (pytest)

**Фикстуры:** `@pytest.fixture` — подготовка данных/объектов

**Параметризация:**
```python
@pytest.mark.parametrize("a,b,expected", [(1,2,3), (0,0,0)])
def test_add(a, b, expected):
    assert add(a, b) == expected
```

**Моки:** `unittest.mock.patch` — подмена объектов

---

### 2.18 Docker

**Контейнер vs VM:**
- Контейнер — изоляция на уровне ОС, общее ядро
- VM — полная виртуализация, своё ядро

**Основные команды:**
```bash
docker build -t name .
docker run -d -p 8000:8000 name
docker exec -it container /bin/bash
```

**Docker Compose** — оркестрация нескольких контейнеров через `docker-compose.yml`

---

### 2.19 Kubernetes — Основные абстракции

| Абстракция | Назначение |
|------------|------------|
| **Pod** | Минимальная единица, 1+ контейнеров |
| **Deployment** | Декларативное управление репликами |
| **Service** | Сетевой доступ к подам, балансировка |
| **Ingress** | Внешний HTTP-доступ, маршрутизация |
| **ConfigMap** | Конфигурация в виде key-value |
| **Secret** | Хранение чувствительных данных |

---

### 2.20 Git

**Основные команды:**
```bash
git rebase main      # перебазирование (линейная история)
git merge main       # слияние (merge-коммит)
git cherry-pick <hash>  # применить конкретный коммит
git reset HEAD^ -- file # откат файла
```

**Rebase vs Merge:**
- `rebase` — чистая линейная история, переписывает коммиты
- `merge` — сохраняет историю, создаёт merge-коммит

---

## Часть 3: Дополнительные темы

### 3.1 Python 3.10+ фичи

**Pattern Matching (3.10):**
```python
match command:
    case ["quit"]: exit()
    case ["load", filename]: load(filename)
    case _: print("Unknown")
```

**Типизация:**
- `Union[int, str]` или `int | str` (3.10+)
- `Optional[str]` = `str | None`
- `TypedDict` — типизированные словари
- `Protocol` — структурная типизация (duck typing с проверкой)

**dataclasses:**
```python
@dataclass
class User:
    name: str
    age: int = 0
```

**Walrus operator:** `if (n := len(data)) > 10:`

---

### 3.2 Безопасность

**OWASP Top 10:**
- SQL Injection — используй параметризованные запросы
- XSS — экранируй вывод, CSP headers
- CSRF — токены в формах
- Broken Authentication — rate limiting, secure sessions

**Пароли:** никогда plain text, используй `bcrypt` / `Argon2`

**JWT:**
- Access token — короткоживущий (15 мин)
- Refresh token — долгоживущий (7 дней), httpOnly cookie
- Хранить: access в памяти, refresh в httpOnly cookie

**CORS:** ограничивай `Access-Control-Allow-Origin`

---

### 3.3 Кэширование

**Redis — структуры данных:**
- `STRING` — простые значения, счётчики
- `HASH` — объекты
- `LIST` — очереди
- `SET/ZSET` — уникальные значения, рейтинги
- `TTL` — время жизни ключа

**Стратегии инвалидации:**
- **Cache-aside** — приложение управляет кэшем
- **Write-through** — запись в кэш и БД одновременно
- **Write-behind** — асинхронная запись в БД

**Redis vs Memcached:** Redis — больше структур, persistence; Memcached — проще, быстрее для простых случаев

---

### 3.4 Очереди сообщений

**Celery:**
```python
@celery.task
def send_email(to, subject):
    ...

send_email.delay("user@example.com", "Hello")
```

**Брокеры:**
- **Redis** — простой, быстрый
- **RabbitMQ** — надёжный, сложная маршрутизация
- **Kafka** — высокая пропускная способность, лог событий

**Паттерны:**
- Retry с exponential backoff
- Dead Letter Queue — для failed messages
- Idempotency — повторный вызов не меняет результат

---

### 3.5 Продвинутые концепции БД

**N+1 проблема:**
```python
# Плохо: N+1 запросов
for order in Order.objects.all():
    print(order.user.name)

# Хорошо: 1 запрос
Order.objects.select_related('user').all()
```

**Масштабирование:**
- **Партиционирование** — разбиение таблицы по критерию (дата, регион)
- **Шардирование** — данные на разных серверах
- **Репликация** — master-slave (чтение с реплик), master-master

**Блокировки:**
- **Optimistic** — проверка версии при сохранении
- **Pessimistic** — `SELECT ... FOR UPDATE`

**Soft delete:** `is_deleted=True` вместо удаления

---

### 3.6 API Design

**REST vs GraphQL vs gRPC:**
| | REST | GraphQL | gRPC |
|--|------|---------|------|
| Формат | JSON | JSON | Protobuf |
| Гибкость | Фиксированные endpoints | Клиент выбирает поля | Строгие контракты |
| Когда | CRUD, публичные API | Сложные связи, mobile | Микросервисы |

**Версионирование:** `/api/v1/`, header `Accept-Version`, query `?version=1`

**Пагинация:**
- **Offset:** `?page=2&limit=20` — просто, но медленно на больших offset
- **Cursor:** `?cursor=abc123` — стабильно, быстро

**Rate limiting:** Token bucket, sliding window; возвращай `429 Too Many Requests`

---

### 3.7 Observability

**Три столпа:**
- **Logs** — события (structured JSON logging)
- **Metrics** — числовые показатели (Prometheus + Grafana)
- **Traces** — путь запроса через систему (OpenTelemetry, Jaeger)

**Structured logging:**
```python
logger.info("User created", extra={"user_id": 123, "email": "..."})
```

**Health checks:**
- `/health/live` — приложение запущено
- `/health/ready` — готово принимать трафик

---

### 3.8 CI/CD

**Пайплайн:** lint → test → build → deploy

**Стратегии деплоя:**
- **Blue-green** — два окружения, мгновенное переключение
- **Canary** — постепенный rollout (1% → 10% → 100%)
- **Rolling** — постепенная замена инстансов

**Feature flags:** включение/выключение фичей без деплоя

---

### 3.9 Системный дизайн

**Масштабирование:**
- **Вертикальное** — больше ресурсов одному серверу
- **Горизонтальное** — больше серверов

**Load Balancer:**
- Round Robin — по очереди
- Least Connections — к наименее загруженному
- IP Hash — sticky sessions

**Connection pooling:** переиспользование соединений к БД (PgBouncer)

**Circuit Breaker:** при ошибках временно отключает вызовы к сервису

**CDN:** статика ближе к пользователю (CloudFront, Cloudflare)

---

### 3.10 Python Internals (продвинутое)

**Descriptor Protocol:**
```python
class Validator:
    def __get__(self, obj, type): ...
    def __set__(self, obj, value): ...
```

**MRO (Method Resolution Order):** порядок поиска методов при множественном наследовании (C3 linearization)

**`__slots__`:** фиксированный набор атрибутов, экономия памяти
```python
class Point:
    __slots__ = ['x', 'y']
```

**functools:**
- `@lru_cache` — мемоизация
- `@wraps` — сохранение метаданных декорируемой функции
- `partial` — частичное применение

---

### 3.11 Pydantic

```python
from pydantic import BaseModel, Field, validator

class User(BaseModel):
    name: str
    age: int = Field(ge=0, le=150)

    @validator('name')
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError('empty name')
        return v
```

**Settings:**
```python
class Settings(BaseSettings):
    database_url: str

    class Config:
        env_file = '.env'
```

---

### 3.12 SQLAlchemy

**ORM vs Core:**
- ORM — работа с объектами (`session.query(User)`)
- Core — SQL-выражения (`select(users_table)`)

**Session:**
```python
with Session(engine) as session:
    user = session.get(User, 1)
    session.commit()
```

**Загрузка связей:**
- `lazy='select'` — отдельный запрос при обращении (default)
- `lazy='joined'` — JOIN сразу
- `lazy='subquery'` — подзапрос

**Alembic:** миграции для SQLAlchemy
```bash
alembic revision --autogenerate -m "add users"
alembic upgrade head
```

---

### 3.13 Алгоритмы и структуры данных

**Структуры:**
- **Стек** — LIFO (`append`, `pop`)
- **Очередь** — FIFO (`collections.deque`)
- **Дерево** — BST: поиск O(log n), обход: in-order, pre-order, post-order
- **Граф** — список смежности `{node: [neighbors]}`

**Алгоритмы:**
- **Бинарный поиск** — O(log n), требует сортированный массив
- **Two pointers** — два указателя с концов/начала
- **Sliding window** — окно фиксированного/переменного размера
- **BFS** — поиск в ширину (очередь), кратчайший путь
- **DFS** — поиск в глубину (стек/рекурсия)

**Динамическое программирование:** разбиение на подзадачи + мемоизация

---

### 3.14 DDD (Domain-Driven Design)

| Концепция | Суть |
|-----------|------|
| **Entity** | Объект с уникальным ID (User, Order) |
| **Value Object** | Неизменяемый, без ID (Money, Address) |
| **Aggregate** | Кластер сущностей с корнем (Order + OrderItems) |
| **Repository** | Абстракция доступа к данным |
| **Service** | Бизнес-логика, не принадлежащая сущности |
| **Bounded Context** | Граница модели, свой ubiquitous language |

---

### 3.15 Code Review

**На что смотреть:**
- Читаемость и именование
- SOLID, DRY, KISS
- Обработка ошибок и edge cases
- Тесты: покрытие, граничные случаи
- Безопасность (SQL injection, XSS)
- Производительность (N+1, лишние запросы)

**Как давать фидбек:** конкретно, с примерами, без перехода на личности

---

## Быстрые ответы на частые вопросы

| Вопрос | Ответ |
|--------|-------|
| `is` vs `==` | `is` — идентичность объектов, `==` — равенство значений |
| `*args`, `**kwargs` | Позиционные/именованные аргументы произвольной длины |
| Mutable default arg | Опасно! Используй `None` и создавай внутри функции |
| GIL обходится через | `multiprocessing`, `asyncio` (для I/O) |
| `__new__` vs `__init__` | `__new__` создаёт объект, `__init__` инициализирует |
| Metaclass | Класс, создающий классы (`type` по умолчанию) |
| Duck typing | Если ходит как утка и крякает — это утка |
