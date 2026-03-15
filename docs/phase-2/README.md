# Phase 2: Luồng Vào Phòng Thi & Vòng Behavioral / AI Prompting

## Mục tiêu Phase

Xây dựng luồng entry đầy đủ trước khi vào phỏng vấn, hai vòng thi trọng tâm (HR/Behavioral STAR và AI Prompting), và lớp Combat Mode với giám sát đa phương thức và chống gian lận.

---

## Danh sách Epic

| Epic | Tên | Scope | Ưu tiên |
|------|-----|-------|---------|
| [Epic 0](./epic-0-pre-interview-entry-flow.md) | Pre-Interview Entry Flow | Cả 2 mode | P0 – Làm trước |
| [Epic 1](./epic-1-star-hr-behavioral-simulator.md) | STAR HR & Behavioral Simulator | Practice Mode | P0 – Song song Epic 0 |
| [Epic 2](./epic-2-ai-prompting-pair-programming.md) | AI Prompting & Pair Programming | Practice Mode | P1 – Sau Epic 1 |
| [Epic 3](./epic-3-combat-multimodal-engine.md) | Combat Multimodal Engine | Combat Mode only | P1 – Song song Epic 2 |
| [Epic 4](./epic-4-combat-proctoring-shield.md) | Combat Proctoring Shield | Combat Mode only | P1 – Song song Epic 2 |

---

## Phân tách Mode rõ ràng

```
Practice Mode
├── Epic 0 (entry flow – phần chung)
├── Epic 1 (STAR Simulator)
└── Epic 2 (AI Prompting)

Combat Mode
├── Epic 0 (entry flow – bao gồm Permission Gate Task 0.3b)
├── Epic 1 (STAR Simulator – không hint, timer nghiêm)
├── Epic 2 (AI Prompting – không CoT live feedback)
├── Epic 3 (Multimodal Engine: Eye-tracking, Filler words, Micro-expression)
└── Epic 4 (Proctoring Shield: Tab monitor, Multi-face, Second voice)
```

---

## Thứ tự triển khai đề xuất

```
Sprint 1:
  ├── Epic 0: Task 0.1 + 0.2 (Preflight API + Entry Modal)
  └── Epic 1: Task 1.1 + 1.2 (Prompt Builder + Stage Management)

Sprint 2:
  ├── Epic 0: Task 0.3 + 0.3b + 0.4 + 0.5 (Mode/Round Selection + Combat Permission Gate + Session Init)
  └── Epic 1: Task 1.3 + 1.4 (AI Facilitator Streaming + UI phòng thi)

Sprint 3:
  ├── Epic 1: Task 1.5 + 1.6 + 1.7 (Voice Input + Scoring + Scorecard)
  └── Epic 2: Task 2.1 + 2.2 + 2.3 (Problem Bank + Internal AI + CoT Analyzer)

Sprint 4:
  ├── Epic 2: Task 2.4 → 2.7 (Hallucination + Scoring + UI + Scorecard)
  ├── Epic 3: Task 3.1 → 3.4 (Engine bootstrap + Eye-tracking + Filler + Expression)
  └── Epic 4: Task 4.1 → 4.3 (Tab monitor + Multi-face + Second voice)

Sprint 5:
  ├── Epic 3: Task 3.5 + 3.6 (Metrics API + Scoring pipeline)
  └── Epic 4: Task 4.4 → 4.7 (Proctoring API + Integrity score + FE indicator + Offline buffer)
```

---

## Nguyên tắc thiết kế xuyên suốt Phase 2

- **Level Parameterization:** Mọi AI interaction đều nhận `candidateLevel` – không bao giờ hardcode câu hỏi cố định.
- **Silent Flagging (Combat):** Không đuổi user khi phát hiện bất thường. Chỉ ghi cờ đỏ kèm timestamp để HR hậu kiểm.
- **Edge Computing (Combat):** MediaPipe chạy hoàn toàn trên client. Server chỉ nhận JSON metadata ~5s/lần – không nhận video, không nhận audio stream.
- **Mandatory Quoting:** Mọi điểm trừ phải trích dẫn lời ứng viên đã nói kèm timestamp.
- **FinOps:** Voice input dùng Web Speech API native (free). CoT analysis dùng rule-based trước, LLM chỉ cho final evaluation.
- **Streaming First:** Mọi AI response đều dùng SSE streaming để giảm cảm giác latency.
