const SirupClient = require('./sirup-client');
const DetailExtractor = require('./detail-extractor');
const { openDatabase } = require('../db');

class SyncManager {
    constructor() {
        this.client = new SirupClient();
        this.status = {
            isRunning: false,
            processed: 0,
            totalItems: 0,
            updated: 0,
            new: 0,
            error: null,
            startTime: null
        };
    }

    async sync() {
        if (this.status.isRunning) return;

        console.log('Starting SIRUP synchronization...');
        this.status.isRunning = true;
        this.status.startTime = new Date();
        this.status.processed = 0;
        this.status.updated = 0;
        this.status.new = 0;

        const db = openDatabase();

        try {
            await this.client.init();

            // 1. Get initial count and page info
            const firstPage = await this.client.fetchListPage(0, 50);
            this.status.totalItems = firstPage.recordsTotal;
            console.log(`Total packages to process: ${this.status.totalItems}`);

            const pageSize = 100;
            for (let start = 0; start < this.status.totalItems; start += pageSize) {
                const pageData = await this.client.fetchListPage(start, pageSize);
                
                for (const row of pageData.data) {
                    const idPaket = row[row.length - 1]; // Kode RUP usually last the hidden ID or similar
                    // In SIRUP Datatables, ID is usually at a specific index. 
                    // Based on analysis, let's assume it's extracted correctly from the row data index.
                    
                    // Actually, SIRUP DataTables rows are arrays. Let's find the ID.
                    const rupId = this.findRupId(row);
                    if (!rupId) continue;

                    const rowHash = this.client.computeHash(row);
                    
                    // Check if we need to update/scrape
                    const existing = db.prepare('SELECT list_data_hash, detail_data_hash FROM packages_sync WHERE id_paket = ?').get(rupId);

                    if (!existing || existing.list_data_hash !== rowHash) {
                        try {
                            const detailHtml = await this.client.fetchDetailPage(rupId);
                            const detailData = DetailExtractor.extract(detailHtml);
                            const detailHash = this.client.computeHash(detailData);

                            if (!existing || existing.detail_data_hash !== detailHash) {
                                this.saveToDatabase(db, rupId, rowHash, detailHash, detailData);
                                if (!existing) this.status.new++;
                                else this.status.updated++;
                            }

                            // Respectful delay
                            await new Promise(r => setTimeout(r, 1000));
                        } catch (err) {
                            console.error(`Error scraping detail for ${rupId}:`, err);
                        }
                    }

                    this.status.processed++;
                }

                console.log(`Progress: ${this.status.processed}/${this.status.totalItems} (${this.status.new} new, ${this.status.updated} updated)`);
            }

        } catch (error) {
            console.error('Sync failed:', error);
            this.status.error = error.message;
        } finally {
            this.status.isRunning = false;
            await this.client.close();
            db.close();
            console.log('Sync finished.');
        }
    }

    findRupId(row) {
        // Look for 8-digit numeric string which is typical for RUP ID
        return row.find(val => /^\d{7,9}$/.test(String(val)));
    }

    saveToDatabase(db, idPaket, listHash, detailHash, data) {
        const insertPackage = db.prepare(`
            INSERT OR REPLACE INTO packages (
                id, source_id, package_name, budget, owner_name, satker, 
                procurement_type, procurement_method, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        const insertSync = db.prepare(`
            INSERT OR REPLACE INTO packages_sync (
                id_paket, list_data_hash, detail_data_hash, last_announced_date, sync_status, last_checked, updated_at
            ) VALUES (?, ?, ?, ?, 'synced', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);

        const transaction = db.transaction(() => {
            insertPackage.run(
                idPaket,
                idPaket,
                data.namaPaket,
                this.parsePagu(data.pagu),
                data.klpd,
                data.satuanKerja,
                data.jenisPengadaan,
                data.metodePemilihan
            );
            insertSync.run(idPaket, listHash, detailHash, data.tanggalUmumkan);
        });

        transaction();
    }

    parsePagu(paguStr) {
        if (!paguStr) return 0;
        return parseFloat(paguStr.replace(/[^\d]/g, '')) || 0;
    }

    getStatus() {
        return this.status;
    }
}

// Singleton instance
module.exports = new SyncManager();
