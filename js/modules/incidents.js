
(function () {
    'use strict';

    // ==========================================
    // PREVENIR MÓDULOS DUPLICADOS
    // ==========================================

    if (typeof window.destroyCurrentModule === 'function') {
        window.destroyCurrentModule();
    }

    // ==========================================
    // ESTADO
    // ==========================================

    let incidents = [];
    let currentAnalysis = null;

    let isLoading = false;
    let isCreating = false;
    let showMyIncidents = false;
    let isActive = true;
    let reloadRequested = false;
    let requestVersion = 0;

    const severityColors = {
        CRITICAL: '#EF4444',
        HIGH: '#F97316',
        MEDIUM: '#EAB308',
        LOW: '#06B6D4'
    };

    const statusProgress = {
        TRIAGE: 25,
        CONTAINMENT: 50,
        ERADICATION: 75,
        RECOVERY: 90,
        CLOSED: 100
    };

    // ==========================================
    // REFERENCIAS GLOBALES ANTERIORES
    // ==========================================

    const previousGlobals = {
        loadIncidents: window.loadIncidents,
        renderIncidents: window.renderIncidents,
        analyzeIncidents: window.analyzeIncidents,
        getIncidentAnalysis: window.getIncidentAnalysis,
        openInvestigationWorkspace:
            window.openInvestigationWorkspace,
        destroyCurrentModule: window.destroyCurrentModule
    };

    // ==========================================
    // ELEMENTOS Y UTILIDADES
    // ==========================================

    function getElement(id) {
        return document.getElementById(id);
    }

    function t(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback) || fallback
            : fallback;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]);
    }

    function normalizeValue(value) {
        return String(value ?? '').trim().toUpperCase();
    }

    function formatDate(value) {
        if (!value) return '--';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return '--';

        const language =
            typeof window.getCurrentLanguage === 'function'
                ? window.getCurrentLanguage()
                : 'es';

        return new Intl.DateTimeFormat(
            language === 'en' ? 'en-US' : 'es-CO',
            {
                dateStyle: 'medium',
                timeStyle: 'short'
            }
        ).format(date);
    }

    // ==========================================
    // TRADUCCIONES
    // ==========================================

    function translateStatus(status) {
        const value = normalizeValue(status);

        const keys = {
            TRIAGE: 'triage',
            CONTAINMENT: 'containment',
            ERADICATION: 'eradication',
            RECOVERY: 'recovery',
            CLOSED: 'closed'
        };

        return keys[value]
            ? t(keys[value], value)
            : value || '--';
    }

    function translateSeverity(severity) {
        const value = normalizeValue(severity);

        const keys = {
            CRITICAL: 'critical',
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low'
        };

        return keys[value]
            ? t(keys[value], value)
            : value || '--';
    }

    // ==========================================
    // USUARIO AUTENTICADO
    // ==========================================

    function getCurrentUsername() {
        try {
            const storedUser = sessionStorage.getItem('nova_user');

            if (!storedUser) return null;

            const user = JSON.parse(storedUser);

            return (
                user?.username ||
                user?.userName ||
                user?.login ||
                null
            );

        } catch (error) {
            console.error(
                'No fue posible leer el usuario autenticado:',
                error
            );

            return null;
        }
    }

    // ==========================================
    // NORMALIZACIÓN DE INCIDENTES
    // ==========================================

    function normalizeIncident(incident) {
        if (!incident || !incident.id) {
            throw new Error(
                'El backend devolvió un incidente no válido.'
            );
        }

        return {
            ...incident,
            id: String(incident.id),
            title: incident.title || 'Incidente sin título',
            description: incident.description || '',
            severity: normalizeValue(incident.severity),
            status: normalizeValue(incident.status),
            primaryHypothesis: incident.primaryHypothesis || '--',
            assignedTo: incident.assignedTo || null,
            confidenceLevel: incident.confidenceLevel ?? null,
            createdAt: incident.createdAt || null,
            updatedAt: incident.updatedAt || null
        };
    }

    // ==========================================
    // ANÁLISIS AUTOMÁTICO DE INCIDENTES
    // ==========================================

    function analyzeIncidents() {
        const analysis = {
            totalIncidents: incidents.length,

            bySeverity: {
                CRITICAL: 0,
                HIGH: 0,
                MEDIUM: 0,
                LOW: 0,
                UNKNOWN: 0
            },

            byStatus: {
                TRIAGE: 0,
                CONTAINMENT: 0,
                ERADICATION: 0,
                RECOVERY: 0,
                CLOSED: 0,
                UNKNOWN: 0
            },

            openIncidents: 0,
            closedIncidents: 0,

            assignedIncidents: 0,
            unassignedIncidents: 0,

            criticalOpenIncidents: 0,
            highPriorityOpenIncidents: 0,

            averageConfidenceLevel: null,
            incidentsWithConfidence: 0,

            analyzedAt: new Date().toISOString()
        };

        let confidenceTotal = 0;

        incidents.forEach(incident => {
            const severity = normalizeValue(incident.severity);
            const status = normalizeValue(incident.status);

            // Distribución por severidad
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

            // Distribución por estado
            if (
                Object.prototype.hasOwnProperty.call(
                    analysis.byStatus,
                    status
                )
            ) {
                analysis.byStatus[status]++;
            } else {
                analysis.byStatus.UNKNOWN++;
            }

            // Incidentes abiertos y cerrados
            if (status === 'CLOSED') {
                analysis.closedIncidents++;
            } else {
                analysis.openIncidents++;
            }

            // Asignación
            if (incident.assignedTo) {
                analysis.assignedIncidents++;
            } else {
                analysis.unassignedIncidents++;
            }

            // Prioridad de incidentes abiertos
            if (status !== 'CLOSED') {
                if (severity === 'CRITICAL') {
                    analysis.criticalOpenIncidents++;
                }

                if (
                    severity === 'CRITICAL' ||
                    severity === 'HIGH'
                ) {
                    analysis.highPriorityOpenIncidents++;
                }
            }

            // Nivel de confianza, si el backend lo proporciona
            const confidence = Number(incident.confidenceLevel);

            if (
                incident.confidenceLevel !== null &&
                incident.confidenceLevel !== undefined &&
                incident.confidenceLevel !== '' &&
                Number.isFinite(confidence)
            ) {
                confidenceTotal += confidence;
                analysis.incidentsWithConfidence++;
            }
        });

        if (analysis.incidentsWithConfidence > 0) {
            analysis.averageConfidenceLevel = Number(
                (
                    confidenceTotal /
                    analysis.incidentsWithConfidence
                ).toFixed(2)
            );
        }

        currentAnalysis = analysis;

        window.incidentAnalysis = analysis;

        document.dispatchEvent(
            new CustomEvent('nova:incidents-analyzed', {
                detail: analysis
            })
        );

        return analysis;
    }

    function getIncidentAnalysis() {
        return currentAnalysis;
    }

    // ==========================================
    // NOTIFICAR ACTUALIZACIONES
    // ==========================================

    function dispatchDataUpdated(action, additionalData = {}) {
        document.dispatchEvent(
            new CustomEvent('nova:data-updated', {
                detail: {
                    source: 'incidents',
                    action,
                    timestamp: new Date().toISOString(),
                    ...additionalData
                }
            })
        );
    }

    // ==========================================
    // FILTRAR INCIDENTES
    // ==========================================

    function getFilteredIncidents() {
        const search = getElement('search-incidents')
            ?.value.trim().toLowerCase() || '';

        const severity = normalizeValue(
            getElement('filter-severity-inc')?.value
        );

        const status = normalizeValue(
            getElement('filter-status-inc')?.value
        );

        const username = getCurrentUsername();

        return incidents.filter(incident => {
            const id = incident.id.toLowerCase();
            const title = incident.title.toLowerCase();
            const description = incident.description.toLowerCase();

            const matchesSearch =
                !search ||
                id.includes(search) ||
                title.includes(search) ||
                description.includes(search);

            const matchesSeverity =
                !severity || incident.severity === severity;

            const matchesStatus =
                !status || incident.status === status;

            const matchesMyIncidents =
                !showMyIncidents ||
                (
                    username !== null &&
                    String(incident.assignedTo || '').toLowerCase() ===
                        username.toLowerCase() &&
                    incident.status !== 'CLOSED'
                );

            return (
                matchesSearch &&
                matchesSeverity &&
                matchesStatus &&
                matchesMyIncidents
            );
        });
    }

    // ==========================================
    // ESTADOS DE INTERFAZ
    // ==========================================

    function renderLoading() {
        const container = getElement('incidents-container');

        if (!container) return;

        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <div class="spinner-border spinner-border-sm me-2"
                     role="status"></div>
                ${t('loadingIncidents', 'Cargando incidentes...')}
            </div>
        `;
    }

    function renderError(message) {
        const container = getElement('incidents-container');

        if (!container) return;

        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    ${escapeHtml(message)}

                    <button class="btn btn-sm btn-outline-danger ms-3"
                            type="button"
                            id="retry-incidents">
                        ${t('retry', 'Reintentar')}
                    </button>
                </div>
            </div>
        `;
    }

    function renderEmpty() {
        const container = getElement('incidents-container');

        if (!container) return;

        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="bi bi-shield-check fs-1 d-block mb-3"></i>

                <h6>${t('noIncidentsFound', 'No se encontraron incidentes.')}</h6>

                <p class="small mb-0">
                    ${t(
                        'incidentsWillAppear',
                        'Los incidentes aparecerán aquí cuando sean creados por el flujo de seguridad.'
                    )}
                </p>
            </div>
        `;
    }

    // ==========================================
    // RENDERIZAR INCIDENTES
    // ==========================================

    function renderIncidents() {
        if (!isActive) return;

        const container = getElement('incidents-container');

        if (!container) return;

        const filteredIncidents = getFilteredIncidents();

        container.innerHTML = '';

        if (!filteredIncidents.length) {
            renderEmpty();
            return;
        }

        const fragment = document.createDocumentFragment();

        filteredIncidents.forEach(incident => {
            const severity = incident.severity;
            const status = incident.status;

            const color =
                severityColors[severity] || '#94A3B8';

            const progress =
                statusProgress[status] ?? 10;

            const assigneeHTML = incident.assignedTo
                ? `
                    <i class="bi bi-person-check-fill me-1"
                       style="color:var(--primary);"></i>
                    ${escapeHtml(incident.assignedTo)}
                `
                : `
                    <span class="text-warning">
                        <i class="bi bi-exclamation-circle me-1"></i>
                        ${t('unassigned', 'Sin asignar')}
                    </span>
                `;

            const card = document.createElement('div');

            card.className = 'col-md-6 col-lg-4 mb-4';

            card.innerHTML = `
                <div class="card bg-surface border-panel h-100 rounded-3
                            position-relative overflow-hidden">

                    <div style="
                        position:absolute;
                        top:0;
                        left:0;
                        width:4px;
                        height:100%;
                        background:${color};
                    "></div>

                    <div class="card-body ps-4">

                        <div class="d-flex justify-content-between
                                    align-items-start mb-2">

                            <span class="badge"
                                  style="
                                    background:${color}20;
                                    color:${color};
                                    border:1px solid ${color};
                                  ">
                                ${escapeHtml(incident.id)}
                            </span>

                            <span class="badge bg-secondary">
                                ${escapeHtml(translateStatus(status))}
                            </span>

                        </div>

                        <h5 class="card-title text-main fs-6 fw-bold mb-3">
                            ${escapeHtml(incident.title)}
                        </h5>

                        <p class="text-muted small mb-3"
                           style="
                             min-height:32px;
                             display:-webkit-box;
                             -webkit-line-clamp:2;
                             -webkit-box-orient:vertical;
                             overflow:hidden;
                           ">
                            <i class="bi bi-lightning-charge me-1"></i>
                            ${escapeHtml(incident.primaryHypothesis)}
                        </p>

                        <div class="mb-3">
                            <span class="badge"
                                  style="
                                    background:${color}20;
                                    color:${color};
                                    border:1px solid ${color};
                                  ">
                                ${escapeHtml(translateSeverity(severity))}
                            </span>
                        </div>

                        <div class="text-muted small mb-3">

                            <div class="mb-2">
                                <i class="bi bi-calendar3 me-1"></i>
                                ${escapeHtml(formatDate(incident.createdAt))}
                            </div>

                            <div>
                                <i class="bi bi-person me-1"></i>
                                ${assigneeHTML}
                            </div>

                        </div>

                        <div class="mb-3">

                            <div class="d-flex justify-content-between
                                        text-muted small mb-1">

                                <span>
                                    ${t('lifecycleProgress', 'Progreso del ciclo de vida')}
                                </span>

                                <span>${progress}%</span>

                            </div>

                            <div class="progress"
                                 style="height:4px;background:var(--bg-main);">

                                <div class="progress-bar"
                                     role="progressbar"
                                     style="
                                        width:${progress}%;
                                        background:${color};
                                     "
                                     aria-valuenow="${progress}"
                                     aria-valuemin="0"
                                     aria-valuemax="100">
                                </div>

                            </div>

                        </div>

                        <div class="border-top border-panel pt-3 mt-3">

                            <p class="text-muted small">
                                ${escapeHtml(incident.description)}
                            </p>

                            <button
                                class="btn btn-sm btn-outline-info w-100"
                                type="button"
                                data-investigation-id="${escapeHtml(incident.id)}">

                                ${t('workspace', 'Espacio de investigación')}
                                <i class="bi bi-arrow-right ms-1"></i>

                            </button>

                        </div>

                    </div>
                </div>
            `;

            fragment.appendChild(card);
        });

        container.appendChild(fragment);
    }

    // ==========================================
    // CARGAR INCIDENTES
    // ==========================================

    async function loadIncidents() {
        if (!isActive) return;

        if (isLoading) {
            reloadRequested = true;
            return;
        }

        if (
            !window.HttpClient ||
            !window.ENDPOINTS?.INCIDENTS?.LIST
        ) {
            console.error(
                'Incidents: HttpClient o ENDPOINTS no disponibles.'
            );
            return;
        }

        isLoading = true;
        reloadRequested = false;

        const currentRequest = ++requestVersion;

        renderLoading();

        try {
            const response = await window.HttpClient.get(
                window.ENDPOINTS.INCIDENTS.LIST
            );

            if (!isActive || currentRequest !== requestVersion) {
                return;
            }

            const data = response?.data;

            if (!data || !Array.isArray(data.content)) {
                throw new Error(
                    'Respuesta no válida: se esperaba una lista paginada de incidentes.'
                );
            }

            incidents = data.content.map(normalizeIncident);

            // Analiza automáticamente los incidentes recibidos.
            analyzeIncidents();

            renderIncidents();

        } catch (error) {
            if (!isActive || currentRequest !== requestVersion) {
                return;
            }

            console.error(
                'Error al cargar incidentes:',
                error
            );

            incidents = [];
            currentAnalysis = null;
            window.incidentAnalysis = null;

            renderError(
                error.message ||
                'No fue posible cargar los incidentes.'
            );

        } finally {
            if (currentRequest === requestVersion) {
                isLoading = false;
            }

            if (isActive && reloadRequested) {
                reloadRequested = false;
                loadIncidents();
            }
        }
    }

    // ==========================================
    // CREAR INCIDENTE
    // ==========================================

    async function createIncident(event) {
        event.preventDefault();

        if (!isActive || isCreating) return;

        const form = getElement('createIncidentForm');

        if (!form) return;

        const title =
            getElement('incidentTitle')?.value.trim();

        const severity =
            normalizeValue(
                getElement('incidentSeverity')?.value
            );

        const primaryHypothesis =
            getElement('incidentHypothesis')?.value.trim();

        const description =
            getElement('incidentDescription')?.value.trim();

        if (!title || !severity) {
            window.alert(
                t(
                    'completeRequiredFields',
                    'Completa todos los campos obligatorios.'
                )
            );
            return;
        }

        const payload = {
            title,
            severity
        };

        if (description) {
            payload.description = description;
        }

        if (primaryHypothesis) {
            payload.primaryHypothesis = primaryHypothesis;
        }

        const submitButton = form.querySelector(
            'button[type="submit"]'
        );

        isCreating = true;

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const response = await window.HttpClient.post(
                window.ENDPOINTS.INCIDENTS.CREATE,
                payload
            );

            if (!isActive) return;

            if (!response?.data?.id) {
                throw new Error(
                    'El backend no devolvió el incidente creado.'
                );
            }

            form.reset();

            showMyIncidents = false;

            getElement('btn-my-incidents')
                ?.classList.remove('active');

            const statusFilter =
                getElement('filter-status-inc');

            if (statusFilter) {
                statusFilter.value = '';
            }

            const modalElement =
                getElement('createIncidentModal');

            if (modalElement && window.bootstrap) {
                window.bootstrap.Modal
                    .getInstance(modalElement)
                    ?.hide();
            }

            dispatchDataUpdated('incident-created', {
                incidentId: String(response.data.id)
            });

            await loadIncidents();

        } catch (error) {
            if (!isActive) return;

            console.error(
                'Error al crear el incidente:',
                error
            );

            window.alert(
                error.message ||
                'No fue posible crear el incidente.'
            );

        } finally {
            isCreating = false;

            if (submitButton && isActive) {
                submitButton.disabled = false;
            }
        }
    }

    // ==========================================
    // INVESTIGATION WORKSPACE
    // ==========================================

    function openInvestigationWorkspace(id) {
        if (!isActive || !id) return;

        sessionStorage.setItem(
            'nova_selected_incident_id',
            id
        );

        if (
            window.NOVA &&
            typeof window.NOVA.navigate === 'function'
        ) {
            window.NOVA.navigate('investigations');
            return;
        }

        const link = document.querySelector(
            '.nav-link[data-route="investigations"]'
        );

        if (link) {
            link.click();
            return;
        }

        console.error(
            'La ruta de investigaciones no está disponible.'
        );
    }

    // ==========================================
    // ACTUALIZACIONES DE OTROS MÓDULOS
    // ==========================================

    function handleDataUpdated(event) {
        if (!isActive) return;

        const source = event.detail?.source;

        // Los cambios en eventos, alertas, reglas o ingestión
        // pueden requerir volver a consultar los incidentes.
        //
        // No escuchamos "incidents" para evitar un ciclo
        // cuando este módulo crea o actualiza sus propios datos.

        const relevantSources = [
            'ingestion',
            'events',
            'alerts',
            'detection'
        ];

        if (relevantSources.includes(source)) {
            loadIncidents();
        }
    }

    // ==========================================
    // EVENT HANDLERS
    // ==========================================

    function handleSubmit(event) {
        if (event.target.id !== 'createIncidentForm') return;

        createIncident(event);
    }

    function handleClick(event) {
        if (event.target.closest('#retry-incidents')) {
            loadIncidents();
            return;
        }

        const investigationButton = event.target.closest(
            '[data-investigation-id]'
        );

        if (investigationButton) {
            openInvestigationWorkspace(
                investigationButton.dataset.investigationId
            );
            return;
        }

        if (event.target.closest('#btn-my-incidents')) {
            const username = getCurrentUsername();

            if (!username) {
                window.alert(
                    t(
                        'userSessionUnavailable',
                        'No fue posible identificar la sesión del usuario.'
                    )
                );
                return;
            }

            showMyIncidents = !showMyIncidents;

            getElement('btn-my-incidents')
                ?.classList.toggle('active', showMyIncidents);

            renderIncidents();
        }
    }

    function handleInput(event) {
        if (event.target.id === 'search-incidents') {
            renderIncidents();
        }
    }

    function handleChange(event) {
        if (
            event.target.id === 'filter-severity-inc' ||
            event.target.id === 'filter-status-inc'
        ) {
            renderIncidents();
        }
    }

    function handleLanguageChanged() {
        renderIncidents();
    }

    // ==========================================
    // LIMPIEZA DEL MÓDULO
    // ==========================================

    function cleanup() {
        if (!isActive) return;

        isActive = false;
        requestVersion++;
        reloadRequested = false;

        document.removeEventListener('submit', handleSubmit);
        document.removeEventListener('click', handleClick);
        document.removeEventListener('input', handleInput);
        document.removeEventListener('change', handleChange);

        document.removeEventListener(
            'nova:languageChanged',
            handleLanguageChanged
        );

        document.removeEventListener(
            'nova:data-updated',
            handleDataUpdated
        );

        if (window.loadIncidents === loadIncidents) {
            window.loadIncidents = previousGlobals.loadIncidents;
        }

        if (window.renderIncidents === renderIncidents) {
            window.renderIncidents = previousGlobals.renderIncidents;
        }

        if (window.analyzeIncidents === analyzeIncidents) {
            window.analyzeIncidents = previousGlobals.analyzeIncidents;
        }

        if (window.getIncidentAnalysis === getIncidentAnalysis) {
            window.getIncidentAnalysis =
                previousGlobals.getIncidentAnalysis;
        }

        if (
            window.openInvestigationWorkspace ===
            openInvestigationWorkspace
        ) {
            window.openInvestigationWorkspace =
                previousGlobals.openInvestigationWorkspace;
        }

        if (window.destroyCurrentModule === cleanup) {
            window.destroyCurrentModule =
                previousGlobals.destroyCurrentModule;
        }

        incidents = [];
        currentAnalysis = null;

        window.incidentAnalysis = null;

        isLoading = false;
        isCreating = false;
    }

    // ==========================================
    // REGISTRO DE EVENTOS
    // ==========================================

    document.addEventListener('submit', handleSubmit);
    document.addEventListener('click', handleClick);
    document.addEventListener('input', handleInput);
    document.addEventListener('change', handleChange);

    document.addEventListener(
        'nova:languageChanged',
        handleLanguageChanged
    );

    document.addEventListener(
        'nova:data-updated',
        handleDataUpdated
    );

    // ==========================================
    // MÉTODOS PÚBLICOS
    // ==========================================

    window.loadIncidents = loadIncidents;
    window.renderIncidents = renderIncidents;
    window.analyzeIncidents = analyzeIncidents;
    window.getIncidentAnalysis = getIncidentAnalysis;

    window.openInvestigationWorkspace =
        openInvestigationWorkspace;

    window.destroyCurrentModule = cleanup;

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    loadIncidents();

})();
