// The form still reloads the document if enhancement is unavailable.
document.addEventListener('submit', (event) => {
	if (!event.target.matches('[data-refresh]')) return;
	const component = document.querySelector('pull-to-refresh');
	if (typeof component?.triggerRefresh !== 'function') return;
	event.preventDefault();
	if (!component.isRefreshing) component.triggerRefresh();
});
