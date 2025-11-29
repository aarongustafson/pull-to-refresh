# &lt;pull-to-refresh&gt;

A lightweight, customizable Web Component that adds pull-to-refresh functionality to your web applications. Perfect for mobile-first experiences and progressive web apps.

## ✨ Features

- **Touch-optimized**: Smooth pull gesture with momentum and feedback
- **Customizable**: Adjust threshold, text, and styling via attributes and CSS custom properties
- **Event-driven**: Rich event API for complete control over the refresh lifecycle
- **Accessible**: Semantic HTML and ARIA-friendly
- **Framework-agnostic**: Works with any framework or vanilla JavaScript
- **Lightweight**: No dependencies, just native Web Components
- **Shadow DOM**: Encapsulated styles that won't leak

## 🚀 Quick Start

### Installation

```bash
npm install @aarongustafson/pull-to-refresh
```

### Usage

**Option 1: Auto-define (easiest)**
```javascript
import '@aarongustafson/pull-to-refresh';
```

**Option 2: Manual registration**
```javascript
import { PullToRefreshElement } from '@aarongustafson/pull-to-refresh/pull-to-refresh.js';
customElements.define('pull-to-refresh', PullToRefreshElement);
```

**Option 3: Both (class + auto-define)**
```javascript
import { PullToRefreshElement } from '@aarongustafson/pull-to-refresh';
// Element is registered AND class is available
```

### Basic Example

```html
<pull-to-refresh>
  <div class="content">
    <h1>My Content</h1>
    <p>Pull down from the top to refresh!</p>
  </div>
</pull-to-refresh>

<script type="module">
  import '@aarongustafson/pull-to-refresh';

  const ptr = document.querySelector('pull-to-refresh');

  ptr.addEventListener('ptr:refresh', (e) => {
    // Perform your refresh logic (fetch data, etc.)
    fetch('/api/data')
      .then(response => response.json())
      .then(data => {
        // Update your content
        updateContent(data);
        // Signal completion
        e.detail.complete();
      });
  });
</script>
```

## 📖 API

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `threshold` | number | `80` | Distance in pixels to trigger refresh |
| `indicator-text` | string | localized | Text shown when pulling down |
| `release-text` | string | localized | Text shown when ready to release |
| `refreshing-text` | string | localized | Text shown while refreshing |
| `lang` | string | auto-detected | Language code for localization |
| `disabled` | boolean | `false` | Disables pull-to-refresh functionality |
| `disable-selection` | boolean | `false` | Prevents text selection during pull gesture |

**Note:** The text attributes use automatic localization based on the `lang` attribute or auto-detection. See [Localization](#-localization-i18n) below.

### Properties

All attributes are also available as properties:

```javascript
const ptr = document.querySelector('pull-to-refresh');
ptr.threshold = 120;
ptr.indicatorText = 'Swipe down';
ptr.disabled = true;
```

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `ptr:pull-start` | `{}` | Fired when pull gesture starts |
| `ptr:pull-move` | `{ distance: number }` | Fired during pull gesture |
| `ptr:pull-end` | `{}` | Fired when pull gesture ends |
| `ptr:refresh` | `{ complete: Function }` | Fired when refresh is triggered |
| `ptr:refresh-complete` | `{}` | Fired when refresh completes |

**Important**: Call `event.detail.complete()` in your `ptr:refresh` handler to signal completion:

```javascript
ptr.addEventListener('ptr:refresh', (e) => {
  doAsyncWork().then(() => {
    e.detail.complete(); // Call this when done
  });
});
```

If you don't call `complete()`, the component will auto-complete after 2 seconds.

### Slots

| Slot | Description |
|------|-------------|
| (default) | Your scrollable content |
| `indicator` | Optional custom indicator element |

### CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--ptr-indicator-height` | `3.125rem` | Height of the indicator area |
| `--ptr-indicator-bg` | `ButtonFace` | Background color of indicator |
| `--ptr-indicator-color` | `ButtonText` | Text color of indicator |
| `--ptr-indicator-font-size` | `0.875rem` | Font size of indicator text |
| `--ptr-transition-duration` | `0.2s` | Duration of indicator transitions |

### Methods

| Method | Description |
|--------|-------------|
| `completeRefresh()` | Manually complete the refresh (alternative to calling `event.detail.complete()`) |

## 🎨 Examples

### Custom Threshold

```html
<pull-to-refresh threshold="120">
  <div>Content here</div>
</pull-to-refresh>
```

### Localization

The component automatically detects the language and displays localized text:

```html
<!-- Spanish -->
<pull-to-refresh lang="es">
  <div>Contenido aquí</div>
</pull-to-refresh>

<!-- French -->
<pull-to-refresh lang="fr">
  <div>Contenu ici</div>
</pull-to-refresh>

<!-- Japanese -->
<pull-to-refresh lang="ja">
  <div>ここにコンテンツ</div>
</pull-to-refresh>
```

The component supports 16 languages with automatic fallback to English. Language is detected from:
1. The element's `lang` attribute
2. The nearest ancestor's `lang` attribute
3. The document's `lang` attribute
4. Default: English

You can also register custom translations:

```javascript
import { PullToRefreshElement } from '@aarongustafson/pull-to-refresh';

PullToRefreshElement.registerTranslations({
  'pt-BR': {
    indicator: '↓ Puxe para atualizar',
    release: '↻ Solte para atualizar',
    refreshing: '⏳ Atualizando...'
  }
});
```

### Custom Styling

```html
<style>
  pull-to-refresh {
    --ptr-indicator-bg: #f0f0f0;
    --ptr-indicator-color: #1976d2;
    --ptr-indicator-font-size: 1rem;
    --ptr-indicator-height: 3.75rem;
  }
</style>

<pull-to-refresh>
  <div>Content here</div>
</pull-to-refresh>
```

### Custom Messages

```html
<pull-to-refresh
  indicator-text="⬇ Swipe down"
  release-text="🔄 Let go!"
  refreshing-text="⏳ Loading...">
  <div>Content here</div>
</pull-to-refresh>
```

### With Fetch API

```javascript
ptr.addEventListener('ptr:refresh', async (e) => {
  try {
    const response = await fetch('/api/latest');
    const data = await response.json();
    renderData(data);
  } catch (error) {
    console.error('Refresh failed:', error);
  } finally {
    e.detail.complete();
  }
});
```

### Disabled State

```html
<!-- Disable pull-to-refresh when needed -->
<pull-to-refresh disabled>
  <div>No refresh available</div>
</pull-to-refresh>

<script>
  // Or toggle programmatically
  ptr.disabled = true;
</script>
```

### Tracking Pull Distance

```javascript
ptr.addEventListener('ptr:pull-move', (e) => {
  console.log('Pull distance:', e.detail.distance);
  // Use this for custom animations, etc.
});
```

## 🌍 Localization (i18n)

The component includes built-in translations for **16 languages**:

| Language | Code | Indicator Text |
|----------|------|----------------|
| English | `en` | ↓ Pull to refresh |
| Chinese (Mandarin) | `zh` | ↓ 下拉刷新 |
| Hindi | `hi` | ↓ रीफ्रेश करने के लिए खींचें |
| Spanish | `es` | ↓ Desliza para actualizar |
| French | `fr` | ↓ Tirez pour actualiser |
| Arabic | `ar` | ↓ اسحب للتحديث |
| Bengali | `bn` | ↓ রিফ্রেশ করতে টানুন |
| Portuguese | `pt` | ↓ Puxe para atualizar |
| Russian | `ru` | ↓ Потяните для обновления |
| Japanese | `ja` | ↓ 引っ張って更新 |
| German | `de` | ↓ Zum Aktualisieren ziehen |
| Punjabi | `pa` | ↓ ਤਾਜ਼ਾ ਕਰਨ ਲਈ ਖਿੱਚੋ |
| Javanese | `jv` | ↓ Tarik kanggo nyegerake |
| Korean | `ko` | ↓ 당겨서 새로고침 |
| Vietnamese | `vi` | ↓ Kéo để làm mới |
| Italian | `it` | ↓ Trascina per aggiornare |

### Language Detection

The component uses a cascading fallback approach:

```javascript
// Priority order:
1. Element's lang attribute: <pull-to-refresh lang="es">
2. Nearest ancestor with lang: <div lang="fr"><pull-to-refresh>
3. Document language: <html lang="de">
4. Default: English (en)
```

Regional variants (e.g., `en-US`, `es-MX`, `fr-CA`) automatically fall back to their base language.

### Custom Translations

Register custom translations or override existing ones:

```javascript
import { PullToRefreshElement } from '@aarongustafson/pull-to-refresh';

// Add a new language
PullToRefreshElement.registerTranslations({
  'nl': {
    indicator: '↓ Trek om te vernieuwen',
    release: '↻ Loslaten om te vernieuwen',
    refreshing: '⏳ Vernieuwen...'
  }
});

// Override existing translations
PullToRefreshElement.registerTranslations({
  'en': {
    indicator: '⬇ Pull down',
    release: '🔄 Let go',
    refreshing: '⏳ Loading...'
  }
});
```

### Per-Instance Overrides

You can always override translations for individual instances:

```html
<pull-to-refresh
  lang="es"
  indicator-text="Custom Spanish text"
  release-text="Custom release text">
  <!-- Content -->
</pull-to-refresh>
```

## 🧪 Testing

```bash
npm test               # Run tests in watch mode
npm run test:run       # Run tests once
npm run test:ui        # Open Vitest UI
npm run test:coverage  # Generate coverage report
```

## 🛠️ Development

```bash
npm install            # Install dependencies
npm run setup          # Run setup wizard (first time)
npm run lint           # Lint code
npm run format         # Format code
```

## 🌐 Browser Support

Works in all modern browsers supporting:
- Custom Elements v1
- Shadow DOM v1
- ES Modules
- Pointer Events

For legacy browsers, use appropriate polyfills.

## 📦 Package Exports

```javascript
// Auto-define
import '@aarongustafson/pull-to-refresh';

// Class only
import { PullToRefreshElement } from '@aarongustafson/pull-to-refresh/pull-to-refresh.js';

// Both
import { PullToRefreshElement } from '@aarongustafson/pull-to-refresh';

// Manual define script
import '@aarongustafson/pull-to-refresh/define.js';
```

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT - See [LICENSE](LICENSE)

## 🙏 Credits

Created by [Aaron Gustafson](https://github.com/aarongustafson)

---

**Try it out!** Check out the [live demo](demo/index.html) 🚀
