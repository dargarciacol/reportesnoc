
(function () {
    const tbody = document.getElementById('table-alerts-body');

    const statNew = document.getElementById('stat-new-alerts');
    const statProgress = document.getElementById('stat-progress-alerts');
    const statEscalated = document.getElementById('stat-escalated-alerts');
    const statFp = document.getElementById('stat-fp-alerts');

    const selectAllCheckbox = document.getElementById('selectAllAlerts');

    let alerts = [];
    let loading = false;

    const STATUS = {
        NEW: 'NEW',
        IN_PROGRESS: 'IN_PROGRESS',
        UNDER_INVESTIGATION: 'UNDER_INVESTIGATION',
        ESCALATED: 'ESCALATED',
        RESOLVED: 'RESOLVED',
        FALSE_POSITIVE: 'FALSE_POSITIVE'
    };

    function t(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key) || fallback
            : fallback;
    }

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    }

    function translateSeverity(severity) {
        const translations = {
            CRITICAL: t('severity.critical', 'Critical'),
            HIGH: t('severity.high', 'High'),
            MEDIUM: t('severity.medium', 'Medium'),
            LOW: t('severity.low', 'Low')
        };

        return translations[severity] || severity || '--';
    }

    function translateStatus(status) {
        const translations = {
            NEW: t('alerts.status.new', 'New'),
            IN_PROGRESS: t('alerts.status.inProgress', 'In Progress'),
            UNDER_INVESTIGATION: t('alerts.status.underInvestigation', 'Under Investigation'),
            ESCALATED: t('alerts.status.escalated', 'Escalated'),
            RESOLVED: t('alerts.status.resolved', 'Resolved'),
            FALSE_POSITIVE: t('alerts.status.falsePositive', 'False Positive')
        };

        return translations[status] || status || '--';
    }

    function getSeverityClass(severity) {
        const classes = {
            CRITICAL: 'danger',
            HIGH: 'warning',
            MEDIUM: 'info',
            LOW: 'secondary'
        };

        return classes[severity] || 'secondary';
    }

    function getStatusClass(status) {
        const classes = {
            NEW: 'danger',
            IN_PROGRESS: 'primary',
            UNDER_INVESTIGATION: 'info',
            ESCALATED: 'warning',
            RESOLVED: 'success',
            FALSE_POSITIVE: 'secondary'
        };

        return classes[status] || 'secondary';
    }

    function formatAlertDate(dateValue) {
        if (!dateValue) return '--';

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return '--';

        const language = document.documentElement.lang || 'en';

        return new Intl.DateTimeFormat(
            language.startsWith('es') ? 'es-CO' : 'en-US',
            {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'UTC'
            }
        ).format(date) + ' UTC';
    }

    function normalizeAlert(alert) {
        return {
            id: alert.id,
            rule: alert.ruleTriggered || '--',
            severity: alert.severity || 'LOW',
            status: alert.status || STATUS.NEW,
            assignee: alert.assignedTo || '--',
            time: alert.createdAt || null
        };
    }

    function updateStatistics() {
        if (statNew) {
            statNew.textContent = alerts.filter(
                alert => alert.status === STATUS.NEW
            ).length;
        }

        if (statProgress) {
            statProgress.textContent = alerts.filter(
                alert =>
                    alert.status === STATUS.IN_PROGRESS ||
                    alert.status === STATUS.UNDER_INVESTIGATION
            ).length;
        }

        if (statEscalated) {
            statEscalated.textContent = alerts.filter(
                alert => alert.status === STATUS.ESCALATED
            ).length;
        }

        if (statFp) {
            statFp.textContent = alerts.filter(
                alert => alert.status === STATUS.FALSE_POSITIVE
            ).length;
        }
    }

    function renderAlerts() {
        if (!tbody) return;

        if (loading) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <div class="spinner-border spinner-border-sm me-2"></div>
                        ${t('common.loading', 'Loading alerts...')}
                    </td>
                </tr>
            `;
            return;
        }

        if (!alerts.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-secondary">
                        ${t('alerts.empty', 'No alerts found')}
                    </td>
                </tr>
            `;

            updateStatistics();
            return;
        }

        tbody.innerHTML = alerts.map(alert => {
            const id = escapeHTML(alert.id);

            return `
                <tr>
                    <td>
                        <input
                            type="checkbox"
                            class="form-check-input alert-checkbox"
                            value="${id}"
                            aria-label="Select alert"
                        >
                    </td>

                    <td class="text-nowrap">
                        ${escapeHTML(formatAlertDate(alert.time))}
                    </td>

                    <td>
                        <div class="fw-semibold">
                            ${escapeHTML(alert.rule)}
                        </div>
                        <small class="text-secondary">
                            ${id}
                        </small>
                    </td>

                    <td>
                        <span class="badge bg-${getSeverityClass(alert.severity)}">
                            ${escapeHTML(translateSeverity(alert.severity))}
                        </span>
                    </td>

                    <td>
                        <span class="badge bg-${getStatusClass(alert.status)}">
                            ${escapeHTML(translateStatus(alert.status))}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(alert.assignee)}
                    </td>

                    <td>
                        <div class="dropdown">
                            <button
                                class="btn btn-sm btn-outline-secondary dropdown-toggle"
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                            >
                                ${t('common.actions', 'Actions')}
                            </button>

                            <ul class="dropdown-menu dropdown-menu-end">
                                <li>
                                    <button
                                        class="dropdown-item"
                                        data-alert-action="assign"
                                        data-alert-id="${id}"
                                    >
                                        ${t('alerts.assignToMe', 'Assign to Me')}
                                    </button>
                                </li>

                                <li>
                                    <button
                                        class="dropdown-item"
                                        data-alert-action="investigate"
                                        data-alert-id="${id}"
                                    >
                                        ${t('alerts.investigate', 'Investigate')}
                                    </button>
                                </li>

                                <li>
                                    <button
                                        class="dropdown-item"
                                        data-alert-action="escalate"
                                        data-alert-id="${id}"
                                    >
                                        ${t('alerts.escalate', 'Escalate')}
                                    </button>
                                </li>

                                <li>
                                    <hr class="dropdown-divider">
                                </li>

                                <li>
                                    <button
                                        class="dropdown-item text-success"
                                        data-alert-action="resolve"
                                        data-alert-id="${id}"
                                    >
                                        ${t('alerts.resolve', 'Resolve')}
                                    </button>
                                </li>

                                <li>
                                    <button
                                        class="dropdown-item text-secondary"
                                        data-alert-action="false-positive"
                                        data-alert-id="${id}"
                                    >
                                        ${t('alerts.falsePositive', 'False Positive')}
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        updateStatistics();
    }

    async function loadAlerts() {
        if (!tbody || typeof HttpClient === 'undefined') {
            console.error('Alerts: HttpClient or table element not found.');
            return;
        }

        loading = true;
        renderAlerts();

        try {
            const response = await HttpClient.get(ENDPOINTS.ALERTS.LIST);
            const page = response?.data;

            if (!page || !Array.isArray(page.content)) {
                throw new Error('Unexpected alerts API response format.');
            }

            alerts = page.content.map(normalizeAlert);

            renderAlerts();

            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
            }

        } catch (error) {
            console.error('Failed to load alerts:', error);

            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger py-4">
                        ${escapeHTML(error.message || 'Unable to load alerts')}
                    </td>
                </tr>
            `;

        } finally {
            loading = false;
        }
    }

    async function updateAlertStatus(id, status) {
        if (!id || !Object.values(STATUS).includes(status)) {
            console.error('Invalid alert ID or status.');
            return;
        }

        try {
            await HttpClient.patch(
                ENDPOINTS.ALERTS.UPDATE_STATUS(id),
                { status }
            );

            await loadAlerts();

        } catch (error) {
            console.error('Failed to update alert:', error);

            alert(
                error.message ||
                t('alerts.updateError', 'Unable to update alert')
            );
        }
    }

    async function handleAlertAction(action, id) {
        const statusByAction = {
            assign: STATUS.IN_PROGRESS,
            investigate: STATUS.UNDER_INVESTIGATION,
            escalate: STATUS.ESCALATED,
            resolve: STATUS.RESOLVED,
            'false-positive': STATUS.FALSE_POSITIVE
        };

        const status = statusByAction[action];

        if (!status) return;

        await updateAlertStatus(id, status);
    }

    if (tbody) {
        tbody.addEventListener('click', event => {
            const button = event.target.closest('[data-alert-action]');

            if (!button) return;

            handleAlertAction(
                button.dataset.alertAction,
                button.dataset.alertId
            );
        });
    }

    if (selectAllCheckbox && tbody) {
        selectAllCheckbox.addEventListener('change', () => {
            const checkboxes = tbody.querySelectorAll('.alert-checkbox');

            checkboxes.forEach(checkbox => {
                checkbox.checked = selectAllCheckbox.checked;
            });
        });
    }

    if (tbody) {
        tbody.addEventListener('change', event => {
            if (!event.target.classList.contains('alert-checkbox')) return;

            const checkboxes = [...tbody.querySelectorAll('.alert-checkbox')];

            if (selectAllCheckbox) {
                selectAllCheckbox.checked =
                    checkboxes.length > 0 &&
                    checkboxes.every(checkbox => checkbox.checked);
            }
        });
    }

    window.actionAlert = handleAlertAction;
    window.renderAlerts = renderAlerts;
    window.loadAlerts = loadAlerts;

    document.addEventListener('nova:languageChanged', renderAlerts);

    loadAlerts();
})();
