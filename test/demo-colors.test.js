import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file) => readFileSync(file, 'utf8');

describe('demo surface contracts', () => {
	it('keeps purposeful reading, code, and indicator pairs', () => {
		const css = read('demo/styles.css');
		expect(css).not.toMatch(
			/GrayText|ActiveText|SelectedItem|Highlight|AccentColor|opacity:\s*0\.8/,
		);
		expect(css).toMatch(/pre\s*\{[^}]*ButtonFace[^}]*ButtonText/s);
		expect(css).toMatch(/\.demo-section\s*\{[^}]*Canvas[^}]*CanvasText/s);
		const source = read('pull-to-refresh.js');
		expect(source).toContain('var(--ptr-indicator-bg, ButtonFace)');
		expect(source).toContain('var(--ptr-indicator-color, ButtonText)');
	});

	for (const file of readdirSync('demo').filter((file) =>
		file.endsWith('.html'),
	)) {
		it(`${file} uses the shared paired baseline`, () => {
			const html = read(`demo/${file}`);
			expect(html).toContain('href="./styles.css"');
			expect(html).not.toMatch(/#e3f2fd|#1976d2|SelectedItem/);
			expect(html).toContain('<footer>');
			if (file !== 'index.html') {
				expect(html).toContain('data-refresh');
				expect(html).toMatch(/<noscript[\s>]/);
			}
		});
	}
});
