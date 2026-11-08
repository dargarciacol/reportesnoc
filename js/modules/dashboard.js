
(function () {
    'use strict';

    const totalEvents = document.getElementById('dashboard-total-events');
    const activeAlerts = document.getElementById('dashboard-active-alerts');
    const openIncidents = document.getElementById('dashboard-open-incidents');
    const activeRules = document.getElementById('dashboard-active-rules');

    const eventChart = document.getElementById('dashboard-event-chart');
    const severityChart = document.getElementById('dashboard-severity-chart');
    const recentAlerts = document.getElementById('dashboard-recent-alerts');
    const systemActivity = document.getElementById('dashboard-system-activity');

    const criticalIncidents = document.getElementById('dashboard-critical-incidents');
    const highIncidents = document.getElementById('dashboard-high-incidents');
    const mediumIncidents = document.getElementById('dashboard-medium-incidents');
    const totalOpenIncidents = document.getElementById('dashboard-total-open-incidents');

    const periodSelect = document.getElementById('dashboard-event-period');

    let dashboardData = null;
    let isActive = true;
    let requestCounter = 0;

    const previousGlobals = {
        destroy: window.destroyCurrentModule,
        navigate: window.navigateDashboard,
        render: window.renderDashboard,
        load: window.loadDashboard
    };

    function tr(key, fallback) {
        if (typeof window.t === 'function') {
            return window.t(key, fallback);
        }

        if (typeof window.translateKey === 'function') {
            return window.translateKey(key) || fallback;
        }

        return fallback;
    }

    function normalizeValue(value) {
        return String(value ?? '')
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, '_');
    }

    function translateSeverity(value) {
        const labels = {
            CRITICAL: ['critical', 'Critical'],
            HIGH: ['high', 'High'],
            MEDIUM: ['medium', 'Medium'],
            LOW: ['low', 'Low']
        };

        const item = labels[normalizeValue(value)];

        return item ? tr(item[0], item[1]) : value || '--';
    }

    function translateStatus(value) {
        const labels = {
            NEW: ['new', 'New'],
            IN_PROGRESS: ['inProgress', 'In Progress'],
            UNDER_INVESTIGATION: ['underInvestigation', 'Under Investigation'],
            RESOLVED: ['resolved', 'Resolved'],
            ESCALATED: ['escalated', 'Escalated'],
            FALSE_POSITIVE: ['falsePositive', 'False Positive']
        };

        const item = labels[normalizeValue(value)];

        return item ? tr(item[0], item[1]) : value || '--';
    }

    function formatNumber(value) {
        const number = Number(value);

        return Number.isFinite(number)
            ? number.toLocaleString()
            : '0';
    }

    function getSeverityColor(severity) {
        const colors = {
            CRITICAL: '#EF4444',
            HIGH: '#F97316',
            MEDIUM: '#EAB308',
            LOW: '#06B6D4'
        };

        return colors[normalizeValue(severity)] || '#94A3B8';
    }

    function setText(element, value) {
        if (element) {
            element.textContent = value ?? '--';
        }
    }

    function showLoading() {
        [
            totalEvents,
            activeAlerts,
            openIncidents,
            activeRules,
            criticalIncidents,
            highIncidents,
            mediumIncidents,
            totalOpenIncidents
        ].forEach(element => setText(element, '...'));

        if (recentAlerts) {
            recentAlerts.replaceChildren();

            const row = document.createElement('tr');
            const cell = document.createElement('td');

            cell.colSpan = 5;
            cell.className = 'text-center text-muted py-4';
            cell.textContent = tr('loading', 'Loading dashboard data...');

            row.appendChild(cell);
            recentAlerts.appendChild(row);
        }

        if (systemActivity) {
            systemActivity.textContent =
                tr('loading', 'Loading system activity...');
            systemActivity.className = 'text-muted small py-3';
        }
    }

    function showError(error) {
        console.error('NOVA SIEM Dashboard:', error);

        const message = tr(
            'dashboardLoadError',
            'Unable to load dashboard data.'
        );

        if (recentAlerts) {
            recentAlerts.replaceChildren();

            const row = document.createElement('tr');
            const cell = document.createElement('td');

            cell.colSpan = 5;
            cell.className = 'text-center text-danger py-4';
            cell.textContent = message;

            row.appendChild(cell);
            recentAlerts.appendChild(row);
        }

        if (systemActivity) {
            systemActivity.textContent = message;
            systemActivity.className = 'text-danger small py-3';
        }

        [
            totalEvents,
            activeAlerts,
            openIncidents,
            activeRules,
            criticalIncidents,
            highIncidents,
            mediumIncidents,
            totalOpenIncidents
        ].forEach(element => setText(element, '--'));

        if (eventChart) {
            eventChart.textContent = message;
        }

        if (severityChart) {
            severityChart.textContent = message;
        }
    }

    function renderMetrics() {
        const metrics = dashboardData?.metrics || {};

        setText(totalEvents, formatNumber(metrics.totalEvents));
        setText(activeAlerts, formatNumber(metrics.activeAlerts));
        setText(openIncidents, formatNumber(metrics.openIncidents));
        setText(activeRules, formatNumber(metrics.activeRules));
    }

    function renderIncidentOverview() {
        const incidents = dashboardData?.incidents || {};

        const critical = Number(incidents.critical) || 0;
        const high = Number(incidents.high) || 0;
        const medium = Number(incidents.medium) || 0;

        setText(criticalIncidents, formatNumber(critical));
        setText(highIncidents, formatNumber(high));
        setText(mediumIncidents, formatNumber(medium));
        setText(totalOpenIncidents, formatNumber(critical + high + medium));
    }

    function renderEventChart(period = '24h') {
        if (!eventChart) return;

        const events = dashboardData?.events || {};
        const values = Array.isArray(events[period])
            ? events[period].map(value => Number(value) || 0)
            : [];

        if (!values.length) {
            eventChart.innerHTML = `
                <div class="text-muted small text-center py-5">
                    ${tr('noEventData', 'No event data available.')}
                </div>
            `;
            return;
        }

        const maxValue = Math.max(...values, 1);

        const bars = values.map((value, index) => {
            const height = Math.max((value / maxValue) * 100, 5);

            return `
                <div class="d-flex flex-column align-items-center justify-content-end flex-fill h-100"
                     title="${value} events">

                    <div class="w-100 rounded-top"
                         style="
                            height: ${height}%;
                            background: linear-gradient(
                                180deg,
                                var(--primary),
                                rgba(139, 92, 246, 0.25)
                            );
                            min-height: 5px;
                            transition: height .3s ease;
                         ">
                    </div>

                    <span class="text-muted mt-2" style="font-size: 10px;">
                        ${index + 1}
                    </span>
                </div>
            `;
        }).join('');

        eventChart.innerHTML = `
            <div class="d-flex flex-column h-100 justify-content-between">

                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="text-muted small">
                        ${tr('eventVolume', 'Event Volume')}
                    </span>

                    <span class="badge bg-info bg-opacity-10 text-info">
                        ${tr('liveMonitoring', 'Live Monitoring')}
                    </span>
                </div>

                <div class="d-flex align-items-end justify-content-around gap-2 flex-grow-1"
                     style="min-height: 150px; padding-top: 15px;">
                    ${bars}
                </div>

            </div>
        `;
    }

    function renderSeverityChart() {
        if (!severityChart) return;

        const data = dashboardData?.severity || {};

        const critical = Number(data.critical) || 0;
        const high = Number(data.high) || 0;
        const medium = Number(data.medium) || 0;
        const low = Number(data.low) || 0;

        const total = critical + high + medium + low;

        if (total === 0) {
            severityChart.innerHTML = `
                <div class="text-muted small text-center py-5">
                    ${tr('noSeverityData', 'No severity data available.')}
                </div>
            `;
            return;
        }

        const criticalPercent = (critical / total) * 100;
        const highPercent = (high / total) * 100;
        const mediumPercent = (medium / total) * 100;

        const highEnd = criticalPercent + highPercent;
        const mediumEnd = highEnd + mediumPercent;

        severityChart.innerHTML = `
            <div class="d-flex flex-column align-items-center justify-content-center h-100">

                <div class="position-relative rounded-circle d-flex align-items-center justify-content-center"
                     style="
                        width: 150px;
                        height: 150px;
                        background: conic-gradient(
                            #EF4444 0% ${criticalPercent}%,
                            #F97316 ${criticalPercent}% ${highEnd}%,
                            #EAB308 ${highEnd}% ${mediumEnd}%,
                            #06B6D4 ${mediumEnd}% 100%
                        );
                     ">

                    <div class="rounded-circle d-flex flex-column align-items-center justify-content-center"
                         style="
                            width: 105px;
                            height: 105px;
                            background: var(--bg-surface);
                         ">

                        <span class="fs-4 fw-bold text-main">
                            ${formatNumber(total)}
                        </span>

                        <span class="text-muted" style="font-size: 10px;">
                            ${tr('totalAlerts', 'Total Alerts')}
                        </span>

                    </div>
                </div>

                <div class="d-flex flex-wrap justify-content-center gap-3 mt-4">

                    ${[
                        ['Critical', critical, '#EF4444'],
                        ['High', high, '#F97316'],
                        ['Medium', medium, '#EAB308'],
                        ['Low', low, '#06B6D4']
                    ].map(([severity, count, color]) => `
                        <span class="small">
                            <span class="badge rounded-circle me-1"
                                  style="background:${color};">&nbsp;</span>
                            ${translateSeverity(severity)} ${formatNumber(count)}
                        </span>
                    `).join('')}

                </div>
            </div>
        `;
    }

    function renderRecentAlerts() {
        if (!recentAlerts) return;

        const alerts = Array.isArray(dashboardData?.alerts)
            ? dashboardData.alerts
            : [];

        recentAlerts.replaceChildren();

        if (!alerts.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');

            cell.colSpan = 5;
            cell.className = 'text-center text-muted py-4';
            cell.textContent = tr('noRecentAlerts', 'No recent alerts.');

            row.appendChild(cell);
            recentAlerts.appendChild(row);
            return;
        }

        alerts.forEach(alert => {
            const row = document.createElement('tr');
            const color = getSeverityColor(alert.severity);

            const values = [
                alert.id,
                alert.description,
                translateSeverity(alert.severity),
                translateStatus(alert.status),
                alert.time
            ];

            values.forEach((value, index) => {
                const cell = document.createElement('td');

                if (index === 0) {
                    cell.className = 'font-monospace text-info';
                }

                if (index === 2) {
                    const badge = document.createElement('span');

                    badge.className = 'badge';
                    badge.style.backgroundColor = `${color}20`;
                    badge.style.color = color;
                    badge.style.border = `1px solid ${color}`;
                    badge.textContent = value ?? '--';

                    cell.appendChild(badge);
                } else {
                    cell.textContent = value ?? '--';
                }

                if (index === 4) {
                    cell.classList.add('text-muted', 'small');
                }

                row.appendChild(cell);
            });

            recentAlerts.appendChild(row);
        });
    }

    function renderSystemActivity() {
        if (!systemActivity) return;

        const activity = Array.isArray(dashboardData?.activity)
            ? dashboardData.activity
            : [];

        systemActivity.replaceChildren();

        if (!activity.length) {
            const empty = document.createElement('div');

            empty.className = 'text-muted small py-3';
            empty.textContent = tr(
                'noRecentActivity',
                'No recent system activity.'
            );

            systemActivity.appendChild(empty);
            return;
        }

        const icons = {
            SUCCESS: 'bi-check-circle-fill text-success',
            INFO: 'bi-info-circle-fill text-info',
            WARNING: 'bi-exclamation-triangle-fill text-warning'
        };

        activity.forEach(item => {
            const iconClass = icons[normalizeValue(item.type)]
                || 'bi-circle text-muted';

            const row = document.createElement('div');

            row.className =
                'd-flex align-items-start justify-content-between gap-3 py-3 border-bottom border-panel';

            const left = document.createElement('div');
            left.className = 'd-flex align-items-start gap-3';

            const icon = document.createElement('i');
            icon.className = `bi ${iconClass} mt-1`;

            const description = document.createElement('div');

            const action = document.createElement('div');
            action.className = 'text-main small fw-semibold';
            action.textContent = item.action || '--';

            const source = document.createElement('div');
            source.className = 'text-muted';
            source.style.fontSize = '11px';
            source.textContent = item.source || '--';

            description.append(action, source);
            left.append(icon, description);

            const right = document.createElement('div');
            right.className = 'text-end';

            const time = document.createElement('div');
            time.className = 'text-muted';
            time.style.fontSize = '11px';
            time.textContent = item.time || '--';

            const result = document.createElement('span');
            result.className = 'small text-success';
            result.textContent = item.result || '--';

            right.append(time, result);
            row.append(left, right);

            systemActivity.appendChild(row);
        });
    }

    function renderDashboard() {
        if (!isActive || !dashboardData) return;

        renderMetrics();
        renderIncidentOverview();
        renderEventChart(periodSelect?.value || '24h');
        renderSeverityChart();
        renderRecentAlerts();
        renderSystemActivity();
    }

    async function loadDashboard() {
        if (!isActive) return;

        if (!window.HttpClient || !window.ENDPOINTS?.DASHBOARD?.SUMMARY) {
            showError(new Error('Dashboard API configuration is unavailable.'));
            return;
        }

        const currentRequest = ++requestCounter;

        showLoading();

        try {
            const response = await HttpClient.get(
                ENDPOINTS.DASHBOARD.SUMMARY
            );

            if (!isActive || currentRequest !== requestCounter) {
                return;
            }

            if (!response || !response.data || typeof response.data !== 'object') {
                throw new Error('Invalid dashboard response from backend.');
            }

            dashboardData = response.data;

            renderDashboard();

        } catch (error) {
            if (!isActive || currentRequest !== requestCounter) {
                return;
            }

            dashboardData = null;
            showError(error);
        }
    }

    function handlePeriodChange(event) {
        renderEventChart(event.target.value);
    }

    function handleLanguageChange() {
        renderDashboard();
    }

    if (periodSelect) {
        periodSelect.addEventListener('change', handlePeriodChange);
    }

    document.addEventListener(
        'nova:languageChanged',
        handleLanguageChange
    );

    function navigateDashboard(route) {
        if (!isActive || typeof route !== 'string') return;

        const link = document.querySelector(
            `.nav-link[data-route="${CSS.escape(route)}"]`
        );

        if (link) {
            link.click();
        }
    }

    window.navigateDashboard = navigateDashboard;
    window.renderDashboard = renderDashboard;
    window.loadDashboard = loadDashboard;

    function destroyDashboard() {
        if (!isActive) return;

        isActive = false;
        requestCounter++;

        if (periodSelect) {
            periodSelect.removeEventListener('change', handlePeriodChange);
        }

        document.removeEventListener(
            'nova:languageChanged',
            handleLanguageChange
        );

        if (window.navigateDashboard === navigateDashboard) {
            window.navigateDashboard = previousGlobals.navigate;
        }

        if (window.renderDashboard === renderDashboard) {
            window.renderDashboard = previousGlobals.render;
        }

        if (window.loadDashboard === loadDashboard) {
            window.loadDashboard = previousGlobals.load;
        }

        if (window.destroyCurrentModule === destroyDashboard) {
            window.destroyCurrentModule = previousGlobals.destroy;
        }

        dashboardData = null;
    }

    window.destroyCurrentModule = destroyDashboard;

    loadDashboard();

})();
