
(function() {
    const tbody = document.getElementById('table-alerts-body');
    const statNew = document.getElementById('stat-new-alerts');
    const statProgress = document.getElementById('stat-progress-alerts');
    const statEscalated = document.getElementById('stat-escalated-alerts');
    const statFp = document.getElementById('stat-fp-alerts');
    const selectAllCheckbox = document.getElementById('selectAllAlerts');

    function t(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback)
            : fallback;
    }

    function translateSeverity(severity) {
        const keys = {
            Critical: 'critical',
            High: 'high',
            Medium: 'medium',
            Low: 'low'
        };

        return t(keys[severity], severity);
    }

    function translateStatus(status) {
        const keys = {
            New: 'new',
            'In Progress': 'inProgress',
            'Under Investigation': 'underInvestigation',
            Escalated: 'escalated',
            Resolved: 'resolved',
            'False Positive': 'falsePositive'
        };

        return t(keys[status], status);
    }

    function formatAlertDate(dateString) {
        const language = typeof window.getCurrentLanguage === 'function'
            ? window.getCurrentLanguage()
            : 'en';

        const locale = language === 'es' ? 'es-CO' : 'en-US';

        return new Intl.DateTimeFormat(locale, {
            dateStyle: 'short',
            timeStyle: 'medium',
            timeZone: 'UTC'
        }).format(new Date(dateString));
    }

    let syntheticAlerts = [
        {
            id: "ALT-501",
            time: "2026-11-07T16:45:02Z",
            rule: "Multiple Failed Logins",
            severity: "High",
            color: "#F97316",
            status: "New",
            assignee: "Unassigned"
        },
        {
            id: "ALT-502",
            time: "2026-11-07T16:42:20Z",
            rule: "Suspicious PowerShell Execution",
            severity: "Critical",
            color: "#EF4444",
            status: "In Progress",
            assignee: "s.garcia"
        },
        {
            id: "ALT-503",
            time: "2026-11-07T16:30:15Z",
            rule: "Login from Unusual Location",
            severity: "Medium",
            color: "#EAB308",
            status: "Under Investigation",
            assignee: "s.garcia"
        },
        {
            id: "ALT-504",
            time: "2026-11-07T16:05:00Z",
            rule: "Ransomware Extension Detected",
            severity: "Critical",
            color: "#EF4444",
            status: "Escalated",
            assignee: "System"
        },
        {
            id: "ALT-505",
            time: "2026-11-07T15:50:33Z",
            rule: "Impossible Travel",
            severity: "Medium",
            color: "#EAB308",
            status: "Resolved",
            assignee: "m.rodriguez"
        },
        {
            id: "ALT-506",
            time: "2026-11-07T14:20:10Z",
            rule: "Port Scan Activity",
            severity: "Low",
            color: "#06B6D4",
            status: "False Positive",
            assignee: "j.doe"
        }
    ];

    function getStatusBadge(status) {
        const badges = {
            'New': 'bg-primary',
            'In Progress': '',
            'Under Investigation': '',
            'Escalated': '',
            'Resolved': '',
            'False Positive': 'bg-secondary'
        };

        const styles = {
            'In Progress': 'background-color: #06B6D4; color: #0B1020;',
            'Under Investigation': 'background-color: #6366F1;',
            'Escalated': 'background-color: #EF4444;',
            'Resolved': 'background-color: #22C55E;'
        };

        const badgeClass = badges[status] || 'bg-secondary';
        const style = styles[status] ? `style="${styles[status]}"` : '';

        return `
            <span class="badge ${badgeClass}" ${style}>
                ${translateStatus(status)}
            </span>
        `;
    }

    function calculateStats() {
        const stats = {
            new: 0,
            progress: 0,
            escalated: 0,
            fp: 0
        };

        syntheticAlerts.forEach(alert => {
            if (alert.status === 'New') stats.new++;

            if (
                alert.status === 'In Progress' ||
                alert.status === 'Under Investigation'
            ) {
                stats.progress++;
            }

            if (alert.status === 'Escalated') stats.escalated++;
            if (alert.status === 'False Positive') stats.fp++;
        });

        if (statNew) statNew.innerText = stats.new;
        if (statProgress) statProgress.innerText = stats.progress;
        if (statEscalated) statEscalated.innerText = stats.escalated;
        if (statFp) statFp.innerText = stats.fp;
    }

    function renderAlertsTable() {
        if (!tbody) return;

        tbody.innerHTML = '';

        syntheticAlerts.forEach(alert => {
            const tr = document.createElement('tr');

            const assignee = alert.assignee === 'Unassigned'
                ? `<i>${t('unassigned', 'Unassigned')}</i>`
                : `<i class="bi bi-person-fill me-1"></i>${alert.assignee}`;

            tr.innerHTML = `
                <td>
                    <input
                        class="form-check-input bg-main border-panel alert-checkbox"
                        type="checkbox"
                        value="${alert.id}"
                        aria-label="${t('selectAlert', 'Select alert')} ${alert.id}">
                </td>

                <td style="font-family: monospace; color: var(--primary); font-weight: 600;">
                    ${alert.id}
                </td>

                <td style="color: var(--text-muted); font-size: 0.85rem;">
                    ${formatAlertDate(alert.time)}
                </td>

                <td style="font-weight: 500;">
                    ${alert.rule}
                </td>

                <td>
                    <span class="badge"
                        style="background-color: ${alert.color}20; color: ${alert.color}; border: 1px solid ${alert.color};">
                        ${translateSeverity(alert.severity)}
                    </span>
                </td>

                <td>
                    ${getStatusBadge(alert.status)}
                </td>

                <td style="color: var(--text-muted); font-size: 0.9rem;">
                    ${assignee}
                </td>

                <td class="text-center">
                    <div class="dropdown">
                        <button
                            class="btn btn-sm btn-outline-secondary border-0 py-0"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            aria-label="${t('alertActions', 'Alert actions')} ${alert.id}">
                            <i class="bi bi-three-dots-vertical"></i>
                        </button>

                        <ul class="dropdown-menu dropdown-menu-dark"
                            style="background-color: var(--bg-surface); border-color: var(--bg-panel);">

                            <li>
                                <a class="dropdown-item text-info"
                                   href="#"
                                   onclick="actionAlert('${alert.id}', 'assign'); return false;">
                                    <i class="bi bi-person-plus me-2"></i>
                                    ${t('assignToMe', 'Assign to Me')}
                                </a>
                            </li>

                            <li>
                                <a class="dropdown-item text-warning"
                                   href="#"
                                   onclick="actionInvestigate('${alert.id}'); return false;">
                                    <i class="bi bi-search me-2"></i>
                                    ${t('investigate', 'Investigate')}
                                </a>
                            </li>

                            <li><hr class="dropdown-divider border-panel"></li>

                            <li>
                                <a class="dropdown-item text-danger"
                                   href="#"
                                   onclick="actionAlert('${alert.id}', 'escalate'); return false;">
                                    <i class="bi bi-capslock-fill me-2"></i>
                                    ${t('escalateToIncident', 'Escalate to Incident')}
                                </a>
                            </li>

                            <li>
                                <a class="dropdown-item text-success"
                                   href="#"
                                   onclick="actionAlert('${alert.id}', 'resolve'); return false;">
                                    <i class="bi bi-check-circle me-2"></i>
                                    ${t('markResolved', 'Mark Resolved')}
                                </a>
                            </li>

                            <li>
                                <a class="dropdown-item text-secondary"
                                   href="#"
                                   onclick="actionAlert('${alert.id}', 'fp'); return false;">
                                    <i class="bi bi-slash-circle me-2"></i>
                                    ${t('markFalsePositive', 'False Positive')}
                                </a>
                            </li>
                        </ul>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

        calculateStats();

        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.alert-checkbox');

            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        });
    }

    if (tbody) {
        tbody.addEventListener('change', (e) => {
            if (!e.target.classList.contains('alert-checkbox')) return;

            const checkboxes = [...tbody.querySelectorAll('.alert-checkbox')];

            const checkedCount = checkboxes.filter(cb => cb.checked).length;

            if (selectAllCheckbox) {
                selectAllCheckbox.checked =
                    checkedCount === checkboxes.length && checkboxes.length > 0;

                selectAllCheckbox.indeterminate =
                    checkedCount > 0 && checkedCount < checkboxes.length;
            }
        });
    }

    window.actionAlert = function(id, action) {
        const alertIndex = syntheticAlerts.findIndex(alert => alert.id === id);

        if (alertIndex === -1) return;

        const alert = syntheticAlerts[alertIndex];

        if (action === 'assign') {
            alert.assignee = 's.garcia';
            alert.status = 'In Progress';
        } else if (action === 'escalate') {
            alert.status = 'Escalated';
        } else if (action === 'resolve') {
            alert.status = 'Resolved';
        } else if (action === 'fp') {
            alert.status = 'False Positive';
        }

        renderAlertsTable();
    };

    window.actionInvestigate = function(id) {
        console.log("Routing to Investigation L2 for alert:", id);

        // Pendiente: integrar navegación al workspace de investigaciones
        // y transferir el ID de la alerta seleccionada.
    };

    document.addEventListener('nova:languageChanged', renderAlertsTable);

    renderAlertsTable();
})();
