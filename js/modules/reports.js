
(function () {
    const tbody = document.getElementById('table-reports-body');
    const formGenerateReport = document.getElementById('generateReportForm');
    const typeSelect = document.getElementById('report-type-select');
    const formatSelect = document.getElementById('report-format-select');
    const incidentContainer = document.getElementById('incident-id-container');
    const incidentInput = document.getElementById('report-incident-id');
    const btnSubmit = document.getElementById('btn-submit-report');
    const reportStatus = document.getElementById('reportStatus');

    const statTotal = document.getElementById('stat-total-reports');
    const statIncident = document.getElementById('stat-incident-reports');
    const statCompliance = document.getElementById('stat-compliance-reports');

    let generatedReports = [];

    function translate(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback)
            : fallback;
    }

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[char]);
    }

    function translateReportType(type) {
        const translations = {
            'Incident Summary': 'incidentSummary',
            'Executive Brief': 'executiveBrief',
            'Compliance Audit': 'complianceAudit'
        };

        return translate(translations[type], type);
    }

    function formatReportDate(date) {
        if (!date) return '--';

        const language = typeof window.getCurrentLanguage === 'function'
            ? window.getCurrentLanguage()
            : 'es';

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) return '--';

        return new Intl.DateTimeFormat(
            language === 'en' ? 'en-US' : 'es-CO',
            {
                dateStyle: 'medium',
                timeStyle: 'short'
            }
        ).format(parsedDate);
    }

    function showStatus(message, type = 'success') {
        reportStatus.className = `alert alert-${type} mt-3`;
        reportStatus.textContent = message;
    }

    function hideStatus() {
        reportStatus.classList.add('d-none');
    }

    function calculateStats() {
        const incidentCount = generatedReports.filter(
            report => report.type === 'Incident Summary'
        ).length;

        const executiveCount = generatedReports.filter(
            report => report.type === 'Executive Brief'
        ).length;

        statTotal.textContent = generatedReports.length;
        statIncident.textContent = incidentCount;
        statCompliance.textContent = executiveCount;
    }

    function renderReportsTable() {
        const searchInput = document.getElementById('search-reports');
        const typeFilter = document.getElementById('filter-report-type');
        const dateFilter = document.getElementById('filter-report-date');

        const search = searchInput?.value.toLowerCase().trim() || '';
        const selectedType = typeFilter?.value || '';
        const selectedDate = dateFilter?.value || '';

        const filteredReports = generatedReports.filter(report => {
            const matchesSearch =
                report.reportId.toLowerCase().includes(search) ||
                report.title.toLowerCase().includes(search);

            const matchesType =
                !selectedType || report.type === selectedType;

            const reportDate = report.generatedAt
                ? new Date(report.generatedAt).toISOString().split('T')[0]
                : '';

            const matchesDate =
                !selectedDate || reportDate === selectedDate;

            return matchesSearch && matchesType && matchesDate;
        });

        tbody.innerHTML = '';

        if (filteredReports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        ${translate(
                            'noReportsAvailable',
                            'No reports generated in this session.'
                        )}
                    </td>
                </tr>
            `;

            calculateStats();
            return;
        }

        filteredReports.forEach(report => {
            const tr = document.createElement('tr');

            const formatIcons = {
                PDF: 'bi-file-earmark-pdf',
                CSV: 'bi-file-earmark-spreadsheet',
                JSON: 'bi-file-earmark-code'
            };

            const icon = formatIcons[report.format] || 'bi-file-earmark';

            const color = report.type === 'Incident Summary'
                ? '#EF4444'
                : '#EAB308';

            const authorHTML = report.author === 'System'
                ? `<i class="bi bi-robot me-1"></i>${translate('system', 'System')}`
                : `<i class="bi bi-person-fill me-1"></i>${escapeHTML(report.author)}`;

            tr.innerHTML = `
                <td style="font-family: monospace; color: var(--primary); font-weight: 600;">
                    ${escapeHTML(report.reportId)}
                </td>

                <td style="font-weight: 500; color: #F8FAFC;">
                    ${escapeHTML(report.title)}
                </td>

                <td>
                    <span class="badge"
                          style="background-color: ${color}20; color: ${color}; border: 1px solid ${color};">
                        ${escapeHTML(translateReportType(report.type))}
                    </span>
                </td>

                <td style="color: var(--text-muted); font-size: 0.85rem;">
                    ${escapeHTML(formatReportDate(report.generatedAt))}
                </td>

                <td style="color: var(--text-muted); font-size: 0.9rem;">
                    ${authorHTML}
                </td>

                <td class="text-center">
                    <span class="text-muted"
                          title="${translate('downloadUnavailable', 'Download not implemented yet')}">
                        <i class="bi ${icon}"></i>
                        <small>--</small>
                    </span>
                </td>
            `;

            tbody.appendChild(tr);
        });

        calculateStats();
    }

    function updateIncidentField() {
        const isIncidentSummary = typeSelect.value === 'Incident Summary';

        incidentContainer.classList.toggle('d-none', !isIncidentSummary);
        incidentInput.required = isIncidentSummary;

        if (!isIncidentSummary) {
            incidentInput.value = '';
        }
    }

    async function generateReport(event) {
        event.preventDefault();

        const type = typeSelect.value;
        const format = formatSelect.value;
        const incidentId = incidentInput.value.trim();

        if (
            type !== 'Incident Summary' &&
            type !== 'Executive Brief'
        ) {
            showStatus(
                translate(
                    'reportTypeUnavailable',
                    'This report type is not supported by the backend yet.'
                ),
                'warning'
            );
            return;
        }

        if (type === 'Incident Summary' && !incidentId) {
            incidentInput.focus();
            return;
        }

        const payload = {
            type,
            format
        };

        if (type === 'Incident Summary') {
            payload.incidentId = incidentId;
        }

        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"></span>
            ${translate('compiling', 'Generating...')}
        `;

        hideStatus();

        try {
            const response = await HttpClient.post(
                ENDPOINTS.REPORTS.GENERATE,
                payload
            );

            const report = response?.data;

            if (!report || !report.reportId) {
                throw new Error(
                    translate(
                        'invalidReportResponse',
                        'The server returned an invalid report response.'
                    )
                );
            }

            generatedReports.unshift({
                reportId: report.reportId,
                title: report.title || 'Untitled Report',
                type: report.type || type,
                format: report.format || format,
                author: report.author || 'System',
                generatedAt: report.generatedAt || new Date().toISOString(),
                data: report.incidentDetails || null
            });

            renderReportsTable();

            showStatus(
                `${translate('success', 'Success')}: ${translate('report', 'Report')} ${report.reportId} ${translate('reportGenerated', 'generated successfully.')}`,
                'success'
            );

            formGenerateReport.reset();
            updateIncidentField();

            const modalElement = document.getElementById('generateReportModal');
            const modal = bootstrap.Modal.getInstance(modalElement);

            if (modal) {
                modal.hide();
            }

        } catch (error) {
            console.error('Report generation failed:', error);

            showStatus(
                error.message || translate(
                    'reportGenerationError',
                    'Could not generate the report. Please try again.'
                ),
                'danger'
            );

        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = translate(
                'compileGenerate',
                'Compile & Generate'
            );
        }
    }

    typeSelect.addEventListener('change', updateIncidentField);

    formGenerateReport.addEventListener('submit', generateReport);

    document.getElementById('search-reports')
        ?.addEventListener('input', renderReportsTable);

    document.getElementById('filter-report-type')
        ?.addEventListener('change', renderReportsTable);

    document.getElementById('filter-report-date')
        ?.addEventListener('change', renderReportsTable);

    document.addEventListener('nova:languageChanged', () => {
        renderReportsTable();

        if (!btnSubmit.disabled) {
            btnSubmit.textContent = translate(
                'compileGenerate',
                'Compile & Generate'
            );
        }
    });

    updateIncidentField();
    renderReportsTable();
})();
