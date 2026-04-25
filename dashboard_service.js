(function () {
    const STORAGE_KEY = 'cuub_user';

    function getUser() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function redirectToLogin() {
        sessionStorage.removeItem(STORAGE_KEY);
        window.location.href = '/login';
    }

    function formatDateRange(start, end) {
        function pad(n) { return String(n).padStart(2, '0'); }
        const s = start.getFullYear() + '-' + pad(start.getMonth() + 1) + '-' + pad(start.getDate());
        const e = end.getFullYear() + '-' + pad(end.getMonth() + 1) + '-' + pad(end.getDate());
        return s + '_' + e;
    }

    function getPerformanceDateRangeModule() {
        return window.PerformanceDateRange && window.PerformanceDateRange.getModule
            ? window.PerformanceDateRange.getModule()
            : null;
    }

    async function api(path) {
        const res = await fetch(path);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Request failed');
        return json;
    }

    async function fetchStation(stationId) {
        return api('/api/stations/' + encodeURIComponent(stationId));
    }

    async function fetchRents(stationId, start, end) {
        const range = formatDateRange(start, end);
        return api('/api/rents/' + encodeURIComponent(stationId) + '/' + range);
    }

    async function fetchRentsMtd(stationIdOrIds) {
        var sel = window.PerformanceDateRange.getSelectedRange();
        var range = formatDateRange(sel.start, sel.end);
        var basePath = '/api/rents/' + range;
        if (stationIdOrIds == null) return api(basePath);
        var pathSegment;
        if (Array.isArray(stationIdOrIds)) {
            if (stationIdOrIds.length === 0) return api(basePath);
            pathSegment = stationIdOrIds.map(function (id) { return encodeURIComponent(id); }).join('.');
        } else {
            pathSegment = encodeURIComponent(stationIdOrIds);
        }
        return api(basePath + '/' + pathSegment);
    }

    async function fetchRentsMtdAll() {
        var sel = window.PerformanceDateRange.getSelectedRange();
        var range = formatDateRange(sel.start, sel.end);
        return api('/api/rents/' + range + '/all');
    }

    function parseRentData(data) {
        if (!data || !data.success) return null;
        const d = data.data;
        if (d === null || d === undefined || typeof d !== 'object') return null;
        const totalAmount = d.totalAmount != null ? Number(d.totalAmount) : null;
        const totalRents = d.totalRents != null ? Number(d.totalRents) : null;
        if (totalAmount == null && totalRents == null) return null;
        return { totalAmount: totalAmount ?? 0, totalRents: totalRents ?? 0 };
    }

    function renderStationCard(station, rentData) {
        const title = station.title || station.name || station.id || 'Station';
        const filled = station.filled_slots != null ? station.filled_slots : (station.filledSlots ?? '—');
        const open = station.open_slots != null ? station.open_slots : (station.openSlots ?? '—');
        const rent = parseRentData(rentData);

        const revenueHtml = rent
            ? '<div class="rent-row"><span class="rent-label">Total Revenue</span><strong class="rent-value">$' + escapeHtml(String(rent.totalAmount)) + '</strong></div>' +
              '<div class="rent-row"><span class="rent-label">Rents</span><strong class="rent-value">' + escapeHtml(String(rent.totalRents)) + '</strong></div>'
            : '<span class="rent-empty">No rent data for this period</span>';

        const div = document.createElement('div');
        div.className = 'station-card';
        div.innerHTML =
            '<div class="station-title">' + escapeHtml(title) + '</div>' +
            '<div class="slots">' +
            '<div class="slot"><span class="slot-dot filled"></span><strong>' + escapeHtml(String(filled)) + '</strong> <span>Filled</span></div>' +
            '<div class="slot"><span class="slot-dot open"></span><strong>' + escapeHtml(String(open)) + '</strong> <span>Open</span></div>' +
            '</div>' +
            '<div class="rent-section">' +
            '<div class="rent-data">' + revenueHtml + '</div></div>';
        return div;
    }

    function escapeHtml(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function showLoading() {
        document.getElementById('loading').style.display = 'none';
        var skeletons = document.getElementById('performanceSkeletons');
        if (skeletons) skeletons.style.display = 'block';
        document.getElementById('error').style.display = 'none';
        var stationsEl = document.getElementById('stations');
        if (stationsEl) stationsEl.style.display = 'none';
        var card = document.getElementById('mtdChartCard');
        if (card) card.style.display = 'none';
        var statsRow = document.getElementById('mtdStatsRow');
        if (statsRow) statsRow.style.display = 'none';
        if (window.Charts && window.Charts.destroyMtdChart) window.Charts.destroyMtdChart();
        var drm = getPerformanceDateRangeModule();
        if (drm) drm.style.display = 'block';
        var stationPerf = document.getElementById('stationPerformanceSection');
        var stationPerfSkeletons = document.getElementById('stationPerformanceSkeletons');
        if (isAdmin()) {
            if (stationPerf) stationPerf.style.display = 'block';
            if (stationPerfSkeletons) stationPerfSkeletons.style.display = 'block';
        } else {
            if (stationPerf) stationPerf.style.display = 'none';
            if (stationPerfSkeletons) stationPerfSkeletons.style.display = 'none';
        }
    }

    function showError(msg) {
        document.getElementById('loading').style.display = 'none';
        var skeletons = document.getElementById('performanceSkeletons');
        if (skeletons) skeletons.style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = msg;
        var stationsEl = document.getElementById('stations');
        if (stationsEl) stationsEl.style.display = 'none';
        var card = document.getElementById('mtdChartCard');
        if (card) card.style.display = 'none';
        var statsRow = document.getElementById('mtdStatsRow');
        if (statsRow) statsRow.style.display = 'none';
        if (window.Charts && window.Charts.destroyMtdChart) window.Charts.destroyMtdChart();
        var drm = getPerformanceDateRangeModule();
        if (drm) drm.style.display = 'block';
        var stationPerf = document.getElementById('stationPerformanceSection');
        if (stationPerf) stationPerf.style.display = 'none';
    }

    function showPerformanceView() {
        document.getElementById('loading').style.display = 'none';
        var skeletons = document.getElementById('performanceSkeletons');
        if (skeletons) skeletons.style.display = 'none';
        document.getElementById('error').style.display = 'none';
        var stationsEl = document.getElementById('stations');
        if (stationsEl) stationsEl.style.display = 'none';
        var drm = getPerformanceDateRangeModule();
        if (drm) drm.style.display = 'block';
    }

    function renderStationPerformanceRowsFromRentDataOnly(data) {
        var html = '';
        (data || []).forEach(function (row) {
            var title = escapeHtml(String(row.station_title || row.station_id || '—'));
            var money = row.money != null ? Number(row.money) : 0;
            html += '<tr><td>' + title + '</td><td class="station-performance-money">$' + money + '</td></tr>';
        });
        return html;
    }

    /**
     * Admin "Station performance" table: one row per station from GET /stations, revenue from
     * /rents/range/all when present; otherwise $0 (no row from API = no revenue in range).
     */
    async function renderStationPerformanceList(res) {
        var section = document.getElementById('stationPerformanceSection');
        var container = document.getElementById('stationPerformanceList');
        var skeletons = document.getElementById('stationPerformanceSkeletons');
        if (!section || !container) return;
        if (skeletons) skeletons.style.display = 'none';

        var moneyById = {};
        if (res && res.success && Array.isArray(res.data)) {
            res.data.forEach(function (r) {
                var sid = r.station_id != null ? String(r.station_id) : '';
                if (!sid) return;
                var m = r.money != null ? Number(r.money) : 0;
                if (!isNaN(m)) moneyById[sid] = m;
            });
        }

        var allStations = [];
        try {
            var stationsJson = await fetchAllStations();
            allStations = stationsFromApiJson(stationsJson);
        } catch (e) {
            console.warn('Station list for performance table failed', e);
        }

        if (allStations.length === 0) {
            if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                var dataCopy = res.data.slice();
                dataCopy.sort(function (a, b) {
                    var ma = a.money != null ? Number(a.money) : 0;
                    var mb = b.money != null ? Number(b.money) : 0;
                    if (mb !== ma) return mb - ma;
                    var ta = String(a.station_title || a.station_id || '');
                    var tb = String(b.station_title || b.station_id || '');
                    return ta.localeCompare(tb, undefined, { sensitivity: 'base' });
                });
                var htmlOnly = '<table class="station-performance-table" aria-label="Station revenue for selected range"><thead><tr><th>Station</th><th>Revenue</th></tr></thead><tbody>' +
                    renderStationPerformanceRowsFromRentDataOnly(dataCopy) + '</tbody></table>';
                container.innerHTML = htmlOnly;
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
            return;
        }

        var rows = [];
        allStations.forEach(function (s) {
            var id = String(s.id != null ? s.id : '');
            if (!id) return;
            var t = s.title != null && String(s.title).trim() !== '' ? s.title : id;
            var money = moneyById[id] != null ? moneyById[id] : 0;
            rows.push({ id: id, title: t, money: money });
        });
        rows.sort(function (a, b) {
            if (b.money !== a.money) return b.money - a.money;
            return String(a.title).localeCompare(String(b.title), undefined, { sensitivity: 'base' });
        });

        var html = '<table class="station-performance-table" aria-label="Station revenue for selected range"><thead><tr><th>Station</th><th>Revenue</th></tr></thead><tbody>';
        rows.forEach(function (row) {
            html += '<tr><td>' + escapeHtml(String(row.title)) + '</td><td class="station-performance-money">$' + row.money + '</td></tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        section.style.display = 'block';
    }

    function takeHomeRate(userType) {
        var t = (userType || '').toUpperCase();
        if (t === 'HOST') return 0.2;
        if (t === 'ADMIN' || t === 'DISTRIBUTER') return 0.8;
        return 0.2;
    }

    function isTestStationTitle(title) {
        return String(title || '').trim().toLowerCase() === 'test station';
    }

    /**
     * Mean per-station net for the date range over all network stations (GET /stations),
     * excluding only "TEST STATION". Stations with no row in /rents/range/all count as $0.
     */
    async function computeNetworkAvgRevenuePerStationExcludingTest(allRes) {
        try {
            var stationsJson = await fetchAllStations();
            var allStations = stationsFromApiJson(stationsJson);
            var networkStations = allStations.filter(function (s) { return !isTestStationTitle(s.title); });
            var n = networkStations.length;
            if (n === 0) return null;

            var moneyById = {};
            if (allRes && allRes.success && Array.isArray(allRes.data)) {
                allRes.data.forEach(function (r) {
                    var sid = r.station_id != null ? String(r.station_id) : '';
                    if (!sid) return;
                    var m = r.money != null ? Number(r.money) : 0;
                    if (!isNaN(m)) moneyById[sid] = m;
                });
            }

            var sum = 0;
            networkStations.forEach(function (s) {
                var id = String(s.id);
                sum += moneyById[id] != null ? moneyById[id] : 0;
            });
            return sum / n;
        } catch (e) {
            console.warn('Network avg per station failed', e);
            return null;
        }
    }

    async function loadDashboard() {
        const user = getUser();
        if (!user || !user.id) {
            redirectToLogin();
            return;
        }

        showLoading();

        var rangeCheck = window.PerformanceDateRange.validate();
        if (!rangeCheck.ok) {
            document.getElementById('loading').style.display = 'none';
            var sk = document.getElementById('performanceSkeletons');
            if (sk) sk.style.display = 'none';
            var errEl = document.getElementById('error');
            errEl.style.display = 'block';
            errEl.textContent = rangeCheck.message;
            var drm = getPerformanceDateRangeModule();
            if (drm) drm.style.display = 'block';
            return;
        }
        var chartRange = { start: rangeCheck.start, end: rangeCheck.end };

        var allRes = null;
        try {
            var stationIdOrIds = null;
            if (!isAdmin()) {
                var stations = (user.stations && Array.isArray(user.stations)) ? user.stations : [];
                if (stations.length > 0) stationIdOrIds = stations;
            }
            var mtdRes = await fetchRentsMtd(stationIdOrIds);
            try {
                allRes = await fetchRentsMtdAll();
            } catch (allFetchErr) {
                console.warn('Station totals (rents/.../all) failed to load', allFetchErr);
            }
            var avgPerStation = await computeNetworkAvgRevenuePerStationExcludingTest(allRes);
            var chartOpts = { start: chartRange.start, end: chartRange.end, avgPerStation: avgPerStation };
            if (window.Charts && window.Charts.renderMtdChart) window.Charts.renderMtdChart(mtdRes, chartOpts);
        } catch (mtdErr) {
            console.warn('MTD rent data failed to load', mtdErr);
            var mtdCard = document.getElementById('mtdChartCard');
                if (mtdCard) mtdCard.style.display = 'none';
                var mtdStatsRow = document.getElementById('mtdStatsRow');
                if (mtdStatsRow) mtdStatsRow.style.display = 'none';
            }

        showPerformanceView();

        if (isAdmin()) {
            var viewQ = new URLSearchParams(window.location.search).get('view');
            if (viewQ) {
                var viewMap = {
                    scans: 'scans',
                    'station-management': 'station-management',
                    stations: 'station-management',
                    'host-management': 'host-management',
                    partners: 'host-management',
                    performance: 'performance',
                };
                var resolvedView = viewMap[viewQ];
                if (resolvedView) {
                    showView(resolvedView);
                    try {
                        window.history.replaceState({}, '', window.location.pathname);
                    } catch (e) {}
                }
            }
            var stationPerf = document.getElementById('stationPerformanceSection');
            var stationPerfSkeletons = document.getElementById('stationPerformanceSkeletons');
            if (stationPerf) stationPerf.style.display = 'block';
            if (stationPerfSkeletons) stationPerfSkeletons.style.display = 'block';
            try {
                if (allRes) {
                    await renderStationPerformanceList(allRes);
                } else {
                    allRes = await fetchRentsMtdAll();
                    await renderStationPerformanceList(allRes);
                }
            } catch (allErr) {
                console.warn('Station performance (mtd/all) failed to load', allErr);
                if (stationPerf) stationPerf.style.display = 'none';
                if (stationPerfSkeletons) stationPerfSkeletons.style.display = 'none';
            }
        }
    }

    function isAdmin() {
        var user = getUser();
        return user && (user.type || '').toUpperCase() === 'ADMIN';
    }

    function showView(name) {
        var perf = document.getElementById('viewPerformance');
        var stationMgmt = document.getElementById('viewStationMgmt');
        var hostMgmt = document.getElementById('viewHostMgmt');
        var scansView = document.getElementById('viewScans');
        var navPerf = document.getElementById('navPerformance');
        var navStationMgmt = document.getElementById('navStationMgmt');
        var navHostMgmt = document.getElementById('navHostMgmt');
        var navScans = document.getElementById('navScans');
        if (perf) perf.classList.toggle('hidden', name !== 'performance');
        if (stationMgmt) stationMgmt.classList.toggle('visible', name === 'station-management');
        if (hostMgmt) hostMgmt.classList.toggle('visible', name === 'host-management');
        if (scansView) scansView.classList.toggle('visible', name === 'scans');
        if (navPerf) navPerf.classList.toggle('active', name === 'performance');
        if (navStationMgmt) navStationMgmt.classList.toggle('active', name === 'station-management');
        if (navHostMgmt) navHostMgmt.classList.toggle('active', name === 'host-management');
        if (navScans) navScans.classList.toggle('active', name === 'scans');
        if (name === 'station-management') loadStationManagement();
        if (name === 'host-management') loadHostManagement();
        if (name === 'scans') loadScans();
    }

    async function fetchAllStations() {
        return api('/api/stations');
    }

    function stationsFromApiJson(json) {
        if (!json || typeof json !== 'object') return [];
        if (Array.isArray(json.data)) return json.data;
        if (Array.isArray(json.Data)) return json.Data;
        return [];
    }

    /**
     * Aligns with API normalizeStationRow: weekday_hours stays object when already parsed;
     * if string, JSON.parse; on failure null. Other fields pass through (shallow copy).
     */
    function normalizeStationRow(row) {
        if (!row || typeof row !== 'object') return row;
        var out = Object.assign({}, row);
        var wh = out.weekday_hours;
        if (wh == null || wh === '') {
            out.weekday_hours = null;
        } else if (typeof wh === 'string') {
            try {
                out.weekday_hours = JSON.parse(wh);
            } catch (e) {
                out.weekday_hours = null;
            }
        }
        return out;
    }

    /** Serialize like server CSV: objects/arrays → JSON.stringify; primitives as Excel values. */
    function stationFieldValueForExport(v) {
        if (v === null || v === undefined) return '';
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
    }

    function stationsRowsForXlsx(list) {
        var rows = (list || []).map(function (row) {
            return row && typeof row === 'object' ? normalizeStationRow(row) : row;
        });
        var keySet = {};
        rows.forEach(function (row) {
            if (row && typeof row === 'object') {
                Object.keys(row).forEach(function (k) { keySet[k] = true; });
            }
        });
        var keys = Object.keys(keySet).sort();
        return rows.map(function (row) {
            var o = {};
            keys.forEach(function (k) {
                if (!row || typeof row !== 'object') {
                    o[k] = '';
                    return;
                }
                o[k] = stationFieldValueForExport(row[k]);
            });
            return o;
        });
    }

    async function fetchAllUsers() {
        return api('/api/users');
    }

    async function fetchScans() {
        return api('/api/scans');
    }

    function formatDurationAfterRent(d) {
        if (!d || typeof d !== 'object') return '—';
        var h = d.hours != null ? d.hours : 0;
        var m = d.minutes != null ? d.minutes : 0;
        var s = d.seconds != null ? d.seconds : 0;
        var parts = [];
        if (h) parts.push(h + 'h');
        if (m) parts.push(m + 'm');
        parts.push(s + 's');
        return parts.join(' ');
    }

    var scansSummaryChartInstance = null;

    function destroyScansSummaryChart() {
        if (scansSummaryChartInstance) {
            scansSummaryChartInstance.destroy();
            scansSummaryChartInstance = null;
        }
    }

    var SCANS_BAR_GRADIENTS = [
        ['#EB641D', '#EB641D'],
        ['#23B3FA', '#1F65E0'],
        ['#DEA1EC', '#9118A7'],
        ['#FFD45B', '#D68909']
    ];
    var SCANS_TYPE_TO_GRADIENT_INDEX = {
        yellow: 3,
        blue: 1,
        purple: 2,
        orange: 0
    };
    function getScansGradientIndexForType(typeName) {
        if (typeName == null || typeName === '') return 0;
        var key = String(typeName).toLowerCase().trim();
        return SCANS_TYPE_TO_GRADIENT_INDEX[key] !== undefined ? SCANS_TYPE_TO_GRADIENT_INDEX[key] : 0;
    }

    function renderScansSummary(scans) {
        var el = document.getElementById('scansSummary');
        if (!el) return;
        if (!Array.isArray(scans) || scans.length === 0) {
            el.style.display = 'none';
            destroyScansSummaryChart();
            return;
        }
        var total = scans.length;
        var byType = {};
        scans.forEach(function (s) {
            var t = s.sticker_type || 'Unknown';
            byType[t] = (byType[t] || 0) + 1;
        });
        var typeCounts = Object.keys(byType).map(function (t) { return { type: t, count: byType[t] }; });
        typeCounts.sort(function (a, b) { return b.count - a.count; });

        var labels = typeCounts.map(function (x) { return x.type; });
        var counts = typeCounts.map(function (x) { return x.count; });
        window._scansTypeColor = {};
        labels.forEach(function (type) {
            var idx = getScansGradientIndexForType(type);
            var c = SCANS_BAR_GRADIENTS[idx];
            window._scansTypeColor[type] = c[0];
        });

        destroyScansSummaryChart();
        el.innerHTML = '<div class="scans-summary-total"><span class="label">Total Scans</span><span class="value">' + total + '</span></div><div class="scans-summary-chart-wrap"><canvas id="scansSummaryChart" aria-label="Scans by type"></canvas><div id="scansSummaryChartTooltip" class="chart-tooltip-custom" aria-hidden="true"></div></div>';
        el.style.display = 'flex';

        var canvas = document.getElementById('scansSummaryChart');
        if (!canvas || typeCounts.length === 0) return;

        scansSummaryChartInstance = new window.Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Scans',
                    data: counts,
                    backgroundColor: function (context) {
                        var chart = context.chart;
                        var ctx = chart.ctx;
                        var chartArea = chart.chartArea;
                        if (!chartArea) return '#262626';
                        var i = context.dataIndex;
                        var typeName = labels[i];
                        var idx = getScansGradientIndexForType(typeName);
                        var c = SCANS_BAR_GRADIENTS[idx];
                        var g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        g.addColorStop(0, c[0]);
                        g.addColorStop(1, c[1]);
                        return g;
                    },
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: false,
                        external: function (context) {
                            var el = document.getElementById('scansSummaryChartTooltip');
                            if (!el) return;
                            var tp = context.tooltip;
                            if (tp.opacity === 0) {
                                el.classList.remove('visible');
                                el.setAttribute('aria-hidden', 'true');
                                return;
                            }
                            var i = tp.dataPoints && tp.dataPoints[0] ? tp.dataPoints[0].dataIndex : 0;
                            var type = labels[i] || 'Unknown';
                            var count = counts[i] || 0;
                            var colorIdx = getScansGradientIndexForType(type);
                            var barColor = SCANS_BAR_GRADIENTS[colorIdx][0];
                            el.innerHTML =
                                '<div class="chart-tooltip-header">' +
                                '<span class="chart-tooltip-type-with-color"><span class="chart-tooltip-square" style="background:' + barColor + '"></span>' + escapeHtml(type) + '</span>' +
                                '</div>' +
                                '<div class="chart-tooltip-divider"></div>' +
                                '<div class="chart-tooltip-body">' +
                                '<div class="chart-tooltip-row">' +
                                '<span class="chart-tooltip-value">' + count + ' scans</span>' +
                                '</div>' +
                                '</div>';
                            el.classList.add('visible');
                            el.setAttribute('aria-hidden', 'false');
                            var wrap = el.parentElement;
                            var canvasEl = context.chart.canvas;
                            if (wrap && canvasEl) {
                                var rect = canvasEl.getBoundingClientRect();
                                var wrapRect = wrap.getBoundingClientRect();
                                var caretX = tp.caretX != null ? tp.caretX : tp.x;
                                var caretY = tp.caretY != null ? tp.caretY : tp.y;
                                var left = rect.left - wrapRect.left + caretX;
                                var top = rect.top - wrapRect.top + caretY;
                                var w = el.offsetWidth || 180;
                                var h = el.offsetHeight || 80;
                                var meta = context.chart.getDatasetMeta(0);
                                var bar = meta && meta.data[i];
                                var barCenterY = bar ? (bar.y + bar.base) / 2 : caretY;
                                var topPos = rect.top - wrapRect.top + barCenterY;
                                el.style.left = Math.max(8, Math.min(left - w / 2, wrap.offsetWidth - w - 8)) + 'px';
                                el.style.top = (topPos - h / 2) + 'px';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#737373',
                            maxRotation: 45,
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { display: false },
                        ticks: { color: '#737373' }
                    }
                }
            }
        });
    }

    function renderScansList(scans) {
        var container = document.getElementById('scansList');
        if (!container) return;
        if (!Array.isArray(scans) || scans.length === 0) {
            container.innerHTML = '<p style="color: #a3a3a3;">No scans found.</p>';
            return;
        }
        var typeColorMap = window._scansTypeColor || {};
        var html = '<table class="scans-table"><thead><tr><th>Scan ID</th><th>Sticker ID</th><th>Order ID</th><th>Scan time</th><th>Sticker type</th><th>Duration after rent</th><th>SIZL</th></tr></thead><tbody>';
        scans.forEach(function (s) {
            var scanId = escapeHtml(String(s.scan_id || ''));
            var stickerId = escapeHtml(String(s.sticker_id || ''));
            var orderId = escapeHtml(String(s.order_id || ''));
            var scanTime = escapeHtml(String(s.scan_time || ''));
            var stickerTypeRaw = String(s.sticker_type || '');
            var stickerType = escapeHtml(stickerTypeRaw);
            var typeColor = typeColorMap[stickerTypeRaw] || '#737373';
            var typeCell = '<span class="scans-table-type"><span class="scans-table-type-dot" style="background:' + typeColor + '"></span>' + stickerType + '</span>';
            var duration = escapeHtml(formatDurationAfterRent(s.duration_after_rent));
            var sizl = s.sizl === true ? 'Yes' : 'No';
            html += '<tr><td>' + scanId + '</td><td>' + stickerId + '</td><td>' + orderId + '</td><td>' + scanTime + '</td><td>' + typeCell + '</td><td>' + duration + '</td><td>' + sizl + '</td></tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    async function loadScans() {
        var summary = document.getElementById('scansSummary');
        var container = document.getElementById('scansList');
        var loading = document.getElementById('scansLoading');
        var errEl = document.getElementById('scansError');
        if (!container) return;
        if (summary) summary.style.display = 'none';
        container.innerHTML = '';
        loading.style.display = 'none';
        var summarySkeleton = document.getElementById('scansSummarySkeleton');
        if (summarySkeleton) summarySkeleton.style.display = 'flex';
        var skeletons = document.getElementById('scansSkeletons');
        if (skeletons) skeletons.style.display = 'block';
        errEl.style.display = 'none';
        try {
            var json = await fetchScans();
            var raw = Array.isArray(json) ? json : (json.data != null && Array.isArray(json.data) ? json.data : []);
            if (!Array.isArray(raw)) raw = [];
            var list = raw.filter(function (s) { return s.order_id != null && s.order_id !== ''; });
            renderScansSummary(list);
            renderScansList(list);
        } catch (e) {
            console.error(e);
            errEl.style.display = 'block';
            errEl.textContent = 'Failed to load scans. Please try again.';
            errEl.style.color = '#fca5a5';
        } finally {
            loading.style.display = 'none';
            if (summarySkeleton) summarySkeleton.style.display = 'none';
            if (skeletons) skeletons.style.display = 'none';
        }
    }

    async function createUser(payload) {
        var res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
        return json;
    }

    async function updateUser(id, payload) {
        var res = await fetch('/api/users/' + encodeURIComponent(id), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
        return json;
    }

    async function deleteUser(id) {
        var res = await fetch('/api/users/' + encodeURIComponent(id), { method: 'DELETE' });
        var json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
        return json;
    }

    async function jsonFromFetchResponse(res) {
        var text = await res.text();
        if (!res.ok) {
            var errObj = {};
            if (text && text.trim()) {
                try { errObj = JSON.parse(text); } catch (e) {}
            }
            throw new Error(errObj.error || errObj.message || ('Request failed (' + res.status + ')'));
        }
        if (!text || !text.trim()) return {};
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error('Invalid response from server');
        }
    }

    async function createStation(payload) {
        var res = await fetch('/api/stations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return jsonFromFetchResponse(res);
    }

    async function updateStation(id, payload) {
        var res = await fetch('/api/stations/' + encodeURIComponent(id), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return jsonFromFetchResponse(res);
    }

    async function deleteStation(id) {
        var res = await fetch('/api/stations/' + encodeURIComponent(id), { method: 'DELETE' });
        return jsonFromFetchResponse(res);
    }

    function showStationMgmtError(msg) {
        var errEl = document.getElementById('mgmtError');
        if (!errEl) return;
        errEl.style.display = 'block';
        errEl.textContent = msg;
        errEl.style.color = '#fca5a5';
    }

    /**
     * After save, GET the station. api.cuub.tech currently may ignore address + stripe_id on
     * POST/PATCH (defaults: address "X", stripe_id null) — the map service must persist them.
     */
    function warnIfServerDidNotPersistAddressStripe(station, expectedAddress, expectedStripe) {
        if (!station) return;
        var gotAddr = station.address != null ? String(station.address).trim() : '';
        var gotStripe = station.stripe_id != null ? String(station.stripe_id).trim() : '';
        if (gotAddr === expectedAddress && gotStripe === expectedStripe) return;
        showStationMgmtError(
            'The map API (api.cuub.tech) did not save the address and/or Stripe ID. The dashboard sent the correct data. ' +
            'The backend must read address and stripe_id from the request and write them to the database in POST and PATCH. ' +
            'If this persists, your title and coordinates may still be updating; contact whoever maintains the map / stations API.'
        );
    }

    async function dispenseAllForStation(stationId, buttonEl) {
        var errEl = document.getElementById('mgmtError');
        if (errEl) {
            errEl.style.display = 'none';
            errEl.textContent = '';
        }
        if (!stationId) {
            showStationMgmtError('Missing station ID.');
            return;
        }
        if (buttonEl) buttonEl.disabled = true;
        try {
            var res = await fetch('/api/pop/' + encodeURIComponent(stationId) + '/all', { method: 'POST' });
            var json = await res.json().catch(function () { return {}; });
            if (!res.ok || (json && json.success === false)) {
                throw new Error((json && (json.error || json.message)) ? (json.error || json.message) : 'Failed to dispense powerbanks.');
            }
            await loadStationManagement();
        } catch (e) {
            console.error(e);
            showStationMgmtError((e && e.message) ? e.message : 'Failed to dispense powerbanks. Please try again.');
        } finally {
            if (buttonEl) buttonEl.disabled = false;
        }
    }

    function stationHasAddress(s) {
        if (!s || typeof s !== 'object') return false;
        var addr = s.address != null ? String(s.address).trim() : '';
        if (addr) return true;
        var loc = s.location != null ? String(s.location).trim() : '';
        return !!loc;
    }

    function stationHasStripeId(s) {
        if (!s || typeof s !== 'object') return false;
        return s.stripe_id != null && String(s.stripe_id).trim() !== '';
    }

    function stationMissingAddressOrStripe(s) {
        return !stationHasAddress(s) || !stationHasStripeId(s);
    }

    function renderStationManagementList(stations) {
        var container = document.getElementById('stationMgmtList');
        var loading = document.getElementById('mgmtLoading');
        var errEl = document.getElementById('mgmtError');
        var skeletons = document.getElementById('stationMgmtSkeletons');
        if (!container) return;
        loading.style.display = 'none';
        if (skeletons) skeletons.style.display = 'none';
        errEl.style.display = 'none';
        if (!Array.isArray(stations) || stations.length === 0) {
            container.innerHTML = '<p style="color: #a3a3a3;">No stations found.</p>';
            return;
        }
        var html = '<table class="station-mgmt-table"><thead><tr><th></th><th>Title</th><th></th><th>ID</th><th>Filled</th><th>Open</th><th></th></tr></thead><tbody>';
        stations.forEach(function (s) {
            var id = escapeHtml(String(s.id || ''));
            var title = escapeHtml(String(s.title || ''));
            var lat = s.latitude != null ? String(s.latitude) : '';
            var lng = s.longitude != null ? String(s.longitude) : '';
            var filled = s.filled_slots != null ? s.filled_slots : '—';
            var open = s.open_slots != null ? s.open_slots : '—';
            var isOnline = s.online === true;
            var statusClass = isOnline ? 'online' : 'offline';
            var statusDot = '<span class="station-status-dot ' + statusClass + '" aria-label="' + (isOnline ? 'Online' : 'Offline') + '"></span>';
            var missingMark = '';
            if (stationMissingAddressOrStripe(s)) {
                missingMark = '<span class="station-mgmt-missing-mark" aria-label="Missing address or Stripe ID" title="Missing address or Stripe ID">!</span> ';
            }
            html += '<tr data-station-id="' + id + '" data-station-title="' + escapeHtml(String(s.title || '')) + '" data-station-lat="' + escapeHtml(lat) + '" data-station-lng="' + escapeHtml(lng) + '">' +
                '<td class="station-status-cell">' + statusDot + '</td><td>' + missingMark + title + '</td>' +
                '<td>' +
                    '<button type="button" class="btn-dispense-all" data-action="dispense-all" data-station-id="' + id + '" aria-label="Dispense all powerbanks for station">' +
                        '<img src="assets/dispense-all.png" alt="" />' +
                    '</button>' +
                '</td>' +
                '<td>' + id + '</td><td>' + filled + '</td><td>' + open + '</td>' +
                '<td><div class="table-actions"><button type="button" class="btn-edit" data-action="edit">Edit</button><button type="button" class="btn-delete" data-action="delete">Delete</button></div></td></tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        container.querySelectorAll('.btn-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = btn.closest('tr');
                var sid = row && row.getAttribute('data-station-id');
                if (sid) {
                    openEditStationModal(sid, row).catch(function (e) {
                        console.error(e);
                    });
                }
            });
        });
        container.querySelectorAll('.btn-delete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = btn.closest('tr');
                var sid = row && row.getAttribute('data-station-id');
                if (sid) openDeleteConfirmModal('station', sid, row);
            });
        });
        container.querySelectorAll('.btn-dispense-all').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = btn.closest('tr');
                var sid = btn && btn.getAttribute ? btn.getAttribute('data-station-id') : null;
                var stationName = (row && row.getAttribute('data-station-title')) || sid || 'this station';
                openDispenseConfirmModal(sid, stationName);
            });
        });
    }

    function renderHostManagementList(users) {
        var container = document.getElementById('hostMgmtList');
        var loading = document.getElementById('hostMgmtLoading');
        var errEl = document.getElementById('hostMgmtError');
        var skeletons = document.getElementById('hostMgmtSkeletons');
        if (!container) return;
        loading.style.display = 'none';
        if (skeletons) skeletons.style.display = 'none';
        errEl.style.display = 'none';
        var list = Array.isArray(users) ? users : [];
        if (list.length === 0) {
            container.innerHTML = '<p style="color: #a3a3a3;">No users found.</p>';
            return;
        }
        var html = '<table class="station-mgmt-table"><thead><tr>' +
            '<th>ID</th><th>Username</th><th>Type</th><th>Created</th><th>Updated</th><th>Stations</th><th></th></tr></thead><tbody>';
        list.forEach(function (u) {
            var id = escapeHtml(String(u.id || ''));
            var username = escapeHtml(String(u.username || ''));
            var type = escapeHtml(String(u.type || ''));
            var created = escapeHtml(String(u.created_at || ''));
            var updated = escapeHtml(String(u.updated_at || ''));
            var stationList = Array.isArray(u.stations) ? u.stations : [];
            var stationsJson = JSON.stringify(stationList);
            var stationsHtml = '';
            if (stationList.length === 0) {
                stationsHtml = '—';
            } else if (stationList.length === 1) {
                stationsHtml = escapeHtml(stationList[0]);
            } else {
                var stationItemsHtml = stationList.map(function (sid) {
                    return '<div class="hover-card-station-item">' + escapeHtml(sid) + '</div>';
                }).join('');
                stationsHtml = '<span class="hover-card-trigger" style="position: relative; display: inline-block;">' +
                    stationList.length + ' stations' +
                    '<div class="hover-card-content">' +
                    '<div class="hover-card-title">Stations</div>' +
                    '<div class="hover-card-description">This user has access to ' + stationList.length + ' station' + (stationList.length !== 1 ? 's' : '') + ':</div>' +
                    '<div class="hover-card-stations">' + stationItemsHtml + '</div>' +
                    '</div>' +
                    '</span>';
            }
            html += '<tr data-user-id="' + id + '" data-user-username="' + escapeHtml(username) + '" data-user-type="' + escapeHtml(type) + '" data-user-stations="' + escapeHtml(stationsJson) + '">' +
                '<td>' + id + '</td><td>' + username + '</td><td>' + type + '</td><td>' + created + '</td><td>' + updated + '</td><td>' + stationsHtml + '</td>' +
                '<td><div class="table-actions"><button type="button" class="btn-edit">Edit</button><button type="button" class="btn-delete btn-destructive">Delete</button></div></td></tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        container.querySelectorAll('.btn-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = btn.closest('tr');
                var uid = row && row.getAttribute('data-user-id');
                if (uid) openEditUserModal(uid, row);
            });
        });
        container.querySelectorAll('.btn-delete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = btn.closest('tr');
                var uid = row && row.getAttribute('data-user-id');
                if (uid) openDeleteConfirmModal('user', uid, row);
            });
        });
        container.querySelectorAll('.hover-card-trigger').forEach(function (trigger) {
            var content = trigger.querySelector('.hover-card-content');
            if (!content) return;
            trigger.addEventListener('mouseenter', function () {
                var rect = trigger.getBoundingClientRect();
                var contentRect = content.getBoundingClientRect();
                var viewportHeight = window.innerHeight;
                var spaceAbove = rect.top;
                var spaceBelow = viewportHeight - rect.bottom;
                var contentHeight = contentRect.height || 200;
                if (spaceAbove < contentHeight + 20 && spaceBelow > spaceAbove) {
                    content.style.bottom = 'auto';
                    content.style.top = '100%';
                    content.style.marginTop = '0.25rem';
                    content.style.marginBottom = '0';
                } else {
                    content.style.top = 'auto';
                    content.style.bottom = '100%';
                    content.style.marginBottom = '0.25rem';
                    content.style.marginTop = '0';
                }
            });
        });
    }

    function ensureStationAddressStripeFieldsShown() {
        var wrap = document.getElementById('stationFormCreateExtra');
        var addr = document.getElementById('stationAddress');
        var stripe = document.getElementById('stationStripeId');
        if (!wrap || !addr || !stripe) return;
        wrap.style.display = '';
        addr.required = true;
        stripe.required = true;
    }

    function stationObjectFromGetStationJson(json) {
        if (!json || typeof json !== 'object') return null;
        var d = json.data;
        if (d && typeof d === 'object' && !Array.isArray(d)) return d;
        d = json.Data;
        if (d && typeof d === 'object' && !Array.isArray(d)) return d;
        return null;
    }

    function openAddStationModal() {
        document.getElementById('stationFormTitle').textContent = 'Add station';
        document.getElementById('stationFormDescription').textContent = 'Create a new station';
        document.getElementById('stationForm').reset();
        document.getElementById('stationId').disabled = false;
        ensureStationAddressStripeFieldsShown();
        document.getElementById('stationFormDrawer').classList.add('active');
    }

    async function openEditStationModal(stationId, row) {
        var title = row.getAttribute('data-station-title');
        var lat = row.getAttribute('data-station-lat');
        var lng = row.getAttribute('data-station-lng');
        if (title == null || lat == null || lng == null) {
            var cells = row.querySelectorAll('td');
            title = (cells[1] && cells[1].textContent) || '';
            lat = (cells[2] && cells[2].textContent) || '';
            lng = (cells[3] && cells[3].textContent) || '';
        }
        document.getElementById('stationFormTitle').textContent = 'Edit station';
        document.getElementById('stationFormDescription').textContent = 'Update station information';
        ensureStationAddressStripeFieldsShown();
        document.getElementById('stationAddress').value = '';
        document.getElementById('stationStripeId').value = '';
        document.getElementById('stationId').value = stationId;
        document.getElementById('stationId').disabled = true;
        document.getElementById('stationTitle').value = title || '';
        document.getElementById('stationLat').value = lat || '';
        document.getElementById('stationLng').value = lng || '';
        document.getElementById('stationFormDrawer').setAttribute('data-edit-id', stationId);
        document.getElementById('stationFormDrawer').classList.add('active');
        try {
            var json = await fetchStation(stationId);
            var s = stationObjectFromGetStationJson(json);
            if (s) {
                var addrVal = s.address != null ? String(s.address) : (s.location != null ? String(s.location) : '');
                document.getElementById('stationAddress').value = addrVal;
                document.getElementById('stationStripeId').value = s.stripe_id != null ? String(s.stripe_id) : '';
            }
        } catch (err) {
            console.error(err);
            alert('Could not load address and Stripe ID from the server. You can enter or correct them and save.');
        }
    }

    function closeStationFormModal() {
        document.getElementById('stationFormDrawer').classList.remove('active');
        document.getElementById('stationFormDrawer').removeAttribute('data-edit-id');
        document.getElementById('stationId').disabled = false;
        var addr = document.getElementById('stationAddress');
        var stripe = document.getElementById('stationStripeId');
        if (addr) addr.value = '';
        if (stripe) stripe.value = '';
        ensureStationAddressStripeFieldsShown();
    }

    function openDeleteConfirmModal(type, id, row) {
        var msg = document.getElementById('deleteConfirmMessage');
        var name = (row && row.getAttribute('data-station-title')) || (row && row.querySelectorAll('td')[0] && row.querySelectorAll('td')[0].textContent) || (row && row.querySelectorAll('td')[1] && row.querySelectorAll('td')[1].textContent) || id;
        msg.textContent = type === 'user'
            ? 'Are you sure you want to delete user "' + name + '"?'
            : 'Are you sure you want to delete "' + name + '"?';
        var modal = document.getElementById('deleteConfirmModal');
        modal.setAttribute('data-delete-type', type);
        modal.setAttribute('data-delete-id', id);
        modal.classList.add('active');
    }

    function closeDeleteConfirmModal() {
        var modal = document.getElementById('deleteConfirmModal');
        modal.classList.remove('active');
        modal.removeAttribute('data-delete-id');
        modal.removeAttribute('data-delete-type');
    }

    function openDispenseConfirmModal(stationId, stationName) {
        var modal = document.getElementById('dispenseConfirmModal');
        var msg = document.getElementById('dispenseConfirmMessage');
        if (!modal || !msg || !stationId) return;
        msg.textContent = 'Are you sure you want to dispense all batteries at "' + (stationName || stationId) + '"?';
        modal.setAttribute('data-station-id', stationId);
        modal.classList.add('active');
    }

    function closeDispenseConfirmModal() {
        var modal = document.getElementById('dispenseConfirmModal');
        if (!modal) return;
        modal.classList.remove('active');
        modal.removeAttribute('data-station-id');
    }

    function openAddUserModal() {
        document.getElementById('userFormTitle').textContent = 'Add user';
        document.getElementById('userFormDescription').textContent = 'Create a new user account';
        document.getElementById('userForm').reset();
        document.getElementById('userFormAddFields').style.display = 'flex';
        document.getElementById('userFormEditFields').style.display = 'none';
        document.getElementById('userFormDrawer').removeAttribute('data-edit-id');
        document.getElementById('userFormDrawer').classList.add('active');
    }

    function renderUserStationChips(container, stationIds, onRemove) {
        container.innerHTML = '';
        (stationIds || []).forEach(function (sid) {
            var chip = document.createElement('span');
            chip.className = 'station-id-chip';
            chip.innerHTML = escapeHtml(sid) + '<button type="button" class="btn-remove-chip" data-station-id="' + escapeHtml(sid) + '" aria-label="Remove">×</button>';
            chip.querySelector('.btn-remove-chip').addEventListener('click', function () {
                onRemove(sid);
            });
            container.appendChild(chip);
        });
    }

    async function openEditUserModal(userId, row) {
        var username = row.getAttribute('data-user-username') || (row.querySelectorAll('td')[1] && row.querySelectorAll('td')[1].textContent) || '';
        var type = row.getAttribute('data-user-type') || '';
        var stationsJson = row.getAttribute('data-user-stations') || '[]';
        var stationIds = [];
        try { stationIds = JSON.parse(stationsJson) || []; } catch (e) {}
        document.getElementById('userFormTitle').textContent = 'Edit user';
        document.getElementById('userUsername').value = username;
        document.getElementById('userTypeEdit').value = type || 'HOST';
        document.getElementById('userFormAddFields').style.display = 'none';
        document.getElementById('userFormEditFields').style.display = 'flex';
        document.getElementById('userFormDrawer').setAttribute('data-edit-id', userId);
        document.getElementById('userFormDrawer').classList.add('active');
        var listEl = document.getElementById('userStationIdsList');
        var addSelect = document.getElementById('userAddStationSelect');
        addSelect.innerHTML = '<option value="">— Add station —</option>';
        var currentIds = stationIds.slice();
        function refreshChips() {
            renderUserStationChips(listEl, currentIds, function (sid) {
                currentIds = currentIds.filter(function (id) { return id !== sid; });
                refreshChips();
                refreshAddSelect();
            });
        }
        function refreshAddSelect() {
            var opts = addSelect.querySelectorAll('option');
            for (var i = opts.length - 1; i > 0; i--) opts[i].remove();
            var stations = window._cachedStations || [];
            stations.forEach(function (s) {
                var sid = String(s.id || '');
                if (sid && currentIds.indexOf(sid) === -1) {
                    var opt = document.createElement('option');
                    opt.value = sid;
                    opt.textContent = sid + (s.title ? ' (' + s.title + ')' : '');
                    addSelect.appendChild(opt);
                }
            });
        }
        refreshChips();
        try {
            var json = await fetchAllStations();
            window._cachedStations = stationsFromApiJson(json);
        } catch (e) { window._cachedStations = []; }
        refreshAddSelect();
        document.getElementById('userAddStationBtn').onclick = function () {
            var val = addSelect.value;
            if (val && currentIds.indexOf(val) === -1) {
                currentIds.push(val);
                refreshChips();
                refreshAddSelect();
            }
        };
        document.getElementById('userFormDrawer')._editStationIds = function () { return currentIds; };
    }

    function closeUserFormModal() {
        document.getElementById('userFormDrawer').classList.remove('active');
        document.getElementById('userFormDrawer').removeAttribute('data-edit-id');
        document.getElementById('userFormDrawer')._editStationIds = null;
        document.getElementById('userFormAddFields').style.display = 'flex';
        document.getElementById('userFormEditFields').style.display = 'none';
    }

    async function loadStationManagement() {
        var container = document.getElementById('stationMgmtList');
        var loading = document.getElementById('mgmtLoading');
        var errEl = document.getElementById('mgmtError');
        if (!container) return;
        container.innerHTML = '';
        loading.style.display = 'none';
        var skeletons = document.getElementById('stationMgmtSkeletons');
        if (skeletons) skeletons.style.display = 'block';
        errEl.style.display = 'none';
        try {
            var json = await fetchAllStations();
            var list = stationsFromApiJson(json);
            renderStationManagementList(list);
        } catch (e) {
            console.error(e);
            loading.style.display = 'none';
            if (skeletons) skeletons.style.display = 'none';
            errEl.style.display = 'block';
            errEl.textContent = 'Failed to load stations. Please try again.';
            errEl.style.color = '#fca5a5';
        }
    }

    async function loadHostManagement() {
        var container = document.getElementById('hostMgmtList');
        var loading = document.getElementById('hostMgmtLoading');
        var errEl = document.getElementById('hostMgmtError');
        if (!container) return;
        container.innerHTML = '';
        loading.style.display = 'none';
        var skeletons = document.getElementById('hostMgmtSkeletons');
        if (skeletons) skeletons.style.display = 'block';
        errEl.style.display = 'none';
        try {
            var json = await fetchAllUsers();
            var list = (json.data != null && Array.isArray(json.data)) ? json.data : (json.Data && Array.isArray(json.Data) ? json.Data : []);
            renderHostManagementList(list);
        } catch (e) {
            console.error(e);
            loading.style.display = 'none';
            if (skeletons) skeletons.style.display = 'none';
            errEl.style.display = 'block';
            errEl.textContent = 'Failed to load users. Please try again.';
            errEl.style.color = '#fca5a5';
        }
    }

    function init() {
        if (window.PerformanceDateRange) {
            window.PerformanceDateRange.init(loadDashboard);
        }
        var hamburgerBtn = document.getElementById('hamburgerBtn');
        var hamburgerMenu = document.getElementById('hamburgerMenu');
        var hamburgerOverlay = document.getElementById('hamburgerOverlay');
        function closeHamburgerMenu() {
            if (hamburgerMenu) hamburgerMenu.classList.remove('open');
            if (hamburgerBtn) hamburgerBtn.classList.remove('open');
            document.body.classList.remove('hamburger-open');
            if (hamburgerOverlay) hamburgerOverlay.setAttribute('aria-hidden', 'true');
        }
        function openHamburgerMenu() {
            if (hamburgerMenu) hamburgerMenu.classList.add('open');
            if (hamburgerBtn) hamburgerBtn.classList.add('open');
            document.body.classList.add('hamburger-open');
            if (hamburgerOverlay) hamburgerOverlay.setAttribute('aria-hidden', 'false');
        }
        if (hamburgerBtn && hamburgerMenu) {
            hamburgerBtn.addEventListener('click', function () {
                if (hamburgerMenu.classList.contains('open')) {
                    closeHamburgerMenu();
                } else {
                    openHamburgerMenu();
                }
            });
        }
        if (hamburgerOverlay) {
            hamburgerOverlay.addEventListener('click', closeHamburgerMenu);
        }
        document.getElementById('logout').addEventListener('click', function (e) {
            e.preventDefault();
            closeHamburgerMenu();
            redirectToLogin();
        });

        var adminLinks = document.querySelectorAll('[data-admin-only]');
        adminLinks.forEach(function (el) {
            el.style.display = isAdmin() ? '' : 'none';
        });
        if (!isAdmin()) {
            document.body.classList.add('host-layout');
            var user = getUser();
            var hostUsernameEl = document.getElementById('hostHeaderUsername');
            if (hostUsernameEl) hostUsernameEl.textContent = user && user.username ? user.username : '';
            var headerLogout = document.getElementById('headerLogout');
            if (headerLogout) {
                headerLogout.style.display = 'block';
                headerLogout.addEventListener('click', function (e) {
                    e.preventDefault();
                    redirectToLogin();
                });
            }
            showView('performance');
        }
        document.getElementById('navPerformance').addEventListener('click', function (e) {
            e.preventDefault();
            closeHamburgerMenu();
            showView('performance');
        });
        document.getElementById('navStationMgmt').addEventListener('click', function (e) {
            e.preventDefault();
            closeHamburgerMenu();
            showView('station-management');
        });
        document.getElementById('navHostMgmt').addEventListener('click', function (e) {
            e.preventDefault();
            closeHamburgerMenu();
            showView('host-management');
        });
        document.getElementById('navScans').addEventListener('click', function (e) {
            e.preventDefault();
            closeHamburgerMenu();
            showView('scans');
        });

        document.getElementById('addUserBtn').addEventListener('click', openAddUserModal);
        document.getElementById('userFormCancel').addEventListener('click', closeUserFormModal);
        document.getElementById('userFormClose').addEventListener('click', closeUserFormModal);
        document.getElementById('userForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            var modal = document.getElementById('userFormDrawer');
            var editId = modal.getAttribute('data-edit-id');
            var username = document.getElementById('userUsername').value.trim();
            var submitBtn = document.getElementById('userFormSubmit');
            submitBtn.disabled = true;
            try {
                if (editId) {
                    var type = document.getElementById('userTypeEdit').value;
                    var stationIds = (typeof modal._editStationIds === 'function') ? modal._editStationIds() : [];
                    await updateUser(editId, { username: username, type: type, station_ids: stationIds });
                    closeUserFormModal();
                    loadHostManagement();
                } else {
                    var type = document.getElementById('userType').value;
                    var stationId = document.getElementById('userStationId').value.trim();
                    await createUser({ username: username, type: type, station_id: stationId });
                    closeUserFormModal();
                    loadHostManagement();
                }
            } catch (err) {
                alert(err.message || 'Request failed.');
            } finally {
                submitBtn.disabled = false;
            }
        });
        document.getElementById('userFormDrawer').addEventListener('click', function (e) {
            if (e.target === this) closeUserFormModal();
        });

        document.getElementById('exportStationsBtn').addEventListener('click', async function () {
            var btn = document.getElementById('exportStationsBtn');
            var errEl = document.getElementById('mgmtError');
            errEl.style.display = 'none';
            if (typeof XLSX === 'undefined') {
                errEl.style.display = 'block';
                errEl.textContent = 'Export failed: spreadsheet library did not load. Refresh the page and try again.';
                errEl.style.color = '#fca5a5';
                return;
            }
            var label = btn.textContent;
            btn.disabled = true;
            btn.setAttribute('aria-busy', 'true');
            btn.textContent = 'Exporting…';
            try {
                var json = await fetchAllStations();
                var list = stationsFromApiJson(json);
                var rows = stationsRowsForXlsx(list);
                var wb = XLSX.utils.book_new();
                var ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
                XLSX.utils.book_append_sheet(wb, ws, 'Stations');
                var now = new Date();
                var y = now.getFullYear();
                var mo = String(now.getMonth() + 1).padStart(2, '0');
                var da = String(now.getDate()).padStart(2, '0');
                XLSX.writeFile(wb, 'cuub-stations-' + y + '-' + mo + '-' + da + '.xlsx');
            } catch (e) {
                console.error(e);
                errEl.style.display = 'block';
                errEl.textContent = (e && e.message) ? e.message : 'Export failed. Please try again.';
                errEl.style.color = '#fca5a5';
            } finally {
                btn.disabled = false;
                btn.removeAttribute('aria-busy');
                btn.textContent = label;
            }
        });

        document.getElementById('addStationBtn').addEventListener('click', openAddStationModal);
        document.getElementById('stationFormCancel').addEventListener('click', closeStationFormModal);
        document.getElementById('stationFormClose').addEventListener('click', closeStationFormModal);
        document.getElementById('stationForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            var editId = document.getElementById('stationFormDrawer').getAttribute('data-edit-id');
            var id = document.getElementById('stationId').value.trim();
            var title = document.getElementById('stationTitle').value.trim();
            var lat = parseFloat(document.getElementById('stationLat').value, 10);
            var lng = parseFloat(document.getElementById('stationLng').value, 10);
            var address = document.getElementById('stationAddress').value.trim();
            var stripeId = document.getElementById('stationStripeId').value.trim();
            if (!address || !stripeId) {
                alert('Address and Stripe ID are required.');
                return;
            }
            var submitBtn = document.getElementById('stationFormSubmit');
            submitBtn.disabled = true;
            try {
                if (editId) {
                    await updateStation(editId, {
                        id: editId,
                        title: title,
                        latitude: lat,
                        longitude: lng,
                        address: address,
                        stripe_id: stripeId
                    });
                    closeStationFormModal();
                    await loadStationManagement();
                    var gotEdit = null;
                    try {
                        gotEdit = stationObjectFromGetStationJson(await fetchStation(editId));
                    } catch (e) {}
                    warnIfServerDidNotPersistAddressStripe(gotEdit, address, stripeId);
                } else {
                    await createStation({
                        id: id,
                        title: title,
                        latitude: lat,
                        longitude: lng,
                        address: address,
                        stripe_id: stripeId
                    });
                    closeStationFormModal();
                    await loadStationManagement();
                    var gotNew = null;
                    try {
                        gotNew = stationObjectFromGetStationJson(await fetchStation(id));
                    } catch (e) {}
                    warnIfServerDidNotPersistAddressStripe(gotNew, address, stripeId);
                }
            } catch (err) {
                alert(err.message || 'Request failed.');
            } finally {
                submitBtn.disabled = false;
            }
        });
        document.getElementById('deleteConfirmCancel').addEventListener('click', closeDeleteConfirmModal);
        document.getElementById('deleteConfirmBtn').addEventListener('click', async function () {
            var modal = document.getElementById('deleteConfirmModal');
            var type = modal.getAttribute('data-delete-type');
            var id = modal.getAttribute('data-delete-id');
            if (!id) return;
            var btn = document.getElementById('deleteConfirmBtn');
            btn.disabled = true;
            try {
                if (type === 'user') {
                    await deleteUser(id);
                    closeDeleteConfirmModal();
                    loadHostManagement();
                } else {
                    await deleteStation(id);
                    closeDeleteConfirmModal();
                    loadStationManagement();
                }
            } catch (err) {
                alert(err.message || 'Delete failed.');
            } finally {
                btn.disabled = false;
            }
        });

        document.getElementById('stationFormDrawer').addEventListener('click', function (e) {
            if (e.target === this) closeStationFormModal();
        });
        document.getElementById('deleteConfirmModal').addEventListener('click', function (e) {
            if (e.target === this) closeDeleteConfirmModal();
        });
        document.getElementById('dispenseConfirmCancel').addEventListener('click', closeDispenseConfirmModal);
        document.getElementById('dispenseConfirmBtn').addEventListener('click', async function () {
            var modal = document.getElementById('dispenseConfirmModal');
            var sid = modal.getAttribute('data-station-id');
            if (!sid) return;
            var btn = document.getElementById('dispenseConfirmBtn');
            btn.disabled = true;
            closeDispenseConfirmModal();
            try {
                await dispenseAllForStation(sid);
            } finally {
                btn.disabled = false;
            }
        });
        document.getElementById('dispenseConfirmModal').addEventListener('click', function (e) {
            if (e.target === this) closeDispenseConfirmModal();
        });

        loadDashboard();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
