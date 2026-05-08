const { chromium } = require('playwright');
const crypto = require('crypto');

class SirupClient {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.baseUrl = 'https://sirup.inaproc.id';
    }

    async init() {
        console.log('Initializing browser...');
        this.browser = await chromium.launch({ headless: true });
        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        });
        this.page = await this.context.newPage();
        
        // Initial navigation to set cookies and session
        await this.page.goto(`${this.baseUrl}/sirup/caripaketctr/index`, { waitUntil: 'networkidle' });
        console.log('Session established.');
    }

    async fetchListPage(start = 0, length = 100) {
        console.log(`Fetching list page starting from ${start}...`);
        
        // The Cari Paket page uses server-side DataTables
        // We can trigger an AJAX request by evaluating in the page context
        // OR we can observe the network to get the exact endpoint
        
        const response = await this.page.evaluate(async (args) => {
            const { start, length } = args;
            const res = await fetch('/sirup/caripaketctr/datatable', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: new URLSearchParams({
                    draw: 1,
                    start: start,
                    length: length,
                    'order[0][column]': 0,
                    'order[0][dir]': 'asc'
                })
            });
            return res.json();
        }, { start, length });

        return response;
    }

    async fetchDetailPage(idPaket) {
        const url = `${this.baseUrl}/sirup/rup/detailPaketPenyedia2020?idPaket=${idPaket}`;
        console.log(`Fetching details for package ${idPaket}...`);
        
        const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        if (response.status() !== 200) {
            throw new Error(`Failed to fetch detail page for ${idPaket}: ${response.status()}`);
        }
        
        const html = await this.page.content();
        return html;
    }

    computeHash(data) {
        return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

module.exports = SirupClient;
