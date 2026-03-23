(function () {
    'use strict';

    var mtdChartInstance = null;

    function destroyMtdChart() {
        if (mtdChartInstance) {
            mtdChartInstance.destroy();
            mtdChartInstance = null;
        }
    }

    function renderMtdChart(mtdPayload, opts) {
        opts = opts || {};
        var rangeStart = opts.start;
        var rangeEnd = opts.end;
        if (!rangeStart || !rangeEnd) {
            var endD = new Date();
            rangeStart = new Date(endD.getFullYear(), endD.getMonth(), 1);
            rangeEnd = endD;
        }
        function dayOnly(d) {
            return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }

        var card = document.getElementById('mtdChartCard');
        var titleEl = document.getElementById('mtdChartTitle');
        var descEl = document.getElementById('mtdChartDescription');
        var canvas = document.getElementById('mtdChartCanvas');
        if (!card || !canvas) return;
        if (!mtdPayload || !mtdPayload.success || !Array.isArray(mtdPayload.data) || mtdPayload.data.length === 0) {
            card.style.display = 'none';
            var statsRowEmpty = document.getElementById('mtdStatsRow');
            if (statsRowEmpty) statsRowEmpty.style.display = 'none';
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
        if (titleEl) titleEl.innerHTML = 'Revenue<div class="mtd-chart-amount-wrap"><span class="mtd-chart-amount">$' + totalMoney.toFixed(0) + '</span><span class="mtd-chart-pct ' + pctClass + '">' + pctStr + '</span></div>';
        descEl.textContent = mtdPayload.range || mtdPayload.mtd || '';
        card.style.display = 'block';

        var statsRow = document.getElementById('mtdStatsRow');
        var todayAmountEl = document.getElementById('mtdTodayAmount');
        var dailyAvgTitleEl = document.getElementById('mtdDailyAvgTitle');
        var dailyAvgAmountEl = document.getElementById('mtdDailyAvgAmount');
        var avgPerStationEl = document.getElementById('mtdAvgPerStationAmount');
        if (statsRow) statsRow.style.display = 'flex';

        var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        var shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var now = new Date();
        var todayStr = shortMonths[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
        var todayD = dayOnly(now);
        var rs = dayOnly(rangeStart);
        var re = dayOnly(rangeEnd);
        var todayInRange = todayD >= rs && todayD <= re;
        var todayRow = todayInRange ? data.filter(function (d) { return (d.date || '').trim() === todayStr; })[0] : null;
        var todayMoney = todayInRange && todayRow && todayRow.money != null ? todayRow.money : (todayInRange ? '$0' : '—');
        if (todayAmountEl) todayAmountEl.textContent = todayMoney;

        var sum = data.reduce(function (s, d) {
            var m = d.money;
            if (m == null || m === '') return s;
            var num = parseFloat(String(m).replace(/[$,]/g, ''), 10);
            return s + (isNaN(num) ? 0 : num);
        }, 0);
        var dailyAvg = data.length > 0 ? Math.round(sum / data.length) : 0;
        var sameMonth = rangeStart.getFullYear() === rangeEnd.getFullYear() && rangeStart.getMonth() === rangeEnd.getMonth();
        if (dailyAvgTitleEl) dailyAvgTitleEl.textContent = sameMonth ? (monthNames[rangeStart.getMonth()] + ' daily average') : 'Period daily average';
        if (dailyAvgAmountEl) dailyAvgAmountEl.textContent = '$' + dailyAvg;

        var aps = opts.avgPerStation;
        if (avgPerStationEl) {
            if (aps != null && typeof aps === 'number' && !isNaN(aps)) {
                avgPerStationEl.textContent = '$' + Math.round(aps);
            } else {
                avgPerStationEl.textContent = '—';
            }
        }

        function parseMtdDate(dStr) {
            if (!dStr || typeof dStr !== 'string') return new Date(0);
            dStr = dStr.trim();
            var isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(dStr);
            if (isoMatch) {
                var y = parseInt(isoMatch[1], 10);
                var m = parseInt(isoMatch[2], 10) - 1;
                var d = parseInt(isoMatch[3], 10);
                return new Date(y, m, d);
            }
            var comma = dStr.indexOf(',');
            var firstPart = comma > 0 ? dStr.slice(0, comma).trim() : dStr;
            var yearPart = comma > 0 ? dStr.slice(comma + 1).trim() : '';
            var year = yearPart ? parseInt(yearPart, 10) : now.getFullYear();
            var spaceIdx = firstPart.indexOf(' ');
            var monthStr = spaceIdx > 0 ? firstPart.slice(0, spaceIdx).trim() : '';
            var day = spaceIdx > 0 ? parseInt(firstPart.slice(spaceIdx + 1).trim(), 10) : 1;
            var monthIndex = shortMonths.indexOf(monthStr);
            if (monthIndex < 0) monthIndex = now.getMonth();
            return new Date(year, monthIndex, day);
        }
        data = data.slice().sort(function (a, b) {
            return parseMtdDate(a.date).getTime() - parseMtdDate(b.date).getTime();
        });

        destroyMtdChart();
        var labels = data.map(function (d) {
            var dStr = (d.date || '').trim();
            if (/^\d{4}-\d{1,2}-\d{1,2}/.test(dStr)) {
                var parsed = parseMtdDate(dStr);
                return shortMonths[parsed.getMonth()] + ' ' + parsed.getDate();
            }
            var comma = dStr.indexOf(',');
            return comma > 0 ? dStr.slice(0, comma).trim() : dStr;
        });
        function parseMoney(v) {
            if (v == null || v === '') return 0;
            var num = parseFloat(String(v).replace(/[$,]/g, ''), 10);
            return isNaN(num) ? 0 : num;
        }
        var moneyValues = data.map(function (d) { return parseMoney(d.money); });
        var pmoneyValues = data.map(function (d) { return parseMoney(d.pmoney); });
        var ctx = canvas.getContext('2d');
        var gradient = ctx.createLinearGradient(0, 0, 0, 240);
        gradient.addColorStop(0, 'rgba(0, 153, 255, 0.35)');
        gradient.addColorStop(1, 'rgba(0, 153, 255, 0.05)');

        var grey = '#737373';

        var verticalLinePlugin = {
            id: 'mtdVerticalLine',
            afterDraw: function (chart) {
                var active = chart.tooltip._active || chart.tooltip.active || (chart.tooltip.dataPoints && chart.tooltip.dataPoints.map(function (p) { return { element: p.element }; }));
                if (active && active.length && active[0].element) {
                    var ctx = chart.ctx;
                    var x = active[0].element.x;
                    var yScale = chart.scales.y;
                    var top = yScale ? yScale.top : chart.chartArea.top;
                    var bottom = yScale ? yScale.bottom : chart.chartArea.bottom;
                    ctx.save();
                    ctx.setLineDash([6, 4]);
                    ctx.strokeStyle = 'rgba(115, 115, 115, 0.8)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x, top);
                    ctx.lineTo(x, bottom);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        };

        mtdChartInstance = new window.Chart(canvas, {
            type: 'line',
            plugins: [verticalLinePlugin],
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Rents',
                        data: moneyValues,
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
                        data: pmoneyValues,
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
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: false,
                        mode: 'index',
                        intersect: false,
                        external: function (context) {
                            var el = document.getElementById('mtdChartTooltip');
                            if (!el) return;
                            var tp = context.tooltip;
                            if (tp.opacity === 0) {
                                el.classList.remove('visible');
                                el.setAttribute('aria-hidden', 'true');
                                return;
                            }
                            var i = tp.dataPoints && tp.dataPoints[0] ? tp.dataPoints[0].dataIndex : 0;
                            var row = data[i];
                            if (!row) {
                                el.classList.remove('visible');
                                return;
                            }
                            var dateStr = (labels[i] || '').trim();
                            var moneyStr = row.money != null && row.money !== '' ? String(row.money) : '$0';
                            var pmoneyStr = row.pmoney != null && row.pmoney !== '' ? String(row.pmoney) : '$0';
                            var moneyNum = parseFloat(String(moneyStr).replace(/[$,]/g, ''), 10) || 0;
                            var pmoneyNum = parseFloat(String(pmoneyStr).replace(/[$,]/g, ''), 10) || 0;
                            var ref = Math.abs(pmoneyNum);
                            var pct = ref === 0 ? 0 : ((moneyNum - pmoneyNum) / ref) * 100;
                            var pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
                            var pctClass = pct >= 0 ? 'chart-tooltip-pct-positive' : 'chart-tooltip-pct-negative';
                            var prevDateStr = dateStr;
                            (function () {
                                var dStr = (row.date || '').trim();
                                var comma = dStr.indexOf(',');
                                var firstPart = comma > 0 ? dStr.slice(0, comma).trim() : dStr;
                                var yearPart = comma > 0 ? dStr.slice(comma + 1).trim() : '';
                                var year = yearPart ? parseInt(yearPart, 10) : now.getFullYear();
                                var spaceIdx = firstPart.indexOf(' ');
                                var monthStr = spaceIdx > 0 ? firstPart.slice(0, spaceIdx).trim() : '';
                                var day = spaceIdx > 0 ? parseInt(firstPart.slice(spaceIdx + 1).trim(), 10) : 1;
                                var monthIndex = shortMonths.indexOf(monthStr);
                                if (monthIndex < 0) monthIndex = now.getMonth();
                                var prevDate = new Date(year, monthIndex - 1, day);
                                prevDateStr = shortMonths[prevDate.getMonth()] + ' ' + prevDate.getDate();
                            })();
                            el.innerHTML =
                                '<div class="chart-tooltip-header">' +
                                '<span>Net volume</span>' +
                                '<span class="chart-tooltip-pct ' + pctClass + '">' + pctStr + '</span>' +
                                '</div>' +
                                '<div class="chart-tooltip-divider"></div>' +
                                '<div class="chart-tooltip-body">' +
                                '<div class="chart-tooltip-row">' +
                                '<span class="chart-tooltip-square blue"></span>' +
                                '<span class="chart-tooltip-date">' + dateStr + '</span>' +
                                '<span class="chart-tooltip-value">' + moneyStr + '</span>' +
                                '</div>' +
                                '<div class="chart-tooltip-row">' +
                                '<span class="chart-tooltip-square grey"></span>' +
                                '<span class="chart-tooltip-date">' + prevDateStr + '</span>' +
                                '<span class="chart-tooltip-value">' + pmoneyStr + '</span>' +
                                '</div>' +
                                '</div>';
                            el.classList.add('visible');
                            el.setAttribute('aria-hidden', 'false');
                            var wrap = el.parentElement;
                            var canvas = context.chart.canvas;
                            if (wrap && canvas) {
                                var rect = canvas.getBoundingClientRect();
                                var wrapRect = wrap.getBoundingClientRect();
                                var caretX = tp.caretX != null ? tp.caretX : tp.x;
                                var caretY = tp.caretY != null ? tp.caretY : tp.y;
                                var left = rect.left - wrapRect.left + caretX;
                                var top = rect.top - wrapRect.top + caretY;
                                var w = el.offsetWidth || 180;
                                var h = el.offsetHeight || 80;
                                el.style.left = Math.max(8, Math.min(left - w / 2, wrap.offsetWidth - w - 8)) + 'px';
                                el.style.top = (top - h - 10) + 'px';
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
