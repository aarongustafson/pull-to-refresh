import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { expectNativeFocus, readDemoStyles } from './demo-fixture.js';

test.beforeEach(async ({ page }) => {
	await page.route(
		'https://cdn.jsdelivr.net/npm/microlighter@2.2.0/dist/**',
		(route) => route.abort(),
	);
});

const css = await readDemoStyles('basic.html');
const source = await readFile(
	new URL('../../pull-to-refresh.js', import.meta.url),
	'utf8',
);
const tokens = [
	'Canvas',
	'CanvasText',
	'ButtonFace',
	'ButtonText',
	'Field',
	'FieldText',
];
// Nineteen distinct recorded palettes represent 62 scheme observations.
const palettes = [
	['#ffffff', '#000000', '#efefef', '#000000', '#ffffff', '#000000'],
	['#121212', '#ffffff', '#6b6b6b', '#ffffff', '#3b3b3b', '#ffffff'],
	['#ffffff', '#000000', '#e9e9ed', '#000000', '#ffffff', '#000000'],
	['#1c1b22', '#fbfbfe', '#2b2a33', '#fbfbfe', '#2b2a33', '#fbfbfe'],
	['#ffffff', '#000000', '#c0c0c0', '#000000d8', '#ffffff', '#000000d8'],
	['#1e1e1e', '#ffffff', '#ffffff3f', '#ffffffd8', '#ffffff3f', '#ffffffd8'],
	['#ffffff', '#000000', '#f0f0f0', '#000000', '#ffffff', '#000000'],
	['#202020', '#ffffff', '#202020', '#ffffff', '#202020', '#ffffff'],
	['#fffaef', '#3d3d3d', '#fffaef', '#202020', '#fffaef', '#3d3d3d'],
	['#2d3236', '#ffffff', '#2d3236', '#b6f6f0', '#2d3236', '#ffffff'],
	['#000000', '#ffffff', '#000000', '#ffee32', '#000000', '#ffffff'],
	['#000000', '#ffffff', '#000000', '#ffee32', '#000000', '#ffee32'],
	['#2d3236', '#ffffff', '#2d3236', '#b6f6f0', '#2d3236', '#b6f6f0'],
	['#fffaef', '#3d3d3d', '#fffaef', '#202020', '#fffaef', '#202020'],
	['#ffffff', '#000000', '#c0c0c0', '#000000', '#ffffff', '#000000'],
	['#000000', '#ffffff', '#c0c0c0', '#000000', '#ffffff', '#000000'],
	['#ffffff', '#000000', '#ffffff', '#000000d8', '#ffffff', '#000000d8'],
	['#282828', '#ffffff', '#202020', '#ffffff', '#202020', '#ffffff'],
	['#202020', '#ffffff', '#00000000', '#ffffff', '#00000000', '#ffffff'],
];

function substitute(text, palette) {
	const values = Object.fromEntries(
		tokens.map((token, i) => [token.toLowerCase(), palette[i]]),
	);
	return text.replace(
		/\b(CanvasText|Canvas|ButtonFace|ButtonText|FieldText|Field)\b/gi,
		(token) => values[token.toLowerCase()],
	);
}

async function contrast(locator) {
	return locator.evaluate((element) => {
		const context = document
			.createElement('canvas')
			.getContext('2d', { willReadFrequently: true });
		const paint = (color) => {
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
			return [...context.getImageData(0, 0, 1, 1).data];
		};
		const ancestors = [];
		for (
			let node = element;
			node;
			node = node.parentElement || node.getRootNode().host
		)
			ancestors.unshift(node);
		for (const node of ancestors)
			paint(getComputedStyle(node).backgroundColor);
		const background = [...context.getImageData(0, 0, 1, 1).data];
		if (background[3] !== 255)
			throw new Error('Expected opaque backing surface');
		const foreground = paint(getComputedStyle(element).color);
		const luminance = (rgb) =>
			rgb.slice(0, 3).reduce((sum, channel, i) => {
				const c = channel / 255;
				return (
					sum +
					(c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) *
						[0.2126, 0.7152, 0.0722][i]
				);
			}, 0);
		const values = [luminance(background), luminance(foreground)].sort(
			(a, b) => b - a,
		);
		return (values[0] + 0.05) / (values[1] + 0.05);
	});
}

async function demo(page, name = 'basic') {
	await page.route('https://esm.sh/**', (route) =>
		route.fulfill({
			contentType: 'text/javascript',
			body: "export { PullToRefreshElement } from 'http://127.0.0.1:4185/pull-to-refresh.js';",
		}),
	);
	await page.route('https://unpkg.com/**', (route) =>
		route.fulfill({
			contentType: 'text/javascript',
			body: "export { definePullToRefresh } from 'http://127.0.0.1:4185/define.js';",
		}),
	);
	await page.goto(`/demo/${name}.html`);
	if (name !== 'index')
		await expect(page.locator('.ptr-indicator')).toHaveCount(1);
}

for (const name of ['esm', 'unpkg']) {
	test(`${name}: copied example enhances keyboard Refresh instead of reloading`, async ({
		page,
	}) => {
		await demo(page, name);
		const snippet = await page.locator('pre code').first().textContent();
		await page.route('**/copied-example.html', (route) =>
			route.fulfill({
				contentType: 'text/html',
				body: `<!doctype html><html lang="en"><title>Copied example</title><body>${snippet}</body></html>`,
			}),
		);
		await page.goto('/copied-example.html');
		await expect(page.locator('.ptr-indicator')).toHaveCount(1);
		await page.evaluate(() => {
			window.copiedRefreshes = 0;
			document.addEventListener('ptr:refresh', () => {
				window.copiedRefreshes += 1;
			});
		});
		await page
			.getByRole('button', { name: 'Refresh', exact: true })
			.focus();
		await page.keyboard.press('Enter');
		await expect
			.poll(() => page.evaluate(() => window.copiedRefreshes))
			.toBe(1);
	});
}

test('contrast calibration catches the former fixed-blue dark-scheme status', async ({
	page,
}) => {
	await page.setContent(
		'<style>body{background:#121212;color:#fff}.status{background:#e3f2fd}</style><p class="status">Prêt</p>',
	);
	expect(await contrast(page.locator('.status'))).toBeLessThan(4.5);
	await page.locator('.status').evaluate((node) => {
		node.style.background = '#121212';
		node.style.color = '#fff';
	});
	expect(await contrast(page.locator('.status'))).toBeGreaterThanOrEqual(4.5);
});

test('all 19 study palettes retain reading, code, footer, hover and indicator contrast', async ({
	page,
}) => {
	for (const [index, palette] of palettes.entries()) {
		await page.route('**/pull-to-refresh.js', (route) =>
			route.fulfill({
				contentType: 'text/javascript',
				body: substitute(source, palette),
			}),
		);
		await page.goto('/demo/basic.html');
		await expect(page.locator('.ptr-indicator')).toHaveCount(1);
		await page.evaluate(
			({ css, palette }) => {
				for (const style of document.querySelectorAll(
					'style, link[rel="stylesheet"]',
				))
					style.remove();
				const style = document.createElement('style');
				style.textContent = css;
				document.head.append(style);
				document.body.style.background = palette[0];
				document.body.style.color = palette[1];
				document
					.querySelector('.demo-content')
					.insertAdjacentHTML(
						'beforeend',
						'<section class="demo-section">Reading <small>Supporting content</small><micro-lighter class="code-panel" language="html" data-label="HTML"><pre><code>Code</code></pre></micro-lighter></section>',
					);
			},
			{ css: substitute(css, palette), palette },
		);
		for (const selector of [
			'body',
			'.status',
			'.demo-section',
			'small',
			'pre code',
			'footer',
			'button',
			'.ptr-indicator',
		]) {
			expect(
				await contrast(page.locator(selector).first()),
				`${index}: ${selector}`,
			).toBeGreaterThanOrEqual(4.5);
		}
		await page.locator('button').hover();
		expect(await contrast(page.locator('button'))).toBeGreaterThanOrEqual(
			4.5,
		);
		await page.unroute('**/pull-to-refresh.js');
	}
});

for (const colorScheme of ['light', 'dark']) {
	test(`${colorScheme}: every demo uses paired surfaces`, async ({
		page,
		browserName,
	}) => {
		await page.emulateMedia({ colorScheme });
		for (const name of [
			'basic',
			'custom-text',
			'threshold',
			'selection-disabled',
			'french',
			'spanish',
			'japanese',
			'esm',
			'unpkg',
			'index',
		]) {
			await demo(page, name);
			for (const selector of ['body', '.status', 'footer']) {
				if (await page.locator(selector).count())
					expect(
						await contrast(page.locator(selector).first()),
					).toBeGreaterThanOrEqual(4.5);
			}
			// Ubuntu WebKit's native dark button pair is tested separately below.
			if (
				!(
					process.platform === 'linux' &&
					browserName === 'webkit' &&
					colorScheme === 'dark'
				) &&
				name !== 'index'
			) {
				expect(
					await contrast(page.locator('.ptr-indicator')),
				).toBeGreaterThanOrEqual(4.5);
			}
		}
	});

	test(`${colorScheme}: native indicator pair`, async ({
		page,
		browserName,
	}) => {
		test.fail(
			process.platform === 'linux' &&
				browserName === 'webkit' &&
				colorScheme === 'dark',
			'Known Ubuntu WebKit dark ButtonText/ButtonFace limitation (1.82:1).',
		);
		await page.emulateMedia({ colorScheme });
		await demo(page);
		expect(
			await contrast(page.locator('.ptr-indicator')),
		).toBeGreaterThanOrEqual(4.5);
	});
}

test('native keyboard focus and localized loading/completion keep focus and data', async ({
	page,
	browserName,
}) => {
	await demo(page, 'french');
	await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
	await expect(
		page.getByRole('button', { name: 'Actualiser' }),
	).toBeFocused();
	await expectNativeFocus(page.getByRole('button', { name: 'Actualiser' }));
	expect(
		(await page.locator('button').boundingBox()).height,
	).toBeGreaterThanOrEqual(44);
	await page.keyboard.press('Enter');
	await expect(page.locator('#status')).toHaveText('Actualisation...');
	await expect(page.locator('#status')).toContainText('Terminé');
	await expect(page.locator('button')).toBeFocused();
	expect(await page.locator('#random').textContent()).toMatch(/^\d+$/);
});

test('authored refresh failure preserves data, releases loading and supports keyboard retry', async ({
	page,
}) => {
	await demo(page, 'custom-text');
	await page.getByLabel('Simulate a failed refresh').check();
	await page.getByRole('button', { name: 'Refresh' }).focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('#status')).toContainText('Refresh failed');
	await expect(page.locator('#random')).toHaveText('0');
	await expect
		.poll(() =>
			page
				.locator('pull-to-refresh')
				.evaluate((node) => node.isRefreshing),
		)
		.toBe(false);
	await expect(page.getByRole('button', { name: 'Refresh' })).toBeFocused();
	await expect(
		page.getByLabel('Simulate a failed refresh'),
	).not.toBeChecked();
	await page.keyboard.press('Enter');
	await expect(page.locator('#status')).toContainText('Complete');
});

test('each authored example has a unique fragment destination around its heading and live content', async ({
	page,
}) => {
	for (const name of [
		'index',
		'esm',
		'unpkg',
		'basic',
		'threshold',
		'custom-text',
		'selection-disabled',
		'spanish',
		'french',
		'japanese',
	]) {
		await demo(page, name);
		const blocks = await page.evaluate(() => {
			const ids = [...document.querySelectorAll('[id]')].map(
				(node) => node.id,
			);
			return [
				...document.querySelectorAll(
					'.code-demo-pair, body[data-demo-page="embedded"] pull-to-refresh',
				),
			].map((node) => {
				const block = node.closest('section, .demo-section');
				return {
					id: block?.id,
					unique: block
						? ids.filter((id) => id === block.id).length === 1
						: false,
					heading: Boolean(block?.querySelector('h2, h3')),
				};
			});
		});
		expect(blocks.length).toBeGreaterThan(0);
		for (const block of blocks) {
			expect(block.id, name).toBeTruthy();
			expect(block.unique, name).toBe(true);
			expect(block.heading, name).toBe(true);
			await page.goto(`/demo/${name}.html#${block.id}`);
			await expect(page.locator(`#${block.id}`)).toBeVisible();
		}
	}
});

test('basic Refresh catches update failures, completes and supports keyboard recovery', async ({
	page,
}) => {
	await demo(page);
	await page.clock.install();
	await page.evaluate(() => {
		window.refreshCompletions = 0;
		document.addEventListener('ptr:refresh-complete', () => {
			window.refreshCompletions += 1;
		});
		const original = Math.random;
		Math.random = () => {
			throw new Error('Demo update failed');
		};
		window.restoreRandom = () => {
			Math.random = original;
		};
	});
	await page.getByRole('button', { name: 'Refresh' }).focus();
	await page.keyboard.press('Enter');
	await expect(page.locator('#status')).toHaveText('Refreshing...');
	await page.clock.fastForward(1500);
	await expect(page.locator('#status')).toContainText('Refresh failed');
	await expect(page.locator('#random')).toHaveText('0');
	expect(await page.evaluate(() => window.refreshCompletions)).toBe(1);
	await page.evaluate(() => window.restoreRandom());
	await page.keyboard.press('Enter');
	await page.clock.fastForward(1500);
	await expect(page.locator('#status')).toContainText('Complete');
	expect(await page.evaluate(() => window.refreshCompletions)).toBe(2);
	await expect(page.locator('button')).toBeFocused();
});

test('automatic completion does not announce application success or duplicate a pending update', async ({
	page,
}) => {
	await demo(page);
	await page.clock.install();
	await page.evaluate(() => {
		const schedule = window.setTimeout;
		window.setTimeout = (callback, delay, ...args) =>
			schedule(callback, delay === 1500 ? 3000 : delay, ...args);
		window.updates = 0;
		Math.random = () => {
			window.updates += 1;
			return 0.042;
		};
	});
	await page.getByRole('button', { name: 'Refresh' }).focus();
	await page.keyboard.press('Enter');
	await page.clock.fastForward(2000);
	expect(
		await page
			.locator('pull-to-refresh')
			.evaluate((node) => node.isRefreshing),
	).toBe(false);
	await expect(page.locator('#status')).toHaveText('Refreshing...');
	await expect(page.locator('#random')).toHaveText('0');
	await page.keyboard.press('Enter');
	await page.clock.fastForward(1000);
	await expect(page.locator('#status')).toContainText('Complete');
	await expect(page.locator('#random')).toHaveText('42');
	expect(await page.evaluate(() => window.updates)).toBe(1);
	await expect(page.locator('button')).toBeFocused();
});

for (const [name, lang, button, loading, complete, failure] of [
	[
		'spanish',
		'es',
		'Actualizar',
		'Actualizando...',
		'¡Completo!',
		'No se pudo actualizar.',
	],
	[
		'french',
		'fr',
		'Actualiser',
		'Actualisation...',
		'Terminé',
		'Échec de l’actualisation.',
	],
	['japanese', 'ja', '更新', '更新中...', '完了！', '更新に失敗しました。'],
]) {
	test(`${name}: document language, native button and application outcomes stay localized`, async ({
		page,
	}) => {
		await demo(page, name);
		await expect(page.locator('html')).toHaveAttribute('lang', lang);
		await expect(page.locator('pull-to-refresh')).not.toHaveAttribute(
			'lang',
		);
		await page.clock.install();
		await page.getByRole('button', { name: button, exact: true }).focus();
		await page.keyboard.press('Enter');
		await expect(page.locator('#status')).toHaveText(loading);
		await page.clock.fastForward(1500);
		await expect(page.locator('#status')).toContainText(complete);
		const previous = await page.locator('#random').textContent();
		await page.evaluate(() => {
			Math.random = () => {
				throw new Error('Update failed');
			};
		});
		await page.keyboard.press('Enter');
		await page.clock.fastForward(1500);
		await expect(page.locator('#status')).toContainText(failure);
		await expect(page.locator('#random')).toHaveText(previous);
		await expect(
			page.getByRole('button', { name: button, exact: true }),
		).toBeFocused();
		expect(
			await page
				.locator('pull-to-refresh')
				.evaluate((node) => node.isRefreshing),
		).toBe(false);
	});
}

test('gesture threshold, selection restoration and custom paired overrides preserve state cues', async ({
	page,
}) => {
	await demo(page, 'selection-disabled');
	await page.locator('pull-to-refresh').evaluate((component) => {
		component.style.setProperty('--ptr-indicator-bg', '#102030');
		component.style.setProperty('--ptr-indicator-color', '#ffffff');
		component.dispatchEvent(
			new PointerEvent('pointerdown', { clientY: 10 }),
		);
		component.dispatchEvent(
			new PointerEvent('pointermove', { clientY: 110, cancelable: true }),
		);
	});
	await expect(page.locator('pull-to-refresh')).toHaveAttribute(
		'pulling',
		'',
	);
	expect(
		await page
			.locator('.demo-content')
			.evaluate((node) => getComputedStyle(node).userSelect),
	).toBe('none');
	await expect(page.locator('.ptr-indicator-text')).toContainText('Release');
	expect(
		await contrast(page.locator('.ptr-indicator')),
	).toBeGreaterThanOrEqual(4.5);
	await page.locator('pull-to-refresh').dispatchEvent('pointerup');
	await expect(page.locator('.ptr-indicator-text')).toContainText(
		'Refreshing',
	);
	await expect(page.locator('pull-to-refresh')).not.toHaveAttribute(
		'pulling',
	);
	expect(
		await page
			.locator('.demo-content')
			.evaluate((node) => getComputedStyle(node).userSelect),
	).not.toBe('none');
	await expect(page.locator('#status')).toContainText('Complete');
});

test('real mouse pointer drag changes release/loading messages and completes without focus theft', async ({
	page,
}) => {
	await demo(page);
	const button = page.getByRole('button', { name: 'Refresh' });
	await button.focus();
	await page.mouse.move(220, 100);
	await page.mouse.down();
	await page.mouse.move(220, 210, { steps: 12 });
	const focusTarget = await page.evaluate(
		() => document.activeElement.tagName,
	);
	await expect(page.locator('.ptr-indicator-text')).toContainText('Release');
	await page.mouse.up();
	await expect(page.locator('#status')).toHaveText('Refreshing...');
	await expect(page.locator('#status')).toContainText('Complete');
	expect(await page.evaluate(() => document.activeElement.tagName)).toBe(
		focusTarget,
	);
});

test('320px reflow and enlarged text keep code left/live right only at wide widths', async ({
	page,
}) => {
	await demo(page, 'index');
	for (const width of [1280, 320]) {
		await page.setViewportSize({ width, height: 900 });
		await page.evaluate(() => {
			document.documentElement.style.fontSize = '200%';
		});
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= innerWidth,
			),
		).toBe(true);
		const pair = page.locator('.code-demo-pair').first();
		const code = await pair.locator(':scope > micro-lighter').boundingBox();
		const live = await pair.locator(':scope > .demo').boundingBox();
		if (width === 320)
			expect(live.y).toBeGreaterThanOrEqual(code.y + code.height);
		else expect(live.x).toBeGreaterThanOrEqual(code.x + code.width);
	}
});

test('blocked modules and no JavaScript retain native reload recovery and content', async ({
	browser,
	page,
}) => {
	await page.route('**/define.js', (route) => route.abort());
	await page.goto('/demo/basic.html');
	await expect(page.locator('#random')).toHaveText('0');
	await Promise.all([
		page.waitForNavigation(),
		page.getByRole('button', { name: 'Refresh' }).click(),
	]);
	await expect(page.locator('#random')).toHaveText('0');
	const context = await browser.newContext({
		javaScriptEnabled: false,
		serviceWorkers: 'block',
	});
	const fallback = await context.newPage();
	await fallback.goto('http://127.0.0.1:4185/demo/french.html');
	expect(
		await fallback.locator('noscript').evaluate((node) => node.textContent),
	).toContain('JavaScript');
	await expect(fallback.locator('noscript p')).toBeVisible();
	await Promise.all([
		fallback.waitForNavigation(),
		fallback.getByRole('button', { name: 'Actualiser' }).click(),
	]);
	await expect(fallback.locator('#random')).toHaveText('0');
	await context.close();
});

test('forced-color emulation retains automatic adjustment, native focus and labels', async ({
	page,
	browserName,
}) => {
	test.skip(
		browserName === 'webkit',
		'WebKit does not implement forced-colors emulation.',
	);
	await page.emulateMedia({ forcedColors: 'active' });
	await demo(page);
	await page.keyboard.press('Tab');
	await expect(page.locator('button')).toBeFocused();
	expect(
		await page
			.locator('button')
			.evaluate((button) => getComputedStyle(button).forcedColorAdjust),
	).toBe('auto');
	await page.keyboard.press('Space');
	await expect(page.locator('#status')).toHaveText('Refreshing...');
	await expect(page.locator('#status')).toContainText('Complete');
});

test('reduced motion uses the existing indicator transition hook', async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await demo(page);
	expect(
		await page
			.locator('.ptr-indicator')
			.evaluate((node) => getComputedStyle(node).transitionDuration),
	).toBe('0s');
});

for (const mode of [
	{ name: 'light', colorScheme: 'light', forcedColors: 'none' },
	{ name: 'dark', colorScheme: 'dark', forcedColors: 'none' },
	{ name: 'forced', colorScheme: 'light', forcedColors: 'active' },
]) {
	test(`${mode.name}: authored code retains contrast and page navigation`, async ({
		page,
		browserName,
	}) => {
		test.skip(
			mode.forcedColors === 'active' && browserName === 'webkit',
			'WebKit does not implement forced-colors emulation.',
		);
		await page.emulateMedia({
			colorScheme: mode.colorScheme,
			forcedColors: mode.forcedColors,
		});
		await demo(page, 'index');
		const inline = page.locator('#custom-text code').first();
		const block = page.locator('pre code mark').first();
		for (const mark of [block]) {
			expect(await contrast(mark)).toBeGreaterThanOrEqual(4.5);
			expect(
				await mark.evaluate((node) => {
					const probe = document.createElement('mark');
					probe.style.color = 'MarkText';
					probe.style.background = 'Mark';
					document.body.append(probe);
					const expected = getComputedStyle(probe);
					const actual = getComputedStyle(node);
					const result =
						actual.color === expected.color &&
						actual.backgroundColor === expected.backgroundColor &&
						(!CSS.supports('forced-color-adjust', 'auto') ||
							actual.forcedColorAdjust === 'auto');
					probe.remove();
					return result;
				}),
			).toBe(true);
		}
		expect(await contrast(inline)).toBeGreaterThanOrEqual(4.5);
		const tab =
			browserName === 'webkit' && process.platform === 'darwin'
				? 'Alt+Tab'
				: 'Tab';
		await page.keyboard.press(tab);
		await expect(page.locator('.skip-link')).toBeFocused();
		await page.keyboard.press(tab);
		await expect(
			page
				.locator('header')
				.getByRole('link', { name: 'README', exact: true }),
		).toBeFocused();
		for (const width of [1280, 320]) {
			await page.setViewportSize({ width, height: 900 });
			await page.evaluate(() => {
				document.documentElement.style.fontSize = '200%';
			});
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth,
				),
			).toBe(true);
			await expect(inline).toBeVisible();
		}
	});
}
