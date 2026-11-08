
(function () {
    'use strict';

    // =========================================================
    // DOM
    // =========================================================

    const getElement = id => document.getElementById(id);

    const tbody = getElement('table-reports-body');
    const formGenerateReport = getElement('generateReportForm');
    const typeSelect = getElement('report-type-select');
    const formatSelect = getElement('report-format-select');
    const incidentContainer = getElement('incident-id-container');
    const incidentInput = getElement('report-incident-id');
    const btnSubmit = getElement('btn-submit-report');
    const reportStatus = getElement('reportStatus');

    const statTotal = getElement('stat-total-reports');
    const statIncident = getElement('stat-incident-reports');
    const statCompliance = getElement('stat-compliance-reports');

    const searchInput = getElement('search-reports');
    const filterType = getElement('filter-report-type');
    const filterDate = getElement('filter-report-date');

    // =========================================================
    // STATE
    // =========================================================

    let generatedReports = [];
    let isGenerating = false;
    let isActive = true;

    const originalButtonText = btnSubmit?.textContent || '';

    // =========================================================
    // HELPERS
    // =========================================================

    function translate(key, fallback) {
        return typeof window.t === 'function'
            ? window.t(key, fallback) || fallback
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

    function formatReportDate(date) {
        if (!date) return '--';

        const language = typeof window.getCurrentLanguage === 'function'
            ? window.getCurrentLanguage()
            : 'es';

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return '--';
        }

        return new Intl.DateTimeFormat(
            language === 'en' ? 'en-US' : 'es-CO',
            {
                dateStyle: 'medium',
                timeStyle: 'short'
            }
        ).format(parsedDate);
    }

    function getReportDateKey(date) {
        if (!date) return '';

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return '';
        }

        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    function translateReportType(type) {
        const translations = {
            'Incident Summary': 'incidentSummary',
            'Executive Brief': 'executiveBrief',
            'Compliance Audit': 'complianceAudit'
        };

        return translate(
            translations[type],
            type || '--'
        );
    }

    function showStatus(message, type = 'success') {
        if (!isActive || !reportStatus) return;

        reportStatus.className = `alert alert-${type} mt-3`;
        reportStatus.textContent = message;
        reportStatus.classList.remove('d-none');
    }

    function hideStatus() {
        reportStatus?.classList.add('d-none');
    }

    function setButtonLoading(loading) {
        if (!btnSubmit || !isActive) return;

        btnSubmit.disabled = loading;

        if (loading) {
            btnSubmit.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"></span>
                ${escapeHTML(translate('compiling', 'Generating...'))}
            `;
        } else {
            btnSubmit.textContent = originalButtonText ||
                translate('compileGenerate', 'Compile & Generate');
        }
    }

    // =========================================================
    // STATISTICS
    // =========================================================

    function calculateStats() {
        const incidentCount = generatedReports.filter(
            report => report.type === 'Incident Summary'
        ).length;

        const complianceCount = generatedReports.filter(
            report => report.type === 'Compliance Audit'
        ).length;

        if (statTotal) {
            statTotal.textContent = generatedReports.length;
        }

        if (statIncident) {
            statIncident.textContent = incidentCount;
        }

        if (statCompliance) {
            statCompliance.textContent = complianceCount;
        }
    }

    // =========================================================
    // FILTERING
    // =========================================================

    function getFilteredReports() {
        const search = searchInput?.value.toLowerCase().trim() || '';
        const selectedType = filterType?.value || '';
        const selectedDate = filterDate?.value || '';

        return generatedReports.filter(report => {
            const reportId = String(report.reportId || '').toLowerCase();
            const title = String(report.title || '').toLowerCase();

            const matchesSearch =
                reportId.includes(search) ||
                title.includes(search);

            const matchesType =
                !selectedType || report.type === selectedType;

            const matchesDate =
                !selectedDate ||
                getReportDateKey(report.generatedAt) === selectedDate;

            return matchesSearch && matchesType && matchesDate;
        });
    }

    // =========================================================
    // TABLE
    // =========================================================

    function renderReportsTable() {
        if (!isActive || !tbody) return;

        const filteredReports = getFilteredReports();

        tbody.innerHTML = '';

        if (!filteredReports.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        ${escapeHTML(translate(
                            'noReportsAvailable',
                            'No reports available.'
                        ))}
                    </td>
                </tr>
            `;

            calculateStats();
            return;
        }

        const formatIcons = {
            PDF: 'bi-file-earmark-pdf',
            CSV: 'bi-file-earmark-spreadsheet',
            JSON: 'bi-file-earmark-code'
        };

        filteredReports.forEach(report => {
            const tr = document.createElement('tr');

            const format = String(report.format || '').toUpperCase();
            const icon = formatIcons[format] || 'bi-file-earmark';

            const color = report.type === 'Incident Summary'
                ? '#EF4444'
                : report.type === 'Compliance Audit'
                    ? '#087F7C'
                    : '#EAB308';

            const authorHTML = report.author === 'System'
                ? `<i class="bi bi-robot me-1"></i>${escapeHTML(
                    translate('system', 'System')
                )}`
                : `<i class="bi bi-person-fill me-1"></i>${escapeHTML(
                    report.author || '--'
                )}`;

            tr.innerHTML = `
                <td style="font-family: monospace; color: var(--primary); font-weight: 600;">
                    ${escapeHTML(report.reportId)}
                </td>

                <td style="font-weight: 500; color: #F8FAFC;">
                    ${escapeHTML(report.title || '--')}
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
                          title="${escapeHTML(translate(
                              'downloadUnavailable',
                              'Download not implemented yet'
                          ))}">
                        <i class="bi ${icon}"></i>
                        <small>--</small>
                    </span>
                </td>
            `;

            tbody.appendChild(tr);
        });

        calculateStats();
    }

    // =========================================================
    // INCIDENT FIELD
    // =========================================================

    function updateIncidentField() {
        if (!typeSelect || !incidentContainer || !incidentInput) {
            return;
        }

        const isIncidentSummary =
            typeSelect.value === 'Incident Summary';

        incidentContainer.classList.toggle(
            'd-none',
            !isIncidentSummary
        );

        incidentInput.required = isIncidentSummary;

        if (!isIncidentSummary) {
            incidentInput.value = '';
        }
    }

    // =========================================================
    // GENERATE REPORT
    // =========================================================

    async function generateReport(event) {
        event.preventDefault();

        if (!isActive || isGenerating) return;

        if (!typeSelect || !formatSelect || !btnSubmit) {
            console.error('Report form elements are missing.');
            return;
        }

        const type = typeSelect.value;
        const format = formatSelect.value;
        const incidentId = incidentInput?.value.trim() || '';

        const supportedTypes = [
            'Incident Summary',
            'Executive Brief'
        ];

        if (!supportedTypes.includes(type)) {
            showStatus(
                translate(
                    'reportTypeUnavailable',
                    'This report type is not supported by the backend yet.'
                ),
                'warning'
            );
            return;
        }

        if (!format) {
            showStatus(
                translate(
                    'reportFormatRequired',
                    'Select a report format.'
                ),
                'warning'
            );
            return;
        }

        if (type === 'Incident Summary' && !incidentId) {
            showStatus(
                translate(
                    'incidentRequired',
                    'An incident ID is required.'
                ),
                'warning'
            );

            incidentInput?.focus();
            return;
        }

        const payload = {
            type,
            format
        };

        if (type === 'Incident Summary') {
            payload.incidentId = incidentId;
        }

        isGenerating = true;
        setButtonLoading(true);
        hideStatus();

        try {
            const response = await HttpClient.post(
                ENDPOINTS.REPORTS.GENERATE,
                payload
            );

            if (!isActive) return;

            const report = response?.data;

            if (
                !report ||
                typeof report !== 'object' ||
                !report.reportId ||
                !report.title ||
                !report.type ||
                !report.generatedAt
            ) {
                throw new Error(
                    translate(
                        'invalidReportResponse',
                        'The server returned an invalid report response.'
                    )
                );
            }

            const normalizedReport = {
                reportId: String(report.reportId),
                title: String(report.title),
                type: String(report.type),
                format: String(report.format || format),
                author: String(report.author || 'System'),
                generatedAt: report.generatedAt,
                incidentDetails: report.incidentDetails || null
            };

            generatedReports = [
                normalizedReport,
                ...generatedReports.filter(
                    item => item.reportId !== normalizedReport.reportId
                )
            ];

            renderReportsTable();

            showStatus(
                `${translate('success', 'Success')}: ${translate(
                    'report',
                    'Report'
                )} ${normalizedReport.reportId} ${translate(
                    'reportGenerated',
                    'generated successfully.'
                )} ${translate(
                    'reportMetadataOnly',
                    'The report information was generated; file download is not implemented.'
                )}`,
                'success'
            );

            formGenerateReport?.reset();
            updateIncidentField();

            const modalElement = getElement('generateReportModal');

            if (modalElement && window.bootstrap?.Modal) {
                const modal = window.bootstrap.Modal.getInstance(modalElement);
                modal?.hide();
            }

        } catch (error) {
            if (!isActive) return;

            console.error('Report generation failed:', error);

            showStatus(
                error.message || translate(
                    'reportGenerationError',
                    'Could not generate the report. Please try again.'
                ),
                'danger'
            );

        } finally {
            isGenerating = false;

            if (isActive) {
                setButtonLoading(false);
            }
        }
    }

    // =========================================================
    // EVENT LISTENERS
    // =========================================================

    function handleLanguageChanged() {
        renderReportsTable();

        if (!isGenerating) {
            setButtonLoading(false);
        }
    }

    function handleSearch() {
        renderReportsTable();
    }

    function handleFilter() {
        renderReportsTable();
    }

    function handleTypeChange() {
        updateIncidentField();
    }

    function initializeListeners() {
        typeSelect?.addEventListener('change', handleTypeChange);
        formGenerateReport?.addEventListener('submit', generateReport);

        searchInput?.addEventListener('input', handleSearch);
        filterType?.addEventListener('change', handleFilter);
        filterDate?.addEventListener('change', handleFilter);

        document.addEventListener(
            'nova:languageChanged',
            handleLanguageChanged
        );
    }

    function removeListeners() {
        typeSelect?.removeEventListener('change', handleTypeChange);
        formGenerateReport?.removeEventListener('submit', generateReport);

        searchInput?.removeEventListener('input', handleSearch);
        filterType?.removeEventListener('change', handleFilter);
        filterDate?.removeEventListener('change', handleFilter);

        document.removeEventListener(
            'nova:languageChanged',
            handleLanguageChanged
        );
    }

    // =========================================================
    // CLEANUP
    // =========================================================

    function destroyModule() {
        if (!isActive) return;

        isActive = false;

        removeListeners();

        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = originalButtonText;
        }

        if (window.renderReportsTable === renderReportsTable) {
            delete window.renderReportsTable;
        }

        if (window.destroyCurrentModule === destroyModule) {
            delete window.destroyCurrentModule;
        }
    }

    // =========================================================
    // PUBLIC API
    // =========================================================

    window.renderReportsTable = renderReportsTable;
    window.destroyCurrentModule = destroyModule;

    // =========================================================
    // INITIALIZATION
    // =========================================================

    initializeListeners();
    updateIncidentField();
    renderReportsTable();

})();
