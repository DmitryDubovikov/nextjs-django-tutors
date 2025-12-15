# Product Requirements Document: Tutors Marketplace MVP

## Problem Statement

Finding a qualified tutor is time-consuming and inefficient. Students spend hours searching through fragmented sources, comparing prices, and coordinating schedules via phone or email. Tutors, in turn, struggle to showcase their expertise and manage bookings across multiple platforms. There is no single solution that provides discovery, comparison, and booking in one place.

## Target Users

### Student
A person seeking educational support in specific subjects. They want to quickly find a qualified tutor based on subject, price, rating, and availability. Primary goal: book a lesson with minimal friction.

### Tutor
An educator offering private lessons. They want to create a professional profile, showcase their expertise, and receive booking requests. Primary goal: get discovered by students and manage their schedule efficiently.

## User Stories

### Student Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| S1 | As a student, I want to browse tutors by subject so I can find relevant experts | Filter by subject returns matching tutors; empty state shown if none |
| S2 | As a student, I want to filter by price range so I can find affordable options | Min/max price filters work; results update in real-time |
| S3 | As a student, I want to see tutor ratings so I can choose quality educators | Rating displayed on card; sortable by rating |
| S4 | As a student, I want to view tutor profiles so I can learn about their background | Profile page shows bio, subjects, price, rating, reviews count |
| S5 | As a student, I want to book a lesson so I can schedule time with a tutor | Booking dialog with date/time picker; confirmation shown |
| S6 | As a student, I want to view my bookings so I can track scheduled lessons | Bookings page lists all bookings with status |

### Tutor Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| T1 | As a tutor, I want to create my profile step-by-step so the process is not overwhelming | 5-step wizard with progress indicator; draft auto-saved |
| T2 | As a tutor, I want to specify my subjects and rates so students know what I offer | Multi-subject support with individual pricing |
| T3 | As a tutor, I want to see incoming bookings so I can manage my schedule | Bookings visible in dashboard; can confirm/cancel |

## MVP Scope

| In Scope | Out of Scope (Phase 2) |
|----------|------------------------|
| Tutor catalog with search & filters | Real-time chat |
| Tutor profile pages | Payment processing |
| 5-step profile creation wizard | Advanced search (OpenSearch) |
| Booking creation & management | Semantic/AI search |
| Admin dashboard | Reviews & ratings submission |
| Responsive UI (mobile/desktop) | Email notifications |
| Draft saving for wizard | Calendar integration |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Tutor profile completion rate | > 70% | Completed profiles / Started wizards |
| Booking conversion rate | > 5% | Bookings created / Tutor profile views |
| Page load time (Tutors list) | < 2s | Lighthouse performance score |

## Technical Constraints

- Must support modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
- Mobile-first responsive design
- API response time < 500ms for list endpoints
- Type-safe frontend-backend contract via OpenAPI

## Release Criteria

- [ ] All user stories implemented and tested
- [ ] No critical or high-severity bugs
- [ ] API documentation complete (Swagger)
- [ ] Core user flows covered by tests
- [ ] Performance targets met
