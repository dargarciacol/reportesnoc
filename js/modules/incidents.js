
(function () {
    const incidentsContainer = document.getElementById('incidents-container');
    const formCreateIncident = document.getElementById('createIncidentForm');

    const searchInput = document.getElementById('search-incidents');
    const severityFilter = document.getElementById('filter-severity-inc');
    const statusFilter = document.getElementById('filter-status-inc');
    const myIncidentsButton = document.getElementById('btn-my-incidents');

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

    function t(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback)
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
        return String(value || '').toUpperCase();
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

        return t(keys[value], value);
    }

    function translateSeverity(severity) {
        const value = normalizeValue(severity);

        const keys = {
            CRITICAL: 'critical',
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low'
        };

        return t(keys[value], value);
    }

    function formatDate(dateValue) {
        if (!dateValue) return '--';

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return '--';

        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    }

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

    function getFilteredIncidents() {
        const search = searchInput?.value.trim().toLowerCase() || '';
        const severity = normalizeValue(severityFilter?.value);
        const status = normalizeValue(statusFilter?.value);

        const username = getCurrentUsername();

        return incidents.filter(incident => {
            const id = String(incident.id || '').toLowerCase();
            const title = String(incident.title || '').toLowerCase();

            const matchesSearch =
                !search ||
                id.includes(search) ||
                title.includes(search);

            const matchesSeverity =
                !severity ||
                normalizeValue(incident.severity) === severity;

            const matchesStatus =
                !status ||
                normalizeValue(incident.status) === status;

            const matchesMyIncidents =
                !showMyIncidents ||
                (
                    username &&
                    incident.assignedTo === username &&
                    normalizeValue(incident.status) !== 'CLOSED'
                );

            return (
                matchesSearch &&
                matchesSeverity &&
                matchesStatus &&
                matchesMyIncidents
            );
        });
    }

    function renderLoading() {
        if (!incidentsContainer) return;

        incidentsContainer.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <div class="spinner-border spinner-border-sm me-2"
                     role="status"></div>
                ${t('loadingIncidents', 'Loading incidents...')}
            </div>
        `;
    }

    function renderError(message) {
        if (!incidentsContainer) return;

        incidentsContainer.innerHTML = `
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

        document.getElementById('retry-incidents')
            ?.addEventListener('click', loadIncidents);
    }

    function renderEmpty() {
        if (!incidentsContainer) return;

        incidentsContainer.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="bi bi-shield-check fs-1 d-block mb-3"></i>
                ${t('noIncidentsFound', 'No incidents found.')}
            </div>
        `;
    }

    function renderIncidents() {
        if (!incidentsContainer) return;

        const filteredIncidents = getFilteredIncidents();

        incidentsContainer.innerHTML = '';

        if (filteredIncidents.length === 0) {
            renderEmpty();
            return;
        }

        filteredIncidents.forEach(incident => {
            const severity = normalizeValue(incident.severity);
            const status = normalizeValue(incident.status);

            const color = severityColors[severity] || '#94A3B8';
            const progress = statusProgress[status] ?? 10;

            const hypothesis = incident.primaryHypothesis || '--';
            const assignee = incident.assignedTo || null;

            const assigneeHTML = assignee
                ? `
                    <i class="bi bi-person-check-fill me-1"
                       style="color: var(--primary);"></i>
                    ${escapeHtml(assignee)}
                `
                : `
                    <span class="text-warning">
                        <i class="bi bi-exclamation-circle me-1"></i>
                        ${t('unassigned', 'Unassigned')}
                    </span>
                `;

            const cardHtml = `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card bg-surface border-panel h-100 rounded-3 position-relative overflow-hidden">

                        <div style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 4px;
                            height: 100%;
                            background-color: ${color};
                        "></div>

                        <div class="card-body ps-4">

                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <span class="badge"
                                      style="
                                        background-color: ${color}20;
                                        color: ${color};
                                        border: 1px solid ${color};
                                      ">
                                    ${escapeHtml(incident.id)}
                                </span>

                                <span class="badge bg-secondary">
                                    ${escapeHtml(translateStatus(status))}
                                </span>
                            </div>

                            <h5 class="card-title text-main fs-6 fw-bold mb-3"
                                style="min-height: 40px;">
                                ${escapeHtml(incident.title)}
                            </h5>

                            <p class="text-muted small mb-3"
                               style="
                                 min-height: 32px;
                                 display: -webkit-box;
                                 -webkit-line-clamp: 2;
                                 -webkit-box-orient: vertical;
                                 overflow: hidden;
                               ">
                                <i class="bi bi-lightning-charge me-1"></i>
                                ${escapeHtml(hypothesis)}
                            </p>

                            <div class="mb-3">
                                <span class="badge"
                                      style="
                                        background-color: ${color}20;
                                        color: ${color};
                                        border: 1px solid ${color};
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
                                <div class="d-flex justify-content-between text-muted small mb-1">
                                    <span>
                                        ${t('lifecycleProgress', 'Lifecycle Progress')}
                                    </span>
                                    <span>${progress}%</span>
                                </div>

                                <div class="progress"
                                     style="height: 4px; background-color: var(--bg-main);">

                                    <div class="progress-bar"
                                         role="progressbar"
                                         style="
                                            width: ${progress}%;
                                            background-color: ${color};
                                         "
                                         aria-valuenow="${progress}"
                                         aria-valuemin="0"
                                         aria-valuemax="100">
                                    </div>
                                </div>
                            </div>

                            <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-panel">

                                <span class="text-muted small">
                                    ${escapeHtml(incident.description || '')}
                                </span>

                                <button class="btn btn-sm btn-outline-info"
                                        type="button"
                                        data-investigation-id="${escapeHtml(incident.id)}">

                                    ${t('workspace', 'Workspace')}
                                    <i class="bi bi-arrow-right ms-1"></i>
                                </button>

                            </div>

                        </div>
                    </div>
                </div>
            `;

            incidentsContainer.insertAdjacentHTML('beforeend', cardHtml);
        });
    }

    async function loadIncidents() {
        if (isLoading) return;

        isLoading = true;
        renderLoading();

        try {
            const response = await HttpClient.get(
                ENDPOINTS.INCIDENTS.LIST
            );

            if (!response?.data ||
                !Array.isArray(response.data.content)) {
                throw new Error('Unexpected incidents response.');
            }

            incidents = response.data.content;

            renderIncidents();

        } catch (error) {
            console.error('Error loading incidents:', error);

            renderError(
                error.message || 'Unable to load incidents.'
            );

        } finally {
            isLoading = false;
        }
    }

    async function createIncident(event) {
        event.preventDefault();

        const title = document.getElementById('incidentTitle')?.value.trim();
        const severity = document.getElementById('incidentSeverity')?.value;
        const primaryHypothesis =
            document.getElementById('incidentHypothesis')?.value;
        const description =
            document.getElementById('incidentDescription')?.value.trim();

        if (!title || !severity || !primaryHypothesis) {
            alert(t('completeRequiredFields', 'Please complete all required fields.'));
            return;
        }

        const payload = {
            title,
            description: description || null,
            severity: severity.toUpperCase(),
            primaryHypothesis
        };

        const submitButton = formCreateIncident.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) submitButton.disabled = true;

        try {
            await HttpClient.post(
                ENDPOINTS.INCIDENTS.CREATE,
                payload
            );

            formCreateIncident.reset();

            showMyIncidents = false;
            if (myIncidentsButton) {
                myIncidentsButton.classList.remove('active');
            }

            if (statusFilter) statusFilter.value = '';

            const modalElement = document.getElementById(
                'createIncidentModal'
            );

            const modal = modalElement
                ? bootstrap.Modal.getInstance(modalElement)
                : null;

            modal?.hide();

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

    function openInvestigationWorkspace(id) {
        console.log('Opening investigation workspace for incident:', id);

        const navLinks = document.querySelectorAll('.nav-link');

        const investigationsLink = Array.from(navLinks).find(
            link => link.getAttribute('data-route') === 'investigations'
        );

        if (investigationsLink) {
            navLinks.forEach(link => link.classList.remove('active'));
            investigationsLink.classList.add('active');

            investigationsLink.click();

            // El ID real del incidente queda disponible para el módulo.
            sessionStorage.setItem('nova_selected_incident_id', id);
        } else {
            console.error('Investigations navigation link not found.');
        }
    }

    incidentsContainer?.addEventListener('click', event => {
        const button = event.target.closest('[data-investigation-id]');

        if (!button) return;

        openInvestigationWorkspace(
            button.dataset.investigationId
        );
    });

    formCreateIncident?.addEventListener('submit', createIncident);

    searchInput?.addEventListener('input', renderIncidents);
    severityFilter?.addEventListener('change', renderIncidents);
    statusFilter?.addEventListener('change', renderIncidents);

    myIncidentsButton?.addEventListener('click', () => {
        const username = getCurrentUsername();

        if (!username) {
            alert(
                t(
                    'userSessionUnavailable',
                    'Unable to identify the current user session.'
                )
            );
            return;
        }

        showMyIncidents = !showMyIncidents;

        myIncidentsButton.classList.toggle(
            'active',
            showMyIncidents
        );

        renderIncidents();
    });

    document.addEventListener(
        'nova:languageChanged',
        renderIncidents
    );

    window.loadIncidents = loadIncidents;
    window.renderIncidents = renderIncidents;
    window.openInvestigationWorkspace = openInvestigationWorkspace;

    loadIncidents();
})();
