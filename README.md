# Pull to Refresh Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/pull-to-refresh.svg)](https://www.npmjs.com/package/@aarongustafson/pull-to-refresh)
[![CI status](https://img.shields.io/github/actions/workflow/status/aarongustafson/pull-to-refresh/ci.yml?branch=main&label=CI)](https://github.com/aarongustafson/pull-to-refresh/actions/workflows/ci.yml)
[![Minified + gzipped size](https://img.shields.io/bundlejs/size/@aarongustafson/pull-to-refresh?format=minzip&label=min%2Bgzip)](https://bundlejs.com/?q=@aarongustafson/pull-to-refresh)
[![License](https://img.shields.io/npm/l/@aarongustafson/pull-to-refresh)](https://github.com/aarongustafson/pull-to-refresh/blob/main/LICENSE)
[![Type definitions](https://img.shields.io/npm/types/@aarongustafson/pull-to-refresh)](https://github.com/aarongustafson/pull-to-refresh/blob/main/pull-to-refresh.d.ts)

`<pull-to-refresh>` adds a downward pull gesture to scrollable content. At the
top of its scroll container, pulling past the threshold and releasing fires
`ptr:refresh`. Your application loads data, updates content, and reports the
result; the component doesn’t fetch data or reload the page.

Supply a native Refresh button for keyboard use and a useful no-JavaScript
alternative. The example below uses a form that reloads the document before
enhancement or if registration fails. The component doesn’t create a button.

## Demos

- [Live demo](https://aarongustafson.github.io/pull-to-refresh/demo/) ([source](./demo/index.html))
- [esm.sh: manual registration](https://aarongustafson.github.io/pull-to-refresh/demo/esm.html) ([source](./demo/esm.html))
- [unpkg: automatic registration](https://aarongustafson.github.io/pull-to-refresh/demo/unpkg.html) ([source](./demo/unpkg.html))

The live demo covers [a basic handler](https://aarongustafson.github.io/pull-to-refresh/demo/#basic),
[failure and retry](https://aarongustafson.github.io/pull-to-refresh/demo/#custom-text),
[selection](https://aarongustafson.github.io/pull-to-refresh/demo/#disable-selection),
and [translated examples](https://aarongustafson.github.io/pull-to-refresh/demo/#localization).

## Installation and registration

```sh
npm install @aarongustafson/pull-to-refresh
```

The main import exports the class without registering an element:

```javascript
import { PullToRefreshElement } from '@aarongustafson/pull-to-refresh';

customElements.define('pull-to-refresh', PullToRefreshElement);
```

You can register the class under another tag name; update your HTML to match.

For automatic registration in a browser, import the guarded helper instead:

```javascript
import '@aarongustafson/pull-to-refresh/define.js';
```

Importing `define.js` also calls `definePullToRefresh()`. The helper skips an
already registered tag and returns `true` when a registry is available, or
`false` otherwise. Calling it explicitly doesn’t defer that initial registration:

```javascript
import { definePullToRefresh } from '@aarongustafson/pull-to-refresh/define.js';

definePullToRefresh();
```

You can also load `define.js` with a module script:

```html
<script
  type="module"
  src="./node_modules/@aarongustafson/pull-to-refresh/define.js"
></script>
```

The class is also exported from
`@aarongustafson/pull-to-refresh/pull-to-refresh.js`. Bundled
[type declarations](./pull-to-refresh.d.ts) describe the public API.

## Basic usage

This complete example generates a number locally, so it doesn’t need an API.
Serve it over HTTP with the installed package at the path shown. Replace the
delayed update with your application’s work.

```html
<pull-to-refresh id="refresh-content">
  <h2>Latest number</h2>
  <p>Number: <span id="number">0</span></p>
  <p id="refresh-status" role="status">Ready</p>
  <form id="refresh-form">
    <button type="submit">Refresh</button>
  </form>
</pull-to-refresh>

<script type="module">
  import './node_modules/@aarongustafson/pull-to-refresh/define.js';

  const component = document.getElementById('refresh-content');
  const number = document.getElementById('number');
  const status = document.getElementById('refresh-status');
  const form = document.getElementById('refresh-form');
  let pending = false;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!pending) component.triggerRefresh();
  });

  component.addEventListener('ptr:refresh', async (event) => {
    if (pending) {
      event.detail.complete();
      return;
    }
    pending = true;
    status.textContent = 'Refreshing...';
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const nextNumber = Math.floor(Math.random() * 1000);
      number.textContent = nextNumber;
      status.textContent = 'Complete! Use Refresh or pull again.';
    } catch {
      status.textContent =
        'Refresh failed. Your previous number is unchanged. Use Refresh to try again.';
    } finally {
      pending = false;
      event.detail.complete();
    }
  });
</script>
```

The handler leaves the previous number visible while loading and on failure.
The button stays available and focus stays where the user left it. Translate
the button and application status messages alongside your content.

For a network update, check `response.ok`, validate the response, and prepare
the new content before replacing the existing data. Use `textContent` for
untrusted text. Report failures visibly and provide a retry action.

## Behavior and completion

- The host defaults to `height: 100vh`, with an internal vertical scroll
  container. Set the host’s height to fit your layout.
- A downward movement greater than 5 pixels confirms a pull. Release must
  exceed `threshold` to trigger refresh; matching it exactly isn’t enough.
- `disabled` removes gesture listeners and resets the indicator. It doesn’t
  disable your button or prevent a direct `triggerRefresh()` call.
- `disable-selection` suppresses selection on slotted content during a
  confirmed pull. Release removes the `pulling` attribute and restores
  selection styling. Removing `disable-selection` also removes `pulling`.
- Without upgrade, authored content and forms remain ordinary HTML.
- On disconnect, the component removes its gesture/scroll listeners and
  clears its completion and announcement timers. It doesn’t cancel your
  application’s work or reset all interaction state. Cancel or guard your own
  pending updates when removing the component.

Call `event.detail.complete()` in `finally` for both success and failure.
`completeRefresh()` is the equivalent method. Both end the interaction and
fire `ptr:refresh-complete`; neither means the data update succeeded.

The component schedules automatic completion **two seconds after dispatching
`ptr:refresh`**, even when a listener is still working. That timer does not wait
for a promise returned by your handler. `triggerRefresh()`’s returned promise
also doesn’t await your work. Keep application loading and outcome messages
separate from `ptr:refresh-complete`, and guard overlapping work. A later
explicit completion fires another completion event. Calling completion again
isn’t a success signal.

## Attributes and properties

Properties reflect their corresponding attributes. Pre-upgrade property
assignments are preserved.

| Attribute           | Property           | Default           | Behavior                                                                                                                                                                |
| ------------------- | ------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `threshold`         | `threshold`        | `80`              | Pull distance in pixels. Invalid or negative values remove the attribute and restore the default. Attribute reads use integer parsing; the setter rounds valid numbers. |
| `indicator-text`    | `indicatorText`    | Localized         | Message while pulling. A nonempty override takes precedence over translations.                                                                                          |
| `release-text`      | `releaseText`      | Localized         | Message beyond the threshold.                                                                                                                                           |
| `refreshing-text`   | `refreshingText`   | Localized         | Message while the interaction is refreshing.                                                                                                                            |
| `lang`              | `lang`             | Inherited or `en` | Language used to select indicator messages.                                                                                                                             |
| `disabled`          | `disabled`         | `false`           | Boolean attribute; presence disables gesture listeners.                                                                                                                 |
| `disable-selection` | `disableSelection` | `false`           | Boolean attribute; presence suppresses selection during a confirmed pull.                                                                                               |

Set text properties to `null` or `undefined` to remove an override. Empty text
attributes also fall back to the translation. Set `threshold` to `null`,
`undefined`, or `''` to restore its default.
See [Localization](#localization-i18n) for message precedence and language selection.

## Methods and events

| Method                                                    | Behavior                                                                                                                                                    |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `triggerRefresh()`                                        | Starts a refresh and dispatches `ptr:refresh`, unless `isRefreshing` is already true. Works independently of `disabled`; doesn’t wait for application work. |
| `completeRefresh()`                                       | Ends the interaction, resets the indicator, clears the completion timer, and dispatches `ptr:refresh-complete`.                                             |
| `PullToRefreshElement.registerTranslations(translations)` | Adds or replaces language entries for indicator messages.                                                                                                   |

`isRefreshing` reports component interaction state, not application loading or
success. Don’t use it as your only guard for work lasting longer than two seconds.

All these events bubble and cross shadow boundaries:

| Event                  | Detail                   | When it fires                                          |
| ---------------------- | ------------------------ | ------------------------------------------------------ |
| `ptr:pull-start`       | No detail payload        | Downward movement confirms a pull.                     |
| `ptr:pull-move`        | `{ distance: number }`   | A confirmed downward pull moves.                       |
| `ptr:pull-end`         | No detail payload        | An active pull ends, even below the threshold.         |
| `ptr:refresh`          | `{ complete: Function }` | A gesture or `triggerRefresh()` starts a refresh.      |
| `ptr:refresh-complete` | No detail payload        | Explicit or automatic completion ends the interaction. |

## Localization (i18n)

Use text attributes to match your application’s vocabulary before adding
translations:

```html
<pull-to-refresh
  indicator-text="↓ Pull to check for updates"
  release-text="↻ Release to check"
  refreshing-text="⏳ Checking for updates..."
>
  <!-- Your content and native Refresh form -->
</pull-to-refresh>
```

Language selection uses the element’s nonempty `lang`, its nearest `[lang]`
ancestor, the document language, and then `en`. The component resolves inherited
language when it connects; changing an ancestor’s language alone doesn’t update
an already connected indicator. Changing the element’s `lang` does.
Regional codes such as `es-MX` use their base language. Unknown codes fall back
to English. See [translations.json](./translations.json) for the built-in
messages and supported codes.

Register shared vocabulary or translations before the elements connect:

```javascript
import { PullToRefreshElement } from '@aarongustafson/pull-to-refresh';

PullToRefreshElement.registerTranslations({
  en: {
    indicator: '↓ Pull to check for updates',
    release: '↻ Release to check',
    refreshing: '⏳ Checking for updates...',
  },
});

customElements.define('pull-to-refresh', PullToRefreshElement);
```

Registration replaces whole language entries, so supply all three keys:
`indicator`, `release`, and `refreshing`. Register base codes such as `pt`, not
`pt-BR`, because lookup uses the base code. Per-instance text attributes take
precedence. Registration alone doesn’t redraw connected indicators.

Only the indicator messages are translated by the component. Authors translate
content, buttons, loading messages, errors, and retry instructions. The
[Spanish, French, and Japanese demos](./demo/index.html#localization) inherit
their language from each embedded document’s `<html lang>`.

## Styling

| Custom property             | Default      | Purpose                                                                        |
| --------------------------- | ------------ | ------------------------------------------------------------------------------ |
| `--ptr-indicator-height`    | `3.125rem`   | Indicator area height. Gesture positioning still uses a fixed 50-pixel height. |
| `--ptr-indicator-bg`        | `ButtonFace` | Indicator background.                                                          |
| `--ptr-indicator-color`     | `ButtonText` | Indicator foreground.                                                          |
| `--ptr-indicator-font-size` | `0.875rem`   | Indicator text size.                                                           |
| `--ptr-transition-duration` | `0.2s`       | Indicator transition duration.                                                 |

Set foreground and background together:

```css
pull-to-refresh {
  --ptr-indicator-bg: #102030;
  --ptr-indicator-color: #ffffff;
}

@media (prefers-reduced-motion: reduce) {
  pull-to-refresh {
    --ptr-transition-duration: 0s;
  }
}
```

Test the pair in light, dark, and user-selected palettes. Automatic forced-color
adjustment remains enabled. Messages distinguish pulling, release, and loading
without relying on color alone.

The default slot holds your content. The optional `indicator` slot replaces the
default message with authored markup and styles; your application must update
that custom indicator’s state text. There are no exposed CSS parts.

## Accessibility and compatibility

The indicator uses `role="status"` with assertive live announcements; the
component temporarily turns announcements off while resetting it. Supply a
separate visible application status, preserve existing data on failure, and
keep a native Refresh action. The gesture alone isn’t a keyboard alternative.
Test focus, announcements, touch scrolling, and browser pull-to-refresh behavior
on the devices and assistive technologies your application supports.

The runtime uses Custom Elements, Shadow DOM, modules with JSON import
attributes, and Pointer Events. If registration cannot load, the authored
content and native form remain available. Browser emulation and the recorded
palette checks aren’t proof of native high-contrast repainting or screen-reader
behavior. The browser suite tracks a known Ubuntu WebKit dark
`ButtonText`/`ButtonFace` contrast limitation as an expected failure.

## Development and testing

```sh
npm install
npm run lint
npm run format
npm run test:run
npm run test:browser
```

`npm test` runs watch mode; `npm run test:ui` opens the Vitest UI, and
`npm run test:coverage` collects coverage. See [CONTRIBUTING.md](./CONTRIBUTING.md)
for contributor guidance and [the demo guide](./demo/README.md) for ownership.

## License

MIT — see [LICENSE](./LICENSE).
