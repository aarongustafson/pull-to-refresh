import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
	copyFileSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { it, expect } from 'vitest';

function displayedCodeHash(html) {
	const texts = [...html.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code\s*>/g)].map(
		([, contents]) => {
			const code = document.createElement('code');
			code.innerHTML = contents;
			return code.textContent;
		},
	);
	return createHash('sha256').update(JSON.stringify(texts)).digest('hex');
}

it('preserves release scripts and highlighting text hashes through future CDN version updates without bumping the package', () => {
	const root = resolve(`.release-check-${randomUUID()}`);
	const originalDemo = readFileSync('demo/esm.html', 'utf8');
	const originalCodeHash = displayedCodeHash(originalDemo);
	try {
		mkdirSync(root);
		mkdirSync(join(root, 'scripts'));
		mkdirSync(join(root, 'demo'));
		const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
		expect(pkg.scripts.version).toBe(
			'node scripts/update-demo-versions.js && git add demo/esm.html',
		);
		expect(pkg.scripts.postversion).toBe('git push --follow-tags');
		writeFileSync(
			join(root, 'package.json'),
			JSON.stringify({ ...pkg, version: '9.8.7' }),
		);
		for (const path of ['scripts/update-demo-versions.js', 'demo/esm.html'])
			copyFileSync(path, join(root, path));
		execFileSync(process.execPath, ['scripts/update-demo-versions.js'], {
			cwd: root,
		});
		const updatedDemo = readFileSync(join(root, 'demo/esm.html'), 'utf8');
		expect(updatedDemo).toContain('pull-to-refresh@9.8.7/');
		expect(updatedDemo).not.toBe(originalDemo);
		expect(displayedCodeHash(updatedDemo)).toBe(originalCodeHash);
		expect(
			displayedCodeHash(
				updatedDemo.replace(
					'<code>esm.sh</code>',
					'<code>changed provider label</code>',
				),
			),
		).not.toBe(originalCodeHash);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
