/**
 * Performance dashboard: date range selection module.
 * Placed at the top of the performance view (#viewPerformance), above loading/skeletons and the Revenue chart.
 */
(function () {
    'use strict';

    var MODULE_ID = 'performanceDateRangeModule';

    /** Local calendar date as YYYY-MM-DD for <input type="date"> (avoid UTC shift from toISOString()). */
    function toLocalYMD(d) {
        function pad(n) { return String(n).padStart(2, '0'); }
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function setDefaultDates() {
        var startEl = document.getElementById('startDate');
        var endEl = document.getElementById('endDate');
        if (!startEl || !endEl) return;
        var end = new Date();
        var start = new Date(end.getFullYear(), end.getMonth(), 1);
        startEl.value = toLocalYMD(start);
        endEl.value = toLocalYMD(end);
    }

    function getSelectedRange() {
        var startEl = document.getElementById('startDate');
        var endEl = document.getElementById('endDate');
        var end = new Date();
        var start = new Date(end.getFullYear(), end.getMonth(), 1);
        if (startEl && endEl && startEl.value && endEl.value) {
            start = new Date(startEl.value + 'T12:00:00');
            end = new Date(endEl.value + 'T12:00:00');
        }
        return { start: start, end: end };
    }

    function validate() {
        var r = getSelectedRange();
        if (isNaN(r.start.getTime()) || isNaN(r.end.getTime())) {
            return { ok: false, message: 'Please select a valid start and end date.' };
        }
        var s = new Date(r.start.getFullYear(), r.start.getMonth(), r.start.getDate());
        var e = new Date(r.end.getFullYear(), r.end.getMonth(), r.end.getDate());
        if (s > e) {
            return { ok: false, message: 'Start date must be before or equal to end date.' };
        }
        return { ok: true, start: r.start, end: r.end };
    }

    function bindDateEnter(onApply) {
        ['startDate', 'endDate'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onApply();
                }
            });
        });
    }

    function init(onApply) {
        setDefaultDates();
        var applyBtn = document.getElementById('applyDates');
        if (applyBtn) applyBtn.addEventListener('click', onApply);
        bindDateEnter(onApply);
    }

    function getModule() {
        return document.getElementById(MODULE_ID);
    }

    window.PerformanceDateRange = {
        moduleId: MODULE_ID,
        setDefaultDates: setDefaultDates,
        getSelectedRange: getSelectedRange,
        validate: validate,
        init: init,
        getModule: getModule
    };
})();
