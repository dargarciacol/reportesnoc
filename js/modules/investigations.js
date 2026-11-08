
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

    let currentGraph = null;
    let currentTimeline = [];

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

    // Recupera información básica del incidente desde el grafo.
    // GraphAnalysisService devuelve el nodo con group INCIDENT
    // y sus metadatos de severity y status.

    function recoverIncidentFromGraph(graph) {
        if (!graph || !Array.isArray(graph.nodes)) {
            return null;
        }

        const incidentNode = graph.nodes.find(
            node => normalize(node.group) === 'INCIDENT'
        );

        if (!incidentNode?.id) {
            return null;
        }

        const metadata = incidentNode.metadata || {};

        return normalizeIncident({
            id: incidentNode.id,
            title: incidentNode.label || 'Security incident',
            severity: metadata.severity,
            status: metadata.status
        });
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

            incidentId:
                incident.id ||
                investigation.incidentId ||
                getIncidentId(),

            incidentSeverity: normalize(incident.severity) || null,
            incidentStatus: normalize(incident.status) || null,

            verdict: verdict || null,
            hasVerdict,

            confidenceScore: hasConfidence
                ? confidence
                : null,

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

                available:
                    currentEvents.length > 0 ||
                    currentAlerts.length > 0
            },

            graph: {
                nodes: currentGraph?.nodes?.length || 0,
                edges: currentGraph?.edges?.length || 0
            },

            timeline: {
                entries: currentTimeline.length
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
            // La función del endpoint ya codifica el identificador.
            // No aplicar encodeURIComponent nuevamente.

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

            currentIncident = normalizeIncident(
                investigation.incident
            );

            currentEvents = [];
            currentAlerts = [];

            // =================================================
            // CARGA INDEPENDIENTE DEL GRAFO Y TIMELINE
            // =================================================

            currentGraph = null;
            currentTimeline = [];

            const graphUrl =
                window.ENDPOINTS.INVESTIGATIONS.GRAPH(
                    investigation.id
                );

            const timelineUrl =
                window.ENDPOINTS.INVESTIGATIONS.TIMELINE(
                    investigation.id
                );

            const [graphResult, timelineResult] =
                await Promise.allSettled([
                    getApiData(graphUrl),
                    getApiData(timelineUrl)
                ]);

            if (!isActive || currentRequest !== requestVersion) {
                return;
            }

            // ---------------------------------------------
            // RESULTADO DEL GRAFO
            // ---------------------------------------------

            if (graphResult.status === 'fulfilled') {
                const graphData = graphResult.value;

                if (Array.isArray(graphData?.nodes)) {
                    currentGraph = {
                        nodes: graphData.nodes,
                        edges: Array.isArray(graphData.edges)
                            ? graphData.edges
                            : []
                    };
                } else {
                    console.error(
                        'Investigations: invalid graph response.',
                        graphData
                    );
                }
            } else {
                console.error(
                    'Investigations: graph loading failed.',
                    graphResult.reason
                );
            }

            // Si la respuesta principal no incluyó el incidente,
            // recuperar sus datos básicos desde el nodo del grafo.

            if (!currentIncident && currentGraph) {
                currentIncident =
                    recoverIncidentFromGraph(currentGraph);
            }

            // ---------------------------------------------
            // RESULTADO DE LA LÍNEA DE TIEMPO
            // ---------------------------------------------

            if (timelineResult.status === 'fulfilled') {
                if (Array.isArray(timelineResult.value)) {
                    currentTimeline = timelineResult.value;
                } else {
                    console.error(
                        'Investigations: invalid timeline response.',
                        timelineResult.value
                    );
                }
            } else {
                console.error(
                    'Investigations: timeline loading failed.',
                    timelineResult.reason
                );
            }

            if (!isActive || currentRequest !== requestVersion) {
                return;
            }

            // =================================================
            // RENDERIZADO
            // =================================================

            loadNotebook();

            analyzeInvestigation();

            renderInvestigation();
            renderNotebook();
            renderTimeline();
            renderEvidenceSummary();
            renderGraph();

            refreshInvestigationRelated();

        } catch (error) {
            if (!isActive || currentRequest !== requestVersion) {
                return;
            }

            console.error(
                'Investigation loading error:',
                error
            );

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
                    normalize(
                        currentInvestigation.verdict
                    ).toLowerCase(),
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

        const confidenceInput = getElement(
            'verdict-confidence'
        );

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

        const verdictInput = getElement(
            'verdict-decision'
        );

        if (verdictInput && currentInvestigation.verdict) {
            verdictInput.value =
                currentInvestigation.verdict;
        }

        const actionInput = getElement(
            'verdict-required-action'
        );

        if (
            actionInput &&
            currentInvestigation.recommendedAction
        ) {
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
                            ${translate(
                                'investigationProgress',
                                'Investigation completeness'
                            )}
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
        const action = String(
            event.action || ''
        ).toLowerCase();

        const description = String(
            raw.event_description || event.eventType || ''
        ).toLowerCase();

        const findings = [];

        if (
            severity === 'CRITICAL' ||
            severity === 'HIGH'
        ) {
            findings.push(
                'High-priority security event'
            );
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
                .toLowerCase()
                .includes('powershell')
        ) {
            findings.push(
                'PowerShell execution indicator'
            );
        }

        if (
            description.includes('blocked') ||
            action.includes('blocked')
        ) {
            findings.push(
                'Blocking action recorded'
            );
        }

        return findings;
    }

    function renderEvidenceSummary() {
        if (
            !currentEvents.length &&
            !currentAlerts.length
        ) {
            renderRelatedEvidenceUnavailable();
            return;
        }

        const container = getElement('evidence-summary');

        if (!container) return;

        const critical = currentEvents.filter(
            event =>
                normalize(event.severity) === 'CRITICAL'
        ).length;

        const high = currentEvents.filter(
            event =>
                normalize(event.severity) === 'HIGH'
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
                        <div class="text-muted small">
                            Related events
                        </div>
                        <div class="fs-3 fw-bold">
                            ${currentEvents.length}
                        </div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card bg-surface border-panel p-3">
                        <div class="text-muted small">
                            Critical events
                        </div>
                        <div class="fs-3 fw-bold text-danger">
                            ${critical}
                        </div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card bg-surface border-panel p-3">
                        <div class="text-muted small">
                            High events
                        </div>
                        <div class="fs-3 fw-bold text-warning">
                            ${high}
                        </div>
                    </div>
                </div>

                <div class="col-6 col-lg-3">
                    <div class="card bg-surface border-panel p-3">
                        <div class="text-muted small">
                            Evidence indicators
                        </div>
                        <div class="fs-3 fw-bold">
                            ${findings}
                        </div>
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

        if (
            !Array.isArray(currentTimeline) ||
            !currentTimeline.length
        ) {
            timelineBody.innerHTML = `
                <tr>
                    <td colspan="4"
                        class="text-center text-muted py-4">
                        ${translate(
                            'noEvidenceAvailable',
                            'No hay actividad disponible en la línea de tiempo.'
                        )}
                    </td>
                </tr>
            `;
            return;
        }

        timelineBody.innerHTML = currentTimeline.map(item => {
            const eventTitle =
                item.title ||
                item.category ||
                '--';

            const category = item.category || '--';

            return `
                <tr>
                    <td class="text-nowrap">
                        ${escapeHTML(
                            formatDate(item.timestamp)
                        )}
                    </td>

                    <td>
                        <div class="fw-semibold">
                            ${escapeHTML(eventTitle)}
                        </div>

                        <small class="text-muted">
                            ${escapeHTML(category)}
                        </small>

                        <div class="small text-muted">
                            ${escapeHTML(item.description || '')}
                        </div>
                    </td>

                    <td>
                        <span class="badge bg-secondary">
                            ${escapeHTML(item.source || '--')}
                        </span>
                    </td>

                    <td>
                        <span class="text-muted small"
                              title="El TimelineDTO no proporciona severidad">
                            --
                        </span>
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

        getElement(
            'investigation-graph-message'
        )?.remove();

        getElement(
            'investigation-graph-loading'
        )?.remove();

        if (typeof window.cytoscape !== 'function') {
            container.innerHTML = `
                <div class="text-center text-muted p-4">
                    Cytoscape.js no está disponible.
                </div>
            `;
            return;
        }

        const colors = {
            INCIDENT: '#EF4444',
            INVESTIGATION: '#3B82F6',
            IOC: '#F59E0B',
            IOC_MALICIOUS: '#DC2626',
            EVIDENCE: '#10B981',
            ALERT: '#F97316',
            EVENT: '#8B5CF6'
        };

        let elements = [];
        let hasBackendGraph = false;

        // -----------------------------------------------------
        // GRAFO RECIBIDO DEL BACKEND
        // -----------------------------------------------------

        if (
            currentGraph &&
            Array.isArray(currentGraph.nodes) &&
            currentGraph.nodes.length
        ) {
            const validNodes = currentGraph.nodes.filter(
                node =>
                    node &&
                    node.id !== null &&
                    node.id !== undefined &&
                    String(node.id).trim() !== ''
            );

            const nodeIds = new Set(
                validNodes.map(node => String(node.id))
            );

            const graphNodes = validNodes.map(node => {
                const metadata = node.metadata || {};
                const group = normalize(node.group);

                return {
                    data: {
                        id: String(node.id),

                        label:
                            node.label ||
                            node.group ||
                            'Entity',

                        type: group,

                        color:
                            colors[group] ||
                            '#94A3B8',

                        metadata,

                        // Campos útiles para inspección y estilos.
                        group: node.group || null,
                        iocType: metadata.type || null,
                        malicious: metadata.malicious === true,
                        threatContext: metadata.context || null,
                        description: metadata.description || null,
                        reference: metadata.reference || null,
                        severity: metadata.severity || null,
                        status: metadata.status || null,
                        verdict: metadata.verdict || null
                    }
                };
            });

            const graphEdges = (
                Array.isArray(currentGraph.edges)
                    ? currentGraph.edges
                    : []
            )
                .filter(edge =>
                    edge &&
                    edge.source !== null &&
                    edge.source !== undefined &&
                    edge.target !== null &&
                    edge.target !== undefined &&
                    nodeIds.has(String(edge.source)) &&
                    nodeIds.has(String(edge.target))
                )
                .map((edge, index) => ({
                    data: {
                        id: `graph-edge-${index}`,
                        source: String(edge.source),
                        target: String(edge.target),
                        label: edge.relationship || ''
                    }
                }));

            elements = [
                ...graphNodes,
                ...graphEdges
            ];

            hasBackendGraph = graphNodes.length > 0;
        }

        // -----------------------------------------------------
        // FALLBACK SI NO EXISTE UN GRAFO DEL BACKEND
        // -----------------------------------------------------

        if (!hasBackendGraph) {
            const incident =
                currentIncident ||
                recoverIncidentFromGraph(currentGraph);

            if (incident?.id) {
                elements = [{
                    data: {
                        id: `incident-${incident.id}`,
                        label:
                            incident.title ||
                            'Incident',

                        type: 'INCIDENT',
                        color: colors.INCIDENT,
                        metadata: {
                            severity: incident.severity,
                            status: incident.status
                        }
                    }
                }];
            }
        }

        if (!elements.length) {
            container.innerHTML = `
                <div class="text-center text-muted p-4">
                    No hay entidades disponibles para representar.
                </div>
            `;
            return;
        }

        // -----------------------------------------------------
        // INICIALIZAR CYTOSCAPE
        // -----------------------------------------------------

        try {
            cy = window.cytoscape({
                container,
                elements,

                style: [
                    {
                        selector: 'node',
                        style: {
                            'label': 'data(label)',
                            'background-color': 'data(color)',
                            'color': '#F8FAFC',
                            'font-size': '11px',
                            'text-wrap': 'wrap',
                            'text-max-width': 120,
                            'text-valign': 'bottom',
                            'text-halign': 'center',
                            'text-margin-y': 10,
                            'width': 45,
                            'height': 45,
                            'border-width': 2,
                            'border-color': '#DFE8EC'
                        }
                    },
                    {
                        selector: 'node[type="IOC_MALICIOUS"]',
                        style: {
                            'border-width': 4,
                            'border-color': '#FCA5A5',
                            'shape': 'diamond'
                        }
                    },
                    {
                        selector: 'node[type="INCIDENT"]',
                        style: {
                            'shape': 'round-rectangle',
                            'width': 60,
                            'height': 50
                        }
                    },
                    {
                        selector: 'node[type="INVESTIGATION"]',
                        style: {
                            'shape': 'round-rectangle'
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
                            'color': '#94A3B8',
                            'text-rotation': 'autorotate',
                            'text-background-color': '#0D1326',
                            'text-background-opacity': 0.8,
                            'text-background-padding': '2px'
                        }
                    },
                    {
                        selector: ':selected',
                        style: {
                            'border-width': 4,
                            'border-color': '#38BDF8'
                        }
                    }
                ],

                layout: {
                    name: 'cose',
                    animate: false,
                    padding: 30
                }
            });

            // Permite consultar los metadatos de cada entidad
            // seleccionándola en el gráfico.

            cy.on('tap', 'node', event => {
                const node = event.target;
                const data = node.data();
                const metadata = data.metadata || {};

                console.info(
                    'NOVA SIEM | Entidad seleccionada',
                    {
                        id: data.id,
                        label: data.label,
                        group: data.group,
                        metadata
                    }
                );
            });

        } catch (error) {
            console.error(
                'Investigations: Cytoscape rendering error.',
                error
            );

            cy = null;

            container.innerHTML = `
                <div class="text-center text-danger p-4">
                    No fue posible representar el gráfico.
                </div>
            `;

            return;
        }

        // -----------------------------------------------------
        // MENSAJE SI SOLO EXISTE EL NODO DEL INCIDENTE
        // -----------------------------------------------------

        if (!hasBackendGraph) {
            const graphMessage = document.createElement('div');

            graphMessage.id =
                'investigation-graph-message';

            graphMessage.className =
                'text-center text-muted small mt-2';

            graphMessage.textContent = translate(
                'graphRelationshipsUnavailable',
                'No hay relaciones de entidades disponibles desde el backend. Se muestra el incidente como referencia.'
            );

            container.parentElement?.appendChild(
                graphMessage
            );
        }
    }

    // =========================================================
    // GRAPH LAYOUT
    // =========================================================

    function changeGraphLayout(name) {
        if (!cy) return;

        const supportedLayouts = [
            'cose',
            'grid'
        ];

        if (!supportedLayouts.includes(name)) {
            return;
        }

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
            console.error(
                'Notebook loading error:',
                error
            );
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
            console.error(
                'Notebook saving error:',
                error
            );
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

            button.innerHTML =
                '<i class="bi bi-trash"></i>';

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

        if (!target || !currentInvestigation) {
            return;
        }

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

        if (!isActive || isSubmittingVerdict) {
            return;
        }

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

        const payload = {
            verdict,
            confidenceScore,
            recommendedAction
        };

        const button = getElement(
            'btn-submit-verdict'
        );

        isSubmittingVerdict = true;

        if (button) {
            button.disabled = true;
        }

        hideMessage(
            getElement('verdictStatus')
        );

        try {
            const response = await window.HttpClient.post(
                window.ENDPOINTS.INVESTIGATIONS.SUBMIT_VERDICT(
                    investigationId
                ),
                payload
            );

            if (!isActive) return;

            if (!response?.data?.id) {
                throw new Error(
                    'Invalid verdict response.'
                );
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

            console.error(
                'Verdict submission error:',
                error
            );

            showMessage(
                getElement('verdictStatus'),
                error.message ||
                    'Could not submit verdict.',
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
        if (!isActive || isGeneratingReport) {
            return;
        }

        const incidentId = getIncidentId();

        if (!incidentId) {
            window.alert('No incident selected.');
            return;
        }

        const button = getElement(
            'btn-generate-investigation-report'
        );

        isGeneratingReport = true;

        if (button) {
            button.disabled = true;
        }

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
                throw new Error(
                    'Invalid report response.'
                );
            }

            window.alert(
                'Report request completed successfully.'
            );

        } catch (error) {
            if (!isActive) return;

            console.error(
                'Report generation error:',
                error
            );

            window.alert(
                error.message ||
                    'Could not generate report.'
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


    // =========================================================
    // IOC Y EVIDENCIAS (backend real)
    // =========================================================

    let currentIocs = [];
    let currentEvidences = [];

    function setExtraStatus(id, message, type) {
        const el = getElement(id);
        if (!el) return;
        el.className = `small mb-2 text-${type}`;
        el.textContent = message || '';
    }

    function renderIocEvidenceLists() {
        const iocList = getElement('ioc-list');
        const evList = getElement('evidence-list');

        if (iocList) {
            iocList.innerHTML = currentIocs.length
                ? currentIocs.map(i => `
                    <li class="list-group-item bg-transparent text-main d-flex justify-content-between align-items-start">
                        <span>
                            <span class="badge ${i.malicious ? 'bg-danger' : 'bg-secondary'} me-1">${escapeHTML(i.iocType)}</span>
                            ${escapeHTML(i.value)}
                            ${i.threatContext ? `<div class="text-muted">${escapeHTML(i.threatContext)}</div>` : ''}
                        </span>
                        <button type="button" class="btn btn-sm btn-outline-danger" data-ioc-delete="${escapeHTML(i.id)}">Eliminar</button>
                    </li>`).join('')
                : '<li class="list-group-item bg-transparent text-muted">Sin indicadores registrados.</li>';
        }

        if (evList) {
            evList.innerHTML = currentEvidences.length
                ? currentEvidences.map(e => `
                    <li class="list-group-item bg-transparent text-main d-flex justify-content-between align-items-start">
                        <span>
                            <strong>${escapeHTML(e.evidenceType)}</strong>
                            ${e.description ? `<div>${escapeHTML(e.description)}</div>` : ''}
                            ${e.artifactReference ? `<div class="text-muted">${escapeHTML(e.artifactReference)}</div>` : ''}
                        </span>
                        <button type="button" class="btn btn-sm btn-outline-danger" data-evidence-delete="${escapeHTML(e.id)}">Eliminar</button>
                    </li>`).join('')
                : '<li class="list-group-item bg-transparent text-muted">Sin evidencias registradas.</li>';
        }
    }

    async function refreshInvestigationRelated() {
        const id = getInvestigationId();
        if (!id || !isActive) return;

        try {
            const [iocs, evidences, graph, timeline] = await Promise.all([
                getApiData(window.ENDPOINTS.INVESTIGATIONS.IOCS(id)),
                getApiData(window.ENDPOINTS.INVESTIGATIONS.EVIDENCES(id)),
                getApiData(window.ENDPOINTS.INVESTIGATIONS.GRAPH(id)),
                getApiData(window.ENDPOINTS.INVESTIGATIONS.TIMELINE(id))
            ]);
            if (!isActive) return;
            currentIocs = iocs || [];
            currentEvidences = evidences || [];
            currentGraph = graph;
            currentTimeline = timeline || [];
        } catch (error) {
            console.error('Error al actualizar IOC/evidencias:', error);
            setExtraStatus('ioc-status', error.message || 'No se pudieron cargar los datos.', 'danger');
        }

        renderIocEvidenceLists();
        renderTimeline();
        renderGraph();
    }

    async function handleExtrasSubmit(event) {
        const form = event.target;
        if (!(form instanceof Element)) return;
        const id = getInvestigationId();

        if (form.id === 'ioc-form') {
            event.preventDefault();
            if (!id) return;
            try {
                await window.HttpClient.post(window.ENDPOINTS.INVESTIGATIONS.IOCS(id), {
                    iocType: getElement('ioc-type').value,
                    value: getElement('ioc-value').value.trim(),
                    malicious: getElement('ioc-malicious').checked,
                    threatContext: getElement('ioc-context').value.trim() || null
                });
                form.reset();
                setExtraStatus('ioc-status', 'IOC agregado.', 'success');
                await refreshInvestigationRelated();
            } catch (error) {
                setExtraStatus('ioc-status', error.message || 'No se pudo agregar el IOC.', 'danger');
            }
        } else if (form.id === 'evidence-form') {
            event.preventDefault();
            if (!id) return;
            try {
                await window.HttpClient.post(window.ENDPOINTS.INVESTIGATIONS.EVIDENCES(id), {
                    evidenceType: getElement('evidence-type').value.trim(),
                    description: getElement('evidence-description').value.trim() || null,
                    artifactReference: getElement('evidence-reference').value.trim() || null
                });
                form.reset();
                setExtraStatus('evidence-status', 'Evidencia agregada.', 'success');
                await refreshInvestigationRelated();
            } catch (error) {
                setExtraStatus('evidence-status', error.message || 'No se pudo agregar la evidencia.', 'danger');
            }
        }
    }

    function handleExtrasClick(target) {
        const iocBtn = target.closest('[data-ioc-delete]');
        const evBtn = target.closest('[data-evidence-delete]');
        if (!iocBtn && !evBtn) return false;

        const request = iocBtn
            ? window.HttpClient.delete(window.ENDPOINTS.INVESTIGATIONS.IOC(iocBtn.dataset.iocDelete))
            : window.HttpClient.delete(window.ENDPOINTS.INVESTIGATIONS.EVIDENCE(evBtn.dataset.evidenceDelete));

        request
            .then(refreshInvestigationRelated)
            .catch(error => setExtraStatus(
                iocBtn ? 'ioc-status' : 'evidence-status',
                error.message || 'No se pudo eliminar.',
                'danger'
            ));
        return true;
    }

    function handleClick(event) {
        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        if (handleExtrasClick(target)) {
            return;
        }

        if (target.closest('#btn-layout-cose')) {
            changeGraphLayout('cose');
            return;
        }

        if (target.closest('#btn-layout-grid')) {
            changeGraphLayout('grid');
            return;
        }

        const addButton = target.closest(
            '[data-add-notebook]'
        );

        if (addButton) {
            addNotebookEntry(
                addButton.dataset.addNotebook
            );
            return;
        }

        const deleteButton = target.closest(
            '[data-notebook-type]'
        );

        if (deleteButton) {
            const type =
                deleteButton.dataset.notebookType;

            const index = Number(
                deleteButton.dataset.notebookIndex
            );

            if (!Array.isArray(notebook[type])) {
                return;
            }

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

        if (!relevantSources.includes(source)) {
            return;
        }

        loadInvestigation();
    }

    // =========================================================
    // EVENT LISTENER REGISTRATION
    // =========================================================

    const verdictForm = getElement('verdictForm');

    const confidenceInput = getElement(
        'verdict-confidence'
    );

    const reportButton = getElement(
        'btn-generate-investigation-report'
    );

    document.addEventListener(
        'click',
        handleClick
    );

    document.addEventListener(
        'submit',
        handleExtrasSubmit
    );

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

    function getInvestigationAnalysis() {
        return investigationAnalysis;
    }

    window.loadInvestigation = loadInvestigation;

    window.renderInvestigation =
        renderInvestigation;

    window.renderInvestigationTimeline =
        renderTimeline;

    window.renderInvestigationGraph =
        renderGraph;

    window.addNotebookEntry =
        addNotebookEntry;

    window.getInvestigationAnalysis =
        getInvestigationAnalysis;

    // =========================================================
    // CLEANUP
    // =========================================================

    function cleanup() {
        if (!isActive) return;

        isActive = false;
        requestVersion++;
        reloadRequested = false;

        document.removeEventListener(
            'submit',
            handleExtrasSubmit
        );

        document.removeEventListener(
            'click',
            handleClick
        );

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

        getElement(
            'investigation-graph-message'
        )?.remove();

        if (
            window.loadInvestigation === loadInvestigation
        ) {
            window.loadInvestigation =
                previousGlobals.loadInvestigation;
        }

        if (
            window.renderInvestigation === renderInvestigation
        ) {
            window.renderInvestigation =
                previousGlobals.renderInvestigation;
        }

        if (
            window.renderInvestigationTimeline === renderTimeline
        ) {
            window.renderInvestigationTimeline =
                previousGlobals.renderInvestigationTimeline;
        }

        if (
            window.renderInvestigationGraph === renderGraph
        ) {
            window.renderInvestigationGraph =
                previousGlobals.renderInvestigationGraph;
        }

        if (
            window.addNotebookEntry === addNotebookEntry
        ) {
            window.addNotebookEntry =
                previousGlobals.addNotebookEntry;
        }

        if (
            window.getInvestigationAnalysis ===
            getInvestigationAnalysis
        ) {
            window.getInvestigationAnalysis =
                previousGlobals.getInvestigationAnalysis;
        }

        if (
            window.destroyCurrentModule === cleanup
        ) {
            window.destroyCurrentModule =
                previousGlobals.destroyCurrentModule;
        }

        if (
            window.investigationAnalysis ===
            investigationAnalysis
        ) {
            delete window.investigationAnalysis;
        }

        currentInvestigation = null;
        currentIncident = null;
        currentEvents = [];
        currentAlerts = [];
        currentGraph = null;
        currentTimeline = [];
        investigationAnalysis = null;
    }

    window.destroyCurrentModule = cleanup;

    // =========================================================
    // INITIALIZATION
    // =========================================================

    loadInvestigation();

})();
