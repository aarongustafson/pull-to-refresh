import defaultTranslations from './translations.json' with { type: 'json' };

/**
 * PullToRefreshElement - Web component that enables pull-to-refresh functionality
 *
 * @element pull-to-refresh
 *
 * @attr {number} threshold - Distance in pixels to trigger refresh (default: 80)
 * @attr {string} indicator-text - Text shown when pulling down (default: localized "↓ Pull to refresh")
 * @attr {string} release-text - Text shown when ready to release (default: localized "↻ Release to refresh")
 * @attr {string} refreshing-text - Text shown while refreshing (default: localized "⏳ Refreshing...")
 * @attr {string} lang - Language code for localization (falls back to closest [lang], document lang, or 'en')
 * @attr {boolean} disabled - Disables the pull-to-refresh functionality
 * @attr {boolean} disable-selection - Disables text selection during pull gesture
 *
 * @fires ptr:pull-start - Fired when pull gesture starts
 * @fires ptr:pull-move - Fired during pull gesture, contains { distance } in detail
 * @fires ptr:pull-end - Fired when pull gesture ends
 * @fires ptr:refresh - Fired when refresh is triggered
 * @fires ptr:refresh-complete - Fired when refresh completes
 *
 * @slot - Default slot for content
 * @slot indicator - Optional custom indicator element
 *
 * @cssprop --ptr-indicator-height - Height of the indicator area (default: 3.125rem)
 * @cssprop --ptr-indicator-bg - Background color of the indicator (default: ButtonFace)
 * @cssprop --ptr-indicator-color - Text color of the indicator (default: ButtonText)
 * @cssprop --ptr-indicator-font-size - Font size of the indicator text (default: 0.875rem)
 * @cssprop --ptr-transition-duration - Duration of indicator transitions (default: 0.2s)
 */
export class PullToRefreshElement extends HTMLElement {
	static customTranslations = {};

	static registerTranslations(translations) {
		this.customTranslations = {
			...this.customTranslations,
			...translations,
		};
	}

	static get observedAttributes() {
		return [
			'threshold',
			'indicator-text',
			'release-text',
			'refreshing-text',
			'lang',
			'disabled',
			'disable-selection',
		];
	}

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });

		// State management
		this.startY = 0;
		this.currentY = 0;
		this.isPulling = false;
		this.isPullingConfirmed = false;
		this.isRefreshing = false;
		this.__listenersAttached = false;
		this.__refreshTimeoutId = null;
		this.__ariaLiveResetTimeoutId = null;

		// Cached DOM references (set after render)
		this._container = null;
		this._indicator = null;
		this._indicatorTextEl = null;

		// Language detection
		this.__lang = 'en';

		this.__pointerDownOptions = { passive: true };
		this.__pointerMoveOptions = { passive: false };
		this.__pointerUpOptions = { passive: true };
		this.__pointerCancelOptions = { passive: true };
		this.__scrollOptions = { passive: true };

		// Bind event handlers
		this.handleStart = this.handleStart.bind(this);
		this.handleMove = this.handleMove.bind(this);
		this.handleEnd = this.handleEnd.bind(this);
		this.handleScroll = this.handleScroll.bind(this);
	}

	connectedCallback() {
		this.__upgradeProperty('threshold');
		this.__upgradeProperty('indicatorText');
		this.__upgradeProperty('releaseText');
		this.__upgradeProperty('refreshingText');
		this.__upgradeProperty('disabled');
		this.__upgradeProperty('disableSelection');
		this.__upgradeProperty('lang');
		this.__lang = this.__resolveLang();

		this.render();
		this.setupEventListeners();
	}

	disconnectedCallback() {
		this.removeEventListeners();
		this.__clearRefreshTimeout();
		this.__clearAriaLiveResetTimeout();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue) {
			return;
		}

		switch (name) {
			case 'lang':
				this.__lang = this.__resolveLang();
				this.updateIndicatorText({ force: true });
				break;
			case 'indicator-text':
			case 'release-text':
			case 'refreshing-text':
				this.updateIndicatorText({ force: true });
				break;
			case 'threshold': {
				if (newValue !== null) {
					const numericValue = Number(newValue);
					if (!Number.isFinite(numericValue) || numericValue < 0) {
						this.removeAttribute('threshold');
						break;
					}
				}
				this.updateIndicatorText({ force: true });
				break;
			}
			case 'disabled':
				if (this.disabled) {
					this.removeEventListeners();
					this.resetIndicator();
				} else {
					this.setupEventListeners();
					this.updateIndicatorText({ force: true });
				}
				break;
			case 'disable-selection':
				if (!this.disableSelection) {
					this.removeAttribute('pulling');
				}
				break;
			default:
				break;
		}
	}

	__getTranslations() {
		// Merge default and custom translations (custom takes precedence)
		const allTranslations = {
			...defaultTranslations,
			...PullToRefreshElement.customTranslations,
		};

		// Get base language code (e.g., 'en-US' -> 'en')
		const langCode = this.__lang.split('-')[0];
		return allTranslations[langCode] || allTranslations.en;
	}

	setupEventListeners() {
		if (this.disabled || this.__listenersAttached) {
			return;
		}

		this.addEventListener('pointerdown', this.handleStart, this.__pointerDownOptions);
		this.addEventListener('pointermove', this.handleMove, this.__pointerMoveOptions);
		this.addEventListener('pointerup', this.handleEnd, this.__pointerUpOptions);
		this.addEventListener('pointercancel', this.handleEnd, this.__pointerCancelOptions);

		if (!this._container) {
			this._container = this.shadowRoot.querySelector('.ptr-container');
		}
		if (this._container) {
			this._container.addEventListener(
				'scroll',
				this.handleScroll,
				this.__scrollOptions,
			);
		}

		this.__listenersAttached = true;
	}

	removeEventListeners() {
		if (!this.__listenersAttached) {
			return;
		}

		this.removeEventListener('pointerdown', this.handleStart, this.__pointerDownOptions);
		this.removeEventListener('pointermove', this.handleMove, this.__pointerMoveOptions);
		this.removeEventListener('pointerup', this.handleEnd, this.__pointerUpOptions);
		this.removeEventListener('pointercancel', this.handleEnd, this.__pointerCancelOptions);

		if (this._container) {
			this._container.removeEventListener(
				'scroll',
				this.handleScroll,
				this.__scrollOptions,
			);
		}

		this.__listenersAttached = false;
	}

	handleStart(e) {
		if (!this._container) {
			this._container = this.shadowRoot.querySelector('.ptr-container');
		}
		if (
			this._container &&
			this._container.scrollTop === 0 &&
			!this.isRefreshing &&
			!this.disabled
		) {
			this.isPulling = true;
			this.isPullingConfirmed = false;
			this.startY = e.clientY;
		}
	}

	handleMove(e) {
		if (!this.isPulling) return;

		const deltaY = e.clientY - this.startY;

		// If direction not yet confirmed, check if user is pulling down
		if (!this.isPullingConfirmed) {
			// Need some movement to determine direction (at least 5px)
			if (Math.abs(deltaY) > 5) {
				if (deltaY < 0) {
					// Upward pull - cancel the gesture
					this.isPulling = false;
					return;
				} else {
					// Downward pull - confirm and proceed
					this.isPullingConfirmed = true;

					// Prevent text selection during pull if disable-selection is set
					if (this.disableSelection) {
						this.setAttribute('pulling', '');
					}

					this.dispatchEvent(
						new CustomEvent('ptr:pull-start', {
							bubbles: true,
							composed: true,
						}),
					);
				}
			} else {
				// Not enough movement yet
				return;
			}
		}

		this.currentY = deltaY;

		if (this.currentY > 0) {
			if (e.cancelable) {
				e.preventDefault(); // Prevent scroll bounce
			}

			const indicatorHeight = this.indicatorHeight;
			const translateY = Math.min(
				this.currentY - indicatorHeight,
				indicatorHeight,
			);

			if (this._indicator) {
				this._indicator.style.transform = `translateY(${translateY}px)`;
				if (this.currentY > this.threshold) {
					this._indicator.classList.add('active');
				} else {
					this._indicator.classList.remove('active');
				}
			}
			this.__updateIndicatorTextForState();

			this.dispatchEvent(
				new CustomEvent('ptr:pull-move', {
					bubbles: true,
					composed: true,
					detail: { distance: this.currentY },
				}),
			);
		}
	}

	handleEnd() {
		if (!this.isPulling) return;

		this.isPulling = false;

		// Re-enable text selection if it was disabled
		this.removeAttribute('pulling');

		this.dispatchEvent(
			new CustomEvent('ptr:pull-end', {
				bubbles: true,
				composed: true,
			}),
		);

		// Only trigger refresh if pulled down (positive currentY) past threshold
		if (this.currentY > 0 && this.currentY > this.threshold) {
			this.triggerRefresh();
		} else {
			this.resetIndicator();
		}

		// Reset currentY after handling the gesture
		this.currentY = 0;
	}

	handleScroll() {
		if (this._container.scrollTop > 0 && !this.isRefreshing) {
			this.resetIndicator();
		}
	}

	async triggerRefresh() {
		if (this.isRefreshing) {
			return;
		}
		this.isRefreshing = true;
		this.__updateIndicatorTextForState();
		if (this._indicator) {
			this._indicator.classList.add('active');
		}

		const refreshEvent = new CustomEvent('ptr:refresh', {
			bubbles: true,
			composed: true,
			detail: {
				complete: () => this.completeRefresh(),
			},
		});

		this.dispatchEvent(refreshEvent);

		// If no listener calls complete(), auto-complete after a delay
		this.__refreshTimeoutId = setTimeout(() => {
			if (this.isRefreshing) {
				this.completeRefresh();
			}
		}, 2000);
	}

	completeRefresh() {
		this.isRefreshing = false;
		this.resetIndicator();
		this.__clearRefreshTimeout();

		this.dispatchEvent(
			new CustomEvent('ptr:refresh-complete', {
				bubbles: true,
				composed: true,
			}),
		);
	}

	resetIndicator() {
		if (!this._indicator) return;

		// Temporarily disable announcements during reset
		this._indicator.setAttribute('aria-live', 'off');

		this._indicator.style.transform = `translateY(${-this.indicatorHeight}px)`;
		this._indicator.classList.remove('active');
		this.__updateIndicatorTextForState();

		// Re-enable announcements after text is updated
		// Use setTimeout to ensure the text change happens first
		this.__clearAriaLiveResetTimeout();
		this.__ariaLiveResetTimeoutId = setTimeout(() => {
			if (this._indicator) {
				this._indicator.setAttribute('aria-live', 'assertive');
			}
			this.__ariaLiveResetTimeoutId = null;
		}, 0);
	}

	updateIndicatorText({ force = false } = {}) {
		if (this.isPulling && !force && !this.isRefreshing) {
			return;
		}

		this.__updateIndicatorTextForState();
	}

	get threshold() {
		const attrValue = this.getAttribute('threshold');
		const parsed = parseInt(attrValue ?? '', 10);
		return Number.isFinite(parsed) ? parsed : 80;
	}

	set threshold(value) {
		if (value === null || value === undefined || value === '') {
			this.removeAttribute('threshold');
			return;
		}
		const numericValue = Number(value);
		if (!Number.isFinite(numericValue) || numericValue < 0) {
			this.removeAttribute('threshold');
			return;
		}
		this.setAttribute('threshold', String(Math.round(numericValue)));
	}

	get indicatorText() {
		const t = this.__getTranslations();
		return this.getAttribute('indicator-text') || t.indicator;
	}

	set indicatorText(value) {
		if (value === null || value === undefined) {
			this.removeAttribute('indicator-text');
			return;
		}
		this.setAttribute('indicator-text', value);
	}

	get releaseText() {
		const t = this.__getTranslations();
		return this.getAttribute('release-text') || t.release;
	}

	set releaseText(value) {
		if (value === null || value === undefined) {
			this.removeAttribute('release-text');
			return;
		}
		this.setAttribute('release-text', value);
	}

	get refreshingText() {
		const t = this.__getTranslations();
		return this.getAttribute('refreshing-text') || t.refreshing;
	}

	set refreshingText(value) {
		if (value === null || value === undefined) {
			this.removeAttribute('refreshing-text');
			return;
		}
		this.setAttribute('refreshing-text', value);
	}

	get disabled() {
		return this.hasAttribute('disabled');
	}

	set disabled(value) {
		if (value) {
			this.setAttribute('disabled', '');
		} else {
			this.removeAttribute('disabled');
		}
	}

	get disableSelection() {
		return this.hasAttribute('disable-selection');
	}

	set disableSelection(value) {
		if (value) {
			this.setAttribute('disable-selection', '');
		} else {
			this.removeAttribute('disable-selection');
		}
	}

	// eslint-disable-next-line class-methods-use-this
	get indicatorHeight() {
		return 50; // 3.125rem in pixels (assuming 16px base)
	}

	static styles = `
		:host {
			display: block;
			position: relative;
			height: 100vh;
			overflow: hidden;
		}

		:host([pulling][disable-selection]) ::slotted(*) {
			user-select: none;
			-webkit-user-select: none;
		}

		.ptr-container {
			height: 100%;
			overflow-y: auto;
			-webkit-overflow-scrolling: touch;
			position: relative;
		}

		.ptr-indicator {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			height: var(--ptr-indicator-height, 3.125rem);
			display: flex;
			align-items: center;
			justify-content: center;
			background: var(--ptr-indicator-bg, ButtonFace);
			color: var(--ptr-indicator-color, ButtonText);
			font-size: var(--ptr-indicator-font-size, 0.875rem);
			transform: translateY(-3.125rem);
			transition: transform var(--ptr-transition-duration, 0.2s) ease;
			z-index: 1000;
			user-select: none;
			-webkit-user-select: none;
		}

		.ptr-indicator.active {
			/* Active state can be styled via CSS parts or custom properties */
		}

		.ptr-content {
			position: relative;
		}

		:host([disabled]) .ptr-container {
			touch-action: auto;
		}
	`;

	render() {
		this.shadowRoot.innerHTML = `
			<style>${PullToRefreshElement.styles}</style>
			<div class="ptr-container">
				<div class="ptr-indicator" role="status" aria-live="assertive">
					<slot name="indicator">
						<span class="ptr-indicator-text">${this.indicatorText}</span>
					</slot>
				</div>
				<div class="ptr-content">
					<slot></slot>
				</div>
			</div>
		`;

		// Cache DOM references for efficiency
		this._container = this.shadowRoot.querySelector('.ptr-container');
		this._indicator = this.shadowRoot.querySelector('.ptr-indicator');
		this._indicatorTextEl = this.shadowRoot.querySelector(
			'.ptr-indicator-text',
		);
		this.__updateIndicatorTextForState();
	}

	__resolveLang() {
		return (
			this.getAttribute('lang') ||
			this.closest('[lang]')?.getAttribute('lang') ||
			document.documentElement.lang ||
			'en'
		);
	}

	__setIndicatorText(text) {
		if (!this._indicatorTextEl) {
			return;
		}
		this._indicatorTextEl.textContent = text;
	}

	__updateIndicatorTextForState() {
		if (!this._indicatorTextEl) {
			return;
		}

		if (this.isRefreshing) {
			this.__setIndicatorText(this.refreshingText);
			return;
		}

		if (this.isPulling) {
			if (this.currentY > this.threshold) {
				this.__setIndicatorText(this.releaseText);
			} else {
				this.__setIndicatorText(this.indicatorText);
			}
			return;
		}

		this.__setIndicatorText(this.indicatorText);
	}

	__clearRefreshTimeout() {
		if (this.__refreshTimeoutId !== null) {
			clearTimeout(this.__refreshTimeoutId);
			this.__refreshTimeoutId = null;
		}
	}

	__clearAriaLiveResetTimeout() {
		if (this.__ariaLiveResetTimeoutId !== null) {
			clearTimeout(this.__ariaLiveResetTimeoutId);
			this.__ariaLiveResetTimeoutId = null;
		}
	}

	__upgradeProperty(prop) {
		if (Object.prototype.hasOwnProperty.call(this, prop)) {
			const value = this[prop];
			delete this[prop];
			this[prop] = value;
		}
	}
}
