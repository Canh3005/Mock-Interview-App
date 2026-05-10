# Frontend Convention (React + Redux-Saga)

## Ngôn ngữ artifact

Khi FE Dev tạo/cập nhật artifact trong `docs/features/` hoặc ghi done report, phần giải thích phải dùng tiếng Việt rõ ràng. Chỉ giữ tiếng Anh cho command, route, API contract, status kỹ thuật, exception gốc, field/code identifier, tên component/slice/saga/API function hoặc thuật ngữ cần đối chiếu trực tiếp.

Rule này khác với UI i18n: UI visible text vẫn phải dùng `t()` và đủ `en`, `vi`, `ja`; artifact/walkthrough/review/done report thì mặc định viết tiếng Việt rõ ràng.

## File Structure

Mỗi feature mới thêm vào:
```
src/
├── api/{feature}.api.js
├── store/slices/{feature}Slice.js
├── store/sagas/{feature}Saga.js
└── components/{page}/
```

Đăng ký saga mới trong `store/sagas/rootSaga.js`.

## Giới hạn kích thước — BẮT BUỘC

- **File:** tối đa 500 dòng
- **Function/Component:** tối đa 50 dòng
- Vượt quá → tách thành components nhỏ hơn

## Phân tách trách nhiệm — Quan trọng nhất

- **Component:** chỉ render UI + dispatch action. Không có business logic.
- **Saga:** toàn bộ business logic, side effects, data transformation
- **Slice:** state shape + reducers đơn giản

```jsx
// SAI — logic trong component
function MyComponent() {
  const handleSubmit = async () => {
    const formatted = data.map(d => ({ ...d, date: new Date(d.date) })); // logic
    const result = await api.submit(formatted); // side effect
    if (result.ok) navigate('/success');
  };
}

// ĐÚNG — component chỉ dispatch
function MyComponent() {
  const dispatch = useDispatch();
  const handleSubmit = () => dispatch(submitRequest(data));
}
// Logic nằm trong saga
```

## API Layer

```javascript
// src/api/{feature}.api.js
import axiosClient from './axiosClient';

export const featureApi = {
  getList: (params) => axiosClient.get('/feature', { params }),
  create: (data) => axiosClient.post('/feature', data),
};
```

- Luôn dùng `axiosClient` — không dùng raw `axios` hay `fetch`
- Không xử lý error ở đây — để saga handle

## Slice (Redux Toolkit)

```javascript
import { createSlice } from '@reduxjs/toolkit';

const featureSlice = createSlice({
  name: 'feature',
  initialState: { data: null, loading: false, error: null },
  reducers: {
    fetchRequest: (state) => { state.loading = true; state.error = null; },
    fetchSuccess: (state, action) => { state.loading = false; state.data = action.payload; },
    fetchFailure: (state, action) => { state.loading = false; state.error = action.payload; },
  },
});
```

Pattern bắt buộc: `{action}Request` → `{action}Success` → `{action}Failure`

## Saga

```javascript
import { call, put, takeLatest } from 'redux-saga/effects';

function* _handleFetch(action) { // private → prefix _
  try {
    const response = yield call(featureApi.getList, action.payload);
    yield put(fetchSuccess(response));
  } catch (error) {
    const message = error.response?.data?.message || 'Something went wrong';
    yield put(fetchFailure(message));
    // toast nếu cần: toast.error(message)
  }
}

export function* featureSaga() {
  yield takeLatest(fetchRequest.type, _handleFetch);
}
```

- Dùng `yield call(api, ...)` — không `async/await` trong saga
- Luôn có error fallback message
- Dùng `takeLatest` — không dùng `takeEvery` trừ khi có lý do rõ

## Function Naming

- **Private/internal function:** prefix `_` → `function _handleFetch()`
- **Exported function:** không có prefix → `export function* featureSaga()`

## Function Parameters

Function có **≥2 tham số** → dùng object:
```javascript
// SAI
function _format(value, emptyDisplay) {}

// ĐÚNG
function _format({ value, emptyDisplay }) {}
```

## Cấm — Không có ngoại lệ

```javascript
// CẤM: Promise.all() trong client code
const [a, b] = await Promise.all([apiA(), apiB()]);
// → Dùng sequential hoặc Promise.allSettled()

// CẤM: vòng lặp không có điều kiện dừng
while (condition) { ... } // phải có break rõ ràng

// CẤM: recursive không có depth limit
function _traverse(node, depth = 0) {
  const MAX_DEPTH = 10;
  if (!node || depth >= MAX_DEPTH) return; // bắt buộc
  _traverse(node.child, depth + 1);
}
```

## Performance

- Lazy load tất cả pages: `React.lazy(() => import('./Page'))`
- `useMemo` cho computed values nặng
- `useCallback` cho callbacks truyền vào child component
- `React.memo()` cho pure component render nhiều lần

## User Feedback — BẮT BUỘC

- Loading state phải hiển thị khi đang fetch
- Error state phải hiển thị khi request fail
- Dùng toast notification cho action success/error (không chỉ hiện trong form)

## Production Forms — BẮT BUỘC

Với mọi workflow production nơi user tạo/sửa dữ liệu nghiệp vụ, UI phải là form có cấu trúc theo domain. Admin UI vẫn là production UI nếu admin/curator dùng hằng ngày.

Bắt buộc:
- Dùng input/select/checkbox/toggle/slider/date picker/tab/section/repeatable list editor phù hợp với kiểu dữ liệu.
- Với taxonomy hoặc enum, dùng select/combobox/multi-select từ API hoặc constant chuẩn; không bắt user nhớ key nội bộ.
- Với localized content, dùng tab/section theo locale và label rõ từng field.
- Với danh sách như expected signals, red flags, scoring hints, follow-ups, dùng add/remove row hoặc repeatable group.
- Hiển thị validation summary theo field/group khi save hoặc publish fail.

Cấm:
- Không dùng JSON editor, textarea raw payload, hoặc DTO/schema editor làm luồng chính để create/edit dữ liệu production.
- Không yêu cầu user nhập object/array JSON thủ công cho nghiệp vụ thường ngày.
- Không dùng JSON editor để "đi nhanh" nếu BA/HOW mô tả đây là workflow người dùng thật.

Chỉ được dùng JSON editor cho import/export/debug/seed/bulk technical tooling khi BA/HOW cho phép rõ, được label là luồng phụ, và không thay thế form chính.

## i18n — BẮT BUỘC

Mọi text hiển thị cho user phải dùng `t()`. Thêm key vào **cả 3 file** cùng lúc:
- `src/i18n/locales/en.json`
- `src/i18n/locales/vi.json`
- `src/i18n/locales/ja.json`

```jsx
// SAI
<button>Submit</button>

// ĐÚNG
<button>{t('common.submit')}</button>
```

Nếu chưa biết dịch vi/ja: dùng `[TODO: translate]` — không để trống.

Riêng `vi.json` phải dùng tiếng Việt có dấu đầy đủ. Không viết fallback không dấu kiểu `Dang xuat`, `Quan ly`, `Tim kiem`; nếu chưa dịch được thì dùng `[TODO: translate]` thay vì bỏ dấu. Thuật ngữ kỹ thuật/domain có thể giữ nguyên tiếng Anh khi đó là tên khái niệm sản phẩm, nhưng phần câu tiếng Việt xung quanh vẫn phải có dấu.

## DRY

- Không trùng lặp UI — tạo component tái sử dụng nếu dùng từ 2 lần trở lên
- Trước khi tự tạo component điều khiển UI mới như input, select, combobox, checkbox, bộ lọc hoặc sắp xếp, phải tìm component tương đương trong cùng khu vực tính năng và thư viện UI dùng chung. Nếu đã có component tùy biến phù hợp, dùng lại component đó thay vì viết thẻ HTML gốc hoặc component cục bộ khác kiểu hiển thị.
- Chỉ tạo component điều khiển mới khi component hiện có không đáp ứng được hành vi hoặc `props` cần thiết; khi đó ưu tiên mở rộng component hiện có nếu thay đổi vẫn giữ tương thích.
- Không trùng lặp logic — tạo helper function trong `src/utils/`

## UI Patterns — Room Pages

### Layout chuẩn cho Room Page (interview/session)

```jsx
// Page shell
<div className="min-h-screen flex flex-col bg-background">
  <nav className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
    {/* left: phase/stage progress */}
    {/* right: status indicators + exit button */}
  </nav>

  {/* Main area — gap + padding giống DSASessionPage */}
  <div className="flex flex-1 overflow-hidden gap-1.5 p-1.5 pt-1">
    <LeftPanel />   {/* w-52 ~ w-64, shrink-0 */}
    <MainArea />    {/* flex-1 */}
    <RightPanel />  {/* w-72 ~ w-80, shrink-0 */}
  </div>
</div>
```

### Panel card style

```jsx
// Tất cả panel trong room page dùng pattern này
<div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800/60 flex flex-col">
  {/* Tab bar (nếu có) */}
  <div className="flex items-center border-b border-slate-800 bg-slate-900 flex-shrink-0">
    {tabs.map(tab => (
      <button key={tab.key} className={[
        'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
        active === tab.key
          ? 'border-cta text-white'
          : 'border-transparent text-slate-500 hover:text-slate-300',
      ].join(' ')}>
        <tab.Icon className="w-3.5 h-3.5" />
        {tab.label}
      </button>
    ))}
  </div>

  {/* Content */}
  <div className="flex-1 overflow-hidden">
    {/* panel content */}
  </div>
</div>
```

### Màu sắc trong panel (slate palette — không dùng bg-card/border-border)

| Vai trò | Class |
|---------|-------|
| Panel background | `bg-slate-900` |
| Item / input background | `bg-slate-800` |
| Border default | `border-slate-700` |
| Border panel | `border-slate-800/60` |
| Text primary | `text-slate-200` hoặc `text-white` |
| Text secondary | `text-slate-400` |
| Text muted | `text-slate-500` |
| Divider | `border-slate-800` |

### Tab pattern (tái sử dụng cho mọi tabbed panel)

Khi cần tab switcher trong một panel, tách thành component riêng:

```jsx
// RightPanel.jsx — chứa tabs, render con có điều kiện
const TABS = [
  { key: 'ai', labelKey: 'feature.tab.ai', Icon: MessageSquare },
  { key: 'notes', labelKey: 'feature.tab.notes', Icon: FileText },
]

export default function RightPanel() {
  const [activeTab, setActiveTab] = useState('ai')
  const { t } = useTranslation()

  return (
    <div className="w-80 flex-shrink-0 flex flex-col rounded-xl overflow-hidden bg-slate-900 border border-slate-800/60">
      <div className="flex items-center border-b border-slate-800 flex-shrink-0">
        {TABS.map(({ key, labelKey, Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={['flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
              activeTab === key ? 'border-cta text-white' : 'border-transparent text-slate-500 hover:text-slate-300',
            ].join(' ')}>
            <Icon className="w-3.5 h-3.5" />{t(labelKey)}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'ai' ? <AiPanel /> : <NotesPanel />}
      </div>
    </div>
  )
}
```

Child panel (AiPanel, NotesPanel) chỉ render `<div className="flex flex-col h-full">` — **không** có wrapper `aside`/`section` với border riêng.

### Icons

- **Chỉ dùng `lucide-react`** — không dùng emoji (🎤 💬 🤖 ⚠️) làm icon UI
- Emoji chỉ dùng trong text content do user tạo ra, không trong UI chrome

## Checklist trước khi báo Done

- [ ] File < 500 dòng, component < 50 dòng
- [ ] Business logic nằm trong saga, không trong component
- [ ] Private function có prefix `_`
- [ ] Không có `Promise.all()` trần
- [ ] Mọi loop có điều kiện dừng
- [ ] Saga đã đăng ký trong `rootSaga.js`
- [ ] Tất cả string dùng `t()`, 3 file i18n đã cập nhật, `vi.json` dùng tiếng Việt có dấu
- [ ] Loading + error state hiển thị đúng
- [ ] Component điều khiển UI mới đã dùng lại component tùy biến/dùng chung phù hợp; không tự tạo thẻ HTML gốc hoặc component cục bộ trùng với component đã có
- [ ] Production create/edit workflow dùng form có cấu trúc, không dùng JSON/raw payload editor làm luồng chính
- [ ] Import không dùng đã xóa
- [ ] Room page dùng `slate-*` palette, không dùng `bg-card`/`border-border` trong panel
- [ ] Tabbed panel → tách `RightPanel.jsx` riêng, child chỉ `flex flex-col h-full`
- [ ] Không có emoji làm icon UI (dùng lucide-react)
- [ ] `npm run lint` pass
