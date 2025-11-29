import defaultTranslations from './translations.json' with { type: 'json' };

/**
 * PullToRefreshElement - Refreshes the current document or runs a specific JavaScript function when pulling down on the page
 *
 * @element pull-to-refresh
 *
 * @attr {number} threshold - Distance in pixels to trigger refresh (default: 80)
 * @attr {string} indicator-text - Text shown when pulling down (default: localized "↓ Pull to refresh")
 * @attr {string} release-text - Text shown when ready to release (default: localized "↻ Release to refresh")
 * @attr {string} refreshing-text - Text shown while refreshing (default: localized "⏳ Refreshing...")
 * @attr {string} lang - Language code for localization (falls back to closest [lang], document lang, or 'en')
 * @attr {boolean} disabled - Disables the pull-to-refresh functionality
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
 * @cssprop --ptr-indicator-height - Height of the indicator area (default: 50px)
 * @cssprop --ptr-indicator-bg - Background color of the indicator (default: transparent)
 * @cssprop --ptr-indicator-color - Text color of the indicator (default: #555)
 * @cssprop --ptr-indicator-font-size - Font size of the indicator text (default: 14px)
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
		];
	}

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });

		// State management
		this.startY = 0;
		this.currentY = 0;
		this.isPulling = false;
		this.isRefreshing = false;

		// Language detection
		this.__lang =
			this.getAttribute('lang') ||
			this.closest('[lang]')?.getAttribute('lang') ||
			document.documentElement.lang ||
			'en';

		// Bind event handlers
		this.handleStart = this.handleStart.bind(this);
		this.handleMove = this.handleMove.bind(this);
		this.handleEnd = this.handleEnd.bind(this);
		this.handleScroll = this.handleScroll.bind(this);
	}

	connectedCallback() {
		this.render();
		this.setupEventListeners();
	}

	disconnectedCallback() {
		this.removeEventListeners();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue !== newValue) {
			if (name === 'lang') {
				this.__lang = newValue || 'en';
				this.updateIndicatorText();
			}
			if (name === 'disabled') {
				if (this.disabled) {
					this.removeEventListeners();
				} else {
					this.setupEventListeners();
				}
			}
			this.updateIndicatorText();
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
		if (this.disabled) return;

		const container = this.shadowRoot.querySelector('.ptr-container');
		if (!container) return;

		container.addEventListener('pointerdown', this.handleStart, {
			passive: true,
		});
		container.addEventListener('pointermove', this.handleMove, {
			passive: false,
		});
		container.addEventListener('pointerup', this.handleEnd);
		container.addEventListener('pointercancel', this.handleEnd);
		container.addEventListener('scroll', this.handleScroll);
	}

	removeEventListeners() {
		const container = this.shadowRoot.querySelector('.ptr-container');
		if (!container) return;

		container.removeEventListener('pointerdown', this.handleStart);
		container.removeEventListener('pointermove', this.handleMove);
		container.removeEventListener('pointerup', this.handleEnd);
		container.removeEventListener('pointercancel', this.handleEnd);
		container.removeEventListener('scroll', this.handleScroll);
	}

	handleStart(e) {
		const container = this.shadowRoot.querySelector('.ptr-container');
		if (container.scrollTop === 0 && !this.isRefreshing && !this.disabled) {
			this.isPulling = true;
			this.startY = e.clientY;

			// Prevent text selection during pull
			container.classList.add('pulling');

			this.dispatchEvent(
				new CustomEvent('ptr:pull-start', {
					bubbles: true,
					composed: true,
				}),
			);
		}
	}

	handleMove(e) {
		if (!this.isPulling) return;

		const container = this.shadowRoot.querySelector('.ptr-container');
		this.currentY = e.clientY - this.startY;

		if (this.currentY > 0) {
			e.preventDefault(); // Prevent scroll bounce

			const indicator = this.shadowRoot.querySelector('.ptr-indicator');
			const indicatorHeight = this.indicatorHeight;
			const translateY = Math.min(
				this.currentY - indicatorHeight,
				indicatorHeight,
			);

			indicator.style.transform = `translateY(${translateY}px)`;

			if (this.currentY > this.threshold) {
				indicator.textContent = this.releaseText;
				indicator.classList.add('active');
			} else {
				indicator.textContent = this.indicatorText;
				indicator.classList.remove('active');
			}

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

		// Re-enable text selection
		const container = this.shadowRoot.querySelector('.ptr-container');
		if (container) {
			container.classList.remove('pulling');
		}

		this.dispatchEvent(
			new CustomEvent('ptr:pull-end', {
				bubbles: true,
				composed: true,
			}),
		);

		if (this.currentY > this.threshold) {
			this.triggerRefresh();
		} else {
			this.resetIndicator();
		}
	}

	handleScroll() {
		const container = this.shadowRoot.querySelector('.ptr-container');
		if (container.scrollTop > 0 && !this.isRefreshing) {
			this.resetIndicator();
		}
	}

	async triggerRefresh() {
		this.isRefreshing = true;
		const indicator = this.shadowRoot.querySelector('.ptr-indicator');
		indicator.textContent = this.refreshingText;
		indicator.classList.add('active');

		const refreshEvent = new CustomEvent('ptr:refresh', {
			bubbles: true,
			composed: true,
			detail: {
				complete: () => this.completeRefresh(),
			},
		});

		this.dispatchEvent(refreshEvent);

		// If no listener calls complete(), auto-complete after a delay
		setTimeout(() => {
			if (this.isRefreshing) {
				this.completeRefresh();
			}
		}, 2000);
	}

	completeRefresh() {
		this.isRefreshing = false;
		this.resetIndicator();

		this.dispatchEvent(
			new CustomEvent('ptr:refresh-complete', {
				bubbles: true,
				composed: true,
			}),
		);
	}

	resetIndicator() {
		const indicator = this.shadowRoot.querySelector('.ptr-indicator');
		if (!indicator) return;

		indicator.style.transform = `translateY(${-this.indicatorHeight}px)`;
		indicator.classList.remove('active');
		indicator.textContent = this.indicatorText;
	}

	updateIndicatorText() {
		const indicator = this.shadowRoot.querySelector('.ptr-indicator');
		if (!indicator || this.isPulling || this.isRefreshing) return;

		indicator.textContent = this.indicatorText;
	}

	get threshold() {
		return parseInt(this.getAttribute('threshold')) || 80;
	}

	set threshold(value) {
		this.setAttribute('threshold', value);
	}

	get indicatorText() {
		const t = this.__getTranslations();
		return this.getAttribute('indicator-text') || t.indicator;
	}

	set indicatorText(value) {
		this.setAttribute('indicator-text', value);
	}

	get releaseText() {
		const t = this.__getTranslations();
		return this.getAttribute('release-text') || t.release;
	}

	set releaseText(value) {
		this.setAttribute('release-text', value);
	}

	get refreshingText() {
		const t = this.__getTranslations();
		return this.getAttribute('refreshing-text') || t.refreshing;
	}

	set refreshingText(value) {
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

	// eslint-disable-next-line class-methods-use-this
	get indicatorHeight() {
		return 50; // Can be made dynamic if needed
	}

	render() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					position: relative;
					height: 100vh;
					overflow: hidden;
				}

				.ptr-container {
					height: 100%;
					overflow-y: auto;
					-webkit-overflow-scrolling: touch;
					position: relative;
				}

				.ptr-container.pulling {
					user-select: none;
					-webkit-user-select: none;
				}

				.ptr-indicator {
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: var(--ptr-indicator-height, 50px);
					display: flex;
					align-items: center;
					justify-content: center;
					background: var(--ptr-indicator-bg, transparent);
					color: var(--ptr-indicator-color, #555);
					font-size: var(--ptr-indicator-font-size, 14px);
					transform: translateY(-50px);
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
			</style>
			<div class="ptr-container">
				<div class="ptr-indicator">
					<slot name="indicator">${this.indicatorText}</slot>
				</div>
				<div class="ptr-content">
					<slot></slot>
				</div>
			</div>
		`;
	}
}
