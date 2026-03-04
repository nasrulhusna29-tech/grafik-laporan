// Bar Chart
barChart = new Chart(ctxBar, {
    type: 'bar',
    data: {
        labels: top7.map(d => d.nama),
        datasets: [
            { label: 'L', data: top7.map(d => d.l), backgroundColor: '#0d6efd', borderRadius: 5 }, // Biru Terang
            { label: 'P', data: top7.map(d => d.p), backgroundColor: '#6ea8fe', borderRadius: 5 }  // Biru Muda
        ]
    },
    options: { /* ... */ }
});

// Line Chart
lineChart = new Chart(ctxLine, {
    type: 'line',
    data: {
        labels: listBulan,
        datasets: [{
            label: 'Kunjungan',
            data: lineValues,
            borderColor: '#0056b3', // Biru Gelap
            backgroundColor: 'rgba(13, 110, 253, 0.1)', // Transparansi Biru
            tension: 0.4,
            fill: true
        }]
    },
    options: { /* ... */ }
});
