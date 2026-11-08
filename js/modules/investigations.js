
(function () {
    'use strict';

    // =========================================================
    // DOM
    // =========================================================

    const incidentIdElement = document.getElementById('investigation-incident-id');
    const incidentTitleElement = document.getElementById('investigation-incident-title');
    const openedAtElement = document.getElementById('investigation-opened-at');
    const leadElement = document.getElementById('investigation-lead');

    const timelineBody = document.getElementById('timeline-body');
    const factsList = document.getElementById('list-facts');
    const inferencesList = document.getElementById('list-inferences');
    const pendingList = document.getElementById('list-pending');

    const verdictForm = document.getElementById('verdictForm');
    const verdictDecision = document.getElementById('verdict-decision');
    const verdictConfidence = document.getElementById('verdict-confidence');
    const confidenceValue = document.getElementById('confidence-val');
    const requiredAction = document.getElementById('verdict-required-action');
    const verdictStatus = document.getElementById('verdictStatus');
    const submitVerdictButton = document.getElementById('btn-submit-verdict');

    const graphContainer = document.getElementById('cy-container');

    const generateReportButton = document.getElementById(
        'btn-generate-investigation-report'
    );

    // =========================================================
    // STATE
    // =========================================================

    const incidentId = sessionStorage.getItem('nova_selected_incident_id');

    let currentInvestigation = null;
    let currentIncident = null;
    let cy = null;

    const notebook = {
        facts: [],
        inferences: [],
        pending: []
    };

    // =========================================================
    // HELPERS
    // =========================================================

    function translate(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback)
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

    function formatDate(value) {
        if (!value) return '--';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        const language = typeof window.getCurrentLanguage === 'function'
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

    function getInvestigationId() {
        return currentInvestigation?.id || null;
    }

    function notebookStorageKey() {
        return `nova_investigation_notebook_${incidentId}`;
    }

    // =========================================================
    // LOAD INVESTIGATION
    // =========================================================

    async function loadInvestigation() {
        if (!incidentId) {
            showMessage(
                graphContainer,
                translate(
                    'noIncidentSelected',
                    'No incident selected. Return to Incidents and open an investigation.'
                ),
                'warning'
            );

            return;
        }

        try {
            const response = await HttpClient.get(
                ENDPOINTS.INVESTIGATIONS.BY_INCIDENT(incidentId)
            );

            const investigation = response?.data;

            if (!investigation?.id) {
                throw new Error('Invalid investigation response.');
            }

            currentInvestigation = investigation;
            currentIncident = investigation.incident || null;

            renderInvestigation();
            loadNotebook();
            renderNotebook();
            renderTimeline();
            renderGraph();

        } catch (error) {
            console.error('Investigation loading error:', error);

            showMessage(
                graphContainer,
                error.message || translate(
                    'investigationLoadError',
                    'Could not load investigation.'
                ),
                'danger'
            );
        }
    }

    // =========================================================
    // INCIDENT INFORMATION
    // =========================================================

    function renderInvestigation() {
        const incident = currentIncident || {};

        setText(
            incidentIdElement,
            incident.id || incidentId
        );

        setText(
            incidentTitleElement,
            incident.title,
            translate('untitledIncident', 'Untitled incident')
        );

        setText(
            openedAtElement,
            formatDate(
                currentInvestigation.createdAt ||
                incident.createdAt
            )
        );

        setText(
            leadElement,
            incident.assignedTo,
            '--'
        );

        // Display saved verdict information if available.
        if (currentInvestigation.verdict) {
            setText(
                document.getElementById('investigation-verdict'),
                currentInvestigation.verdict
            );
        }

        if (currentInvestigation.confidenceScore != null) {
            setText(
                document.getElementById('investigation-confidence'),
                `${currentInvestigation.confidenceScore}%`
            );
        }

        if (currentInvestigation.recommendedAction) {
            setText(
                document.getElementById('investigation-recommended-action'),
                currentInvestigation.recommendedAction
            );
        }
    }

    // =========================================================
    // TIMELINE
    // =========================================================

    function renderTimeline() {
        if (!timelineBody) return;

        timelineBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-4">
                    ${translate(
                        'timelineUnavailable',
                        'Timeline endpoint is not available in the backend yet.'
                    )}
                </td>
            </tr>
        `;
    }

    // =========================================================
    // GRAPH
    // =========================================================

    function renderGraph() {
        if (!graphContainer) return;

        const incident = currentIncident;

        if (!incident?.id || !currentInvestigation?.id) {
            graphContainer.innerHTML = `
                <div class="text-center text-muted p-4">
                    ${translate(
                        'noGraphData',
                        'Relationship data is not available.'
                    )}
                </div>
            `;
            return;
        }

        if (typeof cytoscape !== 'function') {
            graphContainer.innerHTML = `
                <div class="text-center text-muted p-4">
                    Cytoscape.js is not loaded.
                </div>
            `;
            return;
        }

        if (cy) {
            cy.destroy();
            cy = null;
        }

        /*
         * These are the two relationships directly established
         * by the actual entity relationship:
         * Incident -> Investigation.
         *
         * This is not a threat intelligence graph.
         */

        graphContainer.innerHTML = '';

        cy = cytoscape({
            container: graphContainer,

            elements: [
                {
                    data: {
                        id: incident.id,
                        label: incident.title || 'Incident'
                    }
                },
                {
                    data: {
                        id: currentInvestigation.id,
                        label: 'Investigation Workspace'
                    }
                },
                {
                    data: {
                        id: 'incident-investigation',
                        source: incident.id,
                        target: currentInvestigation.id,
                        label: 'HAS_WORKSPACE'
                    }
                }
            ],

            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(label)',
                        'background-color': '#087F7C',
                        'color': '#F8FAFC',
                        'font-size': '11px',
                        'text-valign': 'bottom',
                        'text-halign': 'center',
                        'text-margin-y': 8,
                        'width': 45,
                        'height': 45,
                        'border-width': 2,
                        'border-color': '#DFE8EC'
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
                        'font-size': '9px',
                        'color': '#CBD5E1'
                    }
                }
            ],

            layout: {
                name: 'grid',
                animate: true,
                padding: 30
            }
        });
    }

    document.getElementById('btn-layout-cose')
        ?.addEventListener('click', () => {
            cy?.layout({
                name: 'cose',
                animate: true
            }).run();
        });

    document.getElementById('btn-layout-grid')
        ?.addEventListener('click', () => {
            cy?.layout({
                name: 'grid',
                animate: true
            }).run();
        });

    // =========================================================
    // NOTEBOOK
    // =========================================================

    function loadNotebook() {
        // First load the real values returned by the backend.
        notebook.facts = currentInvestigation.factsNotebook || [];
        notebook.inferences = currentInvestigation.inferencesNotebook || [];
        notebook.pending = currentInvestigation.pendingNotebook || [];

        // Then restore local edits made in this browser.
        try {
            const saved = localStorage.getItem(notebookStorageKey());

            if (saved) {
                const localNotebook = JSON.parse(saved);

                notebook.facts = Array.isArray(localNotebook.facts)
                    ? localNotebook.facts
                    : notebook.facts;

                notebook.inferences = Array.isArray(localNotebook.inferences)
                    ? localNotebook.inferences
                    : notebook.inferences;

                notebook.pending = Array.isArray(localNotebook.pending)
                    ? localNotebook.pending
                    : notebook.pending;
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

        if (entries.length === 0) {
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
                        data-notebook-index="${index}"
                        aria-label="${translate('deleteEntry', 'Delete entry')}">
                    <i class="bi bi-trash"></i>
                </button>
            `;

            element.appendChild(li);
        });
    }

    function renderNotebook() {
        renderNotebookList(factsList, notebook.facts, 'facts');
        renderNotebookList(inferencesList, notebook.inferences, 'inferences');
        renderNotebookList(pendingList, notebook.pending, 'pending');
    }

    window.addNotebookEntry = function (type) {
        const types = {
            fact: 'facts',
            inference: 'inferences',
            pending: 'pending'
        };

        const notebookType = types[type];

        if (!notebookType) return;

        const prompts = {
            fact: translate('enterFact', 'Enter an observed fact:'),
            inference: translate('enterInference', 'Enter an inference:'),
            pending: translate('enterPending', 'Enter a pending action:')
        };

        const value = window.prompt(prompts[type]);

        if (!value?.trim()) return;

        notebook[notebookType].push(value.trim());

        saveNotebook();
        renderNotebook();
    };

    document.addEventListener('click', event => {
        const button = event.target.closest('[data-notebook-type]');

        if (!button) return;

        const type = button.dataset.notebookType;
        const index = Number(button.dataset.notebookIndex);

        if (!Array.isArray(notebook[type])) return;
        if (!Number.isInteger(index) || index < 0) return;

        notebook[type].splice(index, 1);

        saveNotebook();
        renderNotebook();
    });

    // =========================================================
    // VERDICT
    // =========================================================

    if (verdictConfidence && confidenceValue) {
        verdictConfidence.addEventListener('input', () => {
            confidenceValue.textContent =
                `${verdictConfidence.value}%`;
        });
    }

    async function submitVerdict(event) {
        event.preventDefault();

        const investigationId = getInvestigationId();

        if (!investigationId) {
            showMessage(
                verdictStatus,
                'Investigation ID is missing.',
                'danger'
            );
            return;
        }

        const verdict = verdictDecision.value;
        const confidenceScore = Number(verdictConfidence.value);
        const recommendedAction = requiredAction?.value.trim();

        const validVerdicts = [
            'TRUE_POSITIVE_CONFIRMED',
            'TRUE_POSITIVE_MITIGATED',
            'FALSE_POSITIVE',
            'INCONCLUSIVE'
        ];

        if (!validVerdicts.includes(verdict)) {
            showMessage(
                verdictStatus,
                translate('invalidVerdict', 'Select a valid verdict.'),
                'warning'
            );
            return;
        }

        if (!Number.isInteger(confidenceScore) ||
            confidenceScore < 0 ||
            confidenceScore > 100) {
            showMessage(
                verdictStatus,
                translate('invalidConfidence', 'Confidence must be between 0 and 100.'),
                'warning'
            );
            return;
        }

        if (!recommendedAction) {
            showMessage(
                verdictStatus,
                translate('actionRequired', 'Recommended action is required.'),
                'warning'
            );
            return;
        }

        const payload = {
            verdict,
            confidenceScore,
            recommendedAction
        };

        submitVerdictButton.disabled = true;
        hideMessage(verdictStatus);

        try {
            const response = await HttpClient.post(
                ENDPOINTS.INVESTIGATIONS.SUBMIT_VERDICT(investigationId),
                payload
            );

            const updatedInvestigation = response?.data;

            if (!updatedInvestigation?.id) {
                throw new Error('Invalid verdict response.');
            }

            currentInvestigation = updatedInvestigation;
            currentIncident = updatedInvestigation.incident || currentIncident;

            renderInvestigation();

            showMessage(
                verdictStatus,
                translate(
                    'verdictSubmitted',
                    'Verdict submitted successfully.'
                ),
                'success'
            );

            const modalElement = document.getElementById('verdictModal');
            const modal = modalElement
                ? bootstrap.Modal.getInstance(modalElement)
                : null;

            modal?.hide();

        } catch (error) {
            console.error('Verdict submission error:', error);

            showMessage(
                verdictStatus,
                error.message || translate(
                    'verdictSubmitError',
                    'Could not submit verdict.'
                ),
                'danger'
            );

        } finally {
            submitVerdictButton.disabled = false;
        }
    }

    verdictForm?.addEventListener('submit', submitVerdict);

    // =========================================================
    // GENERATE INCIDENT REPORT
    // =========================================================

    async function generateIncidentReport() {
        if (!incidentId) {
            window.alert('No incident selected.');
            return;
        }

        generateReportButton.disabled = true;

        try {
            const response = await HttpClient.post(
                ENDPOINTS.REPORTS.GENERATE,
                {
                    type: 'Incident Summary',
                    format: 'PDF',
                    incidentId
                }
            );

            const report = response?.data;

            if (!report?.reportId) {
                throw new Error('Invalid report response.');
            }

            window.alert(
                `${translate('reportGenerated', 'Report generated')}: ${report.reportId}`
            );

        } catch (error) {
            console.error('Report generation error:', error);

            window.alert(
                error.message || 'Could not generate report.'
            );

        } finally {
            generateReportButton.disabled = false;
        }
    }

    generateReportButton?.addEventListener(
        'click',
        generateIncidentReport
    );

    // =========================================================
    // LANGUAGE
    // =========================================================

    document.addEventListener('nova:languageChanged', () => {
        renderNotebook();
        renderTimeline();

        if (cy) {
            cy.resize();
        }
    });

    // =========================================================
    // INITIALIZATION
    // =========================================================

    if (!incidentId) {
        console.warn(
            'No selected incident. Expected sessionStorage key: nova_selected_incident_id'
        );
    } else {
        loadInvestigation();
    }

})();
