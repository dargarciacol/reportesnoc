
(function () {
    'use strict';

    // =========================================================
    // PREVENIR MÓDULOS DUPLICADOS
    // =========================================================

    if (typeof window.destroyCurrentModule === 'function') {
        window.destroyCurrentModule();
    }

    // =========================================================
    // ESTADO
    // =========================================================

    let currentInvestigation = null;
    let currentIncident = null;

    // No existen endpoints REST confirmados para estas colecciones.
    let currentEvents = [];
    let currentAlerts = [];

    let investigationAnalysis = null;

    let cy = null;
    let isLoading = false;
    let reloadRequested = false;
    let isSubmittingVerdict = false;
    let isGeneratingReport = false;
    let isActive = true;
    let requestVersion = 0;

    const notebook = {
        facts: [],
        inferences: [],
        pending: []
    };

    const previousGlobals = {
        loadInvestigation: window.loadInvestigation,
        renderInvestigation: window.renderInvestigation,
        renderInvestigationTimeline:
            window.renderInvestigationTimeline,
        renderInvestigationGraph:
            window.renderInvestigationGraph,
        addNotebookEntry: window.addNotebookEntry,
        getInvestigationAnalysis:
            window.getInvestigationAnalysis,
        destroyCurrentModule: window.destroyCurrentModule
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
            "'": '&#39;'
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

    function getIncidentId() {
        return sessionStorage.getItem(
            'nova_selected_incident_id'
        );
    }

    function getInvestigationId() {
        return currentInvestigation?.id || null;
    }

    // =========================================================
    // API HELPERS
    // =========================================================

    async function getApiData(url) {
        const response = await window.HttpClient.get(url);

        if (!response || response.data === undefined) {
            throw new Error('Invalid API response.');
        }

        return response.data;
    }

    // =========================================================
    // NORMALIZACIÓN
    // =========================================================

    function normalizeIncident(incident) {
        if (!incident || !incident.id) {
            return null;
        }

        return {
            ...incident,
            id: String(incident.id),
            severity: normalize(incident.severity),
            status: normalize(incident.status),
            assignedTo: incident.assignedTo || null
        };
    }

    // =========================================================
    // ANÁLISIS DE LA INVESTIGACIÓN
    // =========================================================

    function analyzeInvestigation() {
        if (!currentInvestigation) {
            investigationAnalysis = null;
            return null;
        }

        const investigation = currentInvestigation;
        const incident = currentIncident || {};

        const verdict = normalize(investigation.verdict);
        const confidence = Number(investigation.confidenceScore);

        const hasVerdict = Boolean(verdict);
        const hasConfidence =
            investigation.confidenceScore !== null &&
            investigation.confidenceScore !== undefined &&
            Number.isFinite(confidence);

        const hasRecommendedAction = Boolean(
            String(investigation.recommendedAction || '').trim()
        );

        const pendingNotebookEntries = notebook.pending.length;

        const analysis = {
            investigationId: investigation.id,
            incidentId: incident.id || investigation.incidentId || getIncidentId(),

            incidentSeverity: normalize(incident.severity) || null,
            incidentStatus: normalize(incident.status) || null,

            verdict: verdict || null,
            hasVerdict,

            confidenceScore: hasConfidence ? confidence : null,

            confidenceLevel: !hasConfidence
                ? 'NOT_SET'
                : confidence >= 80
                    ? 'HIGH'
                    : confidence >= 50
                        ? 'MEDIUM'
                        : 'LOW',

            recommendedAction: hasRecommendedAction
                ? investigation.recommendedAction
                : null,

            hasRecommendedAction,

            notebook: {
                facts: notebook.facts.length,
                inferences: notebook.inferences.length,
                pending: pendingNotebookEntries,
                total:
                    notebook.facts.length +
                    notebook.inferences.length +
                    pendingNotebookEntries
            },

            evidence: {
                relatedEvents: currentEvents.length,
                relatedAlerts: currentAlerts.length,
                available: currentEvents.length > 0 ||
                    currentAlerts.length > 0
            },

            completeness: {
                verdict: hasVerdict,
                confidence: hasConfidence,
                recommendedAction: hasRecommendedAction
            },

            analyzedAt: new Date().toISOString()
        };

        analysis.completedSections = Object.values(
            analysis.completeness
        ).filter(Boolean).length;

        analysis.totalSections = Object.keys(
            analysis.completeness
        ).length;

        analysis.completionPercentage = Math.round(
            (
                analysis.completedSections /
                analysis.totalSections
            ) * 100
        );

        investigationAnalysis = analysis;

        window.investigationAnalysis = analysis;

        document.dispatchEvent(
            new CustomEvent('nova:investigation-analyzed', {
                detail: analysis
            })
        );

        return analysis;
    }

    // =========================================================
    // LOAD INVESTIGATION
    // =========================================================

    async function loadInvestigation() {
        if (!isActive) return;

        if (isLoading) {
            reloadRequested = true;
            return;
        }

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

        if (!window.HttpClient || !window.ENDPOINTS) {
            console.error(
                'Investigations: HttpClient or ENDPOINTS not available.'
            );
            return;
        }

        isLoading = true;

        const currentRequest = ++requestVersion;

        try {
            // ENDPOINTS ya realiza la codificación del identificador.
            // No debemos aplicar encodeURIComponent dos veces.
            const investigation = await getApiData(
                window.ENDPOINTS.INVESTIGATIONS.BY_INCIDENT(
                    incidentId
                )
            );

            if (!isActive || currentRequest !== requestVersion) {
                return;
            }

            if (!investigation?.id) {
                throw new Error(
                    'Investigation not found for this incident.'
                );
            }

            currentInvestigation = investigation;

            // La investigación puede incluir el incidente asociado.
            currentIncident = normalizeIncident(
                investigation.incident
            );

            // No hay endpoints confirmados para recuperar
            // eventos y alertas relacionados.
            currentEvents = [];
            currentAlerts = [];

            renderInvestigation();

            loadNotebook();

            analyzeInvestigation();

            renderNotebook();
            renderTimeline();
            renderEvidenceSummary();
            renderGraph();

        } catch (error) {
            if (!isActive || currentRequest !== requestVersion) {
                return;
            }

            console.error('Investigation loading error:', error);

            showMessage(
                getElement('cy-container'),
                error.message || 'Could not load investigation.',
                'danger'
            );

        } finally {
            if (currentRequest === requestVersion) {
                isLoading = false;

                if (isActive && reloadRequested) {
                    reloadRequested = false;
                    loadInvestigation();
                }
            }
        }
    }

    // =========================================================
    // INCIDENT INFORMATION
    // =========================================================

    function renderInvestigation() {
        if (!currentInvestigation) return;

        const incident = currentIncident || {};

        setText(
            getElement('investigation-incident-id'),
            incident.id ||
                currentInvestigation.incidentId ||
                getIncidentId()
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
                ? translate(
                    normalize(currentInvestigation.verdict).toLowerCase(),
                    currentInvestigation.verdict
                )
                : '--'
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

        const confidenceInput = getElement('verdict-confidence');

        if (
            confidenceInput &&
            currentInvestigation.confidenceScore != null
        ) {
            confidenceInput.value =
                currentInvestigation.confidenceScore;

            setText(
                getElement('confidence-val'),
                `${currentInvestigation.confidenceScore}%`
            );
        }

        const verdictInput = getElement('verdict-decision');

        if (verdictInput && currentInvestigation.verdict) {
            verdictInput.value = currentInvestigation.verdict;
        }

        const actionInput = getElement('verdict-required-action');

        if (actionInput && currentInvestigation.recommendedAction) {
            actionInput.value =
                currentInvestigation.recommendedAction;
        }
    }

    // =========================================================
    // RELATED EVIDENCE
    // =========================================================

    function renderRelatedEvidenceUnavailable() {
        const container = getElement('evidence-summary');

        if (!container) return;

        const analysis = investigationAnalysis;

        container.innerHTML = `
            <div class="row g-3">

                <div class="col-6 col-lg-3">
                    <div class="card bg-surface border-panel p-3 h-100">
                        <div class="text-muted small">
                            ${translate('investigationProgress', 'Investigation completeness')}
                        </div>

                        <div class="fs-3 fw-bold">
                            ${analysis?.completionPercentage ?? 0}%
                        </div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card bg-surface border-panel p-3 h-100">
                        <div class="text-muted small">
                            ${translate('verdictStatus', 'Verdict')}
                        </div>

                        <div class="fs-6 fw-bold">
                            ${analysis?.hasVerdict
                                ? escapeHTML(analysis.verdict)
                                : translate('pending', 'Pending')}
                        </div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card bg-surface border-panel p-3 h-100">
                        <div class="text-muted small">
                            ${translate('confidence', 'Confidence')}
                        </div>

                        <div class="fs-3 fw-bold">
                            ${analysis?.confidenceScore != null
                                ? `${analysis.confidenceScore}%`
                                : '--'}
                        </div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card bg-surface border-panel p-3 h-100">
                        <div class="text-muted small">
                            ${translate('pendingActions', 'Pending actions')}
                        </div>

                        <div class="fs-3 fw-bold">
                            ${analysis?.notebook.pending ?? 0}
                        </div>
                    </div>
                </div>

            </div>

            <div class="alert alert-secondary mt-3" role="status">
                <i class="bi bi-info-circle me-2"></i>

                ${translate(
                    'evidenceEndpointUnavailable',
                    'Related events and alerts are not currently exposed through the investigation API.'
                )}
            </div>
        `;
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
            findings.push(
                'Authentication or operation failure indicator'
            );
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
        if (!currentEvents.length && !currentAlerts.length) {
            renderRelatedEvidenceUnavailable();
            return;
        }

        const container = getElement('evidence-summary');

        if (!container) return;

        const critical = currentEvents.filter(
            event => normalize(event.severity) === 'CRITICAL'
        ).length;

        const high = currentEvents.filter(
            event => normalize(event.severity) === 'HIGH'
        ).length;

        const findings = currentEvents.reduce(
            (total, event) =>
                total + analyzeEvidence(event).length,
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
                    <td colspan="5"
                        class="text-center text-muted py-4">
                        ${translate(
                            'noEvidenceAvailable',
                            'No related event evidence is available through the current API.'
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

        if (cy) {
            cy.destroy();
            cy = null;
        }

        // Evita duplicar el mensaje al volver a renderizar el gráfico.
        getElement('investigation-graph-message')?.remove();

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

        // Solo se representa el incidente recuperado del backend.
        // No se inventan relaciones con alertas o eventos.

        const incidentId = `incident-${currentIncident.id}`;

        cy = window.cytoscape({
            container,

            elements: [
                {
                    data: {
                        id: incidentId,
                        label: currentIncident.title || 'Incident',
                        type: 'incident'
                    }
                }
            ],

            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'background-color': '#EF4444',
                        'color': '#F8FAFC',
                        'font-size': '11px',
                        'text-wrap': 'wrap',
                        'text-max-width': 120,
                        'text-valign': 'bottom',
                        'text-halign': 'center',
                        'text-margin-y': 10,
                        'width': 55,
                        'height': 55,
                        'border-width': 2,
                        'border-color': '#DFE8EC'
                    }
                }
            ],

            layout: {
                name: 'grid',
                animate: true,
                padding: 30
            }
        });

        const graphMessage = document.createElement('div');

        graphMessage.id = 'investigation-graph-message';
        graphMessage.className =
            'text-center text-muted small mt-2';

        graphMessage.textContent = translate(
            'graphRelationshipsUnavailable',
            'Related alert and event relationships are not available through the current API.'
        );

        container.parentElement?.appendChild(graphMessage);
    }

    // =========================================================
    // GRAPH LAYOUT
    // =========================================================

    function changeGraphLayout(name) {
        if (!cy) return;

        const supportedLayouts = ['cose', 'grid'];

        if (!supportedLayouts.includes(name)) return;

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
        const incidentId = getIncidentId();

        return incidentId
            ? `nova_investigation_notebook_${incidentId}`
            : null;
    }

    function loadNotebook() {
        if (!currentInvestigation) return;

        notebook.facts = Array.isArray(
            currentInvestigation.factsNotebook
        )
            ? [...currentInvestigation.factsNotebook]
            : [];

        notebook.inferences = Array.isArray(
            currentInvestigation.inferencesNotebook
        )
            ? [...currentInvestigation.inferencesNotebook]
            : [];

        notebook.pending = Array.isArray(
            currentInvestigation.pendingNotebook
        )
            ? [...currentInvestigation.pendingNotebook]
            : [];

        try {
            const key = notebookStorageKey();

            if (!key) return;

            const saved = localStorage.getItem(key);

            if (!saved) return;

            const local = JSON.parse(saved);

            for (const property of Object.keys(notebook)) {
                if (Array.isArray(local[property])) {
                    notebook[property] = local[property];
                }
            }

        } catch (error) {
            console.error('Notebook loading error:', error);
        }
    }

    function saveNotebook() {
        try {
            const key = notebookStorageKey();

            if (!key) return;

            localStorage.setItem(
                key,
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
            const empty = document.createElement('li');

            empty.className = 'text-muted small';
            empty.textContent = translate(
                'noNotebookEntries',
                'No entries yet.'
            );

            element.appendChild(empty);
            return;
        }

        entries.forEach((entry, index) => {
            const li = document.createElement('li');

            li.className =
                'mb-2 d-flex justify-content-between align-items-start gap-2';

            const content = document.createElement('span');

            content.className = 'text-break';
            content.textContent = entry;

            const button = document.createElement('button');

            button.type = 'button';
            button.className =
                'btn btn-sm btn-link text-danger p-0';

            button.dataset.notebookType = type;
            button.dataset.notebookIndex = String(index);
            button.setAttribute(
                'aria-label',
                translate('deleteEntry', 'Delete entry')
            );

            button.innerHTML = '<i class="bi bi-trash"></i>';

            li.append(content, button);
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

        if (!target || !currentInvestigation) return;

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
        analyzeInvestigation();
        renderNotebook();
        renderEvidenceSummary();
    }

    // =========================================================
    // VERDICT
    // =========================================================

    async function submitVerdict(event) {
        event.preventDefault();

        if (!isActive || isSubmittingVerdict) return;

        const investigationId = getInvestigationId();

        if (!investigationId) {
            showMessage(
                getElement('verdictStatus'),
                'Investigation ID is missing.',
                'danger'
            );
            return;
        }

        const verdict =
            getElement('verdict-decision')?.value;

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

        // Contrato exacto del backend.
        const payload = {
            verdict,
            confidenceScore,
            recommendedAction
        };

        const button = getElement('btn-submit-verdict');

        isSubmittingVerdict = true;

        if (button) button.disabled = true;

        hideMessage(getElement('verdictStatus'));

        try {
            const response = await window.HttpClient.post(
                window.ENDPOINTS.INVESTIGATIONS.SUBMIT_VERDICT(
                    investigationId
                ),
                payload
            );

            if (!isActive) return;

            if (!response?.data?.id) {
                throw new Error('Invalid verdict response.');
            }

            currentInvestigation = response.data;

            currentIncident =
                normalizeIncident(response.data.incident) ||
                currentIncident;

            renderInvestigation();

            loadNotebook();
            analyzeInvestigation();
            renderNotebook();
            renderEvidenceSummary();

            showMessage(
                getElement('verdictStatus'),
                'Verdict submitted successfully.',
                'success'
            );

            document.dispatchEvent(
                new CustomEvent('nova:data-updated', {
                    detail: {
                        source: 'investigations',
                        action: 'verdict-submitted',
                        investigationId
                    }
                })
            );

        } catch (error) {
            if (!isActive) return;

            console.error('Verdict submission error:', error);

            showMessage(
                getElement('verdictStatus'),
                error.message || 'Could not submit verdict.',
                'danger'
            );

        } finally {
            isSubmittingVerdict = false;

            if (button && isActive) {
                button.disabled = false;
            }
        }
    }

    // =========================================================
    // REPORT
    // =========================================================

    async function generateIncidentReport() {
        if (!isActive || isGeneratingReport) return;

        const incidentId = getIncidentId();

        if (!incidentId) {
            window.alert('No incident selected.');
            return;
        }

        const button = getElement(
            'btn-generate-investigation-report'
        );

        isGeneratingReport = true;

        if (button) button.disabled = true;

        try {
            const response = await window.HttpClient.post(
                window.ENDPOINTS.REPORTS.GENERATE,
                {
                    type: 'Incident Summary',
                    format: 'PDF',
                    incidentId
                }
            );

            if (!isActive) return;

            if (!response?.data) {
                throw new Error('Invalid report response.');
            }

            window.alert(
                'Report request completed successfully.'
            );

        } catch (error) {
            if (!isActive) return;

            console.error('Report generation error:', error);

            window.alert(
                error.message || 'Could not generate report.'
            );

        } finally {
            isGeneratingReport = false;

            if (button && isActive) {
                button.disabled = false;
            }
        }
    }

    // =========================================================
    // EVENT HANDLERS
    // =========================================================

    function handleClick(event) {
        if (event.target.closest('#btn-layout-cose')) {
            changeGraphLayout('cose');
            return;
        }

        if (event.target.closest('#btn-layout-grid')) {
            changeGraphLayout('grid');
            return;
        }

        const addButton = event.target.closest(
            '[data-add-notebook]'
        );

        if (addButton) {
            addNotebookEntry(addButton.dataset.addNotebook);
            return;
        }

        const deleteButton = event.target.closest(
            '[data-notebook-type]'
        );

        if (deleteButton) {
            const type = deleteButton.dataset.notebookType;
            const index = Number(
                deleteButton.dataset.notebookIndex
            );

            if (!Array.isArray(notebook[type])) return;

            if (
                !Number.isInteger(index) ||
                index < 0 ||
                index >= notebook[type].length
            ) {
                return;
            }

            notebook[type].splice(index, 1);

            saveNotebook();
            analyzeInvestigation();
            renderNotebook();
            renderEvidenceSummary();
        }
    }

    function handleConfidenceInput(event) {
        setText(
            getElement('confidence-val'),
            `${event.target.value}%`
        );
    }

    function handleLanguageChanged() {
        renderInvestigation();
        renderTimeline();
        renderEvidenceSummary();
        renderNotebook();
        renderGraph();
    }

    function handleDataUpdated(event) {
        const source = event.detail?.source;

        const relevantSources = [
            'ingestion',
            'events',
            'alerts',
            'incidents',
            'detection'
        ];

        if (!relevantSources.includes(source)) return;

        loadInvestigation();
    }

    // =========================================================
    // EVENT LISTENER REGISTRATION
    // =========================================================

    const verdictForm = getElement('verdictForm');
    const confidenceInput = getElement('verdict-confidence');
    const reportButton = getElement(
        'btn-generate-investigation-report'
    );

    document.addEventListener('click', handleClick);

    verdictForm?.addEventListener(
        'submit',
        submitVerdict
    );

    confidenceInput?.addEventListener(
        'input',
        handleConfidenceInput
    );

    reportButton?.addEventListener(
        'click',
        generateIncidentReport
    );

    document.addEventListener(
        'nova:languageChanged',
        handleLanguageChanged
    );

    document.addEventListener(
        'nova:data-updated',
        handleDataUpdated
    );

    // =========================================================
    // PUBLIC API
    // =========================================================

    window.loadInvestigation = loadInvestigation;
    window.renderInvestigation = renderInvestigation;
    window.renderInvestigationTimeline = renderTimeline;
    window.renderInvestigationGraph = renderGraph;
    window.addNotebookEntry = addNotebookEntry;

    window.getInvestigationAnalysis = function () {
        return investigationAnalysis;
    };

    // =========================================================
    // CLEANUP
    // =========================================================

    function cleanup() {
        if (!isActive) return;

        isActive = false;
        requestVersion++;
        reloadRequested = false;

        document.removeEventListener('click', handleClick);

        verdictForm?.removeEventListener(
            'submit',
            submitVerdict
        );

        confidenceInput?.removeEventListener(
            'input',
            handleConfidenceInput
        );

        reportButton?.removeEventListener(
            'click',
            generateIncidentReport
        );

        document.removeEventListener(
            'nova:languageChanged',
            handleLanguageChanged
        );

        document.removeEventListener(
            'nova:data-updated',
            handleDataUpdated
        );

        if (cy) {
            cy.destroy();
            cy = null;
        }

        getElement('investigation-graph-message')?.remove();

        if (window.loadInvestigation === loadInvestigation) {
            window.loadInvestigation =
                previousGlobals.loadInvestigation;
        }

        if (window.renderInvestigation === renderInvestigation) {
            window.renderInvestigation =
                previousGlobals.renderInvestigation;
        }

        if (
            window.renderInvestigationTimeline === renderTimeline
        ) {
            window.renderInvestigationTimeline =
                previousGlobals.renderInvestigationTimeline;
        }

        if (window.renderInvestigationGraph === renderGraph) {
            window.renderInvestigationGraph =
                previousGlobals.renderInvestigationGraph;
        }

        if (window.addNotebookEntry === addNotebookEntry) {
            window.addNotebookEntry =
                previousGlobals.addNotebookEntry;
        }

        if (
            window.getInvestigationAnalysis &&
            typeof window.getInvestigationAnalysis === 'function'
        ) {
            window.getInvestigationAnalysis =
                previousGlobals.getInvestigationAnalysis;
        }

        if (window.destroyCurrentModule === cleanup) {
            window.destroyCurrentModule =
                previousGlobals.destroyCurrentModule;
        }

        if (window.investigationAnalysis === investigationAnalysis) {
            delete window.investigationAnalysis;
        }

        currentInvestigation = null;
        currentIncident = null;
        currentEvents = [];
        currentAlerts = [];
        investigationAnalysis = null;
    }

    window.destroyCurrentModule = cleanup;

    // =========================================================
    // INITIALIZATION
    // =========================================================

    loadInvestigation();

})();
