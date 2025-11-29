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

		this.addEventListener('pointerdown', this.handleStart, {
			passive: true,
		});
		this.addEventListener('pointermove', this.handleMove, {
			passive: false,
		});
		this.addEventListener('pointerup', this.handleEnd);
		this.addEventListener('pointercancel', this.handleEnd);

		const container = this.shadowRoot.querySelector('.ptr-container');
		if (container) {
			container.addEventListener('scroll', this.handleScroll);
		}
	}

	removeEventListeners() {
		this.removeEventListener('pointerdown', this.handleStart);
		this.removeEventListener('pointermove', this.handleMove);
		this.removeEventListener('pointerup', this.handleEnd);
		this.removeEventListener('pointercancel', this.handleEnd);

		const container = this.shadowRoot.querySelector('.ptr-container');
		if (!container) return;

		container.removeEventListener('scroll', this.handleScroll);
	}

	handleStart(e) {
		console.log('[PTR] handleStart', {
			type: e.type,
			pointerId: e.pointerId,
			pointerType: e.pointerType,
			clientY: e.clientY,
			target: e.target,
		});
		const container = this.shadowRoot.querySelector('.ptr-container');
		if (container.scrollTop === 0 && !this.isRefreshing && !this.disabled) {
			console.log('[PTR] Starting pull (pending direction confirmation)');
			this.isPulling = true;
			this.isPullingConfirmed = false;
			this.startY = e.clientY;
		} else {
			console.log('[PTR] Not starting pull', {
				scrollTop: container.scrollTop,
				isRefreshing: this.isRefreshing,
				disabled: this.disabled,
			});
		}
	}

	handleMove(e) {
		if (!this.isPulling) return;

		const deltaY = e.clientY - this.startY;

		console.log('[PTR] handleMove', {
			clientY: e.clientY,
			startY: this.startY,
			delta: deltaY,
			isPullingConfirmed: this.isPullingConfirmed,
		});

		// If direction not yet confirmed, check if user is pulling down
		if (!this.isPullingConfirmed) {
			// Need some movement to determine direction (at least 5px)
			if (Math.abs(deltaY) > 5) {
				if (deltaY < 0) {
					// Upward pull - cancel the gesture
					console.log('[PTR] Upward pull detected, canceling');
					this.isPulling = false;
					return;
				} else {
					// Downward pull - confirm and proceed
					console.log('[PTR] Downward pull confirmed');
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

		const container = this.shadowRoot.querySelector('.ptr-container');
		this.currentY = deltaY;

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
		console.log('[PTR] handleEnd', {
			isPulling: this.isPulling,
			currentY: this.currentY,
			threshold: this.threshold,
		});
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
		const container = this.shadowRoot.querySelector('.ptr-container');
		if (container.scrollTop > 0 && !this.isRefreshing) {
			this.resetIndicator();
		}
	}

	async triggerRefresh() {
		console.log('[PTR] triggerRefresh called');
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

		// Temporarily disable announcements during reset
		indicator.setAttribute('aria-live', 'off');

		indicator.style.transform = `translateY(${-this.indicatorHeight}px)`;
		indicator.classList.remove('active');
		indicator.textContent = this.indicatorText;

		// Re-enable announcements after text is updated
		// Use setTimeout to ensure the text change happens first
		setTimeout(() => {
			indicator.setAttribute('aria-live', 'assertive');
		}, 0);
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

	render() {
		this.shadowRoot.innerHTML = `
			<style>
			:host {
				display: block;
				position: relative;
				height: 100vh;
				overflow: hidden;
			}

			:host([pulling][disable-selection]) ::slotted(*) {
				user-select: none;
				-webkit-user-select: none;
			}				.ptr-container {
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
			</style>
			<div class="ptr-container">
				<div class="ptr-indicator" role="status" aria-live="assertive">
					<slot name="indicator">${this.indicatorText}</slot>
				</div>
				<div class="ptr-content">
					<slot></slot>
				</div>
			</div>
		`;
	}
}
