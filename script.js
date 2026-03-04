/**
 * DHIS Dashboard - Puskesmas Kecamatan Cilincing
 * Theme: Blue Cyan Modern
 */

let barChart, lineChart;
let cachedData = {};
const spreadsheetId = '1PogbrbJAnjpP7NqogqrQbu8WkKs1g62l';
const listBulan = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGS', 'SEP', 'OKT', 'NOV', 'DES'];
const listTahun = ["2023", "2024", "2025", "2026"];

// 1. Inisialisasi & Ambil Data dari Google Sheets
async function initLoad() {
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loaderText');
    
    try {
        loader.style.display = 'flex';
        
        for (let b of listBulan) {
            loaderText.innerText = `Mensinkronkan Data: ${b}...`;
            
            // Fetch data per sheet (per bulan)
            const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${b}`;
            const response = await fetch(url);
            const csvText = await response.text();
            
            const result = Papa.parse(csvText, { header: false });
            const rows = result.data;

            let dataMapping = {};
            // Mulai loop dari baris data (index 1+)
            for (let i = 1; i < rows.length; i++) {
                const r = rows[i];
                // Pastikan kolom Nama Poli (index 1) tidak kosong
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
        applyFilters(); // Jalankan filter pertama kali (default)
        
    } catch (e) {
        console.error("Error Loading Data:", e);
        alert("Gagal memuat data. Pastikan Spreadsheet sudah di-set 'Public' dan 'Publish to Web'.");
    } finally {
        loader.style.display = 'none';
    }
}

// 2. Mengisi Dropdown Poli secara otomatis berdasarkan data yang ada
function updatePoliDropdown() {
    const select = document.getElementById('filterPoli');
    let allPoli = new Set();
    
    // Ambil semua nama poli unik dari cache
    Object.values(cachedData).forEach(db => {
        Object.keys(db).forEach(p => allPoli.add(p));
    });
    
    // Urutkan dan masukkan ke elemen select
    [...allPoli].sort().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p; 
        opt.innerText = p;
        select.appendChild(opt);
    });
}

// 3. Logika Filter (Tahun, Bulan, Poli)
function applyFilters() {
    const selThn = document.getElementById('tahun').value;
    const selBln = document.getElementById('bulan').value;
    const selPoli = document.getElementById('filterPoli').value;

    let tableData = [];
    let allPoliNames = new Set();
    Object.values(cachedData).forEach(db => Object.keys(db).forEach(p => allPoliNames.add(p)));
    
    // Tentukan range filter
    let poliList = (selPoli === "SEMUA") ? Array.from(allPoliNames) : [selPoli];
    const targetBulan = (selBln === "SEMUA") ? listBulan : [selBln];
    const targetTahun = (selThn === "SEMUA") ? listTahun : [selThn];

    let gL = 0, gP = 0, gT = 0;

    poliList.forEach(nama => {
        let sL = 0, sP = 0, sT = 0;

        targetBulan.forEach(b => {
            targetTahun.forEach(t => {
                if(cachedData[b] && cachedData[b][nama]) {
                    const data = cachedData[b][nama][t];
                    sL += data.l;
                    sP += data.p;
                    sT += data.t;
                }
            });
        });

        if(sT > 0) {
            tableData.push({ nama, l: sL, p: sP, t: sT });
            gL += sL; gP += sP; gT += sT;
        }
    });

    // Update UI Statistik (Angka Utama)
    document.getElementById('valL').innerText = gL.toLocaleString('id-ID');
    document.getElementById('valP').innerText = gP.toLocaleString('id-ID');
    document.getElementById('valT').innerText = gT.toLocaleString('id-ID');

    renderTable(tableData);
    renderCharts(tableData, selThn, selPoli, allPoliNames);
}

// 4. Render Tabel Rincian
function renderTable(data) {
    data.sort((a,b) => b.t - a.t); // Urutkan dari kunjungan terbanyak
    const tbody = document.getElementById('tableBody');
    
    tbody.innerHTML = data.map((d, i) => `
        <tr>
            <td>${i+1}</td>
            <td style="font-weight:700; color: #003366;">${d.nama}</td>
            <td>${d.l.toLocaleString('id-ID')}</td>
            <td>${d.p.toLocaleString('id-ID')}</td>
            <td><span class="badge-blue">${d.t.toLocaleString('id-ID')}</span></td>
        </tr>
    `).join('');
}

// 5. Render Chart (Bar & Line) dengan Tema Blue Cyan
function renderCharts(tableData, selThn, selPoli, allPoliNames) {
    // BAR CHART: Top 7 Layanan
    const ctxBar = document.getElementById('barChart').getContext('2d');
    if (barChart) barChart.destroy();
    
    const top7 = [...tableData].sort((a,b) => b.t - a.t).slice(0, 7);

    barChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: top7.map(d => d.nama),
            datasets: [
                { 
                    label: 'Laki-laki', 
                    data: top7.map(d => d.l), 
                    backgroundColor: '#0ea5e9', // Deep Cyan
                    borderRadius: 6 
                },
                { 
                    label: 'Perempuan', 
                    data: top7.map(d => d.p), 
                    backgroundColor: '#22d3ee', // Light Cyan
                    borderRadius: 6 
                }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { position: 'bottom', labels: { usePointStyle: true, font: { family: 'Inter' } } } 
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });

    // LINE CHART: Tren Bulanan
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    if (lineChart) lineChart.destroy();
    
    const activePoli = (selPoli === "SEMUA") ? Array.from(allPoliNames) : [selPoli];
    const targetTahun = (selThn === "SEMUA") ? listTahun : [selThn];

    const lineValues = listBulan.map(b => {
        let sum = 0;
        activePoli.forEach(p => {
            targetTahun.forEach(t => {
                if(cachedData[b] && cachedData[b][p]) sum += cachedData[b][p][t].t;
            });
        });
        return sum;
    });

    lineChart = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: listBulan,
            datasets: [{
                label: 'Total Kunjungan',
                data: lineValues,
                borderColor: '#0891b2', // Cyan Dark
                borderWidth: 3,
                backgroundColor: 'rgba(34, 211, 238, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#0891b2'
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { display: false } 
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// 6. Fungsi Export ke Excel
function exportToExcel() {
    const table = document.querySelector("table");
    const wb = XLSX.utils.table_to_book(table);
    const thn = document.getElementById('tahun').value;
    const bln = document.getElementById('bulan').value;
    
    XLSX.writeFile(wb, `Laporan_DHIS_Cilincing_${thn}_${bln}.xlsx`);
}

// Jalankan Inisialisasi saat script dimuat
initLoad();
