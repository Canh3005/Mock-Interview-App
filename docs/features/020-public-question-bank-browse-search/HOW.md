# HOW - Public Question Bank Browse & Search

## Overview

Mở mô hình đọc cho ứng viên trên bounded context `question-bank` hiện có: ứng viên chỉ đọc danh sách `QuestionProbe` đã `active`, lọc/sắp xếp bằng taxonomy chuẩn và nhận dữ liệu card đã được backend resolve theo `locale`. Feature này không tạo kho dữ liệu mới, không thêm luồng AI, và không lộ dữ liệu curation/scoring nội bộ.

## Business Alignment

BA yêu cầu ứng viên có thể tự khám phá question bank theo role, level, type, competency, tech tag, difficulty, language và popularity. Kiến trúc phải bảo vệ các outcome chính:

- Ứng viên chỉ thấy probe usable đã qua curation, không thấy `draft`, `in_review`, `needs_revision` hoặc `retired`.
- Bộ lọc dùng canonical key để đồng bộ với taxonomy của feature 018/019; label hiển thị theo i18n/UI locale.
- Một probe giữ cùng identity khi đổi ngôn ngữ; đổi `locale` chỉ đổi content hiển thị, không biến thành probe khác.
- Card đủ thông tin để ứng viên chọn câu phù hợp, nhưng không lộ `expectedSignals`, `redFlags`, `scoringHints`, `sourceReferences` hoặc audit metadata.

## Architecture Decisions

### Decision: Nguồn dữ liệu đọc cho ứng viên

**Option A - Query trực tiếp `QuestionProbe` active:** endpoint ứng viên đọc từ aggregate hiện có, áp bộ lọc và trả dữ liệu rút gọn an toàn.
- Ưu điểm: tái sử dụng nguồn dữ liệu chuẩn, không cần job đồng bộ, ít rủi ro lệch dữ liệu sau curation.
- Nhược điểm: cần projection chặt để không lộ field nội bộ; query phải có phân trang và index hợp lý.

**Option B - Tạo bảng/search index riêng cho public bank:** khi publish thì đồng bộ probe sang bảng hoặc index đọc riêng.
- Ưu điểm: tối ưu tốt hơn khi dữ liệu rất lớn.
- Nhược điểm: tăng complexity, cần xử lý đồng bộ, rollback và lỗi sync chưa cần ở milestone này.

**Chọn: Option A** - số lượng probe giai đoạn đầu chưa đủ để cần search index riêng. Public contract phải là dữ liệu rút gọn an toàn, không trả raw entity.

### Decision: Chiến lược tìm kiếm và sắp xếp

**Option A - Lọc trong database và tìm kiếm text nhẹ:** dùng filter theo array/canonical field, tìm kiếm text trên code/title/displayQuestion/intent phù hợp, có phân trang chuẩn.
- Ưu điểm: phù hợp NestJS/TypeORM/Postgres hiện có, dễ review và rollback.
- Nhược điểm: không phải semantic search; không xử lý tốt typo/synonym.

**Option B - Dùng Elasticsearch/vector/RAG search:** tạo service tìm kiếm riêng cho discovery nâng cao.
- Ưu điểm: tìm kiếm mạnh hơn về sau.
- Nhược điểm: vượt scope BA; kéo thêm dependency vận hành và chưa cần cho browse/search cơ bản.

**Chọn: Option A** - feature này là browse/search cơ bản cho ứng viên. Semantic search/RAG thuộc feature khác nếu product quyết định.

### Decision: Boundary resolve `locale`

**Option A - Backend trả toàn bộ `localizedContent`, FE tự chọn locale và dự phòng:** FE có toàn quyền render.
- Ưu điểm: ít logic backend hơn.
- Nhược điểm: dễ expose nhiều content hơn cần thiết; logic dự phòng có thể lệch giữa card/detail/practice entry.

**Option B - Backend resolve display locale và trả card DTO đã rút gọn:** request gửi `locale`; backend chọn content phù hợp và trả thêm metadata dự phòng.
- Ưu điểm: kiểm soát public projection tốt hơn, logic dự phòng nhất quán, không lộ internal content thừa.
- Nhược điểm: backend phải giữ logic resolve locale.

**Chọn: Option B** - candidate API không trả raw entity hoặc raw `localizedContent` map. FE vẫn dùng i18n để dịch UI chrome/taxonomy label, còn nội dung câu hỏi do backend resolve.

### Decision: Popularity signal

**Option A - Popularity là signal đọc optional trong response:** nếu đã có practice count/usage metric thì trả; nếu chưa có thì `popular` sort degrade có kiểm soát.
- Ưu điểm: không block browse/search bởi analytics feature 025; UI vẫn có thể hiển thị tín hiệu phổ biến khi dữ liệu tồn tại.
- Nhược điểm: giai đoạn đầu `popular` có thể trùng cách sắp xếp dự phòng.

**Option B - Chờ analytics đầy đủ rồi mới ship public bank:** chỉ làm browse/search sau khi có usage tracking hoàn chỉnh.
- Ưu điểm: popularity chính xác hơn.
- Nhược điểm: trì hoãn feature chính, trái với BA nói "khi dữ liệu hỗ trợ".

**Chọn: Option A** - popularity không phải sự thật về độ phù hợp. Khi thiếu dữ liệu, backend vẫn trả list ổn định và FE không được làm ứng viên hiểu "popular" nghĩa là phù hợp nhất.

## System Boundaries

Backend Question Bank domain chịu trách nhiệm:

- Endpoint read-only cho ứng viên xem các probe `active`.
- DTO card public, gồm locale đã resolve, trạng thái có dùng fallback hay không, và danh sách ngôn ngữ được hỗ trợ.
- Validate bộ lọc bằng taxonomy chuẩn của feature 018.
- Hành vi tìm kiếm, sắp xếp và phân trang cho browse.
- Đảm bảo không trả internal guidance, source references, audit trail hoặc admin fields.

Frontend candidate experience chịu trách nhiệm:

- Route/trang Question Bank trong khu vực ứng viên.
- Search input, bộ lọc, sort control và pagination controls theo response `{ data, total, page, limit }`.
- Không dùng infinite scroll trong feature này trừ khi BA/HOW được cập nhật riêng.
- Loading, error, empty state và card grid/list theo convention FE.
- i18n cho UI chrome, filter labels, empty/error text trong `en`, `vi`, `ja`; riêng `vi.json` phải có dấu đầy đủ.

Admin curation workflow của feature 019 vẫn là nguồn tạo/publish/retire probe. Feature 20 không thêm quyền sửa nội dung, không thay state machine, không tự publish probe.

Auth boundary:

- Public Question Bank ở đây là trải nghiệm cho ứng viên, không phải admin. Mặc định đặt sau `ProtectedRoute` giống practice problem bank hiện có để chỉ logged-in candidate sử dụng.
- Candidate read endpoint có thể dùng JWT guard nếu backend đang bảo vệ các practice API cho ứng viên. Nếu product muốn cho visitor chưa đăng nhập xem bank sau này, chỉ relax auth cho read-only projection, không reuse admin API.

## Contracts

### Candidate Probe List API

Contract browse cho ứng viên:

| Method | Path | Auth | Hành vi |
| --- | --- | --- | --- |
| `GET` | `/question-bank/probes` | Candidate JWT mặc định | Trả paged list các probe `active` theo filter/search/sort |

Query params:

| Param | Ý nghĩa |
| --- | --- |
| `page`, `limit` | Phân trang chuẩn, default theo BE convention; response luôn `{ data, total, page, limit }` |
| `locale` | Locale dùng để resolve card content: `vi`, `en`, `ja` |
| `language` | Optional filter: chỉ lấy probe có localized content cho language này |
| `roleFamily` | Canonical key, ví dụ `backend` |
| `level` | Canonical key, ví dụ `mid` |
| `type` | Canonical key, ví dụ `technical_depth` |
| `competency` | Canonical key, ví dụ `technical_fundamentals` |
| `techTag` | Canonical tech tag key/string |
| `difficulty` | Number/range theo domain hiện có, trước mắt 1-5 |
| `search` | Text search cho title/question/code/intent phù hợp public discovery |
| `sort` | `newest` hoặc `popular`; default `newest` |

Hành vi filter:

- Backend luôn thêm `status = active`.
- Param dùng canonical key; invalid key trả `400` bằng English error message.
- Multi-value chỉ nên thêm khi contract được chốt rõ. Giai đoạn đầu ưu tiên một value mỗi group để giữ query/link/share đơn giản; FE có thể mở rộng sau bằng repeated params nếu BE/FE chốt cùng nhau.
- `language` là filter về content availability; `locale` là preference hiển thị. Hai param này không được trộn nghĩa.

Response card DTO:

```json
{
  "data": [
    {
      "id": "uuid",
      "code": "optional-stable-code",
      "title": "string",
      "displayQuestion": "string",
      "displayIntent": "string",
      "difficulty": 3,
      "roleFamilies": ["backend"],
      "levels": ["mid"],
      "type": "technical_depth",
      "competencies": ["technical_fundamentals"],
      "techTags": ["nestjs", "postgresql"],
      "supportedLanguages": ["vi", "en"],
      "locale": "ja",
      "resolvedLocale": "en",
      "localeFallbackUsed": true,
      "popularity": {
        "practiceCount": 42,
        "label": "popular"
      },
      "publishedAt": "2026-05-10T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

Không được trả trong response này:

- `expectedSignals`
- `redFlags`
- `scoringHints`
- `followUps`
- `sourceReferences`
- `createdBy`, `updatedBy`, `reviewedBy`
- `lastTransitionReason`
- audit log fields

### Taxonomy Lookup

Reuse `GET /question-bank/taxonomy` để lấy key cho filter options. FE không được tự hard-code một bộ role/level/type/competency riêng có thể lệch backend.

Label taxonomy từ backend chỉ là fallback/admin-oriented label. Candidate UI copy vẫn nên đi qua i18n key khi app đã kiểm soát label; backend key mới là contract.

### Navigation Contract

Khi feature 021 đã có, card click route sang detail/practice entry. Trong feature 20, route behavior chỉ cần tương thích với detail URL sau này, ví dụ mang `probeId` qua route param hoặc navigation state. Nếu detail/practice entry chưa triển khai, UI có thể hiển thị action disabled/placeholder, nhưng không được gọi admin API hoặc tự tạo practice session trong feature này.

## Data & State

`QuestionProbe` vẫn là nguồn dữ liệu chuẩn. Feature 20 thêm behavior đọc và có thể thêm vài field dẫn xuất nhẹ, nhưng không nên yêu cầu schema mutation trừ khi Dev xác nhận field hiện có không đủ.

Lifecycle:

- `draft`, `in_review`, `needs_revision`, `retired`: không bao giờ hiển thị cho ứng viên.
- `active`: hiển thị khi có localized content phù hợp hoặc có fallback content.
- Nếu một active probe sau đó bị retired, probe biến mất khỏi browse result mới; các feature history sau này vẫn phải resolve được bằng stable id.

Locale fallback:

- Thứ tự dự phòng phải deterministic. Khuyến nghị: requested `locale` -> product default locale -> locale đầu tiên có content trong `vi`, `en`, `ja`.
- Response phải trả `resolvedLocale` và `localeFallbackUsed` để FE có thể hiển thị trạng thái fallback rõ ràng khi cần.
- Fallback không được rewrite canonical metadata; role/level/type/competency key giữ nguyên.

Popularity:

- `practiceCount` hoặc signal tương tự có thể đến từ analytics/tracking nếu đã tồn tại.
- Nếu chưa có source đáng tin cậy, backend không được fabricate count. `popular` sort fallback nên dùng stable secondary ordering như `publishedAt DESC, id ASC` và FE không hiển thị số giả.

Query consistency:

- List endpoint phải có phân trang.
- Sorting phải ổn định để tránh duplicate/missing cards giữa các page.
- Search/filter nên case-insensitive ở các field text/tag phù hợp.

## Quality & Stability Notes

- Security/privacy: candidate endpoint chỉ trả public projection; không reuse admin list response cho ứng viên.
- Latency: first page phải phản hồi tốt trong usage bình thường; không load toàn bộ active probes vào memory.
- Observability: log invalid filter keys, query errors và fallback locale rate ở mức summary; không log full question content nếu không cần.
- Compatibility: thêm taxonomy key mới không được làm FE cũ vỡ; label chưa có i18n có thể render key fallback tạm thời.
- Rollback: có thể ẩn/remove public route khỏi navigation mà không xóa probe hoặc đổi admin workflow.
- Error handling: invalid query trả `400`; service errors đi vào error state bình thường của app. Empty result là valid state, không phải lỗi.
- i18n: mọi text FE hiển thị dùng `t()` và cập nhật `en`, `vi`, `ja`; Vietnamese copy phải có đầy đủ dấu.

## UX Boundary

Primary production workflow là ứng viên browse/search question bank:

- Control có cấu trúc: search input, select/combobox/chip filters cho role, level, type, competency, tech tag, difficulty, language và sort.
- Card/list item hiển thị title/question excerpt, difficulty, role/level, tags, language/fallback indicator và optional popularity signal.
- Empty state phải giải thích không có câu hỏi phù hợp và có cách clear/adjust filters.
- Loading và error state phải rõ; pagination state không được làm layout nhảy bất thường.
- Popularity copy phải nói đây là usage signal, không phải quality recommendation.

Feature này không có create/edit production form. Không dùng JSON/raw payload editor trong candidate browse UI.

## Delivery Slices

Split thành hai slice review được độc lập:

1. Backend public read contract: candidate list endpoint, active-only projection, filter/search/sort/pagination, locale fallback và test chống data leakage.
2. Frontend candidate experience: route/API/slice/saga/page, filter theo taxonomy, UI i18n, card rendering, empty/loading/error/pagination states.

Backend slice nên ổn định trước khi FE tích hợp để card DTO và query params không bị drift.

## Not Changing

- Không thay admin curation workflow, state machine hoặc audit behavior của feature 019.
- Không expose `expectedSignals`, `redFlags`, `scoringHints`, `followUps` hoặc `sourceReferences` cho ứng viên.
- Không xây detail/practice entry đầy đủ; đó là feature 021.
- Không xây interview set discovery; đó là feature 022.
- Không xây analytics dashboard hoặc quality loop; đó là feature 025.
- Không thêm Elasticsearch/vector search/RAG.
- Không thay Behavioral Interview selector, prompt builder hoặc scoring runtime.

## Dev Ownership

Dev tự xác định file/function/component cụ thể dựa trên convention và codebase hiện có. HOW.md chỉ ràng buộc architecture decisions, contracts, boundaries, và quality guardrails.
