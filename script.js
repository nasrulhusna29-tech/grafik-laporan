let barChart, lineChart;
let cachedData = {};
const spreadsheetId = '1PogbrbJAnjpP7NqogqrQbu8WkKs1g62l';
const listBulan = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGS', 'SEP', 'OKT', 'NOV', 'DES'];

// Inisialisasi Data
async function initLoad() {
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loaderText');
    
    try {
        for (let b of listBulan) {
            loaderText.innerText = `Mengambil Data Bulan ${b}...`;
            const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${b}`;
            const response = await fetch(url);
            const csvText = await response.text();
            
            const result = Papa.parse(csvText, { header: false });
            const rows = result.data;

            let dataMapping = {};
            // Start parsing from meaningful rows (index 1+)
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
        alert("Gagal sinkronisasi data. Pastikan Spreadsheet ID benar dan sudah di-'Publish to Web'.");
    } finally {
        loader.style.display = 'none';
    }
}

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
                if(cachedData[b] && cachedData[b][nama]) {
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

    document.getElementById('valL').innerText = gL.toLocaleString('id-ID');
    document.getElementById('valP').innerText = gP.toLocaleString('id-ID');
    document.getElementById('valT').innerText = gT.toLocaleString('id-ID');

    renderTable(tableData);
    renderCharts(tableData, selThn, selPoli, allPoliNames);
}

function renderTable(data) {
    data.sort((a,b) => b.t - a.t);
    document.getElementById('tableBody').innerHTML = data.map((d, i) => `
        <tr>
            <td>${i+1}</td>
            <td style="font-weight:600; color: #334155;">${d.nama}</td>
            <td>${d.l.toLocaleString('id-ID')}</td>
            <td>${d.p.toLocaleString('id-ID')}</td>
            <td><span class="badge-total">${d.t.toLocaleString('id-ID')}</span></td>
        </tr>
    `).join('');
}

function renderCharts(tableData, selThn, selPoli, allPoliNames) {
    // Bar Chart
    const ctxBar = document.getElementById('barChart');
    if (barChart) barChart.destroy();
    const top7 = [...tableData].sort((a,b) => b.t - a.t).slice(0, 7);

    barChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: top7.map(d => d.nama),
            datasets: [
                { label: 'L', data: top7.map(d => d.l), backgroundColor: '#3b82f6', borderRadius: 5 },
                { label: 'P', data: top7.map(d => d.p), backgroundColor: '#ec4899', borderRadius: 5 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // Line Chart
    const ctxLine = document.getElementById('lineChart');
    if (lineChart) lineChart.destroy();
    
    const activePoli = (selPoli === "SEMUA") ? Array.from(allPoliNames) : [selPoli];
    const targetTahun = (selThn === "SEMUA") ? ["2023","2024","2025","2026"] : [selThn];

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
                label: 'Kunjungan',
                data: lineValues,
                borderColor: '#2563eb',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(37, 99, 235, 0.1)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function exportToExcel() {
    const table = document.querySelector("table");
    const wb = XLSX.utils.table_to_book(table);
    XLSX.writeFile(wb, "Data_Kunjungan_Cilincing.xlsx");
}

initLoad();
