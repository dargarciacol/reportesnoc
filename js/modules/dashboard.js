
(function () {
    'use strict';

    // =========================================================
    // DEPENDENCIAS
    // =========================================================

    const HttpClient = window.HttpClient;
    const ENDPOINTS = window.ENDPOINTS;

    // =========================================================
    // ELEMENTOS DEL DOM
    // =========================================================

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
    const refreshButton = document.getElementById('btn-refresh-dashboard');

    // =========================================================
    // ESTADO DEL MÓDULO
    // =========================================================

    let dashboardData = {
        events: [],
        alerts: [],
        incidents: [],
        rules: [],
        totals: {}
    };

    let isActive = true;
    let loading = false;
    let requestCounter = 0;

    const previousGlobals = {
        destroy: window.destroyCurrentModule,
        navigate: window.navigateDashboard,
        render: window.renderDashboard,
        load: window.loadDashboard
    };

    // =========================================================
    // CONSTANTES
    // =========================================================

    const ALERT_STATUS = Object.freeze({
        NEW: 'NEW',
        IN_PROGRESS: 'IN_PROGRESS',
        UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
        ESCALATED: 'ESCALATED',
        RESOLVED: 'RESOLVED',
        FALSE_POSITIVE: 'FALSE_POSITIVE'
    });

    const INCIDENT_CLOSED_STATUSES = [
        'CLOSED',
        'RESOLVED'
    ];

    const SEVERITIES = [
        'CRITICAL',
        'HIGH',
        'MEDIUM',
        'LOW'
    ];

    // =========================================================
    // UTILIDADES
    // =========================================================

    function tr(key, fallback) {
        if (typeof window.t === 'function') {
            return window.t(key, fallback) || fallback;
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

    function formatNumber(value) {
        const number = Number(value);

        return Number.isFinite(number)
            ? number.toLocaleString('es-CO')
            : '0';
    }

    function setText(element, value) {
        if (element) {
            element.textContent = value ?? '--';
        }
    }

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    }

    function translateSeverity(value) {
        const labels = {
            CRITICAL: ['severity.critical', 'Crítica'],
            HIGH: ['severity.high', 'Alta'],
            MEDIUM: ['severity.medium', 'Media'],
            LOW: ['severity.low', 'Baja']
        };

        const item = labels[normalizeValue(value)];

        return item
            ? tr(item[0], item[1])
            : value || '--';
    }

    function translateStatus(value) {
        const labels = {
            NEW: ['alerts.status.new', 'Nueva'],
            IN_PROGRESS: ['alerts.status.inProgress', 'En progreso'],
            UNDER_INVESTIGATION: [
                'alerts.status.underInvestigation',
                'En investigación'
            ],
            RESOLVED: ['alerts.status.resolved', 'Resuelta'],
            ESCALATED: ['alerts.status.escalated', 'Escalada'],
            FALSE_POSITIVE: [
                'alerts.status.falsePositive',
                'Falso positivo'
            ]
        };

        const item = labels[normalizeValue(value)];

        return item
            ? tr(item[0], item[1])
            : value || '--';
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

    function formatDate(dateValue) {
        if (!dateValue) return '--';

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return '--';
        }

        return new Intl.DateTimeFormat('es-CO', {
            dateStyle: 'short',
            timeStyle: 'short'
        }).format(date);
    }

    // =========================================================
    // NORMALIZACIÓN DE RESPUESTAS DEL BACKEND
    // =========================================================

    function extractPage(response) {
        const data = response?.data;

        if (Array.isArray(data)) {
            return {
                content: data,
                totalElements: data.length
            };
        }

        if (Array.isArray(data?.content)) {
            return {
                content: data.content,
                totalElements: Number(
                    data.totalElements ?? data.content.length
                )
            };
        }

        throw new Error(
            'El backend devolvió una estructura de datos inesperada.'
        );
    }

    // =========================================================
    // ANÁLISIS DE EVENTOS
    // =========================================================

    function analyzeEvents(events, totalElements) {
        const now = new Date();

        const periods = {
            '24h': Array(24).fill(0),
            '7d': Array(7).fill(0),
            '30d': Array(30).fill(0)
        };

        events.forEach(event => {
            const timestamp = new Date(event.timestamp);

            if (Number.isNaN(timestamp.getTime())) {
                return;
            }

            const difference = now.getTime() - timestamp.getTime();

            const hours = difference / (1000 * 60 * 60);
            const days = difference / (1000 * 60 * 60 * 24);

            if (difference < 0) {
                return;
            }

            if (hours < 24) {
                const index = Math.min(
                    23,
                    Math.floor(hours)
                );

                periods['24h'][23 - index]++;
            }

            if (days < 7) {
                const index = Math.min(
                    6,
                    Math.floor(days)
                );

                periods['7d'][6 - index]++;
            }

            if (days < 30) {
                const index = Math.min(
                    29,
                    Math.floor(days)
                );

                periods['30d'][29 - index]++;
            }
        });

        return {
            total: totalElements,
            periods
        };
    }

    // =========================================================
    // ANÁLISIS DE ALERTAS
    // =========================================================

    function analyzeAlerts(alerts) {
        const severity = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };

        let active = 0;

        alerts.forEach(alert => {
            const status = normalizeValue(alert.status);
            const level = normalizeValue(alert.severity);

            if (
                status !== ALERT_STATUS.RESOLVED &&
                status !== ALERT_STATUS.FALSE_POSITIVE
            ) {
                active++;
            }

            switch (level) {
                case 'CRITICAL':
                    severity.critical++;
                    break;

                case 'HIGH':
                    severity.high++;
                    break;

                case 'MEDIUM':
                    severity.medium++;
                    break;

                case 'LOW':
                    severity.low++;
                    break;
            }
        });

        return {
            active,
            severity
        };
    }

    // =========================================================
    // ANÁLISIS DE INCIDENTES
    // =========================================================

    function analyzeIncidents(incidents) {
        const result = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            totalOpen: 0
        };

        incidents.forEach(incident => {
            const status = normalizeValue(incident.status);

            if (INCIDENT_CLOSED_STATUSES.includes(status)) {
                return;
            }

            result.totalOpen++;

            switch (normalizeValue(incident.severity)) {
                case 'CRITICAL':
                    result.critical++;
                    break;

                case 'HIGH':
                    result.high++;
                    break;

                case 'MEDIUM':
                    result.medium++;
                    break;

                case 'LOW':
                    result.low++;
                    break;
            }
        });

        return result;
    }

    // =========================================================
    // ANÁLISIS DE REGLAS DE DETECCIÓN
    // =========================================================

    function analyzeRules(rules) {
        return rules.filter(
            rule => rule.active === true || rule.isActive === true
        ).length;
    }

    // =========================================================
    // ESTADO DE CARGA
    // =========================================================

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

            cell.colSpan = 4;
            cell.className = 'text-center text-muted py-4';
            cell.textContent = tr(
                'loading',
                'Cargando alertas...'
            );

            row.appendChild(cell);
            recentAlerts.appendChild(row);
        }

        if (systemActivity) {
            systemActivity.replaceChildren();

            const row = document.createElement('tr');
            const cell = document.createElement('td');

            cell.colSpan = 4;
            cell.className = 'text-muted text-center py-3';
            cell.textContent = tr(
                'loading',
                'Cargando actividad del sistema...'
            );

            row.appendChild(cell);
            systemActivity.appendChild(row);
        }
    }

    // =========================================================
    // MANEJO DE ERRORES POR MÓDULO
    // =========================================================

    function showModuleError(element, message) {
        if (!element) return;

        element.replaceChildren();

        const row = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 4;
        cell.className = 'text-center text-danger py-3';
        cell.textContent = message;

        row.appendChild(cell);
        element.appendChild(row);
    }

    // =========================================================
    // MÉTRICAS PRINCIPALES
    // =========================================================

    function renderMetrics() {
        const eventAnalysis = analyzeEvents(
            dashboardData.events,
            dashboardData.totals.events
        );

        const alertAnalysis = analyzeAlerts(
            dashboardData.alerts
        );

        const incidentAnalysis = analyzeIncidents(
            dashboardData.incidents
        );

        const rulesAnalysis = analyzeRules(
            dashboardData.rules
        );

        // Los KPIs globales provienen de /dashboard/summary (COUNT en base de
        // datos). Los cálculos sobre la página cargada solo se usan como
        // respaldo si ese endpoint no respondió.
        const summary = dashboardData.summary;

        const pick = (globalValue, pageValue) =>
            Number.isFinite(Number(globalValue))
                ? Number(globalValue)
                : pageValue;

        setText(
            totalEvents,
            formatNumber(pick(summary?.totalEvents, eventAnalysis.total))
        );

        setText(
            activeAlerts,
            formatNumber(pick(summary?.openAlerts, alertAnalysis.active))
        );

        setText(
            openIncidents,
            formatNumber(pick(summary?.activeIncidents, incidentAnalysis.totalOpen))
        );

        setText(
            activeRules,
            formatNumber(pick(summary?.activeRules, rulesAnalysis))
        );

        return {
            eventAnalysis,
            alertAnalysis,
            incidentAnalysis
        };
    }

    // =========================================================
    // RESUMEN DE INCIDENTES
    // =========================================================

    function renderIncidentOverview(analysis) {
        setText(
            criticalIncidents,
            formatNumber(analysis.critical)
        );

        setText(
            highIncidents,
            formatNumber(analysis.high)
        );

        setText(
            mediumIncidents,
            formatNumber(analysis.medium)
        );

        setText(
            totalOpenIncidents,
            formatNumber(analysis.totalOpen)
        );
    }

    // =========================================================
    // GRÁFICO DE EVENTOS
    // =========================================================

    function renderEventChart() {
        if (!eventChart) return;

        const period = periodSelect?.value || '24h';

        const analysis = analyzeEvents(
            dashboardData.events,
            dashboardData.totals.events
        );

        const values = analysis.periods[period] || [];

        if (!values.length || values.every(value => value === 0)) {
            eventChart.innerHTML = `
                <div class="text-muted small text-center py-5">
                    ${tr(
                        'noEventData',
                        'No hay datos de eventos para este período.'
                    )}
                </div>
            `;
            return;
        }

        const maxValue = Math.max(...values, 1);

        const bars = values.map((value, index) => {
            const height = Math.max(
                (value / maxValue) * 100,
                value > 0 ? 5 : 0
            );

            return `
                <div
                    class="d-flex flex-column align-items-center
                           justify-content-end flex-fill h-100"
                    title="${formatNumber(value)} eventos"
                >

                    <div
                        class="w-100 rounded-top"
                        style="
                            height: ${height}%;
                            background: linear-gradient(
                                180deg,
                                var(--primary),
                                rgba(139, 92, 246, 0.25)
                            );
                            min-height: ${value > 0 ? '5px' : '0'};
                            transition: height .3s ease;
                        "
                    ></div>

                    <span
                        class="text-muted mt-2"
                        style="font-size: 10px;"
                    >
                        ${index + 1}
                    </span>

                </div>
            `;
        }).join('');

        eventChart.innerHTML = `
            <div class="d-flex flex-column h-100 justify-content-between">

                <div class="d-flex justify-content-between align-items-center mb-3">

                    <span class="text-muted small">
                        Volumen de eventos
                    </span>

                    <span class="badge bg-info bg-opacity-10 text-info">
                        ${tr('liveMonitoring', 'Supervisión en tiempo real')}
                    </span>

                </div>

                <div
                    class="d-flex align-items-end justify-content-around
                           gap-2 flex-grow-1"
                    style="min-height: 150px; padding-top: 15px;"
                >
                    ${bars}
                </div>

            </div>
        `;
    }

    // =========================================================
    // GRÁFICO DE SEVERIDAD
    // =========================================================

    function renderSeverityChart(analysis) {
        if (!severityChart) return;

        const data = analysis.severity;

        const total =
            data.critical +
            data.high +
            data.medium +
            data.low;

        if (total === 0) {
            severityChart.innerHTML = `
                <div class="text-muted small text-center py-5">
                    ${tr(
                        'noSeverityData',
                        'No hay datos de severidad disponibles.'
                    )}
                </div>
            `;
            return;
        }

        const criticalPercent = (data.critical / total) * 100;
        const highPercent = (data.high / total) * 100;
        const mediumPercent = (data.medium / total) * 100;

        const highEnd = criticalPercent + highPercent;
        const mediumEnd = highEnd + mediumPercent;

        const legend = [
            ['CRITICAL', data.critical],
            ['HIGH', data.high],
            ['MEDIUM', data.medium],
            ['LOW', data.low]
        ];

        severityChart.innerHTML = `
            <div class="d-flex flex-column align-items-center justify-content-center h-100">

                <div
                    class="position-relative rounded-circle
                           d-flex align-items-center justify-content-center"
                    style="
                        width: 150px;
                        height: 150px;
                        background: conic-gradient(
                            #EF4444 0% ${criticalPercent}%,
                            #F97316 ${criticalPercent}% ${highEnd}%,
                            #EAB308 ${highEnd}% ${mediumEnd}%,
                            #06B6D4 ${mediumEnd}% 100%
                        );
                    "
                >

                    <div
                        class="rounded-circle d-flex flex-column
                               align-items-center justify-content-center"
                        style="
                            width: 105px;
                            height: 105px;
                            background: var(--bg-surface);
                        "
                    >

                        <span class="fs-4 fw-bold text-main">
                            ${formatNumber(total)}
                        </span>

                        <span class="text-muted" style="font-size: 10px;">
                            Total de alertas
                        </span>

                    </div>

                </div>

                <div class="d-flex flex-wrap justify-content-center gap-3 mt-4">

                    ${legend.map(([severity, count]) => `
                        <span class="small">
                            <span
                                class="badge rounded-circle me-1"
                                style="background:${getSeverityColor(severity)};"
                            >&nbsp;</span>

                            ${translateSeverity(severity)}
                            ${formatNumber(count)}
                        </span>
                    `).join('')}

                </div>

            </div>
        `;
    }

    // =========================================================
    // ALERTAS RECIENTES
    // =========================================================

    function renderRecentAlerts() {
        if (!recentAlerts) return;

        recentAlerts.replaceChildren();

        const alerts = [...dashboardData.alerts]
            .sort((a, b) =>
                new Date(b.createdAt || 0) -
                new Date(a.createdAt || 0)
            )
            .slice(0, 5);

        if (!alerts.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');

            cell.colSpan = 4;
            cell.className = 'text-center text-muted py-4';
            cell.textContent = tr(
                'noRecentAlerts',
                'No hay alertas recientes.'
            );

            row.appendChild(cell);
            recentAlerts.appendChild(row);
            return;
        }

        alerts.forEach(alert => {
            const row = document.createElement('tr');

            const idCell = document.createElement('td');
            idCell.className = 'font-monospace text-info small';
            idCell.textContent = alert.id || '--';

            const descriptionCell = document.createElement('td');
            descriptionCell.textContent =
                alert.ruleTriggered || '--';

            const severityCell = document.createElement('td');
            const severityBadge = document.createElement('span');

            const color = getSeverityColor(alert.severity);

            severityBadge.className = 'badge';
            severityBadge.style.backgroundColor = `${color}20`;
            severityBadge.style.color = color;
            severityBadge.style.border = `1px solid ${color}`;
            severityBadge.textContent = translateSeverity(alert.severity);

            severityCell.appendChild(severityBadge);

            const statusCell = document.createElement('td');
            const statusBadge = document.createElement('span');

            statusBadge.className = 'badge bg-secondary';
            statusBadge.textContent = translateStatus(alert.status);

            statusCell.appendChild(statusBadge);

            row.append(
                idCell,
                descriptionCell,
                severityCell,
                statusCell
            );

            recentAlerts.appendChild(row);
        });
    }

    // =========================================================
    // ACTIVIDAD RECIENTE DEL SISTEMA
    // =========================================================

    function renderSystemActivity() {
        if (!systemActivity) return;

        systemActivity.replaceChildren();

        const events = [...dashboardData.events]
            .sort((a, b) =>
                new Date(b.timestamp || 0) -
                new Date(a.timestamp || 0)
            )
            .slice(0, 5);

        if (!events.length) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');

            cell.colSpan = 4;
            cell.className = 'text-center text-muted py-3';
            cell.textContent = tr(
                'noRecentActivity',
                'No hay actividad reciente.'
            );

            row.appendChild(cell);
            systemActivity.appendChild(row);
            return;
        }

        events.forEach(event => {
            const row = document.createElement('tr');

            const timestampCell = document.createElement('td');
            timestampCell.className = 'text-muted small text-nowrap';
            timestampCell.textContent = formatDate(event.timestamp);

            const activityCell = document.createElement('td');
            activityCell.textContent =
                event.action || event.eventType || '--';

            const sourceCell = document.createElement('td');
            sourceCell.textContent =
                event.sourceIp || event.userIdentity || '--';

            const resultCell = document.createElement('td');
            resultCell.textContent =
                translateSeverity(event.severity);

            row.append(
                timestampCell,
                activityCell,
                sourceCell,
                resultCell
            );

            systemActivity.appendChild(row);
        });
    }

    // =========================================================
    // RENDERIZADO GENERAL
    // =========================================================

    function renderDashboard() {
        if (!isActive) return;

        const analysis = renderMetrics();

        renderIncidentOverview(analysis.incidentAnalysis);
        renderEventChart();
        renderSeverityChart(analysis.alertAnalysis);
        renderRecentAlerts();
        renderSystemActivity();
    }

    // =========================================================
    // CARGA INDEPENDIENTE DE LOS MÓDULOS
    // =========================================================

    async function loadEvents() {
        const response = await HttpClient.get(
            ENDPOINTS.EVENTS.LIST
        );

        const page = extractPage(response);

        dashboardData.events = page.content;
        dashboardData.totals.events = page.totalElements;

        return page;
    }

    async function loadAlerts() {
        const response = await HttpClient.get(
            ENDPOINTS.ALERTS.LIST
        );

        const page = extractPage(response);

        dashboardData.alerts = page.content;

        return page;
    }

    async function loadIncidents() {
        const response = await HttpClient.get(
            ENDPOINTS.INCIDENTS.LIST
        );

        const page = extractPage(response);

        dashboardData.incidents = page.content;

        return page;
    }

    async function loadSummary() {
        const response = await HttpClient.get(
            ENDPOINTS.DASHBOARD.SUMMARY
        );

        dashboardData.summary = response?.data || null;

        return dashboardData.summary;
    }

    async function loadDetectionRules() {
        const response = await HttpClient.get(
            ENDPOINTS.DETECTION.RULES
        );

        const page = extractPage(response);

        dashboardData.rules = page.content;

        return page;
    }

    // =========================================================
    // CARGA GENERAL DEL DASHBOARD
    // =========================================================

    async function loadDashboard() {
        if (!isActive || loading) return;

        if (
            !HttpClient ||
            !ENDPOINTS?.EVENTS?.LIST ||
            !ENDPOINTS?.ALERTS?.LIST ||
            !ENDPOINTS?.INCIDENTS?.LIST ||
            !ENDPOINTS?.DETECTION?.RULES
        ) {
            console.error(
                'NOVA SIEM: La configuración de los endpoints no está disponible.'
            );
            return;
        }

        loading = true;

        const currentRequest = ++requestCounter;

        showLoading();

        // Reiniciar datos antes de consultar los módulos.
        dashboardData = {
            events: [],
            alerts: [],
            incidents: [],
            rules: [],
            summary: null,
            totals: {
                events: 0
            }
        };

        const requests = [
            {
                name: 'Eventos',
                execute: loadEvents
            },
            {
                name: 'Alertas',
                execute: loadAlerts
            },
            {
                name: 'Incidentes',
                execute: loadIncidents
            },
            {
                name: 'Reglas de detección',
                execute: loadDetectionRules
            },
            {
                name: 'Resumen global',
                execute: loadSummary
            }
        ];

        const results = await Promise.allSettled(
            requests.map(request => request.execute())
        );

        if (!isActive || currentRequest !== requestCounter) {
            loading = false;
            return;
        }

        let successfulModules = 0;

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successfulModules++;

                console.info(
                    `NOVA SIEM: ${requests[index].name} cargados correctamente.`
                );
            } else {
                console.error(
                    `NOVA SIEM: Error al cargar ${requests[index].name}:`,
                    result.reason
                );
            }
        });

        loading = false;

        if (successfulModules === 0) {
            console.error(
                'NOVA SIEM: No fue posible cargar ningún módulo.'
            );

            showModuleError(
                recentAlerts,
                'No fue posible cargar los datos del panel.'
            );

            showModuleError(
                systemActivity,
                'No fue posible cargar la actividad del sistema.'
            );

            return;
        }

        renderDashboard();

        if (successfulModules < requests.length) {
            console.warn(
                'NOVA SIEM: El panel se cargó parcialmente. Algunos módulos no respondieron.'
            );
        }
    }

    // =========================================================
    // EVENTOS
    // =========================================================

    function handlePeriodChange() {
        renderEventChart();
    }

    function handleLanguageChange() {
        renderDashboard();
    }

    function handleRefresh() {
        loadDashboard();
    }

    periodSelect?.addEventListener(
        'change',
        handlePeriodChange
    );

    refreshButton?.addEventListener(
        'click',
        handleRefresh
    );

    document.addEventListener(
        'nova:languageChanged',
        handleLanguageChange
    );

    // =========================================================
    // NAVEGACIÓN
    // =========================================================

    function navigateDashboard(route) {
        if (!isActive || typeof route !== 'string') return;

        const link = document.querySelector(
            `.nav-link[data-route="${CSS.escape(route)}"]`
        );

        link?.click();
    }

    // =========================================================
    // EXPORTACIONES GLOBALES
    // =========================================================

    window.navigateDashboard = navigateDashboard;
    window.renderDashboard = renderDashboard;
    window.loadDashboard = loadDashboard;

    // =========================================================
    // DESTRUCCIÓN DEL MÓDULO
    // =========================================================

    function destroyDashboard() {
        if (!isActive) return;

        isActive = false;
        requestCounter++;

        periodSelect?.removeEventListener(
            'change',
            handlePeriodChange
        );

        refreshButton?.removeEventListener(
            'click',
            handleRefresh
        );

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

        dashboardData = {
            events: [],
            alerts: [],
            incidents: [],
            rules: [],
            totals: {}
        };
    }

    window.destroyCurrentModule = destroyDashboard;

    // =========================================================
    // INICIALIZACIÓN AUTOMÁTICA
    // =========================================================

    loadDashboard();

})();