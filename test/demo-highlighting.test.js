import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const empty = [
	0,
	'4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
];
const baseline = {
	'basic.html': empty,
	'custom-text.html': empty,
	'esm.html': [
		1,
		'0984506ef8ae25eb1cf5bf029b029c55d83a602e71066a5647f88efccf9f45c5',
	],
	'french.html': empty,
	'index.html': [
		31,
		'02f7022d778f9a5ba94aec8efc948487c05ee4ab47306f17e2ef5165ab5003ca',
	],
	'japanese.html': empty,
	'selection-disabled.html': empty,
	'spanish.html': empty,
	'threshold.html': empty,
	'unpkg.html': [
		1,
		'224c06011441e1bd18ebe470e14ed340d5e2355fec90d9db060a597a3e75c621',
	],
};
const componentTokens =
	/<\/?pull-to-refresh\b[^>]*>|\bpull-to-refresh\b|@aarongustafson\/pull-to-refresh[^\s'"]*|\b(?:PullToRefreshElement|definePullToRefresh|triggerRefresh|completeRefresh|registerTranslations|indicatorText|releaseText|refreshingText|disableSelection|threshold|indicator-text|release-text|refreshing-text|disable-selection|disabled|lang)\b|\bptr:[a-z-]+\b|--ptr-[a-z-]+/g;
const read = (file) => readFileSync(`demo/${file}`, 'utf8');
const snippets = (file) =>
	[...read(file).matchAll(/<code\b[^>]*>([\s\S]*?)<\/code\s*>/g)].map(
		([, contents]) => {
			const code = document.createElement('code');
			code.innerHTML = contents;
			return code;
		},
	);

function marking(code) {
	const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
	const characters = [];
	for (let text = walker.nextNode(); text; text = walker.nextNode()) {
		characters.push(
			...Array(text.textContent.length).fill(
				Boolean(text.parentElement.closest('mark')),
			),
		);
	}
	return characters;
}

describe('displayed demo code highlighting', () => {
	it('inventories every demo without adding displayed import or registration snippets', () => {
		expect(
			readdirSync('demo')
				.filter((file) => file.endsWith('.html'))
				.sort(),
		).toEqual(Object.keys(baseline).sort());
	});

	it('uses the existing complete Mark pair for block and inline code', () => {
		expect(readFileSync('demo/styles.css', 'utf8')).toMatch(
			/(?:^|\n)code mark\s*\{[^}]*background:\s*Mark;[^}]*color:\s*MarkText;/,
		);
	});

	for (const [file, [count, hash]] of Object.entries(baseline)) {
		const codes = snippets(file);
		it(`${file} preserves all ${count} pre-edit snippet textContent values`, () => {
			const texts = codes.map((code) => code.textContent);
			expect(texts).toHaveLength(count);
			expect(
				createHash('sha256')
					.update(JSON.stringify(texts))
					.digest('hex'),
			).toBe(hash);
		});

		for (const [index, code] of codes.entries()) {
			it(`${file} snippet ${index + 1} marks component tokens, not generic code, without nesting`, () => {
				expect(code.querySelector('mark mark')).toBeNull();
				const coverage = marking(code);
				const tokens = [...code.textContent.matchAll(componentTokens)];
				for (const token of tokens) {
					expect(
						coverage
							.slice(token.index, token.index + token[0].length)
							.every(Boolean),
						token[0],
					).toBe(true);
				}
				if (tokens.length === 0)
					expect(code.querySelector('mark')).toBeNull();
				for (const generic of code.textContent.matchAll(
					/<\/?(?:div|p|h3|span)\b[^>]*>/g,
				)) {
					expect(
						coverage
							.slice(
								generic.index,
								generic.index + generic[0].length,
							)
							.some(Boolean),
						generic[0],
					).toBe(false);
				}
			});
		}
	}
});
