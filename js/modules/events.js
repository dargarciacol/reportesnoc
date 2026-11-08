
(function() {
    const tbody = document.getElementById('table-events-body');
    const uploadForm = document.getElementById('uploadForm');
    const uploadStatus = document.getElementById('uploadStatus');
    const btnSubmit = document.getElementById('btn-submit-upload');
    const fileInput = document.getElementById('fileInput');

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

    function translateEventType(type) {
        const keys = {
            Authentication: 'authentication',
            'Process Execution': 'processExecution',
            'Network Connection': 'networkConnection',
            'File Access': 'fileAccess',
            Configuration: 'configuration',
            'Data Ingestion': 'dataIngestion'
        };

        return t(keys[type], type);
    }

    function translateEventAction(action) {
        const keys = {
            'Login Failed': 'loginFailed',
            'Blocked by Firewall': 'blockedByFirewall',
            'Service Stopped': 'serviceStopped',
            'Excel File Processed': 'excelFileProcessed'
        };

        return t(keys[action], action);
    }

    function formatEventDate(date) {
        const language = typeof window.getCurrentLanguage === 'function'
            ? window.getCurrentLanguage()
            : 'es';

        return new Intl.DateTimeFormat(
            language === 'en' ? 'en-US' : 'es-CO',
            {
                dateStyle: 'short',
                timeStyle: 'medium',
                timeZone: 'UTC'
            }
        ).format(new Date(date)) + ' UTC';
    }

    let syntheticEvents = [
        {
            id: "EVT-9921",
            time: "2026-11-07T16:45:00Z",
            ip: "192.168.1.45",
            user: "SYSTEM",
            type: "Authentication",
            action: "Login Failed",
            severity: "High",
            color: "#F97316"
        },
        {
            id: "EVT-9920",
            time: "2026-11-07T16:42:15Z",
            ip: "10.0.0.12",
            user: "s.garcia",
            type: "Process Execution",
            action: "powershell.exe -enc...",
            severity: "Critical",
            color: "#EF4444"
        },
        {
            id: "EVT-9919",
            time: "2026-11-07T16:30:00Z",
            ip: "203.0.113.45",
            user: "s.garcia",
            type: "Network Connection",
            action: "Blocked by Firewall",
            severity: "Medium",
            color: "#EAB308"
        },
        {
            id: "EVT-9918",
            time: "2026-11-07T15:22:10Z",
            ip: "192.168.1.100",
            user: "j.doe",
            type: "File Access",
            action: "Read shadow copy",
            severity: "Critical",
            color: "#EF4444"
        },
        {
            id: "EVT-9917",
            time: "2026-11-07T15:10:05Z",
            ip: "192.168.1.10",
            user: "admin",
            type: "Configuration",
            action: "Service Stopped",
            severity: "Low",
            color: "#06B6D4"
        }
    ];

    function renderEventsTable() {
        if (!tbody) return;

        tbody.innerHTML = '';

        syntheticEvents.forEach(evt => {
            const tr = document.createElement('tr');

            const action = evt.action === 'powershell.exe -enc...'
                || evt.action === 'Read shadow copy'
                ? evt.action
                : translateEventAction(evt.action);

            tr.innerHTML = `
                <td style="color: var(--text-muted); font-size: 0.85rem;">
                    ${formatEventDate(evt.time)}
                </td>

                <td style="font-family: monospace;">
                    ${evt.ip}
                </td>

                <td>
                    ${evt.user}
                </td>

                <td>
                    ${translateEventType(evt.type)}
                </td>

                <td>
                    ${action}
                </td>

                <td>
                    <span class="badge"
                          style="background-color: ${evt.color}20; color: ${evt.color}; border: 1px solid ${evt.color};">
                        ${translateSeverity(evt.severity)}
                    </span>
                </td>

                <td class="text-center">
                    <button class="btn btn-sm btn-outline-info py-0 px-2"
                            onclick="viewEventDetails('${evt.id}')"
                            title="${t('viewDetails', 'View details')}"
                            aria-label="${t('viewDetails', 'View details')} ${evt.id}">
                        <i class="bi bi-list-columns-reverse"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const file = fileInput.files[0];

            if (!file) return;

            btnSubmit.disabled = true;

            btnSubmit.innerHTML = `
                <span class="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"></span>
                ${t('processing', 'Processing...')}
            `;

            uploadStatus.classList.add('d-none');
            uploadStatus.className = 'alert mt-3';

            setTimeout(() => {
                uploadStatus.classList.add('alert-success');
                uploadStatus.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                uploadStatus.style.borderColor = '#22C55E';
                uploadStatus.style.color = '#22C55E';

                uploadStatus.textContent =
                    `${t('success', 'Success')}: ` +
                    `${t('normalisedIngested', 'Normalised and ingested events from')} ${file.name}`;

                syntheticEvents.unshift({
                    id: "EVT-" + Math.floor(Math.random() * 10000),
                    time: new Date().toISOString(),
                    ip: "10.10.1.55",
                    user: "ingest.service",
                    type: "Data Ingestion",
                    action: "Excel File Processed",
                    severity: "Medium",
                    color: "#EAB308"
                });

                renderEventsTable();
                uploadForm.reset();

                uploadStatus.classList.remove('d-none');
                btnSubmit.disabled = false;
                btnSubmit.textContent = t(
                    'processNormalise',
                    'Process & Normalise'
                );

            }, 1200);
        });
    }

    window.viewEventDetails = function(id) {
        console.log("Viewing event details for:", id);
    };

    // Actualiza los registros dinámicos cuando cambia ES/EN.
    document.addEventListener('nova:languageChanged', () => {
        renderEventsTable();

        if (btnSubmit && !btnSubmit.disabled) {
            btnSubmit.textContent = t(
                'processNormalise',
                'Process & Normalise'
            );
        }
    });

    renderEventsTable();
})();
