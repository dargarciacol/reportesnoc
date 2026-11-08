
(function () {
    const tbody = document.getElementById('table-rules-body');
    const statActive = document.getElementById('stat-active-rules');
    const statDisabled = document.getElementById('stat-disabled-rules');
    const formCreateRule = document.getElementById('createRuleForm');
    const searchInput = document.getElementById('search-rules');
    const statusFilter = document.getElementById('filter-rule-status');

    let rules = [];
    let isLoading = false;

    const severityColors = {
        CRITICAL: '#EF4444',
        HIGH: '#F97316',
        MEDIUM: '#EAB308',
        LOW: '#06B6D4'
    };

    const categoryLabels = {
        INITIAL_ACCESS: 'Initial Access',
        EXECUTION: 'Execution',
        PERSISTENCE: 'Persistence',
        PRIVILEGE_ESCALATION: 'Privilege Escalation',
        DEFENSE_EVASION: 'Defense Evasion',
        CREDENTIAL_ACCESS: 'Credential Access',
        DISCOVERY: 'Discovery',
        LATERAL_MOVEMENT: 'Lateral Movement',
        COLLECTION: 'Collection',
        COMMAND_AND_CONTROL: 'Command and Control',
        EXFILTRATION: 'Exfiltration',
        IMPACT: 'Impact',
        CUSTOM: 'Custom'
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

    function normalizeSeverity(severity) {
        return String(severity || '').toUpperCase();
    }

    function translateSeverity(severity) {
        const value = normalizeSeverity(severity);
        const keys = {
            CRITICAL: 'critical',
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low'
        };

        return t(keys[value], value);
    }

    function translateCategory(category) {
        const value = String(category || '').toUpperCase();
        const keys = {
            INITIAL_ACCESS: 'initialAccess',
            EXECUTION: 'execution',
            PERSISTENCE: 'persistence',
            PRIVILEGE_ESCALATION: 'privilegeEscalation',
            DEFENSE_EVASION: 'defenseEvasion',
            CREDENTIAL_ACCESS: 'credentialAccess',
            DISCOVERY: 'discovery',
            LATERAL_MOVEMENT: 'lateralMovement',
            COLLECTION: 'collection',
            COMMAND_AND_CONTROL: 'commandAndControl',
            EXFILTRATION: 'exfiltration',
            IMPACT: 'impact',
            CUSTOM: 'custom'
        };

        return t(keys[value], categoryLabels[value] || value);
    }

    function showTableMessage(message) {
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    ${escapeHtml(message)}
                </td>
            </tr>
        `;
    }

    function calculateStats() {
        const active = rules.filter(rule => rule.active).length;
        const disabled = rules.length - active;

        if (statActive) statActive.textContent = active;
        if (statDisabled) statDisabled.textContent = disabled;
    }

    function getFilteredRules() {
        const search = searchInput?.value.trim().toLowerCase() || '';
        const status = statusFilter?.value || '';

        return rules.filter(rule => {
            const matchesSearch =
                !search ||
                String(rule.name || '').toLowerCase().includes(search) ||
                String(rule.mitreTechniqueId || '').toLowerCase().includes(search);

            const matchesStatus =
                !status ||
                (status === 'Active' && rule.active) ||
                (status === 'Disabled' && !rule.active);

            return matchesSearch && matchesStatus;
        });
    }

    function renderRulesTable() {
        if (!tbody) return;

        const filteredRules = getFilteredRules();

        tbody.innerHTML = '';

        if (filteredRules.length === 0) {
            showTableMessage(
                rules.length === 0
                    ? 'No detection rules registered.'
                    : 'No rules match the selected filters.'
            );
            calculateStats();
            return;
        }

        filteredRules.forEach(rule => {
            const tr = document.createElement('tr');
            const severity = normalizeSeverity(rule.severity);
            const color = severityColors[severity] || '#94A3B8';

            if (!rule.active) {
                tr.style.opacity = '0.6';
            }

            tr.innerHTML = `
                <td class="text-center">
                    <div class="form-check form-switch d-flex justify-content-center">
                        <input
                            class="form-check-input rule-toggle"
                            type="checkbox"
                            data-rule-id="${escapeHtml(rule.id)}"
                            ${rule.active ? 'checked' : ''}
                            aria-label="${rule.active ? 'Disable' : 'Enable'} rule ${escapeHtml(rule.name)}">
                    </div>
                </td>

                <td style="font-weight: 600; color: ${rule.active ? '#F8FAFC' : '#94A3B8'};">
                    ${escapeHtml(rule.name)}
                </td>

                <td>${escapeHtml(translateCategory(rule.category))}</td>

                <td style="font-family: monospace; color: var(--primary);">
                    ${escapeHtml(rule.mitreTechniqueId || 'N/A')}
                </td>

                <td>
                    <span class="badge"
                        style="background-color: ${color}20; color: ${color}; border: 1px solid ${color};">
                        ${escapeHtml(translateSeverity(severity))}
                    </span>
                </td>

                <td class="text-center fw-bold"
                    style="color: ${(rule.hitCount || 0) > 0 ? '#F8FAFC' : '#94A3B8'}">
                    ${Number(rule.hitCount || 0)}
                </td>

                <td class="text-center">
                    <button
                        class="btn btn-sm btn-outline-secondary py-0 px-2"
                        type="button"
                        disabled
                        title="Rule editing is not available in the backend yet"
                        aria-label="Editing unavailable">
                        <i class="bi bi-lock"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        calculateStats();
    }

    async function loadRules() {
        if (isLoading) return;

        isLoading = true;
        showTableMessage('Loading detection rules...');

        try {
            const response = await HttpClient.get(ENDPOINTS.DETECTION.RULES);

            if (!response || !Array.isArray(response.data)) {
                throw new Error('Unexpected detection rules response.');
            }

            rules = response.data;
            renderRulesTable();

        } catch (error) {
            console.error('Error loading detection rules:', error);
            rules = [];
            calculateStats();

            showTableMessage(
                error.message || 'Unable to load detection rules.'
            );
        } finally {
            isLoading = false;
        }
    }

    async function toggleRule(id, checkbox) {
        checkbox.disabled = true;

        try {
            await HttpClient.patch(
                ENDPOINTS.DETECTION.TOGGLE_RULE(id)
            );

            await loadRules();

        } catch (error) {
            console.error('Error changing rule status:', error);

            checkbox.checked = !checkbox.checked;
            checkbox.disabled = false;

            alert(error.message || 'Unable to update rule status.');
        }
    }

    if (tbody) {
        tbody.addEventListener('change', event => {
            const checkbox = event.target.closest('.rule-toggle');

            if (!checkbox) return;

            const id = checkbox.dataset.ruleId;
            if (!id) return;

            toggleRule(id, checkbox);
        });
    }

    if (formCreateRule) {
        formCreateRule.addEventListener('submit', async event => {
            event.preventDefault();

            const name = document.getElementById('ruleName')?.value.trim();
            const category = document.getElementById('ruleCategory')?.value;
            const severity = document.getElementById('ruleSeverity')?.value;
            const mitreTechniqueId =
                document.getElementById('ruleMitre')?.value.trim();
            const sigmaLogic =
                document.getElementById('ruleSigma')?.value.trim();
            const active =
                document.getElementById('ruleActiveSwitch')?.checked;

            if (!name || !category || !severity || !sigmaLogic) {
                alert('Please complete all required fields.');
                return;
            }

            const payload = {
                name,
                category,
                mitreTechniqueId: mitreTechniqueId || null,
                severity: severity.toUpperCase(),
                sigmaLogic,
                active: Boolean(active)
            };

            const submitButton = formCreateRule.querySelector(
                'button[type="submit"]'
            );

            if (submitButton) submitButton.disabled = true;

            try {
                await HttpClient.post(
                    ENDPOINTS.DETECTION.RULES,
                    payload
                );

                formCreateRule.reset();

                const modalElement =
                    document.getElementById('createRuleModal');

                const modal = modalElement
                    ? bootstrap.Modal.getInstance(modalElement)
                    : null;

                modal?.hide();

                await loadRules();

            } catch (error) {
                console.error('Error creating detection rule:', error);
                alert(error.message || 'Unable to create detection rule.');
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
    }

    searchInput?.addEventListener('input', renderRulesTable);
    statusFilter?.addEventListener('change', renderRulesTable);

    document.addEventListener('nova:languageChanged', renderRulesTable);

    window.loadDetectionRules = loadRules;
    window.renderRulesTable = renderRulesTable;

    loadRules();
})();
