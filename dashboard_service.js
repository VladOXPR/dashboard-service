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
        var stationMgmt = document.getElementById('viewStationMgmt');
        var hostMgmt = document.getElementById('viewHostMgmt');
        var scansView = document.getElementById('viewScans');
        var dateRange = document.getElementById('headerDateRange');
        var summaryBar = document.getElementById('summaryBar');
        var navPerf = document.getElementById('navPerformance');
        var navStationMgmt = document.getElementById('navStationMgmt');
        var navHostMgmt = document.getElementById('navHostMgmt');
        var navScans = document.getElementById('navScans');
        if (perf) perf.classList.toggle('hidden', name !== 'performance');
        if (stationMgmt) stationMgmt.classList.toggle('visible', name === 'station-management');
        if (hostMgmt) hostMgmt.classList.toggle('visible', name === 'host-management');
        if (scansView) scansView.classList.toggle('visible', name === 'scans');
        if (dateRange) dateRange.style.display = name === 'performance' ? 'flex' : 'none';
        if (summaryBar) summaryBar.style.display = name === 'performance' ? 'flex' : 'none';
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

    function renderScansSummary(scans) {
        var el = document.getElementById('scansSummary');
        if (!el) return;
        if (!Array.isArray(scans) || scans.length === 0) {
            el.style.display = 'none';
            return;
        }
        var byType = {};
        scans.forEach(function (s) {
            var t = s.sticker_type || 'Unknown';
            byType[t] = (byType[t] || 0) + 1;
        });
        var typeCounts = Object.keys(byType).map(function (t) { return { type: t, count: byType[t] }; });
        typeCounts.sort(function (a, b) { return a.count - b.count; });
        var most = typeCounts.length ? typeCounts[typeCounts.length - 1] : null;
        var mostLine = most ? 'Most scanned type: ' + most.type + ' (' + most.count + ' scans)' : '';
        var listLine = typeCounts.length ? 'By quantity (ascending): ' + typeCounts.map(function (x) { return x.type + ' (' + x.count + ')'; }).join(', ') : '';
        el.innerHTML = '<h3>Summary</h3><div class="most-scanned">' + escapeHtml(mostLine) + '</div><div class="type-list">' + escapeHtml(listLine) + '</div>';
        el.style.display = 'block';
    }

    function renderScansList(scans) {
        var container = document.getElementById('scansList');
        if (!container) return;
        if (!Array.isArray(scans) || scans.length === 0) {
            container.innerHTML = '<p style="color: #a3a3a3;">No scans found.</p>';
            return;
        }
        var html = '<table class="scans-table"><thead><tr><th>Scan ID</th><th>Sticker ID</th><th>Order ID</th><th>Scan time</th><th>Sticker type</th><th>Duration after rent</th><th>SIZL</th></tr></thead><tbody>';
        scans.forEach(function (s) {
            var scanId = escapeHtml(String(s.scan_id || ''));
            var stickerId = escapeHtml(String(s.sticker_id || ''));
            var orderId = escapeHtml(String(s.order_id || ''));
            var scanTime = escapeHtml(String(s.scan_time || ''));
            var stickerType = escapeHtml(String(s.sticker_type || ''));
            var duration = escapeHtml(formatDurationAfterRent(s.duration_after_rent));
            var sizl = s.sizl === true ? 'Yes' : 'No';
            html += '<tr><td>' + scanId + '</td><td>' + stickerId + '</td><td>' + orderId + '</td><td>' + scanTime + '</td><td>' + stickerType + '</td><td>' + duration + '</td><td>' + sizl + '</td></tr>';
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
        loading.style.display = 'block';
        errEl.style.display = 'none';
        try {
            var json = await fetchScans();
            var list = Array.isArray(json) ? json : (json.data != null && Array.isArray(json.data) ? json.data : []);
            if (!Array.isArray(list)) list = [];
            renderScansSummary(list);
            renderScansList(list);
        } catch (e) {
            console.error(e);
            errEl.style.display = 'block';
            errEl.textContent = 'Failed to load scans. Please try again.';
            errEl.style.color = '#fca5a5';
        } finally {
            loading.style.display = 'none';
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
                if (sid) openDeleteConfirmModal('station', sid, row);
            });
        });
    }

    function renderHostManagementList(users) {
        var container = document.getElementById('hostMgmtList');
        var loading = document.getElementById('hostMgmtLoading');
        var errEl = document.getElementById('hostMgmtError');
        if (!container) return;
        loading.style.display = 'none';
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
            var stations = Array.isArray(u.stations) ? u.stations.join(', ') : '';
            html += '<tr data-user-id="' + id + '" data-user-username="' + escapeHtml(username) + '">' +
                '<td>' + id + '</td><td>' + username + '</td><td>' + type + '</td><td>' + created + '</td><td>' + updated + '</td><td>' + escapeHtml(stations) + '</td>' +
                '<td><button type="button" class="btn-edit">Edit</button><button type="button" class="btn-delete">Delete</button></td></tr>';
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

    function openDeleteConfirmModal(type, id, row) {
        var msg = document.getElementById('deleteConfirmMessage');
        var name = row && row.querySelectorAll('td')[1] ? row.querySelectorAll('td')[1].textContent : id;
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

    function openAddUserModal() {
        document.getElementById('userFormTitle').textContent = 'Add user';
        document.getElementById('userForm').reset();
        document.getElementById('userFormAddFields').style.display = 'block';
        document.getElementById('userFormModal').removeAttribute('data-edit-id');
        document.getElementById('userFormModal').classList.add('active');
    }

    function openEditUserModal(userId, row) {
        var username = row.getAttribute('data-user-username') || (row.querySelectorAll('td')[1] && row.querySelectorAll('td')[1].textContent) || '';
        document.getElementById('userFormTitle').textContent = 'Edit user';
        document.getElementById('userUsername').value = username;
        document.getElementById('userFormAddFields').style.display = 'none';
        document.getElementById('userFormModal').setAttribute('data-edit-id', userId);
        document.getElementById('userFormModal').classList.add('active');
    }

    function closeUserFormModal() {
        document.getElementById('userFormModal').classList.remove('active');
        document.getElementById('userFormModal').removeAttribute('data-edit-id');
        document.getElementById('userFormAddFields').style.display = 'block';
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

    async function loadHostManagement() {
        var container = document.getElementById('hostMgmtList');
        var loading = document.getElementById('hostMgmtLoading');
        var errEl = document.getElementById('hostMgmtError');
        if (!container) return;
        container.innerHTML = '';
        loading.style.display = 'block';
        errEl.style.display = 'none';
        try {
            var json = await fetchAllUsers();
            var list = (json.data != null && Array.isArray(json.data)) ? json.data : (json.Data && Array.isArray(json.Data) ? json.Data : []);
            renderHostManagementList(list);
        } catch (e) {
            console.error(e);
            loading.style.display = 'none';
            errEl.style.display = 'block';
            errEl.textContent = 'Failed to load users. Please try again.';
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
            document.getElementById('navHostMgmt').addEventListener('click', function (e) {
                e.preventDefault();
                showView('host-management');
            });
            document.getElementById('navScans').addEventListener('click', function (e) {
                e.preventDefault();
                showView('scans');
            });
        }

        document.getElementById('addUserBtn').addEventListener('click', openAddUserModal);
        document.getElementById('userFormCancel').addEventListener('click', closeUserFormModal);
        document.getElementById('userForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            var editId = document.getElementById('userFormModal').getAttribute('data-edit-id');
            var username = document.getElementById('userUsername').value.trim();
            var submitBtn = document.getElementById('userFormSubmit');
            submitBtn.disabled = true;
            try {
                if (editId) {
                    await updateUser(editId, { username: username });
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
        document.getElementById('userFormModal').addEventListener('click', function (e) {
            if (e.target === this) closeUserFormModal();
        });

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
