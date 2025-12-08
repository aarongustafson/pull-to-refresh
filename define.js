import { PullToRefreshElement } from './pull-to-refresh.js';

export function definePullToRefresh(tagName = 'pull-to-refresh') {
	const hasWindow = typeof window !== 'undefined';
	const registry = hasWindow ? window.customElements : undefined;

	if (!registry || typeof registry.define !== 'function') {
		return false;
	}

	if (!registry.get(tagName)) {
		registry.define(tagName, PullToRefreshElement);
	}

	return true;
}

definePullToRefresh();
