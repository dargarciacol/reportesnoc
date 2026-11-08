
(function() {
    const tbody = document.getElementById('table-reports-body');
    const formGenerateReport = document.getElementById('generateReportForm');
    const typeSelect = document.getElementById('report-type-select');
    const incidentContainer = document.getElementById('incident-id-container');
    const incidentInput = document.getElementById('report-incident-id');
    const btnSubmit = document.getElementById('btn-submit-report');
    const reportStatus = document.getElementById('reportStatus');
    const statTotal = document.getElementById('stat-total-reports');
    const statIncident = document.getElementById('stat-incident-reports');
    const statCompliance = document.getElementById('stat-compliance-reports');

    let syntheticReports = [
        { id: "REP-089", title: "Ransomware Execution Sequence Detected", type: "Incident Summary", date: "2026-11-07T18:00:00Z", author: "s.garcia", format: "PDF", color: "#EF4444" },
        { id: "REP-088", title: "SOC Weekly Executive Brief", type: "Executive Brief", date: "2026-11-06T17:00:00Z", author: "System", format: "PDF", color: "#EAB308" },
        { id: "REP-087", title: "Suspicious Lateral Movement via WMI", type: "Incident Summary", date: "2026-11-05T10:15:00Z", author: "m.rodriguez", format: "PDF", color: "#F97316" },
        { id: "REP-086", title: "Monthly ISO 27001 Access Audit", type: "Compliance Audit", date: "2026-11-01T08:00:00Z", author: "System", format: "CSV", color: "#22C55E" }
    ];

    // Obtiene las traducciones del idioma activo.
    function translate(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback)
            : fallback;
    }

    // Traduce los tipos sin modificar sus valores internos.
    function translateReportType(type) {
        const translations = {
            'Incident Summary': 'incidentSummary',
            'Executive Brief': 'executiveBrief',
            'Compliance Audit': 'complianceAudit'
        };

        return translate(translations[type], type);
    }

    // Formatea la fecha según el idioma seleccionado.
    function formatReportDate(date) {
        const language = typeof window.getCurrentLanguage === 'function'
            ? window.getCurrentLanguage()
            : 'es';

        return new Intl.DateTimeFormat(
            language === 'en' ? 'en-US' : 'es-CO',
            {
                dateStyle: 'medium',
                timeStyle: 'short'
            }
        ).format(new Date(date));
    }

    function calculateStats() {
        let incidentCount = 0;
        let complianceCount = 0;

        syntheticReports.forEach(report => {
            if (report.type === "Incident Summary") {
                incidentCount++;
            }

            if (
                report.type === "Compliance Audit" ||
                report.type === "Executive Brief"
            ) {
                complianceCount++;
            }
        });

        statTotal.innerText = syntheticReports.length;
        statIncident.innerText = incidentCount;
        statCompliance.innerText = complianceCount;
    }

    function renderReportsTable() {
        tbody.innerHTML = '';

        syntheticReports.forEach(rep => {
            const tr = document.createElement('tr');

            let icon = 'bi-file-earmark-pdf';

            if (rep.format === 'CSV') {
                icon = 'bi-file-earmark-spreadsheet';
            }

            if (rep.format === 'JSON') {
                icon = 'bi-file-earmark-code';
            }

            const authorHTML = rep.author === 'System'
                ? `<i class="bi bi-robot me-1"></i>${translate('system', 'System')}`
                : `<i class="bi bi-person-fill me-1"></i>${rep.author}`;

            tr.innerHTML = `
                <td style="font-family: monospace; color: var(--primary); font-weight: 600;">
                    ${rep.id}
                </td>

                <td style="font-weight: 500; color: #F8FAFC;">
                    ${rep.title}
                </td>

                <td>
                    <span class="badge"
                          style="background-color: ${rep.color}20; color: ${rep.color}; border: 1px solid ${rep.color};">
                        ${translateReportType(rep.type)}
                    </span>
                </td>

                <td style="color: var(--text-muted); font-size: 0.85rem;">
                    ${formatReportDate(rep.date)}
                </td>

                <td style="color: var(--text-muted); font-size: 0.9rem;">
                    ${authorHTML}
                </td>

                <td class="text-center">
                    <button class="btn btn-sm btn-outline-info py-0 px-2"
                            onclick="downloadReport('${rep.id}')"
                            title="${translate('download', 'Download')}"
                            aria-label="${translate('download', 'Download')} ${rep.id}">
                        <i class="bi ${icon}"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        calculateStats();
    }

    typeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Incident Summary') {
            incidentContainer.classList.remove('d-none');
            incidentInput.required = true;
        } else {
            incidentContainer.classList.add('d-none');
            incidentInput.required = false;
            incidentInput.value = '';
        }
    });

    formGenerateReport.addEventListener('submit', (e) => {
        e.preventDefault();

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `
            <span class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"></span>
            ${translate('compiling', 'Compiling...')}
        `;

        reportStatus.classList.add('d-none');
        reportStatus.className = 'alert mt-3';

        setTimeout(() => {
            const type = typeSelect.value;

            const title = type === 'Incident Summary'
                ? `Incident Report: ${incidentInput.value}`
                : `${type} - ${new Date().toISOString().split('T')[0]}`;

            const color = type === 'Incident Summary'
                ? '#EF4444'
                : (type === 'Compliance Audit' ? '#22C55E' : '#EAB308');

            const newReport = {
                id: "REP-0" + (90 + syntheticReports.length),
                title: title,
                type: type,
                date: new Date().toISOString(),
                author: "s.garcia",
                format: document.getElementById('report-format-select').value,
                color: color
            };

            syntheticReports.unshift(newReport);
            renderReportsTable();

            reportStatus.classList.add('alert-success');
            reportStatus.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
            reportStatus.style.borderColor = '#22C55E';
            reportStatus.style.color = '#22C55E';

            reportStatus.textContent =
                `${translate('success', 'Success')}: ` +
                `${translate('report', 'Report')} ${newReport.id} ` +
                `${translate('generatedReady', 'generated and ready for download.')}`;

            reportStatus.classList.remove('d-none');

            btnSubmit.disabled = false;
            btnSubmit.textContent = translate(
                'compileGenerate',
                'Compile & Generate'
            );

            setTimeout(() => {
                const modalEl = document.getElementById('generateReportModal');
                const modal = bootstrap.Modal.getInstance(modalEl);

                if (modal) {
                    modal.hide();
                }

                formGenerateReport.reset();
                reportStatus.classList.add('d-none');

                incidentContainer.classList.remove('d-none');
                incidentInput.required = true;

            }, 1500);

        }, 1200);
    });

    window.downloadReport = function(id) {
        console.log("Downloading report:", id);
    };

    // Actualiza la tabla cuando cambia el idioma.
    document.addEventListener('nova:languageChanged', () => {
        renderReportsTable();

        if (!btnSubmit.disabled) {
            btnSubmit.textContent = translate(
                'compileGenerate',
                'Compile & Generate'
            );
        }
    });

    renderReportsTable();
})();
