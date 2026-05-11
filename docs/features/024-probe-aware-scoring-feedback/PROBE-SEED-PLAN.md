# Kế hoạch seed probe v0

## Mục tiêu

Seed v0 cung cấp dữ liệu đủ rộng để kiểm tra selector, trang question detail và scoring theo `probeSnapshot`. Mục tiêu không phải copy danh sách câu hỏi phỏng vấn, mà chuyển hóa nguồn tham khảo thành `QuestionProbe` có intent, expected signals, red flags, follow-up và scoring hints.

Batch đầu tiên gồm 84 active probes:

- 7 role families: backend, frontend, fullstack, devops, data, qa, security.
- 3 levels: junior, mid, senior.
- 4 probes cho mỗi role-level.

Mức này đủ để mỗi role-level có một mock interview ngắn và vẫn có lựa chọn thay thế khi filter theo type, level hoặc competency.

## Nguồn tham khảo

Các nguồn dưới đây chỉ dùng để lấy topic, cách phân nhóm và cách calibrate rubric. Nội dung seed đã được viết lại theo cấu trúc probe riêng.

| Nguồn                                        | Dùng cho                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| OPM Structured Interviews                    | Competency-based question design, rubric consistency, scoring calibration |
| Microsoft 365 behavioral interview guidance  | Behavioral, situational, teamwork, adaptability, stakeholder scenarios    |
| Tech Interview Handbook                      | Breadth cho technical interview topics                                    |
| H5BP Front-end Developer Interview Questions | Frontend topics: React, browser performance, accessibility, testing       |
| System Design Primer                         | Backend/fullstack/data topics: scalability, cache, queues, consistency    |
| DevOps Exercises                             | DevOps/SRE topics: Kubernetes, CI/CD, Terraform, observability            |
| OWASP Web Security Testing Guide             | Security topics: auth, XSS, CSRF, SQL injection, testing approach         |

## Phân bổ v0

| Type                  | Số lượng |
| --------------------- | -------: |
| technical_depth       |       14 |
| debugging             |       21 |
| trade_off             |       14 |
| behavioral            |       14 |
| cv_claim_verification |       14 |
| situational           |        7 |

Phân bổ này cố ý ưu tiên `debugging` vì feature scoring cần nhiều dữ liệu có evidence rõ: scope, reproduction, metric, root cause, fix verification và prevention.

## Mở rộng lên v1

Target v1 nên là 210 probes:

- 7 role families x 3 levels x 10 probes.
- Mỗi role-level có ít nhất 2 technical depth, 2 debugging, 2 trade-off hoặc situational, 1-2 behavioral, 1-2 CV claim verification.
- Mỗi probe có 4-6 expected signals, 3-5 red flags, 2-3 follow-ups và 4 scoring hints.

Khi mở rộng, không tạo thêm probe nếu chỉ đổi wording nhưng không đổi intent, expected signals hoặc coverage. Probe mới phải tăng diversity thật: type, competency, level, tech tag hoặc failure mode.

## Cách chạy

Trong `server/`:

```bash
npm run seed:probes
```

Seed idempotent theo `code`: nếu probe đã tồn tại thì cập nhật nội dung theo seed, nếu chưa có thì tạo active probe mới.
