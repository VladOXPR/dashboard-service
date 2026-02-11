(function () {
    'use strict';

    var mtdChartInstance = null;

    function destroyMtdChart() {
        if (mtdChartInstance) {
            mtdChartInstance.destroy();
            mtdChartInstance = null;
        }
    }

    function renderMtdChart(mtdPayload) {
        var card = document.getElementById('mtdChartCard');
        var titleEl = document.getElementById('mtdChartTitle');
        var descEl = document.getElementById('mtdChartDescription');
        var canvas = document.getElementById('mtdChartCanvas');
        if (!card || !canvas) return;
        if (!mtdPayload || !mtdPayload.success || !Array.isArray(mtdPayload.data) || mtdPayload.data.length === 0) {
            card.style.display = 'none';
            return;
        }
        var data = mtdPayload.data;
        var totalMoney = data.reduce(function (sum, d) {
            var m = d.money;
            if (m == null || m === '') return sum;
            var num = parseFloat(String(m).replace(/[$,]/g, ''), 10);
            return sum + (isNaN(num) ? 0 : num);
        }, 0);
        if (titleEl) titleEl.innerHTML = 'Month to date<div class="mtd-chart-amount">$' + totalMoney.toFixed(0) + '</div>';
        descEl.textContent = mtdPayload.mtd || 'Month to date';
        card.style.display = 'block';

        destroyMtdChart();
        var labels = data.map(function (d) {
            var dStr = (d.date || '').trim();
            var comma = dStr.indexOf(',');
            return comma > 0 ? dStr.slice(0, comma).trim() : dStr;
        });
        var rents = data.map(function (d) { return d.rents != null ? d.rents : 0; });
        var ctx = canvas.getContext('2d');
        var gradient = ctx.createLinearGradient(0, 0, 0, 240);
        gradient.addColorStop(0, 'rgba(0, 153, 255, 0.35)');
        gradient.addColorStop(1, 'rgba(0, 153, 255, 0.05)');

        mtdChartInstance = new window.Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Rents',
                    data: rents,
                    borderColor: '#0099FF',
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#0099FF',
                    pointBorderColor: '#000',
                    pointBorderWidth: 1,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: function (context) {
                                var i = context.dataIndex;
                                var row = data[i];
                                return row && row.money != null ? 'Revenue: ' + row.money : '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#737373',
                            maxRotation: 0,
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { display: false },
                        ticks: {
                            display: false,
                            stepSize: 20
                        }
                    }
                }
            }
        });
    }

    window.Charts = {
        renderMtdChart: renderMtdChart,
        destroyMtdChart: destroyMtdChart
    };
})();
