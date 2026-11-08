
(function () {
    'use strict';

    // =========================================================
    // STATE
    // =========================================================

    let currentInvestigation = null;
    let currentIncident = null;
    let currentEvents = [];
    let currentAlerts = [];
    let cy = null;

    let isLoading = false;

    const notebook = {
        facts: [],
        inferences: [],
        pending: []
    };

    // =========================================================
    // DOM HELPERS
    // =========================================================

    const getElement = id => document.getElementById(id);

    function translate(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback) || fallback
            : fallback;
    }

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[char]);
    }

    function setText(element, value, fallback = '--') {
        if (element) {
            element.textContent = value ?? fallback;
        }
    }

    function showMessage(element, message, type = 'info') {
        if (!element) return;

        element.className = `alert alert-${type} mt-3`;
        element.textContent = message;
        element.classList.remove('d-none');
    }

    function hideMessage(element) {
        element?.classList.add('d-none');
    }

    function normalize(value) {
        return String(value ?? '').trim().toUpperCase();
    }

    function formatDate(value) {
        if (!value) return '--';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return '--';
        }

        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    }

    function getIncidentId() {
        return sessionStorage.getItem('nova_selected_incident_id');
    }

    function getInvestigationId() {
        return currentInvestigation?.id || null;
    }

    // =========================================================
    // API HELPERS
    // =========================================================

    async function getApiData(url) {
        const response = await HttpClient.get(url);

        if (!response || response.data === undefined) {
            throw new Error('Invalid API response.');
        }

        return response.data;
    }

    function extractCollection(data) {
        if (Array.isArray(data)) return data;

        if (Array.isArray(data?.content)) {
            return data.content;
        }

        return [];
    }

    // =========================================================
    // LOAD INVESTIGATION
    // =========================================================

    async function loadInvestigation() {
        const incidentId = getIncidentId();

        if (!incidentId) {
            showMessage(
                getElement('cy-container'),
                translate(
                    'noIncidentSelected',
                    'No incident selected. Return to Incidents and open a workspace.'
                ),
                'warning'
            );
            return;
        }

        if (isLoading) return;

        isLoading = true;

        try {
            const investigation = await getApiData(
                ENDPOINTS.INVESTIGATIONS.BY_INCIDENT(
                    encodeURIComponent(incidentId)
                )
            );

            if (!investigation?.id) {
                throw new Error('Investigation not found for this incident.');
            }

            currentInvestigation = investigation;
            currentIncident = investigation.incident || null;

            renderInvestigation();
            loadNotebook();
            renderNotebook();

            await loadRelatedEvidence();

        } catch (error) {
            console.error('Investigation loading error:', error);

            showMessage(
                getElement('cy-container'),
                error.message || 'Could not load investigation.',
                'danger'
            );

        } finally {
            isLoading = false;
        }
    }

    // =========================================================
    // INCIDENT INFORMATION
    // =========================================================

    function renderInvestigation() {
        const incident = currentIncident || {};

        setText(
            getElement('investigation-incident-id'),
            incident.id || getIncidentId()
        );

        setText(
            getElement('investigation-incident-title'),
            incident.title,
            translate('untitledIncident', 'Untitled incident')
        );

        setText(
            getElement('investigation-opened-at'),
            formatDate(
                currentInvestigation.createdAt ||
                incident.createdAt
            )
        );

        setText(
            getElement('investigation-lead'),
            incident.assignedTo
        );

        setText(
            getElement('investigation-verdict'),
            currentInvestigation.verdict
        );

        setText(
            getElement('investigation-confidence'),
            currentInvestigation.confidenceScore != null
                ? `${currentInvestigation.confidenceScore}%`
                : '--'
        );

        setText(
            getElement('investigation-recommended-action'),
            currentInvestigation.recommendedAction
        );
    }

    // =========================================================
    // RELATED EVIDENCE
    // =========================================================

    async function loadRelatedEvidence() {
        /*
         * The current API configuration exposes:
         * GET /investigations/incident/{id}
         *
         * This endpoint must return the investigation and its
         * associated evidence if the backend supports that relation.
         *
         * We do not invent an events-by-investigation endpoint.
         */

        currentEvents = extractCollection(
            currentInvestigation.events ||
            currentInvestigation.evidence
        );

        currentAlerts = extractCollection(
            currentInvestigation.alerts
        );

        renderTimeline();
        renderEvidenceSummary();
        renderGraph();
    }

    // =========================================================
    // EVIDENCE ANALYSIS
    // =========================================================

    function analyzeEvidence(event) {
        const raw = event.rawData || {};

        const severity = normalize(event.severity);
        const action = String(event.action || '').toLowerCase();
        const description = String(
            raw.event_description || event.eventType || ''
        ).toLowerCase();

        const findings = [];

        if (severity === 'CRITICAL' || severity === 'HIGH') {
            findings.push('High-priority security event');
        }

        if (
            action.includes('fail') ||
            description.includes('failed') ||
            description.includes('failure')
        ) {
            findings.push('Authentication or operation failure indicator');
        }

        if (
            description.includes('powershell') ||
            String(raw.process_commandline || '')
                .toLowerCase().includes('powershell')
        ) {
            findings.push('PowerShell execution indicator');
        }

        if (
            description.includes('blocked') ||
            action.includes('blocked')
        ) {
            findings.push('Blocking action recorded');
        }

        return findings;
    }

    function renderEvidenceSummary() {
        const container = getElement('evidence-summary');

        if (!container) return;

        const critical = currentEvents.filter(
            event => normalize(event.severity) === 'CRITICAL'
        ).length;

        const high = currentEvents.filter(
            event => normalize(event.severity) === 'HIGH'
        ).length;

        const findings = currentEvents.reduce(
            (total, event) => total + analyzeEvidence(event).length,
            0
        );

        container.innerHTML = `
            <div class="row g-3">

                <div class="col-6 col-lg-3">
                    <div class="card bg-surface border-panel p-3">
                        <div class="text-muted small">Related events</div>
                        <div class="fs-3 fw-bold">${currentEvents.length}</div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card bg-surface border-panel p-3">
                        <div class="text-muted small">Critical events</div>
                        <div class="fs-3 fw-bold text-danger">${critical}</div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card bg-surface border-panel p-3">
                        <div class="text-muted small">High events</div>
                        <div class="fs-3 fw-bold text-warning">${high}</div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card bg-surface border-panel p-3">
                        <div class="text-muted small">Evidence indicators</div>
                        <div class="fs-3 fw-bold">${findings}</div>
                    </div>
                </div>

            </div>
        `;
    }

    // =========================================================
    // TIMELINE
    // =========================================================

    function renderTimeline() {
        const timelineBody = getElement('timeline-body');

        if (!timelineBody) return;

        if (!currentEvents.length) {
            timelineBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        ${translate(
                            'noEvidenceAvailable',
                            'No related event evidence is available.'
                        )}
                    </td>
                </tr>
            `;
            return;
        }

        const sortedEvents = [...currentEvents].sort(
            (a, b) =>
                new Date(a.timestamp || 0) -
                new Date(b.timestamp || 0)
        );

        timelineBody.innerHTML = sortedEvents.map(event => {
            const findings = analyzeEvidence(event);

            return `
                <tr>
                    <td>${escapeHTML(formatDate(event.timestamp))}</td>

                    <td>${escapeHTML(event.eventType || '--')}</td>

                    <td>${escapeHTML(event.action || '--')}</td>

                    <td>
                        <span class="badge bg-secondary">
                            ${escapeHTML(normalize(event.severity) || '--')}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(findings.join(', ') || '--')}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // =========================================================
    // RELATIONSHIP GRAPH
    // =========================================================

    function renderGraph() {
        const container = getElement('cy-container');

        if (!container) return;

        if (typeof window.cytoscape !== 'function') {
            container.innerHTML = `
                <div class="text-center text-muted p-4">
                    Cytoscape.js is not loaded.
                </div>
            `;
            return;
        }

        if (!currentIncident?.id) {
            container.innerHTML = `
                <div class="text-center text-muted p-4">
                    No incident data available.
                </div>
            `;
            return;
        }

        if (cy) {
            cy.destroy();
            cy = null;
        }

        const elements = [
            {
                data: {
                    id: `incident-${currentIncident.id}`,
                    label: currentIncident.title || 'Incident',
                    type: 'incident'
                }
            }
        ];

        const edges = [];

        currentAlerts.forEach((alert, index) => {
            const alertId = `alert-${alert.id || index}`;

            elements.push({
                data: {
                    id: alertId,
                    label: alert.ruleTriggered || 'Security alert',
                    type: 'alert'
                }
            });

            edges.push({
                data: {
                    id: `edge-alert-${index}`,
                    source: `incident-${currentIncident.id}`,
                    target: alertId,
                    label: 'RELATED'
                }
            });
        });

        currentEvents.forEach((event, index) => {
            const eventId = `event-${event.id || index}`;

            elements.push({
                data: {
                    id: eventId,
                    label: event.eventType || 'Security event',
                    type: 'event'
                }
            });

            edges.push({
                data: {
                    id: `edge-event-${index}`,
                    source: `incident-${currentIncident.id}`,
                    target: eventId,
                    label: 'EVIDENCE'
                }
            });
        });

        cy = window.cytoscape({
            container,

            elements: [...elements, ...edges],

            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'background-color': '#087F7C',
                        'color': '#F8FAFC',
                        'font-size': '10px',
                        'text-wrap': 'wrap',
                        'text-max-width': 100,
                        'text-valign': 'bottom',
                        'text-halign': 'center',
                        'text-margin-y': 8,
                        'width': 40,
                        'height': 40,
                        'border-width': 2,
                        'border-color': '#DFE8EC'
                    }
                },
                {
                    selector: 'node[type="incident"]',
                    style: {
                        'background-color': '#EF4444',
                        'width': 55,
                        'height': 55
                    }
                },
                {
                    selector: 'node[type="alert"]',
                    style: {
                        'background-color': '#F97316'
                    }
                },
                {
                    selector: 'node[type="event"]',
                    style: {
                        'background-color': '#087F7C'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#64748B',
                        'target-arrow-color': '#64748B',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'label': 'data(label)',
                        'font-size': '8px',
                        'color': '#CBD5E1'
                    }
                }
            ],

            layout: {
                name: 'cose',
                animate: true,
                padding: 30
            }
        });
    }

    // =========================================================
    // GRAPH LAYOUT
    // =========================================================

    function changeGraphLayout(name) {
        if (!cy) return;

        cy.layout({
            name,
            animate: true,
            padding: 30
        }).run();
    }

    // =========================================================
    // NOTEBOOK
    // =========================================================

    function notebookStorageKey() {
        return `nova_investigation_notebook_${getIncidentId()}`;
    }

    function loadNotebook() {
        notebook.facts = Array.isArray(
            currentInvestigation.factsNotebook
        )
            ? currentInvestigation.factsNotebook
            : [];

        notebook.inferences = Array.isArray(
            currentInvestigation.inferencesNotebook
        )
            ? currentInvestigation.inferencesNotebook
            : [];

        notebook.pending = Array.isArray(
            currentInvestigation.pendingNotebook
        )
            ? currentInvestigation.pendingNotebook
            : [];

        try {
            const saved = localStorage.getItem(
                notebookStorageKey()
            );

            if (!saved) return;

            const local = JSON.parse(saved);

            for (const key of Object.keys(notebook)) {
                if (Array.isArray(local[key])) {
                    notebook[key] = local[key];
                }
            }

        } catch (error) {
            console.error('Notebook loading error:', error);
        }
    }

    function saveNotebook() {
        try {
            localStorage.setItem(
                notebookStorageKey(),
                JSON.stringify(notebook)
            );
        } catch (error) {
            console.error('Notebook saving error:', error);
        }
    }

    function renderNotebookList(element, entries, type) {
        if (!element) return;

        element.innerHTML = '';

        if (!entries.length) {
            element.innerHTML = `
                <li class="text-muted small">
                    ${translate('noNotebookEntries', 'No entries yet.')}
                </li>
            `;
            return;
        }

        entries.forEach((entry, index) => {
            const li = document.createElement('li');

            li.className =
                'mb-2 d-flex justify-content-between align-items-start gap-2';

            li.innerHTML = `
                <span class="text-break">${escapeHTML(entry)}</span>

                <button type="button"
                        class="btn btn-sm btn-link text-danger p-0"
                        data-notebook-type="${type}"
                        data-notebook-index="${index}">
                    <i class="bi bi-trash"></i>
                </button>
            `;

            element.appendChild(li);
        });
    }

    function renderNotebook() {
        renderNotebookList(
            getElement('list-facts'),
            notebook.facts,
            'facts'
        );

        renderNotebookList(
            getElement('list-inferences'),
            notebook.inferences,
            'inferences'
        );

        renderNotebookList(
            getElement('list-pending'),
            notebook.pending,
            'pending'
        );
    }

    function addNotebookEntry(type) {
        const types = {
            fact: 'facts',
            inference: 'inferences',
            pending: 'pending'
        };

        const target = types[type];

        if (!target) return;

        const prompts = {
            fact: 'Enter an observed fact:',
            inference: 'Enter an inference:',
            pending: 'Enter a pending action:'
        };

        const value = window.prompt(
            translate(type, prompts[type])
        );

        if (!value?.trim()) return;

        notebook[target].push(value.trim());

        saveNotebook();
        renderNotebook();
    }

    // =========================================================
    // VERDICT
    // =========================================================

    async function submitVerdict(event) {
        event.preventDefault();

        const investigationId = getInvestigationId();

        if (!investigationId) {
            showMessage(
                getElement('verdictStatus'),
                'Investigation ID is missing.',
                'danger'
            );
            return;
        }

        const verdict = getElement('verdict-decision')?.value;

        const confidenceScore = Number(
            getElement('verdict-confidence')?.value
        );

        const recommendedAction = getElement(
            'verdict-required-action'
        )?.value.trim();

        const validVerdicts = [
            'TRUE_POSITIVE_CONFIRMED',
            'TRUE_POSITIVE_MITIGATED',
            'FALSE_POSITIVE',
            'INCONCLUSIVE'
        ];

        if (!validVerdicts.includes(verdict)) {
            showMessage(
                getElement('verdictStatus'),
                'Select a valid verdict.',
                'warning'
            );
            return;
        }

        if (
            !Number.isInteger(confidenceScore) ||
            confidenceScore < 0 ||
            confidenceScore > 100
        ) {
            showMessage(
                getElement('verdictStatus'),
                'Confidence must be between 0 and 100.',
                'warning'
            );
            return;
        }

        if (!recommendedAction) {
            showMessage(
                getElement('verdictStatus'),
                'Recommended action is required.',
                'warning'
            );
            return;
        }

        const payload = {
            verdict,
            confidenceScore,
            recommendedAction
        };

        const button = getElement('btn-submit-verdict');

        if (button) button.disabled = true;

        hideMessage(getElement('verdictStatus'));

        try {
            const response = await HttpClient.post(
                ENDPOINTS.INVESTIGATIONS.SUBMIT_VERDICT(
                    investigationId
                ),
                payload
            );

            if (!response?.data?.id) {
                throw new Error('Invalid verdict response.');
            }

            currentInvestigation = response.data;
            currentIncident =
                response.data.incident || currentIncident;

            renderInvestigation();

            showMessage(
                getElement('verdictStatus'),
                'Verdict submitted successfully.',
                'success'
            );

        } catch (error) {
            console.error('Verdict submission error:', error);

            showMessage(
                getElement('verdictStatus'),
                error.message || 'Could not submit verdict.',
                'danger'
            );

        } finally {
            if (button) button.disabled = false;
        }
    }

    // =========================================================
    // REPORT
    // =========================================================

    async function generateIncidentReport() {
        const incidentId = getIncidentId();

        if (!incidentId) {
            window.alert('No incident selected.');
            return;
        }

        const button = getElement(
            'btn-generate-investigation-report'
        );

        if (button) button.disabled = true;

        try {
            const response = await HttpClient.post(
                ENDPOINTS.REPORTS.GENERATE,
                {
                    type: 'Incident Summary',
                    format: 'PDF',
                    incidentId
                }
            );

            if (!response?.data) {
                throw new Error('Invalid report response.');
            }

            window.alert('Report request completed successfully.');

        } catch (error) {
            console.error('Report generation error:', error);

            window.alert(
                error.message || 'Could not generate report.'
            );

        } finally {
            if (button) button.disabled = false;
        }
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================

    document.addEventListener('click', event => {
        if (event.target.closest('#btn-layout-cose')) {
            changeGraphLayout('cose');
        }

        if (event.target.closest('#btn-layout-grid')) {
            changeGraphLayout('grid');
        }

        const addButton = event.target.closest('[data-add-notebook]');

        if (addButton) {
            addNotebookEntry(addButton.dataset.addNotebook);
        }

        const deleteButton = event.target.closest(
            '[data-notebook-type]'
        );

        if (deleteButton) {
            const type = deleteButton.dataset.notebookType;
            const index = Number(deleteButton.dataset.notebookIndex);

            if (!Array.isArray(notebook[type])) return;
            if (!Number.isInteger(index) || index < 0) return;

            notebook[type].splice(index, 1);

            saveNotebook();
            renderNotebook();
        }
    });

    getElement('verdictForm')
        ?.addEventListener('submit', submitVerdict);

    getElement('verdict-confidence')
        ?.addEventListener('input', event => {
            setText(
                getElement('confidence-val'),
                `${event.target.value}%`
            );
        });

    getElement('btn-generate-investigation-report')
        ?.addEventListener('click', generateIncidentReport);

    document.addEventListener(
        'nova:languageChanged',
        () => {
            renderInvestigation();
            renderTimeline();
            renderEvidenceSummary();
            renderNotebook();
        }
    );

    // =========================================================
    // PUBLIC API
    // =========================================================

    window.loadInvestigation = loadInvestigation;
    window.renderInvestigation = renderInvestigation;
    window.renderInvestigationTimeline = renderTimeline;
    window.renderInvestigationGraph = renderGraph;
    window.addNotebookEntry = addNotebookEntry;

    // =========================================================
    // INITIALIZATION
    // =========================================================

    loadInvestigation();

})();
