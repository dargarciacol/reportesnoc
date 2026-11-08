
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
    // TRADUCCIÓN DE SEVERIDAD
    // ==========================================

    function translateSeverity(severity) {
        const keys = {
            CRITICAL: 'critical',
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low',
            INFO: 'info'
        };

        return t(keys[severity], severity || '--');
    }

    // ==========================================
    // TRADUCCIÓN DE TIPO DE EVENTO
    // ==========================================

    function translateEventType(type) {
        const keys = {
            Authentication: 'authentication',
            'Process Execution': 'processExecution',
            'Network Connection': 'networkConnection',
            'File Access': 'fileAccess',
            Configuration: 'configuration',
            'Data Ingestion': 'dataIngestion'
        };

        return t(keys[type], type || '--');
    }

    // ==========================================
    // TRADUCCIÓN DE ACCIÓN
    // ==========================================

    function translateEventAction(action) {
        const keys = {
            'Login Failed': 'loginFailed',
            'Blocked by Firewall': 'blockedByFirewall',
            'Service Stopped': 'serviceStopped',
            'Excel File Processed': 'excelFileProcessed'
        };

        return t(keys[action], action || '--');
    }

    // ==========================================
    // COLORES DE SEVERIDAD
    // ==========================================

    function getSeverityColor(severity) {
        const colors = {
            CRITICAL: '#EF4444',
            HIGH: '#F97316',
            MEDIUM: '#EAB308',
            LOW: '#06B6D4',
            INFO: '#06B6D4'
        };

        return colors[severity] || '#6B7280';
    }

    // ==========================================
    // FORMATO DE FECHA
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
    // NORMALIZACIÓN DE EVENTOS
    // ==========================================

    function normalizeEvent(event) {
        return {
            id: event.id,
            time: event.timestamp,
            ip: event.sourceIp || '--',
            user: event.userIdentity || '--',
            type: event.eventType || '--',
            action: event.action || '--',
            severity: event.severity || 'LOW',
            rawData: event.rawData || {},
            synthetic: event.synthetic
        };
    }

    // ==========================================
    // RENDERIZAR TABLA
    // ==========================================

    function renderEventsTable() {
        if (!tbody) return;

        if (loading) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <span class="spinner-border spinner-border-sm me-2"></span>
                        ${t('loading', 'Loading events...')}
                    </td>
                </tr>
            `;
            return;
        }

        if (!events.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-secondary">
                        ${t('noEvents', 'No events found')}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = events.map(evt => {
            const color = getSeverityColor(evt.severity);
            const action = translateEventAction(evt.action);

            return `
                <tr>
                    <td style="color: var(--text-muted); font-size: 0.85rem;">
                        ${escapeHTML(formatEventDate(evt.time))}
                    </td>

                    <td style="font-family: monospace;">
                        ${escapeHTML(evt.ip)}
                    </td>

                    <td>
                        ${escapeHTML(evt.user)}
                    </td>

                    <td>
                        ${escapeHTML(translateEventType(evt.type))}
                    </td>

                    <td>
                        ${escapeHTML(action)}
                    </td>

                    <td>
                        <span class="badge"
                              style="
                                background-color: ${color}20;
                                color: ${color};
                                border: 1px solid ${color};
                              ">
                            ${escapeHTML(translateSeverity(evt.severity))}
                        </span>
                    </td>

                    <td class="text-center">
                        <button
                            class="btn btn-sm btn-outline-info py-0 px-2"
                            data-event-id="${escapeHTML(evt.id)}"
                            title="${escapeHTML(t('viewDetails', 'View details'))}"
                            aria-label="${escapeHTML(t('viewDetails', 'View details'))}"
                        >
                            <i class="bi bi-list-columns-reverse"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ==========================================
    // CARGAR EVENTOS DESDE EL BACKEND
    // ==========================================

    async function loadEvents() {
        if (!tbody || typeof HttpClient === 'undefined') {
            console.error(
                'Events: HttpClient or table element not found.'
            );
            return;
        }

        loading = true;
        renderEventsTable();

        try {
            const response = await HttpClient.get(
                ENDPOINTS.EVENTS.LIST
            );

            const page = response?.data;

            if (!page || !Array.isArray(page.content)) {
                throw new Error(
                    'Unexpected events API response format.'
                );
            }

            events = page.content.map(normalizeEvent);

        } catch (error) {
            console.error('Failed to load events:', error);

            events = [];

            loading = false;

            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger py-4">
                        ${escapeHTML(
                            error.message || 'Unable to load events'
                        )}
                    </td>
                </tr>
            `;

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
            const response = await HttpClient.get(
                ENDPOINTS.EVENTS.DETAILS(id)
            );

            const event = response?.data;

            if (!event) {
                throw new Error('Event details not found.');
            }

            console.log('EVENT DETAILS:', event);

            const details = [
                `ID: ${event.id}`,
                `Timestamp: ${event.timestamp || '--'}`,
                `Source IP: ${event.sourceIp || '--'}`,
                `User: ${event.userIdentity || '--'}`,
                `Event Type: ${event.eventType || '--'}`,
                `Action: ${event.action || '--'}`,
                `Severity: ${event.severity || '--'}`,
                `Synthetic: ${event.synthetic}`,
                '',
                'Raw Data:',
                JSON.stringify(event.rawData || {}, null, 2)
            ].join('\n');

            window.alert(details);

        } catch (error) {
            console.error(
                'Failed to load event details:',
                error
            );

            window.alert(
                error.message ||
                t('eventDetailsError', 'Unable to load event details')
            );
        }
    }

    // ==========================================
    // IMPORTAR EXCEL
    // ==========================================

    async function uploadExcel(file) {
        const formData = new FormData();

        formData.append('file', file);

        return await HttpClient.post(
            ENDPOINTS.INGEST.UPLOAD_EXCEL,
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
    // EVENTO DE IMPORTACIÓN
    // ==========================================

    if (uploadForm) {
        uploadForm.addEventListener('submit', async event => {
            event.preventDefault();

            const file = fileInput?.files?.[0];

            if (!file) {
                showUploadStatus(
                    t('selectFile', 'Please select an Excel file.'),
                    'warning'
                );
                return;
            }

            const validExtension = /\.(xls|xlsx)$/i.test(file.name);

            if (!validExtension) {
                showUploadStatus(
                    t(
                        'invalidFile',
                        'Only Excel files (.xls, .xlsx) are supported.'
                    ),
                    'danger'
                );
                return;
            }

            if (btnSubmit) {
                btnSubmit.disabled = true;

                btnSubmit.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"></span>
                    ${t('processing', 'Processing...')}
                `;
            }

            if (uploadStatus) {
                uploadStatus.classList.add('d-none');
            }

            try {
                const result = await uploadExcel(file);

                console.log(
                    'EXCEL INGESTION RESULT:',
                    result
                );

                showUploadStatus(
                    `${t('success', 'Success')}: ${file.name}`,
                    'success'
                );

                uploadForm.reset();

                await loadEvents();

            } catch (error) {
                console.error(
                    'Excel ingestion failed:',
                    error
                );

                showUploadStatus(
                    error.message ||
                    t('uploadError', 'Failed to process Excel file.'),
                    'danger'
                );

            } finally {
                resetUploadButton();
            }
        });
    }

    // ==========================================
    // EVENTOS DE LA TABLA
    // ==========================================

    if (tbody) {
        tbody.addEventListener('click', event => {
            const button = event.target.closest('[data-event-id]');

            if (!button) return;

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

    document.addEventListener(
        'nova:languageChanged',
        () => {
            renderEventsTable();

            if (btnSubmit && !btnSubmit.disabled) {
                btnSubmit.textContent = t(
                    'processNormalise',
                    'Process & Normalise'
                );
            }
        }
    );

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    loadEvents();

})();
