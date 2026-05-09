# Tổng quan: Behavioral Question Bank

## Mục tiêu

Xây dựng một ngân hàng câu hỏi phỏng vấn hành vi và kỹ thuật theo hướng có cấu trúc, dùng được cho cả hai trải nghiệm:

- **Question Bank cho người dùng**: ứng viên có thể tìm, lọc, xem câu hỏi theo vị trí, level, kỹ năng và luyện tập từng câu.
- **Question Bank cho AI Interview Engine**: hệ thống chọn câu hỏi phù hợp với CV/JD, vai trò, level và stage phỏng vấn; sau đó dùng AI để hỏi tự nhiên, đào sâu và chấm điểm có bằng chứng.

Mục tiêu không phải sao chép một danh sách câu hỏi tĩnh. Điểm khác biệt cần xây là một lớp **interview probe** có metadata, intent, expected signals, red flags và follow-up logic.

## Vấn đề cần giải quyết

Nếu chỉ để AI tự sinh câu hỏi từ prompt, hệ thống dễ gặp các vấn đề:

- Câu hỏi chung chung, thiếu liên quan đến CV/JD.
- Không đảm bảo coverage theo stage, role và competency.
- Follow-up thiếu mục đích, dễ chuyển chủ đề quá sớm.
- Chấm điểm dựa trên cảm giác thay vì evidence từ transcript.
- Khó tạo trải nghiệm giống một nền tảng luyện phỏng vấn chuyên nghiệp.

Question Bank giúp hệ thống có "xương sống phỏng vấn": AI vẫn tạo hội thoại tự nhiên, nhưng mục tiêu đánh giá và tiêu chí chấm điểm đến từ bank đã curate.

## Phạm vi tổng quan

### In Scope

- Ngân hàng câu hỏi theo stage phỏng vấn, role family, level và competency.
- Bộ câu hỏi/phỏng vấn theo vị trí như Backend Developer, Frontend Developer, Fullstack Developer.
- Câu hỏi kỹ thuật, behavioral, situational và CV deep-dive.
- Metadata phục vụ search/filter và AI selection.
- Selector kết hợp metadata filtering, scoring/ranking và sẵn sàng mở rộng sang semantic retrieval.
- Lưu lịch sử probe đã hỏi để tránh lặp.
- Chấm điểm dựa trên expected signals, red flags và transcript evidence.
- Public question bank với đa ngôn ngữ cho câu hỏi, mô tả, label và guidance.
- Admin/curation workflow để tạo, review, publish, retire và đo chất lượng probe.
- Analytics cho lượt luyện tập, completion, question quality và scoring quality.

### Scope Boundary

- Có thể tham khảo nguồn câu hỏi chất lượng, nhưng nội dung đưa vào bank nên được biên soạn lại theo cấu trúc probe riêng.
- Không phụ thuộc vào LLM để tự sinh câu hỏi production mà không qua review/curation.
- Không để vector search thay thế metadata constraints; semantic retrieval chỉ là lớp tìm kiếm bổ sung.
- Không publish probe nếu thiếu intent, expected signals, red flags, scoring hints hoặc localized display content tối thiểu.
- Marketplace câu hỏi công khai là hướng mở rộng riêng, không thuộc nền tảng lõi ban đầu.

## Product Surface

### 1. Trang Ngân Hàng Câu Hỏi

Ứng viên có thể duyệt và tìm câu hỏi theo:

- Role: Backend, Frontend, Fullstack, DevOps, Data, QA.
- Level: Junior, Mid, Senior.
- Type: Behavioral, Technical Depth, Trade-off, Debugging, CV Claim Verification, Situational.
- Competency: Ownership, Conflict Handling, Technical Fundamentals, System Thinking, Communication.
- Tech tags: React, Vue, Angular, Node.js, NestJS, Express, Java, Spring Boot, .NET, Go, Python, Django, FastAPI, PostgreSQL, MySQL, MongoDB, Redis, Kafka, RabbitMQ, Docker, Kubernetes, AWS, GCP, Azure, Terraform, GitHub Actions, Airflow, Spark, dbt, Playwright, Cypress.

Tech tags nên được nhóm theo role family để dễ filter và mở rộng:

- **Frontend**: React, Vue, Angular, Next.js, TypeScript, Redux, Zustand, CSS, Tailwind, Webpack, Vite, accessibility, browser performance.
- **Backend**: Node.js, NestJS, Express, Java, Spring Boot, .NET, Go, Python, Django, FastAPI, REST, GraphQL, gRPC, authentication, authorization.
- **Database & Storage**: PostgreSQL, MySQL, SQL Server, MongoDB, Redis, Elasticsearch, DynamoDB, S3, schema design, indexing, transaction, consistency.
- **Messaging & Async**: Kafka, RabbitMQ, BullMQ, SQS, Pub/Sub, event-driven architecture, queue retry, idempotency, outbox pattern.
- **DevOps/SRE**: Docker, Kubernetes, Nginx, Terraform, Ansible, GitHub Actions, GitLab CI, Jenkins, Prometheus, Grafana, OpenTelemetry, logging, alerting, rollback.
- **Cloud**: AWS, GCP, Azure, Lambda, ECS, EKS, Cloud Run, Cloud Functions, RDS, Cloud SQL, IAM, VPC, CDN.
- **Data Engineering**: Airflow, Spark, Flink, dbt, BigQuery, Snowflake, Redshift, Kafka Streams, data quality, lineage, freshness, partitioning.
- **ML/AI**: Python, PyTorch, TensorFlow, scikit-learn, Hugging Face, LangChain, vector database, RAG, embeddings, model evaluation, inference latency, prompt engineering.
- **QA/Testing**: Jest, Vitest, Playwright, Cypress, Selenium, Postman, contract testing, load testing, flaky tests, test strategy, automation pyramid.
- **Security**: OAuth2, JWT, SSO, OWASP, XSS, CSRF, SQL injection, secrets management, IAM, threat modeling, audit logging.

Ý nghĩa các question type:

- **Behavioral**: câu hỏi về hành vi đã xảy ra trong công việc thật, thường yêu cầu ứng viên kể lại một tình huống cụ thể. Dùng để đánh giá ownership, learning agility, conflict handling, teamwork, failure recovery và growth mindset. Ví dụ: một lần ứng viên xử lý bất đồng kỹ thuật với team.
- **Technical Depth**: câu hỏi kiểm tra độ hiểu sâu về công nghệ, framework, architecture hoặc nguyên lý bên dưới, không chỉ hỏi cách dùng API/syntax. Dùng để phân biệt ứng viên hiểu bản chất với ứng viên chỉ biết dùng tool. Ví dụ: vì sao một caching strategy hoạt động, khi nào nó sai, failure mode là gì.
- **Trade-off**: câu hỏi yêu cầu ứng viên so sánh nhiều hướng giải quyết và giải thích lý do chọn một hướng trong bối cảnh cụ thể. Dùng để đánh giá judgment, decision-making, khả năng cân bằng performance, complexity, cost, maintainability, reliability và business constraints. Ví dụ: chọn Redis cache hay query trực tiếp database trong một API đọc nhiều nhưng dữ liệu thay đổi thường xuyên.
- **Debugging**: câu hỏi xoay quanh cách ứng viên điều tra lỗi, xác định root cause, cô lập vấn đề, đo lường tác động và ngăn lỗi lặp lại. Dùng để đánh giá problem solving thực chiến, observability, logging, test strategy và tư duy hệ thống. Ví dụ: API chậm đột ngột sau deploy thì ứng viên sẽ kiểm tra gì trước.
- **CV Claim Verification**: câu hỏi đào sâu vào một claim cụ thể trong CV hoặc lời ứng viên nói, nhằm xác minh mức độ đóng góp thật, cách đo metric, baseline, quyết định kỹ thuật và impact. Dùng để phát hiện claim bị thổi phồng hoặc câu trả lời quá chung chung kiểu "team em đã tối ưu". Ví dụ: nếu CV ghi "giảm latency 40%", hỏi latency đo ở đâu, baseline là gì, ứng viên làm phần nào.
- **Situational**: câu hỏi giả định một tình huống chưa chắc đã xảy ra với ứng viên, yêu cầu họ xử lý như thế nào. Dùng khi cần đánh giá judgment trong bối cảnh khó, stakeholder pressure, ambiguity, incident, conflict hoặc leadership. Ví dụ: PM muốn release nhanh nhưng QA phát hiện bug nghiêm trọng, ứng viên sẽ xử lý ra sao.

Ý nghĩa competency:

`Type` nói câu hỏi thuộc dạng nào, còn `Competency` nói câu hỏi đang đo năng lực gì. Một type có thể đo nhiều competency khác nhau. Ví dụ cùng là `Behavioral`, nhưng một câu có thể đo ownership, câu khác đo conflict handling.

- **Ownership**: đo mức độ chủ động nhận trách nhiệm, theo đuổi vấn đề đến cùng, không đẩy lỗi cho người khác và biết làm rõ phạm vi mình chịu trách nhiệm. Thường dùng cho câu hỏi về incident, deadline, task mơ hồ hoặc kết quả không như kỳ vọng.
- **Conflict Handling**: đo cách ứng viên xử lý bất đồng với đồng đội, senior, PM, QA hoặc stakeholder. Tập trung vào khả năng lắng nghe, lập luận, thỏa hiệp, escalation đúng lúc và giữ quan hệ làm việc chuyên nghiệp.
- **Learning Agility**: đo khả năng học nhanh khi gặp công nghệ, domain hoặc yêu cầu mới. Tập trung vào cách học, cách kiểm chứng hiểu biết, tốc độ áp dụng và khả năng tự điều chỉnh khi học sai hướng.
- **Technical Fundamentals**: đo mức hiểu bản chất kỹ thuật thay vì chỉ biết dùng framework/tool. Tập trung vào cơ chế bên dưới, giới hạn, failure mode, performance implication và khi nào không nên dùng một giải pháp.
- **Trade-off Analysis**: đo khả năng so sánh các lựa chọn kỹ thuật trong bối cảnh thật. Tập trung vào reasoning giữa speed, quality, cost, maintainability, scalability, reliability và business priority.
- **System Thinking**: đo khả năng nhìn vấn đề ở cấp hệ thống thay vì chỉ một function/component. Tập trung vào data flow, dependency, failure propagation, observability, rollout, backward compatibility và tác động cross-team.
- **Problem Solving**: đo cách ứng viên phân tích vấn đề, chia nhỏ giả thuyết, debug, tìm root cause và xác nhận giải pháp. Thường xuất hiện trong debugging, incident hoặc performance investigation.
- **Communication**: đo khả năng trình bày rõ ràng, có cấu trúc, phù hợp với người nghe. Tập trung vào cách giải thích technical decision cho non-technical stakeholder, cách viết/thuyết phục và cách làm rõ ambiguity.
- **Collaboration**: đo cách ứng viên phối hợp với team khác vai trò như PM, designer, QA, backend/frontend, DevOps hoặc business. Tập trung vào boundary, handoff, feedback loop và xử lý dependency.
- **Impact Measurement**: đo khả năng định nghĩa, đo và chứng minh kết quả. Tập trung vào metric, baseline, before-after, monitoring, business impact và việc phân biệt correlation với causation.

Mỗi câu hỏi nên hiển thị:

- Nội dung câu hỏi.
- Mục tiêu đánh giá.
- Độ khó.
- Tags.
- Nút luyện tập với AI.

### 2. Trang Chi Tiết Câu Hỏi

Mỗi câu hỏi có thể có:

- Câu hỏi chính.
- Câu hỏi follow-up thường gặp.
- Cách trả lời tốt nên có những tín hiệu gì.
- Các lỗi thường gặp.
- Gợi ý dùng STAR hoặc cấu trúc trả lời phù hợp.
- Nút "Luyện câu này".

### 3. Bộ Phỏng Vấn Theo Vị Trí

Một bộ phỏng vấn là tập hợp các câu hỏi/probes theo một vị trí cụ thể.

Mục đích của bộ phỏng vấn theo vị trí là biến ngân hàng câu hỏi rời rạc thành một lộ trình luyện tập có ngữ cảnh. Người dùng không cần tự chọn từng câu hỏi; họ chọn vị trí muốn ứng tuyển, hệ thống tự đưa ra một mock interview phù hợp với role, level, thời lượng và competency cần đánh giá.

Về product, bộ phỏng vấn giúp:

- Ứng viên bắt đầu luyện nhanh theo mục tiêu cụ thể, ví dụ "Backend Developer Mid-level" thay vì phải tự lọc hàng trăm câu hỏi.
- Tạo trải nghiệm giống một buổi phỏng vấn thật, có thứ tự câu hỏi từ mở đầu, technical depth, CV deep-dive đến soft skills.
- Cho phép hiển thị các gói luyện tập dễ hiểu: số câu hỏi, thời lượng, độ khó, kỹ năng được đánh giá.
- Làm nền cho tính năng "featured interview sets" trên trang chủ hoặc trang ngân hàng câu hỏi.

Về AI engine, bộ phỏng vấn giúp:

- Cung cấp blueprint ban đầu cho selector: stage nào cần hỏi type gì, competency nào phải cover, role family nào được ưu tiên.
- Giữ buổi phỏng vấn nhất quán thay vì để AI chọn câu hỏi rời rạc theo từng lượt.
- Đảm bảo mỗi session có đủ coverage tối thiểu, ví dụ ít nhất một câu technical depth, một câu CV claim verification và một câu soft skill.
- Dễ A/B test chất lượng từng bộ phỏng vấn theo completion rate, score distribution và feedback của ứng viên.

Ví dụ:

- Backend Developer - Mid Level.
- Frontend Developer - Junior Level.
- Fullstack Developer - Senior Level.

Mỗi bộ phỏng vấn nên có:

- Số câu hỏi.
- Thời lượng dự kiến.
- Độ khó.
- Stage coverage.
- Danh sách competency được đánh giá.
- Nút bắt đầu mock interview.

## Tham chiếu X-Interview

Quan sát từ X-Interview cho thấy ngân hàng câu hỏi của họ không chỉ có nội dung câu hỏi. UI còn có các lớp metadata và hành động đi kèm:

- Filter theo vị trí/ngành nghề.
- Filter theo kinh nghiệm: mới tốt nghiệp, junior, mid-level, senior, lead.
- Tuỳ chọn hiển thị câu hỏi chung.
- Chọn ngôn ngữ hiển thị câu hỏi: tiếng Anh, tiếng Việt, tiếng Nhật.
- Sort theo phổ biến nhất hoặc mới nhất.
- Mỗi card câu hỏi có nội dung câu hỏi, độ khó, lượt luyện tập, tag/vị trí/công ty nếu có và nút luyện tập.
- Có bộ phỏng vấn theo vị trí với số câu hỏi, thời lượng và độ khó.
- Khi bắt đầu luyện tập, người dùng có thể chọn ngôn ngữ phản hồi AI riêng.

So sánh với `QuestionProbe`:

| Khía cạnh | X-Interview đang thể hiện | `QuestionProbe` nên hỗ trợ |
| --- | --- | --- |
| Nội dung câu hỏi | Hiển thị câu hỏi trực tiếp trên card. | `displayQuestion` và `localizedContent` cho nhiều ngôn ngữ. |
| Ngôn ngữ | Có lựa chọn tiếng Việt, tiếng Anh, tiếng Nhật cho câu hỏi và nội dung hiển thị quanh câu hỏi. | Không tạo probe riêng theo ngôn ngữ; dùng cùng một `id`, metadata canonical cho máy và `localizedContent` cho nội dung public-facing. |
| Vị trí/ngành nghề | Filter theo nhóm ngành, ngành nghề, vị trí chuyên môn. | `roleFamilies`, về sau có thể thêm `industries` và `jobTitles`. |
| Kinh nghiệm | Mới tốt nghiệp, Junior, Mid-level, Senior, Lead. | `levels`; nếu cần có thể mở rộng thêm `fresher` và `lead`. |
| Độ khó | Dễ, Trung bình, Khó. | `difficulty` 1-5, UI có thể map thành Dễ/Trung bình/Khó. |
| Độ phổ biến | Hiển thị số lần luyện tập và sort phổ biến nhất. | Cần analytics riêng như `practiceCount`, không nên hard-code trong probe seed. |
| Tags | Có tag vị trí, kỹ năng hoặc công ty trên một số câu hỏi. | `techTags`, `competencies`, `companyContext` hoặc `sourceContext` nếu cần. |
| Luyện tập từng câu | Mỗi câu có nút luyện tập. | `displayQuestion` mở UI; `primaryQuestion`, `intent`, `followUps` mở AI practice session. |
| Bộ phỏng vấn | Có set theo vị trí, số câu hỏi, thời lượng, độ khó. | Cần thêm entity `InterviewSet` dùng nhiều `QuestionProbe`. |

Điểm X-Interview làm tốt và nên học:

- Câu hỏi và metadata hiển thị cho người dùng có thể đổi ngôn ngữ ngay ở bank, không chỉ đổi ngôn ngữ trong buổi chat.
- Card câu hỏi đơn giản nhưng đủ thông tin để quyết định có luyện hay không.
- Có số lượt luyện tập để tạo tín hiệu phổ biến.
- Có câu hỏi rời rạc và bộ phỏng vấn theo vị trí, phục vụ hai nhu cầu khác nhau.

Điểm `QuestionProbe` nên làm sâu hơn:

- Có `intent`, `expectedSignals`, `redFlags`, `scoringHints` để AI chấm điểm có bằng chứng.
- Có `followUps` theo trigger để buổi luyện tập không chỉ hỏi một câu rồi chấm.
- Có selector theo CV/JD để mock interview cá nhân hoá hơn question bank tĩnh.

## Nguồn Tham Khảo Nội Dung

Vì đây là đồ án cá nhân, có thể tham khảo nhiều nguồn câu hỏi chất lượng để xây bank. Cách làm nên là lấy ý tưởng, taxonomy, dạng câu hỏi và tiêu chí đánh giá; sau đó viết lại thành `QuestionProbe` riêng thay vì bê nguyên nội dung.

Nguồn nên tham khảo:

- **X-Interview**: tham khảo cách tổ chức question bank, filter, ngôn ngữ, card câu hỏi, lượt luyện tập và bộ phỏng vấn theo vị trí.
- **Microsoft 365 Career Advice**: tham khảo nhóm behavioral questions theo teamwork, client/stakeholder, time management, adaptability và ethics.
- **Google re:Work**: tham khảo structured interviewing, rubric, cách giảm bias trong phỏng vấn và thiết kế tiêu chí đánh giá.
- **University career centers** như UMBC, University of Washington, University of Cincinnati, Northwestern: tham khảo STAR method, behavioral categories và guidance cho ứng viên.
- **GitHub repositories về interview questions**: tham khảo cấu trúc câu hỏi kỹ thuật theo frontend/backend/system design, nhưng cần curate lại theo role, level, expected signals và red flags.
- **Engineering blogs/documentation chính thống**: tham khảo câu hỏi technical depth theo chủ đề như caching, database transaction, observability, CI/CD, security, testing.

Khi đưa vào bank, mỗi câu hỏi tham khảo nên được chuyển hoá thành probe có cấu trúc:

- Câu hỏi gốc được viết lại theo wording riêng.
- Có `intent` rõ ràng.
- Có `expectedSignals` và `redFlags`.
- Có follow-up theo trigger.
- Có localized content cho `vi`, `en`, `ja` nếu câu hỏi được publish ra UI.
- Có note nguồn tham khảo ở mức nội bộ nếu cần trace lại.

## AI Engine Surface

### QuestionProbe

Đơn vị lõi không nên chỉ là `Question`, mà nên là `QuestionProbe`.

Một probe cần có:

- `id`
- `stage`
- `roleFamilies`
- `levels`
- `competencies`
- `techTags`
- `type`
- `difficulty`
- `intent`
- `displayQuestion`
- `primaryQuestion`
- `localizedContent`
- `followUps`
- `expectedSignals`
- `redFlags`
- `scoringHints`
- `status`

`displayQuestion` là câu hỏi hiển thị cho người dùng trong question bank, search result, question detail hoặc interview set. Đây là wording public-facing, cần rõ ràng, dễ hiểu và có thể tối ưu cho UI/SEO/localization.

`primaryQuestion` là hướng hỏi gốc cho AI engine, không bắt buộc AI đọc nguyên văn. AI cần giữ intent và tiêu chí đánh giá, sau đó hỏi tự nhiên theo CV/JD và ngôn ngữ session.

Trong production design, `displayQuestion` và `primaryQuestion` nên được tách ngay từ đầu. Hai field có thể trùng nội dung ở một số probe đơn giản, nhưng không nên coi đó là mặc định vì UI cần wording public-facing, còn AI engine cần instruction đủ rõ để cá nhân hoá câu hỏi.

`localizedContent` dùng để hỗ trợ đổi ngôn ngữ phần hiển thị cho người dùng, không chỉ riêng câu hỏi. Không nên tạo ba probe riêng cho tiếng Việt, tiếng Anh và tiếng Nhật vì sẽ làm phân mảnh analytics, scoring và dedup. Một probe nên giữ chung metadata canonical cho máy, còn phần public-facing được dịch theo locale.

Cần phân biệt hai loại metadata:

- **Canonical metadata**: dùng cho hệ thống, không nhất thiết hiển thị trực tiếp. Ví dụ `roleFamilies`, `levels`, `competencies`, `techTags`, `type`, `difficulty`, `expectedSignals`, `redFlags`. Các field này nên ổn định để selector/scoring/analytics không bị phụ thuộc ngôn ngữ.
- **Localized display metadata**: dùng để hiển thị cho người dùng trong card/detail/practice page. Ví dụ label của role, level, type, competency, tag, độ khó, mô tả mục tiêu, gợi ý trả lời, lỗi thường gặp. Các field này cần dịch theo ngôn ngữ UI.

Ví dụ:

```ts
localizedContent: {
  vi: {
    displayQuestion: 'Bạn đã từng xử lý bất đồng kỹ thuật với team như thế nào?',
    primaryQuestion: 'Hỏi ứng viên về một tình huống bất đồng kỹ thuật thật, tập trung vào vai trò cá nhân, cách trao đổi và kết quả.',
    shortTitle: 'Xử lý bất đồng kỹ thuật trong team',
    userFacingIntent: 'Câu hỏi này giúp bạn luyện cách trình bày một tình huống bất đồng kỹ thuật, cách bạn trao đổi với team và kết quả cuối cùng.',
    answerGuidance: [
      'Nêu rõ bối cảnh và vai trò của bạn.',
      'Giải thích quan điểm khác nhau nằm ở đâu.',
      'Mô tả cách bạn trao đổi và đi đến quyết định.',
      'Kết thúc bằng kết quả hoặc bài học cụ thể.',
    ],
    commonMistakes: [
      'Chỉ nói team bất đồng nhưng không nêu vai trò cá nhân.',
      'Đổ lỗi cho người khác.',
      'Không nói rõ kết quả sau khi xử lý bất đồng.',
    ],
    displayLabels: {
      type: 'Hành vi',
      level: 'Mid-level',
      difficulty: 'Trung bình',
      competencies: ['Xử lý bất đồng', 'Giao tiếp', 'Ownership'],
      roleFamilies: ['Backend', 'Fullstack'],
    },
  },
  en: {
    displayQuestion: 'How have you handled a technical disagreement with your team?',
    primaryQuestion: 'Ask about a real technical disagreement, focusing on personal contribution, communication, and outcome.',
    shortTitle: 'Handling technical disagreement in a team',
    userFacingIntent: 'This question helps you practice explaining a real technical disagreement, how you communicated with the team, and what outcome followed.',
    answerGuidance: [
      'State the context and your role clearly.',
      'Explain where the disagreement came from.',
      'Describe how you communicated and reached a decision.',
      'End with a concrete outcome or lesson learned.',
    ],
    commonMistakes: [
      'Mentioning team disagreement without clarifying your contribution.',
      'Blaming others.',
      'Not explaining what changed after the disagreement.',
    ],
    displayLabels: {
      type: 'Behavioral',
      level: 'Mid-level',
      difficulty: 'Medium',
      competencies: ['Conflict Handling', 'Communication', 'Ownership'],
      roleFamilies: ['Backend', 'Fullstack'],
    },
  },
  ja: {
    displayQuestion: 'チーム内の技術的な意見の相違にどのように対応しましたか？',
    primaryQuestion: '実際の技術的な意見の相違について、本人の貢献、コミュニケーション、結果に焦点を当てて質問する。',
    shortTitle: 'チーム内の技術的な意見の相違への対応',
    userFacingIntent: 'この質問では、技術的な意見の相違をどのように説明し、チームとどのように合意形成し、どのような結果につながったかを練習します。',
    answerGuidance: [
      '背景と自分の役割を明確にする。',
      '意見の相違がどこにあったかを説明する。',
      'どのように話し合い、意思決定したかを述べる。',
      '具体的な結果または学びで締める。',
    ],
    commonMistakes: [
      'チーム内の対立だけを述べ、自分の貢献を説明しない。',
      '他者を責める。',
      '対応後に何が変わったかを説明しない。',
    ],
    displayLabels: {
      type: '行動面接',
      level: 'ミッドレベル',
      difficulty: '中',
      competencies: ['対立対応', 'コミュニケーション', 'オーナーシップ'],
      roleFamilies: ['バックエンド', 'フルスタック'],
    },
  },
}
```

Ngôn ngữ câu hỏi và ngôn ngữ phản hồi AI nên là hai setting khác nhau:

- **Question display language**: người dùng xem câu hỏi trong question bank bằng ngôn ngữ nào.
- **Practice feedback language**: AI nhận xét câu trả lời bằng ngôn ngữ nào trong buổi luyện tập.

Giải thích các trường trong một probe:

| Field | Ý nghĩa | Dùng cho |
| --- | --- | --- |
| `id` | Mã định danh duy nhất của probe. Nên có quy ước dễ đọc như `BE_MID_STAGE2_CACHE_TRADEOFF_001`. | Logging, tracking, dedup, scoring, analytics. |
| `stage` | Giai đoạn phỏng vấn mà probe thuộc về. Ví dụ Stage 2 là Tech Stack Deep-Dive, Stage 4 là CV Deep-Dive. | Selector, stage coverage, interview flow. |
| `roleFamilies` | Nhóm vị trí phù hợp với probe, ví dụ `backend`, `frontend`, `fullstack`, `devops`, `data`, `qa`, `security`. | Filter UI, selector theo CV/JD, interview set theo role. |
| `levels` | Level ứng viên phù hợp, ví dụ `junior`, `mid`, `senior`. | Filter UI, selector, kiểm soát độ khó theo level. |
| `competencies` | Danh sách năng lực probe đang đo, ví dụ `Technical Fundamentals`, `Ownership`, `System Thinking`. | Coverage, scoring, filter theo kỹ năng, báo cáo điểm mạnh/yếu. |
| `techTags` | Công nghệ, khái niệm hoặc domain kỹ thuật liên quan, ví dụ `Redis`, `React`, `Kubernetes`, `transaction`, `observability`. | Search/filter, match với CV/JD, RAG metadata sau này. |
| `type` | Dạng câu hỏi, ví dụ `Behavioral`, `Technical Depth`, `Trade-off`, `Debugging`, `CV Claim Verification`, `Situational`. | UI filter, prompt behavior, follow-up strategy. |
| `difficulty` | Độ khó từ 1 đến 5. Không chỉ là độ khó kiến thức, mà còn bao gồm độ phức tạp của reasoning và mức seniority cần thiết. | Ranking, selector, adaptive difficulty. |
| `intent` | Mục tiêu đánh giá của probe. Đây là phần nói rõ interviewer đang muốn kiểm tra điều gì. | Prompt injection, reviewer hiểu lý do tồn tại của câu hỏi. |
| `displayQuestion` | Câu hỏi hiển thị công khai cho người dùng trong question bank hoặc interview set. | UI, search result, question detail, SEO/localization. |
| `primaryQuestion` | Hướng hỏi gốc cho AI engine. AI dùng để tạo câu hỏi tự nhiên theo CV/JD, không bắt buộc đọc nguyên văn. | Prompt builder, AI interview flow. |
| `localizedContent` | Nội dung public-facing theo từng ngôn ngữ, ví dụ câu hỏi, title, mô tả mục tiêu, gợi ý trả lời, lỗi thường gặp và label hiển thị. | Đổi ngôn ngữ question bank, question detail, multilingual practice, SEO/localization. |
| `followUps` | Danh sách câu hỏi đào sâu theo trigger, ví dụ khi câu trả lời thiếu metric, thiếu context, quá lý thuyết hoặc có red flag. | Follow-up orchestration, prompt guidance. |
| `expectedSignals` | Những tín hiệu nên xuất hiện trong câu trả lời tốt. Ví dụ có trade-off rõ, có metric, có failure handling, có personal contribution. | Scoring, feedback, rubric, evidence matching. |
| `redFlags` | Những dấu hiệu xấu cần chú ý. Ví dụ trả lời chung chung, đổ lỗi, không có metric, không hiểu failure mode. | Scoring, interviewer warning, feedback. |
| `scoringHints` | Hướng dẫn chấm mạnh/trung bình/yếu cho probe. Giúp score không phụ thuộc vào cảm giác chung của LLM. | Scoring prompt, reviewer calibration. |
| `status` | Trạng thái curation của probe, ví dụ `draft`, `active`, `retired`. Chỉ probe `active` mới nên được dùng trong session thật. | Admin/curation, selector, release control. |

Một probe tốt phải trả lời được ba câu hỏi:

- Câu này dùng để đánh giá năng lực gì?
- Câu trả lời tốt/xấu sẽ có tín hiệu nào?
- Hệ thống nên follow-up thế nào nếu ứng viên trả lời mơ hồ?

### Selector

Production selector nên là hybrid theo thứ tự: hard constraints, metadata scoring, usage diversity, rồi mới đến semantic retrieval khi bank đủ lớn. Rule-based filtering vẫn là lớp bắt buộc để tránh chọn sai stage, sai level hoặc sai role.

Thứ tự chọn:

1. Lọc hard constraints:
   - đúng stage hiện tại
   - đúng level ứng viên
   - status active
   - chưa được hỏi trong session
2. Chấm điểm mềm:
   - role family khớp CV/JD
   - tech tag overlap với CV/JD
   - competency chưa được cover
   - difficulty phù hợp
3. Rerank:
   - tránh lặp competency quá gần nhau
   - ưu tiên probe chưa được dùng quá nhiều trong cùng interview set
   - cân bằng difficulty theo performance của ứng viên
   - dùng semantic similarity nếu đã có embedding index
4. Nếu không có probe phù hợp, fallback về competency anchor hoặc curated generic probe cùng stage.

### Follow-Up

Follow-up phải phục vụ một mục tiêu cụ thể:

- Làm rõ context.
- Bắt personal contribution.
- Bắt metric/baseline.
- Bắt trade-off.
- Kiểm tra hiểu biết bản chất.
- Xác minh red flag.

Production flow nên lưu trigger follow-up có cấu trúc. LLM có thể classify câu trả lời vào trigger như `missing_metric`, `missing_tradeoff`, `vague_answer`, nhưng output cần được giới hạn bằng enum, log lại để audit và dùng fallback nếu trigger không hợp lệ.

### Scoring

Scoring không nên chỉ chấm theo stage chung. Khi có probe, scoring cần kiểm tra:

- Expected signals nào đã xuất hiện.
- Red flags nào đã xuất hiện.
- Bằng chứng nằm ở câu trả lời nào.
- Claim nào trong CV đã được verify.
- Claim nào còn mơ hồ hoặc inflated.

Output nên bổ sung:

- `probe_coverage`
- `evidence_quotes`
- `missed_signals`
- `verified_claims`
- `role_specific_feedback`

## Production Roadmap

Roadmap nên được thiết kế như một nền tảng production ngay từ đầu. Các giai đoạn dưới đây là thứ tự rollout để giảm rủi ro, không phải cắt giảm chất lượng thiết kế.

### Milestone 1: Data Foundation & Taxonomy

- Thiết kế schema `QuestionProbe`, `InterviewSet`, `QuestionPracticeSession`, `QuestionUsageAnalytics`.
- Chuẩn hoá taxonomy cho role family, level, type, competency, tech tags, difficulty và language.
- Thiết kế `localizedContent` cho `vi`, `en`, `ja` với câu hỏi, title, intent hiển thị, guidance, common mistakes và display labels.
- Thiết kế trạng thái curation: `draft`, `in_review`, `active`, `retired`, `needs_revision`.
- Thiết kế audit trail cho ai tạo, ai sửa, ai review, publish lúc nào.
- Thiết kế quy trình tham khảo nguồn: ghi lại nguồn cảm hứng/tham khảo cho từng nhóm câu hỏi, sau đó biên soạn lại thành probe riêng với intent, signals, red flags và localized guidance.

### Milestone 2: Curated Content & Admin Workflow

- Seed bộ câu hỏi chất lượng cao cho các role chính: Backend, Frontend, Fullstack, DevOps/SRE, Data, QA.
- Mỗi probe phải có đầy đủ intent, localized content, expected signals, red flags, scoring hints và follow-ups.
- Admin có thể tạo/sửa/review/publish/retire probe.
- Admin có thể tạo Interview Set theo role, level, duration, stage coverage và competency coverage.
- AI hỗ trợ tạo Interview Set
- Hỗ trợ import/export JSON hoặc CSV để review nội dung hàng loạt.
- Có validation để không thể publish probe thiếu trường bắt buộc.

### Milestone 3: Public Question Bank Experience

- API list/search/filter/sort câu hỏi theo role, level, type, competency, tech tag, difficulty, language và popularity.
- Trang danh sách câu hỏi có card rõ ràng: câu hỏi, độ khó, tags, lượt luyện tập, role/level và nút luyện tập.
- Trang chi tiết câu hỏi hiển thị localized content: mục tiêu luyện tập, guidance, lỗi thường gặp, tags, related questions.
- Hỗ trợ đổi ngôn ngữ câu hỏi và metadata hiển thị giữa tiếng Việt, tiếng Anh, tiếng Nhật.
- Hỗ trợ bộ phỏng vấn theo vị trí với số câu hỏi, thời lượng, stage coverage, độ khó và danh sách competency.

### Milestone 4: AI Practice & Interview Orchestration

- Cho phép luyện tập từng câu hỏi từ question detail.
- Cho phép luyện tập theo Interview Set.
- Selector chọn probe theo hard constraints, metadata score, diversity, performance và asked history.
- Prompt builder inject `primaryQuestion`, intent, expected signals, red flags và follow-up options.
- AI không đọc máy móc `displayQuestion`; AI hỏi tự nhiên theo CV/JD, language setting và practice context.
- Lưu `probeId`, selected locale, selected follow-up trigger, asked history và transcript.

### Milestone 5: Probe-Aware Scoring & Feedback

- Scoring dùng expected signals, red flags, scoring hints và transcript evidence.
- Feedback chỉ ra câu trả lời đã cover tín hiệu nào, thiếu tín hiệu nào và có red flag nào.
- Scorecard có evidence quotes thay vì nhận xét chung.
- CV claim verification đánh dấu claim đã verify, chưa verify hoặc có dấu hiệu inflated.
- Hỗ trợ feedback language riêng với question display language.

### Milestone 6: Analytics, Quality & Optimization

- Tracking analytics bắt buộc để đánh giá chất lượng probe.
- Dashboard cho admin biết probe nào hiệu quả, probe nào gây drop-off, probe nào scoring không ổn định.
- A/B test wording của `displayQuestion`, guidance và Interview Set ordering.
- Usage diversity để tránh một số câu hỏi bị dùng quá nhiều.
- Quality review loop: probe bị report hoặc scoring lệch sẽ chuyển về `needs_revision`.

Analytics bắt buộc cho từng probe:

| Metric | Ý nghĩa | Dùng để quyết định |
| --- | --- | --- |
| `practiceCount` | Số lần probe được bắt đầu luyện tập. | Đo popularity và dữ liệu đủ lớn để đánh giá chưa. |
| `completionRate` | Tỷ lệ session luyện câu này được hoàn thành. | Probe có quá khó, quá mơ hồ hoặc gây drop-off không. |
| `skipRate` | Tỷ lệ user bỏ qua probe hoặc thoát ngay sau khi thấy câu hỏi. | Wording/question fit có vấn đề không. |
| `retryRate` | Tỷ lệ user luyện lại cùng probe. | Probe có hữu ích để cải thiện kỹ năng không. |
| `averageScore` | Điểm trung bình của user khi trả lời probe. | Độ khó thực tế có khớp difficulty đã gán không. |
| `scoreDistribution` | Phân bố điểm theo các khoảng thấp/trung bình/cao. | Probe có phân loại được năng lực không, hay ai cũng điểm giống nhau. |
| `expectedSignalCoverage` | Tỷ lệ expected signals thường được user cover. | Signals có thực tế và đo được không. |
| `redFlagRate` | Tần suất red flags xuất hiện. | Red flags có hữu ích hay quá rộng/quá dễ trigger. |
| `followUpTriggerRate` | Tần suất từng follow-up trigger được dùng. | Follow-up có đúng vấn đề thường gặp không. |
| `aiFallbackRate` | Tỷ lệ AI phải fallback vì không chọn được follow-up/trigger hợp lệ. | Probe hoặc trigger design có thiếu không. |
| `userRating` | Đánh giá trực tiếp của user sau khi luyện câu hỏi. | Câu hỏi có hữu ích, rõ ràng, đúng nhu cầu không. |
| `reportRate` | Tỷ lệ user/admin report probe. | Probe có lỗi, dịch kém, không phù hợp hoặc gây hiểu nhầm không. |
| `languageCoverage` | Probe có đủ localized content cho các ngôn ngữ publish không. | Có thể hiển thị ổn định ở `vi`, `en`, `ja` không. |
| `usageDiversityScore` | Mức độ probe được dùng cân bằng so với các probe cùng role/stage/level. | Selector có đang lạm dụng một nhóm câu hỏi không. |

Giải thích:

- **A/B test wording của `displayQuestion`**: cùng một probe có thể có hai cách viết câu hỏi khác nhau để xem cách nào khiến người dùng dễ hiểu hơn và bắt đầu luyện tập nhiều hơn. Ví dụ câu A viết ngắn: "Bạn xử lý bất đồng kỹ thuật thế nào?", câu B viết rõ ngữ cảnh hơn: "Khi bạn không đồng ý với hướng giải pháp kỹ thuật của team, bạn đã xử lý ra sao?". Nếu B có completion rate và answer quality tốt hơn, có thể dùng B làm wording chính.
- **A/B test guidance**: thử các phiên bản gợi ý trả lời khác nhau trong trang detail. Một phiên bản có thể chỉ gợi ý STAR ngắn, phiên bản khác gợi ý thêm metric, personal contribution và lesson learned. Mục tiêu là xem guidance nào giúp user trả lời tốt hơn mà không biến thành "đáp án mẫu" quá lộ.
- **A/B test Interview Set ordering**: thử thứ tự câu hỏi trong một bộ phỏng vấn. Ví dụ bắt đầu bằng behavioral nhẹ rồi vào technical depth, hoặc bắt đầu bằng CV deep-dive trước. Mục tiêu là tìm thứ tự giúp buổi luyện tập tự nhiên, ít drop-off và vẫn đánh giá đủ competency.
- **Usage diversity**: nếu selector luôn chọn câu hỏi có score cao nhất hoặc phổ biến nhất, vài câu sẽ bị dùng quá nhiều còn các câu khác gần như không được dùng. Điều này làm analytics lệch, trải nghiệm lặp lại và bank không được kiểm chứng đầy đủ.
- **Cách đảm bảo usage diversity**: selector nên có rule giảm ưu tiên cho probe đã được dùng quá nhiều trong cùng role/level, ưu tiên probe ít được dùng nhưng vẫn đạt hard constraints, và không hỏi lại cùng competency/type quá sát nhau trong một session.
- **Ví dụ usage diversity**: với Backend Mid-level Stage 2, hệ thống không nên lúc nào cũng hỏi cache/Redis. Nó nên xoay vòng giữa API design, transaction, database index, queue, failure handling, observability và testing nếu các probe đều phù hợp với CV/JD.

### Milestone 7: Semantic Retrieval & Interview Memory

- Dùng PostgreSQL + pgvector hoặc equivalent vector store trong production stack.
- Embed nội dung phục vụ retrieval: intent, primaryQuestion, expectedSignals, techTags và localized content.
- Metadata filter luôn chạy trước vector search.
- Rerank theo role, level, tech overlap, competency coverage, usage diversity và session context.
- Interview memory retrieval cho transcript chunks để hỏi follow-up theo những gì ứng viên đã nói ở stage trước.

## Nguyên tắc sản phẩm

- Có thể lấy ý tưởng nội dung câu hỏi từ nền tảng bên ngoài, nhưng cần curate và viết lại theo cấu trúc riêng của sản phẩm.
- Câu hỏi phải được curate, review và có audit trail trước khi publish.
- Ít câu hỏi nhưng chất lượng hơn nhiều câu hỏi generic.
- Bank không phải script; AI không đọc nguyên văn một cách máy móc.
- Metadata canonical phải sạch, ổn định và không phụ thuộc ngôn ngữ hiển thị.
- Localized display content phải đủ tốt cho trang card, detail và practice flow.
- Vector search không được bỏ qua hard constraints về stage, level, status và role.
- Mỗi lượt hỏi một câu rõ mục tiêu.
- Chấm điểm phải có evidence, không chỉ nhận xét chung.
- Admin workflow và analytics là một phần của sản phẩm, không phải phần phụ.
- CV/JD grounding là điểm khác biệt chính so với việc user tự hỏi ChatGPT.

## Câu hỏi cần review

- Role families production sẽ gồm các vị trí trong ngành IT.
- Public question detail có nên hiển thị expected signals/red flags cho ứng viên.
- Stage 6 reverse interview có đưa vào cùng nền tảng question bank.
- Question bank schema cần hỗ trợ `vi`, `en`, `ja`.
- Admin có quyền publish probe và Interview Set. Hiện tại hệ thống chỉ có role `admin` và `user`, nên `admin` có toàn quyền quản lý question bank.
