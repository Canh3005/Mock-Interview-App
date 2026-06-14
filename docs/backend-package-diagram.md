# Backend Package Dependency Diagram

## Quy tắc đọc biểu đồ

| Ký hiệu | Ý nghĩa |
|---------|---------|
| `A --> B` | A phụ thuộc vào B (compile-time / inject) |
| `A -.-> B` | A phụ thuộc vào B (gián tiếp / queue / event) |
| Subgraph | Package (nhóm module cùng domain) |

> **Nguyên tắc:** Mũi tên luôn chỉ từ module phụ thuộc → module bị phụ thuộc.  
> Layer cao hơn phụ thuộc vào layer thấp hơn, không chiều ngược lại.

---

## Biểu đồ

```mermaid
graph TD

    subgraph INFRA["Infrastructure (Global)"]
        redis[redis]
        common[common]
        ai[ai]
        tts[tts]
    end

    subgraph AUTH["Auth & User"]
        users[users]
        wallet[wallet]
        auth[auth]
    end

    subgraph DOCS_KNOW["Documents & Knowledge"]
        documents[documents]
        question_bank[question-bank]
        session_planning[session-planning]
    end

    subgraph INTERVIEW_CORE["Interview Core"]
        interview[interview]
        notifications[notifications]
    end

    subgraph BEHAVIOR["Behavior"]
        behavior_session[behavior-session]
        combat[combat]
    end

    subgraph LIVE_CODING["Live Coding"]
        judge[judge]
        test_cases[test-cases]
        problems[problems]
        live_coding[live-coding]
        practice_dsa[practice-dsa]
    end

    subgraph SD["System Design"]
        sd_problem[sd-problem]
        sd_session[sd-session]
        sd_orchestrator[sd-orchestrator]
        sd_interviewer[sd-interviewer]
        sd_evaluator[sd-evaluator]
    end

    subgraph NSD["New System Design"]
        nsd_problem[nsd-problem]
        nsd_session[nsd-session]
        nsd_orchestrator[nsd-orchestrator]
        nsd_interviewer[nsd-interviewer]
        nsd_evaluator[nsd-evaluator]
    end

    subgraph PLATFORM["Platform"]
        jobs[jobs]
        admin[admin]
        payment[payment]
    end

    %% ── Auth & User ────────────────────────────────────────────────
    auth --> users
    auth --> wallet

    %% ── Documents & Knowledge ──────────────────────────────────────
    documents --> users
    session_planning --> documents
    session_planning --> question_bank
    session_planning --> ai

    %% ── Interview Core ─────────────────────────────────────────────
    interview --> wallet
    interview --> documents
    interview --> session_planning

    %% ── Behavior ───────────────────────────────────────────────────
    behavior_session --> question_bank
    behavior_session --> session_planning
    behavior_session --> ai
    combat --> ai

    %% ── Live Coding ────────────────────────────────────────────────
    problems --> test_cases
    problems --> judge
    live_coding --> interview
    live_coding --> judge
    live_coding --> combat
    live_coding --> problems
    live_coding --> ai
    practice_dsa --> live_coding

    %% ── System Design ──────────────────────────────────────────────
    sd_session --> sd_problem
    sd_session --> interview
    sd_orchestrator --> sd_session
    sd_orchestrator --> ai
    sd_interviewer --> sd_session
    sd_interviewer --> sd_orchestrator
    sd_evaluator --> sd_session
    sd_evaluator --> sd_orchestrator

    %% ── New System Design ──────────────────────────────────────────
    nsd_session --> nsd_problem
    nsd_session --> interview
    nsd_orchestrator --> nsd_session
    nsd_orchestrator --> ai
    nsd_interviewer --> nsd_orchestrator
    nsd_evaluator --> nsd_session
    nsd_evaluator --> nsd_orchestrator

    %% ── Platform ───────────────────────────────────────────────────
    jobs -.-> documents
    jobs -.-> live_coding
    jobs -.-> sd_evaluator
    jobs -.-> question_bank
    jobs -.-> behavior_session
    jobs -.-> interview
    jobs -.-> combat
    jobs -.-> nsd_evaluator
    admin --> users
    admin --> wallet
    admin --> interview
    admin --> question_bank
    admin --> ai
```

---

## Phân tầng (Layer)

```
Layer 0 — Infrastructure:   redis · common · ai · tts
Layer 1 — Foundation:       users · wallet · judge · test-cases · notifications · payment · tts
                            sd-problem · nsd-problem
Layer 2 — Domain:           documents · question-bank · session-planning
                            interview · behavior-session · combat · problems
Layer 3 — Feature:          live-coding · practice-dsa
                            sd-session · nsd-session
Layer 4 — Orchestration:    sd-orchestrator · sd-interviewer · sd-evaluator
                            nsd-orchestrator · nsd-interviewer · nsd-evaluator
Layer 5 — Platform:         jobs · admin · payment · auth
```

---

## Ghi chú thiết kế

- **`ai`, `redis`, `common`** được đánh dấu `@Global()` — không cần import tường minh ở module con.
- **`jobs`** dùng mũi tên `-.->` vì phụ thuộc qua BullMQ queue name (loose coupling), không inject trực tiếp.
- **`payment`** độc lập hoàn toàn — không phụ thuộc bất kỳ domain module nào.
- **`notifications`** độc lập — được inject vào module khác khi cần push noti, không có dependency ngược lại.
- Không có circular dependency nào giữa các package.
