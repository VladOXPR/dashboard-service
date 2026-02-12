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
        var ref = (mtdPayload.ppositive != null ? Number(mtdPayload.ppositive) : 0) + (mtdPayload.pnegative != null ? Number(mtdPayload.pnegative) : 0);
        var pct = (ref === 0) ? 0 : ((totalMoney - ref) / Math.abs(ref)) * 100;
        var pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
        var pctClass = pct >= 0 ? 'mtd-chart-pct-positive' : 'mtd-chart-pct-negative';
        if (titleEl) titleEl.innerHTML = 'Month to date<div class="mtd-chart-amount-wrap"><span class="mtd-chart-amount">$' + totalMoney.toFixed(0) + '</span><span class="mtd-chart-pct ' + pctClass + '">' + pctStr + '</span></div>';
        descEl.textContent = mtdPayload.mtd || 'Month to date';
        card.style.display = 'block';

        var statsRow = document.getElementById('mtdStatsRow');
        var todayAmountEl = document.getElementById('mtdTodayAmount');
        var dailyAvgTitleEl = document.getElementById('mtdDailyAvgTitle');
        var dailyAvgAmountEl = document.getElementById('mtdDailyAvgAmount');
        if (statsRow) statsRow.style.display = 'flex';

        var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        var shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var now = new Date();
        var todayStr = shortMonths[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
        var todayRow = data.filter(function (d) { return (d.date || '').trim() === todayStr; })[0];
        var todayMoney = todayRow && todayRow.money != null ? todayRow.money : '$0';
        if (todayAmountEl) todayAmountEl.textContent = todayMoney;

        var sum = data.reduce(function (s, d) {
            var m = d.money;
            if (m == null || m === '') return s;
            var num = parseFloat(String(m).replace(/[$,]/g, ''), 10);
            return s + (isNaN(num) ? 0 : num);
        }, 0);
        var dailyAvg = data.length > 0 ? Math.round(sum / data.length) : 0;
        if (dailyAvgTitleEl) dailyAvgTitleEl.textContent = monthNames[now.getMonth()] + ' daily average';
        if (dailyAvgAmountEl) dailyAvgAmountEl.textContent = '$' + dailyAvg;

        destroyMtdChart();
        var labels = data.map(function (d) {
            var dStr = (d.date || '').trim();
            var comma = dStr.indexOf(',');
            return comma > 0 ? dStr.slice(0, comma).trim() : dStr;
        });
        var rents = data.map(function (d) { return d.rents != null ? d.rents : 0; });
        var prents = data.map(function (d) { return d.prents != null ? d.prents : 0; });
        var ctx = canvas.getContext('2d');
        var gradient = ctx.createLinearGradient(0, 0, 0, 240);
        gradient.addColorStop(0, 'rgba(0, 153, 255, 0.35)');
        gradient.addColorStop(1, 'rgba(0, 153, 255, 0.05)');

        var grey = '#737373';

        mtdChartInstance = new window.Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
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
                    },
                    {
                        label: 'Previous month',
                        data: prents,
                        borderColor: grey,
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.4,
                        pointBackgroundColor: grey,
                        pointBorderColor: '#000',
                        pointBorderWidth: 1,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }
                ]
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
                                if (!row) return '';
                                var parts = [];
                                if (context.datasetIndex === 0 && row.money != null) parts.push('Revenue: ' + row.money);
                                if (context.datasetIndex === 1 && row.pmoney != null) parts.push('Prev revenue: ' + row.pmoney);
                                return parts.length ? parts.join('\n') : '';
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
