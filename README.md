# MockInterview — AI-Powered Technical Interview Platform

> Nền tảng luyện tập phỏng vấn kỹ thuật toàn diện với AI, hỗ trợ đa ngôn ngữ (Tiếng Việt · English · 日本語)

---

## Tổng quan

**MockInterview** là nền tảng luyện phỏng vấn kỹ thuật được hỗ trợ bởi AI, giúp lập trình viên chuẩn bị cho các vòng phỏng vấn thực tế — từ giải thuật DSA, phỏng vấn hành vi (behavioral), chế độ thi đấu (combat), đến thiết kế hệ thống (system design). Hệ thống tích hợp chấm code tự động, AI phản hồi thời gian thực, và bảng vẽ kiến trúc tương tác.

---

## Tính năng chính

### Các vòng phỏng vấn

| Vòng | Mô tả | Trạng thái |
|------|-------|------------|
| **DSA Coding** | Giải bài thuật toán với code editor, chấm điểm tự động qua Judge0-compatible runner | ✅ Hoàn thiện |
| **Behavioral** | Phỏng vấn hành vi với AI interviewer, hỗ trợ giọng nói, phản hồi và chấm điểm theo STAR | ✅ Hoàn thiện |
| **Combat Mode** | Chế độ thi đấu nhiều người, real-time sync, text-to-speech | ✅ Hoàn thiện |
| **System Design** | Thiết kế hệ thống với bảng vẽ tương tác, AI interviewer phase-aware | 🚧 Đang phát triển |

### Tính năng khác

| Tính năng | Mô tả | Trạng thái |
|-----------|-------|------------|
| **Practice Problem Bank** | Thư viện bài DSA tự luyện, phân loại theo mức độ | ✅ Hoàn thiện |
| **Dashboard & Skill Passport** | Tổng quan tiến độ, radar kỹ năng, lộ trình học tập | ✅ Hoàn thiện |
| **CV & JD Analysis** | Upload CV/JD, AI phân tích và gợi ý lộ trình phỏng vấn | ✅ Hoàn thiện |
| **Admin Problem Bank** | Quản lý bài DSA và System Design (CRUD) | ✅ Hoàn thiện |
| **Multi-language UI** | Giao diện tiếng Việt, English, 日本語 | ✅ Hoàn thiện |
| **GitHub OAuth** | Đăng nhập nhanh bằng GitHub | ✅ Hoàn thiện |
| **SD Problem Bank** | Ngân hàng đề System Design với metadata đầy đủ | ✅ Hoàn thiện |
| **SD Whiteboard Canvas** | Bảng vẽ kiến trúc React Flow, 11 loại node, drag-drop | 🚧 Đang phát triển |
| **SD AI Interviewer** | AI dẫn dắt phỏng vấn System Design theo từng phase | 🚧 Đang phát triển |

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│   React + Redux Toolkit + Redux-Saga + Tailwind CSS          │
│   React Flow (SD Canvas) · i18n (en/vi/ja) · Web Speech API │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / SSE
┌────────────────────────▼────────────────────────────────────┐
│                     NestJS Backend (REST + SSE)              │
│   TypeORM · Passport JWT · BullMQ · Swagger                  │
│   Google GenAI · Groq SDK · PDF/DOCX Parsing                 │
└──────┬───────────────────┬──────────────────┬───────────────┘
       │                   │                  │
┌──────▼──────┐  ┌─────────▼──────┐  ┌───────▼───────┐
│ PostgreSQL  │  │   Redis 7.2    │  │  Code Runner  │
│  (Primary   │  │  (Cache +      │  │  (Express.js  │
│   Storage)  │  │   BullMQ)      │  │   Judge0-like)│
└─────────────┘  └────────────────┘  └───────────────┘
```

---

## Tech Stack

### Backend

| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| NestJS | 11.x | Web framework chính |
| TypeORM | 0.3.x | ORM + migrations |
| PostgreSQL | 15 | Database chính |
| Redis | 7.2 | Cache + job queue |
| BullMQ | 5.x | Background jobs |
| Passport.js + JWT | — | Authentication |
| Google GenAI | latest | AI interviewer (SD) |
| Groq SDK | latest | AI responses (Behavioral) |
| Axios | — | External HTTP calls |

### Frontend

| Công nghệ | Vai trò |
|-----------|---------|
| React (SPA) | UI framework |
| Redux Toolkit | State management |
| Redux-Saga | Side effects / async |
| Tailwind CSS | Styling |
| React Flow (@xyflow/react) | SD Whiteboard canvas |
| Lucide React | Icon library |
| react-i18next | Multi-language support |
| Web Speech API | Voice input |

### Infrastructure

| Thành phần | Vai trò |
|------------|---------|
| Docker Compose | Orchestration (PG, Redis, code-runner, pgAdmin) |
| Code Runner | Express.js — sandbox thực thi code (Judge0-compatible) |
| GitHub OAuth | Social login |

---

## Modules Backend (NestJS)

```
server/src/
├── users/            # Quản lý user, profile, CV upload
├── auth/             # JWT + GitHub OAuth
├── problems/         # DSA problem bank (admin + public)
├── test-cases/       # Test case quản lý cho DSA
├── judge/            # Chấm code qua code-runner
├── ai/               # Wrapper thống nhất AI (Groq + Google GenAI)
├── interview/        # Interview session lifecycle
├── behavioral/       # Phỏng vấn hành vi (SSE streaming, scoring)
├── combat/           # Combat mode (multi-player, real-time)
├── dsa/              # DSA session
├── live-coding/      # Live coding support
├── practice-dsa/     # Tự luyện DSA
├── documents/        # Xử lý PDF/DOCX, JD analysis
├── jobs/             # BullMQ async jobs
├── tts/              # Text-to-Speech (combat mode)
├── sd-problem/       # ✅ System Design problem bank
├── sd-session/       # ✅ SD session + phase management
└── sd-interviewer/   # 🚧 AI Interviewer engine (in progress)
```

---

## Luồng phỏng vấn System Design *(đang phát triển)*

```
Interview Setup
     │
     ▼
[SDConfigPanel]  ←─ chọn problem, thời gian, bật/tắt curveball
     │ POST /sd-sessions
     ▼
[SDRoomPage]
     │
     ├── [SDCanvas]          ← React Flow whiteboard, 11 node types
     │       └── auto-save architecture JSON mỗi 30s
     │
     ├── [WalkthroughPanel]  ← voice + text input cho candidate
     │
     └── [AiChatPanel] 🚧    ← SSE stream từ AI interviewer
             │
             ▼
     Phase progression (AI-driven):
     CLARIFICATION → DESIGN → DEEP_DIVE → WRAP_UP
             │
             └── Curveball injection khi coverage ≥ 80%
```

---

## Cấu trúc dự án

```
Final Project/
├── server/                  # NestJS backend
│   ├── src/
│   │   ├── migrations/      # TypeORM migrations
│   │   ├── prompt/          # AI prompt templates
│   │   └── scripts/         # Seed scripts
│   └── package.json
├── client/
│   └── apps/web/            # React SPA
│       └── src/
│           ├── components/  # UI components theo feature
│           ├── store/       # Redux slices + sagas
│           ├── api/         # API client modules
│           ├── hooks/       # Custom React hooks
│           └── i18n/        # Locale files (en/vi/ja)
├── code-runner/             # Express.js code execution sandbox
├── docs/
│   ├── features/            # BA.md + HOW.md theo từng epic
│   └── agent-guide/         # Convention + review checklist
├── docker-compose.yml
└── CLAUDE.md                # Agent workflow guide
```

---

## Quick Start

### Yêu cầu

- Node.js 20+
- Docker & Docker Compose
- pnpm (hoặc npm)

### 1. Khởi động services (DB, Redis, code-runner)

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd server
npm install
npm run migration:run   # chạy TypeORM migrations
npm run seed            # seed dữ liệu mẫu (SD problems, v.v.)
npm run start:dev
```

### 3. Frontend

```bash
cd client/apps/web
npm install
npm run dev
```

Truy cập: `http://localhost:5173`  
API Docs (Swagger): `http://localhost:3000/api`

---

## Roadmap — System Design Round

| Epic | Tên | Trạng thái |
|------|-----|------------|
| 001 | SD Problem Bank | ✅ Hoàn thiện |
| 002 | SD Personalization Setup | 🔄 Backend xong, Frontend đang làm |
| 003 | SD Whiteboard Canvas | 🔄 Backend xong, Canvas UI đang làm |
| 004 | SD AI Interviewer | 🔄 Backend engine đang làm, Frontend chưa bắt đầu |

---

## Đóng góp

Dự án được phát triển theo quy trình agent-driven với CLAUDE.md:

```
ba <feature>  →  BA.md (spec)
sa <feature>  →  HOW.md (technical design)
be <feature>  →  Backend code
fe <feature>  →  Frontend code
review be/fe  →  Code review
```

Convention và checklist: [`docs/agent-guide/`](docs/agent-guide/)

---

*MockInterview — Luyện tập thực chiến, phỏng vấn tự tin.*
