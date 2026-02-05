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
            results.forEach(function (r) {
                container.appendChild(renderStationCard(r.stationData, r.rentData));
            });

            showStations();
        } catch (e) {
            console.error(e);
            showError('Failed to load dashboard. Please try again.');
        }
    }

    function isAdmin() {
        var user = getUser();
        return user && (user.type || '').toUpperCase() === 'ADMIN';
    }

    function showView(name) {
        var perf = document.getElementById('viewPerformance');
        var mgmt = document.getElementById('viewStationMgmt');
        var dateRange = document.getElementById('headerDateRange');
        var summaryBar = document.getElementById('summaryBar');
        var navPerf = document.getElementById('navPerformance');
        var navMgmt = document.getElementById('navStationMgmt');
        if (name === 'performance') {
            if (perf) perf.classList.remove('hidden');
            if (mgmt) mgmt.classList.remove('visible');
            if (dateRange) dateRange.style.display = 'flex';
            if (summaryBar) summaryBar.style.display = 'flex';
            if (navPerf) navPerf.classList.add('active');
            if (navMgmt) navMgmt.classList.remove('active');
        } else {
            if (perf) perf.classList.add('hidden');
            if (mgmt) mgmt.classList.add('visible');
            if (dateRange) dateRange.style.display = 'none';
            if (summaryBar) summaryBar.style.display = 'none';
            if (navPerf) navPerf.classList.remove('active');
            if (navMgmt) navMgmt.classList.add('active');
            loadStationManagement();
        }
    }

    async function fetchAllStations() {
        return api('/api/stations');
    }

    async function createStation(payload) {
        var res = await fetch('/api/stations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
        return json;
    }

    async function updateStation(id, payload) {
        var res = await fetch('/api/stations/' + encodeURIComponent(id), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
        return json;
    }

    async function deleteStation(id) {
        var res = await fetch('/api/stations/' + encodeURIComponent(id), { method: 'DELETE' });
        var json = await res.json();
        if (!res.ok) throw new Error(json.error || json.message || 'Request failed');
        return json;
    }

    function renderStationManagementList(stations) {
        var container = document.getElementById('stationMgmtList');
        var loading = document.getElementById('mgmtLoading');
        var errEl = document.getElementById('mgmtError');
        if (!container) return;
        loading.style.display = 'none';
        errEl.style.display = 'none';
        if (!Array.isArray(stations) || stations.length === 0) {
            container.innerHTML = '<p style="color: #a3a3a3;">No stations found.</p>';
            return;
        }
        var html = '<table class="station-mgmt-table"><thead><tr>' +
            '<th>ID</th><th>Title</th><th>Latitude</th><th>Longitude</th><th>Updated</th><th>Filled</th><th>Open</th><th></th></tr></thead><tbody>';
        stations.forEach(function (s) {
            var id = escapeHtml(String(s.id || ''));
            var title = escapeHtml(String(s.title || ''));
            var lat = escapeHtml(String(s.latitude != null ? s.latitude : ''));
            var lng = escapeHtml(String(s.longitude != null ? s.longitude : ''));
            var updated = escapeHtml(String(s.updated_at || ''));
            var filled = s.filled_slots != null ? s.filled_slots : '—';
            var open = s.open_slots != null ? s.open_slots : '—';
            html += '<tr data-station-id="' + id + '">' +
                '<td>' + id + '</td><td>' + title + '</td><td>' + lat + '</td><td>' + lng + '</td><td>' + updated + '</td><td>' + filled + '</td><td>' + open + '</td>' +
                '<td><button type="button" class="btn-edit" data-action="edit">Edit</button><button type="button" class="btn-delete" data-action="delete">Delete</button></td></tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        container.querySelectorAll('.btn-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = btn.closest('tr');
                var sid = row && row.getAttribute('data-station-id');
                if (sid) openEditStationModal(sid, row);
            });
        });
        container.querySelectorAll('.btn-delete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var row = btn.closest('tr');
                var sid = row && row.getAttribute('data-station-id');
                if (sid) openDeleteConfirmModal(sid, row);
            });
        });
    }

    function openAddStationModal() {
        document.getElementById('stationFormTitle').textContent = 'Add station';
        document.getElementById('stationForm').reset();
        document.getElementById('stationId').disabled = false;
        document.getElementById('stationFormModal').classList.add('active');
    }

    function openEditStationModal(stationId, row) {
        var cells = row.querySelectorAll('td');
        document.getElementById('stationFormTitle').textContent = 'Edit station';
        document.getElementById('stationId').value = stationId;
        document.getElementById('stationId').disabled = true;
        document.getElementById('stationTitle').value = (cells[1] && cells[1].textContent) || '';
        document.getElementById('stationLat').value = (cells[2] && cells[2].textContent) || '';
        document.getElementById('stationLng').value = (cells[3] && cells[3].textContent) || '';
        document.getElementById('stationFormModal').setAttribute('data-edit-id', stationId);
        document.getElementById('stationFormModal').classList.add('active');
    }

    function closeStationFormModal() {
        document.getElementById('stationFormModal').classList.remove('active');
        document.getElementById('stationFormModal').removeAttribute('data-edit-id');
        document.getElementById('stationId').disabled = false;
    }

    function openDeleteConfirmModal(stationId, row) {
        var title = row.querySelectorAll('td')[1];
        var msg = document.getElementById('deleteConfirmMessage');
        msg.textContent = 'Are you sure you want to delete "' + (title ? title.textContent : stationId) + '"?';
        document.getElementById('deleteConfirmModal').setAttribute('data-delete-id', stationId);
        document.getElementById('deleteConfirmModal').classList.add('active');
    }

    function closeDeleteConfirmModal() {
        document.getElementById('deleteConfirmModal').classList.remove('active');
        document.getElementById('deleteConfirmModal').removeAttribute('data-delete-id');
    }

    async function loadStationManagement() {
        var container = document.getElementById('stationMgmtList');
        var loading = document.getElementById('mgmtLoading');
        var errEl = document.getElementById('mgmtError');
        if (!container) return;
        container.innerHTML = '';
        loading.style.display = 'block';
        errEl.style.display = 'none';
        try {
            var json = await fetchAllStations();
            var list = (json.data != null && Array.isArray(json.data)) ? json.data : (json.Data && Array.isArray(json.Data) ? json.Data : []);
            renderStationManagementList(list);
        } catch (e) {
            console.error(e);
            loading.style.display = 'none';
            errEl.style.display = 'block';
            errEl.textContent = 'Failed to load stations. Please try again.';
            errEl.style.color = '#fca5a5';
        }
    }

    function init() {
        setDefaultDates();
        document.getElementById('applyDates').addEventListener('click', loadDashboard);
        document.getElementById('logout').addEventListener('click', function (e) {
            e.preventDefault();
            redirectToLogin();
        });

        if (isAdmin()) {
            var nav = document.getElementById('navTabs');
            if (nav) nav.style.display = 'flex';
            document.getElementById('navPerformance').addEventListener('click', function (e) {
                e.preventDefault();
                showView('performance');
            });
            document.getElementById('navStationMgmt').addEventListener('click', function (e) {
                e.preventDefault();
                showView('station-management');
            });
        }

        document.getElementById('addStationBtn').addEventListener('click', openAddStationModal);
        document.getElementById('stationFormCancel').addEventListener('click', closeStationFormModal);
        document.getElementById('stationForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            var editId = document.getElementById('stationFormModal').getAttribute('data-edit-id');
            var id = document.getElementById('stationId').value.trim();
            var title = document.getElementById('stationTitle').value.trim();
            var lat = parseFloat(document.getElementById('stationLat').value, 10);
            var lng = parseFloat(document.getElementById('stationLng').value, 10);
            var submitBtn = document.getElementById('stationFormSubmit');
            submitBtn.disabled = true;
            try {
                if (editId) {
                    await updateStation(editId, { title: title, latitude: lat, longitude: lng });
                    closeStationFormModal();
                    loadStationManagement();
                } else {
                    await createStation({ id: id, title: title, latitude: lat, longitude: lng });
                    closeStationFormModal();
                    loadStationManagement();
                }
            } catch (err) {
                alert(err.message || 'Request failed.');
            } finally {
                submitBtn.disabled = false;
            }
        });
        document.getElementById('deleteConfirmCancel').addEventListener('click', closeDeleteConfirmModal);
        document.getElementById('deleteConfirmBtn').addEventListener('click', async function () {
            var id = document.getElementById('deleteConfirmModal').getAttribute('data-delete-id');
            if (!id) return;
            var btn = document.getElementById('deleteConfirmBtn');
            btn.disabled = true;
            try {
                await deleteStation(id);
                closeDeleteConfirmModal();
                loadStationManagement();
            } catch (err) {
                alert(err.message || 'Delete failed.');
            } finally {
                btn.disabled = false;
            }
        });

        document.getElementById('stationFormModal').addEventListener('click', function (e) {
            if (e.target === this) closeStationFormModal();
        });
        document.getElementById('deleteConfirmModal').addEventListener('click', function (e) {
            if (e.target === this) closeDeleteConfirmModal();
        });

        loadDashboard();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
