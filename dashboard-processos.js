import { renderSidebar } from './sidebar.js';
import { db, auth, app, firebaseConfig } from './firebase-config.js';
import { collection, onSnapshot, doc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- VARIÁVEIS GLOBAIS E CONFIGURAÇÃO ---
const appId = firebaseConfig.projectId;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let userId;
let allProcesses = [];
let currentUser = null;

// --- UTILITY FUNCTION FOR SAFE DOM ACCESS ---
function getById(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with ID '${id}' not found.`);
    }
    return element;
}

// Helper function to calculate maturity score (copied from processos.js)
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

function getMaturityColorClass(score) {
    if (score >= 76) return 'text-green-400';
    if (score >= 51) return 'text-sky-400'; // Using sky-400 as a moderate blue
    if (score >= 26) return 'text-orange-400';
    return 'text-red-400';
}

// --- LÓGICA DA ANIMAÇÃO DE FUNDO (Copied from projetos.js / departamentos.html) ---
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

// --- FUNÇÕES DE DASHBOARD ---
let processStatusChartInstance = null;
let processCriticalityChartInstance = null;
let averageMaturityByDimensionChartInstance = null;

function renderDashboard(processes) {
    // Overall Metrics
    getById('totalProcesses').textContent = processes.length;
    getById('completedProcesses').textContent = processes.filter(p => p.status === 'Concluído').length;

    const totalMaturityScore = processes.reduce((sum, p) => sum + calculateMaturityScore(p.maturityAnalysis), 0);
    const averageMaturity = processes.length > 0 ? Math.round(totalMaturityScore / processes.length) : 0;
    getById('averageMaturity').textContent = averageMaturity;

    // Charts
    renderProcessStatusChart(processes);
    renderProcessCriticalityChart(processes);
    renderAverageMaturityByDimensionChart(processes);
}

function renderProcessStatusChart(processes) {
    const statusCounts = {};
    processes.forEach(p => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });

    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);
    const backgroundColors = [
        'rgba(34, 197, 94, 0.7)', // Concluído (green)
        'rgba(59, 130, 246, 0.7)', // Em Andamento (blue)
        'rgba(251, 191, 36, 0.7)', // Pendente (yellow)
        'rgba(239, 68, 68, 0.7)', // Cancelado (red)
        'rgba(147, 51, 234, 0.7)', // Portfólio (purple)
        'rgba(100, 116, 139, 0.7)' // Outros (slate)
    ];

    const ctx = getById('processStatusChart').getContext('2d');
    if (processStatusChartInstance) {
        processStatusChartInstance.destroy();
    }
    processStatusChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#1E293B', // slate-800
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#E2E8F0' // slate-200
                    }
                },
                title: {
                    display: false
                }
            }
        }
    });
}

function renderProcessCriticalityChart(processes) {
    const criticalityCounts = {
        'Baixa': 0,
        'Média': 0,
        'Alta': 0,
        'Crítica': 0
    };
    processes.forEach(p => {
        if (criticalityCounts.hasOwnProperty(p.criticality)) {
            criticalityCounts[p.criticality]++;
        }
    });

    const labels = Object.keys(criticalityCounts);
    const data = Object.values(criticalityCounts);
    const backgroundColors = [
        'rgba(34, 197, 94, 0.7)', // Baixa (green)
        'rgba(59, 130, 246, 0.7)', // Média (blue)
        'rgba(251, 191, 36, 0.7)', // Alta (yellow)
        'rgba(239, 68, 68, 0.7)'  // Crítica (red)
    ];

    const ctx = getById('processCriticalityChart').getContext('2d');
    if (processCriticalityChartInstance) {
        processCriticalityChartInstance.destroy();
    }
    processCriticalityChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Número de Processos',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#1E293B', // slate-800
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#E2E8F0' // slate-200
                    }
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94A3B8' // slate-400
                    },
                    grid: {
                        color: 'rgba(71, 85, 105, 0.3)' // slate-700 with opacity
                    }
                },
                x: {
                    ticks: {
                        color: '#94A3B8' // slate-400
                    },
                    grid: {
                        color: 'rgba(71, 85, 105, 0.3)' // slate-700 with opacity
                    }
                }
            }
        }
    });
}

function renderAverageMaturityByDimensionChart(processes) {
    const dimensionScores = {};
    const dimensionCounts = {};

    maturityDimensions.forEach(dim => {
        dimensionScores[dim.id] = 0;
        dimensionCounts[dim.id] = 0;
    });

    processes.forEach(p => {
        if (p.maturityAnalysis) {
            maturityDimensions.forEach(dim => {
                const score = p.maturityAnalysis[dim.id];
                if (typeof score === 'number' && score >= 1 && score <= 5) {
                    dimensionScores[dim.id] += score;
                    dimensionCounts[dim.id]++;
                }
            });
        }
    });

    const labels = maturityDimensions.map(dim => dim.name.split('. ')[1]);
    const data = maturityDimensions.map(dim => {
        return dimensionCounts[dim.id] > 0 ? Math.round(dimensionScores[dim.id] / dimensionCounts[dim.id]) : 0;
    });

    const ctx = getById('averageMaturityByDimensionChart').getContext('2d');
    if (averageMaturityByDimensionChartInstance) {
        averageMaturityByDimensionChartInstance.destroy();
    }
    averageMaturityByDimensionChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nível Médio de Maturidade',
                data: data,
                fill: true,
                backgroundColor: 'rgba(14, 165, 233, 0.2)', // sky-500 with opacity
                borderColor: 'rgb(14, 165, 233)', // sky-500
                pointBackgroundColor: 'rgb(14, 165, 233)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(14, 165, 233)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#E2E8F0' // slate-200
                    }
                },
                title: {
                    display: false
                }
            },
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                    grid: { color: 'rgba(71, 85, 105, 0.3)' }, // slate-700 with opacity
                    pointLabels: {
                        font: {
                            size: 12
                        },
                        color: '#CBD5E1' // slate-300
                    },
                    ticks: {
                        backdropColor: 'rgba(15, 23, 42, 0.75)', // slate-900 with opacity
                        color: '#94A3B8', // slate-400
                        stepSize: 1,
                        beginAtZero: true,
                        max: 5
                    }
                }
            }
        }
    });
}

// --- MAIN FUNCTION ---
async function main() {
    const sidebar = getById('sidebar-container');
    const sidebarToggleButton = getById('sidebarToggleButton');
    const sidebarCloseButton = getById('sidebarCloseButton');

    initializeGanttBackground(); // Initialize background animation

    await onAuthStateChanged(auth, async (user) => {
        if (!user) {
            try {
                if (initialAuthToken) { await signInWithCustomToken(auth, initialAuthToken); }
                else { await signInAnonymously(auth); }
            } catch (error) { console.error("Erro na autenticação:", error); }
        }
        userId = auth.currentUser?.uid || crypto.randomUUID();
        currentUser = await getCurrentUser();
        
        // Fetch processes data
        onSnapshot(collection(db, `artifacts/${appId}/public/data/processos`), (snapshot) => {
            allProcesses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderDashboard(allProcesses); // Render dashboard with fetched data
        });
    });

    // Setup sidebar listeners
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
    
    renderSidebar(window.location.pathname, showAlert); // Render sidebar
}

// --- UTILITY FUNCTIONS FOR MODALS (copied from processos.js for consistency) ---
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

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', main);