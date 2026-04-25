# Backend Convention (NestJS)

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

- **File:** tối đa 300 dòng
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

## Redis Pattern

```typescript
await this.redis.set(`key:${userId}:${id}`, JSON.stringify(data), 'EX', 3600);
const cached: string | null = await this.redis.get(`key:${userId}:${id}`);
if (cached) return JSON.parse(cached) as Feature;
```

- Cache key phải đủ unique (tránh collision giữa users)
- Luôn set TTL — không cache vô thời hạn

## Checklist trước khi báo Done

- [ ] File < 300 dòng, function < 50 dòng
- [ ] Explicit type cho mọi biến — không có inference
- [ ] Không có `any`
- [ ] Private method có prefix `_`
- [ ] Không có nested function
- [ ] Không có `Promise.all()` trần
- [ ] Mọi loop có điều kiện dừng rõ ràng
- [ ] Error message bằng tiếng Anh
- [ ] Import không dùng đã xóa
- [ ] `npm run lint` pass
