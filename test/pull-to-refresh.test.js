import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PullToRefreshElement } from '../pull-to-refresh.js';

describe('PullToRefreshElement', () => {
	let element;

	beforeEach(() => {
		element = document.createElement('pull-to-refresh');
		document.body.appendChild(element);
	});

	it('should be defined', () => {
		expect(customElements.get('pull-to-refresh')).toBe(
			PullToRefreshElement,
		);
	});

	it('should create an instance', () => {
		expect(element).toBeInstanceOf(PullToRefreshElement);
		expect(element).toBeInstanceOf(HTMLElement);
	});

	it('should have a shadow root', () => {
		expect(element.shadowRoot).toBeTruthy();
	});

	describe('Attributes', () => {
		it('should have default threshold of 80', () => {
			expect(element.threshold).toBe(80);
		});

		it('should set custom threshold', () => {
			element.setAttribute('threshold', '120');
			expect(element.threshold).toBe(120);
		});

		it('should have default indicator text', () => {
			expect(element.indicatorText).toBe('↓ Pull to refresh');
		});

		it('should set custom indicator text', () => {
			element.setAttribute('indicator-text', 'Custom text');
			expect(element.indicatorText).toBe('Custom text');
		});

		it('should have default release text', () => {
			expect(element.releaseText).toBe('↻ Release to refresh');
		});

		it('should set custom release text', () => {
			element.setAttribute('release-text', 'Let go!');
			expect(element.releaseText).toBe('Let go!');
		});

		it('should have default refreshing text', () => {
			expect(element.refreshingText).toBe('⏳ Refreshing...');
		});

		it('should set custom refreshing text', () => {
			element.setAttribute('refreshing-text', 'Loading...');
			expect(element.refreshingText).toBe('Loading...');
		});

		it('should handle disabled attribute', () => {
			expect(element.disabled).toBe(false);
			element.setAttribute('disabled', '');
			expect(element.disabled).toBe(true);
			element.removeAttribute('disabled');
			expect(element.disabled).toBe(false);
		});
	});

	describe('Properties', () => {
		it('should set threshold via property', () => {
			element.threshold = 100;
			expect(element.getAttribute('threshold')).toBe('100');
		});

		it('should set indicator text via property', () => {
			element.indicatorText = 'New text';
			expect(element.getAttribute('indicator-text')).toBe('New text');
		});

		it('should set release text via property', () => {
			element.releaseText = 'Release!';
			expect(element.getAttribute('release-text')).toBe('Release!');
		});

		it('should set refreshing text via property', () => {
			element.refreshingText = 'Wait...';
			expect(element.getAttribute('refreshing-text')).toBe('Wait...');
		});

		it('should set disabled via property', () => {
			element.disabled = true;
			expect(element.hasAttribute('disabled')).toBe(true);
			element.disabled = false;
			expect(element.hasAttribute('disabled')).toBe(false);
		});
	});

	describe('DOM Structure', () => {
		it('should render container', () => {
			const container =
				element.shadowRoot.querySelector('.ptr-container');
			expect(container).toBeTruthy();
		});

		it('should render indicator', () => {
			const indicator =
				element.shadowRoot.querySelector('.ptr-indicator');
			expect(indicator).toBeTruthy();
		});

		it('should render content slot', () => {
			const content = element.shadowRoot.querySelector('.ptr-content');
			expect(content).toBeTruthy();
			const slot = content.querySelector('slot');
			expect(slot).toBeTruthy();
		});

		it('should render indicator slot', () => {
			const indicator =
				element.shadowRoot.querySelector('.ptr-indicator');
			const slot = indicator.querySelector('slot[name="indicator"]');
			expect(slot).toBeTruthy();
		});
	});

	describe('Events', () => {
		it('should fire ptr:refresh event when threshold is exceeded', () => {
			const refreshHandler = vi.fn();
			element.addEventListener('ptr:refresh', refreshHandler);

			// Simulate pull gesture
			element.isPulling = true;
			element.currentY = 100; // Exceeds default threshold of 80

			element.triggerRefresh();

			expect(refreshHandler).toHaveBeenCalled();
			expect(refreshHandler.mock.calls[0][0].detail).toHaveProperty(
				'complete',
			);
		});

		it('should complete refresh when complete() is called', () => {
			const completeHandler = vi.fn();
			element.addEventListener('ptr:refresh-complete', completeHandler);

			element.addEventListener('ptr:refresh', (e) => {
				e.detail.complete();
			});

			element.triggerRefresh();

			expect(completeHandler).toHaveBeenCalled();
		});

		it('should auto-complete if complete() is not called', async () => {
			const completeHandler = vi.fn();
			element.addEventListener('ptr:refresh-complete', completeHandler);

			element.triggerRefresh();

			// Wait for auto-complete timeout
			await new Promise((resolve) => setTimeout(resolve, 2100));

			expect(completeHandler).toHaveBeenCalled();
		});
	});

	describe('Refresh Lifecycle', () => {
		it('should set isRefreshing to true during refresh', () => {
			expect(element.isRefreshing).toBe(false);
			element.triggerRefresh();
			expect(element.isRefreshing).toBe(true);
		});

		it('should set isRefreshing to false after completion', () => {
			element.addEventListener('ptr:refresh', (e) => {
				e.detail.complete();
			});

			element.triggerRefresh();
			expect(element.isRefreshing).toBe(false);
		});

		it('should update indicator text during refresh', () => {
			element.triggerRefresh();
			const indicator =
				element.shadowRoot.querySelector('.ptr-indicator');
			expect(indicator.textContent).toBe('⏳ Refreshing...');
		});

		it('should reset indicator after completion', () => {
			element.addEventListener('ptr:refresh', (e) => {
				e.detail.complete();
			});

			element.triggerRefresh();
			const indicator =
				element.shadowRoot.querySelector('.ptr-indicator');
			expect(indicator.textContent).toBe('↓ Pull to refresh');
		});
	});

	describe('Manual Control', () => {
		it('should complete refresh via completeRefresh() method', () => {
			const completeHandler = vi.fn();
			element.addEventListener('ptr:refresh-complete', completeHandler);

			element.triggerRefresh();
			element.completeRefresh();

			expect(completeHandler).toHaveBeenCalled();
			expect(element.isRefreshing).toBe(false);
		});
	});

	describe('Disabled State', () => {
		it('should not trigger refresh when disabled', () => {
			element.disabled = true;
			const refreshHandler = vi.fn();
			element.addEventListener('ptr:refresh', refreshHandler);

			element.isPulling = true;
			element.currentY = 100;

			// Should not trigger because disabled
			expect(element.disabled).toBe(true);
		});
	});

	describe('Localization', () => {
		it('should use English by default', () => {
			expect(element.indicatorText).toBe('↓ Pull to refresh');
			expect(element.releaseText).toBe('↻ Release to refresh');
			expect(element.refreshingText).toBe('⏳ Refreshing...');
		});

		it('should use Spanish when lang="es"', () => {
			element.setAttribute('lang', 'es');
			expect(element.indicatorText).toBe('↓ Desliza para actualizar');
			expect(element.releaseText).toBe('↻ Suelta para actualizar');
			expect(element.refreshingText).toBe('⏳ Actualizando...');
		});

		it('should use French when lang="fr"', () => {
			element.setAttribute('lang', 'fr');
			expect(element.indicatorText).toBe('↓ Tirez pour actualiser');
			expect(element.releaseText).toBe('↻ Relâchez pour actualiser');
			expect(element.refreshingText).toBe('⏳ Actualisation...');
		});

		it('should use Japanese when lang="ja"', () => {
			element.setAttribute('lang', 'ja');
			expect(element.indicatorText).toBe('↓ 引っ張って更新');
			expect(element.releaseText).toBe('↻ 離して更新');
			expect(element.refreshingText).toBe('⏳ 更新中...');
		});

		it('should handle regional variants', () => {
			element.setAttribute('lang', 'en-US');
			expect(element.indicatorText).toBe('↓ Pull to refresh');

			element.setAttribute('lang', 'es-MX');
			expect(element.indicatorText).toBe('↓ Desliza para actualizar');
		});

		it('should fall back to English for unsupported languages', () => {
			element.setAttribute('lang', 'xx'); // Unsupported language
			expect(element.indicatorText).toBe('↓ Pull to refresh');
		});

		it('should allow custom text to override localized text', () => {
			element.setAttribute('lang', 'es');
			element.setAttribute('indicator-text', 'Custom text');
			expect(element.indicatorText).toBe('Custom text');
		});

		it('should support custom translations via registerTranslations', () => {
			PullToRefreshElement.registerTranslations({
				nl: {
					indicator: '↓ Trek om te vernieuwen',
					release: '↻ Loslaten om te vernieuwen',
					refreshing: '⏳ Vernieuwen...',
				},
			});

			element.setAttribute('lang', 'nl');
			expect(element.indicatorText).toBe('↓ Trek om te vernieuwen');
			expect(element.releaseText).toBe('↻ Loslaten om te vernieuwen');
			expect(element.refreshingText).toBe('⏳ Vernieuwen...');
		});
	});
});
