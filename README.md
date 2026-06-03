<div align="center">

# 🎯 MockMentor — AI-Powered Mock Interview Platform

**Nền tảng luyện phỏng vấn kỹ thuật toàn diện với AI, hỗ trợ DSA · System Design · Behavioral**

[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-v18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<br/>

> Luyện tập phỏng vấn với AI interviewer thực sự — phản hồi theo thời gian thực, chấm điểm tự động, hỗ trợ 3 ngôn ngữ.

</div>

---

## 📋 Mục lục

- [Tổng quan](#-tổng-quan)
- [Tính năng nổi bật](#-tính-năng-nổi-bật)
- [Tech Stack](#-tech-stack)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Cấu trúc project](#-cấu-trúc-project)
- [Bắt đầu nhanh](#-bắt-đầu-nhanh)
- [Cấu hình môi trường](#-cấu-hình-môi-trường)
- [Chạy từng service](#-chạy-từng-service)
- [API Reference](#-api-reference)
- [Frontend Routes](#-frontend-routes)
- [Quốc tế hóa (i18n)](#-quốc-tế-hóa-i18n)
- [Testing](#-testing)
- [Tài liệu kỹ thuật](#-tài-liệu-kỹ-thuật)

---

## 🌟 Tổng quan

**MockMentor** là nền tảng luyện phỏng vấn kỹ thuật toàn diện được hỗ trợ bởi AI (Google Gemini & Groq). Ứng viên có thể thực hành qua 3 loại phỏng vấn chính:

| Loại phỏng vấn | Mô tả |
|---|---|
| **DSA / LeetCode** | Giải bài coding với judge thực thi code, AI Socratic interviewer gợi ý theo phong cách thầy hỏi trò |
| **System Design** | Thiết kế hệ thống trên whiteboard tương tác, AI đặt câu hỏi follow-up và đánh giá kiến trúc |
| **Behavioral** | Trả lời câu hỏi phỏng vấn hành vi (STAR method), AI đánh giá và cho điểm chi tiết |

Ngoài phỏng vấn thông thường, platform còn có **Combat Mode** — chế độ thi đấu có tính giờ, log sự kiện proctoring, và tính điểm integrity.

---

## ✨ Tính năng nổi bật

### 🤖 AI Interviewer
- **Real-time feedback** qua WebSocket — AI phản hồi ngay khi ứng viên trả lời
- **Socratic questioning** cho DSA — AI không cho đáp án thẳng, dẫn dắt ứng viên tự khám phá
- **Multi-LLM support** — Google Gemini (primary) + Groq (fallback)
- **Curveball scenarios** — SD interviewer tự động inject tình huống bất ngờ (scale-up, failure, new constraint)

### 💻 System Design Room
- **Interactive whiteboard** với React Flow — vẽ diagram kiến trúc trực tiếp trên trình duyệt
- **Timed design phases** — chia session thành các phase có deadline
- **Reference walkthrough** — sau phỏng vấn, so sánh bài làm với architecture chuẩn
- **Evaluation engine** — AI chấm điểm theo các rubric: scalability, reliability, consistency, trade-offs

### 🏆 Combat Mode
- **Thi có đồng hồ đếm ngược** cho DSA và System Design
- **Proctoring** — log các sự kiện bất thường (blur tab, tắt mic, nhìn ra ngoài)
- **Integrity score** — điểm trung thực dựa trên hành vi trong khi làm bài

### 🎯 Question Bank
- **500+ behavioral questions** phân loại theo role, level, và competency
- **Semantic search (RAG)** — tìm câu hỏi liên quan bằng ngôn ngữ tự nhiên với Gemini embeddings
- **CV-based autofill** — upload CV, hệ thống tự chọn câu hỏi phù hợp với kinh nghiệm
- **Admin curator** — quản trị viên có thể thêm, sửa, duyệt câu hỏi

### 💳 Credit System
- **Credit wallet** — mỗi tài khoản có ví tín dụng
- **Thanh toán qua MoMo & VNPay** — tích hợp cổng thanh toán Việt Nam
- **Auto refund** — hoàn tín dụng tự động nếu session không hoàn thành
- **Transaction history** — lịch sử toàn bộ giao dịch

### 🌐 Đa ngôn ngữ
- **Tiếng Việt** (mặc định), **English**, **日本語**
- i18next với lazy loading, fallback language

---

## 🛠 Tech Stack

### Backend

| Thành phần | Công nghệ | Version |
|---|---|---|
| Framework | NestJS | v11 |
| Language | TypeScript | v5.7 |
| ORM | TypeORM | v0.3 |
| Database | PostgreSQL | — |
| Cache / Queue | Redis + BullMQ | v5 |
| Authentication | Passport (JWT + GitHub OAuth) | — |
| AI | Google Gemini + Groq SDK | — |
| Document parsing | pdf-parse + mammoth | — |
| Validation | class-validator + Zod | — |
| API Docs | Swagger / OpenAPI | v11 |
| Testing | Jest + Supertest | v30 |

### Frontend

| Thành phần | Công nghệ | Version |
|---|---|---|
| Framework | React | v18 |
| Build tool | Vite | v6 |
| Routing | React Router | v7 |
| State | Redux Toolkit + Redux-Saga | v2 / v1.4 |
| Styling | Tailwind CSS | v3 |
| Icons | Lucide React | v0.474 |
| Animation | Framer Motion | v12 |
| Code editor | Monaco Editor | v4.7 |
| Whiteboard | React Flow (@xyflow) | v12 |
| Charts | Recharts | v3 |
| Markdown | react-markdown + remark-gfm | — |
| i18n | i18next + react-i18next | v25 |
| E2E Testing | Playwright | v1.59 |

### Code Runner (Sandbox)

| Thành phần | Công nghệ |
|---|---|
| Framework | Express |
| Runtime isolation | Node.js child_process spawn |
| API style | Judge0-compatible REST |

**Ngôn ngữ hỗ trợ:** Python 2/3 · Node.js · C · C++ · Java · Bash

---

## 🏗 Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser Client                        │
│         React 18 · Vite · Redux-Saga · Tailwind CSS         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                      NestJS Backend                          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │Interview │  │   SD     │  │Behavioral│   │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Combat   │  │Question  │  │  Wallet  │  │ Payment  │   │
│  │  Module  │  │  Bank    │  │  Module  │  │  Module  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              AI Service Layer                         │   │
│  │    Google Gemini API   ·   Groq API                  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────┬─────────────────────┬───────────────────────────┘
           │                     │
┌──────────▼──────┐   ┌──────────▼──────────────────────────┐
│   PostgreSQL    │   │         Redis                         │
│  (Primary DB)   │   │  Cache · BullMQ Queues · Sessions    │
└─────────────────┘   └─────────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────┐
│                    Code Runner (Sandbox)                      │
│         Express · Judge0-compatible · Multi-language         │
└─────────────────────────────────────────────────────────────┘
```

### Luồng xử lý chính

```
User Request
    │
    ▼
React Component
    │  dispatch(action)
    ▼
Redux-Saga (side effect)
    │  axios call
    ▼
NestJS Controller
    │  @UseGuards(JwtAuthGuard)
    ▼
Service Layer
    │  TypeORM / BullMQ / AI SDK
    ▼
PostgreSQL / Redis / Gemini API
```

---

## 📁 Cấu trúc project

```
Final Project/
│
├── server/                          # NestJS backend
│   ├── src/
│   │   ├── app.module.ts            # Root module
│   │   ├── main.ts                  # Bootstrap entry point
│   │   │
│   │   ├── ai/                      # Gemini & Groq AI wrappers
│   │   ├── auth/                    # JWT auth, GitHub OAuth
│   │   ├── users/                   # User profile & identity linking
│   │   │
│   │   ├── interview/               # Interview session orchestration
│   │   ├── live-coding/             # DSA live coding session
│   │   ├── practice-dsa/            # DSA practice tracking
│   │   ├── combat/                  # Combat Mode (timed DSA/SD)
│   │   │
│   │   ├── sd-problem/              # System Design problem bank
│   │   ├── sd-session/              # SD session management
│   │   ├── sd-interviewer/          # AI SD interviewer
│   │   ├── sd-evaluator/            # SD evaluation engine
│   │   ├── sd-orchestrator/         # SD flow orchestration
│   │   │
│   │   ├── behavioral/              # Behavioral interview entities
│   │   ├── behavior-session/        # Behavioral session management
│   │   ├── session-planning/        # Question sequence planning
│   │   ├── question-bank/           # Behavioral question bank
│   │   │
│   │   ├── problems/                # DSA problem bank
│   │   ├── test-cases/              # Test case management
│   │   ├── judge/                   # Code submission judge
│   │   │
│   │   ├── wallet/                  # Credit wallet
│   │   ├── payment/                 # MoMo & VNPay integration
│   │   ├── documents/               # CV/resume upload & parsing
│   │   ├── tts/                     # Text-to-speech
│   │   ├── jobs/                    # BullMQ async jobs
│   │   ├── common/                  # Guards, decorators, utilities
│   │   ├── scripts/                 # Seed scripts
│   │   └── migrations/              # Database migrations
│   │
│   ├── tests/
│   │   ├── unit/                    # Jest unit tests
│   │   └── integration/             # Supertest integration tests
│   └── package.json
│
├── client/
│   └── apps/web/                    # React frontend (Vite)
│       ├── src/
│       │   ├── App.jsx              # Router setup
│       │   ├── router/              # Route constants & guards
│       │   ├── components/          # Feature components
│       │   │   ├── landing/
│       │   │   ├── auth/
│       │   │   ├── dashboard/
│       │   │   ├── interview-setup/
│       │   │   ├── interview-room/  # DSA interview room
│       │   │   ├── behavioral-room/ # Behavioral room
│       │   │   ├── sd-room/         # System Design room
│       │   │   ├── combat-room/     # Combat mode room
│       │   │   ├── question-bank/   # Public question browser
│       │   │   ├── practice/        # DSA practice bank
│       │   │   ├── payment/         # Credit purchase UI
│       │   │   ├── admin/           # Admin pages
│       │   │   └── shared/          # DashboardShell, Navigation
│       │   ├── store/
│       │   │   ├── store.js         # Redux store
│       │   │   ├── slices/          # RTK slices
│       │   │   └── sagas/           # Redux-Saga workers
│       │   ├── api/                 # Axios API clients
│       │   ├── hooks/               # Custom React hooks
│       │   └── i18n/                # i18next config + locales
│       └── package.json
│
├── code-runner/                     # Code execution sandbox
│   ├── server.js                    # Express Judge0-compatible API
│   └── package.json
│
├── docs/
│   ├── features/                    # 35+ feature specs (BA.md, HOW.md)
│   ├── agent-guide/                 # Development conventions & guides
│   └── agent-audits/                # Process audit records
│
└── CLAUDE.md                        # Agent workflow entrypoint
```

---

## 🚀 Bắt đầu nhanh

### Yêu cầu

- **Node.js** >= 20
- **PostgreSQL** >= 14
- **Redis** >= 7
- **Git**

### 1. Clone repository

```bash
git clone <repo-url>
cd "Final Project"
```

### 2. Cài đặt dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client/apps/web
npm install

# Code runner
cd ../../../code-runner
npm install
```

### 3. Cấu hình environment

```bash
# Tạo file .env từ template
cp server/.env.example server/.env
# Điền các giá trị cần thiết (xem phần Cấu hình môi trường bên dưới)
```

### 4. Khởi động

```bash
# Terminal 1 — Backend
cd server
npm run start:dev

# Terminal 2 — Frontend
cd client/apps/web
npm run dev

# Terminal 3 — Code Runner
cd code-runner
npm run dev
```

Truy cập: [http://localhost:5173](http://localhost:5173)

---

## ⚙️ Cấu hình môi trường

### Backend (`server/.env`)

```env
# ─── Database ────────────────────────────────────────────
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=mock_interview_db

# ─── Redis ───────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379

# ─── JWT ─────────────────────────────────────────────────
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# ─── AI Services ─────────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# ─── GitHub OAuth ────────────────────────────────────────
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback

# ─── Payment ─────────────────────────────────────────────
MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret

# ─── App ─────────────────────────────────────────────────
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Frontend (`client/apps/web/.env`)

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

---

## 🏃 Chạy từng service

### Backend

```bash
cd server

# Development (hot-reload)
npm run start:dev

# Production build
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

### Seed data

```bash
cd server

# Seed System Design problems
npm run seed:sd

# Seed behavioral question probes
npm run seed:probes

# Import questions từ JSON file
npm run import:probes
```

### Frontend

```bash
cd client/apps/web

# Development server (port 5173)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Code Runner

```bash
cd code-runner

# Production
npm start

# Development (nodemon)
npm run dev
```

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Đăng ký tài khoản | — |
| `POST` | `/auth/login` | Đăng nhập, trả access token | — |
| `POST` | `/auth/refresh` | Refresh access token | Cookie |
| `POST` | `/auth/logout` | Đăng xuất | JWT |
| `GET` | `/auth/me` | Thông tin user hiện tại | JWT |
| `GET` | `/auth/github` | Khởi tạo GitHub OAuth | — |
| `GET` | `/auth/github/link` | Liên kết GitHub với account có sẵn | JWT |

### Interview Sessions

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/interview/preflight` | Kiểm tra điều kiện trước phỏng vấn |
| `PUT` | `/interview/context` | Cập nhật context (role, level, type) |
| `POST` | `/interview/sessions/init` | Khởi tạo session phỏng vấn |
| `GET` | `/interview/sessions/in-progress` | Danh sách session đang chạy |

### Live Coding (DSA)

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/live-coding/sessions` | Tạo coding session |
| `POST` | `/live-coding/sessions/:id/run` | Chạy code thử |
| `POST` | `/live-coding/sessions/:id/submit` | Nộp bài |
| `GET` | `/live-coding/sessions/:id/score` | Xem điểm |

### System Design

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/sd-problems` | Danh sách bài SD công khai |
| `POST` | `/sd-sessions` | Tạo SD session |
| `POST` | `/sd-sessions/:id/start` | Bắt đầu phỏng vấn |
| `POST` | `/sd-sessions/:id/message` | Gửi quyết định kiến trúc |
| `POST` | `/sd-sessions/:id/done-drawing` | Hoàn thành vẽ diagram |
| `POST` | `/sd-sessions/:id/hint` | Yêu cầu gợi ý |
| `POST` | `/sd-sessions/:id/evaluate` | Đánh giá solution |

### Behavioral

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/behavior-sessions` | Tạo behavioral session |
| `POST` | `/api/behavior-sessions/:id/answer` | Nộp câu trả lời |
| `POST` | `/api/behavior-sessions/:id/complete` | Hoàn thành session |

### Question Bank

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/question-bank` | Danh sách câu hỏi công khai |
| `GET` | `/question-bank/:id` | Chi tiết câu hỏi |
| `POST` | `/question-bank/:id/evaluate` | AI đánh giá câu trả lời |

### Credit & Payment

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/wallet/balance` | Số dư tín dụng |
| `GET` | `/wallet/transactions` | Lịch sử giao dịch |
| `POST` | `/payment/orders` | Tạo đơn thanh toán |
| `GET` | `/payment/orders/:orderId/status` | Kiểm tra trạng thái |
| `POST` | `/payment/webhook/momo` | MoMo IPN webhook |
| `GET` | `/payment/webhook/vnpay` | VNPay return URL |

### Code Runner (Judge0-compatible)

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/submissions` | Nộp code để chạy |
| `GET` | `/submissions/:token` | Lấy kết quả |
| `POST` | `/submissions/batch` | Nộp nhiều test case |
| `GET` | `/submissions/batch` | Lấy kết quả batch |
| `GET` | `/languages` | Danh sách ngôn ngữ hỗ trợ |

---

## 🗺 Frontend Routes

| Route | Trang | Bảo vệ |
|---|---|---|
| `/` | Landing Page | Public |
| `/login` | Đăng nhập | Guest only |
| `/register` | Đăng ký | Guest only |
| `/dashboard` | Dashboard chính | JWT |
| `/dashboard/profile` | Skill Passport | JWT |
| `/interview-setup` | Chọn loại phỏng vấn | JWT |
| `/interview-room` | Phòng phỏng vấn DSA | JWT + Session |
| `/behavioral-room` | Phòng phỏng vấn Behavioral | JWT + Session |
| `/sd-room` | Phòng phỏng vấn System Design | JWT + Session |
| `/dsa-room` | Combat Mode DSA | JWT |
| `/dsa-room-solo` | DSA Solo (full-screen) | JWT |
| `/scoring` | Kết quả & điểm số | JWT |
| `/practice-problems` | Kho bài tập DSA | JWT |
| `/question-bank` | Kho câu hỏi behavioral | JWT |
| `/question-bank/:probeId` | Chi tiết câu hỏi | JWT |
| `/buy-credits` | Mua tín dụng | JWT |
| `/payment/result` | Kết quả thanh toán | JWT |
| `/admin` | Admin — DSA Problems | Admin |
| `/admin/testcases` | Admin — Test Cases | Admin |
| `/admin/sd-problems` | Admin — SD Problems | Admin |
| `/admin/question-bank` | Admin — Question Bank | Admin |

---

## 🌐 Quốc tế hóa (i18n)

Platform hỗ trợ 3 ngôn ngữ:

| Ngôn ngữ | Code | File | Mặc định |
|---|---|---|---|
| Tiếng Việt | `vi` | `src/i18n/locales/vi.json` | ✅ |
| English | `en` | `src/i18n/locales/en.json` | — |
| 日本語 | `ja` | `src/i18n/locales/ja.json` | — |

**Sử dụng trong component:**

```jsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()
  return <button>{t('common.submit')}</button>
}
```

**Đổi ngôn ngữ:**

```jsx
import { useTranslation } from 'react-i18next'

const { i18n } = useTranslation()
i18n.changeLanguage('en')  // hoặc 'vi', 'ja'
```

---

## 🧪 Testing

### Backend — Unit & Integration

```bash
cd server

# Chạy unit tests
npm test

# Chạy với coverage report
npm run test:cov

# Chạy integration tests (Supertest)
npm run test:e2e

# Watch mode
npm run test:watch
```

### Frontend — E2E (Playwright)

```bash
cd client/apps/web

# Chạy E2E với mock API
npm run test:e2e

# Chạy E2E với real API
npm run test:e2e:real

# Mở Playwright UI
npm run test:e2e:ui

# Headed mode (hiện browser)
npm run test:e2e:headed

# Xem báo cáo test
npm run test:e2e:report
```

---

## 📚 Tài liệu kỹ thuật

### Feature Specs

Mỗi tính năng có bộ tài liệu riêng trong `docs/features/<NNN>-<feature>/`:

| File | Nội dung |
|---|---|
| `BA.md` | Business Analysis — WHAT/WHY/SCOPE/Acceptance Criteria |
| `HOW.md` | Solution Architecture — decisions, API contracts, quality guardrails |
| `REVIEW-BE.md` / `REVIEW-FE.md` | Kết quả code review |
| `TEST.md` | Test case matrix + kết quả thực thi |

### Development Guides

Tất cả convention và hướng dẫn trong `docs/agent-guide/`:

| File | Nội dung |
|---|---|
| [convention-be.md](docs/agent-guide/convention-be.md) | Backend coding conventions |
| [convention-fe.md](docs/agent-guide/convention-fe.md) | Frontend coding conventions |
| [dev-guide.md](docs/agent-guide/dev-guide.md) | Development workflow |
| [review-be.md](docs/agent-guide/review-be.md) | Backend review checklist |
| [review-fe.md](docs/agent-guide/review-fe.md) | Frontend review checklist |
| [test-guide.md](docs/agent-guide/test-guide.md) | Testing guidelines |

### Agent Workflow

Project sử dụng agent-driven development với các lệnh:

```
ba <feature>         →  Business Analysis
sa <feature>         →  Solution Architecture
be <feature>         →  Backend development
fe <feature>         →  Frontend development
review be <feature>  →  Backend code review
review fe <feature>  →  Frontend code review
test <feature>       →  Test automation
fix <mô tả>          →  Quick fix (1-2 files)
pa <mô tả lỗi>       →  Process audit
```

---

## 🔐 Bảo mật

- **HttpOnly Cookies** — refresh token không bị XSS truy cập
- **JWT short-lived** — access token hết hạn sau 15 phút
- **bcrypt** — mật khẩu hash với salt rounds = 10
- **CORS** — chỉ cho phép origin từ frontend URL đã cấu hình
- **GitHub OAuth** — đăng nhập không cần lưu mật khẩu
- **Proctoring** — phát hiện hành vi gian lận trong Combat Mode

---

## 👥 Đóng góp

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/ten-tinh-nang`
3. Commit: `git commit -m "feat: mô tả thay đổi"`
4. Push: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

---

<div align="center">

Made with ❤️ by the MockMentor Team

</div>
