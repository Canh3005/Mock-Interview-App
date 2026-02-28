# Hướng dẫn Localization (i18n)

Dự án đã được tích hợp hỗ trợ đa ngôn ngữ với 3 ngôn ngữ: **Tiếng Việt**, **Tiếng Anh**, và **Tiếng Nhật**.

## Cấu trúc thư mục

```
src/
├── i18n/
│   ├── config.js          # Cấu hình i18next
│   └── locales/
│       ├── en.json        # Translations cho tiếng Anh
│       ├── vi.json        # Translations cho tiếng Việt
│       └── ja.json        # Translations cho tiếng Nhật
└── components/
    └── shared/
        └── LanguageSwitcher.jsx  # Component chuyển đổi ngôn ngữ
```

## Cách sử dụng

### 1. Trong Components

Import hook `useTranslation` và sử dụng function `t()` để dịch text:

```jsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()
  
  return (
    <div>
      <h1>{t('hero.title.main')}</h1>
      <p>{t('hero.subtitle')}</p>
    </div>
  )
}
```

### 2. Language Switcher

Component `LanguageSwitcher` đã được tích hợp vào tất cả các navbar:
- Landing Page
- Dashboard
- Interview Room

Người dùng có thể chuyển đổi ngôn ngữ bằng cách click vào dropdown trong navbar.

### 3. Thêm translations mới

#### Thêm key mới:

1. Mở file translation tương ứng trong `src/i18n/locales/`
2. Thêm key và value mới theo cấu trúc JSON
3. Đảm bảo thêm key tương tự cho cả 3 ngôn ngữ

**Ví dụ:**

```json
// en.json
{
  "mySection": {
    "title": "My Section",
    "description": "This is my section"
  }
}

// vi.json
{
  "mySection": {
    "title": "Phần của tôi",
    "description": "Đây là phần của tôi"
  }
}

// ja.json
{
  "mySection": {
    "title": "私のセクション",
    "description": "これは私のセクションです"
  }
}
```

#### Sử dụng trong component:

```jsx
const { t } = useTranslation()

return (
  <div>
    <h2>{t('mySection.title')}</h2>
    <p>{t('mySection.description')}</p>
  </div>
)
```

### 4. Ngôn ngữ mặc định

Ngôn ngữ mặc định được cấu hình trong `src/i18n/config.js`:

```js
i18n.init({
  lng: 'vi', // Ngôn ngữ mặc định: Tiếng Việt
  fallbackLng: 'en', // Ngôn ngữ dự phòng: Tiếng Anh
  // ...
})
```

### 5. Thay đổi ngôn ngữ programmatically

```jsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { i18n } = useTranslation()
  
  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang) // 'en', 'vi', or 'ja'
  }
  
  return (
    <button onClick={() => changeLanguage('en')}>
      Switch to English
    </button>
  )
}
```

## Translation Keys hiện có

### Common
- `common.appName`
- `common.logoText`

### Navbar
- `navbar.features`
- `navbar.howItWorks`
- `navbar.getStarted`
- `navbar.home`
- `navbar.interviewRoom`
- `navbar.backToHome`
- `navbar.backToDashboard`

### Hero Section
- `hero.badge`
- `hero.title.*`
- `hero.subtitle`
- `hero.ctaPrimary`
- `hero.ctaSecondary`
- `hero.stats.*`

### Features
- `features.sectionBadge`
- `features.sectionTitle`
- `features.sectionSubtitle`
- `features.interview.*`
- `features.ide.*`
- `features.analytics.*`

### How It Works
- `howItWorks.sectionBadge`
- `howItWorks.sectionTitle`
- `howItWorks.sectionSubtitle`
- `howItWorks.stepLabel`
- `howItWorks.step1.*`
- `howItWorks.step2.*`
- `howItWorks.step3.*`

### CTA Banner
- `cta.title`
- `cta.subtitle`
- `cta.button`
- `cta.free`

### Dashboard
- `dashboard.*`

### Interview Room
- `interviewRoom.*`

## Testing

Server đã được khởi chạy trên: http://localhost:5174/

Để test localization:
1. Mở ứng dụng trong browser
2. Click vào Language Switcher trong navbar
3. Chọn một trong 3 ngôn ngữ
4. Kiểm tra xem tất cả text đã được dịch chính xác chưa

## Lưu ý

- Tất cả translation keys phải có ở cả 3 ngôn ngữ
- Nếu thiếu key, i18next sẽ fallback về ngôn ngữ dự phòng (English)
- Ngôn ngữ được lưu trong localStorage của browser
- Khi thêm component mới, nhớ thêm translations tương ứng
