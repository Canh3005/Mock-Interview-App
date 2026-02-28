---
name: fe-i18n
description: Frontend Internationalization (i18n) Rules. Ensures all UI text is translated into English, Vietnamese, and Japanese.
---
# Frontend Internationalization (i18n)

Guidelines for adding translations when developing new features in the Frontend. 

## Rules

### 1. No Hardcoded Strings
Never use hardcoded strings directly in React components for visible UI text. 
- **Incorrect:** `<h1>Welcome to our app</h1>`
- **Correct:** `<h1>{t('common.welcome')}</h1>`

### 2. Mandatory Translation Keys
Every time a new text/label is added, you MUST create corresponding keys in all three supported language files:
- `src/i18n/locales/en.json` (English)
- `src/i18n/locales/vi.json` (Vietnamese)
- `src/i18n/locales/ja.json` (Japanese)

### 3. Key Naming Convention
Use nested keys to organize translations by feature or page.
- Format: `[page_or_feature].[section].[field_or_label]`
- Example: `auth.login.submit_button`, `dashboard.sidebar.profile_settings`

### 4. Translation Process
When implementing a feature:
1. Identify all UI strings.
2. Define keys for these strings.
3. Update all three `.json` files in `src/i18n/locales/`.
4. If you don't know the exact translation for a language (e.g., Japanese), provide a best-effort translation and mark it for review or ask the user.

### 5. Hook Usage
Use the `useTranslation` hook from `react-i18next` (or the project's equivalent) to access the `t` function.

```javascript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  return <button>{t('auth.login.submit')}</button>;
};
```

## Pre-Delivery Checklist
- [ ] No hardcoded strings in components
- [ ] New keys added to `en.json`
- [ ] New keys added to `vi.json`
- [ ] New keys added to `ja.json`
- [ ] Keys follow the naming convention
