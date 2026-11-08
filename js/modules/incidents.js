
(function () {
    'use strict';

    // ==========================================
    // STATE
    // ==========================================

    let incidents = [];
    let isLoading = false;
    let showMyIncidents = false;

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
    // UTILITIES
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

        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    }

    function translateStatus(status) {
        const value = normalizeValue(status);

        const keys = {
            TRIAGE: 'triage',
            CONTAINMENT: 'containment',
            ERADICATION: 'eradication',
            RECOVERY: 'recovery',
            CLOSED: 'closed'
        };

        return t(keys[value], value || '--');
    }

    function translateSeverity(severity) {
        const value = normalizeValue(severity);

        const keys = {
            CRITICAL: 'critical',
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low'
        };

        return t(keys[value], value || '--');
    }

    // ==========================================
    // CURRENT USER
    // ==========================================

    function getCurrentUsername() {
        try {
            const storedUser = sessionStorage.getItem('nova_user');

            if (!storedUser) return null;

            const user = JSON.parse(storedUser);

            return user?.username || null;

        } catch (error) {
            console.error('Unable to read current user:', error);
            return null;
        }
    }

    // ==========================================
    // INCIDENT NORMALIZATION
    // ==========================================

    function normalizeIncident(incident) {
        return {
            ...incident,
            id: incident.id,
            title: incident.title || 'Untitled incident',
            description: incident.description || '',
            severity: normalizeValue(incident.severity),
            status: normalizeValue(incident.status),
            primaryHypothesis: incident.primaryHypothesis || '--',
            assignedTo: incident.assignedTo || null,
            createdAt: incident.createdAt || null
        };
    }

    // ==========================================
    // FILTERS
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
            const id = String(incident.id || '').toLowerCase();
            const title = String(incident.title || '').toLowerCase();
            const description = String(
                incident.description || ''
            ).toLowerCase();

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
                    username &&
                    incident.assignedTo === username &&
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
    // LOADING / ERROR / EMPTY
    // ==========================================

    function renderLoading() {
        const container = getElement('incidents-container');

        if (!container) return;

        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <div class="spinner-border spinner-border-sm me-2"
                     role="status"></div>
                ${t('loadingIncidents', 'Loading incidents...')}
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
                        ${t('retry', 'Retry')}
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

                <h6>${t('noIncidentsFound', 'No incidents found.')}</h6>

                <p class="small mb-0">
                    ${t(
                        'incidentsWillAppear',
                        'Incidents will appear here when they are created by the security workflow.'
                    )}
                </p>
            </div>
        `;
    }

    // ==========================================
    // INCIDENT CARDS
    // ==========================================

    function renderIncidents() {
        const container = getElement('incidents-container');

        if (!container) return;

        const filteredIncidents = getFilteredIncidents();

        container.innerHTML = '';

        if (!filteredIncidents.length) {
            renderEmpty();
            return;
        }

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
                        ${t('unassigned', 'Unassigned')}
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
                                    ${t('lifecycleProgress', 'Lifecycle Progress')}
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

                                ${t('workspace', 'Workspace')}
                                <i class="bi bi-arrow-right ms-1"></i>

                            </button>

                        </div>

                    </div>
                </div>
            `;

            container.appendChild(card);
        });
    }

    // ==========================================
    // LOAD INCIDENTS FROM BACKEND
    // ==========================================

    async function loadIncidents() {
        if (isLoading) return;

        isLoading = true;
        renderLoading();

        try {
            const response = await HttpClient.get(
                ENDPOINTS.INCIDENTS.LIST
            );

            if (!response || !response.data) {
                throw new Error('Invalid incidents response.');
            }

            const data = response.data;

            const content = Array.isArray(data)
                ? data
                : data.content;

            if (!Array.isArray(content)) {
                throw new Error(
                    'The backend did not return a valid incidents list.'
                );
            }

            incidents = content.map(normalizeIncident);

        } catch (error) {
            console.error('Error loading incidents:', error);

            renderError(
                error.message || 'Unable to load incidents.'
            );

            return;

        } finally {
            isLoading = false;
        }

        renderIncidents();
    }

    // ==========================================
    // CREATE INCIDENT
    // ==========================================

    async function createIncident(event) {
        event.preventDefault();

        const form = getElement('createIncidentForm');

        if (!form) return;

        const title =
            getElement('incidentTitle')?.value.trim();

        const severity =
            getElement('incidentSeverity')?.value;

        const primaryHypothesis =
            getElement('incidentHypothesis')?.value.trim();

        const description =
            getElement('incidentDescription')?.value.trim();

        if (!title || !severity || !primaryHypothesis) {
            alert(t(
                'completeRequiredFields',
                'Please complete all required fields.'
            ));
            return;
        }

        const payload = {
            title,
            description: description || null,
            severity: normalizeValue(severity),
            primaryHypothesis
        };

        const submitButton = form.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) submitButton.disabled = true;

        try {
            await HttpClient.post(
                ENDPOINTS.INCIDENTS.CREATE,
                payload
            );

            form.reset();

            showMyIncidents = false;

            getElement('btn-my-incidents')
                ?.classList.remove('active');

            const statusFilter =
                getElement('filter-status-inc');

            if (statusFilter) statusFilter.value = '';

            const modalElement =
                getElement('createIncidentModal');

            if (modalElement && window.bootstrap) {
                bootstrap.Modal
                    .getInstance(modalElement)
                    ?.hide();
            }

            await loadIncidents();

        } catch (error) {
            console.error('Error creating incident:', error);

            alert(
                error.message || 'Unable to create incident.'
            );

        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    }

    // ==========================================
    // INVESTIGATION WORKSPACE
    // ==========================================

    function openInvestigationWorkspace(id) {
        if (!id) return;

        sessionStorage.setItem(
            'nova_selected_incident_id',
            id
        );

        const link = document.querySelector(
            '.nav-link[data-route="investigations"]'
        );

        if (!link) {
            console.error(
                'Investigations navigation link not found.'
            );
            return;
        }

        link.click();
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    document.addEventListener('submit', event => {
        if (event.target.id === 'createIncidentForm') {
            createIncident(event);
        }
    });

    document.addEventListener('click', event => {
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
        }

        if (event.target.closest('#btn-my-incidents')) {
            const username = getCurrentUsername();

            if (!username) {
                alert(t(
                    'userSessionUnavailable',
                    'Unable to identify the current user session.'
                ));
                return;
            }

            showMyIncidents = !showMyIncidents;

            getElement('btn-my-incidents')
                ?.classList.toggle('active', showMyIncidents);

            renderIncidents();
        }
    });

    document.addEventListener('input', event => {
        if (event.target.id === 'search-incidents') {
            renderIncidents();
        }
    });

    document.addEventListener('change', event => {
        if (
            event.target.id === 'filter-severity-inc' ||
            event.target.id === 'filter-status-inc'
        ) {
            renderIncidents();
        }
    });

    document.addEventListener(
        'nova:languageChanged',
        renderIncidents
    );

    // ==========================================
    // PUBLIC METHODS
    // ==========================================

    window.loadIncidents = loadIncidents;
    window.renderIncidents = renderIncidents;
    window.openInvestigationWorkspace =
        openInvestigationWorkspace;

    // ==========================================
    // INITIALIZATION
    // ==========================================

    loadIncidents();

})();
