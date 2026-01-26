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

    function setDefaultDates() {
        const end = new Date();
        const start = new Date(end);
        start.setDate(1);
        document.getElementById('startDate').value = start.toISOString().slice(0, 10);
        document.getElementById('endDate').value = end.toISOString().slice(0, 10);
    }

    function getSelectedRange() {
        const startEl = document.getElementById('startDate');
        const endEl = document.getElementById('endDate');
        const start = new Date(startEl.value || startEl.min);
        const end = new Date(endEl.value || endEl.max);
        return { start, end };
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

    async function popStation(stationId) {
        const res = await fetch('/api/stations/' + encodeURIComponent(stationId) + '/pop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Request failed');
        return json;
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

    function renderStationCard(station, rentData, stationIdFromUser) {
        const title = station.title || station.name || station.id || 'Station';
        const stationId = station.id || station.station_id || stationIdFromUser || '';
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
            '<div class="rent-data">' + revenueHtml + '</div></div>' +
            '<button class="pop-button" data-station-id="' + escapeHtml(stationId) + '" data-station-title="' + escapeHtml(title) + '">Pop all</button>';
        return div;
    }

    function escapeHtml(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('error').style.display = 'none';
        document.getElementById('stations').style.display = 'none';
        var bar = document.getElementById('summaryBar');
        if (bar) bar.style.display = 'none';
    }

    function showError(msg) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = msg;
        document.getElementById('stations').style.display = 'none';
        var bar = document.getElementById('summaryBar');
        if (bar) bar.style.display = 'none';
    }

    function showStations() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'none';
        document.getElementById('stations').style.display = 'grid';
        var bar = document.getElementById('summaryBar');
        if (bar) bar.style.display = 'flex';
    }

    function takeHomeRate(userType) {
        var t = (userType || '').toUpperCase();
        if (t === 'HOST') return 0.2;
        if (t === 'ADMIN' || t === 'DISTRIBUTER') return 0.8;
        return 0.2;
    }

    async function loadDashboard() {
        const user = getUser();
        if (!user || !user.id) {
            redirectToLogin();
            return;
        }

        const badge = document.getElementById('userBadge');
        badge.textContent = (user.username || 'User') + ' · ' + (user.type || 'USER');

        const stations = user.stations;
        if (!Array.isArray(stations) || stations.length === 0) {
            showError('No stations assigned to your account.');
            return;
        }

        showLoading();
        const { start, end } = getSelectedRange();

        try {
            const results = await Promise.all(stations.map(async function (stationId) {
                const [s, r] = await Promise.all([
                    fetchStation(stationId).catch(function () { return null; }),
                    fetchRents(stationId, start, end).catch(function () { return null; })
                ]);
                const stationData = (s && s.success && s.data) ? s.data : { id: stationId };
                return { stationData, rentData: r };
            }));

            var totalRevenue = 0;
            results.forEach(function (r) {
                var rent = parseRentData(r.rentData);
                if (rent) totalRevenue += rent.totalAmount;
            });
            var rate = takeHomeRate(user.type);
            var takeHome = Math.round(totalRevenue * rate * 100) / 100;

            document.getElementById('summaryTotalRevenue').textContent = '$' + totalRevenue.toFixed(2);
            document.getElementById('summaryTakeHome').textContent = '$' + takeHome.toFixed(2);

            const container = document.getElementById('stations');
            container.innerHTML = '';
            results.forEach(function (r, index) {
                const stationIdFromUser = stations[index];
                const card = renderStationCard(r.stationData, r.rentData, stationIdFromUser);
                container.appendChild(card);
                
                const popBtn = card.querySelector('.pop-button');
                if (popBtn) {
                    popBtn.addEventListener('click', function () {
                        const stationId = this.getAttribute('data-station-id');
                        const stationTitle = this.getAttribute('data-station-title');
                        if (stationId) {
                            showPopModal(stationId, stationTitle);
                        }
                    });
                }
            });

            showStations();
        } catch (e) {
            console.error(e);
            showError('Failed to load dashboard. Please try again.');
        }
    }

    var currentPopStationId = null;

    function showPopModal(stationId, stationTitle) {
        currentPopStationId = stationId;
        const modal = document.getElementById('popModal');
        const message = document.getElementById('popModalMessage');
        message.textContent = 'Are you sure you want to pop all batteries from "' + escapeHtml(stationTitle) + '"? This action cannot be undone.';
        modal.classList.add('active');
    }

    function hidePopModal() {
        const modal = document.getElementById('popModal');
        modal.classList.remove('active');
        currentPopStationId = null;
    }

    async function handlePopConfirm() {
        if (!currentPopStationId) return;
        
        const confirmBtn = document.getElementById('popModalConfirm');
        const cancelBtn = document.getElementById('popModalCancel');
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        confirmBtn.textContent = 'Popping...';

        try {
            await popStation(currentPopStationId);
            hidePopModal();
            loadDashboard();
        } catch (e) {
            console.error(e);
            alert('Failed to pop batteries. Please try again.');
            confirmBtn.disabled = false;
            cancelBtn.disabled = false;
            confirmBtn.textContent = 'Pop All';
        }
    }

    function init() {
        setDefaultDates();
        document.getElementById('applyDates').addEventListener('click', loadDashboard);
        document.getElementById('logout').addEventListener('click', function (e) {
            e.preventDefault();
            redirectToLogin();
        });

        const popModal = document.getElementById('popModal');
        document.getElementById('popModalCancel').addEventListener('click', hidePopModal);
        document.getElementById('popModalConfirm').addEventListener('click', handlePopConfirm);
        popModal.addEventListener('click', function (e) {
            if (e.target === popModal) {
                hidePopModal();
            }
        });

        loadDashboard();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
