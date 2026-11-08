
(function () {
    'use strict';

    // =========================================================
    // DOM
    // =========================================================

    const tbody = document.getElementById('table-rules-body');
    const statActive = document.getElementById('stat-active-rules');
    const statDisabled = document.getElementById('stat-disabled-rules');
    const formCreateRule = document.getElementById('createRuleForm');
    const searchInput = document.getElementById('search-rules');
    const statusFilter = document.getElementById('filter-rule-status');

    // =========================================================
    // STATE
    // =========================================================

    let rules = [];
    let currentAnalysis = null;

    let isActive = true;
    let isLoading = false;
    let reloadRequested = false;
    let requestCounter = 0;

    const previousGlobals = {
        destroy: window.destroyCurrentModule,
        load: window.loadDetectionRules,
        render: window.renderRulesTable,
        analyze: window.analyzeDetectionRules,
        getAnalysis: window.getDetectionAnalysis
    };

    // =========================================================
    // CONFIGURATION
    // =========================================================

    const severityColors = {
        CRITICAL: '#EF4444',
        HIGH: '#F97316',
        MEDIUM: '#EAB308',
        LOW: '#06B6D4'
    };

    const categoryLabels = {
        INITIAL_ACCESS: 'Acceso inicial',
        EXECUTION: 'Ejecución',
        PERSISTENCE: 'Persistencia',
        PRIVILEGE_ESCALATION: 'Escalada de privilegios',
        DEFENSE_EVASION: 'Evasión de defensas',
        CREDENTIAL_ACCESS: 'Acceso a credenciales',
        DISCOVERY: 'Descubrimiento',
        LATERAL_MOVEMENT: 'Movimiento lateral',
        COLLECTION: 'Recopilación',
        COMMAND_AND_CONTROL: 'Comando y control',
        EXFILTRATION: 'Exfiltración',
        IMPACT: 'Impacto',
        CUSTOM: 'Personalizada'
    };

    // =========================================================
    // HELPERS
    // =========================================================

    function t(key, fallback) {
        if (typeof window.t === 'function') {
            return window.t(key, fallback) || fallback;
        }

        return fallback;
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

    function formatNumber(value) {
        const number = Number(value);

        return Number.isFinite(number)
            ? number.toLocaleString()
            : '0';
    }

    function normalizeRule(rule) {
        if (!rule || typeof rule !== 'object' || !rule.id) {
            throw new Error(
                'El backend devolvió una regla de detección no válida.'
            );
        }

        return {
            ...rule,
            id: String(rule.id),
            name: rule.name || '',
            category: normalizeValue(rule.category),
            mitreTechniqueId: rule.mitreTechniqueId || '',
            severity: normalizeValue(rule.severity),
            sigmaLogic: rule.sigmaLogic || '',
            active: rule.active === true,
            hitCount: Math.max(0, Number(rule.hitCount) || 0)
        };
    }

    function translateSeverity(severity) {
        const value = normalizeValue(severity);

        const labels = {
            CRITICAL: ['critical', 'Crítica'],
            HIGH: ['high', 'Alta'],
            MEDIUM: ['medium', 'Media'],
            LOW: ['low', 'Baja']
        };

        const item = labels[value];

        return item
            ? t(item[0], item[1])
            : value || '--';
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

        return t(
            keys[value],
            categoryLabels[value] || value || '--'
        );
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

    function dispatchDataUpdated(action) {
        document.dispatchEvent(
            new CustomEvent('nova:data-updated', {
                detail: {
                    source: 'detection',
                    action,
                    timestamp: new Date().toISOString()
                }
            })
        );
    }

    // =========================================================
    // AUTOMATIC DETECTION ANALYSIS
    // =========================================================

    function analyzeDetectionRules() {
        const analysis = {
            totalRules: rules.length,
            activeRules: 0,
            disabledRules: 0,

            triggeredRules: 0,
            rulesWithoutHits: 0,

            totalHits: 0,
            averageHitsPerRule: 0,

            bySeverity: {
                CRITICAL: 0,
                HIGH: 0,
                MEDIUM: 0,
                LOW: 0
            },

            byCategory: {},

            mostTriggeredRules: [],

            analyzedAt: new Date().toISOString()
        };

        rules.forEach(rule => {
            if (rule.active) {
                analysis.activeRules++;
            } else {
                analysis.disabledRules++;
            }

            const severity = normalizeValue(rule.severity);

            if (
                Object.prototype.hasOwnProperty.call(
                    analysis.bySeverity,
                    severity
                )
            ) {
                analysis.bySeverity[severity]++;
            }

            const category = normalizeValue(rule.category) || 'UNKNOWN';

            analysis.byCategory[category] =
                (analysis.byCategory[category] || 0) + 1;

            analysis.totalHits += rule.hitCount;

            if (rule.hitCount > 0) {
                analysis.triggeredRules++;
            } else {
                analysis.rulesWithoutHits++;
            }
        });

        if (analysis.totalRules > 0) {
            analysis.averageHitsPerRule =
                Number(
                    (analysis.totalHits / analysis.totalRules).toFixed(2)
                );
        }

        analysis.mostTriggeredRules = [...rules]
            .filter(rule => rule.hitCount > 0)
            .sort((a, b) => b.hitCount - a.hitCount)
            .slice(0, 5)
            .map(rule => ({
                id: rule.id,
                name: rule.name,
                category: rule.category,
                severity: rule.severity,
                hitCount: rule.hitCount
            }));

        currentAnalysis = analysis;

        // Exposición para que otros módulos puedan consultar el análisis.
        window.detectionAnalysis = analysis;

        document.dispatchEvent(
            new CustomEvent('nova:detection-analyzed', {
                detail: analysis
            })
        );

        return analysis;
    }

    function getDetectionAnalysis() {
        return currentAnalysis;
    }

    // =========================================================
    // STATISTICS
    // =========================================================

    function calculateStats() {
        if (!currentAnalysis) {
            if (statActive) statActive.textContent = '0';
            if (statDisabled) statDisabled.textContent = '0';
            return;
        }

        if (statActive) {
            statActive.textContent = formatNumber(
                currentAnalysis.activeRules
            );
        }

        if (statDisabled) {
            statDisabled.textContent = formatNumber(
                currentAnalysis.disabledRules
            );
        }
    }

    // =========================================================
    // FILTERING
    // =========================================================

    function getFilteredRules() {
        const search = searchInput?.value.trim().toLowerCase() || '';
        const status = normalizeValue(statusFilter?.value);

        return rules.filter(rule => {
            const matchesSearch =
                !search ||
                rule.name.toLowerCase().includes(search) ||
                rule.mitreTechniqueId.toLowerCase().includes(search) ||
                rule.category.toLowerCase().includes(search) ||
                rule.severity.toLowerCase().includes(search);

            const matchesStatus =
                !status ||
                (status === 'ACTIVE' && rule.active) ||
                (status === 'DISABLED' && !rule.active);

            return matchesSearch && matchesStatus;
        });
    }

    // =========================================================
    // TABLE RENDERING
    // =========================================================

    function renderRulesTable() {
        if (!isActive || !tbody) return;

        const filteredRules = getFilteredRules();

        tbody.replaceChildren();

        if (filteredRules.length === 0) {
            showTableMessage(
                rules.length === 0
                    ? t(
                        'noDetectionRules',
                        'No hay reglas de detección registradas.'
                    )
                    : t(
                        'noMatchingRules',
                        'Ninguna regla coincide con los filtros seleccionados.'
                    )
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
                            aria-label="${rule.active ? 'Desactivar' : 'Activar'} regla ${escapeHtml(rule.name)}">
                    </div>
                </td>

                <td style="font-weight: 600; color: ${rule.active ? '#F8FAFC' : '#94A3B8'};">
                    ${escapeHtml(rule.name)}
                </td>

                <td>
                    ${escapeHtml(translateCategory(rule.category))}
                </td>

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
                    ${formatNumber(rule.hitCount)}
                </td>

                <td class="text-center">
                    <button
                        class="btn btn-sm btn-outline-secondary py-0 px-2"
                        type="button"
                        disabled
                        title="La edición de reglas todavía no está disponible en el backend."
                        aria-label="Edición no disponible">
                        <i class="bi bi-lock"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

        calculateStats();
    }

    // =========================================================
    // LOAD RULES
    // =========================================================

    async function loadRules() {
        if (!isActive) return;

        // Evita solicitudes duplicadas cuando llegan varios eventos.
        if (isLoading) {
            reloadRequested = true;
            return;
        }

        if (
            !window.HttpClient ||
            !window.ENDPOINTS?.DETECTION?.RULES
        ) {
            showTableMessage(
                'La configuración de la API de reglas de detección no está disponible.',
                'danger'
            );
            return;
        }

        const currentRequest = ++requestCounter;

        isLoading = true;
        reloadRequested = false;

        showTableMessage(
            t('loading', 'Cargando reglas de detección...')
        );

        try {
            const response = await window.HttpClient.get(
                window.ENDPOINTS.DETECTION.RULES
            );

            if (!isActive || currentRequest !== requestCounter) {
                return;
            }

            if (!response || !Array.isArray(response.data)) {
                throw new Error(
                    'El backend devolvió una respuesta de reglas no válida.'
                );
            }

            rules = response.data.map(normalizeRule);

            // Primero se analiza la información recibida del backend.
            analyzeDetectionRules();

            // Después se actualiza la interfaz.
            renderRulesTable();

        } catch (error) {
            if (!isActive || currentRequest !== requestCounter) {
                return;
            }

            console.error(
                'Error al cargar las reglas de detección:',
                error
            );

            rules = [];
            currentAnalysis = null;
            window.detectionAnalysis = null;

            calculateStats();

            showTableMessage(
                error.message ||
                'No fue posible cargar las reglas de detección.',
                'danger'
            );

        } finally {
            if (currentRequest === requestCounter) {
                isLoading = false;
            }

            // Si hubo cambios mientras se cargaban las reglas,
            // se realiza una sola carga adicional.
            if (isActive && reloadRequested) {
                reloadRequested = false;
                loadRules();
            }
        }
    }

    // =========================================================
    // TOGGLE RULE
    // =========================================================

    async function toggleRule(id, checkbox) {
        if (
            !isActive ||
            !id ||
            !checkbox ||
            checkbox.disabled
        ) {
            return;
        }

        const previousState = !checkbox.checked;

        checkbox.disabled = true;

        try {
            const response = await window.HttpClient.patch(
                window.ENDPOINTS.DETECTION.TOGGLE_RULE(id)
            );

            if (!isActive) return;

            if (
                !response?.data ||
                String(response.data.id) !== String(id)
            ) {
                throw new Error(
                    'El backend devolvió una respuesta no válida al actualizar la regla.'
                );
            }

            const updatedRule = normalizeRule(response.data);

            rules = rules.map(rule =>
                rule.id === String(id) ? updatedRule : rule
            );

            // Recalcula el análisis con el estado actualizado.
            analyzeDetectionRules();
            renderRulesTable();

            dispatchDataUpdated('rule-status-updated');

        } catch (error) {
            if (!isActive) return;

            console.error(
                'Error al cambiar el estado de la regla:',
                error
            );

            checkbox.checked = previousState;
            checkbox.disabled = false;

            alert(
                error.message ||
                'No fue posible actualizar el estado de la regla.'
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

    // =========================================================
    // CREATE RULE
    // =========================================================

    async function handleCreateRule(event) {
        event.preventDefault();

        if (!isActive || !formCreateRule) return;

        const name =
            document.getElementById('ruleName')?.value.trim();

        const category =
            document.getElementById('ruleCategory')?.value;

        const severity =
            document.getElementById('ruleSeverity')?.value;

        const mitreTechniqueId =
            document.getElementById('ruleMitre')?.value.trim();

        const sigmaLogic =
            document.getElementById('ruleSigma')?.value.trim();

        const activeSwitch =
            document.getElementById('ruleActiveSwitch');

        const active = activeSwitch?.checked ?? false;

        if (!name || !category || !severity || !sigmaLogic) {
            alert(
                t(
                    'completeRequiredFields',
                    'Por favor, completa todos los campos obligatorios.'
                )
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
            const response = await window.HttpClient.post(
                window.ENDPOINTS.DETECTION.RULES,
                payload
            );

            if (!isActive) return;

            if (!response?.data?.id) {
                throw new Error(
                    'El backend devolvió una respuesta no válida al crear la regla.'
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
                const modal = window.bootstrap.Modal.getInstance(
                    modalElement
                );

                modal?.hide();
            }

            analyzeDetectionRules();
            renderRulesTable();

            dispatchDataUpdated('rule-created');

        } catch (error) {
            if (!isActive) return;

            console.error(
                'Error al crear la regla de detección:',
                error
            );

            alert(
                error.message ||
                'No fue posible crear la regla de detección.'
            );

        } finally {
            if (isActive && submitButton) {
                submitButton.disabled = false;
            }
        }
    }

    // =========================================================
    // AUTOMATIC DATA UPDATES
    // =========================================================

    function handleDataUpdated(event) {
        if (!isActive) return;

        const source = event.detail?.source;

        // La llegada de nuevos eventos puede modificar las
        // coincidencias de las reglas en el backend.
        //
        // No escuchamos "detection" para evitar un ciclo de
        // recargas cuando este módulo actualiza una regla.
        if (
            source === 'ingestion' ||
            source === 'events'
        ) {
            loadRules();
        }
    }

    // =========================================================
    // UI EVENTS
    // =========================================================

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
        formCreateRule.addEventListener(
            'submit',
            handleCreateRule
        );
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

    document.addEventListener(
        'nova:data-updated',
        handleDataUpdated
    );

    // =========================================================
    // PUBLIC API
    // =========================================================

    window.loadDetectionRules = loadRules;
    window.renderRulesTable = renderRulesTable;
    window.analyzeDetectionRules = analyzeDetectionRules;
    window.getDetectionAnalysis = getDetectionAnalysis;

    // =========================================================
    // MODULE DESTRUCTION
    // =========================================================

    function destroyDetectionModule() {
        if (!isActive) return;

        isActive = false;
        requestCounter++;
        reloadRequested = false;

        if (tbody) {
            tbody.removeEventListener(
                'change',
                handleTableChange
            );
        }

        if (formCreateRule) {
            formCreateRule.removeEventListener(
                'submit',
                handleCreateRule
            );
        }

        if (searchInput) {
            searchInput.removeEventListener(
                'input',
                handleSearch
            );
        }

        if (statusFilter) {
            statusFilter.removeEventListener(
                'change',
                handleSearch
            );
        }

        document.removeEventListener(
            'nova:languageChanged',
            handleLanguageChange
        );

        document.removeEventListener(
            'nova:data-updated',
            handleDataUpdated
        );

        if (window.loadDetectionRules === loadRules) {
            window.loadDetectionRules = previousGlobals.load;
        }

        if (window.renderRulesTable === renderRulesTable) {
            window.renderRulesTable = previousGlobals.render;
        }

        if (
            window.analyzeDetectionRules === analyzeDetectionRules
        ) {
            window.analyzeDetectionRules = previousGlobals.analyze;
        }

        if (
            window.getDetectionAnalysis === getDetectionAnalysis
        ) {
            window.getDetectionAnalysis = previousGlobals.getAnalysis;
        }

        if (
            window.destroyCurrentModule === destroyDetectionModule
        ) {
            window.destroyCurrentModule = previousGlobals.destroy;
        }

        rules = [];
        currentAnalysis = null;
        window.detectionAnalysis = null;

        isLoading = false;
    }

    window.destroyCurrentModule = destroyDetectionModule;

    // =========================================================
    // INITIALIZATION
    // =========================================================

    loadRules();

})();
