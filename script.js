let barChart, lineChart;
let cachedData = {};
const spreadsheetId = '1PogbrbJAnjpP7NqogqrQbu8WkKs1g62l';
const listBulan = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGS', 'SEP', 'OKT', 'NOV', 'DES'];
const listTahun = ["2023", "2024", "2025", "2026"];

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
            // Mulai dari baris ke-2 (index 1) untuk melewati header
            for (let i = 1; i < rows.length; i++) {
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
        console.error(e);
        alert("Gagal memuat data. Pastikan Google Sheets sudah 'Publish to Web'.");
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
}

function updatePoliDropdown() {
    const select = document.getElementById('filterPoli');
    let allPoli = new Set();
    // Ambil semua nama poli unik dari semua bulan yang tersedia
    Object.values(cachedData).forEach(db => {
        Object.keys(db).forEach(p => allPoli.add(p));
    });

    // Urutkan abjad dan tambahkan ke dropdown
    [...allPoli].sort().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.innerText = p;
        select.appendChild(opt);
    });
}

function applyFilters() {
    const selThn = document.getElementById('tahun').value;
    const selBln = document.getElementById('bulan').value;
    const selPoli = document.getElementById('filterPoli').value;

    let tableData = [];
    let allPoliNames = new Set();
    Object.values(cachedData).forEach(db => Object.keys(db).forEach(p => allPoliNames.add(p)));
    
    // Tentukan daftar poli yang akan diproses
    let poliList = (selPoli === "SEMUA") ? Array.from(allPoliNames) : [selPoli];
    
    // Tentukan daftar bulan yang akan diproses
    const targetBulan = (selBln === "SEMUA") ? listBulan : [selBln];
    
    // Tentukan daftar tahun yang akan diproses
    const targetTahun = (selThn === "SEMUA") ? listTahun : [selThn];

    let globalL = 0, globalP = 0, globalT = 0;

    poliList.forEach(nama => {
        let sumL = 0, sumP = 0, sumT = 0;

        targetBulan.forEach(b => {
            targetTahun.forEach(t => {
                if(cachedData[b] && cachedData[b][nama]) {
                    const data = cachedData[b][nama][t];
                    sumL += data.l;
                    sumP += data.p;
                    sumT += data.t;
                }
            });
        });

        if(sumT > 0) {
            tableData.push({ nama, l: sumL, p: sumP, t: sumT });
            globalL += sumL;
            globalP += sumP;
            globalT += sumT;
        }
    });

    // Update Angka Statistik Utama
    document.getElementById('valL').innerText = globalL.toLocaleString('id-ID');
    document.getElementById('valP').innerText = globalP.toLocaleString('id-ID');
    document.getElementById('valT').innerText = globalT.toLocaleString('id-ID');

    renderTable(tableData);
    renderCharts(tableData, targetTahun, selPoli, allPoliNames);
}

function renderTable(data) {
    // Urutkan berdasarkan total terbanyak
    data.sort((a,b) => b.t - a.t);
    
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = data.map((d, i) => `
        <tr>
            <td>${i+1}</td>
            <td class="fw-bold">${d.nama}</td>
            <td>${d.l.toLocaleString('id-ID')}</td>
            <td>${d.p.toLocaleString('id-ID')}</td>
            <td><span class="badge-blue">${d.t.toLocaleString('id-ID')}</span></td>
        </tr>
    `).join('');
}

function renderCharts(tableData, targetTahun, selPoli, allPoliNames) {
    // 1. BAR CHART (Top 7 Layanan)
    const ctxBar = document.getElementById('barChart').getContext('2d');
    if (barChart) barChart.destroy();
    
    const top7 = [...tableData].sort((a,b) => b.t - a.t).slice(0, 7);
    
    barChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: top7.map(d => d.nama),
            datasets: [
                { label: 'Laki-laki', data: top7.map(d => d.l), backgroundColor: '#0d6efd', borderRadius: 5 },
                { label: 'Perempuan', data: top7.map(d => d.p), backgroundColor: '#6ea8fe', borderRadius: 5 }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // 2. LINE CHART (Tren Bulanan)
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    if (lineChart) lineChart.destroy();

    const activePoli = (selPoli === "SEMUA") ? Array.from(allPoliNames) : [selPoli];
    
    let lineValues = listBulan.map(b => {
        let sumBulan = 0;
        activePoli.forEach(p => {
            targetTahun.forEach(t => {
                if(cachedData[b] && cachedData[b][p]) {
                    sumBulan += cachedData[b][p][t].t;
                }
            });
        });
        return sumBulan;
    });

    lineChart = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: listBulan,
            datasets: [{
                label: 'Total Kunjungan',
                data: lineValues,
                borderColor: '#0056b3',
                backgroundColor: 'rgba(0, 86, 179, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#0056b3'
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function exportToExcel() {
    const table = document.querySelector("table");
    const wb = XLSX.utils.table_to_book(table);
    const thn = document.getElementById('tahun').value;
    const bln = document.getElementById('bulan').value;
    XLSX.writeFile(wb, `Laporan_Kunjungan_${thn}_${bln}.xlsx`);
}

// Jalankan saat halaman dimuat
initLoad();
