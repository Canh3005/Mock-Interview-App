# Phase 8: Thương mại hóa — Hệ thống Credit & Thanh toán

## Mục tiêu

Xây dựng nền tảng doanh thu bền vững cho sản phẩm thông qua hai mô hình song song: **B2C Credit Wallet** (cá nhân nạp tiền mua Credit dùng tính năng) và **B2B Campaign Contract** (doanh nghiệp mua gói lượt phỏng vấn số lượng lớn). Đây là Phase nền tảng tài chính — không có Phase này, toàn bộ lộ trình 7 Phase trước không có cơ chế thu hồi vốn.

---

## Định vị sản phẩm & Phân khúc thị trường

### Lợi thế cạnh tranh cốt lõi

Thị trường hiện tại (LeetCode, Pramp, Interviewing.io) chưa có sản phẩm nào kết hợp đồng thời các yếu tố sau — đây là nền tảng để định giá cao hơn thị trường:

| Điểm khác biệt | Mô tả |
|---|---|
| Voice AI Real-time | Phỏng vấn nói chuyện thật sự, không phải chat |
| System Design Whiteboard | Vẽ sơ đồ + AI phân tích kiến trúc |
| Mandatory Quoting | Điểm trừ có trích dẫn timestamp — không thể tranh cãi |
| DSA Combat Mode | Luyện tập có áp lực thời gian như phỏng vấn thật |
| Silence Detection | AI chủ động như interviewer thật khi user im lặng |

**Định vị:** Platform cao cấp nhất phân khúc luyện phỏng vấn IT, tương đương dịch vụ mock interview 1:1 với senior engineer nhưng chi phí thấp hơn 10–20x.

### Hai phân khúc khách hàng

```
B2C — Cá nhân                        B2B — Doanh nghiệp
────────────────────                  ──────────────────────────
Fresher / Junior IT                   Startup < 50 người
Mid-level switching job               Mid-size 50–500 nhân sự
Senior targeting Big Tech             Enterprise 500+
Người Việt thi FAANG quốc tế          Headhunter / Recruitment Agency

LTV ước tính: $30–$200/năm            LTV ước tính: $2,000–$50,000/năm
```

---

## Mô hình doanh thu

### B2C — Hệ thống Credit (Ví điện tử nội bộ)

**Lý do chọn Credit thay vì Subscription thuần túy:**
- Giảm barrier tâm lý: User thấy "còn 5 Credit" thay vì "còn 5 ngày"
- Tăng Perceived Value: Mỗi phiên thi có giá trị cụ thể, không bị blur bởi flat-rate
- Pricing linh hoạt theo tính năng (SD tốn hơn DSA vì cost token cao hơn)
- ARPU cao hơn subscription flat-rate nhờ cơ chế loss aversion

**Bảng giá gói nạp Credit:**

| Gói | Credit | Giá (VND) | Giá/Credit | Ưu đãi |
|-----|--------|-----------|-----------|--------|
| Starter | 10 | 49,000 | 4,900 | — |
| Standard | 30 | 129,000 | 4,300 | Tiết kiệm 12% |
| Pro | 100 | 379,000 | 3,790 | Tiết kiệm 23% |
| Elite | 300 | 990,000 | 3,300 | Tiết kiệm 33% |

**Chi phí Credit theo tính năng:**

| Tính năng | Credit | Lý do |
|-----------|--------|-------|
| DSA Combat Session (30 phút) | 3 | Chi phí token thấp |
| Behavioral Interview (45 phút) | 4 | Trung bình |
| System Design Full Session | 8 | Chi phí token + TTS cao nhất |
| CV–JD Match Analysis | 2 | One-shot inference |

**Free Tier (bắt buộc có để acquisition):**
- Tặng 20 Credit khi đăng ký → đủ để hoàn thành toàn bộ các session + xem debrief
- Mục tiêu: Cho user trải nghiệm trọn vẹn 1 vòng thi trước khi yêu cầu thanh toán

---

### B2C — Subscription Tier (nâng cao retention dài hạn)

Kết hợp Credit + Subscription để lock-in user qua nhiều tháng. Subscription không thay thế Credit mà chỉ là kênh nạp Credit định kỳ với ưu đãi:

| Plan | Giá/tháng | Bao gồm | Đặc quyền thêm |
|------|-----------|---------|----------------|
| Free | 0 | 5 Credit (1 lần duy nhất) | — |
| Plus | 99,000 | 20 Credit/tháng (rollover) | Badge system, Growth Graph |
| Pro | 249,000 | 60 Credit/tháng (rollover) | Priority AI queue, Learning Path |
| Unlimited | 499,000 | Không giới hạn DSA + Behavioral | SD vẫn tính Credit riêng* |

*System Design giữ Credit-based ngay cả với Unlimited vì infra cost cao (Whiteboard rendering, TTS latency).

---

### B2B — Campaign Contract

**Lý do chọn Campaign-based thay vì Seat-based:**

Seat-based phù hợp SaaS dùng hàng ngày (Slack, Notion). Với interview platform, công ty chỉ cần "số lượt phỏng vấn" — mua 500 lượt, dùng trong 6 tháng. Campaign-based khớp với mental model của HR.

**Bảng giá gói doanh nghiệp:**

| Gói | Campaign (lượt) | Giá (VND) | Tính năng |
|-----|----------------|-----------|-----------|
| Startup | 50 | 4,900,000 | Dashboard cơ bản, Leaderboard |
| Growth | 200 | 17,000,000 | White-label logo, Audio playback Red Flag |
| Enterprise | 1,000 | 70,000,000 | Custom branding, SSO, Dedicated support |
| Custom | > 1,000 | Thương lượng | Full white-label, API access, SLA 99.9% |

---

## Lộ trình & Phạm vi công việc

### Epic 1: Credit Wallet Core

Nền tảng tài chính, phải build đầu tiên trước mọi tính năng thanh toán.

- **Wallet Entity & Transaction Log**: Mỗi user có 1 Wallet, mọi thay đổi số dư đều ghi CreditTransaction (không update trực tiếp balance mà append transaction rồi aggregate).
- **Credit Deduction Logic**: Trừ Credit TRƯỚC khi gọi AI — không để session hoàn thành rồi mới trừ tiền. Dùng database transaction atomic.
- **Refund Tự động**: Nếu session bị lỗi kỹ thuật (AI crash, network drop giữa chừng) → hoàn Credit tự động, không cần user khiếu nại.
- **Signup Bonus**: Tự động cộng 5 Credit khi user đăng ký lần đầu.

### Epic 2: Payment Gateway Integration

- **MoMo** (ưu tiên #1): Penetration cao nhất Việt Nam, QR code dễ dùng, phù hợp B2C.
- **VNPay** (ưu tiên #2): Bắt buộc với doanh nghiệp B2B cần xuất hóa đơn VAT.
- **Stripe** (ưu tiên #3): Cho user quốc tế và B2B nước ngoài.
- **Chuyển khoản ngân hàng** (ưu tiên #4): Hợp đồng B2B Enterprise > 20 triệu, xử lý thủ công.
- **Webhook Handler**: Idempotency key bắt buộc — duplicate webhook từ payment gateway không được credit 2 lần.

### Epic 3: Purchase Flow UI

- **Package Selection Modal**: Hiện ra khi user bắt đầu session mà không đủ Credit. Gợi ý 3 gói phù hợp nhất dựa trên Credit thiếu.
- **Credit Balance Header**: Hiển thị balance mọi lúc trên header (như ví MoMo).
- **Low Balance Notification**: Toast khi balance < 5 Credit — "Bạn sắp hết Credit, nạp thêm để không bị gián đoạn".
- **Order History**: Trang lịch sử giao dịch đầy đủ (mua, tiêu, hoàn tiền).

### Epic 4: Subscription Billing

- **Recurring Payment**: Tích hợp subscription với MoMo recurring hoặc Stripe Billing.
- **Plan Upgrade/Downgrade**: Xử lý prorate khi user đổi plan giữa tháng.
- **Credit Rollover**: Credit từ subscription không dùng hết được chuyển sang tháng tiếp theo (tối đa 2 tháng rollover).
- **Cancellation Flow**: User hủy subscription vẫn giữ Credit còn lại, không mất.

### Epic 5: B2B Campaign Wallet

- **Organization Wallet**: Mỗi tổ chức B2B có Campaign Wallet riêng với `total_purchased`, `used`, `expires_at`.
- **HR Sub-admin**: HR Manager được cấp quyền phân phối lượt cho ứng viên trong Campaign.
- **Campaign Expiry**: Lượt phỏng vấn B2B hết hạn sau 12 tháng kể từ ngày mua — tạo urgency cho HR sử dụng.
- **Invoice Export**: Xuất hóa đơn VAT PDF cho doanh nghiệp, tự động điền thông tin công ty.

### Epic 6: Admin FinOps Dashboard

- **Doanh thu Real-time**: Biểu đồ MRR, ARR, breakdown theo gói và gateway.
- **Top Buyers**: Danh sách user có ARPU cao nhất — target cho upsell.
- **Refund Management**: Admin xem và xử lý refund request.
- **Cost vs Revenue**: So sánh chi phí token/API với doanh thu Credit để tính margin theo tính năng.

---

## Thiết kế Data Model

```
User
 └── Wallet (1-1)
      ├── balance: number              -- Credit hiện có (aggregated)
      ├── lifetime_earned: number      -- Tổng tích lũy mọi thời điểm
      └── CreditTransaction[]
           ├── type: PURCHASE | SPEND | REFUND | BONUS | EXPIRY
           ├── amount: number          -- Dương = cộng, Âm = trừ
           ├── reference_id           -- FK → Order | InterviewSession
           ├── note: string           -- "DSA Session #123", "MoMo top-up"
           └── created_at

Order
 ├── user_id
 ├── package_id                        -- FK → CreditPackage
 ├── amount_vnd: number
 ├── credit_amount: number             -- Số Credit sẽ được cộng
 ├── payment_method: MOMO | VNPAY | STRIPE | BANK_TRANSFER
 ├── status: PENDING | PAID | FAILED | REFUNDED
 ├── gateway_transaction_id: string    -- ID từ MoMo/VNPay/Stripe
 ├── idempotency_key: string           -- Chống duplicate webhook
 └── created_at

CreditPackage
 ├── name: string
 ├── credit_amount: number
 ├── price_vnd: number
 ├── is_active: boolean
 └── tag: string                       -- "popular", "best_value"

B2BOrganization
 ├── name: string
 ├── email_domain_whitelist: string[]  -- ["company.com"] chặn ngoài công ty
 └── CampaignWallet
      ├── total_purchased: number
      ├── used: number
      ├── expires_at: Date
      └── CampaignTransaction[]
```

---

## Business Rules

1. **Credit không hết hạn (B2C)** — tránh user phẫn nộ và refund request hàng loạt.
2. **Campaign B2B hết hạn sau 12 tháng** — tạo urgency cho HR mà không gây khó chịu.
3. **Deduct trước, session sau** — không bao giờ để session chạy xong rồi mới trừ tiền.
4. **Refund tự động khi lỗi kỹ thuật** — session bị drop do server error thì hoàn Credit trong vòng 5 phút.
5. **Idempotency bắt buộc** — mọi webhook từ payment gateway phải check idempotency_key trước khi credit.
6. **Phone verification sau khi dùng hết Free Credit** — hạn chế tạo nhiều tài khoản lấy Bonus.
7. **Campaign link gắn với email domain whitelist** — B2B không chia sẻ lượt ra ngoài công ty.

---

## Anti-Fraud & Rủi ro

| Rủi ro | Xác suất | Giải pháp |
|--------|----------|-----------|
| Mua Credit bằng thẻ đánh cắp rồi chargeback | Cao | Rate limit, IP tracking, delay Credit 24h với Stripe lần đầu |
| Tạo nhiều tài khoản lấy Free Credit | Rất cao | Device fingerprint + phone OTP sau khi hết 5 Credit |
| Dùng Credit rồi dispute payment MoMo | Thấp | Log đầy đủ session timestamp + AI response làm evidence |
| B2B chia sẻ Campaign link ra ngoài công ty | Trung bình | Email domain whitelist + link token 1 lần/ứng viên |

**Bonus Credit Expiry — chiến lược tạo urgency mà không vi phạm cam kết:**
- Credit mua = không hết hạn (cam kết chính)
- Credit bonus (tặng khi mua gói) = hết hạn sau 30 ngày
- Ví dụ: Mua Standard → tặng thêm 5 Bonus Credit, hết hạn sau 30 ngày
- Tạo urgency quay lại dùng mà không vi phạm cam kết về Credit chính

---

## UX Luồng nạp tiền

```
[User nhấn "Bắt đầu phiên SD"]
       ↓
[Kiểm tra balance: 3 Credit < 8 Credit cần thiết]
       ↓
[Modal: "Bạn cần 8 Credit để bắt đầu. Hiện có 3 Credit."]
[Gợi ý 3 gói: Starter | Standard ⭐ Phổ biến | Pro]
       ↓
[Chọn thanh toán: MoMo | QR VNPay | Thẻ quốc tế]
       ↓
[Redirect → Payment Gateway → Webhook callback]
       ↓
[Webhook xác nhận → Cộng Credit → Toast thành công]
["Đã nạp 30 Credit. Số dư: 33 Credit."]
       ↓
[Session bắt đầu — trừ 8 Credit ngay lập tức]
```

---

## Chiến lược triển khai theo giai đoạn

### Giai đoạn A — Launch B2C (Ngay hiện tại)

**Mục tiêu:** Thu được tiền đầu tiên, validate willingness to pay.

```
Sprint 1 (tuần 1–2):
├── Wallet entity + CreditTransaction service
├── MoMo payment integration + webhook handler
├── Credit deduction logic (atomic DB transaction)
└── Free signup bonus (5 Credit)

Sprint 2 (tuần 3–4):
├── Purchase flow UI + package selection modal
├── VNPay integration
├── Order history page
└── Admin dashboard: doanh thu, top buyers
```

**KPIs mục tiêu giai đoạn A:**
- Conversion rate Free → Paid ≥ 8%
- ARPU ≥ 120,000 VND/tháng với paying users
- Churn rate ≤ 15%/tháng

### Giai đoạn B — Subscription Layer (tháng 1–2 sau launch)

Thêm Plus/Pro plan sau khi có data về usage pattern.

**Trigger chuyển sang Subscription pitch:** User mua Credit 2 lần trở lên → hiện banner "Tiết kiệm 30% với gói Pro hàng tháng".

```
Sprint 3 (tuần 5–6):
├── Subscription billing (recurring MoMo / Stripe)
├── Plan upgrade/downgrade với prorate
└── Credit rollover logic
```

### Giai đoạn C — B2B Enterprise (tháng 3–4 sau launch)

Khi có ≥ 500 active user B2C → social proof đủ mạnh để pitch B2B.

**Kênh bán B2B:**
- LinkedIn outreach tới HR Manager các công ty IT Việt Nam
- Pilot miễn phí 20 lượt → close deal thành Campaign
- Partner với bootcamp (ATP, Techmaster) để bundle vào chương trình học

```
Sprint 4 (tuần 7–8):
├── B2B Campaign wallet
├── HR Sub-admin dashboard
├── Invoice/VAT export PDF
└── Email domain whitelist cho Campaign link
```

---

## Dự báo doanh thu

*Conservative scenario — tăng trưởng tự nhiên, không tính paid marketing:*

| Tháng | MAU | Paying Users (8%) | ARPU | MRR |
|-------|-----|------------------|------|-----|
| T1 | 500 | 40 | 120,000 | 4,800,000 |
| T3 | 2,000 | 160 | 150,000 | 24,000,000 |
| T6 | 8,000 | 640 + 5 B2B | 180,000 | ~130,000,000 |
| T12 | 20,000 | 1,600 + 20 B2B | 200,000 | ~400,000,000 |

*B2B deal trung bình ước tính: 10,000,000 VND/deal*

---

## Quản trị Rủi ro Kỹ thuật & Product

- **Rủi ro Duplicate Credit do webhook retry**: Mọi payment gateway đều retry webhook khi không nhận được 200 response. Giải pháp: idempotency_key duy nhất per order — check trước khi credit, trả 200 ngay nếu đã xử lý rồi.
- **Rủi ro Session chạy nhưng Credit không trừ được**: Wrap credit deduction + session creation trong cùng một DB transaction. Nếu deduction fail thì session không bắt đầu.
- **Rủi ro User tranh cãi về Credit bị trừ oan**: Log đầy đủ session_id + credit_transaction_id + timestamp. Admin có thể trace ngược từ complaint đến transaction trong < 2 phút.
- **Rủi ro Stripe chargeback làm âm Credit**: Credit chỉ được cộng sau khi gateway xác nhận PAID, không phải khi user redirect về. Với Stripe, delay 24h cho lần giao dịch đầu tiên.
