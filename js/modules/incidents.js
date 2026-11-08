
(function() {
    const incidentsContainer = document.getElementById('incidents-container');
    const formCreateIncident = document.getElementById('createIncidentForm');

    function t(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback)
            : fallback;
    }

    function translateStatus(status) {
        const statusKeys = {
            'Triage': 'triage',
            'Containment': 'containment',
            'Eradication': 'eradication',
            'Recovery': 'recovery',
            'Closed': 'closed'
        };

        return t(statusKeys[status], status);
    }

    function translateSeverity(severity) {
        const severityKeys = {
            'Critical': 'critical',
            'High': 'high',
            'Medium': 'medium',
            'Low': 'low'
        };

        return t(severityKeys[severity], severity);
    }

    let syntheticIncidents = [
        {
            id: "INC-1002",
            title: "Ransomware Execution Sequence Detected",
            severity: "Critical",
            color: "#EF4444",
            status: "Containment",
            created: "2026-11-07T16:05:00Z",
            assignee: "s.garcia",
            hypothesis: "Phishing payload execution leading to local encryption",
            hypothesisKey: "hypothesisRansomware",
            alertsLinked: 4,
            entitiesAffected: 2
        },
        {
            id: "INC-1001",
            title: "Suspicious Lateral Movement via WMI",
            severity: "High",
            color: "#F97316",
            status: "Triage",
            created: "2026-11-07T14:30:22Z",
            assignee: "Unassigned",
            hypothesis: "Compromised credential used to access adjacent servers",
            hypothesisKey: "hypothesisLateralMovement",
            alertsLinked: 2,
            entitiesAffected: 3
        },
        {
            id: "INC-1000",
            title: "Abnormal Data Egress to Unknown IP",
            severity: "Medium",
            color: "#EAB308",
            status: "Recovery",
            created: "2026-11-06T09:15:00Z",
            assignee: "m.rodriguez",
            hypothesis: "Unauthorized data exfiltration via HTTPS tunnel",
            hypothesisKey: "hypothesisDataEgress",
            alertsLinked: 1,
            entitiesAffected: 1
        }
    ];

    function getProgressPercentage(status) {
        switch (status) {
            case 'Triage': return 25;
            case 'Containment': return 50;
            case 'Eradication': return 75;
            case 'Recovery': return 90;
            case 'Closed': return 100;
            default: return 10;
        }
    }

    function renderIncidents() {
        if (!incidentsContainer) return;

        incidentsContainer.innerHTML = '';

        syntheticIncidents.forEach(inc => {
            const progress = getProgressPercentage(inc.status);

            const hypothesis = inc.hypothesisKey
                ? t(inc.hypothesisKey, inc.hypothesis)
                : inc.hypothesis;

            const unassignedHTML = `
                <span class="text-warning">
                    <i class="bi bi-exclamation-circle me-1"></i>
                    ${t('unassigned', 'Unassigned')}
                </span>
            `;

            const assigneeHTML = inc.assignee === 'Unassigned'
                ? unassignedHTML
                : `<i class="bi bi-person-check-fill me-1" style="color: var(--primary);"></i>${inc.assignee}`;

            const cardHtml = `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card bg-surface border-panel h-100 rounded-3 position-relative overflow-hidden">

                        <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background-color: ${inc.color};"></div>

                        <div class="card-body ps-4">

                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <span class="badge"
                                      style="background-color: ${inc.color}20; color: ${inc.color}; border: 1px solid ${inc.color};">
                                    ${inc.id}
                                </span>

                                <span class="badge bg-secondary">
                                    ${translateStatus(inc.status)}
                                </span>
                            </div>

                            <h5 class="card-title text-main fs-6 fw-bold mb-3"
                                style="min-height: 40px;">
                                ${inc.title}
                            </h5>

                            <p class="text-muted small mb-3"
                               style="min-height: 32px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                <i class="bi bi-lightning-charge me-1"></i>${hypothesis}
                            </p>

                            <div class="d-flex justify-content-between text-muted small mb-3">
                                <div>
                                    <i class="bi bi-bell-fill me-1"></i>
                                    ${inc.alertsLinked} ${t('alerts', 'Alerts')}
                                </div>

                                <div>
                                    <i class="bi bi-hdd-network-fill me-1"></i>
                                    ${inc.entitiesAffected} ${t('assets', 'Assets')}
                                </div>
                            </div>

                            <div class="mb-3">
                                <div class="d-flex justify-content-between text-muted small mb-1">
                                    <span>${t('lifecycleProgress', 'Lifecycle Progress')}</span>
                                    <span>${progress}%</span>
                                </div>

                                <div class="progress"
                                     style="height: 4px; background-color: var(--bg-main);">

                                    <div class="progress-bar"
                                         role="progressbar"
                                         style="width: ${progress}%; background-color: ${inc.color};"
                                         aria-valuenow="${progress}"
                                         aria-valuemin="0"
                                         aria-valuemax="100"
                                         aria-label="${t('incidentProgress', 'Incident progress')}">
                                    </div>

                                </div>
                            </div>

                            <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-panel">

                                <div class="text-muted small">
                                    ${assigneeHTML}
                                </div>

                                <button class="btn btn-sm btn-outline-info"
                                        onclick="openInvestigationWorkspace('${inc.id}')">

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

    if (formCreateIncident) {
        formCreateIncident.addEventListener('submit', (e) => {
            e.preventDefault();

            const modalEl = document.getElementById('createIncidentModal');
            const modal = bootstrap.Modal.getInstance(modalEl);

            const severity = e.target.querySelectorAll('select')[0].value;

            const newInc = {
                id: "INC-" + (
                    Math.floor(Math.random() * (2000 - 1010 + 1)) + 1010
                ),
                title: e.target.querySelector('input[type="text"]').value,
                severity: severity,
                color: severity === 'Critical' ? '#EF4444' : '#F97316',
                status: "Triage",
                created: new Date().toISOString(),
                assignee: "s.garcia",
                hypothesis: e.target.querySelectorAll('select')[1].value,
                alertsLinked: 0,
                entitiesAffected: 0
            };

            syntheticIncidents.unshift(newInc);

            renderIncidents();
            formCreateIncident.reset();

            modal?.hide();
        });
    }

    window.openInvestigationWorkspace = function(id) {
        console.log("Opening L2 Investigation Workspace for:", id);

        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => link.classList.remove('active'));

        const invLink = Array.from(navLinks).find(
            link => link.getAttribute('data-route') === 'investigations'
        );

        if (invLink) {
            invLink.classList.add('active');
            invLink.click();
        }
    };

    // Renderizar nuevamente las tarjetas cuando cambia el idioma.
    document.addEventListener('nova:languageChanged', renderIncidents);

    renderIncidents();
})();
