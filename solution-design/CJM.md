# Customer Journey Map: Tutors Marketplace

## Student Journey

```
AWARENESS → DISCOVERY → EVALUATION → BOOKING → PAYMENT → COMMUNICATION → LESSON
```

| Stage | Actions | Touchpoints | Pain Points | Opportunities |
|-------|---------|-------------|-------------|---------------|
| **Awareness** | Realizes need for tutoring help | External (search engines, social media) | Doesn't know where to start | SEO, clear value proposition on landing |
| **Discovery** | Lands on tutors list, browses catalog, uses search | Home page, Tutors list, Search bar | Overwhelmed by choices | Smart filters, popular subjects highlight |
| **Evaluation** | Filters by subject, price, format; compares tutors | Filters, Tutor cards, Profile pages | Hard to compare side-by-side | Clear card layout, key info visible at glance |
| **Booking** | Selects time slot, confirms booking | Booking dialog, Date/time picker | Uncertain about cancellation policy | Simple flow, clear confirmation, policy visible |
| **Payment** | Enters payment details, completes checkout | Checkout page, Payment form | Trust concerns, payment security | Clear pricing, secure badges, receipt |
| **Communication** | Messages tutor before/after booking | Chat page, Message input | Response time uncertainty | Unread indicators, notification hints |
| **Lesson** | Attends lesson, provides feedback | External (video call, in-person) | No in-app video integration | Future: integrated video calls |

### Student Emotional Journey

```
Frustrated → Curious → Interested → Confident → Relieved → Connected → Satisfied
    😤         🤔          😊          💪          😌          💬          ✅
```

---

## Tutor Journey

```
REGISTRATION → PROFILE SETUP → PUBLICATION → DISCOVERY → ENGAGEMENT → MANAGEMENT → GROWTH
```

| Stage | Actions | Touchpoints | Pain Points | Opportunities |
|-------|---------|-------------|-------------|---------------|
| **Registration** | Signs up via OAuth | Login page, OAuth buttons | Account creation friction | One-click OAuth (Google/GitHub) |
| **Profile Setup** | Fills 5-step wizard | Wizard steps 1-5, Progress indicator | Long forms are tedious | Step-by-step wizard, auto-save |
| **Publication** | Reviews and publishes profile | Publish button, Confirmation | Fear of incomplete profile | Preview before publish, edit anytime |
| **Discovery** | Profile appears in search results | Tutors catalog, Search results | Low visibility initially | Verification badge, boost options |
| **Engagement** | Receives messages, booking requests | Chat notifications, Bookings list | Missing notifications | Future: push/email alerts |
| **Management** | Confirms/cancels bookings, chats with students | Bookings dashboard, Chat rooms | Manual status tracking | Clear status workflow, bulk actions |
| **Growth** | Completes lessons, builds reputation | Rating display, Reviews count | Slow rating accumulation | Encourage student reviews |

### Tutor Emotional Journey

```
Hopeful → Focused → Proud → Anticipating → Responsive → Organized → Accomplished
   🙂        📝        🎉         🤞            💬          📊          🏆
```

---

## Admin Journey

```
MONITORING → INVESTIGATION → ACTION → VERIFICATION
```

| Stage | Actions | Touchpoints | Pain Points | Opportunities |
|-------|---------|-------------|-------------|---------------|
| **Monitoring** | Reviews platform metrics, scans lists | Admin dashboard, Tables | Information overload | Filters, sorting, key metrics highlight |
| **Investigation** | Drills into specific tutor/booking | Detail views, Filters | Finding problematic items | Search, status filters |
| **Action** | Confirms/cancels bookings, manages tutors | Action buttons, Confirmations | Irreversible actions | Confirmation dialogs, audit log |
| **Verification** | Verifies tutor credentials | Verification toggle | Manual verification process | Future: automated checks |

---

## Key Touchpoints Summary

| Touchpoint | User Type | Journey Stage | Priority |
|------------|-----------|---------------|----------|
| Tutors List Page | Student | Discovery | P0 |
| Tutor Profile Page | Student | Evaluation | P0 |
| Booking Dialog | Student | Booking | P0 |
| Checkout Page | Student | Payment | P0 |
| Chat Page | Student, Tutor | Communication | P0 |
| Profile Wizard | Tutor | Profile Setup | P0 |
| Bookings Dashboard | Student, Tutor | Management | P0 |
| Admin Dashboard | Admin | Monitoring | P1 |
| Search Results | Student | Discovery | P1 |
| Filters Panel | Student | Discovery | P1 |

---

## Moments of Truth

1. **First Search Results** — If no relevant tutors found, student leaves immediately
   - Solution: Smart defaults, popular subjects, empty state with suggestions

2. **Wizard Step 2-3** — Highest drop-off point; subjects/pricing is complex
   - Solution: Auto-save, progress indicator, helpful hints

3. **Booking Confirmation** — Must be instant and clear; uncertainty causes abandonment
   - Solution: Immediate feedback, clear next steps, email confirmation (future)

4. **Payment Completion** — Trust moment; any friction loses the sale
   - Solution: Secure indicators, clear pricing, multiple payment methods (future)

5. **First Message Sent** — Student wants quick response; long wait = frustration
   - Solution: Read receipts, typical response time indicator (future)

6. **First Booking Received** — Tutor's validation moment; must be visible and actionable
   - Solution: Prominent notification, easy confirm/cancel actions

---

## Conversion Funnel

```
Landing Page (100%)
       ↓
Tutors List (70%)
       ↓
Tutor Profile (40%)
       ↓
Booking Created (10%)
       ↓
Payment Completed (8%)
       ↓
Lesson Completed (7%)
```

### Key Drop-off Points

| Stage | Expected Drop-off | Mitigation |
|-------|-------------------|------------|
| Landing → List | 30% | Clear CTA, value proposition |
| List → Profile | 43% | Better cards, quick filters |
| Profile → Booking | 75% | Trust signals, clear pricing |
| Booking → Payment | 20% | Simple checkout, guest checkout (future) |
| Payment → Lesson | 12% | Reminders, calendar sync (future) |
