
(function () {
    'use strict';

    // ==========================================
    // DEPENDENCIAS
    // ==========================================

    const HttpClient = window.HttpClient;
    const ENDPOINTS = window.ENDPOINTS;

    // ==========================================
    // ELEMENTOS DEL DOM
    // ==========================================

    const tbody = document.getElementById('table-alerts-body');

    const statNew = document.getElementById('stat-new-alerts');
    const statProgress = document.getElementById('stat-progress-alerts');
    const statEscalated = document.getElementById('stat-escalated-alerts');
    const statFp = document.getElementById('stat-fp-alerts');

    const selectAllCheckbox = document.getElementById('selectAllAlerts');

    const searchInput = document.getElementById('search-alerts');
    const statusFilter = document.getElementById('filter-status-alerts');
    const assigneeFilter = document.getElementById('filter-assignee');

    const refreshButton = document.getElementById('btn-refresh-alerts');

    // ==========================================
    // ESTADO DEL MÓDULO
    // ==========================================

    let alerts = [];
    let loading = false;
    let reloadRequested = false;

    let currentAnalysis = null;

    const STATUS = Object.freeze({
        NEW: 'NEW',
        IN_PROGRESS: 'IN_PROGRESS',
        UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
        ESCALATED: 'ESCALATED',
        RESOLVED: 'RESOLVED',
        FALSE_POSITIVE: 'FALSE_POSITIVE'
    });

    const SEVERITY = Object.freeze({
        CRITICAL: 'CRITICAL',
        HIGH: 'HIGH',
        MEDIUM: 'MEDIUM',
        LOW: 'LOW'
    });

    // ==========================================
    // UTILIDADES
    // ==========================================

    function t(key, fallback) {

        return typeof window.t === 'function'
            ? window.t(key) || fallback
            : fallback;

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

    function normalizeEnum(value) {

        return String(value ?? '')
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, '_');

    }

    // ==========================================
    // NORMALIZACIÓN DE ESTADOS
    // ==========================================

    function normalizeStatus(status) {

        const normalized = normalizeEnum(status);

        const aliases = {
            NEW: STATUS.NEW,
            IN_PROGRESS: STATUS.IN_PROGRESS,
            UNDER_INVESTIGATION: STATUS.UNDER_INVESTIGATION,
            ESCALATED: STATUS.ESCALATED,
            RESOLVED: STATUS.RESOLVED,
            FALSE_POSITIVE: STATUS.FALSE_POSITIVE
        };

        return aliases[normalized] || normalized || STATUS.NEW;

    }

    // ==========================================
    // NORMALIZACIÓN DE SEVERIDAD
    // ==========================================

    function normalizeSeverity(severity) {

        const normalized = normalizeEnum(severity);

        return Object.values(SEVERITY).includes(normalized)
            ? normalized
            : SEVERITY.LOW;

    }

    // ==========================================
    // TRADUCCIONES
    // ==========================================

    function translateSeverity(severity) {

        const translations = {

            CRITICAL: t('severity.critical', 'Crítica'),
            HIGH: t('severity.high', 'Alta'),
            MEDIUM: t('severity.medium', 'Media'),
            LOW: t('severity.low', 'Baja')

        };

        return translations[severity] || severity || '--';

    }

    function translateStatus(status) {

        const translations = {

            NEW: t('alerts.status.new', 'Nueva'),

            IN_PROGRESS: t(
                'alerts.status.inProgress',
                'En proceso'
            ),

            UNDER_INVESTIGATION: t(
                'alerts.status.underInvestigation',
                'En investigación'
            ),

            ESCALATED: t(
                'alerts.status.escalated',
                'Escalada'
            ),

            RESOLVED: t(
                'alerts.status.resolved',
                'Resuelta'
            ),

            FALSE_POSITIVE: t(
                'alerts.status.falsePositive',
                'Falso positivo'
            )

        };

        return translations[status] || status || '--';

    }

    // ==========================================
    // CLASES VISUALES
    // ==========================================

    function getSeverityClass(severity) {

        const classes = {

            CRITICAL: 'danger',
            HIGH: 'warning',
            MEDIUM: 'info',
            LOW: 'secondary'

        };

        return classes[severity] || 'secondary';

    }

    function getStatusClass(status) {

        const classes = {

            NEW: 'danger',
            IN_PROGRESS: 'primary',
            UNDER_INVESTIGATION: 'info',
            ESCALATED: 'warning',
            RESOLVED: 'success',
            FALSE_POSITIVE: 'secondary'

        };

        return classes[status] || 'secondary';

    }

    // ==========================================
    // FORMATO DE FECHAS
    // ==========================================

    function formatAlertDate(dateValue) {

        if (!dateValue) {
            return '--';
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return '--';
        }

        const language = document.documentElement.lang || 'es';

        return new Intl.DateTimeFormat(
            language.startsWith('es') ? 'es-CO' : 'en-US',
            {
                dateStyle: 'medium',
                timeStyle: 'short'
            }
        ).format(date);

    }

    // ==========================================
    // NORMALIZACIÓN DEL DTO
    // ==========================================

    function normalizeAlert(alert) {

        return {

            ...alert,

            id: alert.id,

            rule: alert.ruleTriggered || '--',

            severity: normalizeSeverity(alert.severity),

            status: normalizeStatus(alert.status),

            assignee: alert.assignedTo || null,

            time: alert.createdAt || null,

            eventId: alert.eventId || null,

            correlationKey: alert.correlationKey || null

        };

    }

    // ==========================================
    // ANÁLISIS AUTOMÁTICO DE ALERTAS
    // ==========================================

    function analyzeAlerts() {

        const analysis = {

            total: alerts.length,

            bySeverity: {
                CRITICAL: 0,
                HIGH: 0,
                MEDIUM: 0,
                LOW: 0
            },

            byStatus: {
                NEW: 0,
                IN_PROGRESS: 0,
                UNDER_INVESTIGATION: 0,
                ESCALATED: 0,
                RESOLVED: 0,
                FALSE_POSITIVE: 0
            },

            highPriority: 0,

            unassigned: 0,

            correlatedGroups: 0,

            correlatedAlerts: 0,

            analyzedAt: new Date().toISOString()

        };

        const correlationGroups = new Map();

        alerts.forEach(alert => {

            // ------------------------------------------
            // ANÁLISIS POR SEVERIDAD
            // ------------------------------------------

            if (analysis.bySeverity[alert.severity] !== undefined) {

                analysis.bySeverity[alert.severity]++;

            }

            // ------------------------------------------
            // ANÁLISIS POR ESTADO
            // ------------------------------------------

            if (analysis.byStatus[alert.status] !== undefined) {

                analysis.byStatus[alert.status]++;

            }

            // ------------------------------------------
            // PRIORIZACIÓN
            // ------------------------------------------

            const isUnresolved = ![
                STATUS.RESOLVED,
                STATUS.FALSE_POSITIVE
            ].includes(alert.status);

            if (
                isUnresolved &&
                [
                    SEVERITY.CRITICAL,
                    SEVERITY.HIGH
                ].includes(alert.severity)
            ) {

                analysis.highPriority++;

            }

            // ------------------------------------------
            // ALERTAS SIN RESPONSABLE
            // ------------------------------------------

            if (
                !alert.assignee ||
                alert.assignee === '--'
            ) {

                analysis.unassigned++;

            }

            // ------------------------------------------
            // CORRELACIÓN DE ALERTAS
            // ------------------------------------------

            if (alert.correlationKey) {

                const key = String(alert.correlationKey);

                correlationGroups.set(
                    key,
                    (correlationGroups.get(key) || 0) + 1
                );

            }

        });

        // ------------------------------------------
        // IDENTIFICAR GRUPOS CORRELACIONADOS
        // ------------------------------------------

        correlationGroups.forEach(count => {

            if (count > 1) {

                analysis.correlatedGroups++;

                analysis.correlatedAlerts += count;

            }

        });

        currentAnalysis = analysis;

        // ------------------------------------------
        // PUBLICAR RESULTADO DEL ANÁLISIS
        // ------------------------------------------

        window.alertAnalysis = analysis;

        document.dispatchEvent(
            new CustomEvent('nova:alerts-analyzed', {
                detail: analysis
            })
        );

        return analysis;

    }

    // ==========================================
    // ESTADÍSTICAS DE ALERTAS
    // ==========================================

    function updateStatistics() {

        if (statNew) {

            statNew.textContent =
                currentAnalysis?.byStatus.NEW ?? 0;

        }

        if (statProgress) {

            statProgress.textContent =
                (currentAnalysis?.byStatus.IN_PROGRESS ?? 0) +
                (currentAnalysis?.byStatus.UNDER_INVESTIGATION ?? 0);

        }

        if (statEscalated) {

            statEscalated.textContent =
                currentAnalysis?.byStatus.ESCALATED ?? 0;

        }

        if (statFp) {

            statFp.textContent =
                currentAnalysis?.byStatus.FALSE_POSITIVE ?? 0;

        }

    }

    // ==========================================
    // FILTRADO DE ALERTAS
    // ==========================================

    function getFilteredAlerts() {

        const search = searchInput?.value
            .trim()
            .toLowerCase() || '';

        const selectedStatus = statusFilter?.value || '';

        const selectedAssignee = assigneeFilter?.value || '';

        const currentUsername =
            window.NOVA_CURRENT_USER?.username || null;

        return alerts.filter(alert => {

            // ------------------------------------------
            // BÚSQUEDA
            // ------------------------------------------

            const searchableValues = [

                alert.id,
                alert.rule,
                alert.assignee,
                alert.eventId,
                alert.correlationKey,
                alert.entity,
                alert.userIdentity,
                alert.sourceIp

            ];

            const matchesSearch =
                !search ||
                searchableValues.some(value =>
                    String(value ?? '')
                        .toLowerCase()
                        .includes(search)
                );

            if (!matchesSearch) {
                return false;
            }

            // ------------------------------------------
            // FILTRO POR ESTADO
            // ------------------------------------------

            const matchesStatus =
                !selectedStatus ||
                normalizeStatus(selectedStatus) === alert.status;

            if (!matchesStatus) {
                return false;
            }

            // ------------------------------------------
            // FILTRO POR RESPONSABLE
            // ------------------------------------------

            let matchesAssignee = true;

            if (selectedAssignee === 'Unassigned') {

                matchesAssignee =
                    !alert.assignee ||
                    alert.assignee === '--';

            } else if (selectedAssignee === 'Me') {

                matchesAssignee =
                    Boolean(currentUsername) &&
                    alert.assignee === currentUsername;

            }

            return matchesAssignee;

        });

    }

    // ==========================================
    // RENDERIZADO DE ALERTAS
    // ==========================================

    function renderAlerts() {

        if (!tbody) {
            return;
        }

        if (loading) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="spinner-border spinner-border-sm me-2"></div>
                        ${t('common.loading', 'Cargando alertas...')}
                    </td>
                </tr>
            `;

            return;

        }

        const filteredAlerts = getFilteredAlerts();

        if (!filteredAlerts.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4 text-secondary">
                        ${t('alerts.empty', 'No se encontraron alertas')}
                    </td>
                </tr>
            `;

            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
            }

            return;

        }

        tbody.innerHTML = filteredAlerts.map(alert => {

            const id = escapeHTML(alert.id);

            return `
                <tr>

                    <td>
                        <input
                            type="checkbox"
                            class="form-check-input alert-checkbox"
                            value="${id}"
                            aria-label="Seleccionar alerta"
                        >
                    </td>

                    <td class="text-nowrap">
                        <span class="fw-semibold">
                            ${id}
                        </span>
                    </td>

                    <td class="text-nowrap">
                        ${escapeHTML(formatAlertDate(alert.time))}
                    </td>

                    <td>
                        <div class="fw-semibold">
                            ${escapeHTML(alert.rule)}
                        </div>
                    </td>

                    <td>
                        <span class="badge bg-${getSeverityClass(alert.severity)}">
                            ${escapeHTML(translateSeverity(alert.severity))}
                        </span>
                    </td>

                    <td>
                        <span class="badge bg-${getStatusClass(alert.status)}">
                            ${escapeHTML(translateStatus(alert.status))}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(alert.assignee || 'Sin asignar')}
                    </td>

                    <td class="text-center">

                        <div class="dropdown">

                            <button
                                class="btn btn-sm btn-outline-secondary dropdown-toggle"
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                            >
                                ${t('common.actions', 'Acciones')}
                            </button>

                            <ul class="dropdown-menu dropdown-menu-end">

                                <li>
                                    <button
                                        class="dropdown-item"
                                        data-alert-action="assign"
                                        data-alert-id="${id}"
                                    >
                                        ${t('alerts.assignToMe', 'Asignar a mí')}
                                    </button>
                                </li>

                                <li>
                                    <button
                                        class="dropdown-item"
                                        data-alert-action="investigate"
                                        data-alert-id="${id}"
                                    >
                                        ${t('alerts.investigate', 'Investigar')}
                                    </button>
                                </li>

                                <li>
                                    <button
                                        class="dropdown-item"
                                        data-alert-action="escalate"
                                        data-alert-id="${id}"
                                    >
                                        ${t('alerts.escalate', 'Escalar')}
                                    </button>
                                </li>

                                <li>
                                    <hr class="dropdown-divider">
                                </li>

                                <li>
                                    <button
                                        class="dropdown-item text-success"
                                        data-alert-action="resolve"
                                        data-alert-id="${id}"
                                    >
                                        ${t('alerts.resolve', 'Resolver')}
                                    </button>
                                </li>

                                <li>
                                    <button
                                        class="dropdown-item text-secondary"
                                        data-alert-action="false-positive"
                                        data-alert-id="${id}"
                                    >
                                        ${t('alerts.falsePositive', 'Falso positivo')}
                                    </button>
                                </li>

                            </ul>

                        </div>

                    </td>

                </tr>
            `;

        }).join('');

        updateSelectAllState();

    }

    // ==========================================
    // ESTADO DE SELECCIÓN GENERAL
    // ==========================================

    function updateSelectAllState() {

        if (!selectAllCheckbox || !tbody) {
            return;
        }

        const checkboxes = [
            ...tbody.querySelectorAll('.alert-checkbox')
        ];

        selectAllCheckbox.checked =
            checkboxes.length > 0 &&
            checkboxes.every(checkbox => checkbox.checked);

        selectAllCheckbox.indeterminate =
            checkboxes.some(checkbox => checkbox.checked) &&
            !checkboxes.every(checkbox => checkbox.checked);

    }

    // ==========================================
    // OBTENER DATOS DE LA RESPUESTA
    // ==========================================

    function extractAlerts(response) {

        const page =
            response?.data?.content
                ? response.data
                : response?.content
                    ? response
                    : null;

        if (page && Array.isArray(page.content)) {
            return page.content;
        }

        if (Array.isArray(response?.data)) {
            return response.data;
        }

        if (Array.isArray(response)) {
            return response;
        }

        throw new Error(
            'El formato de respuesta del backend no es válido.'
        );

    }

    // ==========================================
    // CARGAR ALERTAS
    // ==========================================

    async function loadAlerts() {

        if (!tbody) {
            return;
        }

        if (
            !HttpClient ||
            !ENDPOINTS?.ALERTS?.LIST
        ) {

            console.error(
                'NOVA SIEM: No se encuentra disponible HttpClient o el endpoint de alertas.'
            );

            return;

        }

        // Evita solicitudes simultáneas.
        // Si llega otra actualización mientras se carga,
        // se realizará una nueva consulta al terminar.

        if (loading) {

            reloadRequested = true;

            return;

        }

        loading = true;

        renderAlerts();

        try {

            const response = await HttpClient.get(
                ENDPOINTS.ALERTS.LIST
            );

            const data = extractAlerts(response);

            alerts = data.map(normalizeAlert);

            // Ejecutar análisis automático después de recibir
            // correctamente los datos del backend.

            analyzeAlerts();

            // Reiniciar selección al actualizar los datos.

            if (selectAllCheckbox) {

                selectAllCheckbox.checked = false;

                selectAllCheckbox.indeterminate = false;

            }

        } catch (error) {

            console.error(
                'NOVA SIEM - Error al cargar alertas:',
                error
            );

            alerts = [];

            currentAnalysis = null;

            window.alertAnalysis = null;

            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger py-4">
                        ${escapeHTML(
                            error.message || 'No fue posible cargar las alertas.'
                        )}
                    </td>
                </tr>
            `;

        } finally {

            loading = false;

            updateStatistics();

            if (currentAnalysis) {
                renderAlerts();
            }

            // Procesar una actualización pendiente.

            if (reloadRequested) {

                reloadRequested = false;

                loadAlerts();

            }

        }

    }

    // ==========================================
    // ACTUALIZAR ESTADO DE ALERTA
    // ==========================================

    async function updateAlertStatus(id, status) {

        if (
            !id ||
            !Object.values(STATUS).includes(status)
        ) {

            console.error(
                'NOVA SIEM: ID o estado de alerta no válido.'
            );

            return;

        }

        if (
            !HttpClient ||
            !ENDPOINTS?.ALERTS?.UPDATE_STATUS
        ) {

            console.error(
                'NOVA SIEM: Endpoint de actualización de alertas no disponible.'
            );

            return;

        }

        try {

            await HttpClient.patch(

                ENDPOINTS.ALERTS.UPDATE_STATUS(id),

                { status }

            );

            // Actualizar los datos desde la fuente oficial.

            await loadAlerts();

            // Notificar a los demás módulos que las alertas
            // cambiaron después de una operación.

            document.dispatchEvent(
                new CustomEvent('nova:data-updated', {
                    detail: {
                        source: 'alerts',
                        action: 'status-updated',
                        alertId: id
                    }
                })
            );

        } catch (error) {

            console.error(
                'NOVA SIEM - Error al actualizar alerta:',
                error
            );

            window.alert(
                error.message ||
                t('alerts.updateError', 'No fue posible actualizar la alerta.')
            );

        }

    }

    // ==========================================
    // ACCIONES DE ALERTAS
    // ==========================================

    async function handleAlertAction(action, id) {

        const statusByAction = {

            assign: STATUS.IN_PROGRESS,

            investigate: STATUS.UNDER_INVESTIGATION,

            escalate: STATUS.ESCALATED,

            resolve: STATUS.RESOLVED,

            'false-positive': STATUS.FALSE_POSITIVE

        };

        const status = statusByAction[action];

        if (!status) {
            return;
        }

        await updateAlertStatus(id, status);

    }

    // ==========================================
    // EVENTOS DE LA TABLA
    // ==========================================

    if (tbody) {

        tbody.addEventListener('click', event => {

            const button = event.target.closest(
                '[data-alert-action]'
            );

            if (!button) {
                return;
            }

            handleAlertAction(
                button.dataset.alertAction,
                button.dataset.alertId
            );

        });

        tbody.addEventListener('change', event => {

            if (
                !event.target.classList.contains('alert-checkbox')
            ) {
                return;
            }

            updateSelectAllState();

        });

    }

    // ==========================================
    // SELECCIONAR TODAS LAS ALERTAS
    // ==========================================

    if (selectAllCheckbox && tbody) {

        selectAllCheckbox.addEventListener('change', () => {

            const checkboxes = tbody.querySelectorAll(
                '.alert-checkbox'
            );

            checkboxes.forEach(checkbox => {

                checkbox.checked = selectAllCheckbox.checked;

            });

            selectAllCheckbox.indeterminate = false;

        });

    }

    // ==========================================
    // BÚSQUEDA Y FILTROS
    // ==========================================

    if (searchInput) {

        searchInput.addEventListener('input', renderAlerts);

    }

    if (statusFilter) {

        statusFilter.addEventListener('change', renderAlerts);

    }

    if (assigneeFilter) {

        assigneeFilter.addEventListener('change', renderAlerts);

    }

    // ==========================================
    // ACTUALIZACIÓN MANUAL
    // ==========================================

    if (refreshButton) {

        refreshButton.addEventListener('click', loadAlerts);

    }

    // ==========================================
    // ACTUALIZACIÓN AUTOMÁTICA
    // ==========================================

    document.addEventListener(
        'nova:data-updated',
        event => {

            const source = event.detail?.source;

            // Una nueva ingesta puede producir alertas.
            // Una actualización de eventos también puede
            // generar resultados nuevos en el motor de detección.

            if (
                source === 'ingestion' ||
                source === 'events' ||
                source === 'detection'
            ) {

                loadAlerts();

            }

        }
    );

    // ==========================================
    // CAMBIO DE IDIOMA
    // ==========================================

    document.addEventListener(
        'nova:languageChanged',
        renderAlerts
    );

    // ==========================================
    // EXPORTACIONES GLOBALES
    // ==========================================

    window.actionAlert = handleAlertAction;

    window.renderAlerts = renderAlerts;

    window.loadAlerts = loadAlerts;

    window.analyzeAlerts = analyzeAlerts;

    window.getAlertAnalysis = () => currentAnalysis;

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    loadAlerts();

})();
