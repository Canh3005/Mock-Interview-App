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
- [ ] `npm run lint` pass
