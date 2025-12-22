# Подготовка к собеседованию по фронтенду

> Документ для освежения знаний перед собеседованием. Все примеры — из реального проекта nextjs-django-tutors.

## Содержание

1. [JavaScript Core](#1-javascript-core)
2. [DOM & Browser](#2-dom--browser)
3. [CSS & Layout](#3-css--layout)
4. [React Core](#4-react-core)
5. [React Hooks](#5-react-hooks)
6. [React Advanced](#6-react-advanced)
7. [TypeScript](#7-typescript)
8. [State Management](#8-state-management)
9. [Forms & Validation](#9-forms--validation)
10. [Performance](#10-performance)
11. [API Integration](#11-api-integration)
12. [Next.js](#12-nextjs)
13. [Authentication & Security](#13-authentication--security)
14. [Testing](#14-testing)
15. [Real-time & WebSockets](#15-real-time--websockets)
16. [Tooling & Build](#16-tooling--build)
17. [Patterns из проекта](#17-patterns-из-проекта)

---

## 1. JavaScript Core

### 1.1 Типы данных и сравнение

**Типы данных:** `number`, `string`, `boolean`, `null`, `undefined`, `object`, `symbol`, `bigint`.

**`null` vs `undefined`:**
- `undefined` — переменная объявлена, но не инициализирована
- `null` — явное отсутствие значения

**`==` vs `===`:**
- `==` — сравнение с приведением типов (`"5" == 5` → `true`)
- `===` — строгое сравнение без приведения (`"5" === 5` → `false`)

### 1.2 Переменные (var, let, const, hoisting)

| | var | let | const |
|---|---|---|---|
| Область видимости | function | block | block |
| Повторное объявление | Да | Нет | Нет |
| Hoisting | Да (undefined) | Да (TDZ) | Да (TDZ) |
| Переприсваивание | Да | Да | Нет |

**Hoisting** — JavaScript "поднимает" объявления переменных и функций в начало области видимости. Но для `let`/`const` есть **Temporal Dead Zone (TDZ)** — нельзя использовать до объявления.

### 1.3 Event Loop (microtasks, macrotasks)

Event Loop обеспечивает асинхронность в однопоточном JavaScript.

**Порядок выполнения:**
1. Выполнить весь синхронный код
2. Выполнить все **microtasks** (Promise.then, queueMicrotask)
3. Выполнить одну **macrotask** (setTimeout, setInterval, I/O)
4. Повторить

```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// Вывод: 1, 4, 3, 2
```

**Пример из проекта** — `api-client.ts` использует Promise для token refresh:

```typescript
// src/lib/api-client.ts:82-117
async function triggerSessionRefresh(): Promise<string | null> {
  // Return existing refresh promise if one is in progress (deduplication)
  if (sessionRefreshPromise) {
    return sessionRefreshPromise;  // Все concurrent calls ждут один Promise
  }

  sessionRefreshPromise = (async () => {
    try {
      const newToken = await onSessionRefreshNeeded?.();
      if (newToken) return newToken;
      if (onRefreshFailed) onRefreshFailed();
      return null;
    } catch {
      if (onRefreshFailed) onRefreshFailed();
      return null;
    }
  })();

  try {
    return await sessionRefreshPromise;
  } finally {
    sessionRefreshPromise = null;  // Cleanup после завершения
  }
}
```

### 1.4 Замыкания (Closures)

**Замыкание** — функция, которая "запоминает" переменные из внешней области видимости даже после её завершения.

```javascript
function createCounter() {
  let count = 0;
  return function() {
    return ++count;  // count доступен благодаря замыканию
  };
}
const counter = createCounter();
counter(); // 1
counter(); // 2
```

**Пример из проекта** — callback в `use-chat.ts` использует замыкание для доступа к `wsRef`:

```typescript
// src/hooks/use-chat.ts:55-143
const connect = useCallback(() => {
  // wsRef доступен благодаря замыканию
  if (wsRef.current?.readyState === WebSocket.OPEN) {
    return;
  }

  const ws = new WebSocket(wsUrl);
  wsRef.current = ws;  // Сохраняем в ref через замыкание

  ws.onclose = (event) => {
    // reconnect callback имеет доступ к connect через замыкание
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current++;
        connect();  // Рекурсивный вызов через замыкание
      }, delay);
    }
  };
}, [roomId, token, ...]);
```

### 1.5 this и контекст (call, apply, bind)

**`this`** — контекст выполнения функции, зависит от способа вызова.

| Способ вызова | this указывает на |
|---|---|
| Метод объекта | Сам объект |
| Обычная функция | `window` (strict: `undefined`) |
| Стрелочная функция | Лексически (от родителя) |
| new | Новый объект |
| call/apply/bind | Указанный объект |

```javascript
const obj = {
  name: 'Alice',
  greet() { console.log(this.name); }
};
obj.greet(); // 'Alice'

const fn = obj.greet;
fn(); // undefined (потерян контекст)

const boundFn = obj.greet.bind(obj);
boundFn(); // 'Alice'
```

**call vs apply vs bind:**
- `call(thisArg, arg1, arg2)` — вызывает с аргументами
- `apply(thisArg, [args])` — вызывает с массивом аргументов
- `bind(thisArg)` — возвращает новую функцию

### 1.6 Промисы и async/await

**Promise** — объект для работы с асинхронными операциями.

```javascript
const promise = new Promise((resolve, reject) => {
  setTimeout(() => resolve('done'), 1000);
});

promise
  .then(result => console.log(result))
  .catch(error => console.error(error))
  .finally(() => console.log('cleanup'));
```

**async/await** — синтаксический сахар над Promise:

```javascript
async function fetchData() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}
```

**Пример из проекта** — token refresh в `auth.ts`:

```typescript
// src/auth.ts:186-261
async function refreshAccessToken(token: {...}): Promise<RefreshResult> {
  const existingEntry = refreshCache.get(refreshTokenSuffix);
  if (existingEntry?.result) {
    return existingEntry.result;  // Кэшированный результат
  }

  const refreshPromise = (async (): Promise<RefreshResult> => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: token.refreshToken }),
      });

      if (!res.ok) {
        return { ...token, error: 'RefreshAccessTokenError' };
      }

      const data = await res.json();
      return {
        accessToken: data.access,
        refreshToken: data.refresh ?? token.refreshToken,
        accessTokenExpires: Date.now() + ACCESS_TOKEN_LIFETIME_MS,
      };
    } catch {
      return { ...token, error: 'RefreshAccessTokenError' };
    }
  })();

  refreshCache.set(refreshTokenSuffix, { promise: refreshPromise, timestamp: Date.now() });
  const result = await refreshPromise;
  return result;
}
```

### 1.7 Копирование (shallow vs deep)

**Shallow copy** — копируются только ссылки на вложенные объекты:
```javascript
const original = { a: 1, nested: { b: 2 } };
const shallow = { ...original };
shallow.nested.b = 99;  // Изменит и original!
```

**Deep copy** — полное копирование всех уровней:
```javascript
const deep = structuredClone(original);  // Современный способ
const deep2 = JSON.parse(JSON.stringify(original));  // Старый способ
```

**Пример из проекта** — Zustand store создаёт новые объекты для иммутабельности:

```typescript
// src/stores/chat-store.ts:48-68
addMessage: (message) =>
  set((state) => {
    // Создаём новый массив (shallow copy + новый элемент)
    if (state.messages.some((msg) => msg.id === message.id)) {
      return state;  // Не мутируем, возвращаем тот же объект
    }
    return { messages: [...state.messages, message] };  // Новый массив
  }),
```

**Ключевые моменты:**
- React требует иммутабельных обновлений state
- `...spread` создаёт shallow copy
- Для глубокого копирования используй `structuredClone()`

---

## 2. DOM & Browser

### 2.1 Работа с DOM (querySelector, classList)

```javascript
// Выбор элементов
document.getElementById('id');           // По ID
document.querySelector('.class');        // Первый по селектору
document.querySelectorAll('div.item');   // Все по селектору

// Работа с классами
element.classList.add('active');
element.classList.remove('active');
element.classList.toggle('active');
element.classList.contains('active');

// Работа с атрибутами
element.setAttribute('data-id', '123');
element.getAttribute('data-id');
element.textContent = 'New text';
element.innerHTML = '<span>HTML</span>';
```

### 2.2 События (bubbling, capturing, delegation)

**Event Bubbling** — событие "всплывает" от target к родителям.

**Event Capturing** — событие "погружается" от родителей к target.

```javascript
element.addEventListener('click', handler);          // Bubbling (default)
element.addEventListener('click', handler, true);    // Capturing

event.stopPropagation();  // Остановить всплытие
event.preventDefault();   // Предотвратить действие по умолчанию
```

**`event.target` vs `event.currentTarget`:**
- `target` — элемент, на котором произошло событие
- `currentTarget` — элемент, на котором висит обработчик

**Event Delegation** — один обработчик на родителе вместо многих на детях:

```javascript
// Вместо 100 обработчиков на каждой кнопке
document.querySelector('.container').addEventListener('click', (e) => {
  if (e.target.matches('.btn')) {
    handleClick(e.target);
  }
});
```

### 2.3 Storage (localStorage, sessionStorage, cookies)

| | localStorage | sessionStorage | cookies |
|---|---|---|---|
| Время жизни | Бессрочно | До закрытия вкладки | Настраиваемо |
| Размер | ~5MB | ~5MB | ~4KB |
| Доступ | Только клиент | Только клиент | Клиент + сервер |
| Передача | Не передаётся | Не передаётся | С каждым запросом |

**Пример из проекта** — draft persistence в wizard:

```typescript
// src/lib/experiment-tracking.ts:21-37
function getSessionId(): string {
  if (sessionId) return sessionId;

  if (typeof window === 'undefined') {
    return '';  // SSR-safe check
  }

  const stored = sessionStorage.getItem('experiment_session_id');
  if (stored) {
    sessionId = stored;
    return stored;
  }

  // Генерируем новый ID для сессии
  sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  sessionStorage.setItem('experiment_session_id', sessionId);
  return sessionId;
}
```

---

## 3. CSS & Layout

### 3.1 Box Model

Каждый элемент — прямоугольник: **content → padding → border → margin**.

```css
.box {
  box-sizing: content-box;  /* width = только content (default) */
  box-sizing: border-box;   /* width = content + padding + border */
}
```

### 3.2 Positioning

| Position | Описание |
|---|---|
| `static` | По потоку (default) |
| `relative` | По потоку + смещение от исходной позиции |
| `absolute` | Относительно ближайшего positioned родителя |
| `fixed` | Относительно viewport |
| `sticky` | relative + fixed при скролле |

### 3.3 Flexbox vs Grid

**Flexbox** — одномерный (строка или колонка):
```css
.container {
  display: flex;
  justify-content: center;  /* Горизонтальное выравнивание */
  align-items: center;      /* Вертикальное выравнивание */
  gap: 1rem;
}
```

**Grid** — двумерный (строки и колонки):
```css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 1rem;
}
```

**Когда что использовать:**
- Flexbox — навигация, карточки в ряд, центрирование
- Grid — сложные layouts, галереи, dashboard

### 3.4 Responsive design (media queries)

```css
/* Mobile first */
.container { padding: 1rem; }

@media (min-width: 768px) {
  .container { padding: 2rem; }
}

@media (min-width: 1024px) {
  .container { padding: 3rem; }
}
```

**Единицы:**
- `rem` — относительно font-size root элемента
- `em` — относительно font-size родителя
- `vh/vw` — viewport height/width
- `%` — относительно родителя

**Пример из проекта** — хук `useMediaQuery`:

```typescript
// src/hooks/use-media-query.ts
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);  // false на сервере — SSR-safe

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Использование
const isMobile = useMediaQuery('(max-width: 768px)');
```

### 3.5 Tailwind CSS

Utility-first CSS framework — стили через классы.

```tsx
// Пример из проекта: src/app/tutors/page.tsx
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
  {tutors.map((tutor) => (
    <TutorCard key={tutor.id} tutor={tutor} />
  ))}
</div>
```

**Преимущества:**
- Нет переключения между файлами
- Предсказуемые классы
- Легко кастомизировать
- Автоматический tree-shaking

**Функция `cn()` для условных классов:**
```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Использование
<button className={cn('btn', isActive && 'btn-active', className)} />
```

---

## 4. React Core

### 4.1 Virtual DOM и reconciliation

**Virtual DOM** — легковесное представление реального DOM в памяти.

**Reconciliation** — процесс сравнения старого и нового Virtual DOM (diffing) и применения минимальных изменений к реальному DOM.

**Алгоритм:**
1. При изменении state/props создаётся новый Virtual DOM
2. React сравнивает его со старым
3. Вычисляет минимальный набор изменений
4. Применяет изменения к реальному DOM

### 4.2 JSX

**JSX** — синтаксис для описания UI, компилируется в `React.createElement()`.

```tsx
// JSX
const element = <h1 className="title">Hello</h1>;

// Компилируется в
const element = React.createElement('h1', { className: 'title' }, 'Hello');
```

**Правила:**
- Один корневой элемент (или Fragment)
- `className` вместо `class`
- `htmlFor` вместо `for`
- Выражения в `{}`

### 4.3 Props vs State

| Props | State |
|---|---|
| Передаются от родителя | Локальные данные компонента |
| Read-only | Изменяемый через setter |
| Изменение = re-render ребёнка | Изменение = re-render компонента |

### 4.4 Keys в списках

**Key** — уникальный идентификатор для оптимизации reconciliation.

```tsx
// Пример из проекта: src/app/tutors/page.tsx
{tutors.map((tutor) => (
  <TutorCard key={tutor.id} tutor={tutor} />  // key={tutor.id}
))}
```

**Почему не index?**
- При удалении/добавлении элементов индексы меняются
- React может перепутать элементы
- Плохо для анимаций и форм

### 4.5 Controlled vs Uncontrolled компоненты

**Controlled** — значение контролируется React:
```tsx
const [value, setValue] = useState('');
<input value={value} onChange={(e) => setValue(e.target.value)} />
```

**Uncontrolled** — значение в DOM, доступ через ref:
```tsx
const inputRef = useRef<HTMLInputElement>(null);
<input ref={inputRef} />
// inputRef.current.value
```

**Пример из проекта** — controlled форма бронирования:

```tsx
// src/app/tutors/page.tsx:29-31
const [bookingTutor, setBookingTutor] = useState<Tutor | null>(null);
const [selectedDate, setSelectedDate] = useState<Date | null>(null);
const [bookingNotes, setBookingNotes] = useState('');

// ...

<Input
  id="booking-datetime"
  type="datetime-local"
  value={selectedDate?.toISOString().slice(0, 16) ?? ''}
  onChange={(e) => setSelectedDate(new Date(e.target.value))}
/>
```

### 4.6 Жизненный цикл

**Class components:**
- `componentDidMount` → после первого render
- `componentDidUpdate` → после обновления
- `componentWillUnmount` → перед размонтированием

**Function components (хуки):**
```tsx
useEffect(() => {
  // componentDidMount + componentDidUpdate
  return () => {
    // componentWillUnmount
  };
}, [deps]);
```

### 4.7 React.Fragment

Группировка элементов без дополнительного DOM-узла:

```tsx
<>
  <h1>Title</h1>
  <p>Text</p>
</>

// Или с ключом
<React.Fragment key={id}>
  <h1>Title</h1>
</React.Fragment>
```

---

## 5. React Hooks

### 5.1 useState и батчинг

```tsx
const [count, setCount] = useState(0);

// Функциональное обновление для доступа к предыдущему значению
setCount(prev => prev + 1);
```

**Батчинг** — React группирует несколько setState в один re-render:

```tsx
function handleClick() {
  setCount(c => c + 1);
  setName('Alice');
  setAge(25);
  // Один re-render, не три
}
```

### 5.2 useEffect и зависимости

```tsx
useEffect(() => {
  // Код после render

  return () => {
    // Cleanup перед следующим effect или unmount
  };
}, [dep1, dep2]);  // Массив зависимостей
```

**Зависимости:**
- `[]` — только при mount
- `[dep]` — при mount и изменении dep
- Без массива — после каждого render (обычно ошибка)

**Пример из проекта** — WebSocket connection:

```typescript
// src/hooks/use-chat.ts:208-216
useEffect(() => {
  if (token && roomId) {
    connectRef.current();  // Connect при mount
  }

  return () => {
    disconnectRef.current();  // Disconnect при unmount
  };
}, [token, roomId]);
```

### 5.3 useRef

**Два использования:**
1. Доступ к DOM элементам
2. Хранение мутабельного значения без re-render

```tsx
// DOM ref
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current?.focus();

// Мутабельное значение
const countRef = useRef(0);
countRef.current++;  // Не вызывает re-render
```

**Пример из проекта** — предотвращение infinite loops:

```typescript
// src/app/providers.tsx:63-65
const isRefreshingRef = useRef(false);
const lastRefreshedTokenRef = useRef<string | null>(null);

// ...

if (isRefreshingRef.current) {
  return;  // Предотвращаем повторный refresh
}
isRefreshingRef.current = true;
```

### 5.4 useMemo vs useCallback

**useMemo** — мемоизация значения:
```tsx
const expensiveValue = useMemo(() => {
  return computeExpensive(a, b);
}, [a, b]);
```

**useCallback** — мемоизация функции:
```tsx
const handleClick = useCallback(() => {
  doSomething(a);
}, [a]);
```

**Когда использовать:**
- `useMemo` — дорогие вычисления
- `useCallback` — передача функций в оптимизированные компоненты

**Пример из проекта** — мемоизация search params:

```typescript
// src/app/tutors/page.tsx:72-83
const searchParams = useMemo(
  () => ({
    q: params.q || undefined,
    subjects: params.subject ? [params.subject] : undefined,
    minPrice: params.minPrice ?? undefined,
    maxPrice: params.maxPrice ?? undefined,
    format: params.format ?? undefined,
    limit: PAGE_SIZE,
    offset: (params.page - 1) * PAGE_SIZE,
  }),
  [params.q, params.subject, params.minPrice, params.maxPrice, params.format, params.page]
);
```

### 5.5 useLayoutEffect vs useEffect

| useEffect | useLayoutEffect |
|---|---|
| После paint | После DOM update, до paint |
| Асинхронный | Синхронный |
| Большинство случаев | Измерения DOM, предотвращение мерцания |

### 5.6 useReducer vs useState

**useReducer** — для сложной логики состояния:

```tsx
const [state, dispatch] = useReducer(reducer, initialState);

function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    default:
      return state;
  }
}

dispatch({ type: 'increment' });
```

**Когда useReducer:**
- Много связанных state
- Следующее состояние зависит от предыдущего
- Сложная логика обновления

### 5.7 Custom Hooks

Переиспользуемая логика между компонентами.

**Правила:**
- Имя начинается с `use`
- Может использовать другие хуки
- Каждый вызов — отдельный state

**Пример из проекта** — `useMediaQuery`:

```typescript
// src/hooks/use-media-query.ts
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
```

### 5.8 Rules of Hooks

1. **Только на верхнем уровне** — не в циклах, условиях, вложенных функциях
2. **Только в React функциях** — компоненты или custom hooks

```tsx
// НЕПРАВИЛЬНО
if (condition) {
  const [state, setState] = useState();
}

// ПРАВИЛЬНО
const [state, setState] = useState();
if (condition) {
  // использовать state
}
```

---

## 6. React Advanced

### 6.1 Context API

Передача данных без prop drilling.

**Пример из проекта** — `FeatureFlagsProvider`:

```typescript
// src/providers/feature-flags-provider.tsx
const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

export function FeatureFlagsProvider({ children }: FeatureFlagsProviderProps) {
  const [data, setData] = useState<FeatureFlagsData>({ flags: {}, experiments: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await customFetch<ApiResponse<FeatureFlagsData>>(FEATURE_FLAGS_ENDPOINT);
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch feature flags'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  return (
    <FeatureFlagsContext.Provider value={{ ...data, isLoading, error, refetch: fetchFlags }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

// Хуки для использования
export function useFeatureFlags(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  }
  return context;
}

export function useFlag(name: string): boolean {
  const { flags, isLoading } = useFeatureFlags();
  if (isLoading) return false;
  return flags[name] ?? false;
}
```

### 6.2 React.memo

Предотвращает re-render при неизменных props:

```tsx
const TutorCard = React.memo(function TutorCard({ tutor }: Props) {
  return <div>{tutor.name}</div>;
});
```

**Когда использовать:**
- Компонент рендерится часто с теми же props
- Рендер компонента дорогой
- В списках с большим количеством элементов

### 6.3 React.lazy + Suspense (Code Splitting)

```tsx
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

**Преимущества:**
- Меньший initial bundle
- Загрузка по требованию
- Улучшение Time to Interactive

### 6.4 Error Boundaries

Перехватывают ошибки в дереве компонентов:

```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong</h1>;
    }
    return this.props.children;
  }
}
```

### 6.5 Portals

Рендер вне родительского DOM:

```tsx
import { createPortal } from 'react-dom';

function Modal({ children }) {
  return createPortal(
    <div className="modal">{children}</div>,
    document.getElementById('modal-root')
  );
}
```

**Использование:**
- Модальные окна
- Tooltips
- Dropdowns

### 6.6 Stale Closure в хуках

**Проблема:** функция "запоминает" старое значение переменной.

```tsx
// ПРОБЛЕМА
const [count, setCount] = useState(0);

useEffect(() => {
  const id = setInterval(() => {
    console.log(count);  // Всегда 0 (stale closure)
  }, 1000);
  return () => clearInterval(id);
}, []);  // Пустой массив — count "заморожен"

// РЕШЕНИЕ 1: добавить в зависимости
useEffect(() => {...}, [count]);

// РЕШЕНИЕ 2: функциональное обновление
setCount(prev => prev + 1);

// РЕШЕНИЕ 3: useRef
const countRef = useRef(count);
countRef.current = count;
```

**Пример из проекта** — использование refs для избежания stale closure:

```typescript
// src/hooks/use-chat.ts:202-206
const connectRef = useRef(connect);
const disconnectRef = useRef(disconnect);
connectRef.current = connect;
disconnectRef.current = disconnect;

useEffect(() => {
  if (token && roomId) {
    connectRef.current();  // Всегда актуальная версия
  }
  return () => disconnectRef.current();
}, [token, roomId]);
```

### 6.7 HOC vs Render Props vs Hooks

| Паттерн | Описание | Статус |
|---|---|---|
| HOC | Функция, возвращающая компонент | Legacy |
| Render Props | Prop-функция для рендера | Legacy |
| Hooks | Переиспользуемая логика | Современный |

```tsx
// HOC
const withAuth = (Component) => (props) => {
  const auth = useAuth();
  return <Component {...props} auth={auth} />;
};

// Render Props
<DataFetcher render={(data) => <Display data={data} />} />

// Hooks (современный подход)
function Component() {
  const auth = useAuth();
  return <div>{auth.user.name}</div>;
}
```

### 6.8 Compound Components

Компоненты, работающие вместе через общий Context.

**Пример** — Dialog из проекта:

```tsx
// Использование
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Преимущества:**
- Гибкая композиция
- Инкапсуляция логики
- Чистый API

---

## 7. TypeScript

### 7.1 interface vs type

```typescript
// interface — расширяется через extends
interface User {
  name: string;
}
interface Admin extends User {
  role: string;
}

// type — более гибкий
type User = {
  name: string;
};
type Admin = User & { role: string };

// type может быть union, примитивом и т.д.
type Status = 'pending' | 'active' | 'done';
type ID = string | number;
```

**Правило:** используй `interface` для объектов, `type` для остального.

### 7.2 any vs unknown

```typescript
// any — отключает проверку типов
let x: any;
x.foo();  // OK (но может упасть в runtime)

// unknown — безопасный "любой тип"
let y: unknown;
y.foo();  // ОШИБКА: нужна проверка

if (typeof y === 'string') {
  y.toUpperCase();  // OK после narrowing
}
```

**Правило:** используй `unknown` вместо `any`, затем проверяй тип.

### 7.3 Generics

```typescript
// Generic функция
function identity<T>(arg: T): T {
  return arg;
}

// Generic interface
interface ApiResponse<T> {
  data: T;
  status: number;
}

// Constraints
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}
```

**Пример из проекта** — generic API response:

```typescript
// src/lib/api-client.ts:127-131
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
  // ...
}
```

### 7.4 Utility Types

```typescript
// Partial — все поля опциональны
type PartialUser = Partial<User>;

// Required — все поля обязательны
type RequiredUser = Required<PartialUser>;

// Pick — выбрать поля
type UserName = Pick<User, 'firstName' | 'lastName'>;

// Omit — исключить поля
type UserWithoutId = Omit<User, 'id'>;

// Record — словарь
type Flags = Record<string, boolean>;

// Readonly — только для чтения
type ReadonlyUser = Readonly<User>;
```

### 7.5 Type Guards

```typescript
// typeof guard
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// instanceof guard
function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

// Custom guard
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof (obj as User).name === 'string'
  );
}

// Использование
if (isUser(data)) {
  console.log(data.name);  // TypeScript знает, что это User
}
```

### 7.6 Union vs Intersection

```typescript
// Union (|) — одно ИЛИ другое
type StringOrNumber = string | number;

// Intersection (&) — одно И другое
type WithTimestamp = User & { createdAt: Date };

// Discriminated Union
type Result =
  | { success: true; data: User }
  | { success: false; error: string };

function handleResult(result: Result) {
  if (result.success) {
    console.log(result.data);  // TypeScript знает, что есть data
  } else {
    console.log(result.error);  // TypeScript знает, что есть error
  }
}
```

### 7.7 Optional chaining и Nullish coalescing

```typescript
// Optional chaining (?.)
const name = user?.profile?.name;  // undefined если что-то null/undefined

// Nullish coalescing (??)
const value = input ?? 'default';  // 'default' только если null/undefined
// В отличие от ||, который также заменяет 0, '', false

// Примеры
0 || 'default'    // 'default'
0 ?? 'default'    // 0

'' || 'default'   // 'default'
'' ?? 'default'   // ''
```

---

## 8. State Management

### 8.1 Server State vs Client State

| Server State | Client State |
|---|---|
| Данные с сервера | UI state |
| Кэшируется | Локальный |
| Может устареть | Всегда актуальный |
| React Query, SWR | useState, Zustand |

**Пример из проекта:**
- Server State → React Query для API (`useTutorsList`)
- Client State → Zustand для чата (`useChatStore`)
- URL State → nuqs для фильтров

### 8.2 React Query / TanStack Query

**Преимущества:**
- Автоматическое кэширование
- Background revalidation
- Dedupe одинаковых запросов
- Retry logic
- Pagination/Infinite queries

```tsx
// Базовый запрос
const { data, isLoading, error } = useQuery({
  queryKey: ['tutors'],
  queryFn: fetchTutors,
});

// Мутация
const mutation = useMutation({
  mutationFn: createBooking,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  },
});
```

**Пример из проекта** — QueryClient config:

```typescript
// src/app/providers.tsx:196-207
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,        // Данные свежие 1 минуту
          refetchOnWindowFocus: false,  // Не обновлять при фокусе
        },
      },
    })
);
```

### 8.3 Zustand

Легковесный state manager.

**Пример из проекта** — chat store:

```typescript
// src/stores/chat-store.ts
export const useChatStore = create<ChatState & ChatActions>((set) => ({
  messages: [],
  typingUsers: new Map(),
  connectionStatus: 'disconnected',
  error: null,

  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((msg) => msg.id === message.id)) {
        return state;  // Dedupe по id
      }
      return { messages: [...state.messages, message] };
    }),

  markMessagesReadBatch: (messageIds) =>
    set((state) => {
      const idSet = new Set(messageIds);  // O(1) lookup
      return {
        messages: state.messages.map((msg) =>
          idSet.has(msg.id) ? { ...msg, is_read: true } : msg
        ),
      };
    }),

  setConnectionStatus: (status) => set(() => ({ connectionStatus: status })),
  reset: () => set(() => initialState),
}));
```

### 8.4 URL State (nuqs)

Type-safe query parameters для Next.js.

**Пример из проекта:**

```typescript
// src/app/tutors/page.tsx:36-47
const [params, setParams] = useQueryStates(
  {
    q: parseAsString.withDefault(''),
    subject: parseAsString,
    minPrice: parseAsInteger,
    maxPrice: parseAsInteger,
    format: parseAsStringLiteral(FORMAT_OPTIONS),
    ordering: parseAsStringLiteral(SORT_OPTIONS).withDefault('-rating'),
    page: parseAsInteger.withDefault(1),
  },
  { shallow: true }  // Без перезагрузки страницы
);

// Изменение
setParams({ page: 2 });
setParams({ q: 'math', page: 1 });
```

**Преимущества:**
- Shareable URLs
- Browser navigation работает
- Сохранение состояния при refresh

### 8.5 Context API как state manager

Подходит для:
- Тема (light/dark)
- Авторизация
- Feature flags
- Локализация

Не подходит для:
- Частые обновления (все consumers re-render)
- Большой state

### 8.6 Optimistic Updates

Обновляем UI сразу, откатываем при ошибке:

```tsx
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previousTodos = queryClient.getQueryData(['todos']);

    // Оптимистичное обновление
    queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);

    return { previousTodos };
  },
  onError: (err, newTodo, context) => {
    // Откат при ошибке
    queryClient.setQueryData(['todos'], context.previousTodos);
  },
});
```

**Пример из проекта** — pending messages в чате:

```typescript
// src/hooks/use-chat.ts:156-179
const sendMessage = useCallback((content: string) => {
  const pendingMessage: ChatMessage = {
    id: `temp-${Date.now()}`,
    content,
    isPending: true,  // Отмечаем как pending
  };

  addMessage(pendingMessage);  // Оптимистично добавляем

  wsRef.current.send(JSON.stringify({ type: 'message', content }));
}, [addMessage]);

// При получении подтверждения от сервера
// addMessage заменяет pending на confirmed (chat-store.ts:51-61)
```

### 8.7 Selectors

Выбор части state для оптимизации:

```tsx
// Zustand selector
const connectionStatus = useChatStore((state) => state.connectionStatus);
// Компонент обновляется только при изменении connectionStatus

// React Query selector
const { data: subjects } = useTutorsList({}, {
  query: {
    select: (response) => {
      const subjects = new Set<string>();
      for (const tutor of response.data.results ?? []) {
        for (const subject of tutor.subjects) {
          subjects.add(subject);
        }
      }
      return Array.from(subjects).sort();
    },
  },
});
```

---

## 9. Forms & Validation

### 9.1 React Hook Form

**Преимущества:**
- Минимальные re-renders
- Uncontrolled inputs по умолчанию
- Интеграция с Zod/Yup

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  mode: 'onChange',  // Валидация при изменении
});

<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('email')} />
  {errors.email && <span>{errors.email.message}</span>}
</form>
```

### 9.2 Zod схемы

**Пример из проекта** — `tutor-profile.ts`:

```typescript
// src/lib/schemas/tutor-profile.ts
export const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  lastName: z.string().min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone format')
    .optional()
    .or(z.literal('')),
  bio: z.string().min(50, 'Minimum 50 characters').max(1000, 'Maximum 1000 characters'),
});

// Enums
export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

// Вложенные схемы
export const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  level: z.enum(SKILL_LEVELS),
  hourlyRate: z.number().min(0, 'Rate must be positive'),
});

// Массив с валидацией
export const subjectsStepSchema = z.object({
  subjects: z.array(subjectSchema).min(1, 'Add at least one subject'),
});

// Refinement для сложной валидации
export const timeSlotSchema = z.object({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
}).refine(
  (data) => {
    const start = data.startTime.split(':').map(Number);
    const end = data.endTime.split(':').map(Number);
    return end[0] * 60 + end[1] > start[0] * 60 + start[1];
  },
  { message: 'End time must be after start time', path: ['endTime'] }
);
```

### 9.3 Multi-step wizard pattern

**Шаги:**
1. Общий state для всех шагов (React Hook Form)
2. Step-specific валидация
3. Навигация между шагами
4. Draft persistence

```typescript
// src/lib/schemas/tutor-profile.ts:197-205
export const WIZARD_STEP_SCHEMAS = {
  0: personalInfoSchema,
  1: subjectsStepSchema,
  2: pricingSchema,
  3: locationSchema,
  4: availabilitySchema,
} as const;
```

### 9.4 Draft persistence (localStorage)

```typescript
// Сохранение с debounce
const draftKey = 'tutor-profile-draft';

useEffect(() => {
  const subscription = form.watch((value) => {
    debouncedSave(value);
  });
  return () => subscription.unsubscribe();
}, [form.watch]);

// Загрузка при mount
useEffect(() => {
  const saved = localStorage.getItem(draftKey);
  if (saved) {
    form.reset(JSON.parse(saved));
  }
}, []);
```

---

## 10. Performance

### 10.1 Debounce vs Throttle

**Debounce** — выполнить после паузы:
```typescript
function debounce(fn: Function, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return (...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
// Поиск: выполнить когда пользователь перестал печатать
```

**Throttle** — не чаще чем раз в N мс:
```typescript
function throttle(fn: Function, limit: number) {
  let inThrottle = false;
  return (...args: unknown[]) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
// Скролл: не чаще раз в 100мс
```

### 10.2 Lazy Loading

**Images:**
```html
<img src="image.jpg" loading="lazy" />
```

**Components:**
```tsx
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
```

### 10.3 Infinite Scroll

**Пример с React Query:**

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['tutors'],
  queryFn: ({ pageParam = 0 }) => fetchTutors({ offset: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextOffset,
});

// Intersection Observer для триггера
const { ref, inView } = useInView();

useEffect(() => {
  if (inView && hasNextPage) {
    fetchNextPage();
  }
}, [inView, hasNextPage, fetchNextPage]);

return (
  <>
    {data?.pages.map((page) =>
      page.results.map((tutor) => <TutorCard key={tutor.id} tutor={tutor} />)
    )}
    <div ref={ref}>{isFetchingNextPage && <Spinner />}</div>
  </>
);
```

### 10.4 Core Web Vitals

| Метрика | Описание | Хорошо |
|---|---|---|
| LCP (Largest Contentful Paint) | Загрузка главного контента | < 2.5s |
| INP (Interaction to Next Paint) | Отзывчивость | < 200ms |
| CLS (Cumulative Layout Shift) | Стабильность layout | < 0.1 |

**Оптимизация:**
- LCP: оптимизация изображений, preload, SSR
- INP: code splitting, Web Workers, избежание long tasks
- CLS: размеры для images/ads, font-display: swap

### 10.5 Bundle size и Tree Shaking

**Tree Shaking** — удаление неиспользуемого кода при сборке.

**Правила для tree shaking:**
- ES modules (import/export)
- Нет side effects
- `sideEffects: false` в package.json

**Анализ bundle:**
```bash
npm run build -- --analyze
```

### 10.6 Виртуализация списков

Рендер только видимых элементов:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              height: virtualItem.size,
            }}
          >
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 10.7 React Query caching

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 минут "свежести"
      gcTime: 10 * 60 * 1000,    // 10 минут в кэше (было cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});
```

---

## 11. API Integration

### 11.1 Type-safe API (Orval)

**Workflow:**
1. Backend генерирует OpenAPI schema (`schema.json`)
2. Orval читает schema → генерирует TypeScript types + React Query hooks
3. Frontend импортирует generated hooks

```typescript
// orval.config.ts
export default {
  api: {
    input: './src/generated/schema.json',
    output: {
      mode: 'tags-split',
      target: './src/generated/api',
      schemas: './src/generated/schemas',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/lib/api-client.ts',
          name: 'customFetch',
        },
      },
    },
  },
};

// Использование
import { useTutorsList, useBookingsCreate } from '@/generated/api/...';

const { data, isLoading } = useTutorsList();
const { mutate: createBooking } = useBookingsCreate();
```

### 11.2 Custom fetch с interceptors

**Пример из проекта** — `api-client.ts`:

```typescript
// src/lib/api-client.ts:152-225
export async function customFetch<T>(
  url: string,
  options?: RequestInit,
  _retryCount = 0
): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  // Auth header injection
  if (typeof window === 'undefined') {
    // Server-side: use auth()
    const session = await auth();
    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }
  } else {
    // Client-side: use synced token
    if (clientAccessToken) {
      headers.Authorization = `Bearer ${clientAccessToken}`;
    }
  }

  const response = await fetch(fullUrl, { ...options, headers });

  // 401 Interceptor
  if (response.status === 401 && typeof window !== 'undefined' && _retryCount < MAX_RETRY_COUNT) {
    const newToken = await triggerSessionRefresh();
    if (newToken) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** _retryCount;  // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      return customFetch(url, options, _retryCount + 1);
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, await response.json());
  }

  const data = await response.json();
  return { data, status: response.status, headers: response.headers } as T;
}
```

### 11.3 Error handling

```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: unknown
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

// Использование в компоненте
const { error } = useQuery(...);

if (error instanceof ApiError) {
  if (error.status === 404) {
    return <NotFound />;
  }
  if (error.status === 403) {
    return <Forbidden />;
  }
}
```

### 11.4 401 interceptors и token refresh

**Стратегия из проекта:**
1. **Proactive refresh** — за 2 минуты до истечения (providers.tsx)
2. **401 interceptor** — при получении 401 (api-client.ts)
3. **Deduplication** — один refresh Promise для всех concurrent requests

### 11.5 Request deduplication

```typescript
// src/lib/api-client.ts:37-38
let sessionRefreshPromise: Promise<string | null> | null = null;

async function triggerSessionRefresh(): Promise<string | null> {
  // Return existing promise if refresh is in progress
  if (sessionRefreshPromise) {
    return sessionRefreshPromise;
  }

  sessionRefreshPromise = (async () => {
    // ... refresh logic
  })();

  try {
    return await sessionRefreshPromise;
  } finally {
    sessionRefreshPromise = null;
  }
}
```

---

## 12. Next.js

### 12.1 App Router vs Pages Router

| App Router | Pages Router |
|---|---|
| `app/` directory | `pages/` directory |
| Server Components по умолчанию | Client Components |
| Layouts, Loading, Error | `_app.tsx`, `_document.tsx` |
| React 18+ features | Классический подход |

### 12.2 Server Components vs Client Components

**Server Components (по умолчанию):**
- Рендерятся на сервере
- Нет JavaScript в bundle
- Нет state, effects, browser APIs
- Могут быть async

**Client Components (`'use client'`):**
- Рендерятся на клиенте
- Интерактивность (state, effects)
- Browser APIs

```tsx
// Server Component (default)
async function TutorList() {
  const tutors = await fetchTutors();  // Можно async
  return <ul>{tutors.map(...)}</ul>;
}

// Client Component
'use client';  // Обязательная директива

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**Пример из проекта:**

```tsx
// src/app/tutors/page.tsx
'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useState } from 'react';
// ...
```

### 12.3 Middleware

Выполняется перед каждым request.

**Пример из проекта** — protected routes:

```typescript
// src/middleware.ts
import { auth } from '@/auth';

const PROTECTED_ROUTES = ['/tutors/create', '/bookings'];
const ADMIN_ROUTES = ['/admin'];

export default auth((req) => {
  const isProtected = PROTECTED_ROUTES.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );
  const isAdminRoute = ADMIN_ROUTES.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  );

  // Redirect to login if not authenticated
  if ((isProtected || isAdminRoute) && !req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }

  // Redirect non-staff from admin routes
  if (isAdminRoute && !req.auth?.user?.isStaff) {
    return Response.redirect(new URL('/', req.nextUrl.origin));
  }

  return undefined;  // Continue
});

export const config = {
  matcher: ['/tutors/create', '/bookings/:path*', '/admin/:path*'],
};
```

### 12.4 Data Fetching strategies

**Server Component (async):**
```tsx
async function Page() {
  const data = await fetch('https://api.example.com/data');
  return <div>{data}</div>;
}
```

**Client Component (React Query):**
```tsx
'use client';

function Page() {
  const { data, isLoading } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  });
}
```

### 12.5 Layouts и вложенная маршрутизация

```
app/
├── layout.tsx        # Root layout (для всех страниц)
├── page.tsx          # /
├── tutors/
│   ├── layout.tsx    # Layout для /tutors/*
│   ├── page.tsx      # /tutors
│   └── [id]/
│       └── page.tsx  # /tutors/:id
```

**Пример из проекта:**

```tsx
// src/app/layout.tsx
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Tutors Marketplace',
  description: 'Find and book tutors for any subject',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 12.6 Loading UI и Suspense

```tsx
// app/tutors/loading.tsx
export default function Loading() {
  return <Skeleton />;  // Показывается пока грузится page.tsx
}

// Или с Suspense в компоненте
<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```

### 12.7 Error handling (error.tsx)

```tsx
// app/tutors/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### 12.8 Route handlers (API routes)

```typescript
// app/api/users/route.ts
export async function GET(request: Request) {
  const users = await getUsers();
  return Response.json(users);
}

export async function POST(request: Request) {
  const body = await request.json();
  const user = await createUser(body);
  return Response.json(user, { status: 201 });
}
```

### 12.9 Metadata API

```tsx
// Static metadata
export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Page description',
};

// Dynamic metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const tutor = await getTutor(params.id);
  return {
    title: tutor.name,
    description: tutor.bio,
  };
}
```

### 12.10 Environment variables

```bash
# Server-only (не попадёт в bundle)
DATABASE_URL=postgres://...
SECRET_KEY=...

# Client-side (попадёт в bundle)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```typescript
// Server-side
process.env.DATABASE_URL

// Client-side
process.env.NEXT_PUBLIC_API_URL
```

### 12.11 Hydration и SSR/CSR

**SSR (Server-Side Rendering):**
1. Сервер рендерит HTML
2. Отправляет HTML клиенту
3. Браузер показывает HTML
4. JS загружается и "гидрирует" HTML

**Hydration** — процесс "оживления" статичного HTML:
- React привязывает event listeners
- Восстанавливает state
- HTML становится интерактивным

**Ошибки hydration:**
```tsx
// НЕПРАВИЛЬНО — разный результат на сервере и клиенте
function Component() {
  return <div>{Date.now()}</div>;  // Hydration mismatch!
}

// ПРАВИЛЬНО
function Component() {
  const [time, setTime] = useState<number | null>(null);

  useEffect(() => {
    setTime(Date.now());
  }, []);

  return <div>{time ?? 'Loading...'}</div>;
}
```

---

## 13. Authentication & Security

### 13.1 JWT tokens

**Структура:**
```
header.payload.signature

Header:  { "alg": "HS256", "typ": "JWT" }
Payload: { "sub": "1234", "exp": 1234567890 }
Signature: HMACSHA256(base64(header) + "." + base64(payload), secret)
```

**Access vs Refresh:**
| Access Token | Refresh Token |
|---|---|
| Короткоживущий (15 мин) | Долгоживущий (7 дней) |
| Для доступа к API | Для получения нового access |
| Передаётся с каждым запросом | Хранится безопасно |

### 13.2 OAuth flow

**Authorization Code Flow (PKCE):**
1. Redirect на provider (Google/GitHub)
2. Пользователь авторизуется
3. Provider redirect обратно с `code`
4. Backend обменивает `code` на tokens

**Пример из проекта** — NextAuth providers:

```typescript
// src/auth.ts:271-339
Google({
  clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  authorization: { params: { prompt: 'consent', access_type: 'offline' } },
}),
GitHub({
  clientId: process.env.GITHUB_CLIENT_ID ?? '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
}),
```

### 13.3 Token refresh strategy

**Пример из проекта** — многоуровневая стратегия:

```typescript
// src/app/providers.tsx:122-187
// Proactive refresh за 2 минуты до истечения
useEffect(() => {
  if (!session?.accessToken) return;

  const expiry = getTokenExpiry(session.accessToken);
  if (!expiry) return;

  const timeUntilExpiry = expiry - Date.now();

  // Уже истёк или скоро истечёт — refresh немедленно
  if (timeUntilExpiry <= TOKEN_REFRESH_BUFFER_MS) {
    update();
    return;
  }

  // Запланировать refresh
  const refreshIn = timeUntilExpiry - TOKEN_REFRESH_BUFFER_MS;
  const timer = setTimeout(() => update(), refreshIn);
  return () => clearTimeout(timer);
}, [session?.accessToken, update]);
```

### 13.4 XSS prevention

**React по умолчанию:**
```tsx
// Автоматическое экранирование
const userInput = '<script>alert("xss")</script>';
return <div>{userInput}</div>;  // Безопасно: выводится как текст
```

**Опасно:**
```tsx
// dangerouslySetInnerHTML — только для доверенного контента
<div dangerouslySetInnerHTML={{ __html: userInput }} />  // XSS!
```

### 13.5 CORS

**Cross-Origin Resource Sharing** — механизм безопасности браузера.

```typescript
// Backend (Django)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://example.com",
]
```

### 13.6 Где хранить токены

| Хранилище | XSS | CSRF | Рекомендация |
|---|---|---|---|
| localStorage | Уязвим | Защищён | Не для sensitive |
| sessionStorage | Уязвим | Защищён | Не для sensitive |
| httpOnly cookie | Защищён | Уязвим | + CSRF token |
| Memory | Защищён | Защищён | Теряется при refresh |

**В проекте:** NextAuth хранит session в httpOnly cookie.

### 13.7 Protected routes

**Middleware level:**
```typescript
// src/middleware.ts
export default auth((req) => {
  if (isProtected && !req.auth) {
    return Response.redirect(loginUrl);
  }
});
```

**Component level:**
```tsx
'use client';

function ProtectedPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <Loading />;
  if (!session) {
    redirect('/login');
  }

  return <Content />;
}
```

---

## 14. Testing

### 14.1 Unit vs Integration vs E2E

| Тип | Что тестирует | Скорость | Инструменты |
|---|---|---|---|
| Unit | Отдельные функции/компоненты | Быстро | Vitest, Jest |
| Integration | Взаимодействие компонентов | Средне | RTL, MSW |
| E2E | Полный flow | Медленно | Playwright, Cypress |

### 14.2 React Testing Library

**Философия:** тестируй так, как пользователь.

```tsx
import { render, screen, fireEvent } from '@testing-library/react';

test('counter increments', () => {
  render(<Counter />);

  const button = screen.getByRole('button', { name: /increment/i });
  fireEvent.click(button);

  expect(screen.getByText('1')).toBeInTheDocument();
});
```

**Приоритет запросов:**
1. `getByRole` — accessibility
2. `getByLabelText` — формы
3. `getByPlaceholderText`
4. `getByText`
5. `getByTestId` — последний resort

### 14.3 MSW (Mock Service Worker)

Мокает network requests на уровне Service Worker:

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/tutors', () => {
    return HttpResponse.json([
      { id: 1, name: 'John' },
    ]);
  }),

  http.post('/api/bookings', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 1, ...body }, { status: 201 });
  }),
];

// tests/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 14.4 Vitest

Быстрый test runner, совместимый с Jest API:

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Calculator', () => {
  it('adds numbers', () => {
    expect(add(1, 2)).toBe(3);
  });

  it('calls callback', () => {
    const callback = vi.fn();
    doSomething(callback);
    expect(callback).toHaveBeenCalledWith('arg');
  });
});
```

### 14.5 Testing patterns из проекта

```typescript
// src/lib/__tests__/api-client.test.ts
describe('customFetch', () => {
  it('adds auth header on server', async () => {
    server.use(
      http.get('/api/test', ({ request }) => {
        const authHeader = request.headers.get('Authorization');
        return HttpResponse.json({ authHeader });
      })
    );

    const result = await customFetch('/api/test');
    expect(result.data.authHeader).toBe('Bearer test-token');
  });

  it('retries on 401', async () => {
    let attempts = 0;
    server.use(
      http.get('/api/test', () => {
        attempts++;
        if (attempts === 1) {
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({ success: true });
      })
    );

    const result = await customFetch('/api/test');
    expect(attempts).toBe(2);
    expect(result.data.success).toBe(true);
  });
});
```

---

## 15. Real-time & WebSockets

### 15.1 WebSocket API

```typescript
const ws = new WebSocket('wss://example.com/ws');

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', event.data);
ws.onerror = (error) => console.error('Error:', error);
ws.onclose = (event) => console.log('Closed:', event.code);

ws.send(JSON.stringify({ type: 'message', content: 'Hello' }));
ws.close(1000);  // Normal closure
```

### 15.2 Reconnection strategy

**Пример из проекта** — exponential backoff:

```typescript
// src/hooks/use-chat.ts:116-128
ws.onclose = (event) => {
  setConnectionStatus('disconnected');

  // Reconnect unless it was intentional close or auth error
  if (event.code !== 1000 && event.code !== 4001 && event.code !== 4003) {
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 30s)
      const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current++;
        connect();
      }, delay);
    }
  }
};
```

### 15.3 Message deduplication

```typescript
// src/stores/chat-store.ts:48-68
addMessage: (message) =>
  set((state) => {
    // Замена pending на confirmed
    if (!message.isPending) {
      const pendingIndex = state.messages.findIndex(
        (msg) => msg.isPending && msg.content === message.content
      );
      if (pendingIndex !== -1) {
        const newMessages = [...state.messages];
        newMessages[pendingIndex] = message;
        return { messages: newMessages };
      }
    }
    // Dedupe по id
    if (state.messages.some((msg) => msg.id === message.id)) {
      return state;
    }
    return { messages: [...state.messages, message] };
  }),
```

### 15.4 Optimistic updates

```typescript
// src/hooks/use-chat.ts:156-179
const sendMessage = useCallback((content: string) => {
  // Создаём pending message
  const pendingMessage: ChatMessage = {
    id: `temp-${Date.now()}`,
    content,
    isPending: true,
  };

  // Добавляем оптимистично
  addMessage(pendingMessage);

  // Отправляем на сервер
  wsRef.current.send(JSON.stringify({ type: 'message', content }));
}, [addMessage]);
```

### 15.5 Zustand для real-time state

**Преимущества:**
- Легковесный (1.5KB)
- Простой API
- Селекторы для оптимизации
- Работает вне React (для WebSocket handlers)

---

## 16. Tooling & Build

### 16.1 Vite vs Webpack

| | Vite | Webpack |
|---|---|---|
| Dev server | ES Modules (быстро) | Bundle (медленно) |
| HMR | Мгновенный | Может быть медленным |
| Config | Минимальный | Сложный |
| Production | Rollup | Webpack |

### 16.2 Biome (lint + format)

Замена ESLint + Prettier. Быстрый, написан на Rust.

```json
// biome.json
{
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  }
}
```

```bash
npx biome check .        # Lint
npx biome format .       # Format
npx biome check --apply  # Fix
```

### 16.3 npm vs yarn vs pnpm

| | npm | yarn | pnpm |
|---|---|---|---|
| Lockfile | package-lock.json | yarn.lock | pnpm-lock.yaml |
| Скорость | Средняя | Быстрее | Самый быстрый |
| Disk usage | Высокий | Высокий | Низкий (symlinks) |
| Monorepo | workspaces | workspaces | workspaces |

### 16.4 Orval code generation

**Workflow:**
1. Backend: `make generate-schema` → `schema.json`
2. Frontend: `npm run generate:api` → TypeScript types + hooks

```bash
# Makefile
generate-api:
	cd frontend && npm run generate:api

# package.json
{
  "scripts": {
    "generate:api": "orval",
    "generate:api:check": "orval && git diff --exit-code src/generated/"
  }
}
```

---

## 17. Patterns из проекта

### 17.1 Feature Flags & A/B Testing

**Архитектура:**
1. Backend определяет варианты (Unleash или custom)
2. Frontend запрашивает flags при загрузке
3. Context провайдер раздаёт flags компонентам
4. Analytics трекает exposure и conversion

```typescript
// src/lib/experiment-tracking.ts
export function useExperimentWithTracking(experimentName: string) {
  const variant = useExperimentVariant(experimentName);

  // Автоматический tracking exposure
  useExposureTracking(experimentName, variant);

  return {
    variant,
    trackClick: (metadata) => trackConversion(experimentName, variant, 'click', metadata),
    trackBooking: (metadata) => trackConversion(experimentName, variant, 'booking', metadata),
  };
}
```

### 17.2 Exposure deduplication

```typescript
// src/lib/experiment-tracking.ts:17-70
const exposedExperiments = new Set<string>();

export function trackExposure(experimentName: string, variant: string, userId?: string): void {
  const key = `${experimentName}:${userId || 'anonymous'}`;

  // Не отправляем повторно для того же юзера
  if (exposedExperiments.has(key)) return;
  exposedExperiments.add(key);

  sendEvent(EXPOSURE_ENDPOINT, {
    experiment: experimentName,
    variant,
    session_id: getSessionId(),
  });
}
```

### 17.3 Token refresh architecture

**Многоуровневая стратегия:**

```
┌─────────────────────────────────────────────────┐
│              Token Refresh Flow                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Proactive Refresh (providers.tsx)           │
│     └─ 2 мин до истечения → update()            │
│                                                  │
│  2. 401 Interceptor (api-client.ts)             │
│     └─ При 401 → triggerSessionRefresh()        │
│                                                  │
│  3. Deduplication                               │
│     └─ sessionRefreshPromise (один Promise)     │
│                                                  │
│  4. Server-side Cache (auth.ts)                 │
│     └─ refreshCache (5 сек TTL)                 │
│                                                  │
│  5. Fallback                                    │
│     └─ signOut при RefreshAccessTokenError      │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 17.4 Multi-provider setup

```typescript
// src/app/providers.tsx
export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({...}));

  return (
    <SessionProvider refetchOnWindowFocus={true}>
      <AuthTokenSync />  {/* Sync tokens to api-client */}
      <QueryClientProvider client={queryClient}>
        <FeatureFlagsProvider>
          <NuqsAdapter>
            {children}
          </NuqsAdapter>
          <Toaster />
        </FeatureFlagsProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

### 17.5 Type-safe API workflow

```
┌─────────────────────────────────────────────────┐
│            Type-Safe API Workflow               │
├─────────────────────────────────────────────────┤
│                                                  │
│  Backend (Django)                               │
│  ├─ Serializers define API shape                │
│  ├─ drf-spectacular generates schema.json       │
│  └─ make generate-schema                        │
│                                                  │
│  Frontend (Next.js)                             │
│  ├─ Orval reads schema.json                     │
│  ├─ Generates TypeScript types                  │
│  ├─ Generates React Query hooks                 │
│  ├─ Uses customFetch as mutator                 │
│  └─ npm run generate:api                        │
│                                                  │
│  Usage                                          │
│  ├─ import { useTutorsList } from '@/generated' │
│  ├─ const { data } = useTutorsList()            │
│  └─ Full type safety end-to-end                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Ключевые файлы проекта

| Файл | Описание |
|---|---|
| [api-client.ts](frontend/src/lib/api-client.ts) | Custom fetch + 401 interceptor |
| [auth.ts](frontend/src/auth.ts) | NextAuth + JWT + OAuth |
| [providers.tsx](frontend/src/app/providers.tsx) | Multi-provider + token sync |
| [feature-flags-provider.tsx](frontend/src/providers/feature-flags-provider.tsx) | Feature flags Context |
| [chat-store.ts](frontend/src/stores/chat-store.ts) | Zustand store для чата |
| [use-chat.ts](frontend/src/hooks/use-chat.ts) | WebSocket hook + reconnection |
| [use-media-query.ts](frontend/src/hooks/use-media-query.ts) | Responsive hook |
| [tutor-profile.ts](frontend/src/lib/schemas/tutor-profile.ts) | Zod schemas |
| [experiment-tracking.ts](frontend/src/lib/experiment-tracking.ts) | A/B tracking |
| [middleware.ts](frontend/src/middleware.ts) | Protected routes |
| [tutors/page.tsx](frontend/src/app/tutors/page.tsx) | Client Component + nuqs |
| [layout.tsx](frontend/src/app/layout.tsx) | Root layout + metadata |

---

*Документ создан на основе FE-interview репозитория и реального кода проекта nextjs-django-tutors.*
