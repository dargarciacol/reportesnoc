
(function () {
    'use strict';

    const tbody = document.getElementById('table-rules-body');
    const statActive = document.getElementById('stat-active-rules');
    const statDisabled = document.getElementById('stat-disabled-rules');
    const formCreateRule = document.getElementById('createRuleForm');
    const searchInput = document.getElementById('search-rules');
    const statusFilter = document.getElementById('filter-rule-status');

    let rules = [];
    let isActive = true;
    let isLoading = false;
    let requestCounter = 0;

    const previousGlobals = {
        destroy: window.destroyCurrentModule,
        load: window.loadDetectionRules,
        render: window.renderRulesTable
    };

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

    function normalizeValue(value) {
        return String(value ?? '')
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, '_');
    }

    function normalizeRule(rule) {
        if (!rule || typeof rule !== 'object' || !rule.id) {
            throw new Error('Invalid detection rule received from backend.');
        }

        return {
            id: String(rule.id),
            name: rule.name || '',
            category: normalizeValue(rule.category),
            mitreTechniqueId: rule.mitreTechniqueId || '',
            severity: normalizeValue(rule.severity),
            sigmaLogic: rule.sigmaLogic || '',
            active: rule.active === true,
            hitCount: Number(rule.hitCount) || 0
        };
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

    function translateCategory(category) {
        const value = normalizeValue(category);

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

    function showTableMessage(message, type = 'muted') {
        if (!tbody) return;

        const row = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 7;
        cell.className = `text-center text-${type} py-4`;
        cell.textContent = message;

        row.appendChild(cell);
        tbody.replaceChildren(row);
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
                rule.name.toLowerCase().includes(search) ||
                rule.mitreTechniqueId.toLowerCase().includes(search);

            const matchesStatus =
                !status ||
                (status.toLowerCase() === 'active' && rule.active) ||
                (status.toLowerCase() === 'disabled' && !rule.active);

            return matchesSearch && matchesStatus;
        });
    }

    function renderRulesTable() {
        if (!isActive || !tbody) return;

        const filteredRules = getFilteredRules();

        tbody.replaceChildren();

        if (filteredRules.length === 0) {
            showTableMessage(
                rules.length === 0
                    ? t('noDetectionRules', 'No detection rules registered.')
                    : t('noMatchingRules', 'No rules match the selected filters.')
            );

            calculateStats();
            return;
        }

        filteredRules.forEach(rule => {
            const row = document.createElement('tr');

            const severity = normalizeValue(rule.severity);
            const color = severityColors[severity] || '#94A3B8';

            if (!rule.active) {
                row.style.opacity = '0.6';
            }

            row.innerHTML = `
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
                    style="color: ${rule.hitCount > 0 ? '#F8FAFC' : '#94A3B8'}">
                    ${rule.hitCount}
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

            tbody.appendChild(row);
        });

        calculateStats();
    }

    async function loadRules() {
        if (!isActive || isLoading) return;

        if (!window.HttpClient || !window.ENDPOINTS?.DETECTION?.RULES) {
            showTableMessage(
                'Detection rules API configuration is unavailable.',
                'danger'
            );
            return;
        }

        const currentRequest = ++requestCounter;

        isLoading = true;
        showTableMessage(t('loading', 'Loading detection rules...'));

        try {
            const response = await HttpClient.get(
                ENDPOINTS.DETECTION.RULES
            );

            if (!isActive || currentRequest !== requestCounter) {
                return;
            }

            if (!response || !Array.isArray(response.data)) {
                throw new Error(
                    'Invalid detection rules response from backend.'
                );
            }

            rules = response.data.map(normalizeRule);

            renderRulesTable();

        } catch (error) {
            if (!isActive || currentRequest !== requestCounter) {
                return;
            }

            console.error('Error loading detection rules:', error);

            rules = [];
            calculateStats();

            showTableMessage(
                error.message || 'Unable to load detection rules.',
                'danger'
            );

        } finally {
            if (currentRequest === requestCounter) {
                isLoading = false;
            }
        }
    }

    async function toggleRule(id, checkbox) {
        if (!isActive || !id || checkbox.disabled) return;

        const previousState = !checkbox.checked;

        checkbox.disabled = true;

        try {
            const response = await HttpClient.patch(
                ENDPOINTS.DETECTION.TOGGLE_RULE(id)
            );

            if (!isActive) return;

            if (!response?.data || response.data.id !== id) {
                throw new Error(
                    'Invalid response when updating detection rule.'
                );
            }

            const updatedRule = normalizeRule(response.data);

            rules = rules.map(rule =>
                rule.id === id ? updatedRule : rule
            );

            renderRulesTable();

        } catch (error) {
            if (!isActive) return;

            console.error('Error changing rule status:', error);

            checkbox.checked = previousState;
            checkbox.disabled = false;

            alert(
                error.message || 'Unable to update rule status.'
            );
        }
    }

    function handleTableChange(event) {
        const checkbox = event.target.closest('.rule-toggle');

        if (!checkbox) return;

        const id = checkbox.dataset.ruleId;

        if (!id) return;

        toggleRule(id, checkbox);
    }

    async function handleCreateRule(event) {
        event.preventDefault();

        if (!isActive) return;

        const name = document.getElementById('ruleName')?.value.trim();
        const category = document.getElementById('ruleCategory')?.value;
        const severity = document.getElementById('ruleSeverity')?.value;
        const mitreTechniqueId =
            document.getElementById('ruleMitre')?.value.trim();
        const sigmaLogic =
            document.getElementById('ruleSigma')?.value.trim();

        const activeSwitch =
            document.getElementById('ruleActiveSwitch');

        const active = activeSwitch?.checked ?? false;

        if (!name || !category || !severity || !sigmaLogic) {
            alert(
                t('completeRequiredFields', 'Please complete all required fields.')
            );
            return;
        }

        const payload = {
            name,
            category: normalizeValue(category),
            mitreTechniqueId: mitreTechniqueId || null,
            severity: normalizeValue(severity),
            sigmaLogic,
            active
        };

        const submitButton = formCreateRule.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const response = await HttpClient.post(
                ENDPOINTS.DETECTION.RULES,
                payload
            );

            if (!isActive) return;

            if (!response?.data?.id) {
                throw new Error(
                    'Invalid response when creating detection rule.'
                );
            }

            const createdRule = normalizeRule(response.data);

            rules = [
                createdRule,
                ...rules.filter(rule => rule.id !== createdRule.id)
            ];

            formCreateRule.reset();

            const modalElement =
                document.getElementById('createRuleModal');

            if (modalElement && window.bootstrap?.Modal) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                modal?.hide();
            }

            renderRulesTable();

        } catch (error) {
            if (!isActive) return;

            console.error('Error creating detection rule:', error);

            alert(
                error.message || 'Unable to create detection rule.'
            );

        } finally {
            if (isActive && submitButton) {
                submitButton.disabled = false;
            }
        }
    }

    function handleSearch() {
        renderRulesTable();
    }

    function handleLanguageChange() {
        renderRulesTable();
    }

    if (tbody) {
        tbody.addEventListener('change', handleTableChange);
    }

    if (formCreateRule) {
        formCreateRule.addEventListener('submit', handleCreateRule);
    }

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', handleSearch);
    }

    document.addEventListener(
        'nova:languageChanged',
        handleLanguageChange
    );

    window.loadDetectionRules = loadRules;
    window.renderRulesTable = renderRulesTable;

    function destroyDetectionModule() {
        if (!isActive) return;

        isActive = false;
        requestCounter++;

        if (tbody) {
            tbody.removeEventListener('change', handleTableChange);
        }

        if (formCreateRule) {
            formCreateRule.removeEventListener('submit', handleCreateRule);
        }

        if (searchInput) {
            searchInput.removeEventListener('input', handleSearch);
        }

        if (statusFilter) {
            statusFilter.removeEventListener('change', handleSearch);
        }

        document.removeEventListener(
            'nova:languageChanged',
            handleLanguageChange
        );

        if (window.loadDetectionRules === loadRules) {
            window.loadDetectionRules = previousGlobals.load;
        }

        if (window.renderRulesTable === renderRulesTable) {
            window.renderRulesTable = previousGlobals.render;
        }

        if (window.destroyCurrentModule === destroyDetectionModule) {
            window.destroyCurrentModule = previousGlobals.destroy;
        }

        rules = [];
        isLoading = false;
    }

    window.destroyCurrentModule = destroyDetectionModule;

    loadRules();

})();
