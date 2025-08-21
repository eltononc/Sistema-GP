// settings.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- VARIÁVEIS GLOBAIS E CONFIGURAÇÃO ---
const firebaseConfig = {
    apiKey: "AIzaSyDS2bc8QBdpxaUiQjF-duyzgQK2JrGoucg",
    authDomain: "stake-pro-db.firebaseapp.com",
    projectId: "stake-pro-db",
    storageBucket: "stake-pro-db.appspot.com",
    messagingSenderId: "569517541701",
    appId: "1:569517541701:web:11b31335fca1d5a708562c"
};

let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (error) {
    console.error("Erro ao inicializar o Firebase no settings.js:", error);
}

let responsibleEmails = [];

// Função para injetar o ícone de configurações na sidebar
function injectSettingsIcon() {
    const sidebarNav = document.querySelector('#sidebar-container nav');
    if (!sidebarNav) return;

    const settingsButtonHtml = `
        <button id="settingsButton" class="sidebar-link flex items-center py-3 px-4 rounded-lg transition-all duration-200 w-full text-left mt-auto hover:bg-sky-700/50 text-sky-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-3">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Configurações
        </button>
    `;
    
    const logoutButton = document.getElementById('logoutButtonSidebar');
    if (logoutButton) {
        logoutButton.insertAdjacentHTML('beforebegin', settingsButtonHtml);
    } else {
        sidebarNav.insertAdjacentHTML('beforeend', settingsButtonHtml);
    }
}

// Função para injetar o HTML do modal de configurações
function injectSettingsModal() {
    const modalHtml = `
        <div id="settingsModal" class="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 hidden">
            <div class="glass-effect rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-700 m-4">
                <div class="flex justify-between items-center p-6 border-b border-slate-700">
                    <h3 class="text-2xl font-bold text-white flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-3"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        Configurações Gerais
                    </h3>
                    <button id="closeSettingsModal" class="text-slate-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div class="p-6 space-y-6 overflow-y-auto" style="max-height: 70vh;">
                    <!-- Seção de E-mails Responsáveis -->
                    <div class="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <h4 class="font-bold text-sky-400 text-lg mb-3">E-mails para Alertas</h4>
                        <p class="text-sm text-slate-400 mb-4">Adicione os e-mails que devem receber notificações sobre a utilização da ferramenta.</p>
                        <div class="flex gap-2 mb-3">
                            <input type="email" id="responsibleEmailInput" placeholder="exemplo@email.com" class="flex-grow bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                            <button id="addEmailButton" class="btn-liquid-fill flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Adicionar
                            </button>
                        </div>
                        <div id="emailList" class="space-y-2">
                            <!-- E-mails serão adicionados aqui dinamicamente -->
                        </div>
                    </div>

                    <!-- Seção de Alerta de Utilização -->
                    <div class="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <h4 class="font-bold text-green-400 text-lg mb-3">Alerta de Taxa de Utilização</h4>
                        <div class="flex items-center justify-between">
                            <label for="usageAlertToggle" class="flex items-center cursor-pointer">
                                <input type="checkbox" id="usageAlertToggle" class="sr-only peer">
                                <div class="relative w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                <span class="ml-3 text-sm font-medium text-slate-300">Receber alerta quando a taxa de utilização estiver acima de:</span>
                            </label>
                            <div class="flex items-center gap-2">
                                <input type="range" id="usagePercentageSlider" min="80" max="100" value="90" class="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer">
                                <span id="usagePercentageLabel" class="font-bold text-white text-lg">90%</span>
                                <button id="previewMessageButton" class="text-slate-400 hover:text-sky-400 transition-colors" title="Visualizar estrutura da mensagem">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end p-6 border-t border-slate-700">
                    <button id="cancelSettings" class="px-6 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors mr-2">Cancelar</button>
                    <button id="saveSettings" class="px-6 py-2 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors">Salvar Alterações</button>
                </div>
            </div>
        </div>

        <div id="previewModal" class="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 hidden">
            <div class="glass-effect rounded-2xl shadow-2xl w-full max-w-lg border border-slate-700 m-4">
                <div class="flex justify-between items-center p-6 border-b border-slate-700">
                    <h3 class="text-xl font-bold text-white">Visualização da Mensagem de Alerta</h3>
                    <button id="closePreviewModal" class="text-slate-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="p-6 bg-slate-900/50">
                    <p class="text-slate-300"><span class="font-semibold text-sky-400">Assunto:</span> Alerta de Taxa de Utilização</p>
                    <hr class="my-4 border-slate-700">
                    <p class="text-slate-300"><span class="font-semibold">Sistema:</span> [Nome do Sistema]</p>
                    <p class="text-slate-300"><span class="font-semibold">Taxa de Utilização Atual:</span> [XX]%</p>
                    <p class="text-slate-300"><span class="font-semibold">Limite Definido:</span> [YY]%</p>
                    <p class="text-slate-300 mt-4">A taxa de utilização de licenças do sistema excedeu o limite configurado.</p>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function renderEmailList() {
    const emailList = document.getElementById('emailList');
    emailList.innerHTML = '';
    responsibleEmails.forEach(email => {
        const emailTag = `
            <div class="flex items-center justify-between bg-slate-700/50 px-3 py-1.5 rounded-md text-sm">
                <span class="text-white">${email}</span>
                <button class="remove-email-btn text-red-400 hover:text-red-300" data-email="${email}" title="Remover e-mail">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;
        emailList.insertAdjacentHTML('beforeend', emailTag);
    });
}

async function loadSettings() {
    if (!db) return;
    const settingsRef = doc(db, "configs", "alerts");
    try {
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            responsibleEmails = settings.emails || [];
            renderEmailList();

            const usageAlert = settings.usageAlert || { enabled: false, percentage: 80 };
            document.getElementById('usageAlertToggle').checked = usageAlert.enabled;
            document.getElementById('usagePercentageSlider').value = usageAlert.percentage;
            document.getElementById('usagePercentageLabel').textContent = `${usageAlert.percentage}%`;
        } else {
            // Document doesn't exist, use default values
            responsibleEmails = [];
            renderEmailList();
        }
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
    }
}

async function saveSettings() {
    if (!db) return;
    const settingsRef = doc(db, "configs", "alerts");
    const settingsData = {
        emails: responsibleEmails,
        usageAlert: {
            enabled: document.getElementById('usageAlertToggle').checked,
            percentage: parseInt(document.getElementById('usagePercentageSlider').value, 10)
        }
    };

    try {
        await setDoc(settingsRef, settingsData);
        alert('Configurações salvas com sucesso!');
        document.getElementById('settingsModal').classList.add('hidden');
    } catch (error) {
        console.error("Erro ao salvar configurações:", error);
        alert('Erro ao salvar as configurações.');
    }
}

// Função principal para inicializar as configurações
function initializeSettings() {
    injectSettingsIcon();
    injectSettingsModal();

    const settingsModal = document.getElementById('settingsModal');
    const settingsButton = document.getElementById('settingsButton');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const cancelSettings = document.getElementById('cancelSettings');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const usagePercentageSlider = document.getElementById('usagePercentageSlider');
    const usagePercentageLabel = document.getElementById('usagePercentageLabel');
    const addEmailButton = document.getElementById('addEmailButton');
    const responsibleEmailInput = document.getElementById('responsibleEmailInput');
    const emailList = document.getElementById('emailList');
    const previewModal = document.getElementById('previewModal');
    const previewMessageButton = document.getElementById('previewMessageButton');
    const closePreviewModal = document.getElementById('closePreviewModal');

    // Abrir modal de configurações
    settingsButton.addEventListener('click', () => {
        loadSettings();
        settingsModal.classList.remove('hidden');
    });

    // Fechar modal de configurações
    const closeModal = () => settingsModal.classList.add('hidden');
    closeSettingsModal.addEventListener('click', closeModal);
    cancelSettings.addEventListener('click', closeModal);
    settingsModal.addEventListener('click', (event) => {
        if (event.target === settingsModal) closeModal();
    });

    // Salvar configurações
    saveSettingsBtn.addEventListener('click', saveSettings);

    // Atualizar label do slider
    usagePercentageSlider.addEventListener('input', () => {
        usagePercentageLabel.textContent = `${usagePercentageSlider.value}%`;
    });

    // Adicionar e-mail
    addEmailButton.addEventListener('click', () => {
        const email = responsibleEmailInput.value.trim();
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            if (!responsibleEmails.includes(email)) {
                responsibleEmails.push(email);
                renderEmailList();
            }
            responsibleEmailInput.value = '';
        } else {
            alert('Por favor, insira um e-mail válido.');
        }
    });
    
    // Remover e-mail
    emailList.addEventListener('click', (event) => {
        const removeButton = event.target.closest('.remove-email-btn');
        if (removeButton) {
            const emailToRemove = removeButton.dataset.email;
            responsibleEmails = responsibleEmails.filter(email => email !== emailToRemove);
            renderEmailList();
        }
    });

    // Abrir/Fechar modal de preview
    previewMessageButton.addEventListener('click', () => previewModal.classList.remove('hidden'));
    closePreviewModal.addEventListener('click', () => previewModal.classList.add('hidden'));
    previewModal.addEventListener('click', (event) => {
        if (event.target === previewModal) previewModal.classList.add('hidden');
    });
}

// Adiciona um listener para garantir que o DOM esteja carregado antes de rodar o script
document.addEventListener('DOMContentLoaded', initializeSettings);