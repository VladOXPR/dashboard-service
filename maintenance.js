(function () {
    'use strict';

    const STATIONS_URL = '/api/stations';
    const TICKETS_URL = '/api/tickets';

    const TASK_TYPES = [
        'High Batteries',
        'Low Batteries',
        'No Batteries',
        'Add Stack',
        'Broken Battery',
        'High Failure Rates',
        'Hardware Malfunction',
        'Unusually Offline',
        'Other',
    ];

    const RED_TASKS = new Set([
        'Low Batteries',
        'No Batteries',
        'Broken Battery',
        'Unusually Offline',
    ]);

    const STORAGE_KEY = 'cuub_user';

    /** @type {Map<string, object>} */
    var stationsById = new Map();
    var lastStations = [];

    function getUser() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function isAdmin() {
        var u = getUser();
        return u && (u.type || '').toUpperCase() === 'ADMIN';
    }

    function redirectToLogin() {
        sessionStorage.removeItem(STORAGE_KEY);
        window.location.href = '/login';
    }

    function isTestStationTitle(title) {
        return String(title || '').trim().toLowerCase() === 'test station';
    }

    function filterStations(stations) {
        return (stations || []).filter(function (s) {
            return !isTestStationTitle(s && s.title);
        });
    }

    async function fetchJson(url, options) {
        var res = await fetch(url, options || {});
        var text = await res.text();
        var data = {};
        if (text && text.trim()) {
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = {};
            }
        }
        return { res: res, data: data };
    }

    function parseFilledSlotsStrict(filled) {
        if (filled == null || filled === 'N/A') return null;
        var s = String(filled).trim();
        if (!/^-?\d+$/.test(s)) return null;
        return parseInt(s, 10);
    }

    function parseOpenSlotsNum(open) {
        if (open == null) return null;
        var s = String(open).trim();
        if (!/^-?\d+$/.test(s)) return null;
        return parseInt(s, 10);
    }

    function computeTotalSlots(station) {
        var f = parseFilledSlotsStrict(station.filled_slots);
        var o = parseOpenSlotsNum(station.open_slots);
        if (f == null || o == null) return 6;
        return f + o;
    }

    /**
     * @returns {'red'|'yellow'|'green'|null}
     */
    function computeHealthLevel(station) {
        var filledSlotsNum = parseFilledSlotsStrict(station.filled_slots);
        if (filledSlotsNum == null) return null;

        var totalSlots = computeTotalSlots(station);
        if (totalSlots <= 0) return null;

        if (filledSlotsNum <= 0) return 'red';
        if (filledSlotsNum >= totalSlots) return 'red';
        if (filledSlotsNum / totalSlots <= 1 / 3) return 'yellow';
        return 'green';
    }

    function healthSortPriority(level) {
        if (level === 'red') return 1;
        if (level === 'yellow') return 2;
        if (level === 'green') return 3;
        return 4;
    }

    function parsePostgresArrayText(inner) {
        var s = String(inner).trim();
        if (!s.length) return [];
        var out = [];
        var cur = '';
        var inQ = false;
        for (var i = 0; i < s.length; i++) {
            var c = s[i];
            if (inQ) {
                if (c === '\\' && i + 1 < s.length) {
                    cur += s[++i];
                    continue;
                }
                if (c === '"') {
                    inQ = false;
                    continue;
                }
                cur += c;
            } else {
                if (c === '"') {
                    inQ = true;
                    continue;
                }
                if (c === ',') {
                    if (cur.trim()) out.push(cur.trim());
                    cur = '';
                    continue;
                }
                cur += c;
            }
        }
        if (cur.trim()) out.push(cur.trim());
        return out;
    }

    function splitCommaLabels(s) {
        return String(s)
            .split(',')
            .map(function (x) {
                return x.trim();
            })
            .filter(Boolean);
    }

    function normalizeLabelList(rawList) {
        var flat = [];
        (rawList || []).forEach(function (item) {
            if (item == null) return;
            var str = String(item).trim();
            if (!str) return;
            splitCommaLabels(str).forEach(function (p) {
                if (p) flat.push(p);
            });
        });
        var seen = {};
        var out = [];
        flat.forEach(function (lab) {
            if (!seen[lab]) {
                seen[lab] = true;
                out.push(lab);
            }
        });
        return out;
    }

    /** Strip JSON / Postgres array punctuation from task labels for display and matching. */
    function stripTaskDisplayNoise(s) {
        if (s == null) return '';
        return String(s)
            .replace(/[{}"]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normalizeTaskField(task) {
        var result;
        if (Array.isArray(task)) {
            result = normalizeLabelList(task);
        } else if (task == null) {
            result = [];
        } else {
            var t = String(task).trim();
            if (!t) {
                result = [];
            } else if (t.charAt(0) === '[') {
                try {
                    var parsed = JSON.parse(t);
                    if (Array.isArray(parsed)) {
                        result = normalizeLabelList(parsed);
                    } else {
                        result = normalizeLabelList([t]);
                    }
                } catch (e) {
                    result = normalizeLabelList([t]);
                }
            } else if (t.charAt(0) === '{' && t.charAt(t.length - 1) === '}') {
                result = normalizeLabelList(parsePostgresArrayText(t.slice(1, -1)));
            } else {
                result = normalizeLabelList([t]);
            }
        }
        var seen = {};
        var out = [];
        (result || []).forEach(function (lab) {
            var x = stripTaskDisplayNoise(lab);
            if (!x) return;
            if (seen[x]) return;
            seen[x] = true;
            out.push(x);
        });
        return out;
    }

    function dbTicketColor(tasks) {
        if (!tasks || !tasks.length) return 'yellow';
        for (var i = 0; i < tasks.length; i++) {
            if (RED_TASKS.has(tasks[i])) return 'red';
        }
        return 'yellow';
    }

    function buildDbTicket(row, i) {
        var tasks = normalizeTaskField(row.task);
        var color = dbTicketColor(tasks);
        return {
            id: 'ticket-db-' + row.id,
            dbId: Number(row.id),
            stationId: String(row.station_id != null ? row.station_id : ''),
            stationName: row.location_name || 'Unknown',
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            tasks: tasks,
            description: row.description != null ? String(row.description) : '',
            serviceType: tasks.join(' · ') || 'Other',
            color: color,
            source: 'database',
            sortOrder: i,
        };
    }

    function buildAutoTickets(stations) {
        var candidates = [];
        stations.forEach(function (station) {
            var level = computeHealthLevel(station);
            if (level !== 'red' && level !== 'yellow') return;
            var filledSlotsNum = parseFilledSlotsStrict(station.filled_slots);
            var totalSlots = computeTotalSlots(station);
            candidates.push({
                station: station,
                level: level,
                filledSlotsNum: filledSlotsNum,
                totalSlots: totalSlots,
                priority: healthSortPriority(level),
            });
        });
        candidates.sort(function (a, b) {
            if (a.priority !== b.priority) return a.priority - b.priority;
            var ta = String((a.station && a.station.title) || a.station.id || '');
            var tb = String((b.station && b.station.title) || b.station.id || '');
            return ta.localeCompare(tb, undefined, { sensitivity: 'base' });
        });
        return candidates.map(function (c, i) {
            var station = c.station;
            var lat = parseFloat(station.latitude);
            var lon = parseFloat(station.longitude);
            return {
                id: 'ticket-' + station.id,
                stationId: String(station.id),
                stationName: station.title || 'Unknown',
                latitude: lat,
                longitude: lon,
                serviceType: 'Battery Redistribution',
                color: c.level,
                source: 'station-status',
                sortOrder: i,
                filledSlots: c.filledSlotsNum,
                totalSlots: c.totalSlots,
            };
        });
    }

    function mergeTickets(dbTicketObjs, autoTicketObjs, stationMap) {
        var dbStationIds = new Set();
        dbTicketObjs.forEach(function (t) {
            if (t.stationId) dbStationIds.add(t.stationId);
        });
        var merged = dbTicketObjs.slice();
        autoTicketObjs.forEach(function (a) {
            if (!dbStationIds.has(a.stationId)) merged.push(a);
        });
        merged.forEach(function (t) {
            if (t.filledSlots != null && t.totalSlots != null) return;
            var st = stationMap.get(t.stationId);
            if (!st) return;
            var f = parseFilledSlotsStrict(st.filled_slots);
            var tot = computeTotalSlots(st);
            if (f != null) t.filledSlots = f;
            if (tot != null) t.totalSlots = tot;
        });
        merged.forEach(function (t, idx) {
            t.sortOrder = idx;
        });
        return merged;
    }

    async function fetchStationsList() {
        var r = await fetchJson(STATIONS_URL);
        if (!r.res.ok || !r.data || r.data.success !== true || !Array.isArray(r.data.data)) {
            throw new Error((r.data && r.data.error) || 'Failed to load stations');
        }
        return filterStations(r.data.data);
    }

    async function fetchTicketsList() {
        var r = await fetchJson(TICKETS_URL);
        if (!r.res.ok) {
            if (r.res.status === 404) return [];
            throw new Error((r.data && r.data.error) || 'Failed to load tickets');
        }
        if (!r.data || r.data.success !== true || !Array.isArray(r.data.data)) {
            return [];
        }
        return r.data.data;
    }

    function rebuildStationsMap(stations) {
        stationsById = new Map();
        lastStations = stations;
        stations.forEach(function (s) {
            var id = String(s.id != null ? s.id : '');
            if (id) stationsById.set(id, s);
        });
    }

    function populateCreateStationSelect(stations) {
        var sel = document.getElementById('create-station');
        if (!sel) return;
        sel.innerHTML = '<option value="">— Select station —</option>';
        stations.forEach(function (s) {
            var id = String(s.id != null ? s.id : '');
            if (!id) return;
            var opt = document.createElement('option');
            opt.value = id;
            opt.textContent = s.title || id;
            sel.appendChild(opt);
        });
    }

    function populateCreateTaskSelect() {
        var sel = document.getElementById('create-task');
        if (!sel) return;
        sel.innerHTML = '';
        TASK_TYPES.forEach(function (t) {
            var opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            sel.appendChild(opt);
        });
    }

    function updateCreateStationHint() {
        var sel = document.getElementById('create-station');
        var hint = document.getElementById('create-station-id-hint');
        if (!sel || !hint) return;
        var id = sel.value;
        if (!id) {
            hint.textContent = 'Select a station to create a ticket.';
            return;
        }
        var st = stationsById.get(id);
        var title = st && st.title ? st.title : id;
        hint.textContent = 'Using station ID ' + id + ' — ' + title;
    }

    function setStatus(msg, isError) {
        var el = document.getElementById('maintenance-status');
        if (!el) return;
        el.textContent = msg || '';
        el.style.display = msg ? 'block' : 'none';
        el.style.color = isError ? '#fca5a5' : '#a3a3a3';
    }

    function clearCreateError() {
        var el = document.getElementById('modal-create-error');
        if (el) {
            el.textContent = '';
            el.style.display = 'none';
        }
    }

    function clearEditError() {
        var el = document.getElementById('modal-edit-error');
        if (el) {
            el.textContent = '';
            el.style.display = 'none';
        }
    }

    function showCreateError(msg) {
        var el = document.getElementById('modal-create-error');
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
        el.style.color = '#fca5a5';
    }

    function showEditError(msg) {
        var el = document.getElementById('modal-edit-error');
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
        el.style.color = '#fca5a5';
    }

    function openModal(id) {
        var m = document.getElementById(id);
        if (m) m.classList.add('active');
    }

    function closeModal(id) {
        var m = document.getElementById(id);
        if (m) m.classList.remove('active');
    }

    function renderTicketList(tickets) {
        var list = document.getElementById('ticket-list');
        if (!list) return;
        list.innerHTML = '';
        if (!tickets.length) {
            list.innerHTML = '<li class="ticket-empty">No open tickets.</li>';
            return;
        }
        tickets.forEach(function (t) {
            var li = document.createElement('li');
            li.className = 'ticket-row ticket-color-' + t.color;
            var batteryPart =
                t.filledSlots != null && t.totalSlots != null
                    ? escapeHtml(String(t.filledSlots)) + ' / ' + escapeHtml(String(t.totalSlots))
                    : '— / —';
            var taskText =
                t.source === 'station-status'
                    ? 'Battery Redistribution'
                    : (t.tasks && t.tasks.length ? t.tasks.join(' · ') : t.serviceType || 'Other');
            taskText = escapeHtml(taskText);
            var actions = '';
            if (t.source === 'database' && Number.isFinite(t.dbId)) {
                actions =
                    '<div class="ticket-actions">' +
                    '<button type="button" class="btn-ticket-edit" data-db-id="' +
                    t.dbId +
                    '">Edit</button>' +
                    '<button type="button" class="btn-ticket-done" data-db-id="' +
                    t.dbId +
                    '">Done</button>' +
                    '</div>';
            }
            li.innerHTML =
                '<div class="ticket-stripe" aria-hidden="true"></div>' +
                '<div class="ticket-main">' +
                '<div class="ticket-text">' +
                '<div class="ticket-line1">' +
                escapeHtml(t.stationName) +
                '</div>' +
                '<div class="ticket-line2">' +
                '<span class="ticket-battery">' +
                batteryPart +
                '</span>' +
                '<span class="ticket-line2-sep" aria-hidden="true"> · </span>' +
                '<span class="ticket-task">' +
                taskText +
                '</span>' +
                '</div>' +
                '</div>' +
                actions +
                '</div>';
            list.appendChild(li);
        });

        list.querySelectorAll('.btn-ticket-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = Number(btn.getAttribute('data-db-id'));
                openEditForDbId(id);
            });
        });
        list.querySelectorAll('.btn-ticket-done').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = Number(btn.getAttribute('data-db-id'));
                deleteTicket(id);
            });
        });
    }

    function escapeHtml(s) {
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    async function fullRefresh() {
        setStatus('');
        var stations = await fetchStationsList();
        rebuildStationsMap(stations);
        populateCreateStationSelect(stations);
        updateCreateStationHint();

        var dbRows = [];
        try {
            dbRows = await fetchTicketsList();
        } catch (e) {
            console.warn(e);
            dbRows = [];
        }
        var dbTickets = dbRows.map(function (row, i) {
            return buildDbTicket(row, i);
        });
        var autoTickets = buildAutoTickets(stations);
        var merged = mergeTickets(dbTickets, autoTickets, stationsById);
        renderTicketList(merged);
    }

    async function openEditForDbId(dbId) {
        var tickets = [];
        try {
            tickets = await fetchTicketsList();
        } catch (e) {
            return;
        }
        var row = tickets.find(function (r) {
            return Number(r.id) === dbId;
        });
        if (!row) return;
        var ticket = buildDbTicket(row, 0);
        if (ticket.source !== 'database' || !Number.isFinite(ticket.dbId)) return;

        document.getElementById('edit-db-id').value = String(ticket.dbId);
        document.getElementById('edit-location-name').value = ticket.stationName;
        document.getElementById('edit-description').value = ticket.description || '';

        var latOk = Number.isFinite(ticket.latitude);
        var lonOk = Number.isFinite(ticket.longitude);
        document.getElementById('edit-latitude').value = latOk ? String(ticket.latitude) : '';
        document.getElementById('edit-longitude').value = lonOk ? String(ticket.longitude) : '';

        var sel = document.getElementById('edit-task');
        sel.innerHTML = '';
        var taskSet = new Set(TASK_TYPES);
        TASK_TYPES.forEach(function (t) {
            var opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            sel.appendChild(opt);
        });
        (ticket.tasks || []).forEach(function (t) {
            if (!taskSet.has(t)) {
                var opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                sel.appendChild(opt);
            }
        });
        Array.from(sel.options).forEach(function (opt) {
            opt.selected = (ticket.tasks || []).indexOf(opt.value) !== -1;
        });

        clearEditError();
        openModal('modal-edit');
    }

    async function deleteTicket(dbId) {
        setStatus('');
        var r = await fetchJson(TICKETS_URL + '/' + encodeURIComponent(dbId), { method: 'DELETE' });
        var ok = r.res.ok && r.data.success !== false;
        if (!ok) {
            var msg =
                (r.data && (r.data.error || r.data.message)) ||
                'Delete failed (' + r.res.status + ')';
            setStatus(msg, true);
            return;
        }
        await fullRefresh();
    }

    function validateCreateSubmit(stationId, tasks, station) {
        if (!stationId) {
            showCreateError('Select a station.');
            return false;
        }
        if (!tasks.length) {
            showCreateError('Select at least one task.');
            return false;
        }
        for (var i = 0; i < tasks.length; i++) {
            if (TASK_TYPES.indexOf(tasks[i]) === -1) {
                showCreateError('Invalid task: ' + tasks[i]);
                return false;
            }
        }
        if (!station) {
            showCreateError('Pick a station from the list (station ID must match the API).');
            return false;
        }
        var lat = parseFloat(station.latitude);
        var lon = parseFloat(station.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            showCreateError('Station coordinates are invalid.');
            return false;
        }
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            showCreateError('Station latitude or longitude is out of range.');
            return false;
        }
        return true;
    }

    async function submitCreate() {
        clearCreateError();
        var stationId = (document.getElementById('create-station').value || '').trim();
        var selTasks = document.getElementById('create-task');
        var selectedTasks = Array.from(selTasks.selectedOptions).map(function (o) {
            return o.value;
        });
        var description = (document.getElementById('create-description').value || '').trim();
        var station = stationsById.get(stationId);
        if (!validateCreateSubmit(stationId, selectedTasks, station)) return;

        var lat = parseFloat(station.latitude);
        var lon = parseFloat(station.longitude);
        var body = {
            location_name: (station.title && station.title.trim()) || String(station.id),
            station_id: String(station.id).trim(),
            latitude: lat,
            longitude: lon,
            task: selectedTasks,
        };
        if (description) body.description = description;

        var r = await fetchJson(TICKETS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        var ok = r.res.ok && r.data.success !== false;
        if (!ok) {
            var msg =
                (r.data && (r.data.error || r.data.message)) ||
                'Create failed (' + r.res.status + ')';
            if (r.res.status === 404) {
                msg += ' The tickets proxy route or upstream base URL may be misconfigured.';
            }
            showCreateError(msg);
            return;
        }
        closeModal('modal-create');
        document.getElementById('create-description').value = '';
        Array.from(selTasks.options).forEach(function (o) {
            o.selected = false;
        });
        await fullRefresh();
    }

    async function submitEdit() {
        clearEditError();
        var dbId = parseInt(document.getElementById('edit-db-id').value, 10);
        if (!Number.isFinite(dbId)) {
            showEditError('Invalid ticket.');
            return;
        }
        var location_name = (document.getElementById('edit-location-name').value || '').trim();
        if (!location_name) {
            showEditError('Location name is required.');
            return;
        }
        var sel = document.getElementById('edit-task');
        var selectedTasks = Array.from(sel.selectedOptions).map(function (o) {
            return o.value;
        });
        if (!selectedTasks.length) {
            showEditError('Select at least one task.');
            return;
        }
        var description = document.getElementById('edit-description').value;
        var latStr = (document.getElementById('edit-latitude').value || '').trim();
        var lonStr = (document.getElementById('edit-longitude').value || '').trim();
        var body = {
            location_name: location_name,
            task: selectedTasks,
            description: description,
        };

        if (!latStr && !lonStr) {
            /* omit coords */
        } else if (latStr && lonStr) {
            var lat = parseFloat(latStr);
            var lon = parseFloat(lonStr);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
                showEditError('Latitude and longitude must be valid numbers.');
                return;
            }
            if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                showEditError('Coordinates are out of range.');
                return;
            }
            body.latitude = lat;
            body.longitude = lon;
        } else {
            showEditError('Enter both latitude and longitude, or clear both to keep existing coordinates.');
            return;
        }

        var r = await fetchJson(TICKETS_URL + '/' + encodeURIComponent(dbId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        var ok = r.res.ok && r.data.success !== false;
        if (!ok) {
            var msg =
                (r.data && (r.data.error || r.data.message)) ||
                'Update failed (' + r.res.status + ')';
            if (r.res.status === 404) {
                msg +=
                    ' Restart the server proxy to pick up PATCH /api/tickets, or check CUUB_TICKETS_API_URL if applicable.';
            }
            showEditError(msg);
            return;
        }
        closeModal('modal-edit');
        await fullRefresh();
    }

    function dashboardBasePath() {
        var u = getUser();
        var t = (u && u.type ? String(u.type) : 'admin').toLowerCase();
        if (t === 'distributor') return '/distributor';
        if (t === 'distributer') return '/distributer';
        if (t === 'host') return '/host';
        return '/admin';
    }

    function initShellNavigation() {
        var base = dashboardBasePath();
        var perf = document.getElementById('navPerformance');
        if (perf) {
            perf.href = base + '?view=performance';
            perf.classList.remove('active');
        }
        var maint = document.getElementById('navMaintenance');
        if (maint) {
            maint.href = '/maintenance';
            maint.classList.add('active');
        }
        var scans = document.getElementById('navScans');
        if (scans) scans.href = base + '?view=scans';
        var st = document.getElementById('navStationMgmt');
        if (st) st.href = base + '?view=station-management';
        var host = document.getElementById('navHostMgmt');
        if (host) host.href = base + '?view=host-management';

        document.querySelectorAll('[data-admin-only]').forEach(function (el) {
            el.style.display = isAdmin() ? '' : 'none';
        });

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
                if (hamburgerMenu.classList.contains('open')) closeHamburgerMenu();
                else openHamburgerMenu();
            });
        }
        if (hamburgerOverlay) {
            hamburgerOverlay.addEventListener('click', closeHamburgerMenu);
        }
        var logoutEl = document.getElementById('logout');
        if (logoutEl) {
            logoutEl.addEventListener('click', function (e) {
                e.preventDefault();
                closeHamburgerMenu();
                redirectToLogin();
            });
        }
        document.querySelectorAll('#navTabs a').forEach(function (a) {
            a.addEventListener('click', function () {
                closeHamburgerMenu();
            });
        });
    }

    async function init() {
        if (!isAdmin()) {
            redirectToLogin();
            return;
        }
        initShellNavigation();
        populateCreateTaskSelect();
        document.getElementById('create-station').addEventListener('change', updateCreateStationHint);
        document.getElementById('btn-create-ticket').addEventListener('click', function () {
            clearCreateError();
            openModal('modal-create');
        });
        document.getElementById('modal-create-cancel').addEventListener('click', function () {
            closeModal('modal-create');
            clearCreateError();
        });
        document.getElementById('modal-create-submit').addEventListener('click', function () {
            submitCreate();
        });
        document.getElementById('modal-edit-cancel').addEventListener('click', function () {
            closeModal('modal-edit');
            clearEditError();
        });
        document.getElementById('modal-edit-submit').addEventListener('click', function () {
            submitEdit();
        });
        document.querySelectorAll('.modal-overlay').forEach(function (ov) {
            ov.addEventListener('click', function (e) {
                if (e.target === ov) {
                    ov.classList.remove('active');
                    clearCreateError();
                    clearEditError();
                }
            });
        });

        try {
            await fullRefresh();
        } catch (e) {
            console.error(e);
            setStatus((e && e.message) || 'Failed to load maintenance data.', true);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
