# Frontend Convention (React + Redux-Saga)

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

- **File:** tối đa 300 dòng
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

## DRY

- Không duplicate UI — tạo reusable component nếu dùng ≥2 lần
- Không duplicate logic — tạo helper function trong `src/utils/`

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

- [ ] File < 300 dòng, component < 50 dòng
- [ ] Business logic nằm trong saga, không trong component
- [ ] Private function có prefix `_`
- [ ] Không có `Promise.all()` trần
- [ ] Mọi loop có điều kiện dừng
- [ ] Saga đã đăng ký trong `rootSaga.js`
- [ ] Tất cả string dùng `t()`, 3 file i18n đã cập nhật
- [ ] Loading + error state hiển thị đúng
- [ ] Import không dùng đã xóa
- [ ] Room page dùng `slate-*` palette, không dùng `bg-card`/`border-border` trong panel
- [ ] Tabbed panel → tách `RightPanel.jsx` riêng, child chỉ `flex flex-col h-full`
- [ ] Không có emoji làm icon UI (dùng lucide-react)
- [ ] `npm run lint` pass
