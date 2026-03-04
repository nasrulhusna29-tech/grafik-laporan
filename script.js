let barChart, lineChart;
let cachedData = {};
const spreadsheetId = '1PogbrbJAnjpP7NqogqrQbu8WkKs1g62l';
const listBulan = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGS', 'SEP', 'OKT', 'NOV', 'DES'];

// Fungsi Inisialisasi Saat Halaman Dimuat
async function initLoad() {
    document.getElementById('loader').style.display = 'flex';
    try {
        for (let b of listBulan) {
            document.getElementById('loaderText').innerText = `Sinkronisasi Data ${b}...`;
            const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${b}`;
            const response = await fetch(url);
            const csvText = await response.text();
            
            const result = Papa.parse(csvText, { header: false });
            const rows = result.data;

            let dataMapping = {};
            // Pengambilan data dimulai dari baris ke-14 (indeks 13)
            for (let i = 10; i < rows.length; i++) {
                const r = rows[i];
                if (r[1] && r[1].trim() !== "" && !r[1].includes("TOTAL")) {
                    const namaPoli = r[1].trim();
                    dataMapping[namaPoli] = {
                        "2023": { l: parseInt(r[2])||0, p: parseInt(r[3])||0, t: parseInt(r[4])||0 },
                        "2024": { l: parseInt(r[5])||0, p: parseInt(r[6])||0, t: parseInt(r[7])||0 },
                        "2025": { l: parseInt(r[8])||0, p: parseInt(r[9])||0, t: parseInt(r[10])||0 },
                        "2026": { l: parseInt(r[11])||0, p: parseInt(r[12])||0, t: parseInt(r[13])||0 }
                    };
                }
            }
            cachedData[b] = dataMapping;
        }
        updatePoliDropdown();
        applyFilters();
    } catch (e) {
        alert("Gagal memuat data. Periksa koneksi internet atau Spreadsheet ID Anda.");
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
}

// Mengisi Pilihan Poli Secara Dinamis
function updatePoliDropdown() {
    const select = document.getElementById('filterPoli');
    let allPoli = new Set();
    Object.values(cachedData).forEach(db => Object.keys(db).forEach(p => allPoli.add(p)));
    [...allPoli].sort().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p; opt.innerText = p;
        select.appendChild(opt);
    });
}

// Menghitung Ulang Data Berdasarkan Filter Sidebar
function applyFilters() {
    const selThn = document.getElementById('tahun').value;
    const selBln = document.getElementById('bulan').value;
    const selPoli = document.getElementById('filterPoli').value;

    let tableData = [];
    let allPoliNames = new Set();
    Object.values(cachedData).forEach(db => Object.keys(db).forEach(p => allPoliNames.add(p)));
    
    let poliList = (selPoli === "SEMUA") ? Array.from(allPoliNames) : [selPoli];
    let gL = 0, gP = 0, gT = 0;

    poliList.forEach(nama => {
        let sL = 0, sP = 0, sT = 0;
        const targetBulan = (selBln === "SEMUA") ? listBulan : [selBln];
        const targetTahun = (selThn === "SEMUA") ? ["2023","2024","2025","2026"] : [selThn];

        targetBulan.forEach(b => {
            targetTahun.forEach(t => {
                if(cachedData[b][nama]) {
                    sL += cachedData[b][nama][t].l;
                    sP += cachedData[b][nama][t].p;
                    sT += cachedData[b][nama][t].t;
                }
            });
        });
        if(sT > 0) {
            tableData.push({ nama, l: sL, p: sP, t: sT });
            gL += sL; gP += sP; gT += sT;
        }
    });

    document.getElementById('valL').innerText = gL.toLocaleString();
    document.getElementById('valP').innerText = gP.toLocaleString();
    document.getElementById('valT').innerText = gT.toLocaleString();

    renderTable(tableData);
    renderCharts(tableData, selThn, selPoli, allPoliNames);
}

// Render Tabel Detail
function renderTable(data) {
    data.sort((a,b) => b.t - a.t);
    document.getElementById('tableBody').innerHTML = data.map((d, i) => `
        <tr>
            <td>${i+1}</td>
            <td style="font-weight:600;">${d.nama}</td>
            <td>${d.l.toLocaleString()}</td>
            <td>${d.p.toLocaleString()}</td>
            <td><span class="badge-total">${d.t.toLocaleString()}</span></td>
        </tr>
    `).join('');
}

// Render Grafik Batang dan Garis
function renderCharts(tableData, selThn, selPoli, allPoliNames) {
    // BAR CHART
    const ctxBar = document.getElementById('barChart').getContext('2d');
    if (barChart) barChart.destroy();
    const top7 = [...tableData].sort((a,b) => b.t - a.t).slice(0, 7);
    barChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: top7.map(d => d.nama),
            datasets: [
                { label: 'Laki-laki', data: top7.map(d => d.l), backgroundColor: '#3b82f6' },
                { label: 'Perempuan', data: top7.map(d => d.p), backgroundColor: '#ec4899' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // LINE CHART
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    if (lineChart) lineChart.destroy();
    const activePoli = (selPoli === "SEMUA") ? Array.from(allPoliNames) : [selPoli];
    const targetTahun = (selThn === "SEMUA") ? ["2023","2024","2025","2026"] : [selThn];

    let lineValues = listBulan.map(b => {
        let sum = 0;
        activePoli.forEach(p => targetTahun.forEach(t => { if(cachedData[b][p]) sum += cachedData[b][p][t].t; }));
        return sum;
    });

    lineChart = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: listBulan,
            datasets: [{
                label: 'Total Kunjungan',
                data: lineValues,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Fungsi Ekspor Excel
function exportToExcel() {
    const wb = XLSX.utils.table_to_book(document.querySelector("table"));
    XLSX.writeFile(wb, "Laporan_Kunjungan_Puskesmas.xlsx");
}

// Jalankan Load Data Pertama Kali
initLoad();
