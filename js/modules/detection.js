
(function() {
    const tbody = document.getElementById('table-rules-body');
    const statActive = document.getElementById('stat-active-rules');
    const statDisabled = document.getElementById('stat-disabled-rules');
    const formCreateRule = document.getElementById('createRuleForm');

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

    function translateCategory(category) {
        const keys = {
            Authentication: 'authentication',
            Execution: 'execution',
            'Initial Access': 'initialAccess',
            Impact: 'impact',
            Reconnaissance: 'reconnaissance',
            Custom: 'custom'
        };

        return t(keys[category], category);
    }

    let syntheticRules = [
        {
            id: "R-001",
            name: "Multiple Failed Logins",
            category: "Authentication",
            mitre: "T1110",
            severity: "High",
            color: "#F97316",
            hits: 45,
            active: true
        },
        {
            id: "R-002",
            name: "Suspicious PowerShell Execution",
            category: "Execution",
            mitre: "T1059.001",
            severity: "Critical",
            color: "#EF4444",
            hits: 2,
            active: true
        },
        {
            id: "R-003",
            name: "Login from Unusual Location",
            category: "Initial Access",
            mitre: "T1078",
            severity: "Medium",
            color: "#EAB308",
            hits: 12,
            active: true
        },
        {
            id: "R-004",
            name: "Ransomware Extension Detected",
            category: "Impact",
            mitre: "T1486",
            severity: "Critical",
            color: "#EF4444",
            hits: 0,
            active: true
        },
        {
            id: "R-005",
            name: "Impossible Travel",
            category: "Authentication",
            mitre: "T1078",
            severity: "Medium",
            color: "#EAB308",
            hits: 3,
            active: true
        },
        {
            id: "R-006",
            name: "Port Scan Activity",
            category: "Reconnaissance",
            mitre: "T1046",
            severity: "Low",
            color: "#06B6D4",
            hits: 156,
            active: false
        }
    ];

    function calculateStats() {
        let active = 0;
        let disabled = 0;

        syntheticRules.forEach(rule => {
            if (rule.active) active++;
            else disabled++;
        });

        if (statActive) statActive.innerText = active;
        if (statDisabled) statDisabled.innerText = disabled;
    }

    function renderRulesTable() {
        if (!tbody) return;

        tbody.innerHTML = '';

        syntheticRules.forEach((rule, index) => {
            const tr = document.createElement('tr');

            if (!rule.active) {
                tr.style.opacity = '0.6';
            }

            tr.innerHTML = `
                <td class="text-center">
                    <div class="form-check form-switch d-flex justify-content-center">
                        <input
                            class="form-check-input"
                            type="checkbox"
                            ${rule.active ? 'checked' : ''}
                            onchange="toggleRule(${index})"
                            aria-label="${rule.active
                                ? t('disableRule', 'Disable rule')
                                : t('enableRule', 'Enable rule')} ${rule.id}">
                    </div>
                </td>

                <td style="font-weight: 600; color: ${rule.active ? '#F8FAFC' : '#94A3B8'};">
                    ${rule.name}
                </td>

                <td>
                    ${translateCategory(rule.category)}
                </td>

                <td style="font-family: monospace; color: var(--primary);">
                    ${rule.mitre}
                </td>

                <td>
                    <span class="badge"
                          style="background-color: ${rule.color}20; color: ${rule.color}; border: 1px solid ${rule.color};">
                        ${translateSeverity(rule.severity)}
                    </span>
                </td>

                <td class="text-center fw-bold"
                    style="color: ${rule.hits > 0 ? '#F8FAFC' : '#94A3B8'}">
                    ${rule.hits}
                </td>

                <td class="text-center">
                    <button
                        class="btn btn-sm btn-outline-info py-0 px-2"
                        title="${t('editLogic', 'Edit Logic')}"
                        aria-label="${t('editLogic', 'Edit Logic')} ${rule.id}"
                        onclick="editRule('${rule.id}')">
                        <i class="bi bi-code-slash"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        calculateStats();
    }

    window.toggleRule = function(index) {
        if (!syntheticRules[index]) return;

        syntheticRules[index].active = !syntheticRules[index].active;

        renderRulesTable();
    };

    window.editRule = function(id) {
        console.log("Opening rule editor for:", id);
    };

    if (formCreateRule) {
        formCreateRule.addEventListener('submit', (e) => {
            e.preventDefault();

            const modalEl = document.getElementById('createRuleModal');
            const modal = bootstrap.Modal.getInstance(modalEl);

            const severity = e.target.querySelectorAll('select')[0].value;

            const isCritical = severity === 'Critical';
            const isHigh = severity === 'High';

            const color = isCritical
                ? '#EF4444'
                : (isHigh ? '#F97316' : '#EAB308');

            const newRule = {
                id: "R-00" + (syntheticRules.length + 1),
                name: e.target.querySelectorAll('input[type="text"]')[0].value,
                category: "Custom",
                mitre: e.target.querySelectorAll('input[type="text"]')[1].value || "N/A",
                severity: severity,
                color: color,
                hits: 0,
                active: document.getElementById('ruleActiveSwitch').checked
            };

            syntheticRules.unshift(newRule);

            renderRulesTable();

            formCreateRule.reset();
            modal?.hide();
        });
    }

    // Actualiza categorías y severidades sin modificar los datos originales.
    document.addEventListener('nova:languageChanged', renderRulesTable);

    renderRulesTable();
})();
