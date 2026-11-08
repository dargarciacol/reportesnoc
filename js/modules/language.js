
(function () {
    'use strict';

    // ==========================================
    // CONFIGURACIÓN
    // ==========================================

    const STORAGE_KEY = 'nova-siem-language';
    const DEFAULT_LANGUAGE = 'es';

    // ==========================================
    // DICCIONARIO DE TRADUCCIONES
    // ==========================================

    const translations = {

        // ======================================
        // ESPAÑOL
        // ======================================

        es: {

            // Navegación
            mainMenu: 'Menú principal',
            dashboard: 'Panel de control',
            events: 'Gestión de eventos',
            alerts: 'Alertas',
            incidents: 'Incidentes',
            investigations: 'Investigaciones',
            security: 'Seguridad',
            detection: 'Reglas de detección',
            reports: 'Reportes',
            logout: 'Cerrar sesión',
            systemOnline: 'Sistema operativo',
            loading: 'Cargando módulo...',

            // Dashboard
            dashboardTitle: 'Centro de operaciones de seguridad',
            dashboardSubtitle: 'Resumen general de las operaciones de seguridad',
            systemOperational: 'Sistema operativo',
            refresh: 'Actualizar',
            totalEvents: 'Eventos totales',
            eventsProcessed: 'Eventos procesados',
            activeAlerts: 'Alertas activas',
            requiringAttention: 'Requieren atención',
            openIncidents: 'Incidentes abiertos',
            underInvestigation: 'En investigación',
            activeRules: 'Reglas activas',
            monitoringThreats: 'Monitoreando amenazas',
            eventActivity: 'Actividad de eventos',
            eventVolume: 'Volumen de eventos',
            last24Hours: 'Últimas 24 horas',
            last7Days: 'Últimos 7 días',
            last30Days: 'Últimos 30 días',
            alertSeverity: 'Severidad de alertas',
            severityDistribution: 'Distribución de severidad',
            recentAlerts: 'Alertas recientes',
            viewAll: 'Ver todas',
            alertId: 'ID de alerta',
            description: 'Descripción',
            severity: 'Severidad',
            status: 'Estado',
            incidentOverview: 'Resumen de incidentes',
            criticalIncidents: 'Incidentes críticos',
            highIncidents: 'Incidentes altos',
            mediumIncidents: 'Incidentes medios',
            totalOpen: 'Total abiertos',
            systemActivity: 'Actividad del sistema',
            liveMonitoring: 'Monitoreo en vivo',
            timestamp: 'Fecha y hora',
            activity: 'Actividad',
            source: 'Origen',
            result: 'Resultado',
            totalAlerts: 'Alertas totales',

            // Severidades
            critical: 'Crítica',
            high: 'Alta',
            medium: 'Media',
            low: 'Baja',

            // Estados generales
            new: 'Nueva',
            inProgress: 'En progreso',
            underInvestigationStatus: 'En investigación',
            resolved: 'Resuelta',
            escalated: 'Escalada',
            falsePositive: 'Falso positivo',
            triage: 'Clasificación inicial',
            containment: 'Contención',
            eradication: 'Erradicación',
            recovery: 'Recuperación',
            closed: 'Cerrado',
            active: 'Activa',
            disabled: 'Deshabilitada',
            unassigned: 'Sin asignar',

            // Eventos
            eventManagement: 'Gestión de eventos',
            uploadEvents: 'Cargar eventos',
            searchEvents: 'Buscar eventos...',
            date: 'Fecha',
            time: 'Hora',
            user: 'Usuario',
            eventType: 'Tipo de evento',
            action: 'Acción',
            ipAddress: 'Dirección IP',
            viewDetails: 'Ver detalles',
            refreshEvents: 'Actualizar eventos',
            export: 'Exportar',
            processing: 'Procesando...',
            processNormalize: 'Procesar y normalizar',
            uploadSuccess: 'Éxito: eventos normalizados e incorporados correctamente.',
            authentication: 'Autenticación',
            authenticationCategory: 'Autenticación',
            execution: 'Ejecución',
            executionCategory: 'Ejecución',
            processExecution: 'Ejecución de procesos',
            networkConnection: 'Conexión de red',
            fileAccess: 'Acceso a archivos',
            configuration: 'Configuración',
            dataIngestion: 'Ingesta de datos',
            loginFailed: 'Inicio de sesión fallido',
            blockedByFirewall: 'Bloqueado por el firewall',
            serviceStopped: 'Servicio detenido',
            excelFileProcessed: 'Archivo Excel procesado',
            uploadTitle: 'Cargar archivo de eventos',
            selectFile: 'Seleccionar archivo',
            supportedFormats: 'Formatos admitidos: CSV, XLSX y XLS',
            upload: 'Cargar',
            normalize: 'Normalizar',
            normalisedIngested: 'Eventos normalizados e incorporados correctamente.',

            // Alertas
            alertManagement: 'Gestión de alertas',
            searchAlerts: 'Buscar alertas...',
            assignee: 'Responsable',
            assignToMe: 'Asignarme',
            investigate: 'Investigar',
            escalateToIncident: 'Escalar a incidente',
            markResolved: 'Marcar como resuelta',
            markFalsePositive: 'Marcar como falso positivo',
            unassignedAlerts: 'Alertas sin asignar',
            bulkActions: 'Acciones masivas',
            selectAll: 'Seleccionar todas',
            selectAlert: 'Seleccionar alerta',
            alertActions: 'Acciones de alerta',
            filterStatus: 'Filtrar por estado',
            filterAssignee: 'Filtrar por responsable',
            newAlerts: 'Alertas nuevas',
            inProgressAlerts: 'Alertas en progreso',
            escalatedAlerts: 'Alertas escaladas',
            falsePositiveAlerts: 'Falsos positivos',

            // Incidentes
            incidentManagement: 'Gestión de incidentes',
            declareMajorIncident: 'Declarar incidente mayor',
            createIncident: 'Crear incidente',
            incidentTitle: 'Título del incidente',
            hypothesis: 'Hipótesis',
            assets: 'Activos',
            lifecycleProgress: 'Progreso del ciclo de vida',
            workspace: 'Espacio de trabajo',
            createIncidentSuccess: 'Incidente creado correctamente.',
            incidentType: 'Tipo de incidente',
            incidentSeverity: 'Severidad del incidente',
            incidentStatus: 'Estado del incidente',
            assignedTo: 'Asignado a',
            incidentDescription: 'Descripción del incidente',
            incidentCreated: 'Incidente creado',
            incidentProgress: 'Progreso del incidente',
            alertsCount: 'Alertas',
            createNewIncident: 'Crear nuevo incidente',
            majorIncidentWarning: 'Este incidente será clasificado como mayor.',
            malwareExecution: 'Ejecución de malware',
            compromisedCredentials: 'Credenciales comprometidas',
            insiderThreat: 'Amenaza interna',
            dataExfiltration: 'Exfiltración de datos',
            phishingCampaign: 'Campaña de phishing',

            // Investigaciones
            investigationWorkspace: 'Espacio de investigación',
            loggedInto: 'Inició sesión en',
            spawned: 'Generó',
            executed: 'Ejecutó',
            c2Connection: 'Conexión C2',
            processCreation: 'Creación de proceso',
            networkConnect: 'Conexión de red',
            fileWrite: 'Escritura de archivo',
            facts: 'Hechos',
            inferences: 'Inferencias',
            pending: 'Pendientes',
            addNotebookEntry: 'Introduce una nueva anotación:',
            notebookPrompt: 'Introduce una nueva anotación:',
            verdictSubmitted: 'Veredicto enviado. En espera de autorización del administrador de SecOps.',
            investigationLead: 'Responsable de investigación',
            openedAt: 'Abierto el',
            verdict: 'Veredicto',
            confidence: 'Nivel de confianza',
            submitVerdict: 'Enviar veredicto',
            malicious: 'Malicioso',
            benign: 'Benigno',
            inconclusive: 'No concluyente',
            factPowerShell: 'Se observó la ejecución de PowerShell en el endpoint.',
            factConnection: 'Se detectó una conexión con una IP externa.',
            inferenceC2: 'La conexión podría corresponder a comunicación C2.',
            pendingPayload: 'Analizar el contenido del payload.',
            pendingFirewall: 'Verificar los registros del firewall.',
            coseLayout: 'Distribución COSE',
            gridLayout: 'Distribución en cuadrícula',

            // Detección
            detectionEngine: 'Motor de detección',
            rulesLab: 'Laboratorio de reglas',
            createRule: 'Crear regla',
            ruleName: 'Nombre de la regla',
            category: 'Categoría',
            activeRulesLabel: 'Reglas activas',
            disabledRules: 'Reglas deshabilitadas',
            editLogic: 'Editar lógica',
            custom: 'Personalizada',
            initialAccess: 'Acceso inicial',
            impact: 'Impacto',
            reconnaissance: 'Reconocimiento',
            disableRule: 'Desactivar regla',
            enableRule: 'Activar regla',
            ruleStatus: 'Estado de la regla',
            ruleSeverity: 'Severidad de la regla',
            mitreTechnique: 'Técnica MITRE ATT&CK',
            detectionLogic: 'Lógica de detección',
            sigmaRule: 'Regla Sigma',
            activeRule: 'Regla activa',
            ruleCreated: 'Regla creada correctamente.',
            ruleEnabled: 'Regla activada.',
            ruleDisabled: 'Regla desactivada.',
            totalHits: 'Coincidencias',

            // Reportes
            reportingTitle: 'Informes y cumplimiento',
            reportingCompliance: 'Informes y cumplimiento',
            generateNewReport: 'Generar nuevo informe',
            totalReports: 'Total de informes',
            incidentReports: 'Informes de incidentes',
            incidentSummaries: 'Resúmenes de incidentes',
            executiveCompliance: 'Informes ejecutivos y de cumplimiento',
            complianceReports: 'Informes de cumplimiento',
            allTypes: 'Todos los tipos',
            incidentSummary: 'Resumen de incidente',
            executiveBrief: 'Informe ejecutivo',
            complianceAudit: 'Auditoría de cumplimiento',
            generateReport: 'Generar informe',
            generate: 'Generar',
            compiling: 'Generando...',
            compileGenerate: 'Preparar y generar',
            download: 'Descargar',
            reportSuccess: 'Informe generado correctamente y listo para descargar.',
            generatedReady: 'generado y listo para descargar.',
            report: 'Informe',
            author: 'Autor',
            format: 'Formato',
            reportId: 'ID del informe',
            generatedOn: 'Generado el',
            reportGenerator: 'Generador de informes',
            reportType: 'Tipo de informe',
            executiveBriefWeekly: 'Informe ejecutivo semanal',
            targetIncidentId: 'ID del incidente objetivo',
            incidentIdExample: 'Ejemplo: INC-1002',
            pdfDocument: 'Documento PDF',
            csvExport: 'Exportación CSV',
            jsonRawData: 'Datos sin procesar JSON',
            searchReports: 'Buscar informes...',
            reportTitle: 'Título del informe',
            reportGenerated: 'Informe generado',
            system: 'Sistema',

            // Autenticación
            authenticating: 'Autenticando...',
            establishSecureSession: 'Establecer sesión segura',
            invalidCredentials: 'Credenciales incorrectas. Inténtalo nuevamente.',
            login: 'Iniciar sesión',
            username: 'Usuario',
            password: 'Contraseña',
            secureAccess: 'Acceso seguro',
            welcomeBack: 'Bienvenido de nuevo',
            signIn: 'Ingresar',
            signingOut: 'Cerrando sesión...',

            // Utilidades
            search: 'Buscar...',
            filter: 'Filtrar',
            all: 'Todos',
            cancel: 'Cancelar',
            save: 'Guardar',
            delete: 'Eliminar',
            edit: 'Editar',
            close: 'Cerrar',
            confirm: 'Confirmar',
            submit: 'Enviar',
            details: 'Detalles',
            name: 'Nombre',
            title: 'Título',
            type: 'Tipo',
            dateCreated: 'Fecha de creación',
            success: 'Éxito',
            error: 'Error',
            warning: 'Advertencia',
            information: 'Información',
            noData: 'No hay datos disponibles',
            loadingData: 'Cargando datos...',
            processingError: 'Ocurrió un error durante el procesamiento.',
            refreshData: 'Actualizar datos',
            actions: 'Acciones',
            yes: 'Sí',
            no: 'No',
            system: 'Sistema'
        },

        // ======================================
        // ENGLISH
        // ======================================

        en: {

            // Navigation
            mainMenu: 'Main menu',
            dashboard: 'Dashboard',
            events: 'Event management',
            alerts: 'Alerts',
            incidents: 'Incidents',
            investigations: 'Investigations',
            security: 'Security',
            detection: 'Detection rules',
            reports: 'Reports',
            logout: 'Log out',
            systemOnline: 'System operational',
            loading: 'Loading module...',

            // Dashboard
            dashboardTitle: 'Security Operations Center',
            dashboardSubtitle: 'Security operations overview',
            systemOperational: 'System operational',
            refresh: 'Refresh',
            totalEvents: 'Total events',
            eventsProcessed: 'Events processed',
            activeAlerts: 'Active alerts',
            requiringAttention: 'Requiring attention',
            openIncidents: 'Open incidents',
            underInvestigation: 'Under investigation',
            activeRules: 'Active rules',
            monitoringThreats: 'Monitoring threats',
            eventActivity: 'Event activity',
            eventVolume: 'Event volume',
            last24Hours: 'Last 24 hours',
            last7Days: 'Last 7 days',
            last30Days: 'Last 30 days',
            alertSeverity: 'Alert severity',
            severityDistribution: 'Severity distribution',
            recentAlerts: 'Recent alerts',
            viewAll: 'View all',
            alertId: 'Alert ID',
            description: 'Description',
            severity: 'Severity',
            status: 'Status',
            incidentOverview: 'Incident overview',
            criticalIncidents: 'Critical incidents',
            highIncidents: 'High incidents',
            mediumIncidents: 'Medium incidents',
            totalOpen: 'Total open',
            systemActivity: 'System activity',
            liveMonitoring: 'Live monitoring',
            timestamp: 'Timestamp',
            activity: 'Activity',
            source: 'Source',
            result: 'Result',
            totalAlerts: 'Total alerts',

            // Severity
            critical: 'Critical',
            high: 'High',
            medium: 'Medium',
            low: 'Low',

            // General statuses
            new: 'New',
            inProgress: 'In Progress',
            underInvestigationStatus: 'Under Investigation',
            resolved: 'Resolved',
            escalated: 'Escalated',
            falsePositive: 'False Positive',
            triage: 'Triage',
            containment: 'Containment',
            eradication: 'Eradication',
            recovery: 'Recovery',
            closed: 'Closed',
            active: 'Active',
            disabled: 'Disabled',
            unassigned: 'Unassigned',

            // Events
            eventManagement: 'Event Management',
            uploadEvents: 'Upload events',
            searchEvents: 'Search events...',
            date: 'Date',
            time: 'Time',
            user: 'User',
            eventType: 'Event type',
            action: 'Action',
            ipAddress: 'IP address',
            viewDetails: 'View details',
            refreshEvents: 'Refresh events',
            export: 'Export',
            processing: 'Processing...',
            processNormalize: 'Process & Normalize',
            uploadSuccess: 'Success: Events normalized and ingested successfully.',
            authentication: 'Authentication',
            authenticationCategory: 'Authentication',
            execution: 'Execution',
            executionCategory: 'Execution',
            processExecution: 'Process Execution',
            networkConnection: 'Network Connection',
            fileAccess: 'File Access',
            configuration: 'Configuration',
            dataIngestion: 'Data Ingestion',
            loginFailed: 'Login Failed',
            blockedByFirewall: 'Blocked by Firewall',
            serviceStopped: 'Service Stopped',
            excelFileProcessed: 'Excel File Processed',
            uploadTitle: 'Upload event file',
            selectFile: 'Select file',
            supportedFormats: 'Supported formats: CSV, XLSX and XLS',
            upload: 'Upload',
            normalize: 'Normalize',
            normalisedIngested: 'Events normalized and ingested successfully.',

            // Alerts
            alertManagement: 'Alert Management',
            searchAlerts: 'Search alerts...',
            assignee: 'Assignee',
            assignToMe: 'Assign to Me',
            investigate: 'Investigate',
            escalateToIncident: 'Escalate to Incident',
            markResolved: 'Mark Resolved',
            markFalsePositive: 'False Positive',
            unassignedAlerts: 'Unassigned alerts',
            bulkActions: 'Bulk actions',
            selectAll: 'Select all',
            selectAlert: 'Select alert',
            alertActions: 'Alert actions',
            filterStatus: 'Filter by status',
            filterAssignee: 'Filter by assignee',
            newAlerts: 'New alerts',
            inProgressAlerts: 'Alerts in progress',
            escalatedAlerts: 'Escalated alerts',
            falsePositiveAlerts: 'False positives',

            // Incidents
            incidentManagement: 'Incident Management',
            declareMajorIncident: 'Declare major incident',
            createIncident: 'Create incident',
            incidentTitle: 'Incident title',
            hypothesis: 'Hypothesis',
            assets: 'Assets',
            lifecycleProgress: 'Lifecycle progress',
            workspace: 'Workspace',
            createIncidentSuccess: 'Incident created successfully.',
            incidentType: 'Incident type',
            incidentSeverity: 'Incident severity',
            incidentStatus: 'Incident status',
            assignedTo: 'Assigned to',
            incidentDescription: 'Incident description',
            incidentCreated: 'Incident created',
            incidentProgress: 'Incident progress',
            alertsCount: 'Alerts',
            createNewIncident: 'Create new incident',
            majorIncidentWarning: 'This incident will be classified as major.',
            malwareExecution: 'Malware Execution',
            compromisedCredentials: 'Compromised Credentials',
            insiderThreat: 'Insider Threat',
            dataExfiltration: 'Data Exfiltration',
            phishingCampaign: 'Phishing Campaign',

            // Investigations
            investigationWorkspace: 'Investigation workspace',
            loggedInto: 'Logged into',
            spawned: 'Spawned',
            executed: 'Executed',
            c2Connection: 'C2 Connection',
            processCreation: 'Process Creation',
            networkConnect: 'Network Connect',
            fileWrite: 'File Write',
            facts: 'Facts',
            inferences: 'Inferences',
            pending: 'Pending',
            addNotebookEntry: 'Enter new notebook entry:',
            notebookPrompt: 'Enter new notebook entry:',
            verdictSubmitted: 'Verdict submitted. Awaiting SecOps Manager authorization.',
            investigationLead: 'Investigation lead',
            openedAt: 'Opened at',
            verdict: 'Verdict',
            confidence: 'Confidence level',
            submitVerdict: 'Submit verdict',
            malicious: 'Malicious',
            benign: 'Benign',
            inconclusive: 'Inconclusive',
            factPowerShell: 'PowerShell execution was observed on the endpoint.',
            factConnection: 'A connection to an external IP was detected.',
            inferenceC2: 'The connection may correspond to C2 communication.',
            pendingPayload: 'Analyze the payload contents.',
            pendingFirewall: 'Review firewall logs.',
            coseLayout: 'COSE layout',
            gridLayout: 'Grid layout',

            // Detection
            detectionEngine: 'Detection Engine',
            rulesLab: 'Rules Lab',
            createRule: 'Create rule',
            ruleName: 'Rule name',
            category: 'Category',
            activeRulesLabel: 'Active rules',
            disabledRules: 'Disabled rules',
            editLogic: 'Edit Logic',
            custom: 'Custom',
            initialAccess: 'Initial Access',
            impact: 'Impact',
            reconnaissance: 'Reconnaissance',
            disableRule: 'Disable rule',
            enableRule: 'Enable rule',
            ruleStatus: 'Rule status',
            ruleSeverity: 'Rule severity',
            mitreTechnique: 'MITRE ATT&CK technique',
            detectionLogic: 'Detection logic',
            sigmaRule: 'Sigma rule',
            activeRule: 'Active rule',
            ruleCreated: 'Rule created successfully.',
            ruleEnabled: 'Rule enabled.',
            ruleDisabled: 'Rule disabled.',
            totalHits: 'Total hits',

            // Reports
            reportingTitle: 'Reporting & Compliance',
            reportingCompliance: 'Reporting & Compliance',
            generateNewReport: 'Generate new report',
            totalReports: 'Total reports',
            incidentReports: 'Incident reports',
            incidentSummaries: 'Incident summaries',
            executiveCompliance: 'Executive and compliance reports',
            complianceReports: 'Compliance reports',
            allTypes: 'All types',
            incidentSummary: 'Incident Summary',
            executiveBrief: 'Executive Brief',
            complianceAudit: 'Compliance Audit',
            generateReport: 'Generate report',
            generate: 'Generate',
            compiling: 'Compiling...',
            compileGenerate: 'Compile & Generate',
            download: 'Download',
            reportSuccess: 'Report generated successfully and ready for download.',
            generatedReady: 'generated and ready for download.',
            report: 'Report',
            author: 'Author',
            format: 'Format',
            reportId: 'Report ID',
            generatedOn: 'Generated on',
            reportGenerator: 'Report generator',
            reportType: 'Report type',
            executiveBriefWeekly: 'Weekly executive brief',
            targetIncidentId: 'Target incident ID',
            incidentIdExample: 'Example: INC-1002',
            pdfDocument: 'PDF document',
            csvExport: 'CSV export',
            jsonRawData: 'JSON raw data',
            searchReports: 'Search reports...',
            reportTitle: 'Report title',
            reportGenerated: 'Report generated',
            system: 'System',

            // Authentication
            authenticating: 'Authenticating...',
            establishSecureSession: 'Establish Secure Session',
            invalidCredentials: 'Invalid credentials. Please try again.',
            login: 'Log in',
            username: 'Username',
            password: 'Password',
            secureAccess: 'Secure access',
            welcomeBack: 'Welcome back',
            signIn: 'Sign in',
            signingOut: 'Signing out...',

            // Utilities
            search: 'Search...',
            filter: 'Filter',
            all: 'All',
            cancel: 'Cancel',
            save: 'Save',
            delete: 'Delete',
            edit: 'Edit',
            close: 'Close',
            confirm: 'Confirm',
            submit: 'Submit',
            details: 'Details',
            name: 'Name',
            title: 'Title',
            type: 'Type',
            dateCreated: 'Created at',
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            information: 'Information',
            noData: 'No data available',
            loadingData: 'Loading data...',
            processingError: 'An error occurred during processing.',
            refreshData: 'Refresh data',
            actions: 'Actions',
            yes: 'Yes',
            no: 'No',
            system: 'System'
        }
    };

    // ==========================================
    // OBTENER IDIOMA ACTUAL
    // ==========================================

    function getCurrentLanguage() {
        try {
            const savedLanguage = localStorage.getItem(STORAGE_KEY);

            return translations[savedLanguage]
                ? savedLanguage
                : DEFAULT_LANGUAGE;

        } catch (error) {
            console.warn('Unable to access language storage:', error);
            return DEFAULT_LANGUAGE;
        }
    }

    // ==========================================
    // TRADUCCIÓN CENTRAL
    // ==========================================

    function t(key, fallback = null) {
        const language = getCurrentLanguage();

        return translations[language]?.[key]
            ?? fallback
            ?? translations[DEFAULT_LANGUAGE]?.[key]
            ?? key;
    }

    // ==========================================
    // TRADUCIR ELEMENTOS SIN DESTRUIR ICONOS
    // ==========================================

    function translateElement(element, translatedText) {
        const textNode = Array.from(element.childNodes).find(
            node =>
                node.nodeType === Node.TEXT_NODE &&
                node.nodeValue.trim() !== ''
        );

        if (textNode) {
            textNode.nodeValue = translatedText;
        } else {
            element.appendChild(
                document.createTextNode(translatedText)
            );
        }
    }

    // ==========================================
    // APLICAR TRADUCCIONES AL DOM
    // ==========================================

    function translatePage(language = getCurrentLanguage()) {
        if (!translations[language]) {
            language = DEFAULT_LANGUAGE;
        }

        document.documentElement.lang = language;

        const dictionary = translations[language];

        // Texto visible
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');

            if (Object.prototype.hasOwnProperty.call(dictionary, key)) {
                translateElement(element, dictionary[key]);
            }
        });

        // Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');

            if (Object.prototype.hasOwnProperty.call(dictionary, key)) {
                element.setAttribute('placeholder', dictionary[key]);
            }
        });

        // Atributos title
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');

            if (Object.prototype.hasOwnProperty.call(dictionary, key)) {
                element.setAttribute('title', dictionary[key]);
            }
        });

        // Etiquetas accesibles
        document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
            const key = element.getAttribute('data-i18n-aria-label');

            if (Object.prototype.hasOwnProperty.call(dictionary, key)) {
                element.setAttribute('aria-label', dictionary[key]);
            }
        });

        // Actualizar selector de idioma
        const selector = document.getElementById('languageSelector');

        if (selector && selector.value !== language) {
            selector.value = language;
        }
    }

    // ==========================================
    // CAMBIAR IDIOMA
    // ==========================================

    function changeLanguage(language) {
        if (!translations[language]) {
            console.warn('Unsupported language:', language);
            return;
        }

        try {
            localStorage.setItem(STORAGE_KEY, language);
        } catch (error) {
            console.warn('Unable to save language preference:', error);
        }

        translatePage(language);

        // Notificar a los módulos dinámicos
        document.dispatchEvent(
            new CustomEvent('nova:languageChanged', {
                detail: { language }
            })
        );
    }

    // ==========================================
    // EXPONER FUNCIONES GLOBALMENTE
    // ==========================================

    window.translations = translations;
    window.t = t;
    window.getCurrentLanguage = getCurrentLanguage;
    window.translatePage = translatePage;
    window.changeLanguage = changeLanguage;

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    function initializeLanguage() {
        const selector = document.getElementById('languageSelector');

        if (selector) {
            selector.value = getCurrentLanguage();

            // Evitar registrar el evento más de una vez
            if (!selector.dataset.languageInitialized) {
                selector.addEventListener('change', event => {
                    changeLanguage(event.target.value);
                });

                selector.dataset.languageInitialized = 'true';
            }
        }

        translatePage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initializeLanguage,
            { once: true }
        );
    } else {
        initializeLanguage();
    }

})();
