# Product Requirements Document: Tutors Marketplace

## Problem Statement

Finding a qualified tutor is time-consuming and inefficient. Students spend hours searching through fragmented sources, comparing prices, and coordinating schedules via phone or email. Tutors, in turn, struggle to showcase their expertise and manage bookings across multiple platforms. There is no single solution that provides discovery, comparison, booking, and communication in one place.

## Target Users

### Student
A person seeking educational support in specific subjects. They want to quickly find a qualified tutor based on subject, price, rating, and availability. Primary goals: discover tutors, book lessons, communicate, and pay seamlessly.

### Tutor
An educator offering private lessons. They want to create a professional profile, showcase their expertise, receive booking requests, and communicate with students. Primary goals: get discovered, manage schedule, and grow their client base.

### Admin
Platform administrator responsible for managing tutors, bookings, and overall platform health. Primary goals: ensure quality, resolve issues, and monitor platform metrics.

## User Stories

### Student Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| S1 | As a student, I want to browse tutors by subject so I can find relevant experts | Filter by subject returns matching tutors; empty state shown if none |
| S2 | As a student, I want to filter by price range so I can find affordable options | Min/max price filters work; results update in real-time |
| S3 | As a student, I want to filter by teaching format so I can find online or offline tutors | Format filter (online/offline) works correctly |
| S4 | As a student, I want to see tutor ratings so I can choose quality educators | Rating displayed on card; sortable by rating |
| S5 | As a student, I want to search tutors by name or subject | Full-text search via OpenSearch returns relevant results |
| S6 | As a student, I want to view tutor profiles so I can learn about their background | Profile page shows bio, subjects, price, rating, reviews count, location, formats |
| S7 | As a student, I want to book a lesson so I can schedule time with a tutor | Booking dialog with date/time picker; booking created with PENDING status |
| S8 | As a student, I want to view my bookings so I can track scheduled lessons | Bookings page lists all bookings with status badges |
| S9 | As a student, I want to cancel a booking if plans change | Cancel action available for PENDING/CONFIRMED bookings |
| S10 | As a student, I want to pay for a booking to confirm it | Payment flow with checkout; booking status updates after payment |
| S11 | As a student, I want to message a tutor before or after booking | Chat room created; real-time messaging available |
| S12 | As a student, I want to sign in with Google or GitHub | OAuth authentication works; JWT tokens issued |

### Tutor Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| T1 | As a tutor, I want to create my profile step-by-step so the process is not overwhelming | 5-step wizard with progress indicator |
| T2 | As a tutor, I want my draft to be auto-saved so I don't lose progress | Draft saved to localStorage and backend; recoverable on return |
| T3 | As a tutor, I want to specify my subjects so students know what I teach | Multi-subject selection with expertise levels |
| T4 | As a tutor, I want to set my hourly rate so students know my pricing | Price input with validation |
| T5 | As a tutor, I want to specify my location and teaching formats | Location field + online/offline format selection |
| T6 | As a tutor, I want to set my availability schedule | Time slots configuration |
| T7 | As a tutor, I want to publish my profile to go live | Publish action converts draft to active profile |
| T8 | As a tutor, I want to see incoming bookings so I can manage my schedule | Bookings visible in dashboard |
| T9 | As a tutor, I want to confirm or cancel bookings | Confirm/cancel actions available |
| T10 | As a tutor, I want to mark lessons as completed | Complete action for CONFIRMED bookings |
| T11 | As a tutor, I want to chat with students | Chat rooms with students; real-time messaging |

### Admin Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| A1 | As an admin, I want to view all tutors | Tutors table with filtering and sorting |
| A2 | As an admin, I want to view all bookings | Bookings table with pagination |
| A3 | As an admin, I want to manage booking statuses | Confirm/cancel/complete actions for any booking |
| A4 | As an admin, I want to verify tutors | Verification badge management |

## Features

### Core Platform
- Tutor catalog with grid/list view
- Advanced filtering (subject, price, rating, format, location)
- Full-text search powered by OpenSearch
- Tutor profile pages with detailed information
- 5-step profile creation wizard with draft auto-save
- Booking creation and management
- Responsive UI (mobile-first design)

### Communication
- Real-time chat between students and tutors
- Chat rooms with message history
- Unread message indicators

### Payments
- Checkout flow for booking payments
- Payment status tracking (pending, processing, succeeded, failed)
- Idempotent payment processing

### Search Infrastructure
- Go-based search service
- OpenSearch integration for fast full-text search
- Tutor indexing and real-time sync

### A/B Testing & Analytics
- Feature flags system
- Experiment variants with exposure tracking
- Conversion metrics (click, booking, checkout)

### Authentication
- OAuth (Google, GitHub)
- JWT tokens with refresh
- Role-based access (student, tutor, admin)

## Technical Architecture

### Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, TanStack Query
- **Backend**: Django 5.2, Django REST Framework, PostgreSQL 17, Redis 7.4
- **Search**: Go service + OpenSearch
- **Storage**: MinIO (S3-compatible)
- **Auth**: NextAuth v5, SimpleJWT

### Type Safety
- OpenAPI schema generated from Django serializers (drf-spectacular)
- TypeScript types and React Query hooks auto-generated (Orval)
- End-to-end type-safe API integration

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Tutor profile completion rate | > 70% | Completed profiles / Started wizards |
| Booking conversion rate | > 5% | Bookings created / Tutor profile views |
| Chat engagement rate | > 30% | Chats initiated / Bookings created |
| Payment success rate | > 95% | Successful payments / Payment attempts |
| Search relevance | > 80% | Click-through rate on search results |
| Page load time (Tutors list) | < 2s | Lighthouse performance score |
| API response time | < 500ms | P95 latency for list endpoints |

## Technical Constraints

- Must support modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
- Mobile-first responsive design
- Type-safe frontend-backend contract via OpenAPI
- Containerized deployment (Docker Compose)

## Release Criteria

- [ ] All user stories implemented and tested
- [ ] No critical or high-severity bugs
- [ ] API documentation complete (Swagger/OpenAPI)
- [ ] Core user flows covered by tests (unit + integration)
- [ ] Performance targets met
- [ ] Security review passed (auth, data validation)
