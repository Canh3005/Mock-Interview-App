# HOW - Question Probe Foundation & Taxonomy

## Overview

Xây dựng một bounded context riêng cho Behavioral Question Bank, trong đó `QuestionProbe` là source of truth cho câu hỏi đã được chuẩn hóa. Trọng tâm của feature này là data contract, taxonomy canonical và validation boundary để các feature sau có thể curate, search, select, score và analytics trên cùng một ngôn ngữ hệ thống.

## Business Alignment

BA yêu cầu không lưu câu hỏi như text rời rạc. Kiến trúc phải bảo vệ ba outcome chính:

- Một probe luôn có metadata đủ để lọc theo stage, role, level, type, competency, tech tag và difficulty.
- Một probe luôn có nội dung máy đọc được cho AI (`primaryQuestion`, `intent`, `expectedSignals`, `redFlags`, `scoringHints`, `followUps`) tách khỏi nội dung hiển thị cho candidate (`localizedContent`).
- Một probe giữ cùng một identity khi đổi ngôn ngữ hiển thị để analytics, dedup và scoring không bị tách sai.

## Architecture Decisions

### Decision: Taxonomy Ownership

**Option A - Hard-code enum rải rác trong từng module:** mỗi feature sau tự định nghĩa stage, role, level, competency.
- Pro: nhanh ở giai đoạn đầu.
- Con: dễ lệch nghĩa giữa public bank, selector, scoring và analytics.

**Option B - Question Bank owns canonical taxonomy:** một domain boundary định nghĩa canonical values và expose cho validation/lookup.
- Pro: một source of truth, dễ backward compatibility, các feature sau dùng chung contract.
- Con: cần discipline khi mở rộng taxonomy.

**Chọn: Option B** - vì overview nhấn mạnh canonical metadata phải sạch, ổn định và không phụ thuộc ngôn ngữ hiển thị.

### Decision: Localized Content Storage

**Option A - Tạo probe riêng theo từng ngôn ngữ:** `probe_vi`, `probe_en`, `probe_ja`.
- Pro: query đơn giản cho từng locale.
- Con: phá vỡ dedup, analytics và asked history vì cùng một câu hỏi thành nhiều probe.

**Option B - Một probe, nhiều localized content:** canonical metadata nằm trên probe; localized public-facing content nằm dưới `localizedContent` theo locale.
- Pro: identity ổn định, đúng BA rule, dễ đổi ngôn ngữ trong cùng session.
- Con: cần validation locale trước khi publish.

**Chọn: Option B** - `vi`, `en`, `ja` là content variants của cùng một probe, không phải entity nghiệp vụ khác nhau.

### Decision: Taxonomy Shape

**Option A - Fully normalized taxonomy tables ngay từ đầu:** mỗi role/type/competency/tag là một bảng riêng.
- Pro: quản trị taxonomy linh hoạt.
- Con: tăng scope feature 18, cần admin taxonomy workflow chưa có trong BA.

**Option B - Canonical enum/config + constrained arrays on probe:** các nhóm taxonomy ổn định được validate bằng enum/config; tech tags dùng danh sách có kiểm soát nhưng vẫn cho phép mở rộng có review.
- Pro: phù hợp milestone nền tảng, ít overhead, đủ cho filter/selector/scoring.
- Con: sau này nếu cần quản trị taxonomy động sẽ phải migrate có kiểm soát.

**Chọn: Option B** - feature này chốt nền tảng trước, chưa mở thêm workflow quản trị taxonomy riêng.

## System Boundaries

Backend Question Bank domain owns:

- Canonical taxonomy definitions: stage, role family, level, question type, competency, difficulty, language và tech tag grouping.
- `QuestionProbe` data contract và validation rules.
- Probe status values ở mức domain, nhưng workflow chuyển trạng thái chi tiết thuộc feature 019.
- Internal reference/source metadata để audit curation, không expose cho candidate.

Public candidate experience không thuộc feature này. Admin UI cũng chưa thuộc feature này, nhưng các contract được thiết kế để feature 019 có thể build workflow mà không cần đổi meaning của probe.

Existing Behavioral Interview services chỉ được tích hợp ở feature sau. Feature 18 không thay selector, prompt builder hoặc scoring runtime hiện tại.

## Contracts

### QuestionProbe Domain Contract

`QuestionProbe` phải có các nhóm field công khai ở domain boundary:

| Nhóm | Ý nghĩa |
| --- | --- |
| Identity | `id`, stable slug hoặc code nếu cần seed/import, timestamps |
| Canonical targeting | `stages`, `roleFamilies`, `levels`, `type`, `competencies`, `techTags`, `difficulty` |
| AI guidance | `intent`, `primaryQuestion`, `expectedSignals`, `redFlags`, `scoringHints`, `followUps` |
| Display content | `localizedContent` keyed by locale |
| Governance | `status`, creator/reviewer metadata placeholder, source/reference metadata |

`localizedContent` phải đủ cho card, detail và practice entry:

```json
{
  "vi": {
    "title": "string",
    "displayQuestion": "string",
    "displayIntent": "string",
    "guidance": ["string"],
    "commonMistakes": ["string"],
    "labels": {
      "difficulty": "string",
      "type": "string"
    }
  }
}
```

`followUps` là structured guidance, không chỉ là list text:

```json
{
  "trigger": "missing_metric | missing_context | missing_tradeoff | vague_answer | red_flag",
  "question": "string",
  "purpose": "string"
}
```

Trigger enum có thể mở rộng, nhưng mọi trigger được publish phải có fallback behavior ở feature orchestration sau.

### Taxonomy Lookup Contract

Backend nên expose hoặc nội bộ hóa một contract đọc taxonomy để FE/admin và seed/import có cùng value set. Contract này không quyết định UI copy; UI label vẫn lấy từ i18n/localized metadata.

Minimum taxonomy groups:

- `stages`: các stage behavioral/interview đã được product chốt.
- `roleFamilies`: `backend`, `frontend`, `fullstack`, `devops`, `data`, `qa`, `security`, có thể mở rộng.
- `levels`: tối thiểu `junior`, `mid`, `senior`; không phá compatibility nếu thêm `fresher`, `lead`.
- `types`: `behavioral`, `technical_depth`, `trade_off`, `debugging`, `cv_claim_verification`, `situational`.
- `competencies`: ownership, conflict handling, learning agility, technical fundamentals, trade-off analysis, system thinking, problem solving, communication, collaboration, impact measurement.
- `languages`: `vi`, `en`, `ja`.

### Validation Contract

Một probe được coi là structurally valid khi:

- Có ít nhất một stage, role family, level và competency.
- `difficulty` nằm trong range 1-5.
- Canonical metadata dùng value hợp lệ, không dùng display label làm key.
- Có `intent`, `primaryQuestion`, ít nhất một expected signal, red flag và scoring hint.
- Có localized content tối thiểu cho locale publish yêu cầu.
- Source/reference metadata nếu có không được dùng làm public copy nguyên văn.

Feature 18 chỉ xác định validity. Feature 19 quyết định khi nào validity được dùng để block publish.

## Data & State

`QuestionProbe` là aggregate chính. Trạng thái curation ban đầu dùng cùng enum với BA: `draft`, `in_review`, `active`, `retired`, `needs_revision`, nhưng feature này không cho phép transition nghiệp vụ đầy đủ.

Canonical metadata nên được lưu ở dạng machine-readable ổn định:

- Array cho multi-target fields như role families, levels, competencies và tech tags.
- JSON object cho cấu trúc giàu ngữ nghĩa như localized content, follow-ups và scoring hints.
- Không lưu popularity, score distribution hoặc practice count trong probe seed; các số đó thuộc analytics feature sau.

Migration cần backward compatible theo hướng additive: thêm taxonomy value mới không được làm probe cũ invalid nếu meaning cũ vẫn còn hợp lệ. Rename taxonomy value phải có migration rõ vì sẽ ảnh hưởng search, selector, scoring và analytics.

## Quality & Stability Notes

- Consistency: probe identity không đổi khi thêm/sửa localized content.
- Privacy: source/reference nội bộ không expose ra public API candidate.
- Observability: log validation failure theo field group để curator/dev biết thiếu metadata, thiếu localized content hay sai taxonomy.
- Compatibility: không để feature sau phụ thuộc vào display label; mọi integration phải dùng canonical key.
- Rollback: nếu taxonomy mới gây lỗi, có thể ngừng dùng value mới mà không xóa probe hiện có.

## Delivery Slices

Single delivery slice cho foundation contract.

Nếu Dev thấy scope quá lớn trong implementation, split theo thứ tự:

1. Domain taxonomy + `QuestionProbe` contract + structural validation.
2. Seed/import-ready shape và internal lookup contract.

Không split theo BE/FE vì feature này chưa có public/admin experience độc lập.

## Not Changing

- Không xây admin curation screen.
- Không publish probe cho candidate.
- Không thay AI selector, prompt builder hoặc scoring hiện tại.
- Không xây vector search/RAG.
- Không tạo analytics dashboard hoặc practice session tracking.

## Dev Ownership

Dev tự xác định file/function/component cụ thể dựa trên convention và codebase hiện có. HOW.md chỉ ràng buộc architecture decisions, contracts, boundaries, và quality guardrails.
