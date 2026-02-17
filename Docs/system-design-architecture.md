# System Design Architecture — Engineering Intelligence Feed

**Project:** Savant Growth — Engineering Intelligence System  
**Version:** 1.0  
**Status:** POC → MVP  
**Last Updated:** 2026-02-17  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Goals & Constraints](#2-system-goals--constraints)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Component Architecture](#4-component-architecture)
5. [Data Architecture](#5-data-architecture)
6. [API Design](#6-api-design)
7. [Ingestion Pipeline](#7-ingestion-pipeline)
8. [Scoring Pipeline](#8-scoring-pipeline)
9. [Intelligence Generation Pipeline](#9-intelligence-generation-pipeline)
10. [Slack Digest Delivery](#10-slack-digest-delivery)
11. [Tech Stack](#11-tech-stack)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [Security & Configuration](#13-security--configuration)
14. [Phased Implementation Plan](#14-phased-implementation-plan)
15. [Non-Functional Requirements](#15-non-functional-requirements)
16. [Future Extensions](#16-future-extensions)

---

## 1. Executive Summary

The Engineering Intelligence Feed is an **internal AI-curated signal extraction and decision-support system**. It monitors ~25 chosen engineering thought leaders ("builders") across platforms (blogs, LinkedIn/X, GitHub, newsletters), scores each piece of content against organizational priorities using LLM-based analysis (Anthropic Claude), and delivers a ranked weekly intelligence digest via Slack and a web dashboard.

This is **not a content dashboard** — it is a **signal extraction and decision-support pipeline** that optimizes for signal quality, consistency, and decision usefulness.

### Core Value Proposition

- Surface the **top 5–10 engineering insights weekly** ranked by relevance
- Detect **priority trends** across the engineering landscape
- Generate **recommended experiments** for leadership action
- Influence engineering execution and support leadership decision-making

---

## 2. System Goals & Constraints

### Goals

| Goal | Description |
|------|-------------|
| Signal Quality | Only surface high-relevance, actionable insights |
| Consistency | Automated weekly cadence with reliable scoring |
| Decision Usefulness | Every output must map to an actionable experiment or awareness item |
| Low Maintenance | Fully automated pipeline; manual override when needed |

### Relevance Scoring Priorities (from ADR-005)

| Priority | Description |
|----------|-------------|
| Delivery Speed | Practices that accelerate shipping |
| AI-Assisted Dev Workflows | Tools and patterns leveraging AI in development |
| Architecture | System design, scalability, patterns |
| Reliability | Observability, resilience, monitoring |
| Process Change | Team processes, culture, methodology |

### Design Constraints

- **No real-time scoring** — LLMs are never called inside HTTP request cycles
- **Monolithic deployment** — no microservices for MVP
- **No Redis caching** — not needed at this scale
- **No embeddings search** — keyword/score-based ranking is sufficient
- **Async-first** — all heavy processing runs in background workers

---

## 3. High-Level Architecture

### System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL CONTENT SOURCES                          │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│   │ LinkedIn │  │ Twitter/X│  │  RSS/Blog│  │Newsletter│  │  GitHub  │   │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│        │             │             │              │             │          │
└────────┼─────────────┼─────────────┼──────────────┼─────────────┼──────────┘
         │             │             │              │             │
         ▼             ▼             ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INGESTION LAYER (Adapters)                          │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────┐  │
│   │LinkedInAdapter│ │TwitterAdapter │ │  RSSAdapter   │ │GitHubAdapter │  │
│   └───────┬───────┘ └───────┬───────┘ └───────┬───────┘ └──────┬───────┘  │
│           └─────────────────┼─────────────────┼────────────────┘          │
│                             ▼                 ▼                           │
│                    ┌────────────────────────────┐                         │
│                    │    Ingestion Service        │                         │
│                    │  (Dedup, Normalize, Store)  │                         │
│                    └────────────┬───────────────┘                         │
└─────────────────────────────────┼─────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER (PostgreSQL)                            │
│                                                                            │
│   ┌──────────┐  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│   │ builders │  │builder_sources│  │content_items │  │ processed_items │  │
│   └──────────┘  └───────────────┘  └──────────────┘  └─────────────────┘  │
│                                                                            │
│   ┌────────────────────┐  ┌─────────────────┐                             │
│   │weekly_intelligence │  │ system_settings │                             │
│   └────────────────────┘  └─────────────────┘                             │
│                                                                            │
└──────────────────────┬──────────────────┬─────────────────────────────────┘
                       │                  │
              ┌────────┘                  └────────┐
              ▼                                    ▼
┌──────────────────────────┐        ┌──────────────────────────────┐
│   SCORING WORKER (Async) │        │   WEEKLY INTELLIGENCE JOB    │
│                          │        │                              │
│  ┌────────────────────┐  │        │  ┌────────────────────────┐  │
│  │ Fetch pending items │  │        │  │ Rank top items         │  │
│  │        ▼            │  │        │  │        ▼               │  │
│  │ Call Claude (LLM)   │  │        │  │ Generate trend summary │  │
│  │        ▼            │  │        │  │        ▼               │  │
│  │ Store scored items  │  │        │  │ Generate experiments   │  │
│  │        ▼            │  │        │  │        ▼               │  │
│  │ Retry on failure    │  │        │  │ Store weekly report    │  │
│  └────────────────────┘  │        │  │        ▼               │  │
│                          │        │  │ Publish to Slack       │  │
│  LLM: Anthropic Claude   │        │  └────────────────────────┘  │
└──────────────────────────┘        └──────────────┬───────────────┘
                                                   │
                                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                        DELIVERY LAYER                            │
│                                                                  │
│   ┌─────────────────────┐       ┌─────────────────────────────┐ │
│   │  React Dashboard    │       │     Slack Integration       │ │
│   │  (Vite SPA)         │       │     (@slack/web-api)        │ │
│   │                     │       │                             │ │
│   │  • Intelligence Feed│       │  • Weekly Digest            │ │
│   │  • Builder Mgmt     │       │  • Top Items + Trends       │ │
│   │  • Trend Charts     │       │  • Strategic Experiments    │ │
│   └─────────────────────┘       └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

```
Sources → Adapters → Ingestion Service → content_items (DB)
                                              │
                                    Scoring Worker (async)
                                              │
                                         processed_items (DB)
                                              │
                                    Weekly Intelligence Job
                                              │
                                      weekly_intelligence (DB)
                                              │
                                   ┌──────────┴──────────┐
                                   ▼                      ▼
                             Dashboard              Slack Digest
```

**Key principle:** LLMs are never called synchronously inside HTTP request cycles. All AI processing happens in background workers.

---

## 4. Component Architecture

### 4.1 Frontend — React SPA (Vite)

```
src/
├── main.jsx                 # App entry point
├── App.jsx                  # Root component with routing
├── App.css                  # Global styles
├── index.css                # Base styles
└── BuildersPage.jsx         # Builder management CRUD UI
```

| Component | Responsibility |
|-----------|---------------|
| `App.jsx` | Top-level layout, tab navigation (Feed / Builders) |
| `IntelligenceFeed` | Fetches & renders weekly intelligence: top items, trends, experiments, builder stats |
| `BuildersPage` | Full CRUD for builders and their sources (add/edit/delete/toggle active) |

**Frontend-Backend Communication:**
- All API calls go through Vite's dev proxy (`/api → localhost:3001`)
- No direct database access from the frontend
- Data fetched via REST JSON endpoints

### 4.2 Backend — Express.js API Server

```
server/
├── index.ts                 # Express app bootstrap, route registration
├── db.ts                    # Prisma client singleton
├── routes/
│   ├── builders.ts          # /api/builders — Builder CRUD
│   └── builder-sources.ts   # /api/builder-sources — Source CRUD
├── services/
│   ├── ingestion.ts         # Content fetching orchestration
│   ├── scoring.ts           # LLM-based content scoring (Claude)
│   ├── intelligence.ts      # Weekly intelligence generation
│   └── builders.js          # Legacy mock builder service
└── sources/
    ├── adapter.js           # Base SourceAdapter class (ADR-002)
    ├── linkedin.js          # LinkedIn content adapter
    └── twitter.js           # Twitter/X content adapter
```

| Layer | Component | Responsibility |
|-------|-----------|---------------|
| **Routes** | `builders.ts` | REST CRUD for builder entities (GET, POST, PATCH, DELETE) |
| **Routes** | `builder-sources.ts` | REST CRUD for builder content sources |
| **Services** | `ingestion.ts` | Orchestrates content fetching across all active builders and their sources |
| **Services** | `scoring.ts` | Sends content to Anthropic Claude for multi-dimensional scoring (ADR-005) |
| **Services** | `intelligence.ts` | Generates weekly intelligence reports (ranking, trends, experiments) |
| **Sources** | `adapter.js` | Abstract base class defining the source adapter interface |
| **Sources** | `linkedin.js` | LinkedIn-specific content fetching (API or mock) |
| **Sources** | `twitter.js` | Twitter/X-specific content fetching (API or mock) |

> **Note:** `server/services/builders.js` is legacy mock code superseded by `routes/builders.ts` (Prisma-backed CRUD) and is a candidate for removal.

### 4.3 Background Workers

```
┌─────────────────────────────────────────────────────┐
│              WORKER PROCESS (Node + Cron)            │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  Ingestion Cron (e.g. every 6–12 hours)     │    │
│  │  1. Fetch all active builders + sources     │    │
│  │  2. Call platform adapters                  │    │
│  │  3. Deduplicate via content_hash            │    │
│  │  4. Store new content_items (status=pending)│    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  Scoring Cron (runs after ingestion)        │    │
│  │  1. Fetch items WHERE status = 'pending'    │    │
│  │  2. Send each to Claude for scoring         │    │
│  │  3. Store processed_items with scores       │    │
│  │  4. Update content_item status → 'processed'│    │
│  │  5. Retry failures with backoff             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  Weekly Intelligence Cron (weekly)          │    │
│  │  1. Rank processed items by overall_score   │    │
│  │  2. Aggregate priority trends               │    │
│  │  3. Compare week-over-week                  │    │
│  │  4. Generate strategic experiments (Claude) │    │
│  │  5. Store weekly_intelligence record        │    │
│  │  6. Check automation_enabled flag           │    │
│  │  7. Post to Slack if enabled                │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 4.4 External Services Integration

| Service | Purpose | SDK/Library |
|---------|---------|-------------|
| **Anthropic Claude** | LLM scoring, trend generation, experiment generation | `@anthropic-ai/sdk` |
| **Supabase PostgreSQL** | Primary data store | `@prisma/client` (Prisma ORM) |
| **Slack** | Weekly digest delivery | `@slack/web-api` |
| **LinkedIn API** | Content ingestion from LinkedIn builders | Custom adapter |
| **Twitter/X API** | Content ingestion from X/Twitter builders | Custom adapter |
| **RSS Feeds** | Blog and newsletter ingestion | Custom RSS parser |
| **GitHub API** | Activity ingestion from GitHub | Custom adapter |

---

## 5. Data Architecture

### 5.1 Entity Relationship Diagram

```
┌─────────────────────┐
│    system_settings   │
│─────────────────────│
│ id (PK)             │
│ automation_enabled   │
│ manual_override      │
└─────────────────────┘


┌─────────────────────┐       ┌──────────────────────────┐
│      builders        │       │    builder_sources        │
│─────────────────────│       │──────────────────────────│
│ id (PK, UUID)       │──1:N──│ id (PK, UUID)            │
│ name                │       │ builder_id (FK)           │
│ short_bio           │       │ source_type (enum)        │
│ is_active           │       │ source_identifier         │
│ created_at          │       │ last_fetched_at           │
│ updated_at          │       │ is_active                 │
└─────────────────────┘       │ created_at                │
                              └─────────────┬────────────┘
                                            │
                                          1:N
                                            │
                              ┌─────────────▼────────────┐
                              │      content_items        │
                              │──────────────────────────│
                              │ id (PK, UUID)            │
                              │ source_id (FK)           │
                              │ title                    │
                              │ url (UNIQUE)             │
                              │ raw_content              │
                              │ published_at             │
                              │ content_hash (UNIQUE)    │
                              │ status                   │
                              │ created_at               │
                              │ updated_at               │
                              └─────────────┬────────────┘
                                            │
                                          1:1
                                            │
                              ┌─────────────▼────────────┐
                              │     processed_items       │
                              │──────────────────────────│
                              │ id (PK, UUID)            │
                              │ content_item_id (FK, UQ) │
                              │ summary                  │
                              │ why_it_matters           │
                              │ what_to_try              │
                              │ scores_json (JSONB)      │
                              │ overall_score (FLOAT)    │
                              │ priority_flags (TEXT[])  │
                              │ confidence (FLOAT)       │
                              │ processed_at             │
                              └──────────────────────────┘


┌──────────────────────────────┐
│     weekly_intelligence       │
│──────────────────────────────│
│ id (PK, UUID)                │
│ week_start (UNIQUE)          │
│ top_items_json (TEXT/JSON)   │
│ trend_summary (TEXT)         │
│ strategic_experiments (TEXT)  │
│ published_to_slack (BOOL)    │
│ created_at                   │
└──────────────────────────────┘
```

### 5.2 Source Type Enum

```sql
CREATE TYPE "SourceType" AS ENUM ('rss_blog', 'rss_newsletter', 'github');
```

> **Note:** LinkedIn and Twitter sources are handled via their dedicated adapters and will be added as enum values as the system matures.

### 5.3 Content Item Status State Machine

```
  ┌─────────┐     Scoring Worker     ┌────────────┐
  │ pending │ ──────────────────────▶ │ processed  │
  └─────────┘                        └────────────┘
       │                                   │
       │  (on failure)                     │ (scoring error)
       ▼                                   ▼
  ┌─────────┐                        ┌────────────┐
  │  failed  │ ◀─── retry limit ──── │   error    │
  └─────────┘                        └────────────┘
```

| Status | Description |
|--------|-------------|
| `pending` | Newly ingested, awaiting scoring |
| `processed` | Successfully scored by Claude |
| `error` | Scoring failed, eligible for retry |
| `failed` | Exceeded retry limit, requires manual review |

### 5.4 Scores JSON Structure

Stored in `processed_items.scores_json` as JSONB:

```json
{
  "delivery_speed": 7,
  "ai_workflows": 9,
  "architecture": 6,
  "reliability": 4,
  "process_change": 8
}
```

Each dimension is scored 0–10 by the LLM. The `overall_score` is a weighted aggregate.

### 5.5 Database Indexes

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| `content_items` | `url` | UNIQUE | Deduplication |
| `content_items` | `content_hash` | UNIQUE | Content deduplication |
| `content_items` | `published_at` | B-TREE | Date-range queries |
| `content_items` | `status` | B-TREE | Worker queue filtering |
| `processed_items` | `content_item_id` | UNIQUE | 1:1 constraint |
| `processed_items` | `overall_score` | B-TREE | Ranking queries |
| `processed_items` | `priority_flags` | GIN | Array containment queries |
| `weekly_intelligence` | `week_start` | UNIQUE | One report per week |

---

## 6. API Design

### 6.1 REST API Endpoints

#### Builder Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/builders` | List all builders with sources |
| `POST` | `/api/builders` | Create a new builder |
| `PATCH` | `/api/builders/:id` | Update builder (name, bio, active) |
| `DELETE` | `/api/builders/:id` | Delete builder (cascades to sources) |

#### Builder Source Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/builder-sources` | Add a source to a builder |
| `PATCH` | `/api/builder-sources/:id` | Update source config |
| `DELETE` | `/api/builder-sources/:id` | Delete a source |

> **Note:** There is no dedicated `GET /api/builder-sources` endpoint. Sources are retrieved via `GET /api/builders` which includes related sources in the response.

#### Intelligence Feed

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/intelligence` | Get latest weekly intelligence report |

#### Ingestion Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ingest/trigger` | Manually trigger ingestion cycle |

#### Future Endpoints (Phase 2–3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/intelligence/history` | Historical weekly reports |
| `POST` | `/api/intelligence/publish` | Manually publish to Slack |
| `GET` | `/api/settings` | Get system settings |
| `PATCH` | `/api/settings` | Update automation/override flags |
| `GET` | `/api/builders/:id/stats` | Builder influence metrics |

### 6.2 Request/Response Examples

**POST /api/builders**
```json
// Request
{
  "name": "Gergely Orosz",
  "short_bio": "Author of The Pragmatic Engineer"
}

// Response (201)
{
  "id": "uuid-...",
  "name": "Gergely Orosz",
  "short_bio": "Author of The Pragmatic Engineer",
  "is_active": true,
  "created_at": "2026-02-17T...",
  "updated_at": "2026-02-17T...",
  "sources": []
}
```

**GET /api/intelligence**
```json
{
  "week_start": "2026-02-17T...",
  "trend_summary": "AI-assisted workflow content increased 32% this week...",
  "top_items": [
    {
      "id": "uuid-...",
      "title": "The End of localhost",
      "url": "https://swyx.io",
      "summary": "Argues that local dev environments are becoming obsolete...",
      "published_at": "2026-02-15T...",
      "platform": "blog",
      "author": "swyx",
      "overall_score": 9.2,
      "why_it_matters": "Shifting dev environments to the cloud...",
      "what_to_try": "Pilot a cloud-based dev environment...",
      "priority_flags": ["dev_experience", "infrastructure"]
    }
  ],
  "strategic_experiments": [
    {
      "title": "AI-First Code Review",
      "description": "Deploy a custom agent that pre-reviews PRs..."
    }
  ],
  "builder_stats": [
    { "name": "Gergely Orosz", "count": 4, "score": 9.1 }
  ]
}
```

---

## 7. Ingestion Pipeline

### 7.1 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    INGESTION SERVICE                         │
│                                                              │
│  1. Query: builders WHERE is_active = true                   │
│     └── Include: sources WHERE is_active = true              │
│                                                              │
│  2. For each builder + source:                               │
│     ┌──────────────────────────────┐                         │
│     │  Resolve adapter by          │                         │
│     │  source.source_type          │                         │
│     │                              │                         │
│     │  linkedin → LinkedInAdapter  │                         │
│     │  twitter  → TwitterAdapter   │                         │
│     │  rss_blog → RSSAdapter       │                         │
│     │  github   → GitHubAdapter    │                         │
│     └──────────┬───────────────────┘                         │
│                │                                             │
│  3. adapter.fetchRecentContent(builder)                      │
│                │                                             │
│  4. Deduplicate:                                             │
│     - Check content_hash (SHA-256 of raw_content)            │
│     - Check url uniqueness                                   │
│                │                                             │
│  5. Store new items:                                         │
│     content_items { status: 'pending' }                      │
│                │                                             │
│  6. Update source.last_fetched_at                            │
└──────────────┼───────────────────────────────────────────────┘
               ▼
         Ready for Scoring
```

### 7.2 Adapter Pattern (ADR-002)

All source adapters extend the base `SourceAdapter` class:

```
SourceAdapter (abstract)
├── fetchRecentContent(name) → Content[]
├── testConnection() → boolean
└── sourceType → string

ConcreteAdapters:
├── LinkedInAdapter  (LinkedIn API / mock)
├── TwitterAdapter   (Twitter/X API / mock)
├── RSSAdapter       (RSS feed parser)     [planned]
└── GitHubAdapter    (GitHub API)          [planned]
```

Each adapter:
- Handles its own API authentication
- Returns a normalized `Content` object
- Falls back to mock data when API keys are missing (POC mode)

### 7.3 Deduplication Strategy

| Check | Field | Method |
|-------|-------|--------|
| URL uniqueness | `content_items.url` | UNIQUE constraint |
| Content hash | `content_items.content_hash` | SHA-256 of `raw_content` |

---

## 8. Scoring Pipeline

### 8.1 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    SCORING WORKER                         │
│                                                          │
│  1. Query: content_items WHERE status = 'pending'        │
│     ORDER BY published_at DESC                           │
│     LIMIT batch_size                                     │
│                                                          │
│  2. For each item:                                       │
│     ┌─────────────────────────────────────────────┐      │
│     │  Build Claude prompt:                        │      │
│     │  • Include title, raw_content, author        │      │
│     │  • Request scores for each priority dim      │      │
│     │  • Request: summary, why_it_matters,         │      │
│     │    what_to_try, confidence                   │      │
│     └─────────────────┬───────────────────────────┘      │
│                       ▼                                  │
│     ┌─────────────────────────────────────────────┐      │
│     │  Call Anthropic Claude API                   │      │
│     │  • Model: claude-3-5-sonnet (or latest)      │      │
│     │  • Structured JSON output                    │      │
│     └─────────────────┬───────────────────────────┘      │
│                       ▼                                  │
│     ┌─────────────────────────────────────────────┐      │
│     │  Parse + validate response                   │      │
│     │  • Calculate overall_score (weighted avg)    │      │
│     │  • Extract priority_flags (top-scoring dims) │      │
│     └─────────────────┬───────────────────────────┘      │
│                       ▼                                  │
│     ┌─────────────────────────────────────────────┐      │
│     │  Store processed_item                        │      │
│     │  Update content_item.status → 'processed'    │      │
│     └─────────────────────────────────────────────┘      │
│                                                          │
│  3. Error handling:                                      │
│     • Rate limit → exponential backoff                   │
│     • Parse error → retry with adjusted prompt           │
│     • 3 failures → mark status = 'failed'                │
└──────────────────────────────────────────────────────────┘
```

### 8.2 Scoring Dimensions (ADR-005)

> **Note:** These weights are the target design. The current implementation uses mock scores; real weighted scoring will be implemented when Claude integration is completed.

| Dimension | Weight | Description |
|-----------|--------|-------------|
| `delivery_speed` | 20% | Practices accelerating software delivery |
| `ai_workflows` | 25% | AI-assisted development tools and patterns |
| `architecture` | 20% | System design, scalability, patterns |
| `reliability` | 20% | Observability, resilience, production stability |
| `process_change` | 15% | Team processes, culture shifts, methodology |

### 8.3 Overall Score Calculation (to be implemented)

```
overall_score = (delivery_speed × 0.20) +
                (ai_workflows × 0.25) +
                (architecture × 0.20) +
                (reliability × 0.20) +
                (process_change × 0.15)
```

### 8.4 Fallback Behavior

When `ANTHROPIC_API_KEY` is not set:
- Scoring service returns randomized mock scores
- Enables frontend development without API costs
- Logged as warning on server startup

---

## 9. Intelligence Generation Pipeline

### 9.1 Weekly Intelligence Generation Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                 WEEKLY INTELLIGENCE GENERATOR                        │
│                                                                      │
│  INPUT: All processed_items from the current week                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  STEP 1: RANKING                                           │      │
│  │  • Query processed_items WHERE processed_at >= week_start  │      │
│  │  • Order by overall_score DESC                             │      │
│  │  • Select top 5–10 items                                   │      │
│  └────────────────────────┬───────────────────────────────────┘      │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  STEP 2: TREND DETECTION                                   │      │
│  │  • Count items per priority flag                           │      │
│  │  • Calculate average scores per priority                   │      │
│  │  • Compare with previous week's data                       │      │
│  │  • Detect significant changes (>15% shift)                 │      │
│  └────────────────────────┬───────────────────────────────────┘      │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  STEP 3: STRATEGIC EXPERIMENTS                             │      │
│  │  • Feed top items + trends to Claude                       │      │
│  │  • Request 1–3 actionable experiments                      │      │
│  │  • E.g. "Pilot AI code review for backend for one sprint" │      │
│  └────────────────────────┬───────────────────────────────────┘      │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  STEP 4: BUILDER INFLUENCE                                 │      │
│  │  • Average score per builder                               │      │
│  │  • Count of top-10 appearances                             │      │
│  │  • Priority contribution per builder                       │      │
│  └────────────────────────┬───────────────────────────────────┘      │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  STEP 5: STORE                                             │      │
│  │  • Insert into weekly_intelligence table                   │      │
│  │  • Serialize top_items, trends, experiments as JSON        │      │
│  └────────────────────────┬───────────────────────────────────┘      │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │  STEP 6: PUBLISH                                           │      │
│  │  • Check system_settings.automation_enabled                │      │
│  │  • If true → Post to Slack                                 │      │
│  │  • If false → Mark as ready, await manual publish          │      │
│  └────────────────────────────────────────────────────────────┘      │
│                                                                      │
│  OUTPUT: weekly_intelligence record + optional Slack post             │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.2 Trend Detection Logic

```
For each priority dimension:
  current_week_count  = COUNT items with priority_flag = dimension
  previous_week_count = COUNT items from prior week
  change_pct = ((current - previous) / previous) × 100

  IF change_pct > 15%  → "increased {pct}%"
  IF change_pct < -15% → "decreased vs last week"
  ELSE                  → "stable"

Also:
  current_avg_score  = AVG(overall_score) for items this week
  builder_clustering = GROUP items by builder, find convergence themes
```

---

## 10. Slack Digest Delivery

### 10.1 Slack Message Structure

```
┌──────────────────────────────────────────────────────────────┐
│  🧠 Engineering Intelligence — Week of Feb 17, 2026         │
│                                                              │
│  📊 TREND SUMMARY                                           │
│  AI-assisted workflow content increased 32% this week.       │
│  Architecture discussions trending around event-driven...    │
│                                                              │
│  ─────────────────────────────────────────────────           │
│                                                              │
│  🏆 TOP INSIGHTS                                            │
│                                                              │
│  1. The End of localhost (9.2) — swyx                        │
│     > Local dev environments becoming obsolete...            │
│     ⚡ Try: Pilot cloud-based dev for frontend team          │
│     🏷️ dev_experience, infrastructure                       │
│                                                              │
│  2. System Design for AI Agents (8.8) — GitHub Engineering   │
│     > Deep dive into Copilot Workspace architecture...       │
│     ⚡ Try: Review our context window management             │
│     🏷️ architecture, ai_agents                              │
│                                                              │
│  ─────────────────────────────────────────────────           │
│                                                              │
│  🧪 STRATEGIC EXPERIMENTS                                   │
│  • AI-First Code Review: Deploy custom PR review agent...    │
│  • Ephemeral DB Environments: Isolated DB per PR...          │
│                                                              │
│  ─────────────────────────────────────────────────           │
│  📡 View full report: [Dashboard Link]                       │
└──────────────────────────────────────────────────────────────┘
```

### 10.2 Delivery Flow

```
Weekly Cron Job fires
        │
        ▼
Generate weekly_intelligence record
        │
        ▼
Check system_settings.automation_enabled
        │
   ┌────┴────┐
   │ true    │ false
   ▼         ▼
 Post to    Mark as
 Slack      ready
   │         │
   ▼         ▼
 Mark       Await manual
 published  /api/intelligence/publish
```

### 10.3 Automation Control

| Setting | Default | Description |
|---------|---------|-------------|
| `automation_enabled` | `true` | Auto-post weekly digest to Slack |
| `manual_override` | `false` | Require manual approval before posting |

---

## 11. Tech Stack

### 11.1 Stack Summary

| Layer | Technology | Purpose |
|-------|------------|--------|
| **Frontend** | React 19 + Vite 7 | SPA dashboard |
| **Frontend (future)** | Tailwind CSS, Recharts | Styling, data visualization |
| **Backend** | Express.js 5 + TypeScript | REST API server |
| **ORM** | Prisma 7 | Database access, migrations, type safety |
| **Database** | Supabase PostgreSQL | Primary persistent storage |
| **AI/LLM** | Anthropic Claude (`@anthropic-ai/sdk`) | Content scoring, intelligence generation |
| **Messaging** | Slack (`@slack/web-api`) | Weekly digest delivery |
| **Scheduling** | Node `cron` library | Background job scheduling |
| **Dev Tooling** | TypeScript 5, ts-node, concurrently | Type safety, dev server |
| **Build** | Vite | Frontend bundling |

### 11.2 Dependency Map

```
package.json
├── Production
│   ├── @anthropic-ai/sdk       → Claude LLM integration
│   ├── @prisma/client          → Database ORM
│   ├── @slack/web-api          → Slack messaging
│   ├── @vitejs/plugin-react    → React HMR for Vite
│   ├── cors                    → Cross-origin support
│   ├── cron                    → Job scheduling
│   ├── dotenv                  → Environment config
│   ├── express                 → HTTP server
│   ├── node-fetch              → HTTP client for adapters
│   ├── prisma                  → Migration CLI
│   ├── react / react-dom       → Frontend framework
│   └── vite                    → Frontend build tool
│
└── Development
    ├── @types/cors             → Type definitions
    ├── @types/express          → Type definitions
    ├── @types/node             → Type definitions
    ├── concurrently            → Run server + vite in parallel
    ├── ts-node                 → TypeScript execution
    └── typescript              → Type checker
```

### 11.3 Development Scripts

| Command | Action |
|---------|--------|
| `npm run dev` | Start both Express server + Vite dev server concurrently |
| `npm run server` | Start Express server only (via ts-node) |
| `npm run vite-dev` | Start Vite dev server only |
| `npm run build` | Build production frontend bundle |

---

## 12. Infrastructure & Deployment

### 12.1 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION                            │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │  Node.js Process     │  │  Supabase (Managed)      │ │
│  │                      │  │                          │ │
│  │  ┌────────────────┐  │  │  ┌────────────────────┐  │ │
│  │  │ Express Server │  │  │  │  PostgreSQL DB     │  │ │
│  │  │ (API + Static) │  │  │  │                    │  │ │
│  │  └────────────────┘  │  │  │  • builders        │  │ │
│  │                      │  │  │  • builder_sources  │  │ │
│  │  ┌────────────────┐  │  │  │  • content_items    │  │ │
│  │  │ Worker Process │  │  │  │  • processed_items  │  │ │
│  │  │ (Cron Jobs)    │  │  │  │  • weekly_intel     │  │ │
│  │  └────────────────┘  │  │  │  • system_settings  │  │ │
│  │                      │  │  └────────────────────┘  │ │
│  └──────────────────────┘  └──────────────────────────┘ │
│              │                           │               │
│              └───────── Prisma ──────────┘               │
│                                                          │
└─────────────────────────────────────────────────────────┘
         │                                │
         ▼                                ▼
   ┌───────────┐                  ┌──────────────┐
   │  Slack    │                  │  Anthropic   │
   │  (output) │                  │  Claude (AI) │
   └───────────┘                  └──────────────┘
```

### 12.2 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No (default: 3001) | Express server port |
| `NODE_ENV` | No (default: development) | Runtime environment |
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string (pooled) |
| `DIRECT_URL` | Yes | Supabase PostgreSQL direct connection (migrations) |
| `ANTHROPIC_API_KEY` | No* | Claude API key (*mock scores without it) |
| `LINKEDIN_API_KEY` | No | LinkedIn content ingestion |
| `TWITTER_BEARER_TOKEN` | No | Twitter/X content ingestion |
| `GITHUB_TOKEN` | No | GitHub activity ingestion |
| `SLACK_BOT_TOKEN` | Phase 3 | Slack bot OAuth token |
| `SLACK_CHANNEL_ID` | Phase 3 | Target Slack channel |

### 12.3 Development Setup

```
1. Clone repository
2. cp .env.example .env (fill in credentials)
3. npm install
4. npx prisma migrate deploy   (or: npx prisma db push)
5. npx prisma generate
6. npm run dev                  (starts server + vite)
```

---

## 13. Security & Configuration

### 13.1 Security Considerations

| Area | Approach |
|------|----------|
| **API Authentication** | Internal tool — no auth for MVP. Add API keys or SSO for production. |
| **Database Access** | All access via Prisma ORM. No raw SQL in application code. |
| **Secret Management** | Environment variables via `.env` (never committed to git) |
| **LLM Data Privacy** | Only public content is sent to Claude. No PII or internal data. |
| **Input Validation** | Request body validation in route handlers |
| **CORS** | Configured for development proxy; tighten for production |
| **Rate Limiting** | Not required for MVP (internal tool). Add for production. |
| **Cascading Deletes** | Database-level cascade on delete (builder → sources → items) |

### 13.2 Error Handling Strategy

| Layer | Strategy |
|-------|----------|
| **API Routes** | Try/catch with 500 responses; Prisma error code mapping (P2025 → 404) |
| **Ingestion** | Per-adapter try/catch; log failures, continue with other sources |
| **Scoring** | Retry with exponential backoff; mark as failed after 3 attempts |
| **Weekly Job** | Full transaction; rollback on failure; alert on Slack post failure |

---

## 14. Phased Implementation Plan

### Phase 1 — Intelligence Validation (Current)

```
✅ Builder CRUD (Prisma + Express routes)
✅ Builder Source CRUD
✅ Content ingestion service (mock adapters)
✅ Scoring service (mock + Claude skeleton)
✅ Intelligence service (mock weekly data)
✅ React dashboard (feed + builder management)
✅ Prisma schema + migrations
✅ Database: Supabase PostgreSQL

🔲 Real RSS adapter implementation
🔲 Real Claude scoring integration
🔲 Content persistence to DB (currently in-memory)
🔲 Scoring worker (background, not in API)
🔲 Clean up legacy code (server/services/builders.js, prisma/seed.js field mismatches)
```

**Success Criteria:**
- Scores feel meaningful when using real Claude scoring
- Top items look correct based on manual review
- Builders produce useful signals from real sources

### Phase 2 — Intelligence Layer

```
🔲 Weekly ranking query (top N by overall_score within date range)
🔲 Trend aggregation logic (week-over-week comparison)
🔲 Strategic experiment generator (Claude-powered)
🔲 Builder influence metrics
🔲 weekly_intelligence table population
🔲 Dashboard: top items this week (real data)
🔲 Dashboard: priority distribution chart
🔲 Dashboard: builder influence ranking
```

### Phase 3 — Slack Automation

```
🔲 Slack bot integration (@slack/web-api)
🔲 Weekly cron job (node-cron)
🔲 Automation toggle (system_settings)
🔲 Manual publish endpoint
🔲 Slack message formatting (Block Kit)
🔲 /api/settings endpoints
🔲 Settings UI in dashboard
```

### Implementation Timeline

```
  Phase 1                Phase 2              Phase 3
  ──────────────────    ──────────────────    ──────────────────
  │ Builder CRUD   │    │ Rankings      │    │ Slack Bot     │
  │ Ingestion Mock │    │ Trends        │    │ Cron Jobs     │
  │ Scoring Mock   │    │ Experiments   │    │ Auto Toggle   │
  │ Dashboard UI   │    │ Builder Stats │    │ Manual Pub    │
  │ Real Adapters  │    │ Dashboard v2  │    │ Settings UI   │
  ──────────────────    ──────────────────    ──────────────────
       POC                  MVP v1               MVP v2
```

---

## 15. Non-Functional Requirements

| Requirement | Target | Notes |
|-------------|--------|-------|
| **Availability** | 99% uptime | Internal tool; some downtime acceptable |
| **Latency** | API < 500ms | Dashboard calls should be fast; workers are async |
| **Throughput** | ~25 builders, ~100–200 items/week | No high-scale concerns for MVP |
| **Data Retention** | Indefinite | Keep all historical data for trend analysis |
| **Scoring Latency** | 5–15s per item | Acceptable since it's async/background |
| **Weekly Job** | < 5 minutes total | Generate full weekly report |
| **Recovery** | Retry failed items automatically | Scoring worker handles retries |
| **Observability** | Console logging | Structured logging for production (future) |

---

## 16. Future Extensions

Supported by the current architecture but **not required for MVP**:

| Extension | Description |
|-----------|-------------|
| **Experiment Tracking** | Track which experiments are tried and their outcomes |
| **Engagement Feedback Loop** | Team members rate insights; feed back into scoring weights |
| **Priority Weight Tuning UI** | Adjust scoring dimension weights from the dashboard |
| **Personalization** | Per-user or per-team relevance filtering |
| **Multi-Channel Distribution** | Email digest, MS Teams, Discord, etc. |
| **Strategic Drift Detection** | Alert when team's focus diverges from priorities |
| **Embeddings Search** | Semantic search over historical insights |
| **Recharts Visualizations** | Priority distribution, score trends, builder influence charts |
| **Sanitized Public Insights** | Publish curated insights to SG/DS public site |
| **RSS Output Feed** | Generate an RSS feed of top weekly insights |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Builder** | A curated engineering thought leader being tracked |
| **Source** | A specific content channel for a builder (RSS feed, GitHub, etc.) |
| **Content Item** | A single piece of content fetched from a source |
| **Processed Item** | A scored and analyzed content item |
| **Weekly Intelligence** | The aggregated weekly report with rankings, trends, experiments |
| **Priority Flag** | A tag indicating which scoring dimension an item is most relevant to |
| **Strategic Experiment** | An actionable recommendation derived from weekly analysis |
| **Adapter** | A platform-specific module that fetches content from external APIs |

## Appendix B: Architecture Decision Records (Referenced)

| ADR | Title | Status |
|-----|-------|--------|
| ADR-002 | Content Ingestion Architecture (Adapter Pattern) | Accepted |
| ADR-005 | LLM-Based Multi-Dimensional Scoring | Accepted |

---

*This document should be updated as the system evolves through each implementation phase.*
