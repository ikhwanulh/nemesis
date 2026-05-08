(function() {
    const syncBtn = document.getElementById('syncBtn');
    const statusEl = document.getElementById('scraperStatus');
    const apiHost = ''; // Same host

    let pollingInterval = null;

    async function checkStatus() {
        try {
            const res = await fetch(`${apiHost}/api/scraper/status`);
            const status = await res.json();

            if (status.isRunning) {
                syncBtn.disabled = true;
                syncBtn.classList.add('loading');
                const progress = status.totalItems > 0 ? Math.round((status.processed / status.totalItems) * 100) : 0;
                statusEl.innerHTML = `Syncing... ${progress}% (${status.new} new, ${status.updated} updated)`;
                
                if (!pollingInterval) {
                    pollingInterval = setInterval(checkStatus, 3000);
                }
            } else {
                syncBtn.disabled = false;
                syncBtn.classList.remove('loading');
                if (status.startTime) {
                    const date = new Date(status.startTime).toLocaleTimeString();
                    statusEl.innerHTML = status.error ? `<span class="error">Error: ${status.error}</span>` : `Last Sync: ${date}`;
                }
                
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                    // Optionally refresh the dashboard data if sync was successful
                    if (typeof window.initDashboard === 'function' && !status.error) {
                        window.initDashboard();
                    }
                }
            }
        } catch (err) {
            console.error('Failed to fetch scraper status:', err);
        }
    }

    syncBtn.addEventListener('click', async () => {
        if (confirm('Start comprehensive data synchronization from SiRUP? This might take a while.')) {
            try {
                const res = await fetch(`${apiHost}/api/scraper/sync`, { method: 'POST' });
                const data = await res.json();
                console.log('Sync triggered:', data);
                statusEl.innerHTML = 'Starting sync...';
                checkStatus();
            } catch (err) {
                alert('Failed to start sync: ' + err.message);
            }
        }
    });

    // Check status on load
    checkStatus();
})();
