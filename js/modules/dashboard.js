
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

    // Helper de traducción.
    function tr(key, fallback) {
        if (typeof window.t === 'function') {
            return window.t(key);
        }

        if (typeof window.translateKey === 'function') {
            return window.translateKey(key);
        }

        return fallback;
    }

    // Datos sintéticos del SOC.
    const dashboardData = {
        metrics: {
            totalEvents: 24891,
            activeAlerts: 24,
            openIncidents: 8,
            activeRules: 42
        },

        incidents: {
            critical: 2,
            high: 3,
            medium: 3
        },

        events: {
            '24h': [120, 180, 150, 230, 190, 280, 220, 310, 260, 350, 290, 400],
            '7d': [850, 1100, 950, 1400, 1250, 1600, 1350],
            '30d': [3200, 4100, 3800, 4600, 4200, 5100, 4800, 5500]
        },

        severity: {
            critical: 12,
            high: 28,
            medium: 35,
            low: 25
        },

        alerts: [
            {
                id: 'ALT-2045',
                description: 'Suspicious PowerShell Execution',
                severity: 'Critical',
                status: 'New',
                time: '16:45:20 UTC'
            },
            {
                id: 'ALT-2044',
                description: 'Multiple Failed Login Attempts',
                severity: 'High',
                status: 'In Progress',
                time: '16:42:15 UTC'
            },
            {
                id: 'ALT-2043',
                description: 'Unusual Outbound Network Traffic',
                severity: 'Medium',
                status: 'Under Investigation',
                time: '16:30:00 UTC'
            },
            {
                id: 'ALT-2042',
                description: 'Suspicious File Modification',
                severity: 'High',
                status: 'New',
                time: '16:22:10 UTC'
            }
        ],

        activity: [
            {
                action: 'New security alert detected',
                source: 'Detection Engine',
                result: 'Success',
                time: '16:45:20 UTC',
                type: 'success'
            },
            {
                action: 'Incident INC-1002 updated',
                source: 'SOC Analyst',
                result: 'Updated',
                time: '16:40:15 UTC',
                type: 'info'
            },
            {
                action: 'Event ingestion completed',
                source: 'Ingestion Service',
                result: 'Success',
                time: '16:35:00 UTC',
                type: 'success'
            },
            {
                action: 'Detection rule triggered',
                source: 'Sigma Engine',
                result: 'Triggered',
                time: '16:30:00 UTC',
                type: 'warning'
            }
        ]
    };

    // Traducción de valores visibles.
    function translateSeverity(value) {
        const labels = {
            Critical: ['critical', 'Critical'],
            High: ['high', 'High'],
            Medium: ['medium', 'Medium'],
            Low: ['low', 'Low']
        };

        const item = labels[value];
        return item ? tr(item[0], item[1]) : value;
    }

    function translateStatus(value) {
        const labels = {
            New: ['new', 'New'],
            'In Progress': ['inProgress', 'In Progress'],
            'Under Investigation': ['underInvestigation', 'Under Investigation'],
            Resolved: ['resolved', 'Resolved']
        };

        const item = labels[value];
        return item ? tr(item[0], item[1]) : value;
    }

    // Actualizar indicadores principales.
    function renderMetrics() {
        if (totalEvents) totalEvents.innerText =
            dashboardData.metrics.totalEvents.toLocaleString();

        if (activeAlerts) activeAlerts.innerText =
            dashboardData.metrics.activeAlerts;

        if (openIncidents) openIncidents.innerText =
            dashboardData.metrics.openIncidents;

        if (activeRules) activeRules.innerText =
            dashboardData.metrics.activeRules;
    }

    // Resumen de incidentes.
    function renderIncidentOverview() {
        if (criticalIncidents) {
            criticalIncidents.innerText = dashboardData.incidents.critical;
        }

        if (highIncidents) {
            highIncidents.innerText = dashboardData.incidents.high;
        }

        if (mediumIncidents) {
            mediumIncidents.innerText = dashboardData.incidents.medium;
        }

        if (totalOpenIncidents) {
            totalOpenIncidents.innerText =
                dashboardData.incidents.critical +
                dashboardData.incidents.high +
                dashboardData.incidents.medium;
        }
    }

    // Gráfico de actividad de eventos.
    function renderEventChart(period = '24h') {
        if (!eventChart) return;

        const values = dashboardData.events[period] ||
            dashboardData.events['24h'];

        const maxValue = Math.max(...values);

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
                            (value / maxValue) * 100,
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

    // Distribución de severidad.
    function renderSeverityChart() {
        if (!severityChart) return;

        const data = dashboardData.severity;

        const total =
            data.critical +
            data.high +
            data.medium +
            data.low;

        const critical = (data.critical / total) * 100;
        const high = (data.high / total) * 100;
        const medium = (data.medium / total) * 100;
        const low = (data.low / total) * 100;

        severityChart.innerHTML = `
            <div class="d-flex flex-column align-items-center justify-content-center h-100">

                <div class="position-relative rounded-circle d-flex align-items-center justify-content-center"
                     style="
                        width: 150px;
                        height: 150px;
                        background: conic-gradient(
                            #EF4444 0% ${critical}%,
                            #F97316 ${critical}% ${critical + high}%,
                            #EAB308 ${critical + high}% ${critical + high + medium}%,
                            #06B6D4 ${critical + high + medium}% 100%
                        );
                     ">

                    <div class="rounded-circle d-flex flex-column align-items-center justify-content-center"
                         style="
                            width: 105px;
                            height: 105px;
                            background: var(--bg-surface);
                         ">

                        <span class="fs-4 fw-bold text-main">
                            ${total}
                        </span>

                        <span class="text-muted"
                              style="font-size: 10px;">
                            ${tr('totalAlerts', 'Total Alerts')}
                        </span>

                    </div>
                </div>

                <div class="d-flex flex-wrap justify-content-center gap-3 mt-4">

                    <span class="small">
                        <span class="badge rounded-circle me-1"
                              style="background:#EF4444;">&nbsp;</span>
                        ${translateSeverity('Critical')}
                        ${data.critical}
                    </span>

                    <span class="small">
                        <span class="badge rounded-circle me-1"
                              style="background:#F97316;">&nbsp;</span>
                        ${translateSeverity('High')}
                        ${data.high}
                    </span>

                    <span class="small">
                        <span class="badge rounded-circle me-1"
                              style="background:#EAB308;">&nbsp;</span>
                        ${translateSeverity('Medium')}
                        ${data.medium}
                    </span>

                    <span class="small">
                        <span class="badge rounded-circle me-1"
                              style="background:#06B6D4;">&nbsp;</span>
                        ${translateSeverity('Low')}
                        ${data.low}
                    </span>

                </div>
            </div>
        `;
    }

    // Alertas recientes.
    function renderRecentAlerts() {
        if (!recentAlerts) return;

        recentAlerts.innerHTML = '';

        dashboardData.alerts.forEach(alert => {
            const color = {
                Critical: '#EF4444',
                High: '#F97316',
                Medium: '#EAB308',
                Low: '#06B6D4'
            }[alert.severity] || '#94A3B8';

            const row = document.createElement('tr');

            row.innerHTML = `
                <td class="font-monospace text-info">
                    ${alert.id}
                </td>

                <td>
                    ${alert.description}
                </td>

                <td>
                    <span class="badge"
                          style="
                            background: ${color}20;
                            color: ${color};
                            border: 1px solid ${color};
                          ">
                        ${translateSeverity(alert.severity)}
                    </span>
                </td>

                <td>
                    ${translateStatus(alert.status)}
                </td>

                <td class="text-muted small">
                    ${alert.time}
                </td>
            `;

            recentAlerts.appendChild(row);
        });
    }

    // Actividad reciente del sistema.
    function renderSystemActivity() {
        if (!systemActivity) return;

        systemActivity.innerHTML = '';

        dashboardData.activity.forEach(item => {
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
                        <div class="text-main small fw-semibold">
                            ${item.action}
                        </div>

                        <div class="text-muted"
                             style="font-size: 11px;">
                            ${item.source}
                        </div>
                    </div>

                </div>

                <div class="text-end">
                    <div class="text-muted"
                         style="font-size: 11px;">
                        ${item.time}
                    </div>

                    <span class="small text-success">
                        ${item.result}
                    </span>
                </div>
            `;

            systemActivity.appendChild(row);
        });
    }

    // Cambiar periodo del gráfico.
    if (periodSelect) {
        periodSelect.addEventListener('change', (event) => {
            renderEventChart(event.target.value);
        });
    }

    // Navegación desde el dashboard.
    window.navigateDashboard = function(route) {
        const link = document.querySelector(
            `.nav-link[data-route="${route}"]`
        );

        if (link) link.click();
    };

    // Actualizar todos los componentes.
    window.renderDashboard = function() {
        renderMetrics();
        renderIncidentOverview();
        renderEventChart(periodSelect?.value || '24h');
        renderSeverityChart();
        renderRecentAlerts();
        renderSystemActivity();
    };

    // Renderizado inicial.
    window.renderDashboard();

})();
