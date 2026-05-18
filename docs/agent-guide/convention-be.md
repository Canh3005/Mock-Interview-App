# Backend Convention (NestJS)

## Ngôn ngữ artifact

Khi BE Dev tạo/cập nhật artifact trong `docs/features/` hoặc ghi done report, phần giải thích phải dùng tiếng Việt rõ ràng. Chỉ giữ tiếng Anh cho command, route, API contract, status kỹ thuật, exception gốc, field/code identifier, tên class/function/module hoặc thuật ngữ cần đối chiếu trực tiếp.

Lưu ý riêng BE: error message, exception message và API response trả về từ backend vẫn dùng tiếng Anh theo rule kỹ thuật. Rule tiếng Việt áp dụng cho artifact, walkthrough, review note và done report, không áp dụng cho message trả về API.

## Module Structure

Mỗi feature là một module độc lập:
```
src/{feature}/
├── {feature}.module.ts
├── {feature}.controller.ts
├── {feature}.service.ts
├── dto/
│   └── {action}-{feature}.dto.ts
└── entities/
    └── {feature}.entity.ts
```

Không tạo repository class riêng — dùng TypeORM `Repository<T>` trực tiếp trong service qua `@InjectRepository`.

## Giới hạn kích thước — BẮT BUỘC

- **File:** tối đa 500 dòng
- **Function/method:** tối đa 50 dòng
- Vượt quá → dấu hiệu cần tách nhỏ, không phải viết tiếp

## Controller

```typescript
@ApiTags('feature')
@Controller('feature')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '...' })
  async create(@Body() dto: CreateFeatureDto, @Req() req: JwtAuthRequest) {
    return this.featureService.create(dto, req.user.id);
  }
}
```

- Controller chỉ nhận request, gọi service, trả response — **không chứa business logic**
- Route cần auth phải có `@UseGuards(JwtAuthGuard)` + `@ApiBearerAuth()`

## Service

```typescript
@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  constructor(
    @InjectRepository(Feature) private featureRepository: Repository<Feature>,
  ) {}

  async create(dto: CreateFeatureDto, userId: string): Promise<Feature> {
    const existing = await this.featureRepository.findOne({ where: { userId } });
    if (existing) throw new ConflictException('Already exists'); // early return

    try {
      const entity = this.featureRepository.create({ ...dto, userId });
      const result = await this.featureRepository.save(entity);
      this.logger.log(`Feature created: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to create feature', error);
      throw error;
    }
  }
}
```

## TypeScript — Không có ngoại lệ

- **Explicit type cho mọi biến** — không dựa vào inference:
  ```typescript
  // SAI
  const result = await this.repo.findOne(...);
  // ĐÚNG
  const result: Feature | null = await this.repo.findOne(...);
  ```
- Không dùng `any` — nếu bắt buộc phải có comment giải thích
- Không dùng nested function — extract thành private method (trừ inline lambda < 5 dòng trong `.map()`, `.filter()`)

## Function Naming

- **Private method:** prefix `_` → `private _formatData(...)`
- **Public method:** không có prefix → `async create(...)`

## Function Parameters

Function có **≥2 tham số** → dùng object destructuring:
```typescript
// SAI
private _format(value: number, emptyDisplay: string): string

// ĐÚNG
private _format({ value, emptyDisplay }: { value: number; emptyDisplay: string }): string
```

## Early Return — Ưu tiên dùng

```typescript
// SAI — nested if
async process(id: string) {
  const item = await this.repo.findOne(id);
  if (item) {
    if (item.active) {
      // logic
    }
  }
}

// ĐÚNG — early return
async process(id: string) {
  const item: Feature | null = await this.repo.findOne(id);
  if (!item) throw new NotFoundException('Not found');
  if (!item.active) throw new BadRequestException('Inactive');
  // logic
}
```

## Cấm — Không có ngoại lệ

```typescript
// CẤM: Promise.all() không có error control
const [a, b] = await Promise.all([serviceA.get(), serviceB.get()]);
// → Nếu một cái fail, cả hai mất. Dùng Promise.allSettled() hoặc sequential

// CẤM: vòng lặp không có điều kiện dừng
while (condition) { ... } // phải có break hoặc điều kiện rõ ràng

// CẤM: recursive không có depth limit
async _traverse(node: Node, depth = 0) {
  const MAX_DEPTH = 10;
  if (!node || depth >= MAX_DEPTH) return; // bắt buộc
  await this._traverse(node.child, depth + 1);
}
```

## DTO

```typescript
export class CreateFeatureDto {
  @ApiProperty({ example: 'value' })
  @IsString()
  @IsNotEmpty()
  field: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  optionalField?: string;
}
```

## Error Handling

Dùng đúng exception:
- `NotFoundException` — không tìm thấy (404)
- `BadRequestException` — dữ liệu sai (400)
- `UnauthorizedException` — chưa auth (401)
- `ConflictException` — đã tồn tại (409)

Mọi error message bằng tiếng Anh.

## Code Quality

- Dùng `.map()`, `.filter()`, `.reduce()` thay vì `for` loop đơn giản
- Xóa import và biến không dùng
- Không để `console.log` debug

## Pagination — Endpoint trả nhiều bản ghi

**Bắt buộc áp dụng** cho mọi endpoint GET trả về list (không phải lookup by ID).

**Controller:**
```typescript
@Get()
async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
  return this.featureService.findAll({
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 10,
  });
}
```

**Service:**
```typescript
async findAll({ page, limit }: { page: number; limit: number }): Promise<{
  data: Feature[];
  total: number;
  page: number;
  limit: number;
}> {
  const [data, total]: [Feature[], number] = await this.repo.findAndCount({
    order: { createdAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });
  return { data, total, page, limit };
}
```

**Response shape chuẩn:**
```json
{ "data": [...], "total": 42, "page": 1, "limit": 10 }
```

- Default: `page=1`, `limit=10`
- Không trả raw array — luôn wrap trong `{ data, total, page, limit }`
- Public query endpoint dùng random/filter (không cần phân trang) có thể trả array trực tiếp

## Redis Pattern

```typescript
await this.redis.set(`key:${userId}:${id}`, JSON.stringify(data), 'EX', 3600);
const cached: string | null = await this.redis.get(`key:${userId}:${id}`);
if (cached) return JSON.parse(cached) as Feature;
```

- Cache key phải đủ unique (tránh collision giữa users)
- Luôn set TTL — không cache vô thời hạn

## JSDoc — Hàm public và hàm private phức tạp

**Public method** (được gọi từ controller hoặc module khác): bắt buộc JSDoc đầy đủ với `@param`, `@returns`, `@throws`.

**Private method** (`_`): thêm JSDoc nếu có ràng buộc ẩn, return contract đặc biệt (ví dụ `null` có ý nghĩa nghiệp vụ), hoặc tham số không tự giải thích được từ tên.

```typescript
/**
 * Tạo session plan từ calibration profile và DTO của user.
 *
 * @param dto - Thông tin cấu hình phiên phỏng vấn (depth, duration, language...)
 * @param userId - ID của user thực hiện tạo plan
 * @returns SessionPlan đã lưu vào database
 * @throws NotFoundException nếu calibration profile không tồn tại
 * @throws BadRequestException nếu profile chưa ready hoặc thiếu CV
 */
async createPlan({ dto, userId }: { dto: CreateSessionPlanDto; userId: string }): Promise<SessionPlan>

/**
 * Tính score kỹ thuật cho probe dựa trên overlap tech tag với CV và JD.
 *
 * @param probe - Probe cần tính score
 * @param cvTechStack - Danh sách tech từ CV của ứng viên
 * @param jdTechStack - Danh sách tech yêu cầu từ JD
 * @param targetLevel - Level mục tiêu để tính difficulty fit
 * @param roleFamily - Role family để tính role fit
 * @returns Score từ 0–1, hoặc null nếu probe có techTags nhưng không overlap — probe đó bị loại khỏi selection
 */
private _scoreTechnicalProbe({ probe, cvTechStack, jdTechStack, targetLevel, roleFamily }: TechnicalScoringParams): number | null
```

**Không viết JSDoc mô tả lại tên hàm.** Chỉ ghi những điều nằm ngoài tên: side effect, precondition, contract của giá trị trả về, hoặc lý do xử lý đặc biệt.

## Checklist trước khi báo Done

- [ ] File < 500 dòng, function < 50 dòng
- [ ] Explicit type cho mọi biến — không có inference
- [ ] Không có `any`
- [ ] Private method có prefix `_`
- [ ] Không có nested function
- [ ] Không có `Promise.all()` trần
- [ ] Mọi loop có điều kiện dừng rõ ràng
- [ ] Error message bằng tiếng Anh
- [ ] Import không dùng đã xóa
- [ ] GET list endpoint trả `{ data, total, page, limit }` — không trả raw array
- [ ] Public method có JSDoc; private method phức tạp có JSDoc nếu tên chưa đủ
- [ ] `npm run lint` pass
