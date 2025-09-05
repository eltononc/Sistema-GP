import { renderSidebar } from './sidebar.js';
import { db, auth, app, firebaseConfig } from './firebase-config.js';
import { collection, onSnapshot, doc, deleteDoc, setDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- VARIÁVEIS GLOBAIS E CONFIGURAÇÃO ---
const appId = firebaseConfig.projectId;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let userId;
let allProcesses = [];
let currentUser = null;
let confirmCallback = null;
let allUsersWithPhotos = []; // To store users for responsible dropdown
let allDepartments = []; // To store departments for multi-select
let maturityChart = null;

let currentStep = 0; // For multi-step form

const maturityDimensions = [
    { id: 'gestaoGovernanca', name: '1. Gestão e Governança' },
    { id: 'medicaoKpi', name: '2. Medição de Desempenho (KPI)' },
    { id: 'inteligenciaArtificial', name: '3. Inteligência Artificial' },
    { id: 'documentacaoPadronizacao', name: '4. Documentação e Padronização' },
    { id: 'melhoriaContinua', name: '5. Melhoria Contínua' },
    { id: 'responsaveisPapeis', name: '6. Responsabilidades e Papéis' },
    { id: 'capacitacaoConhecimento', name: '7. Capacitação e Conhecimento' },
    { id: 'inovacaoTecnologica', name: '8. Inovação e Evolução Tecnológica' },
    { id: 'gestaoRiscos', name: '9. Gestão de Riscos' },
    { id: 'satisfacaoCliente', name: '10. Satisfação do Cliente' }
];

const maturityLevels = [
    { value: 1, name: 'Nível 1' }, { value: 2, name: 'Nível 2' },
    { value: 3, name: 'Nível 3' }, { value: 4, name: 'Nível 4' },
    { value: 5, name: 'Nível 5' }
];

const maturityDimensionLevelNames = {
    gestaoGovernanca: [
        'Ausência total de monitoramento, SLAs ou controles.',
        'Esforços isolados de monitoramento, sem padronização.',
        'SLAs e planos de ação acompanhados regularmente.',
        'Governança estruturada, com revisões periódicas e alinhamento.',
        'Governança integrada à estratégia, com ciclos contínuos.'
    ],
    medicaoKpi: [
        'Inexistência de indicadores de desempenho.',
        'Indicadores básicos utilizados de forma desorganizada.',
        'KPIs definidos para áreas críticas, com monitoramento parcial.',
        'Indicadores consolidados para decisões operacionais.',
        'KPIs estratégicos integrados à governança.'
    ],
    inteligenciaArtificial: [
        'O processo não utiliza soluções baseadas em IA.',
        'Iniciativas pontuais com automações simples ou uso limitado de dados.',
        'Projetos de IA aplicados a processos específicos ou experimentais.',
        'IA utilizada de forma consistente para suporte a decisões operacionais.',
        'Automação preditiva e IA integradas aos processos-chave.'
    ],
    documentacaoPadronizacao: [
        'Os processos não são documentados.',
        'Documentação existe, mas é mínima, desatualizada ou ignorada.',
        'Parte dos processos está documentada, com uso eventual pela equipe.',
        'Processos padronizados e institucionalizados em todas as áreas.',
        'Documentação integrada ao ciclo de melhoria contínua e uso estratégico.'
    ],
    melhoriaContinua: [
        'Não há práticas estruturadas de avaliação ou aprimoramento.',
        'Melhorias ocorrem apenas após falhas ou demandas externas.',
        'Ações corretivas realizadas, mas sem análise estruturada.',
        'Processos de melhoria com base em metas e indicadores.',
        'Cultura de aprimoramento sustentada por dados e inovação.'
    ],
    responsaveisPapeis: [
        'Não há definição formal de papéis ou responsabilidades.',
        'Definições existem, mas são informais e pouco divulgadas.',
        'Algumas funções possuem atribuições documentadas.',
        'Papéis bem definidos, com acompanhamento e responsabilização.',
        'Papéis revistos periodicamente, alinhados às metas estratégicas.'
    ],
    capacitacaoConhecimento: [
        'A organização não oferece treinamentos para a equipe.',
        'Treinamentos são esporádicos e reativos, sem planejamento.',
        'Há planos de capacitação ativos em áreas-chave.',
        'Capacitação contínua com desenvolvimento técnico e institucional.',
        'Gestão do conhecimento formalizada, com mitigação de riscos.'
    ],
    inovacaoTecnologica: [
        'Não há iniciativas voltadas à adoção de novas tecnologias.',
        'Adoções tecnológicas ocorrem de forma pontual e isolada.',
        'A tecnologia é usada estrategicamente para ganhos operacionais.',
        'Inovação aplicada para vantagem competitiva, com visão de futuro.',
        'Inovação tecnológica institucionalizada e com impacto na sustentabilidade.'
    ],
    gestaoRiscos: [
        'Reativo: Riscos tratados apenas após ocorrerem.',
        'Básico: Identificação informal de riscos, sem acompanhamento.',
        'Definido: Processo documentado de identificação e mitigação de riscos.',
        'Proativo: Gestão de riscos integrada, com monitoramento e decisão baseada em análise.',
        'Estratégico: Riscos antecipados e gerenciados como vantagem competitiva.'
    ],
    satisfacaoCliente: [
        'Não Medida: A satisfação do cliente não é medida ou acompanhada.',
        'Pontual/Informal: A satisfação é avaliada de forma esporádica ou através de feedback informal.',
        'Sistemática/Básica: Métricas de satisfação (CSAT, NPS) são coletadas regularmente, mas a análise é limitada.',
        'Analítica/Acionável: Dados de satisfação são analisados profundamente para identificar causas e gerar planos de ação.',
        'Preditiva/Integrada: A satisfação é prevista e integrada à estratégia, com ações proativas para garantir a lealdade.'
    ]
};

// --- UTILITY FUNCTION FOR SAFE DOM ACCESS ---
function getById(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with ID '${id}' not found.`);
    }
    return element;
}

// Helper function to convert month number to name
function getMonthName(monthNumber) {
    const months = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    return months[parseInt(monthNumber) - 1] || '';
}

// --- FUNÇÕES DE MODAIS ---
function showConfirmation(message, callback) {
    const confirmationModal = getById('confirmationModal');
    const confirmationModalMessage = getById('confirmationModalMessage');
    if (confirmationModal && confirmationModalMessage) {
        confirmationModalMessage.textContent = message;
        confirmationModal.classList.remove('hidden');
        confirmationModal.classList.add('flex');
        confirmCallback = callback;
    } else {
        console.error("Confirmation modal elements not found. Falling back to native confirm.");
        if (confirm(message)) { // Fallback to native confirm
            callback();
        }
    }
}

function closeConfirmationModal() {
    const confirmationModal = getById('confirmationModal');
    if (confirmationModal) {
        confirmationModal.classList.add('hidden');
        confirmationModal.classList.remove('flex');
        confirmCallback = null;
    }
}

function showAlert(message) {
    const alertModal = getById('alertModal');
    const alertModalMessage = getById('alertModalMessage');
    if (alertModal && alertModalMessage) {
        alertModalMessage.textContent = message;
        alertModal.classList.remove('hidden');
        alertModal.classList.add('flex');
    } else {
        console.error("Alert modal elements not found. Falling back to native alert.");
        alert(message); // Fallback to native alert
    }
}

function closeAlertModal() {
    const alertModal = getById('alertModal');
    if (alertModal) {
        alertModal.classList.add('hidden');
        alertModal.classList.remove('flex');
    }
}

// --- FUNÇÕES DO FIRESTORE (CRUD) ---

async function getCurrentUser() {
    const userEmail = localStorage.getItem('loggedInUserEmail');
    if (!userEmail) {
        return null;
    }
    const usersRef = collection(db, `artifacts/${appId}/public/data/users`);
    const q = query(usersRef, where("email", "==", userEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
}

async function saveProcess() {
    const processoId = getById('processoId')?.value;
    const processName = getById('processName')?.value.trim();
    const processDescription = getById('processDescription')?.value.trim();
    const processOutput = getById('processOutput')?.value.trim();
    const processOwnerId = getById('processOwnerId')?.value;
    const processOwnerName = getById('processOwnerName')?.textContent;
    const processCriticality = getById('processCriticality')?.value;
    const processFrequency = getById('processFrequencyContainer')?.querySelector('.frequency-button.selected')?.dataset.value;

    const processPrerequisites = getById('processPrerequisites')?.value.trim();
    const processImpact = getById('processImpact')?.value.trim();
    const processImpactLevel = getById('processImpactLevel')?.value;
    const processDocumentationLink = getById('processDocumentationLink')?.value.trim();

    const maturityAnalysis = {};
    maturityDimensions.forEach(dim => {
        const selectedCard = document.querySelector(`[data-dimension="${dim.id}"] .maturity-card.selected`);
        maturityAnalysis[dim.id] = selectedCard ? parseInt(selectedCard.dataset.value) : null;
    });

    const processTeamsPillsContainer = getById('processTeamsPillsContainer');
    const processTeams = [...processTeamsPillsContainer.children].map(pill => ({
        id: pill.dataset.id,
        name: pill.dataset.name
    }));

    const startMonths = Array.from(getById('startMonthsContainer')?.querySelectorAll('input[type="checkbox"]:checked') || []).map(checkbox => checkbox.value);
    const endMonths = Array.from(getById('endMonthsContainer')?.querySelectorAll('input[type="checkbox"]:checked') || []).map(checkbox => checkbox.value);

    let missingFields = [];
    if (!processName) missingFields.push('Nome do Processo');
    if (!processDescription) missingFields.push('Descrição');
    if (!processOwnerId) missingFields.push('Dono do Processo');
    if (processTeams.length === 0) missingFields.push('Equipes Participantes');
    if (!processCriticality) missingFields.push('Criticidade');
    if (!processFrequency) missingFields.push('Frequência');
    if (!processImpact) missingFields.push('Riscos');
    if (!processDocumentationLink) missingFields.push('Link para Documentação');

    if (processFrequency !== 'Sob Demanda') {
        if (startMonths.length === 0) missingFields.push('Meses de Início');
        if (endMonths.length === 0) missingFields.push('Meses de Fim');
        if (startMonths.length !== endMonths.length) {
            showAlert('O número de meses selecionados em "Meses de Início" e "Meses de Fim" deve ser o mesmo.');
            return;
        }
    }

    if (missingFields.length > 0) {
        showAlert(`Por favor, preencha todos os campos obrigatórios: ${missingFields.join(', ')}.`);
        return;
    }

    const processData = {
        name: processName,
        description: processDescription,
        output: processOutput,
        owner: { id: processOwnerId, name: processOwnerName },
        teams: processTeams,
        criticality: processCriticality,
        frequency: processFrequency,
        status: 'Ativo',
        prerequisites: processPrerequisites,
        impact: processImpact,
        impactLevel: processImpactLevel,
        documentationLink: processDocumentationLink,
        startMonths: startMonths,
        endMonths: endMonths,
        maturityAnalysis: maturityAnalysis,
    };

    const aiAnalysisHtml = await generateAIAnalysis(processData, maturityAnalysis);
    if (aiAnalysisHtml) {
        processData.aiAnalysisHtml = aiAnalysisHtml;
    }

    try {
        const processesColRef = collection(db, `artifacts/${appId}/public/data/processos`);
        if (processoId) {
            processData.updatedAt = new Date();
            const docRef = doc(db, `artifacts/${appId}/public/data/processos`, processoId);
            await setDoc(docRef, processData, { merge: true });
            
            showAlert("Processo atualizado com sucesso!");
        } else { // New process (add)
            processData.createdAt = new Date();
            const querySnapshot = await getDocs(processesColRef);
            const lastId = querySnapshot.docs.reduce((max, doc) => (parseInt(doc.id) > max ? parseInt(doc.id) : max), 0);
            const newId = lastId + 1;
            processData.id = newId; // Assign new ID
            await setDoc(doc(db, `artifacts/${appId}/public/data/processos`, newId.toString()), processData); // Save with new ID
            
            showAlert("Processo cadastrado com sucesso!");
        }
        
        getById('searchProcessosInput').value = '';
        filterAndRenderProcesses(); // Force re-render
        toggleForm(false);

    } catch (error) {
        console.error("Erro ao salvar processo:", error);
        showAlert("Ocorreu um erro ao salvar o processo. Tente novamente.");
    }
}

async function deleteProcess(id) {
    showConfirmation(`Tem certeza que deseja excluir o processo com ID ${id}?`, async () => {
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/processos`, id));
            showAlert("Processo excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao deletar processo:", error);
            showAlert("Ocorreu um erro ao excluir o processo. Tente novamente.");
        }
    });
}

function calculateMaturityScore(maturityAnalysis) {
    if (!maturityAnalysis || typeof maturityAnalysis !== 'object') {
        return 0;
    }

    let weightedTotalScore = 0;
    let weightedMaxPossibleScore = 0;

    const weights = {
        'gestaoGovernanca': 2,
        'responsaveisPapeis': 2
    };

    maturityDimensions.forEach(dim => {
        const score = maturityAnalysis[dim.id];
        const weight = weights[dim.id] || 1; // Default weight is 1

        if (typeof score === 'number' && score >= 1 && score <= 5) {
            weightedTotalScore += score * weight;
        }
        weightedMaxPossibleScore += 5 * weight; // Max score for this dimension * its weight
    });
    
    if (weightedMaxPossibleScore === 0) {
        return 0;
    }

    const score = (weightedTotalScore / weightedMaxPossibleScore) * 100;
    
    return Math.round(score);
}

function renderProcesses(processes) {
    const processosTableBody = getById('processosTableBody');
    if (!processosTableBody) return;
    
    processosTableBody.innerHTML = '';
    processes.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    if (processes.length === 0) {
        processosTableBody.innerHTML = '<tr><td colspan="10" class="text-center p-8">Nenhum processo encontrado.</td></tr>';
        return;
    }

    processes.forEach(process => {
        const tr = document.createElement('tr');
        tr.className = "bg-slate-900 border-b border-slate-700 hover:bg-slate-800 transition-colors";
        
        const status = process.status || 'Ativo';
        let statusColor = 'bg-slate-500/20 text-slate-400';
        switch(status) {
            case 'Ativo':
            case 'Concluído': 
                statusColor = 'bg-green-500/20 text-green-400'; 
                break;
            case 'Pendente': 
                statusColor = 'bg-yellow-500/20 text-yellow-400'; 
                break;
            case 'Em Andamento': 
                statusColor = 'bg-blue-500/20 text-blue-400'; 
                break;
            case 'Cancelado': 
                statusColor = 'bg-red-500/20 text-red-400'; 
                break;
        }

        const teamsDisplay = process.teams && process.teams.length > 0 
            ? process.teams.map(team => team.name).join(', ') 
            : 'N/A';

        const startMonthsDisplay = process.startMonths && process.startMonths.length > 0
            ? process.startMonths.map(month => getMonthName(month)).join(', ')
            : 'N/A';
        const endMonthsDisplay = process.endMonths && process.endMonths.length > 0
            ? process.endMonths.map(month => getMonthName(month)).join(', ')
            : 'N/A';

        const owner = allUsersWithPhotos.find(u => u.id === process.owner?.id);
        const ownerPhotoUrl = owner?.profilePictureUrl || 'https://res.cloudinary.com/djikr5paz/image/upload/v1756664637/default_avatar_lxdi55.jpg';
        const ownerName = process.owner?.name || 'N/A';
        const ownerHtml = `<img class="h-9 w-9 rounded-full object-cover" src="${ownerPhotoUrl}" alt="${ownerName}" title="${ownerName}">`;

        const maturityScore = calculateMaturityScore(process.maturityAnalysis);
        let aiButtonHtml;

        const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;

        if (process.aiAnalysisHtml) {
            aiButtonHtml = `<button class="text-sky-400 hover:text-sky-500 view-ai-btn transition-transform hover:scale-110" data-id="${process.id}" title="Ver Análise da IA">${iconSvg}</button>`;
        } else {
            aiButtonHtml = `<span class="text-slate-600" title="Análise de IA não disponível">${iconSvg}</span>`;
        }

        const gestorIaContent = `
            <div class="flex items-center justify-center gap-3">
                <span class="font-semibold text-white text-lg">${maturityScore}</span>
                ${aiButtonHtml}
            </div>
        `;

        tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-white table-cell-responsive">${process.id}</td>
            <td class="px-6 py-4 table-cell-responsive"><span class="px-2 py-1 rounded-full text-xs font-semibold ${statusColor}" style="white-space: nowrap;">${status}</span></td>
            <td class="px-6 py-4 table-cell-responsive">${process.name}</td>
            <td class="px-6 py-4 table-cell-responsive">${ownerHtml}</td>
            <td class="px-6 py-4 table-cell-responsive">${teamsDisplay}</td>
            <td class="px-6 py-4 table-cell-responsive">${startMonthsDisplay}</td>
            <td class="px-6 py-4 table-cell-responsive">${endMonthsDisplay}</td>
            <td class="px-6 py-4 table-cell-responsive">${process.criticality || 'N/A'}</td>
            <td class="px-6 py-4 text-center">${gestorIaContent}</td>
            <td class="px-6 py-4 text-right table-cell-responsive">
                <div class="flex items-center justify-end gap-4">
                    <button class="text-sky-400 hover:text-sky-500 edit-btn transition-transform hover:scale-110" data-id="${process.id}" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="text-red-500 hover:text-red-600 delete-btn transition-transform hover:scale-110" data-id="${process.id}" title="Excluir">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        processosTableBody.appendChild(tr);
    });
}

function resetProcessForm() {
    getById('processoId').value = "";
    getById('processName').value = "";
    getById('processDescription').value = "";
    getById('processOutput').value = "";
    getById('processCriticality').value = "Baixa";
    const frequencyButtons = getById('processFrequencyContainer')?.querySelectorAll('.frequency-button');
    frequencyButtons?.forEach(button => button.classList.remove('selected'));
    
    getById('processPrerequisites').value = "";
    const selectedValuesSpan = getById('prerequisites-selected-values');
    if(selectedValuesSpan) selectedValuesSpan.textContent = 'Selecione os processos';
    const prerequisitesCheckboxes = getById('prerequisites-checkboxes');
    if (prerequisitesCheckboxes) {
        prerequisitesCheckboxes.innerHTML = ''; // Clear old options
    }
    getById('processImpact').value = "";
    getById('processImpactLevel').value = "";
    getById('processDocumentationLink').value = "";

    document.querySelectorAll('.maturity-card').forEach(card => {
        card.classList.remove('selected', 'border-sky-500', 'bg-slate-700');
        card.querySelector('.check-icon').style.display = 'none';
    });

    Array.from(getById('startMonthsContainer').querySelectorAll('input[type="checkbox"]')).forEach(checkbox => checkbox.checked = false);
    Array.from(getById('endMonthsContainer').querySelectorAll('input[type="checkbox"]')).forEach(checkbox => checkbox.checked = false);

    getById('formTitle').textContent = 'Cadastrar Novo Processo';
    currentStep = 0;
    showStep(currentStep);
    setCustomDropdownValue('processOwner', null);
    initializeTeamsComponent([]);
    toggleMonthFieldsVisibility('Mapeado');
}

async function toggleForm(show, process = null) {
    const cadastroFormContainer = getById('cadastroFormContainer');
    const processosListContainer = getById('processosListContainer');
    const searchFormContainer = getById('search-form-container');
    const formTitleEl = getById('formTitle');

    if (!cadastroFormContainer || !processosListContainer || !searchFormContainer || !formTitleEl) {
        console.error("One or more main form containers not found.");
        return;
    }

    if (show) {
        processosListContainer.classList.add('hidden');
        searchFormContainer.classList.add('hidden');
        cadastroFormContainer.classList.remove('hidden');

        setTimeout(async () => {
            resetProcessForm();

            await populateUsersDropdown();
            renderCustomUserDropdown('processOwner', allUsersWithPhotos);
            const selectedPrerequisites = process && process.prerequisites ? process.prerequisites.split(',') : [];
            await populatePrerequisitesDropdown(selectedPrerequisites);

            if (process) {
                formTitleEl.textContent = 'Editar Processo';
                getById('processoId').value = process.id;
                getById('processName').value = process.name || '';
                getById('processDescription').value = process.description || '';
                getById('processOutput').value = process.output || '';
                getById('processCriticality').value = process.criticality || 'Baixa';
                getById('processImpact').value = process.impact || '';
                getById('processImpactLevel').value = process.impactLevel || '';
                getById('processDocumentationLink').value = process.documentationLink || '';

                if (process.maturityAnalysis) {
                    for (const [key, value] of Object.entries(process.maturityAnalysis)) {
                        if (value) {
                            const card = document.querySelector(`[data-dimension="${key}"] [data-value="${value}"]`);
                            if (card) {
                                card.classList.add('selected', 'border-sky-500', 'bg-slate-700');
                                card.querySelector('.check-icon').style.display = 'flex';
                            }
                        }
                    }
                }

                const frequencyButtons = getById('processFrequencyContainer')?.querySelectorAll('.frequency-button');
                frequencyButtons?.forEach(button => {
                    if (button.dataset.value === (process.frequency || 'Mapeado')) {
                        button.classList.add('selected');
                    } else {
                        button.classList.remove('selected');
                    }
                });
                toggleMonthFieldsVisibility(process.frequency || 'Mapeado');

                if (process.startMonths) {
                    Array.from(getById('startMonthsContainer').querySelectorAll('input[type="checkbox"]')).forEach(checkbox => {
                        checkbox.checked = process.startMonths.includes(checkbox.value);
                    });
                }
                if (process.endMonths) {
                    Array.from(getById('endMonthsContainer').querySelectorAll('input[type="checkbox"]')).forEach(checkbox => {
                        checkbox.checked = process.endMonths.includes(checkbox.value);
                    });
                }
            } else {
                initializeTeamsComponent([]);
                toggleMonthFieldsVisibility('Mapeado');
            }
            currentStep = 0;
            showStep(currentStep);
        }, 100);
    } else {
        cadastroFormContainer.classList.add('hidden');
        processosListContainer.classList.remove('hidden');
        searchFormContainer.classList.remove('hidden');
    }
}

// --- Multi-step Form Logic ---
function showStep(n) {
    const steps = document.getElementsByClassName("form-step");
    Array.from(steps).forEach(step => step.classList.remove("active"));
    if (steps[n]) {
        steps[n].classList.add("active");
        if (steps[n].id === 'step-3') {
            populateReviewData();
            triggerAIAnalysis();
        }
    }

    const prevBtn = getById("prevBtn");
    const nextBtn = getById("nextBtn");

    if (prevBtn) prevBtn.style.display = n == 0 ? "none" : "inline-block";
    if (nextBtn) nextBtn.innerHTML = n == steps.length - 1 ? "Finalizar Cadastro" : "Próximo";

    updateProgressBar(n);
}

function nextPrev(n) {
    const steps = document.getElementsByClassName("form-step");
    if (n == 1 && !validateForm()) return false;
    
    currentStep += n;
    
    if (currentStep >= steps.length) {
        saveProcess();
        return false;
    }
    showStep(currentStep);
}

function validateForm() {
    let valid = true;
    const currentStepDiv = document.getElementsByClassName("form-step")[currentStep];
    
    const inputs = currentStepDiv.querySelectorAll("input[required], select[required], textarea[required]");
    inputs.forEach(input => {
        if (input.value.trim() === "") {
            input.classList.add("border-red-500");
            valid = false;
        } else {
            input.classList.remove("border-red-500");
        }
    });

    if (currentStep === 0) {
        const processOwnerIdInput = getById('processOwnerId');
        if (processOwnerIdInput && processOwnerIdInput.value.trim() === "") {
            getById('processOwnerDisplay')?.classList.add("border-red-500");
            valid = false;
        } else {
            getById('processOwnerDisplay')?.classList.remove("border-red-500");
        }

        const processTeamsPillsContainer = getById('processTeamsPillsContainer');
        if (processTeamsPillsContainer && processTeamsPillsContainer.children.length === 0) {
            getById('processTeamsContainer')?.querySelector('.tag-input-container')?.classList.add("border-red-500");
            valid = false;
        } else {
            getById('processTeamsContainer')?.querySelector('.tag-input-container')?.classList.remove("border-red-500");
        }

        const selectedFrequencyButton = getById('processFrequencyContainer')?.querySelector('.frequency-button.selected');
        const currentFrequency = selectedFrequencyButton ? selectedFrequencyButton.dataset.value : '';

        if (currentFrequency !== 'Sob Demanda') {
            const startMonthsCheckboxes = getById('startMonthsContainer')?.querySelectorAll('input[type="checkbox"]:checked');
            const endMonthsCheckboxes = getById('endMonthsContainer')?.querySelectorAll('input[type="checkbox"]:checked');

            if (!startMonthsCheckboxes || startMonthsCheckboxes.length === 0) {
                getById('startMonthsContainer')?.classList.add("border-red-500");
                valid = false;
            } else {
                getById('startMonthsContainer')?.classList.remove("border-red-500");
            }

            if (!endMonthsCheckboxes || endMonthsCheckboxes.length === 0) {
                getById('endMonthsContainer')?.classList.add("border-red-500");
                valid = false;
            } else {
                getById('endMonthsContainer')?.classList.remove("border-red-500");
            }

            if (valid && startMonthsCheckboxes && endMonthsCheckboxes && startMonthsCheckboxes.length !== endMonthsCheckboxes.length) {
                getById('startMonthsContainer')?.classList.add("border-red-500");
                getById('endMonthsContainer')?.classList.add("border-red-500");
                showAlert('O número de meses selecionados em "Meses de Início" e "Meses de Fim" deve ser o mesmo.');
                valid = false;
            } else if (valid) {
                getById('startMonthsContainer')?.classList.remove("border-red-500");
                getById('endMonthsContainer')?.classList.remove("border-red-500");
            }
        } else {
            getById('startMonthsContainer')?.classList.remove("border-red-500");
            getById('endMonthsContainer')?.classList.remove("border-red-500");
        }

        if (!selectedFrequencyButton) {
            getById('processFrequencyContainer')?.classList.add("border-red-500");
            valid = false;
        } else {
            getById('processFrequencyContainer')?.classList.remove("border-red-500");
        }
    }
    return valid;
}

function updateProgressBar(n) {
    const steps = document.getElementsByClassName("form-step");
    const progress = ((n + 1) / steps.length) * 100;
    const progressBar = getById("progress-bar");
    if (progressBar) progressBar.style.width = progress + "%";
    
    document.querySelectorAll("[id^='step-label-']").forEach((label, index) => {
        label.className = index <= n ? "text-sky-500 font-semibold" : "text-slate-400";
    });
}

// --- User Dropdown Logic ---
async function populateUsersDropdown() {
    try {
        const usersColRef = collection(db, `artifacts/${appId}/public/data/users`);
        const querySnapshot = await getDocs(usersColRef);
        
        allUsersWithPhotos = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(user => user.status === 'Ativo')
            .sort((a, b) => a.fullName.localeCompare(b.fullName));

    } catch (error) {
        console.error("Erro ao carregar usuários para o dropdown:", error);
    }
}

function renderCustomUserDropdown(dropdownIdPrefix, users) {
    const displayElement = getById(`${dropdownIdPrefix}Display`);
    const hiddenIdInput = getById(`${dropdownIdPrefix}Id`);
    const dropdownContainer = getById(`${dropdownIdPrefix}Dropdown`);
    const photoElement = getById(`${dropdownIdPrefix}Photo`);
    const nameElement = getById(`${dropdownIdPrefix}Name`);

    if (!displayElement || !hiddenIdInput || !dropdownContainer || !photoElement || !nameElement) {
        console.warn(`Elementos para ${dropdownIdPrefix} não encontrados para renderização do dropdown.`);
        return;
    }

    dropdownContainer.innerHTML = '';

    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'flex items-center p-2 cursor-pointer hover:bg-slate-700';
        userItem.dataset.id = user.id;
        userItem.dataset.name = user.fullName;
        userItem.dataset.photo = user.profilePictureUrl || 'https://res.cloudinary.com/djikr5paz/image/upload/v1756664637/default_avatar_lxdi55.jpg';

        userItem.innerHTML = `
            <img src="${userItem.dataset.photo}" alt="Foto" class="w-8 h-8 rounded-full object-cover mr-2">
            <span>${user.fullName}</span>
        `;
        dropdownContainer.appendChild(userItem);

        userItem.addEventListener('click', () => {
            hiddenIdInput.value = user.id;
            nameElement.textContent = user.fullName;
            photoElement.src = user.profilePictureUrl || 'https://res.cloudinary.com/djikr5paz/image/upload/v1756664637/default_avatar_lxdi55.jpg';
            photoElement.classList.remove('hidden');
            dropdownContainer.classList.add('hidden');
        });
    });

    displayElement.addEventListener('click', (event) => {
        event.stopPropagation();
        dropdownContainer.classList.toggle('hidden');
    });

    document.addEventListener('click', (event) => {
        if (!displayElement.contains(event.target) && !dropdownContainer.contains(event.target)) {
            dropdownContainer.classList.add('hidden');
        }
    });

    if (!hiddenIdInput.value) {
        nameElement.textContent = 'Selecione um usuário...';
        photoElement.classList.add('hidden');
    }
}

function setCustomDropdownValue(dropdownIdPrefix, userId) {
    const hiddenIdInput = getById(`${dropdownIdPrefix}Id`);
    const nameElement = getById(`${dropdownIdPrefix}Name`);
    const photoElement = getById(`${dropdownIdPrefix}Photo`);

    if (!hiddenIdInput || !nameElement || !photoElement) {
        console.warn(`Elementos para ${dropdownIdPrefix} não encontrados para definir valor.`);
        return;
    }

    const user = allUsersWithPhotos.find(u => u.id === userId);

    if (user) {
        hiddenIdInput.value = user.id;
        nameElement.textContent = user.fullName;
        photoElement.src = user.profilePictureUrl || 'https://res.cloudinary.com/djikr5paz/image/upload/v1756664637/default_avatar_lxdi55.jpg';
        photoElement.classList.remove('hidden');
    } else {
        hiddenIdInput.value = '';
        nameElement.textContent = 'Selecione um usuário...';
        photoElement.classList.add('hidden');
        photoElement.src = 'https://res.cloudinary.com/djikr5paz/image/upload/v1756664637/default_avatar_lxdi55.jpg';
    }
}

// --- Teams Multi-select Logic ---
function initializeTeamsComponent(existingTeams) {
    const container = getById('processTeamsContainer');
    const pillsContainer = getById('processTeamsPillsContainer');
    const input = getById('processTeamsInput');
    const resultsDropdown = getById('processTeamsResults');

    if (!container || !pillsContainer || !input || !resultsDropdown) {
        console.warn("Elementos do componente de equipes não encontrados.");
        return;
    }

    pillsContainer.innerHTML = '';
    input.value = '';

    let selectedTeamIds = new Set(existingTeams.map(team => team.id));

    existingTeams.forEach(team => addTeamPill(team.name, team.id));

    function addTeamPill(name, id) {
        if (selectedTeamIds.has(id)) return;

        const pill = document.createElement('div');
        pill.className = 'tag-pill';
        pill.dataset.id = id;
        pill.dataset.name = name;
        pill.innerHTML = `<span>${name}</span>`;
        
        const removeBtn = document.createElement('span');
        removeBtn.className = 'tag-pill-remove';
        removeBtn.innerHTML = ' &times;';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeTeamPill(id);
        };
        
        pill.appendChild(removeBtn);
        pillsContainer.appendChild(pill);
        selectedTeamIds.add(id);
    }

    function removeTeamPill(id) {
        const pill = pillsContainer.querySelector(`[data-id="${id}"]`);
        if (pill) {
            pillsContainer.removeChild(pill);
            selectedTeamIds.delete(id);
        }
    }

    input.oninput = () => {
        const searchTerm = input.value.toLowerCase();
        resultsDropdown.innerHTML = '';

        if (searchTerm.length === 0) {
            resultsDropdown.classList.add('hidden');
            return;
        }

        const filtered = allDepartments.filter(dept => 
            !selectedTeamIds.has(dept.id) &&
            dept.name.toLowerCase().includes(searchTerm)
        );

        if (filtered.length > 0) {
            resultsDropdown.classList.remove('hidden');
            filtered.forEach(dept => {
                const item = document.createElement('div');
                item.className = 'tag-result-item';
                item.textContent = dept.name;
                item.onclick = () => {
                    addTeamPill(dept.name, dept.id);
                    input.value = '';
                    resultsDropdown.classList.add('hidden');
                };
                resultsDropdown.appendChild(item);
            });
        } else {
            resultsDropdown.classList.remove('hidden');
            const noResultsItem = document.createElement('div');
            noResultsItem.className = 'tag-result-item text-slate-400';
            noResultsItem.textContent = 'Nenhum departamento encontrado.';
            resultsDropdown.appendChild(noResultsItem);
        }
    };

    input.onfocus = () => {
        resultsDropdown.classList.remove('hidden');
        if (input.value === '') {
            input.oninput();
        }
    };

    let highlightedIndex = -1;
    input.onkeydown = (e) => {
        const items = resultsDropdown.querySelectorAll('.tag-result-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            highlightedIndex = (highlightedIndex + 1) % items.length;
            items.forEach((item, index) => {
                item.classList.toggle('bg-slate-700', index === highlightedIndex);
                if (index === highlightedIndex) item.scrollIntoView({ block: 'nearest' });
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
            items.forEach((item, index) => {
                item.classList.toggle('bg-slate-700', index === highlightedIndex);
                if (index === highlightedIndex) item.scrollIntoView({ block: 'nearest' });
            });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex > -1) {
                items[highlightedIndex].click();
            }
        }
    };

    document.addEventListener('click', (e) => {
        if (container && !container.contains(e.target)) {
            resultsDropdown.classList.add('hidden');
        }
    });
}

async function populateDepartmentsDropdown() {
    try {
        const departmentsColRef = collection(db, `artifacts/${appId}/public/data/departments`);
        const querySnapshot = await getDocs(departmentsColRef);
        
        allDepartments = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(dept => dept.status === 'Ativo')
            .sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
        console.error("Erro ao carregar departamentos para o dropdown:", error);
    }
}

async function populatePrerequisitesDropdown(selectedPrerequisites = []) {
    const prerequisitesCheckboxes = getById('prerequisites-checkboxes');
    if (!prerequisitesCheckboxes) return;

    prerequisitesCheckboxes.innerHTML = '';
    const currentProcessId = getById('processoId')?.value;
    const activeProcesses = allProcesses.filter(p => p.status === 'Ativo' && p.id.toString() !== currentProcessId);

    activeProcesses.forEach(process => {
        const label = document.createElement('label');
        label.className = 'block px-4 py-2 hover:bg-slate-700 cursor-pointer text-white';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = process.id;
        checkbox.className = 'mr-2 accent-sky-500';
        if (selectedPrerequisites.includes(process.id.toString())) {
            checkbox.checked = true;
        }
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(process.name));
        prerequisitesCheckboxes.appendChild(label);
    });

    const selectedValuesSpan = getById('prerequisites-selected-values');
    const hiddenInput = getById('processPrerequisites');

    const selectedCheckboxes = prerequisitesCheckboxes.querySelectorAll('input:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    hiddenInput.value = selectedIds.join(',');
    if (selectedIds.length > 0) {
        selectedValuesSpan.textContent = `${selectedIds.length} processo(s) selecionado(s)`;
    } else {
        selectedValuesSpan.textContent = 'Selecione os processos';
    }
}

function setupPrerequisitesDropdown() {
    const multiselect = getById('prerequisites-multiselect');
    if (!multiselect) return;

    const selectBox = getById('prerequisites-select-box');
    const checkboxes = getById('prerequisites-checkboxes');

    selectBox.addEventListener('click', (e) => {
        e.stopPropagation();
        checkboxes.classList.toggle('hidden');
    });

    checkboxes.addEventListener('change', () => {
        const selectedCheckboxes = checkboxes.querySelectorAll('input:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        getById('processPrerequisites').value = selectedIds.join(',');
        const selectedValuesSpan = getById('prerequisites-selected-values');
        if (selectedIds.length > 0) {
            selectedValuesSpan.textContent = `${selectedIds.length} processo(s) selecionado(s)`;
        } else {
            selectedValuesSpan.textContent = 'Selecione os processos';
        }
    });

    document.addEventListener('click', (event) => {
        if (multiselect && !multiselect.contains(event.target)) {
            checkboxes.classList.add('hidden');
        }
    });
}

function buildMaturityStep() {
    const container = getById('maturity-container');
    if (!container) return;
    container.innerHTML = '';

    maturityDimensions.forEach(dim => {
        const levelNames = maturityDimensionLevelNames[dim.id];
        let html = `
            <div data-dimension="${dim.id}" class="maturity-group">
                <h3 class="font-semibold text-slate-300 group-title">${dim.name}</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-2">`;
        
        maturityLevels.forEach(level => {
            html += `
                <div class="maturity-card p-3 rounded-lg text-center border bg-slate-800 border-slate-700 relative" data-value="${level.value}" style="cursor: pointer;">
                    <strong class="block text-lg text-white">${level.value}</strong>
                    <span class="text-xs text-slate-400">${levelNames[level.value-1]}</span>
                    <div class="check-icon absolute top-1 right-1 bg-sky-500 text-white rounded-full w-4 h-4 items-center justify-center" style="display: none;">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                    </div>
                </div>`;
        });
        html += `</div><span class="error-message hidden text-red-500 text-xs mt-1" data-for="${dim.id}">Por favor, selecione um nível de maturidade.</span></div>`;
        container.innerHTML += html;
    });
    setupMaturitySelectors();
}

function setupMaturitySelectors() {
    document.querySelectorAll('.maturity-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const parentGroup = e.currentTarget.closest('[data-dimension]');
            if (!parentGroup) return;
            
            parentGroup.querySelectorAll('.maturity-card').forEach(c => {
                c.classList.remove('selected', 'border-sky-500', 'bg-slate-700');
                c.querySelector('.check-icon').style.display = 'none';
            });
            
            e.currentTarget.classList.add('selected', 'border-sky-500', 'bg-slate-700');
            e.currentTarget.querySelector('.check-icon').style.display = 'flex';
        });
    });
}

function filterAndRenderProcesses() {
    const searchProcessosInput = getById('searchProcessosInput');
    const searchTerm = searchProcessosInput ? searchProcessosInput.value.toLowerCase() : '';
    const filtered = allProcesses.filter(process =>
        process.name.toLowerCase().includes(searchTerm) ||
        (process.owner && process.owner.name.toLowerCase().includes(searchTerm)) ||
        (process.teams && process.teams.some(team => team.name.toLowerCase().includes(searchTerm))) ||
        (process.criticality && process.criticality.toLowerCase().includes(searchTerm)) ||
        (process.status && process.status.toLowerCase().includes(searchTerm))
    );
    renderProcesses(filtered);
}

async function main() {
    const sidebar = getById('sidebar-container');
    const sidebarToggleButton = getById('sidebarToggleButton');
    const sidebarCloseButton = getById('sidebarCloseButton');
    const showFormButton = getById('showFormButton');
    const cancelButton = getById('cancelButton');
    const processosTableBody = getById('processosTableBody');
    const confirmationModalCancelBtn = getById('confirmationModalCancelBtn');
    const confirmationModalConfirmBtn = getById('confirmationModalConfirmBtn');
    const alertModalOkBtn = getById('alertModalOkBtn');
    const searchProcessosInput = getById('searchProcessosInput');
    const prevBtn = getById('prevBtn');
    const nextBtn = getById('nextBtn');
    const aiAnalysisModal = getById('aiAnalysisModal');
    const aiAnalysisModalCloseBtn = getById('aiAnalysisModalCloseBtn');

    

    initializeGanttBackground();
    await onAuthStateChanged(auth, async (user) => {
        if (!user) {
            try {
                if (initialAuthToken) { await signInWithCustomToken(auth, initialAuthToken); }
                else { await signInAnonymously(auth); }
            } catch (error) { console.error("Erro na autenticação:", error); }
        }
        userId = auth.currentUser?.uid || crypto.randomUUID();
        currentUser = await getCurrentUser();
        
        onSnapshot(collection(db, `artifacts/${appId}/public/data/processos`), (snapshot) => {
            allProcesses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filterAndRenderProcesses();
        });

        await Promise.all([
            populateUsersDropdown(),
            populateDepartmentsDropdown()
        ]);
    });

    function setupSidebarListeners() {
        if (sidebarToggleButton && sidebar) {
            sidebarToggleButton.addEventListener('click', () => sidebar.classList.remove('-translate-x-full'));
        }
        if (sidebarCloseButton && sidebar) {
            sidebarCloseButton.addEventListener('click', () => sidebar.classList.add('-translate-x-full'));
        }
        document.addEventListener('click', (event) => {
            if (window.innerWidth < 768 && sidebar && !sidebar.contains(event.target) && sidebarToggleButton && !sidebarToggleButton.contains(event.target)) {
                sidebar.classList.add('-translate-x-full');
            }
        });
    }
    setupSidebarListeners();
    setupFrequencyButtons();
    setupPrerequisitesDropdown();
    buildMaturityStep();
    
    renderSidebar(window.location.pathname, showAlert);

    if (showFormButton) {
        showFormButton.addEventListener('click', () => toggleForm(true));
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => toggleForm(false));
    }

    if (prevBtn) prevBtn.addEventListener('click', () => nextPrev(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => nextPrev(1));

    if (processosTableBody) {
        processosTableBody.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');
            const viewAiBtn = e.target.closest('.view-ai-btn');

            if (editBtn) {
                const processoId = editBtn.dataset.id;
                const processToEdit = allProcesses.find(p => p.id.toString() === processoId.toString());
                if (processToEdit) await toggleForm(true, processToEdit);
            } else if (deleteBtn) {
                const processoId = deleteBtn.dataset.id;
                deleteProcess(processoId);
            } else if (viewAiBtn) {
                const processoId = viewAiBtn.dataset.id;
                const process = allProcesses.find(p => p.id.toString() === processoId.toString());
                if (process) {
                    showMaturityDetailsModal(process); // Always call with the process object
                }
            }
        });
    }

    if (confirmationModalCancelBtn) confirmationModalCancelBtn.addEventListener('click', closeConfirmationModal);
    if (confirmationModalConfirmBtn) confirmationModalConfirmBtn.addEventListener('click', () => {
        if (typeof confirmCallback === 'function') confirmCallback();
        closeConfirmationModal();
    });

    if (alertModalOkBtn) alertModalOkBtn.addEventListener('click', closeAlertModal);

    if (aiAnalysisModalCloseBtn) aiAnalysisModalCloseBtn.addEventListener('click', () => {
        aiAnalysisModal.classList.add('hidden');
        aiAnalysisModal.classList.remove('flex');
    });

    if (searchProcessosInput) {
        searchProcessosInput.addEventListener('input', filterAndRenderProcesses);
    }
}

function setupFrequencyButtons() {
    const frequencyButtonsContainer = getById('processFrequencyContainer');
    if (frequencyButtonsContainer) {
        frequencyButtonsContainer.addEventListener('click', (event) => {
            const clickedButton = event.target.closest('.frequency-button');
            if (clickedButton) {
                frequencyButtonsContainer.querySelectorAll('.frequency-button').forEach(button => {
                    button.classList.remove('selected');
                });
                clickedButton.classList.add('selected');
                toggleMonthFieldsVisibility(clickedButton.dataset.value);
            }
        });
        const initialSelected = frequencyButtonsContainer.querySelector('.frequency-button.selected');
        toggleMonthFieldsVisibility(initialSelected ? initialSelected.dataset.value : 'Mapeado');
    }
}

function toggleMonthFieldsVisibility(frequency) {
    const startMonthsContainer = getById('startMonthsContainer')?.closest('.space-y-2');
    const endMonthsContainer = getById('endMonthsContainer')?.closest('.space-y-2');

    if (startMonthsContainer && endMonthsContainer) {
        if (frequency === 'Sob Demanda') {
            startMonthsContainer.classList.add('hidden');
            endMonthsContainer.classList.add('hidden');
        } else {
            startMonthsContainer.classList.remove('hidden');
            endMonthsContainer.classList.remove('hidden');
        }
    }
}

function populateReviewData() {
    const reviewContainer = document.getElementById("review-data");
    if (!reviewContainer) return;

    const formData = {
        NomeProcesso: getById('processName').value,
        DonoProcesso: getById('processOwnerName').textContent,
        TimeResponsavel: [...getById('processTeamsPillsContainer').children].map(p => p.dataset.name).join(', '),
        Criticidade: getById('processCriticality').value,
        Frequencia: getById('processFrequencyContainer').querySelector('.selected')?.dataset.value,
        ImpactoDaFalha: getById('processImpact').value,
        LinkDocumentacao: getById('processDocumentationLink').value,
        ProcessosPreRequisitos: getById('processPrerequisites').value,
    };

    const labels = {
        'NomeProcesso': 'Nome do Processo', 'DonoProcesso': 'Dono', 'TimeResponsavel': 'Equipes',
        'Criticidade': 'Criticidade', 'Frequencia': 'Frequência', 'ImpactoDaFalha': 'Riscos da Falha',
        'LinkDocumentacao': 'Documentação', 'ProcessosPreRequisitos': 'Pré-Requisitos'
    };

    let html = `<h3 class="text-base font-semibold text-white col-span-full">Dossiê do Processo</h3>`;
    for (const key in labels) {
        if (formData[key]) {
             html += `<div class="flex items-start gap-3"><strong class="block text-slate-400 w-28">${labels[key]}:</strong> <span class="text-slate-200 font-medium">${formData[key]}</span></div>`;
        }
    }
    reviewContainer.innerHTML = `<div class="space-y-2">${html}</div>`;
}

function createOrUpdateRadarChart(maturityData, canvasId) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart instance if it exists on this canvas
    if (Chart.getChart(ctx)) { // Check if a Chart instance already exists on this canvas
        Chart.getChart(ctx).destroy();
    }

    const labels = maturityDimensions.map(d => d.name.split('. ')[1]);
    const dataValues = maturityDimensions.map(dim => maturityData?.[dim.id] || 0); // Use optional chaining

    // Always create a new Chart instance for the modal
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nível de Maturidade', data: dataValues, fill: true,
                backgroundColor: 'rgba(14, 165, 233, 0.2)',
                borderColor: 'rgb(14, 165, 233)',
                pointBackgroundColor: 'rgb(14, 165, 233)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(14, 165, 233)'
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { font: { size: 12 }, color: '#cbd5e1' },
                    ticks: {
                        backdropColor: 'rgba(15, 23, 42, 0.75)',
                        color: '#94a3b8',
                        stepSize: 1, beginAtZero: true, max: 5
                    }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

async function generateAIAnalysis(processData, maturityData) {
    try {
        const apiKey = ""; // REMOVED: API Key should be loaded from environment variables or secure config
        const apiUrl = `https://api.groq.com/openai/v1/chat/completions`;

        let dataQualityReport = "";
        const nonsensicalPatterns = /^(teste|test|asd|asdf|não sei|n\/a)$/i;
        for (const [key, value] of Object.entries(processData)) {
            const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
            if (!value || String(value).trim() === '' || String(value).includes('Selecione um')) {
                dataQualityReport += `- O campo '${fieldName}' não foi preenchido.\n`;
            } else if (String(value).length < 5 && !['criticidade', 'frequencia', 'nivelImpacto'].includes(key)) {
                 dataQualityReport += `- O campo '${fieldName}' ('${value}') parece incompleto ou curto demais.\n`;
            } else if (nonsensicalPatterns.test(String(value))) {
                dataQualityReport += `- O conteúdo do campo '${fieldName}' ('${value}') não parece ter sentido.\n`;
            }
        }
        if (dataQualityReport === "") {
            dataQualityReport = "Todos os campos foram preenchidos de forma aparentemente correta.";
        }

        let maturityDetails = "";
        let hasUnfilledMaturity = false;
        maturityDimensions.forEach(dim => {
            const score = maturityData[dim.id] || 0;
            if (score === 0) hasUnfilledMaturity = true;
            const levelDescription = score > 0 ? maturityDimensionLevelNames[dim.id][score - 1] : 'Não avaliado';
            maturityDetails += `- ${dim.name}: Nível ${score} (${levelDescription})\n`;
        });
        if (hasUnfilledMaturity) {
            dataQualityReport += "- Pelo menos uma das dimensões de maturidade não foi avaliada.\n";
        }

        const prompt = `
            Você é um consultor de gerenciamento de processos sênior e especialista em TI. Sua tarefa é analisar os dados de um processo cadastrado, incluindo uma avaliação da qualidade dos dados preenchidos.

            **DADOS DO PROCESSO:**
            - **Nome:** ${processData.name}
            - **Descrição:** ${processData.description}
            - **Saída Esperada:** ${processData.output}
            - **Dono do Processo:** ${processData.owner.name}
            - **Equipes Envolvidas:** ${processData.teams.map(t => t.name).join(', ')}
            - **Criticidade:** ${processData.criticality}
            - **Frequência:** ${processData.frequency}
            - **Pré-Requisitos:** ${processData.prerequisites}
            - **Nível de Impacto:** ${processData.impactLevel}
            - **Riscos em caso de falha:** ${processData.impact}
            - **Link da Documentação:** ${processData.documentationLink}

            **NÍVEIS DE MATURIDADE (de 1 a 5):**
            ${maturityDetails}

            **ANÁLISE PRELIMINAR DA QUALIDADE DOS DADOS:**
            ${dataQualityReport}

            **SUA TAREFA:**
            Com base em TODOS os dados acima, forneça uma análise completa e acionável. Retorne sua resposta estritamente no seguinte formato Markdown, sem nenhuma introdução ou texto adicional:

            ### Análise da Qualidade dos Dados
            * [Comente brevemente sobre os problemas de preenchimento encontrados na análise preliminar. Se tudo estiver ok, elogie o preenchimento.]

            ### Pontos de Atenção
            * [Identifique o principal ponto fraco do processo, correlacionando os níveis de maturidade mais baixos (1 ou 2) com a criticidade, os riscos e a descrição do processo.]
            * [Identifique um segundo ponto de atenção relevante, se houver.]
            * [Se a documentação estiver faltando ou for um link inválido, mencione como um ponto de atenção.]

            ### Plano de Ação Sugerido
            * [Para o primeiro ponto de atenção, sugira uma ação clara, específica e prática para mitigá-lo.]
            * [Para o segundo ponto de atenção, faça o mesmo.]
            * [Se houver problemas de qualidade de dados, sugira a revisão e correção dos campos apontados.]

            ### Detalhes (Pontos Positivos e Negativos)
            * **Positivos:** [Liste 1 ou 2 pontos fortes do processo, como uma boa definição de dono, criticidade bem avaliada ou um nível de maturidade alto em uma área chave.]
            * **Negativos:** [Liste 1 ou 2 pontos fracos principais, que são a base para os 'Pontos de Atenção'.]
        `;

        const requestBody = { model: "llama-3.1-8b-instant", messages: [{ role: "user", content: prompt }] };

        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(requestBody) });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`AI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        let analysisText = result.choices[0]?.message.content || "Não foi possível obter a análise da IA.";

        analysisText = analysisText
            .replace(/^### (.*)$/gm, '<h3 class="text-base font-semibold text-white mt-4 mb-2">$1</h3>')
            .replace(/^\* \*\*(.*?):\*\* (.*)$/gm, '<li><strong class="font-semibold text-slate-300">$1:</strong> $2</li>')
            .replace(/^\* (.*)$/gm, '<li>$1</li>');

        analysisText = analysisText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-sky-400">$1</strong>');
        analysisText = analysisText.replace(/(<h3.*?>.*?<\/h3>\s*)((?:<li>.*?<\/li>\s*)+)/g, '$1<ul class="list-disc list-inside text-slate-400 space-y-1.5">$2</ul>');
        
        return analysisText;

    } catch (error) {
        console.error("AI Analysis Error:", error);
        return `<div class="bg-red-500/20 p-4 rounded-lg text-sm text-red-400"><strong>Erro na Análise:</strong> Não foi possível conectar com a IA.</div>`;
    }
}

async function triggerAIAnalysis() {
    const container = getById('ai-analysis-container');
    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col items-center justify-center p-4 bg-slate-900/50 rounded-lg">
            <div class="loader border-t-sky-500"></div>
            <p class="mt-3 text-sm font-medium text-slate-400">Analisando com IA...</p>
        </div>`;

    const processData = {
        name: getById('processName').value,
        description: getById('processDescription').value,
        output: getById('processOutput').value,
        owner: { name: getById('processOwnerName').textContent },
        teams: [...getById('processTeamsPillsContainer').children].map(p => ({ name: p.dataset.name })),
        criticality: getById('processCriticality').value,
        frequency: getById('processFrequencyContainer').querySelector('.selected')?.dataset.value,
        prerequisites: getById('prerequisites-selected-values').textContent,
        impactLevel: getById('processImpactLevel').value,
        impact: getById('processImpact').value,
        documentationLink: getById('processDocumentationLink').value,
    };

    const maturityData = {};
    maturityDimensions.forEach(dim => {
        const selectedCard = document.querySelector(`[data-dimension="${dim.id}"] .maturity-card.selected`);
        maturityData[dim.id] = selectedCard ? parseInt(selectedCard.dataset.value) : 0;
    });

    // Call createOrUpdateRadarChart here for the form's chart
    createOrUpdateRadarChart(maturityData, 'maturityChart');

    const analysisHtml = await generateAIAnalysis(processData, maturityData);
    container.innerHTML = analysisHtml;
}

async function showMaturityDetailsModal(process) { // Changed to accept process object
    if (!process) {
        showAlert("Processo não encontrado.");
        return;
    }

    const contentDiv = getById('aiAnalysisModalContent');
    const modal = getById('aiAnalysisModal');
    const modalTitle = getById('aiAnalysisModalTitle');

    if (!contentDiv || !modal || !modalTitle) {
        console.error("Modal elements not found for maturity details.");
        return;
    }

    modalTitle.textContent = `Detalhes do Processo: ${process.name}`;

    const overallScore = calculateMaturityScore(process.maturityAnalysis);
    const scoreColorClass = getMaturityColorClass(overallScore);

    let htmlContent = `<div class="space-y-4">`;
    htmlContent += `<h4 class="text-base font-semibold text-white">Nota de Maturidade Geral: <span class="${scoreColorClass}">${overallScore}</span></h4>`;
    htmlContent += `<p class="text-slate-300">A nota de maturidade geral é calculada com base na soma das pontuações de cada uma das <strong>${maturityDimensions.length} dimensões</strong> avaliadas. Cada dimensão pode receber uma pontuação de <strong>1 a 5</strong>. A pontuação total máxima possível é de <strong>${maturityDimensions.length * 5}</strong> (5 pontos por dimensão x ${maturityDimensions.length} dimensões). A fórmula utilizada para normalizar a nota para uma escala de 0 a 100 é: <strong>(Soma das Pontuações das Dimensões / ${maturityDimensions.length * 5}) * 100</strong>. Quanto maior a pontuação, maior a maturidade do processo.</p>`;
    htmlContent += `<h4 class="text-base font-semibold text-white">Pontuação por Dimensão:</h4>`;
    htmlContent += `<ul class="list-disc list-inside text-slate-300 space-y-2">`;

    maturityDimensions.forEach(dim => {
        const score = process.maturityAnalysis?.[dim.id] || 0; // Use optional chaining
        const levelDescription = score > 0 ? maturityDimensionLevelNames[dim.id][score - 1] : 'Não avaliado';
        htmlContent += `<li><strong>${dim.name}:</strong> Nível ${score} - ${levelDescription}</li>`;
    });

    htmlContent += `</ul>`;

    // Add canvas for radar chart
    htmlContent += `<h4 class="text-base font-semibold text-white mt-6">Gráfico de Maturidade:</h4>`;
    htmlContent += `<div class="chart-container relative mx-auto w-full max-w-md h-64">
                        <canvas id="modalMaturityChart"></canvas>
                    </div>`;

    // Conditionally add AI analysis
    if (process.aiAnalysisHtml &&
        !process.aiAnalysisHtml.includes("Não foi possível obter a análise da IA.") &&
        !process.aiAnalysisHtml.includes("Erro na Análise:")) {
        htmlContent += `<h4 class="text-base font-semibold text-white mt-6">Análise do Gestor IA:</h4>`;
        htmlContent += process.aiAnalysisHtml;
    } else {
        htmlContent += `<p class="text-slate-400 mt-6">Análise de IA não disponível ou falhou.</p>`;
    }

    htmlContent += `</div>`; // Close main div

    contentDiv.innerHTML = htmlContent;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Render the radar chart after the content is in the DOM
    createOrUpdateRadarChart(process.maturityAnalysis, 'modalMaturityChart');
}

function getMaturityColorClass(score) {
    if (score >= 76) return 'text-green-400';
    if (score >= 51) return 'text-sky-400'; // Using sky-400 as a moderate blue
    if (score >= 26) return 'text-orange-400';
    return 'text-red-400';
}





function initializeGanttBackground() {
    const canvas = document.getElementById('backgroundCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const barHeight = 20, barGap = 40, numBarsPerLine = 3;
    const colors = { bar1: 'rgba(59, 130, 246, 0.1)', bar2: 'rgba(34, 197, 94, 0.1)', bar3: 'rgba(139, 92, 246, 0.1)'};
    const bars = [];
    const barColors = [colors.bar1, colors.bar2, colors.bar3];

    function initializeBars() {
        bars.length = 0;
        const totalLines = Math.ceil(canvas.height / (barHeight + barGap));
        for (let i = 0; i < totalLines * numBarsPerLine; i++) { 
            bars.push({ 
                width: (Math.random() * 0.2 + 0.1) * window.innerWidth, 
                color: barColors[Math.floor(Math.random() * barColors.length)], 
                initialXOffset: Math.random() * window.innerWidth 
            }); 
        }
    }
    
    function roundRect(ctx, x, y, width, height, radius) { 
        ctx.beginPath(); 
        ctx.moveTo(x + radius, y); 
        ctx.arcTo(x + width, y, x + width, y + height, radius); 
        ctx.arcTo(x + width, y + height, x, y + height, radius); 
        ctx.arcTo(x, y + height, x, y, radius); 
        ctx.arcTo(x, y, x + width, y, radius); 
        ctx.closePath(); 
        ctx.fill(); 
    }
    
    function drawBackgroundElements() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const totalLines = Math.ceil(canvas.height / (barHeight + barGap));
        for (let i = 0; i < totalLines; i++) { 
            const y = (i * (barHeight + barGap)) + (barGap / 2); 
            for (let j = 0; j < numBarsPerLine; j++) { 
                const bar = bars[i * numBarsPerLine + j]; 
                if (!bar) continue;
                let x = bar.initialXOffset;
                ctx.fillStyle = bar.color; 
                roundRect(ctx, x, y, bar.width, barHeight, 5); 
            } 
        }
    }
    
    function resizeAnimationCanvas() { 
        canvas.width = window.innerWidth; 
        canvas.height = window.innerHeight; 
        initializeBars();
        drawBackgroundElements(); 
    }
    
    resizeAnimationCanvas();
    window.addEventListener('resize', resizeAnimationCanvas);
}

document.addEventListener('DOMContentLoaded', main);

// Expose functions to global scope for testing or external calls if needed
window.showAlert = showAlert;
window.showConfirmation = showConfirmation;
window.closeAlertModal = closeAlertModal;
window.closeConfirmationModal = closeConfirmationModal;
window.toggleForm = toggleForm;
window.resetProcessForm = resetProcessForm;
window.setCustomDropdownValue = setCustomDropdownValue;

