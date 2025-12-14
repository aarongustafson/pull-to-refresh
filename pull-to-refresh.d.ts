export interface PullToRefreshTranslationSet {
	indicator: string;
	release: string;
	refreshing: string;
}

export interface PullToRefreshRefreshDetail {
	complete: () => void;
}

export type PullToRefreshRefreshEvent = CustomEvent<PullToRefreshRefreshDetail>;

export declare class PullToRefreshElement extends HTMLElement {
	static registerTranslations(
		translations: Record<string, PullToRefreshTranslationSet>,
	): void;

	threshold: number;
	indicatorText: string;
	releaseText: string;
	refreshingText: string;
	disabled: boolean;
	disableSelection: boolean;
	readonly indicatorHeight: number;

	triggerRefresh(): Promise<void>;
	completeRefresh(): void;
}

export declare function definePullToRefresh(tagName?: string): boolean;

declare global {
	interface HTMLElementTagNameMap {
		'pull-to-refresh': PullToRefreshElement;
	}
}
