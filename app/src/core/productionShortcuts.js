function isDevelopmentRun() {
    const args = window.NL_ARGS;
    const joinedArgs = Array.isArray(args) ? args.join(' ') : String(args || '');
    return joinedArgs.includes('--neu-dev-auto-reload');
}

export function disableProductionRefreshShortcuts() {
    if (isDevelopmentRun()) return;

    window.addEventListener('keydown', event => {
        const isRefresh = event.key === 'F5'
            || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r');

        if (isRefresh) event.preventDefault();
    });
}
