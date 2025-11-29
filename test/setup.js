import { beforeAll } from 'vitest';
import { PullToRefreshElement } from '../pull-to-refresh.js';

// Define the custom element before tests run
beforeAll(() => {
	if (!customElements.get('pull-to-refresh')) {
		customElements.define('pull-to-refresh', PullToRefreshElement);
	}

	// Make the class available globally for testing static methods
	globalThis.PullToRefreshElement = PullToRefreshElement;
});
