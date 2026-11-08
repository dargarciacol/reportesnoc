
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
    let loading = false;
    let uploadInProgress = false;

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

    function normalizeSeverity(severity) {
        return String(severity || '').toUpperCase();
    }

    function normalizeEvent(event) {
        return {
            id: event.id,
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
    // RENDERIZAR TABLA
    // ==========================================

    function renderEventsTable() {
        if (!tbody) return;

        if (loading) {
            showTableMessage(t('loading', 'Loading events...'));
            return;
        }

        if (!events.length) {
            showTableMessage(t('noEvents', 'No events found'));
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

            // Severity
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

            // Details
            const detailsCell = document.createElement('td');
            detailsCell.className = 'text-center';

            const button = document.createElement('button');
            button.type = 'button';
            button.className =
                'btn btn-sm btn-outline-info py-0 px-2';

            button.dataset.eventId = event.id;
            button.title = t('viewDetails', 'View details');
            button.setAttribute(
                'aria-label',
                t('viewDetails', 'View details')
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
        if (loading) return;

        if (!tbody || !window.HttpClient || !window.ENDPOINTS) {
            console.error(
                'Events: missing table, HttpClient or ENDPOINTS.'
            );
            return;
        }

        loading = true;
        renderEventsTable();

        try {
            const response = await window.HttpClient.get(
                window.ENDPOINTS.EVENTS.LIST
            );

            const page = response?.data;

            if (!page || !Array.isArray(page.content)) {
                throw new Error(
                    'Invalid response: expected a paginated events list.'
                );
            }

            events = page.content.map(normalizeEvent);

        } catch (error) {
            console.error('Failed to load events:', error);

            events = [];

            showTableMessage(
                error.message || t(
                    'eventsLoadError',
                    'Unable to load events.'
                ),
                'danger'
            );

            return;

        } finally {
            loading = false;
        }

        renderEventsTable();
    }

    // ==========================================
    // DETALLES DEL EVENTO
    // ==========================================

    async function viewEventDetails(id) {
        if (!id) return;

        try {
            const response = await window.HttpClient.get(
                window.ENDPOINTS.EVENTS.DETAILS(id)
            );

            const event = response?.data;

            if (!event || !event.id) {
                throw new Error('Event details not found.');
            }

            const details = [
                `ID: ${event.id}`,
                `Timestamp: ${formatEventDate(event.timestamp)}`,
                `Source IP: ${event.sourceIp || '--'}`,
                `User: ${event.userIdentity || '--'}`,
                `Event Type: ${event.eventType || '--'}`,
                `Action: ${event.action || '--'}`,
                `Severity: ${event.severity || '--'}`,
                `Synthetic: ${Boolean(event.synthetic)}`,
                '',
                'Raw Data:',
                JSON.stringify(event.rawData || {}, null, 2)
            ].join('\n');

            window.alert(details);

        } catch (error) {
            console.error('Failed to load event details:', error);

            window.alert(
                error.message ||
                t('eventDetailsError', 'Unable to load event details.')
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
            'Process & Normalise'
        );
    }

    // ==========================================
    // PROCESAR IMPORTACIÓN
    // ==========================================

    if (uploadForm) {
        uploadForm.addEventListener('submit', async event => {
            event.preventDefault();

            if (uploadInProgress) return;

            const file = fileInput?.files?.[0];

            if (!file) {
                showUploadStatus(
                    t('selectFile', 'Please select an Excel file.'),
                    'warning'
                );
                return;
            }

            if (!/\.(xls|xlsx)$/i.test(file.name)) {
                showUploadStatus(
                    t(
                        'invalidFile',
                        'Only Excel files (.xls, .xlsx) are supported.'
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
                    ${t('processing', 'Processing...')}
                `;
            }

            uploadStatus?.classList.add('d-none');

            try {
                const result = await uploadExcel(file);

                if (
                    !result ||
                    result.status !== 'success'
                ) {
                    throw new Error(
                        result?.message ||
                        'The backend did not confirm the Excel import.'
                    );
                }

                const count = Number(
                    result.ingestedEventsCount ??
                    result.ingested_events_count ??
                    0
                );

                showUploadStatus(
                    `${t('success', 'Success')}: ${file.name}. ` +
                    `${count} ${t('eventsImported', 'events imported')}.`,
                    'success'
                );

                uploadForm.reset();

                await loadEvents();

            } catch (error) {
                console.error('Excel ingestion failed:', error);

                showUploadStatus(
                    error.message ||
                    t('uploadError', 'Failed to process Excel file.'),
                    'danger'
                );

            } finally {
                uploadInProgress = false;
                resetUploadButton();
            }
        });
    }

    // ==========================================
    // EVENTOS DE TABLA
    // ==========================================

    if (tbody) {
        tbody.addEventListener('click', event => {
            const button = event.target.closest('[data-event-id]');

            if (!button || !tbody.contains(button)) return;

            viewEventDetails(button.dataset.eventId);
        });
    }

    // ==========================================
    // FUNCIONES GLOBALES
    // ==========================================

    window.viewEventDetails = viewEventDetails;
    window.loadEvents = loadEvents;
    window.renderEventsTable = renderEventsTable;

    // ==========================================
    // CAMBIO DE IDIOMA
    // ==========================================

    document.addEventListener('nova:languageChanged', () => {
        renderEventsTable();

        if (btnSubmit && !uploadInProgress) {
            resetUploadButton();
        }
    });

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    loadEvents();

})();
