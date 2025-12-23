# Глоссарий фронтенд-терминов

> Термины простым языком для создания Flashcards. Формат: определение + аналогия/сравнение.

---

## Концепции веб-приложений

### SPA (Single Page Application)

**SPA** — приложение, которое загружается один раз и потом обновляет только части страницы без полной перезагрузки.

**Плюсы:** быстрая навигация, богатый UX, офлайн-возможности.
**Минусы:** SEO сложнее, первая загрузка медленнее, требует JS.

**Примеры:** React, Vue, Angular приложения.

---

### Ajax / Fetch API

**Ajax** — подход к обновлению части страницы без перезагрузки (Asynchronous JavaScript and XML).

**Fetch API** — современный способ делать HTTP-запросы:

```javascript
const response = await fetch('/api/users');
const data = await response.json();
```

**Fetch vs XMLHttpRequest:** Fetch использует Promise, чище синтаксис, но не отменяет запросы нативно (нужен AbortController).

---

### RESTful API

**REST** — архитектурный стиль для API. Ресурсы + HTTP методы.

| Метод | Действие | Идемпотентный |
|---|---|---|
| GET | Получить | Да |
| POST | Создать | Нет |
| PUT | Заменить полностью | Да |
| PATCH | Обновить частично | Нет |
| DELETE | Удалить | Да |

**Идемпотентный** — повторный вызов даёт тот же результат.

**Статус-коды:** 2xx успех, 3xx редирект, 4xx ошибка клиента, 5xx ошибка сервера.

---

### Адаптивный vs Responsive UI

**Responsive** — один layout, который подстраивается под размер экрана (CSS media queries, fluid grids).

**Adaptive** — разные layouts для разных устройств (отдельные версии для mobile/desktop).

**Mobile-first** — сначала пишем стили для мобильных, потом расширяем для десктопа через `min-width`.

---

## JavaScript Core

### Event Loop (микротаски vs макротаски)

**Микротаски** — это "обещания" или "наблюдения", которые уже кем-то инициированы. Они выполняются в текущем "фрейме" Event Loop перед тем, как браузер перейдет к следующему событию.

**Макротаски** — это новые события, которые браузер должен обработать: клик, таймер, запрос с сервера. Они попадают в отдельную очередь и выполняются по одному.

**Правило:** `.then()` и дочерние `.then()` — микротаски, всё остальное — макротаски.

---

### Promise

**Promise в JS = Future/Task в Python asyncio.** Если не считать синтаксиса, модель идентична.

Promise — объект-обёртка для асинхронной операции, который "обещает" вернуть результат когда-нибудь.

---

### Замыкание (Closure)

**Замыкание в JS = self в Python методе.** Функция "захватывает" переменные из своего окружения.

Замыкание — это функция, которая удерживает доступ (и ссылки) на переменные из своей лексической области видимости. Это позволяет функции продолжать использовать эти переменные даже после того, как функция-родитель завершилась.

**Проблема в React:** старые замыкания могут содержать устаревшие значения (stale closure).

---

### Hoisting

**Hoisting** — JavaScript "поднимает" объявления переменных и функций в начало области видимости при компиляции.

Для `var` — переменная существует, но равна `undefined` до присваивания.
Для `let`/`const` — есть **Temporal Dead Zone (TDZ)**: переменная существует, но обращение к ней выбросит ошибку.

---

### `null` vs `undefined`

- `undefined` — переменная объявлена, но не инициализирована (JS сам ставит)
- `null` — явное отсутствие значения (программист намеренно указал "пусто")

---

### `==` vs `===`

- `==` — сравнение с приведением типов (`"5" == 5` → `true`)
- `===` — строгое сравнение без приведения (`"5" === 5` → `false`)

**Правило:** всегда используй `===`.

---

### this

**`this`** — контекст выполнения функции, зависит от способа вызова:

| Способ вызова | this указывает на |
|---|---|
| Метод объекта (`obj.method()`) | Сам объект |
| Обычная функция | `window` (strict: `undefined`) |
| Стрелочная функция | Лексически (от родителя) |
| `new Constructor()` | Новый объект |
| `call/apply/bind` | Указанный объект |

---

### call vs apply vs bind

- `call(thisArg, arg1, arg2)` — вызывает сразу с аргументами по одному
- `apply(thisArg, [args])` — вызывает сразу с массивом аргументов
- `bind(thisArg)` — возвращает новую функцию (не вызывает сразу)

**Мнемоника:** **A**pply = **A**rray.

---

### Shallow vs Deep copy

**Shallow copy** — копируются только ссылки на вложенные объекты (один уровень):
```javascript
const shallow = { ...original };
shallow.nested.b = 99;  // Изменит и original!
```

**Deep copy** — полное копирование всех уровней:
```javascript
const deep = structuredClone(original);  // Современный способ
```

---

## ES2015+ фичи

### Destructuring (деструктуризация)

Извлечение значений из объектов/массивов в переменные:

```javascript
// Объект
const { name, age } = user;

// Массив
const [first, second] = items;

// Значение по умолчанию
const { name = 'Anonymous' } = user;

// Переименование
const { name: userName } = user;
```

---

### Spread / Rest operators

**Spread (`...`)** — "разворачивает" массив/объект:
```javascript
const copy = { ...original };
const merged = [...arr1, ...arr2];
```

**Rest (`...`)** — "собирает" оставшиеся элементы:
```javascript
const [first, ...rest] = items;
function sum(...numbers) { }
```

---

### Template literals

Строки с backticks — поддерживают интерполяцию и многострочность:

```javascript
const greeting = `Hello, ${name}!`;

const multiline = `
  Line 1
  Line 2
`;
```

---

### Arrow functions

Короткий синтаксис + лексический `this`:

```javascript
const add = (a, b) => a + b;
const square = x => x * x;
```

**Отличия от обычных функций:**
- Нет своего `this` (берёт из родителя)
- Нет `arguments`
- Нельзя использовать как конструктор (`new`)

---

### ES Modules (import/export)

```javascript
// Named export
export const helper = () => {};
import { helper } from './utils';

// Default export
export default Component;
import Component from './Component';

// Всё сразу
import * as utils from './utils';
```

**vs CommonJS:** `require/module.exports` — синхронный, для Node. ES Modules — асинхронный, стандарт браузера.

---

### Map / Set

**Map** — коллекция ключ-значение (ключи любого типа):
```javascript
const map = new Map();
map.set(obj, 'value');  // объект как ключ
map.get(obj);
map.has(obj);
```

**Set** — коллекция уникальных значений:
```javascript
const set = new Set([1, 2, 2, 3]);  // {1, 2, 3}
set.add(4);
set.has(2);
```

**vs Object/Array:** Map сохраняет порядок вставки, Set автоматически убирает дубликаты.

---

### Array methods

```javascript
// map — преобразовать каждый элемент
[1, 2, 3].map(x => x * 2);  // [2, 4, 6]

// filter — отфильтровать
[1, 2, 3].filter(x => x > 1);  // [2, 3]

// reduce — свернуть в одно значение
[1, 2, 3].reduce((sum, x) => sum + x, 0);  // 6

// find — найти первый подходящий
users.find(u => u.id === 1);

// some/every — проверить условие
[1, 2, 3].some(x => x > 2);   // true (хотя бы один)
[1, 2, 3].every(x => x > 0);  // true (все)
```

---

### for...of vs for...in

**for...of** — итерация по **значениям** (массивы, строки, Map, Set):
```javascript
for (const item of array) { }
```

**for...in** — итерация по **ключам** (объекты):
```javascript
for (const key in object) { }
```

**Правило:** `of` для массивов, `in` для объектов.

---

## DOM & Browser

### Event Bubbling vs Capturing

**Bubbling** — событие "всплывает" от элемента к родителям (снизу вверх).
**Capturing** — событие "погружается" от родителей к элементу (сверху вниз).

По умолчанию обработчики срабатывают при bubbling.

---

### event.target vs event.currentTarget

- `target` — элемент, на котором **произошло** событие (где кликнули)
- `currentTarget` — элемент, на котором **висит обработчик** (где слушаем)

---

### Event Delegation

Один обработчик на родителе вместо многих на детях. Работает благодаря bubbling.

```javascript
container.addEventListener('click', (e) => {
  if (e.target.matches('.btn')) handleClick(e.target);
});
```

---

### localStorage vs sessionStorage vs cookies

| | localStorage | sessionStorage | cookies |
|---|---|---|---|
| Время жизни | Бессрочно | До закрытия вкладки | Настраиваемо |
| Размер | ~5MB | ~5MB | ~4KB |
| Передача на сервер | Нет | Нет | С каждым запросом |

---

## CSS

### Box Model

Каждый элемент — прямоугольник: **content → padding → border → margin**.

- `box-sizing: content-box` — width = только content (default)
- `box-sizing: border-box` — width = content + padding + border

---

### Flexbox vs Grid

**Flexbox** — одномерный (строка ИЛИ колонка). Для: навигация, карточки в ряд, центрирование.

**Grid** — двумерный (строки И колонки). Для: сложные layouts, галереи, dashboard.

---

### rem vs em

- `rem` — относительно font-size **root** элемента (html)
- `em` — относительно font-size **родителя**

**Правило:** `rem` для размеров, `em` для отступов внутри компонента.

---

## React Core

### Virtual DOM

**Virtual DOM** — легковесное представление реального DOM в памяти.

При изменении state React создаёт новый Virtual DOM, сравнивает со старым (diffing), и применяет минимальные изменения к реальному DOM.

---

### Reconciliation

**Reconciliation** — процесс сравнения старого и нового Virtual DOM и вычисления минимального набора изменений.

---

### JSX

**JSX** — синтаксис для описания UI, компилируется в `React.createElement()`.

```jsx
<h1 className="title">Hello</h1>
// становится
React.createElement('h1', { className: 'title' }, 'Hello')
```

---

### Props vs State

| Props | State |
|---|---|
| Передаются от родителя | Локальные данные компонента |
| Read-only | Изменяемый через setter |
| Изменение → re-render ребёнка | Изменение → re-render компонента |

---

### Controlled vs Uncontrolled компоненты

**Controlled** — источник истины (single source of truth) находится в React state. React контролирует текущее значение.

**Uncontrolled** — источник истины находится в DOM. React просто "читает" значение когда нужно (через ref).

---

### Keys в списках

**Key** — уникальный идентификатор для оптимизации reconciliation.

**Почему не index?** При удалении/добавлении элементов индексы меняются, React может перепутать элементы.

---

## React Hooks

### Батчинг (Batching)

React группирует несколько `setState` в один re-render:

```javascript
setCount(c => c + 1);
setName('Alice');
setAge(25);
// Один re-render, не три
```

---

### useEffect зависимости

**Массив deps** = инструкция "пересоздай эффект если эти переменные изменились".

- `[]` — только при mount
- `[dep]` — при mount и изменении dep
- Без массива — после каждого render (обычно ошибка)

---

### useRef

**Два использования:**
1. Доступ к DOM элементам
2. Хранение мутабельного значения **без re-render**

```javascript
const countRef = useRef(0);
countRef.current++;  // НЕ вызывает re-render
```

---

### useMemo vs useCallback

**useMemo** — мемоизация **значения**:
```javascript
const expensiveValue = useMemo(() => compute(a, b), [a, b]);
```

**useCallback** — мемоизация **функции**:
```javascript
const handleClick = useCallback(() => doSomething(a), [a]);
```

**Правило:** `useCallback(fn, deps)` = `useMemo(() => fn, deps)`.

---

### useLayoutEffect vs useEffect

| useEffect | useLayoutEffect |
|---|---|
| После paint | После DOM update, **до** paint |
| Асинхронный | Синхронный |
| Большинство случаев | Измерения DOM, предотвращение мерцания |

---

### Stale Closure

**Проблема:** функция "запоминает" старое значение переменной из замыкания.

**Решения:**
1. Добавить в зависимости `[count]`
2. Функциональное обновление `setCount(prev => prev + 1)`
3. Использовать `useRef`

---

### Rules of Hooks

1. **Только на верхнем уровне** — не в циклах, условиях, вложенных функциях
2. **Только в React функциях** — компоненты или custom hooks

---

## React Advanced

### Context API

**Context** — способ передачи данных без prop drilling (передачи через каждый уровень).

Подходит для: тема, авторизация, feature flags, локализация.
Не подходит для: частые обновления (все consumers re-render).

---

### React.memo

Предотвращает re-render при неизменных props. Компонент перерендерится только если props изменились.

---

### React.lazy + Suspense

**Lazy loading** — загрузка компонента по требованию, а не в initial bundle.

```jsx
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

---

### Error Boundary

Компонент-"ловушка" для ошибок в дереве React. Перехватывает ошибки детей и показывает fallback UI.

---

### Portal

Рендер компонента вне родительского DOM. Для: модальные окна, tooltips, dropdowns.

---

### HOC vs Render Props vs Hooks

| Паттерн | Описание | Статус |
|---|---|---|
| HOC | Функция, оборачивающая компонент | Legacy |
| Render Props | Prop-функция для рендера | Legacy |
| **Hooks** | Переиспользуемая логика | Современный |

---

### Compound Components

Компоненты, работающие вместе через общий Context:

```jsx
<Dialog>
  <DialogHeader>Title</DialogHeader>
  <DialogContent>...</DialogContent>
  <DialogFooter>...</DialogFooter>
</Dialog>
```

---

## TypeScript

### interface vs type

- `interface` — для объектов, расширяется через `extends`
- `type` — более гибкий: union, примитивы, intersection

**Правило:** `interface` для объектов, `type` для остального.

---

### any vs unknown

- `any` — отключает проверку типов (опасно)
- `unknown` — безопасный "любой тип", требует проверки перед использованием

**Правило:** используй `unknown` вместо `any`.

---

### Union vs Intersection

- `Union (|)` — одно **ИЛИ** другое: `string | number`
- `Intersection (&)` — одно **И** другое: `User & { role: string }`

---

### Type Guard

Функция, которая сужает тип (type narrowing):

```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
```

---

### Optional chaining vs Nullish coalescing

- `?.` — безопасный доступ: `user?.profile?.name` (undefined если null/undefined)
- `??` — значение по умолчанию **только** для null/undefined

```javascript
0 || 'default'    // 'default' (0 falsy)
0 ?? 'default'    // 0 (только null/undefined)
```

---

## State Management

### Server State vs Client State

| Server State | Client State |
|---|---|
| Данные с сервера | UI state |
| Может устареть | Всегда актуальный |
| **React Query, SWR** | **useState, Zustand** |

---

### staleTime vs gcTime (React Query)

- `staleTime` — сколько данные считаются "свежими" (не перезапрашиваем)
- `gcTime` — сколько хранить в кэше после unmount (было `cacheTime`)

---

### Optimistic Updates

Обновляем UI сразу, откатываем при ошибке. Пользователь не ждёт ответ сервера.

---

### Selector

Выбор части state для оптимизации. Компонент обновляется только при изменении выбранной части:

```javascript
const status = useChatStore((state) => state.connectionStatus);
```

---

### Redux (основы)

**Redux** — предсказуемый контейнер состояния. Один глобальный store.

**Три принципа:**
1. **Single source of truth** — один store
2. **State is read-only** — изменения только через actions
3. **Pure reducers** — reducer возвращает новый state без мутаций

```javascript
// Action
const increment = { type: 'INCREMENT' };

// Reducer
function counter(state = 0, action) {
  switch (action.type) {
    case 'INCREMENT': return state + 1;
    default: return state;
  }
}

// Dispatch
store.dispatch(increment);
```

---

### Redux vs Zustand

| | Redux | Zustand |
|---|---|---|
| Boilerplate | Много (actions, reducers) | Минимум |
| Размер | ~7KB | ~1.5KB |
| DevTools | Встроенные | Плагин |
| Когда выбрать | Большие команды, строгие паттерны | Простота, быстрый старт |

**Zustand** — современная альтернатива: меньше кода, проще API, работает вне React.

---

## Forms

### React Hook Form

Библиотека для форм с минимальными re-renders. Использует uncontrolled inputs по умолчанию.

---

### Zod

Библиотека для валидации и типизации данных. Схема = валидатор + TypeScript тип.

---

## Визуализация

### Canvas API

**Canvas** — HTML элемент для рисования графики через JavaScript (пиксельная графика).

```javascript
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'red';
ctx.fillRect(10, 10, 100, 50);  // прямоугольник
ctx.beginPath();
ctx.arc(75, 75, 50, 0, Math.PI * 2);  // круг
ctx.fill();
```

**Когда использовать:** игры, графики, обработка изображений, анимации.

**Canvas vs SVG:** Canvas — пиксели (быстрее для сложной графики), SVG — векторы (масштабируется, доступен через DOM).

---

### D3.js

**D3** (Data-Driven Documents) — библиотека для создания интерактивных визуализаций на основе данных.

**Ключевая идея:** привязка данных к DOM элементам + декларативные трансформации.

```javascript
d3.select('svg')
  .selectAll('rect')
  .data(dataset)
  .join('rect')
  .attr('height', d => d.value);
```

**Для чего:** графики, диаграммы, карты, любая data visualization.

---

## Performance

### Debounce vs Throttle

**Debounce** — выполнить после паузы. Поиск: выполнить когда пользователь перестал печатать.

**Throttle** — не чаще чем раз в N мс. Скролл: обновлять позицию не чаще раз в 100мс.

---

### Core Web Vitals

| Метрика | Что измеряет | Хорошо |
|---|---|---|
| LCP | Загрузка главного контента | < 2.5s |
| INP | Отзывчивость на действия | < 200ms |
| CLS | Стабильность layout | < 0.1 |

---

### Tree Shaking

Удаление неиспользуемого кода при сборке. Работает с ES modules (import/export).

---

### Виртуализация списков

Рендер только видимых элементов списка. Для списков с 1000+ элементов.

---

## Next.js

### Server Components vs Client Components

**Server Components (по умолчанию):**
- Рендерятся на сервере
- Нет JavaScript в bundle
- Могут быть async
- Нет state, effects, browser APIs

**Client Components (`'use client'`):**
- Интерактивность (state, effects)
- Browser APIs

---

### App Router vs Pages Router

| App Router | Pages Router |
|---|---|
| `app/` directory | `pages/` directory |
| Server Components | Client Components |
| Layouts, Loading, Error | `_app.tsx`, `_document.tsx` |

---

### Middleware

Код, который выполняется **перед** каждым request. Для: редиректы, проверка авторизации, модификация headers.

---

### Hydration

**Hydration** — процесс "оживления" статичного HTML на клиенте: React привязывает event listeners и восстанавливает state.

**Hydration mismatch** — ошибка когда HTML на сервере и клиенте отличается.

---

### Environment Variables

- Без `NEXT_PUBLIC_` — только сервер
- С `NEXT_PUBLIC_` — доступны на клиенте (попадают в bundle)

---

## Authentication

### JWT токены

**Access Token** — короткоживущий (15 мин), для доступа к API.
**Refresh Token** — долгоживущий (7 дней), для получения нового access.

---

### OAuth flow

1. Redirect на provider (Google/GitHub)
2. Пользователь авторизуется
3. Provider redirect обратно с `code`
4. Backend обменивает `code` на tokens

---

### XSS (Cross-Site Scripting)

Атака через внедрение скриптов. React по умолчанию экранирует контент.

**Опасно:** `dangerouslySetInnerHTML` — только для доверенного контента!

---

### CORS

**Cross-Origin Resource Sharing** — механизм безопасности браузера. Сервер указывает, каким доменам разрешён доступ.

---

### Где хранить токены

| Хранилище | XSS | CSRF |
|---|---|---|
| localStorage | Уязвим | Защищён |
| httpOnly cookie | Защищён | Уязвим (нужен CSRF token) |
| Memory | Защищён | Защищён (теряется при refresh) |

---

## Testing

### Unit vs Integration vs E2E

| Тип | Что тестирует | Скорость |
|---|---|---|
| Unit | Отдельные функции | Быстро |
| Integration | Взаимодействие | Средне |
| E2E | Полный flow | Медленно |

---

### React Testing Library

**Философия:** тестируй так, как пользователь. Ищи элементы по role, label, text — не по id/class.

---

### MSW (Mock Service Worker)

Мокает network requests на уровне Service Worker. Тесты работают с "настоящими" fetch, но данные подставляются.

---

## WebSockets

### Exponential Backoff

Стратегия переподключения: каждая следующая попытка ждёт дольше (1s, 2s, 4s, 8s...).

---

### Request Deduplication

Один Promise для всех concurrent requests. Если refresh уже идёт, новые запросы ждут его результат.

---

## Tooling

### Vite

**Vite** — современный build tool, замена Webpack.

**Почему быстрее:**
- Dev: использует нативные ES modules браузера (не бандлит)
- Prod: бандлит через Rollup
- HMR почти мгновенный

```bash
npm create vite@latest my-app -- --template react-ts
```

**Vite vs Webpack:** Webpack бандлит всё при старте, Vite загружает модули по требованию.

---

### Biome

Замена ESLint + Prettier. Быстрый, написан на Rust. Один инструмент для lint + format.

---

### Orval

Генератор TypeScript типов и React Query хуков из OpenAPI schema. Type-safe API из коробки.

---

*Глоссарий создан на основе frontend.md*
