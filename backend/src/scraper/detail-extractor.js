const cheerio = require('cheerio');

class DetailExtractor {
    static extract(html) {
        const $ = cheerio.load(html);
        const data = {};

        // Helper to extract value from a table by label
        const getValueByLabel = (label) => {
            const row = $('tr').filter((i, el) => $(el).find('th, td').first().text().trim().includes(label));
            return row.find('td').eq(1).text().trim() || row.find('td').last().text().trim();
        };

        data.kodeRup = getValueByLabel('Kode RUP');
        data.namaPaket = getValueByLabel('Nama Paket');
        data.tahunAnggaran = getValueByLabel('Tahun Anggaran');
        data.klpd = getValueByLabel('Nama KLPD');
        data.satuanKerja = getValueByLabel('Satuan Kerja');
        data.pagu = getValueByLabel('Total Pagu');
        data.metodePemilihan = getValueByLabel('Metode Pemilihan');
        data.jenisPengadaan = getValueByLabel('Jenis Pengadaan');
        data.tanggalUmumkan = getValueByLabel('Tanggal Umumkan Paket');

        // Extracting Funding Source Table
        const fundingSources = [];
        const fundingTable = $('h5:contains("Sumber Dana")').parent().find('table');
        fundingTable.find('tbody tr').each((i, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 5) {
                fundingSources.push({
                    sumberDana: $(cols[1]).text().trim(),
                    ta: $(cols[2]).text().trim(),
                    klpd: $(cols[3]).text().trim(),
                    pagu: $(cols[4]).text().trim()
                });
            }
        });
        data.fundingSources = fundingSources;

        // Extracting Location Table
        const locations = [];
        const locationTable = $('h5:contains("Lokasi Pekerjaan")').parent().find('table');
        locationTable.find('tbody tr').each((i, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 3) {
                locations.push({
                    provinsi: $(cols[1]).text().trim(),
                    kabupatenKota: $(cols[2]).text().trim(),
                    detail: $(cols[3]).text().trim()
                });
            }
        });
        data.locations = locations;

        return data;
    }
}

module.exports = DetailExtractor;
