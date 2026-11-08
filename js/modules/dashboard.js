
(function () {
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

    function tr(key, fallback) {
        if (typeof window.t === 'function') {
            return window.t(key, fallback);
        }

        if (typeof window.translateKey === 'function') {
            return window.translateKey(key) || fallback;
        }

        return fallback;
    }

    function translateSeverity(value) {
        const labels = {
            Critical: ['critical', 'Critical'],
            High: ['high', 'High'],
            Medium: ['medium', 'Medium'],
            Low: ['low', 'Low']
        };

        const item = labels[value];

        return item ? tr(item[0], item[1]) : value || '--';
    }

    function translateStatus(value) {
        const labels = {
            New: ['new', 'New'],
            'In Progress': ['inProgress', 'In Progress'],
            'Under Investigation': ['underInvestigation', 'Under Investigation'],
            Resolved: ['resolved', 'Resolved'],
            Escalated: ['escalated', 'Escalated'],
            'False Positive': ['falsePositive', 'False Positive']
        };

        const item = labels[value];

        return item ? tr(item[0], item[1]) : value || '--';
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString();
    }

    function getSeverityColor(severity) {
        const colors = {
            Critical: '#EF4444',
            High: '#F97316',
            Medium: '#EAB308',
            Low: '#06B6D4'
        };

        return colors[severity] || '#94A3B8';
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
        ].forEach(element => {
            if (element) element.innerText = '...';
        });

        if (recentAlerts) {
            recentAlerts.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        ${tr('loading', 'Loading dashboard data...')}
                    </td>
                </tr>
            `;
        }

        if (systemActivity) {
            systemActivity.innerHTML = `
                <div class="text-muted small py-3">
                    ${tr('loading', 'Loading system activity...')}
                </div>
            `;
        }
    }

    function showError(message) {
        console.error('Dashboard error:', message);

        if (recentAlerts) {
            recentAlerts.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger py-4">
                        ${tr('dashboardLoadError', 'Unable to load dashboard data.')}
                    </td>
                </tr>
            `;
        }

        if (systemActivity) {
            systemActivity.innerHTML = `
                <div class="text-danger small py-3">
                    ${tr('dashboardLoadError', 'Unable to load dashboard data.')}
                </div>
            `;
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
        ].forEach(element => {
            if (element) element.innerText = '--';
        });
    }

    function renderMetrics() {
        const metrics = dashboardData?.metrics || {};

        if (totalEvents) {
            totalEvents.innerText = formatNumber(metrics.totalEvents);
        }

        if (activeAlerts) {
            activeAlerts.innerText = formatNumber(metrics.activeAlerts);
        }

        if (openIncidents) {
            openIncidents.innerText = formatNumber(metrics.openIncidents);
        }

        if (activeRules) {
            activeRules.innerText = formatNumber(metrics.activeRules);
        }
    }

    function renderIncidentOverview() {
        const incidents = dashboardData?.incidents || {};

        const critical = Number(incidents.critical || 0);
        const high = Number(incidents.high || 0);
        const medium = Number(incidents.medium || 0);

        if (criticalIncidents) criticalIncidents.innerText = critical;
        if (highIncidents) highIncidents.innerText = high;
        if (mediumIncidents) mediumIncidents.innerText = medium;

        if (totalOpenIncidents) {
            totalOpenIncidents.innerText = critical + high + medium;
        }
    }

    function renderEventChart(period = '24h') {
        if (!eventChart) return;

        const events = dashboardData?.events || {};
        const values = events[period] || [];

        if (!values.length) {
            eventChart.innerHTML = `
                <div class="text-muted small text-center py-5">
                    ${tr('noEventData', 'No event data available.')}
                </div>
            `;
            return;
        }

        const maxValue = Math.max(...values, 1);

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

                    ${values.map((value, index) => {
                        const height = Math.max(
                            (Number(value) / maxValue) * 100,
                            5
                        );

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

                                <span class="text-muted mt-2"
                                      style="font-size: 10px;">
                                    ${index + 1}
                                </span>
                            </div>
                        `;
                    }).join('')}

                </div>
            </div>
        `;
    }

    function renderSeverityChart() {
        if (!severityChart) return;

        const data = dashboardData?.severity || {};

        const critical = Number(data.critical || 0);
        const high = Number(data.high || 0);
        const medium = Number(data.medium || 0);
        const low = Number(data.low || 0);

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

        severityChart.innerHTML = `
            <div class="d-flex flex-column align-items-center justify-content-center h-100">

                <div class="position-relative rounded-circle d-flex align-items-center justify-content-center"
                     style="
                        width: 150px;
                        height: 150px;
                        background: conic-gradient(
                            #EF4444 0% ${criticalPercent}%,
                            #F97316 ${criticalPercent}% ${criticalPercent + highPercent}%,
                            #EAB308 ${criticalPercent + highPercent}% ${criticalPercent + highPercent + mediumPercent}%,
                            #06B6D4 ${criticalPercent + highPercent + mediumPercent}% 100%
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
                            ${translateSeverity(severity)} ${count}
                        </span>
                    `).join('')}

                </div>
            </div>
        `;
    }

    function renderRecentAlerts() {
        if (!recentAlerts) return;

        const alerts = dashboardData?.alerts || [];

        recentAlerts.innerHTML = '';

        if (!alerts.length) {
            recentAlerts.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        ${tr('noRecentAlerts', 'No recent alerts.')}
                    </td>
                </tr>
            `;
            return;
        }

        alerts.forEach(alert => {
            const color = getSeverityColor(alert.severity);
            const row = document.createElement('tr');

            const cells = [
                ['font-monospace text-info', alert.id],
                ['', alert.description],
                ['', translateSeverity(alert.severity)],
                ['', translateStatus(alert.status)],
                ['text-muted small', alert.time]
            ];

            cells.forEach(([className, value], index) => {
                const cell = document.createElement('td');

                if (className) cell.className = className;

                if (index === 2) {
                    const badge = document.createElement('span');
                    badge.className = 'badge';
                    badge.style.cssText = `
                        background: ${color}20;
                        color: ${color};
                        border: 1px solid ${color};
                    `;
                    badge.textContent = value;
                    cell.appendChild(badge);
                } else {
                    cell.textContent = value ?? '--';
                }

                row.appendChild(cell);
            });

            recentAlerts.appendChild(row);
        });
    }

    function renderSystemActivity() {
        if (!systemActivity) return;

        const activity = dashboardData?.activity || [];

        systemActivity.innerHTML = '';

        if (!activity.length) {
            systemActivity.innerHTML = `
                <div class="text-muted small py-3">
                    ${tr('noRecentActivity', 'No recent system activity.')}
                </div>
            `;
            return;
        }

        activity.forEach(item => {
            const icon = {
                success: 'bi-check-circle-fill text-success',
                info: 'bi-info-circle-fill text-info',
                warning: 'bi-exclamation-triangle-fill text-warning'
            }[item.type] || 'bi-circle text-muted';

            const row = document.createElement('div');

            row.className =
                'd-flex align-items-start justify-content-between gap-3 py-3 border-bottom border-panel';

            row.innerHTML = `
                <div class="d-flex align-items-start gap-3">
                    <i class="bi ${icon} mt-1"></i>

                    <div>
                        <div class="text-main small fw-semibold activity-action"></div>
                        <div class="text-muted activity-source"
                             style="font-size: 11px;"></div>
                    </div>
                </div>

                <div class="text-end">
                    <div class="text-muted activity-time"
                         style="font-size: 11px;"></div>

                    <span class="small text-success activity-result"></span>
                </div>
            `;

            row.querySelector('.activity-action').textContent = item.action || '--';
            row.querySelector('.activity-source').textContent = item.source || '--';
            row.querySelector('.activity-time').textContent = item.time || '--';
            row.querySelector('.activity-result').textContent = item.result || '--';

            systemActivity.appendChild(row);
        });
    }

    function renderDashboard() {
        if (!dashboardData) return;

        renderMetrics();
        renderIncidentOverview();
        renderEventChart(periodSelect?.value || '24h');
        renderSeverityChart();
        renderRecentAlerts();
        renderSystemActivity();
    }

    async function loadDashboard() {
        showLoading();

        try {
            const response = await HttpClient.get(
                ENDPOINTS.DASHBOARD.SUMMARY
            );

            if (!response || !response.data) {
                throw new Error('Invalid dashboard response from backend.');
            }

            dashboardData = response.data;

            renderDashboard();

        } catch (error) {
            showError(error.message);
        }
    }

    if (periodSelect) {
        periodSelect.addEventListener('change', event => {
            renderEventChart(event.target.value);
        });
    }

    window.navigateDashboard = function(route) {
        const link = document.querySelector(
            `.nav-link[data-route="${route}"]`
        );

        if (link) link.click();
    };

    window.renderDashboard = renderDashboard;
    window.loadDashboard = loadDashboard;

    document.addEventListener('nova:languageChanged', renderDashboard);


    
    loadDashboard();
})();
