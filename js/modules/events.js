
(function () {
    'use strict';

    // ==========================================
    // ELEMENTOS DEL DOM
    // ==========================================

    const tbody = document.getElementById('table-events-body');
    const uploadForm = document.getElementById('uploadForm');
    const uploadStatus = document.getElementById('uploadStatus');
    const btnSubmit = document.getElementById('btn-submit-upload');
    const fileInput = document.getElementById('fileInput');

    // ==========================================
    // ESTADO
    // ==========================================

    let events = [];
    let currentAnalysis = null;

    let loading = false;
    let uploadInProgress = false;
    let reloadRequested = false;
    let isActive = true;
    let requestCounter = 0;

    const previousGlobals = {
        destroy: window.destroyCurrentModule,
        load: window.loadEvents,
        render: window.renderEventsTable,
        analyze: window.analyzeEvents,
        getAnalysis: window.getEventAnalysis,
        viewDetails: window.viewEventDetails
    };

    // ==========================================
    // TRADUCCIONES
    // ==========================================

    function t(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback) || fallback
            : fallback;
    }

    // ==========================================
    // SEGURIDAD HTML
    // ==========================================

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    }

    // ==========================================
    // NORMALIZACIÓN
    // ==========================================

    function normalizeValue(value) {
        return String(value ?? '')
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, '_');
    }

    function normalizeSeverity(severity) {
        return normalizeValue(severity);
    }

    function normalizeEvent(event) {
        if (!event || typeof event !== 'object' || !event.id) {
            throw new Error('El backend devolvió un evento no válido.');
        }

        return {
            ...event,
            id: String(event.id),
            timestamp: event.timestamp,
            sourceIp: event.sourceIp || '--',
            userIdentity: event.userIdentity || '--',
            eventType: event.eventType || '--',
            action: event.action || '--',
            severity: normalizeSeverity(event.severity),
            rawData: event.rawData || {},
            synthetic: Boolean(event.synthetic)
        };
    }

    // ==========================================
    // TRADUCCIONES DE SEVERIDAD
    // ==========================================

    function translateSeverity(severity) {
        const keys = {
            CRITICAL: 'critical',
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low',
            INFO: 'info'
        };

        const value = normalizeSeverity(severity);

        return keys[value]
            ? t(keys[value], value)
            : value || '--';
    }

    // ==========================================
    // TRADUCCIONES DE TIPO DE EVENTO
    // ==========================================

    function translateEventType(type) {
        const keys = {
            'Authentication': 'authentication',
            'Process Execution': 'processExecution',
            'Network Connection': 'networkConnection',
            'File Access': 'fileAccess',
            'Configuration': 'configuration',
            'Data Ingestion': 'dataIngestion'
        };

        return keys[type]
            ? t(keys[type], type)
            : type || '--';
    }

    // ==========================================
    // TRADUCCIONES DE ACCIÓN
    // ==========================================

    function translateEventAction(action) {
        const keys = {
            'Login Failed': 'loginFailed',
            'Blocked by Firewall': 'blockedByFirewall',
            'Service Stopped': 'serviceStopped',
            'Excel File Processed': 'excelFileProcessed'
        };

        return keys[action]
            ? t(keys[action], action)
            : action || '--';
    }

    // ==========================================
    // COLORES
    // ==========================================

    function getSeverityColor(severity) {
        const colors = {
            CRITICAL: '#EF4444',
            HIGH: '#F97316',
            MEDIUM: '#EAB308',
            LOW: '#06B6D4',
            INFO: '#06B6D4'
        };

        return colors[normalizeSeverity(severity)] || '#6B7280';
    }

    // ==========================================
    // FECHAS
    // ==========================================

    function formatEventDate(dateValue) {
        if (!dateValue) return '--';

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return '--';

        const language =
            typeof window.getCurrentLanguage === 'function'
                ? window.getCurrentLanguage()
                : 'es';

        return new Intl.DateTimeFormat(
            language === 'en' ? 'en-US' : 'es-CO',
            {
                dateStyle: 'short',
                timeStyle: 'medium'
            }
        ).format(date);
    }

    // ==========================================
    // MENSAJES DE TABLA
    // ==========================================

    function showTableMessage(message, type = 'muted') {
        if (!tbody) return;

        const row = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 7;
        cell.className = `text-center py-4 text-${type}`;
        cell.textContent = message;

        row.appendChild(cell);
        tbody.replaceChildren(row);
    }

    // ==========================================
    // ANÁLISIS AUTOMÁTICO DE EVENTOS
    // ==========================================

    function analyzeEvents() {
        const analysis = {
            totalEvents: events.length,

            bySeverity: {
                CRITICAL: 0,
                HIGH: 0,
                MEDIUM: 0,
                LOW: 0,
                INFO: 0,
                UNKNOWN: 0
            },

            byType: {},
            byAction: {},
            bySourceIp: {},
            byUser: {},

            syntheticEvents: 0,
            realEvents: 0,

            eventsLast24Hours: 0,
            eventsLast7Days: 0,

            invalidTimestamps: 0,

            topSourceIps: [],
            topUsers: [],
            topEventTypes: [],

            analyzedAt: new Date().toISOString()
        };

        const now = Date.now();
        const last24Hours = now - (24 * 60 * 60 * 1000);
        const last7Days = now - (7 * 24 * 60 * 60 * 1000);

        events.forEach(event => {
            // Severidad
            const severity = normalizeSeverity(event.severity);

            if (
                Object.prototype.hasOwnProperty.call(
                    analysis.bySeverity,
                    severity
                )
            ) {
                analysis.bySeverity[severity]++;
            } else {
                analysis.bySeverity.UNKNOWN++;
            }

            // Tipo de evento
            const type = String(event.eventType || 'UNKNOWN');

            analysis.byType[type] =
                (analysis.byType[type] || 0) + 1;

            // Acción
            const action = String(event.action || 'UNKNOWN');

            analysis.byAction[action] =
                (analysis.byAction[action] || 0) + 1;

            // IP de origen
            const sourceIp = String(event.sourceIp || 'UNKNOWN');

            if (sourceIp !== '--') {
                analysis.bySourceIp[sourceIp] =
                    (analysis.bySourceIp[sourceIp] || 0) + 1;
            }

            // Usuario
            const user = String(event.userIdentity || 'UNKNOWN');

            if (user !== '--') {
                analysis.byUser[user] =
                    (analysis.byUser[user] || 0) + 1;
            }

            // Eventos sintéticos y reales
            if (event.synthetic) {
                analysis.syntheticEvents++;
            } else {
                analysis.realEvents++;
            }

            // Distribución temporal
            const timestamp = new Date(event.timestamp).getTime();

            if (!Number.isFinite(timestamp)) {
                analysis.invalidTimestamps++;
            } else {
                if (timestamp >= last24Hours && timestamp <= now) {
                    analysis.eventsLast24Hours++;
                }

                if (timestamp >= last7Days && timestamp <= now) {
                    analysis.eventsLast7Days++;
                }
            }
        });

        // Principales direcciones IP por cantidad de eventos
        analysis.topSourceIps = Object.entries(analysis.bySourceIp)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([sourceIp, count]) => ({
                sourceIp,
                count
            }));

        // Principales usuarios por cantidad de eventos
        analysis.topUsers = Object.entries(analysis.byUser)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([user, count]) => ({
                user,
                count
            }));

        // Tipos de eventos más frecuentes
        analysis.topEventTypes = Object.entries(analysis.byType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type, count]) => ({
                type,
                count
            }));

        currentAnalysis = analysis;

        // Resultado disponible para Dashboard y otros módulos.
        window.eventAnalysis = analysis;

        document.dispatchEvent(
            new CustomEvent('nova:events-analyzed', {
                detail: analysis
            })
        );

        return analysis;
    }

    function getEventAnalysis() {
        return currentAnalysis;
    }

    // ==========================================
    // NOTIFICAR ACTUALIZACIÓN DE DATOS
    // ==========================================

    function dispatchDataUpdated(action) {
        document.dispatchEvent(
            new CustomEvent('nova:data-updated', {
                detail: {
                    source: 'events',
                    action,
                    timestamp: new Date().toISOString()
                }
            })
        );
    }

    // ==========================================
    // RENDERIZAR TABLA
    // ==========================================

    function renderEventsTable() {
        if (!isActive || !tbody) return;

        if (loading) {
            showTableMessage(
                t('loading', 'Cargando eventos...')
            );
            return;
        }

        if (!events.length) {
            showTableMessage(
                t('noEvents', 'No se encontraron eventos.')
            );
            return;
        }

        const fragment = document.createDocumentFragment();

        events.forEach(event => {
            const color = getSeverityColor(event.severity);
            const row = document.createElement('tr');

            const cells = [
                formatEventDate(event.timestamp),
                event.sourceIp,
                event.userIdentity,
                translateEventType(event.eventType),
                translateEventAction(event.action)
            ];

            cells.forEach((value, index) => {
                const cell = document.createElement('td');

                if (index === 0) {
                    cell.className = 'text-muted';
                    cell.style.fontSize = '0.85rem';
                }

                if (index === 1) {
                    cell.style.fontFamily = 'monospace';
                }

                cell.textContent = value ?? '--';
                row.appendChild(cell);
            });

            // Severidad
            const severityCell = document.createElement('td');
            const badge = document.createElement('span');

            badge.className = 'badge';
            badge.style.cssText = `
                background-color: ${color}20;
                color: ${color};
                border: 1px solid ${color};
            `;

            badge.textContent = translateSeverity(event.severity);
            severityCell.appendChild(badge);
            row.appendChild(severityCell);

            // Detalles
            const detailsCell = document.createElement('td');
            detailsCell.className = 'text-center';

            const button = document.createElement('button');
            button.type = 'button';
            button.className =
                'btn btn-sm btn-outline-info py-0 px-2';

            button.dataset.eventId = event.id;
            button.title = t('viewDetails', 'Ver detalles');
            button.setAttribute(
                'aria-label',
                t('viewDetails', 'Ver detalles')
            );

            button.innerHTML =
                '<i class="bi bi-list-columns-reverse"></i>';

            detailsCell.appendChild(button);
            row.appendChild(detailsCell);

            fragment.appendChild(row);
        });

        tbody.replaceChildren(fragment);
    }

    // ==========================================
    // CARGAR EVENTOS DEL BACKEND
    // ==========================================

    async function loadEvents() {
        if (!isActive) return;

        if (loading) {
            reloadRequested = true;
            return;
        }

        if (
            !tbody ||
            !window.HttpClient ||
            !window.ENDPOINTS?.EVENTS?.LIST
        ) {
            console.error(
                'Events: faltan la tabla, HttpClient o la configuración del endpoint.'
            );
            return;
        }

        const currentRequest = ++requestCounter;

        loading = true;
        reloadRequested = false;

        renderEventsTable();

        try {
            const response = await window.HttpClient.get(
                window.ENDPOINTS.EVENTS.LIST
            );

            if (!isActive || currentRequest !== requestCounter) {
                return;
            }

            const page = response?.data;

            if (!page || !Array.isArray(page.content)) {
                throw new Error(
                    'Respuesta no válida: se esperaba una lista paginada de eventos.'
                );
            }

            events = page.content.map(normalizeEvent);

            // Analiza automáticamente los eventos recibidos.
            analyzeEvents();

        } catch (error) {
            if (!isActive || currentRequest !== requestCounter) {
                return;
            }

            console.error('Error al cargar eventos:', error);

            events = [];
            currentAnalysis = null;
            window.eventAnalysis = null;

            showTableMessage(
                error.message || t(
                    'eventsLoadError',
                    'No fue posible cargar los eventos.'
                ),
                'danger'
            );

            return;

        } finally {
            if (currentRequest === requestCounter) {
                loading = false;
            }

            if (isActive && reloadRequested) {
                reloadRequested = false;
                loadEvents();
            }
        }

        if (isActive) {
            renderEventsTable();

            dispatchDataUpdated('events-loaded');
        }
    }

    // ==========================================
    // DETALLES DEL EVENTO
    // ==========================================

    async function viewEventDetails(id) {
        if (!isActive || !id) return;

        try {
            const response = await window.HttpClient.get(
                window.ENDPOINTS.EVENTS.DETAILS(id)
            );

            if (!isActive) return;

            const event = response?.data;

            if (!event || !event.id) {
                throw new Error(
                    'No se encontraron los detalles del evento.'
                );
            }

            const details = [
                `ID: ${event.id}`,
                `Fecha: ${formatEventDate(event.timestamp)}`,
                `IP de origen: ${event.sourceIp || '--'}`,
                `Usuario: ${event.userIdentity || '--'}`,
                `Tipo de evento: ${event.eventType || '--'}`,
                `Acción: ${event.action || '--'}`,
                `Severidad: ${event.severity || '--'}`,
                `Sintético: ${Boolean(event.synthetic)}`,
                '',
                'Datos originales:',
                JSON.stringify(event.rawData || {}, null, 2)
            ].join('\n');

            window.alert(details);

        } catch (error) {
            if (!isActive) return;

            console.error(
                'Error al consultar los detalles del evento:',
                error
            );

            window.alert(
                error.message ||
                t(
                    'eventDetailsError',
                    'No fue posible cargar los detalles del evento.'
                )
            );
        }
    }

    // ==========================================
    // IMPORTACIÓN EXCEL
    // ==========================================

    async function uploadExcel(file) {
        const formData = new FormData();

        formData.append('file', file);

        return window.HttpClient.post(
            window.ENDPOINTS.INGEST.UPLOAD_EXCEL,
            formData
        );
    }

    // ==========================================
    // ESTADO DE IMPORTACIÓN
    // ==========================================

    function showUploadStatus(message, type) {
        if (!uploadStatus) return;

        uploadStatus.className = `alert alert-${type} mt-3`;
        uploadStatus.textContent = message;
        uploadStatus.classList.remove('d-none');
    }

    function resetUploadButton() {
        if (!btnSubmit) return;

        btnSubmit.disabled = false;

        btnSubmit.textContent = t(
            'processNormalise',
            'Procesar y normalizar'
        );
    }

    // ==========================================
    // PROCESAR IMPORTACIÓN
    // ==========================================

    async function handleExcelUpload(event) {
        event.preventDefault();

        if (!isActive || uploadInProgress) return;

        const file = fileInput?.files?.[0];

        if (!file) {
            showUploadStatus(
                t('selectFile', 'Selecciona un archivo Excel.'),
                'warning'
            );
            return;
        }

        if (!/\.(xls|xlsx)$/i.test(file.name)) {
            showUploadStatus(
                t(
                    'invalidFile',
                    'Solo se admiten archivos Excel (.xls, .xlsx).'
                ),
                'danger'
            );
            return;
        }

        uploadInProgress = true;

        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"></span>
                ${t('processing', 'Procesando...')}
            `;
        }

        uploadStatus?.classList.add('d-none');

        try {
            const result = await uploadExcel(file);

            if (!isActive) return;

            if (
                !result ||
                result.status !== 'success'
            ) {
                throw new Error(
                    result?.message ||
                    'El backend no confirmó la importación del archivo Excel.'
                );
            }

            const count = Number(
                result.ingestedEventsCount ??
                result.ingested_events_count ??
                0
            );

            showUploadStatus(
                `${t('success', 'Correcto')}: ${file.name}. ` +
                `${count} ${t('eventsImported', 'eventos importados')}.`,
                'success'
            );

            uploadForm.reset();

            // Notifica a los módulos dependientes de la nueva ingestión.
            document.dispatchEvent(
                new CustomEvent('nova:data-updated', {
                    detail: {
                        source: 'ingestion',
                        action: 'excel-imported',
                        ingestedEventsCount: count,
                        timestamp: new Date().toISOString()
                    }
                })
            );

            // Actualiza la lista local de eventos.
            await loadEvents();

        } catch (error) {
            if (!isActive) return;

            console.error(
                'Error durante la importación de Excel:',
                error
            );

            showUploadStatus(
                error.message ||
                t(
                    'uploadError',
                    'No fue posible procesar el archivo Excel.'
                ),
                'danger'
            );

        } finally {
            uploadInProgress = false;

            if (isActive) {
                resetUploadButton();
            }
        }
    }

    if (uploadForm) {
        uploadForm.addEventListener(
            'submit',
            handleExcelUpload
        );
    }

    // ==========================================
    // EVENTOS DE TABLA
    // ==========================================

    function handleTableClick(event) {
        const button = event.target.closest('[data-event-id]');

        if (!button || !tbody.contains(button)) return;

        viewEventDetails(button.dataset.eventId);
    }

    if (tbody) {
        tbody.addEventListener('click', handleTableClick);
    }

    // ==========================================
    // ACTUALIZACIONES DE OTROS MÓDULOS
    // ==========================================

    function handleDataUpdated(event) {
        if (!isActive) return;

        const source = event.detail?.source;

        // Se evita escuchar "events" para no generar un ciclo
        // cuando este módulo notifica que terminó de cargar.
        if (source === 'ingestion') {
            loadEvents();
        }
    }

    document.addEventListener(
        'nova:data-updated',
        handleDataUpdated
    );

    // ==========================================
    // FUNCIONES GLOBALES
    // ==========================================

    window.viewEventDetails = viewEventDetails;
    window.loadEvents = loadEvents;
    window.renderEventsTable = renderEventsTable;
    window.analyzeEvents = analyzeEvents;
    window.getEventAnalysis = getEventAnalysis;

    // ==========================================
    // CAMBIO DE IDIOMA
    // ==========================================

    function handleLanguageChange() {
        renderEventsTable();

        if (btnSubmit && !uploadInProgress) {
            resetUploadButton();
        }
    }

    document.addEventListener(
        'nova:languageChanged',
        handleLanguageChange
    );

    // ==========================================
    // DESTRUCCIÓN DEL MÓDULO
    // ==========================================

    function destroyEventsModule() {
        if (!isActive) return;

        isActive = false;
        requestCounter++;
        reloadRequested = false;

        if (uploadForm) {
            uploadForm.removeEventListener(
                'submit',
                handleExcelUpload
            );
        }

        if (tbody) {
            tbody.removeEventListener(
                'click',
                handleTableClick
            );
        }

        document.removeEventListener(
            'nova:data-updated',
            handleDataUpdated
        );

        document.removeEventListener(
            'nova:languageChanged',
            handleLanguageChange
        );

        if (window.viewEventDetails === viewEventDetails) {
            window.viewEventDetails = previousGlobals.viewDetails;
        }

        if (window.loadEvents === loadEvents) {
            window.loadEvents = previousGlobals.load;
        }

        if (window.renderEventsTable === renderEventsTable) {
            window.renderEventsTable = previousGlobals.render;
        }

        if (window.analyzeEvents === analyzeEvents) {
            window.analyzeEvents = previousGlobals.analyze;
        }

        if (window.getEventAnalysis === getEventAnalysis) {
            window.getEventAnalysis = previousGlobals.getAnalysis;
        }

        if (window.destroyCurrentModule === destroyEventsModule) {
            window.destroyCurrentModule = previousGlobals.destroy;
        }

        events = [];
        currentAnalysis = null;

        window.eventAnalysis = null;

        loading = false;
        uploadInProgress = false;
    }

    window.destroyCurrentModule = destroyEventsModule;

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    loadEvents();

})();
