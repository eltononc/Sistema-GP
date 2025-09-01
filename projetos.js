import { renderSidebar } from './sidebar.js';
import { db, auth, app, firebaseConfig } from './firebase-config.js';
import { collection, onSnapshot, doc, deleteDoc, setDoc, getDocs, getDoc, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { signInWithCustomToken, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- VARIÁVEIS GLOBAIS E CONFIGURAÇÃO ---
const appId = firebaseConfig.projectId; // Use projectId from imported config
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let userId; // app, db, auth are now imported
let allProjects = [];
let currentUser = null;
let confirmCallback = null;
let allUsersWithPhotos = []; // New global variable to store users with photos

// No try...catch for Firebase initialization here, as it's handled by firebase-config.js

// --- FUNÇÕES DE MODAIS ---
function showConfirmation(message, callback) {
    document.getElementById('confirmationModalMessage').textContent = message;
    document.getElementById('confirmationModal').classList.remove('hidden');
    document.getElementById('confirmationModal').classList.add('flex');
    confirmCallback = callback;
}

function closeConfirmationModal() {
    document.getElementById('confirmationModal').classList.add('hidden');
    document.getElementById('confirmationModal').classList.remove('flex');
    confirmCallback = null;
}

function showAlert(message) {
    document.getElementById('alertModalMessage').textContent = message;
    document.getElementById('alertModal').classList.remove('hidden');
    document.getElementById('alertModal').classList.add('flex');
}

function closeAlertModal() {
    document.getElementById('alertModal').classList.add('hidden');
    document.getElementById('alertModal').classList.remove('flex');
}

// --- LÓGICA DA ANIMAÇÃO DE FUNDO ---
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

// --- FUNÇÕES DO FIRESTORE (CRUD) ---

async function getCurrentUser() {
    const userEmail = localStorage.getItem('loggedInUserEmail');
    console.log("DEBUG: getCurrentUser - userEmail from localStorage:", userEmail);
    if (!userEmail) {
        console.log("DEBUG: getCurrentUser - userEmail is null or empty.");
        return null;
    }

    const usersRef = collection(db, `artifacts/${appId}/public/data/users`);
    console.log("DEBUG: getCurrentUser - Querying users collection:", `artifacts/${appId}/public/data/users`);
    const q = query(usersRef, where("email", "==", userEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        console.log("DEBUG: getCurrentUser - No user found with email:", userEmail);
        return null;
    }
    console.log("DEBUG: getCurrentUser - User found:", querySnapshot.docs[0].data());
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
}

async function approveProject() {
    const projectId = document.getElementById('projetoId').value;
    if (!projectId) return;

    showConfirmation("Tem certeza que deseja aprovar este projeto? O status será alterado para 'Não iniciado'.", async () => {
        try {
            const projectRef = doc(db, `artifacts/${appId}/public/data/projects`, projectId);
            await setDoc(projectRef, { status: "Não iniciado" }, { merge: true });
            showAlert("Projeto aprovado com sucesso!");
            document.getElementById('projectStatus').value = "Não iniciado";
            document.getElementById('approveProjectButton').classList.add('hidden');
        } catch (error) {
            console.error("Erro ao aprovar projeto:", error);
            showAlert("Ocorreu um erro ao aprovar o projeto.");
        }
    });
}

async function saveProject() {
    const projectId = document.getElementById('projetoId').value;
    const projectName = document.getElementById('projectName').value.trim();
    const projectPortfolioSelect = document.getElementById('projectPortfolio');
    const projectPortfolioId = projectPortfolioSelect.value;
    const projectPortfolioName = projectPortfolioId ? projectPortfolioSelect.options[projectPortfolioSelect.selectedIndex].textContent : '';
    const projectPriority = document.getElementById('projectPriority').value;
    const projectStartDate = document.getElementById('projectStartDate').value;
    const projectEndDate = document.getElementById('projectEndDate').value;
    const projectAction = document.getElementById('projectAction').value;
    const projectOrigin = document.getElementById('projectOrigin').value;
    
    const projectTechPersonId = document.getElementById('projectTechPersonId').value;
    const projectTechPersonName = document.getElementById('projectTechPersonName').textContent;

    const projectBusinessPersonId = document.getElementById('projectBusinessPersonId').value;
    const projectBusinessPersonName = document.getElementById('projectBusinessPersonName').textContent;

    const projectPartnerSelect = document.getElementById('projectPartner');
    const projectPartnerId = projectPartnerSelect.value;
    const projectPartnerName = projectPartnerId ? projectPartnerSelect.options[projectPartnerSelect.selectedIndex].textContent : '';
    
    
    
    const projectLink = document.getElementById('projectLink').value.trim();
    const projectSuccessCriteria = document.getElementById('projectSuccessCriteria').value.trim();
    
    const pillsContainer = document.getElementById('dependencies-pills-container');
    const projectDependencies = [...pillsContainer.children].map(pill => ({ 
        id: pill.dataset.id, 
        name: pill.textContent.slice(0, -1).trim() 
    }));

    const projectJustification = document.getElementById('projectJustification').value.trim();
    const projectObservations = document.getElementById('projectObservations').value.trim();
    
    const projectCsatScore = document.getElementById('projectCsatScore').value;
    const projectCsatFeedback = document.getElementById('projectCsatFeedback').value.trim();

    const stakeholdersPills = document.getElementById('stakeholders-pills-container');
    const stakeholdersToNotify = [...stakeholdersPills.children].map(pill => ({
        id: pill.dataset.id,
        name: pill.textContent.slice(0, -1).trim()
    }));

    if (!projectName) {
        showAlert('Por favor, preencha os campos obrigatórios: Nome do Projeto.');
        return;
    }

    const projectData = {
        name: projectName,
        portfolio: { id: projectPortfolioId, name: projectPortfolioName },
        priority: projectPriority,
        startDate: projectStartDate,
        endDate: projectEndDate,
        action: projectAction,
        origin: projectOrigin,
        techPerson: { id: projectTechPersonId, name: projectTechPersonName },
        businessPerson: { id: projectBusinessPersonId, name: projectBusinessPersonName },
        partner: { id: projectPartnerId, name: projectPartnerName },
        
        link: projectLink,
        successCriteria: projectSuccessCriteria,
        dependencies: projectDependencies,
        justification: projectJustification,
        observations: projectObservations,
        stakeholders: stakeholdersToNotify, // Add this line
        csat: {
            score: projectCsatScore ? parseInt(projectCsatScore) : null,
            feedback: projectCsatFeedback,
        },
        evaluationStatus: projectCsatScore ? 'Concluído' : 'Pendente',
    };

    try {
        const projectsColRef = collection(db, `artifacts/${appId}/public/data/projects`);
        if (projectId) { // Update
            projectData.status = document.getElementById('projectStatus').value;
            const docRef = doc(db, `artifacts/${appId}/public/data/projects`, projectId);
            await setDoc(docRef, projectData, { merge: true });
            showAlert("Projeto atualizado com sucesso!");
        } else { // Create
            projectData.status = 'Portfólio'; // Set default status for new projects
            projectData.createdAt = new Date();

            const projectsColRef = collection(db, `artifacts/${appId}/public/data/projects`);
            const querySnapshot = await getDocs(projectsColRef);
            const lastId = querySnapshot.docs.reduce((max, doc) => {
                const docIdNum = parseInt(doc.id);
                return docIdNum > max ? docIdNum : max;
            }, 0);
            const newId = lastId + 1;

            projectData.id = newId;

            await setDoc(doc(db, `artifacts/${appId}/public/data/projects`, newId.toString()), projectData);
            showAlert("Projeto cadastrado com sucesso!");
        }
        toggleForm(false);
    } catch (error) {
        console.error("Erro ao salvar projeto:", error);
        showAlert("Ocorreu um erro ao salvar o projeto. Tente novamente.");
    }
}

async function deleteProject(id) {
    showConfirmation(`Tem certeza que deseja excluir o projeto com ID ${id}?`, async () => {
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/projects`, id));
            showAlert("Projeto excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao deletar projeto:", error);
            showAlert("Ocorreu um erro ao excluir o projeto. Tente novamente.");
        }
    });
}

function renderProjects(projects) {
    const projetosTableBody = document.getElementById('projetosTableBody');
    if (!projetosTableBody) return;
    
    projetosTableBody.innerHTML = '';
    projects.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    if (projects.length === 0) {
        projetosTableBody.innerHTML = '<tr><td colspan="9" class="text-center p-8">Nenhum projeto encontrado.</td></tr>';
        return;
    }

    projects.forEach(project => {
        const tr = document.createElement('tr');
        tr.className = "bg-slate-900 border-b border-slate-700 hover:bg-slate-800 transition-colors";
        
        const status = project.status || 'Não iniciado';
        let statusColor = 'bg-slate-500/20 text-slate-400';
        switch(status) {
            case 'Portfólio': statusColor = 'bg-purple-500/20 text-purple-400'; break;
            case 'Em andamento': statusColor = 'bg-blue-500/20 text-blue-400'; break;
            case 'Concluído': statusColor = 'bg-green-500/20 text-green-400'; break;
            case 'Pausado': statusColor = 'bg-yellow-500/20 text-yellow-400'; break;
            case 'Cancelado': statusColor = 'bg-red-500/20 text-red-400'; break;
        }

        const dependenciesCount = project.dependencies?.length || 0;
        const csatScore = project.csat?.score ? `${project.csat.score} ★` : 'N/A';

        tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-white table-cell-responsive">${project.id}</td>
            <td class="px-6 py-4 table-cell-responsive"><span class="px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColor}">${status}</span></td>
            <td class="px-6 py-4 table-cell-responsive">${project.name}</td>
            <td class="px-6 py-4 table-cell-responsive">${project.portfolio?.name || 'N/A'}</td>
            
            <td class="px-6 py-4 table-cell-responsive">${dependenciesCount}</td>
            <td class="px-6 py-4 table-cell-responsive">${csatScore}</td>
            <td class="px-6 py-4 text-right table-cell-responsive">
                <div class="flex items-center justify-end gap-4">
                    <button class="text-sky-400 hover:text-sky-500 edit-btn transition-transform hover:scale-110" data-id="${project.id}" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="text-red-500 hover:text-red-600 delete-btn transition-transform hover:scale-110" data-id="${project.id}" title="Excluir">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        projetosTableBody.appendChild(tr);
    });
}

function resetProjectForm() {
    const projetoIdEl = document.getElementById('projetoId');
    if (projetoIdEl) projetoIdEl.value = "";

    const projectNameEl = document.getElementById('projectName');
    if (projectNameEl) projectNameEl.value = "";

    const projectPortfolioEl = document.getElementById('projectPortfolio');
    if (projectPortfolioEl) projectPortfolioEl.value = "";

    const projectPriorityEl = document.getElementById('projectPriority');
    if (projectPriorityEl) projectPriorityEl.value = "Baixa";

    const projectStartDateEl = document.getElementById('projectStartDate');
    if (projectStartDateEl) projectStartDateEl.value = "";

    const projectEndDateEl = document.getElementById('projectEndDate');
    if (projectEndDateEl) projectEndDateEl.value = "";

    const projectActionEl = document.getElementById('projectAction');
    if (projectActionEl) projectActionEl.value = "Acompanhar";

    const projectOriginEl = document.getElementById('projectOrigin');
    if (projectOriginEl) projectOriginEl.value = "Projeto TI";

    const projectTechPersonEl = document.getElementById('projectTechPerson');
    if (projectTechPersonEl) projectTechPersonEl.value = "";

    const projectBusinessPersonEl = document.getElementById('projectBusinessPerson');
    if (projectBusinessPersonEl) projectBusinessPersonEl.value = "";

    const projectPartnerEl = document.getElementById('projectPartner');
    if (projectPartnerEl) projectPartnerEl.value = "";

    

    const projectLinkEl = document.getElementById('projectLink');
    if (projectLinkEl) projectLinkEl.value = "";

    const projectSuccessCriteriaEl = document.getElementById('projectSuccessCriteria');
    if (projectSuccessCriteriaEl) projectSuccessCriteriaEl.value = "";

    initializeDependenciesComponent(null, []);

    const projectJustificationEl = document.getElementById('projectJustification');
    if (projectJustificationEl) projectJustificationEl.value = "";

    const projectObservationsEl = document.getElementById('projectObservations');
    if (projectObservationsEl) projectObservationsEl.value = "";

    const projectStatusEl = document.getElementById('projectStatus');
    if (projectStatusEl) projectStatusEl.value = "Portfólio";

    const projectCsatScoreEl = document.getElementById('projectCsatScore');
    if (projectCsatScoreEl) projectCsatScoreEl.value = "";

    const projectCsatFeedbackEl = document.getElementById('projectCsatFeedback');
    if (projectCsatFeedbackEl) projectCsatFeedbackEl.value = "";

    const csatSectionEl = document.getElementById('csatSection');
    if (csatSectionEl) csatSectionEl.classList.add('hidden');

    const approveProjectButtonEl = document.getElementById('approveProjectButton');
    if (approveProjectButtonEl) approveProjectButtonEl.classList.add('hidden');
}

async function toggleForm(show, project = null) {
    const cadastroForm = document.getElementById('cadastroFormContainer');
    const listContainer = document.getElementById('projetosListContainer');
    const searchContainer = document.getElementById('search-form-container');
    const saveButton = document.getElementById('saveProjectButton');
    const approveButton = document.getElementById('approveProjectButton');
    const csatSection = document.getElementById('csatSection');
    const formTitleEl = document.getElementById('formTitle');
    const statusContainer = document.getElementById('statusContainer');

    if (show) {
        listContainer.classList.add('hidden');
        searchContainer.classList.add('hidden');
        cadastroForm.classList.remove('hidden');

        setTimeout(async () => {
            resetProjectForm();
            // Ensure users are populated before rendering dropdowns
            await populateUsersDropdown();
            // Render custom dropdowns after the form is visible
            renderCustomUserDropdown('projectTechPerson', allUsersWithPhotos);
            renderCustomUserDropdown('projectBusinessPerson', allUsersWithPhotos);

            if (project) { // Edit mode
                statusContainer.classList.remove('hidden');
                formTitleEl.textContent = 'Editar Projeto';
                saveButton.textContent = 'Atualizar';
                document.getElementById('projetoId').value = project.id;
                document.getElementById('projectName').value = project.name || '';
                document.getElementById('projectPortfolio').value = project.portfolio?.id || '';
                document.getElementById('projectPriority').value = project.priority || 'Baixa';
                document.getElementById('projectStartDate').value = project.startDate || '';
                document.getElementById('projectEndDate').value = project.endDate || '';
                document.getElementById('projectAction').value = project.action || 'Acompanhar';
                document.getElementById('projectOrigin').value = project.origin || 'Projeto TI';

                try {
                    console.log("DEBUG: Calling setCustomDropdownValue for projectTechPerson with ID:", project.techPerson?.id);
                    setCustomDropdownValue('projectTechPerson', project.techPerson?.id);
                    console.log("DEBUG: Calling setCustomDropdownValue for projectBusinessPerson with ID:", project.businessPerson?.id);
                    setCustomDropdownValue('projectBusinessPerson', project.businessPerson?.id);
                } catch (e) {
                    console.error("ERROR: Erro ao definir dropdowns personalizados:", e);
                }
                document.getElementById('projectPartner').value = project.partner?.id || '';
                
                document.getElementById('projectLink').value = project.link || '';
                document.getElementById('projectSuccessCriteria').value = project.successCriteria || '';
                initializeDependenciesComponent(project.id, project.dependencies || []);
                document.getElementById('projectJustification').value = project.justification || '';
                document.getElementById('projectObservations').value = project.observations || '';
                document.getElementById('projectStatus').value = project.status || 'Portfólio';
                
                // Populate departments dropdown and clients for notification
                if (project.stakeholders && project.stakeholders.length > 0) {
                initializeStakeholdersComponent(project.stakeholders);
            } else {
                initializeStakeholdersComponent([]);
            }

                if (project.status === 'Portfólio') {
                    approveButton.classList.remove('hidden');
                    const portfolioId = project.portfolio?.id;
                    if (portfolioId && currentUser) {
                        const portfolioRef = doc(db, `artifacts/${appId}/public/data/portfolios`, portfolioId);
                        const portfolioSnap = await getDoc(portfolioRef);
                        if (portfolioSnap.exists()) {
                            const portfolio = portfolioSnap.data();
                            if (portfolio.responsible?.id === currentUser.id) {
                                approveButton.disabled = false;
                                approveButton.title = "Aprovar este projeto";
                            } else {
                                approveButton.disabled = true;
                                approveButton.title = "Você não é o responsável pelo portfólio para aprovar este projeto.";
                            }
                        }
                    } else {
                         approveButton.disabled = true;
                         approveButton.title = "Selecione um portfólio com responsável para aprovar.";
                    }
                }

                if (project.status === 'Concluído') {
                    csatSection.classList.remove('hidden');
                    document.getElementById('projectCsatScore').value = project.csat?.score || '';
                    document.getElementById('projectCsatFeedback').value = project.csat?.feedback || '';
                }

            } else { // Add mode
                statusContainer.classList.add('hidden');
                formTitleEl.textContent = 'Cadastrar Novo Projeto';
                saveButton.textContent = 'Salvar';
                initializeDependenciesComponent(null, []);
                initializeStakeholdersComponent([]);
            

                // Reset custom user dropdowns using the helper function with a small delay
                setCustomDropdownValue('projectTechPerson', null);
                setCustomDropdownValue('projectBusinessPerson', null);
            }
        }, 50);
    } else {
        cadastroForm.classList.add('hidden');
        listContainer.classList.remove('hidden');
        searchContainer.classList.remove('hidden');
    }
}

// --- LÓGICA DO CAMPO DE DEPENDÊNCIAS ---

function initializeDependenciesComponent(currentProjectId, existingDependencies) {
    const container = document.getElementById('dependencies-container');
    const pillsContainer = document.getElementById('dependencies-pills-container');
    const input = document.getElementById('projectDependenciesInput');
    const resultsDropdown = document.getElementById('dependencies-results');

    pillsContainer.innerHTML = '';
    input.value = '';

    let selectedIds = new Set(existingDependencies.map(dep => dep.id));

    existingDependencies.forEach(dep => addDependencyTag(dep.name, dep.id));

    function addDependencyTag(name, id) {
        if (selectedIds.has(id)) return;

        const pill = document.createElement('div');
        pill.className = 'tag-pill';
        pill.dataset.id = id;
        pill.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>${name}</span>
        `;
        
        const removeBtn = document.createElement('span');
        removeBtn.className = 'tag-pill-remove';
        removeBtn.innerHTML = ' &times;';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeDependencyTag(id);
        };
        
        pill.appendChild(removeBtn);
        pillsContainer.appendChild(pill);
        selectedIds.add(id);

        // Check if the added dependency has an end date and prompt to update project start date
        const addedProject = allProjects.find(p => p.id.toString() === id.toString());
        if (addedProject && addedProject.endDate) {
            const dependencyEndDate = new Date(addedProject.endDate);
            const newProjectStartDate = new Date(dependencyEndDate);
            newProjectStartDate.setDate(dependencyEndDate.getDate() + 1);

            const projectStartDateInput = document.getElementById('projectStartDate');
            if (projectStartDateInput) {
                const formattedNewDate = newProjectStartDate.toISOString().split('T')[0];
                showConfirmation(`A data de término do projeto dependente (${addedProject.name}) é ${dependencyEndDate.toLocaleDateString()}. Deseja alterar a data de previsão de início deste projeto para ${newProjectStartDate.toLocaleDateString()}?`, () => {
                    projectStartDateInput.value = formattedNewDate;
                });
            }
        }
    }

    function removeDependencyTag(id) {
        const pill = pillsContainer.querySelector(`[data-id="${id}"]`);
        if (pill) {
            pillsContainer.removeChild(pill);
            selectedIds.delete(id.toString());
        }
    }

    input.oninput = () => {
        const searchTerm = input.value.toLowerCase();
        resultsDropdown.innerHTML = '';

        console.log("DEBUG: Dependencies input - searchTerm:", searchTerm);
        console.log("DEBUG: Dependencies input - allProjects.length:", allProjects.length);
        console.log("DEBUG: Dependencies input - currentProjectId:", currentProjectId);
        console.log("DEBUG: Dependencies input - selectedIds:", selectedIds);

        if (searchTerm.length === 0) {
            resultsDropdown.classList.add('hidden');
            return;
        }

        const filtered = allProjects.filter(p => 
            p.id.toString() !== currentProjectId &&
            !selectedIds.has(p.id.toString()) &&
            p.name.toLowerCase().includes(searchTerm)
        );

        console.log("DEBUG: Dependencies input - filtered projects:", filtered);

        if (filtered.length > 0) {
            resultsDropdown.classList.remove('hidden');
            filtered.forEach(p => {
                const item = document.createElement('div');
                item.className = 'tag-result-item';
                const startDate = p.startDate ? new Date(p.startDate).toLocaleDateString() : 'N/A';
                const endDate = p.endDate ? new Date(p.endDate).toLocaleDateString() : 'N/A';
                item.innerHTML = `
                    <strong>${p.name}</strong><br>
                    <small>Início: ${startDate}, Fim: ${endDate}</small>
                `;
                item.onclick = () => {
                    addDependencyTag(p.name, p.id.toString());
                    input.value = '';
                    resultsDropdown.classList.add('hidden');
                };
                resultsDropdown.appendChild(item);
            });
        } else {
            resultsDropdown.classList.remove('hidden');
            const noResultsItem = document.createElement('div');
            noResultsItem.className = 'tag-result-item text-slate-400';
            noResultsItem.textContent = 'Nenhum projeto encontrado.';
            resultsDropdown.appendChild(noResultsItem);
        }
    };

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            resultsDropdown.classList.add('hidden');
        }
    });
}

function initializeStakeholdersComponent(existingStakeholders) {
    const container = document.getElementById('stakeholders-container');
    const pillsContainer = document.getElementById('stakeholders-pills-container');
    const input = document.getElementById('projectStakeholdersInput');
    const resultsDropdown = document.getElementById('stakeholders-results');

    pillsContainer.innerHTML = '';
    input.value = '';

    let selectedIds = new Set(existingStakeholders.map(stakeholder => stakeholder.id));

    existingStakeholders.forEach(stakeholder => {
        const user = allUsersWithPhotos.find(u => u.id === stakeholder.id);
        addStakeholderTag(stakeholder.name, stakeholder.id, user ? user.profilePictureUrl : null);
    });

    function addStakeholderTag(name, id, photoUrl = 'https://res.cloudinary.com/djikr5paz/image/upload/v1756664637/default_avatar_lxdi55.jpg') {
        if (selectedIds.has(id)) return;

        const pill = document.createElement('div');
        pill.className = 'tag-pill';
        pill.dataset.id = id;
        pill.innerHTML = `
            <img src="${photoUrl}" alt="Foto" class="w-5 h-5 rounded-full object-cover mr-1">
            <span>${name}</span>
        `;
        
        const removeBtn = document.createElement('span');
        removeBtn.className = 'tag-pill-remove';
        removeBtn.innerHTML = ' &times;';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeStakeholderTag(id);
        };
        
        pill.appendChild(removeBtn);
        pillsContainer.appendChild(pill);
        selectedIds.add(id);
    }

    function removeStakeholderTag(id) {
        const pill = pillsContainer.querySelector(`[data-id="${id}"]`);
        if (pill) {
            pillsContainer.removeChild(pill);
            selectedIds.delete(id.toString());
        }
    }

    input.oninput = () => {
        const searchTerm = input.value.toLowerCase();
        resultsDropdown.innerHTML = '';

        if (searchTerm.length === 0) {
            resultsDropdown.classList.add('hidden');
            return;
        }

        const filtered = allUsersWithPhotos.filter(user =>
            !selectedIds.has(user.id.toString()) &&
            user.fullName.toLowerCase().includes(searchTerm)
        );

        if (filtered.length > 0) {
            resultsDropdown.classList.remove('hidden');
            filtered.forEach(user => {
                const item = document.createElement('div');
                item.className = 'tag-result-item flex items-center';
                item.innerHTML = `
                    <img src="${user.profilePictureUrl || 'https://res.cloudinary.com/djikr5paz/image/upload/v1756664637/default_avatar_lxdi55.jpg'}" alt="Foto" class="w-8 h-8 rounded-full object-cover mr-2">
                    <span>${user.fullName}</span>
                `;
                item.onclick = () => {
                    addStakeholderTag(user.fullName, user.id.toString(), user.profilePictureUrl);
                    input.value = '';
                    resultsDropdown.classList.add('hidden');
                };
                resultsDropdown.appendChild(item);
            });
        } else {
            resultsDropdown.classList.remove('hidden');
            const noResultsItem = document.createElement('div');
            noResultsItem.className = 'tag-result-item text-slate-400';
            noResultsItem.textContent = 'Nenhum usuário encontrado.';
            resultsDropdown.appendChild(noResultsItem);
        }
    };

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            resultsDropdown.classList.add('hidden');
        }
    });
}


async function populateUsersDropdown() {
    console.log("DEBUG: populateUsersDropdown started.");
    try {
        const usersColRef = collection(db, `artifacts/${appId}/public/data/users`);
        console.log("DEBUG: Querying users from path:", `artifacts/${appId}/public/data/users`);
        const querySnapshot = await getDocs(usersColRef);
        
        allUsersWithPhotos = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(user => user.status === 'Ativo')
            .sort((a, b) => a.fullName.localeCompare(b.fullName));

        console.log("DEBUG: Users fetched and filtered:", allUsersWithPhotos);

    } catch (error) {
        console.error("ERROR: Erro ao carregar usuários para o dropdown:", error);
        // Handle error display for custom dropdowns if needed
    }
}

function renderCustomUserDropdown(dropdownIdPrefix, users) {
    console.log(`DEBUG: renderCustomUserDropdown called for ${dropdownIdPrefix} with ${users.length} users.`);
    const displayElement = document.getElementById(`${dropdownIdPrefix}Display`);
    const hiddenIdInput = document.getElementById(`${dropdownIdPrefix}Id`);
    const dropdownContainer = document.getElementById(`${dropdownIdPrefix}Dropdown`);
    const photoElement = document.getElementById(`${dropdownIdPrefix}Photo`);
    const nameElement = document.getElementById(`${dropdownIdPrefix}Name`);

    if (!displayElement || !hiddenIdInput || !dropdownContainer) {
        console.warn(`WARN: Elementos para ${dropdownIdPrefix} não encontrados.`);
        return;
    }

    dropdownContainer.innerHTML = ''; // Clear previous options

    users.forEach(user => {
        console.log(`DEBUG: Rendering user: ${user.fullName} (ID: ${user.id})`);
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
            console.log(`DEBUG: User selected: ${user.fullName} (ID: ${user.id})`);
            hiddenIdInput.value = user.id;
            nameElement.textContent = user.fullName;
            photoElement.src = user.profilePictureUrl || 'https://res.cloudinary.com/djikr5paz/image/upload/v1756664637/default_avatar_lxdi55.jpg';
            photoElement.classList.remove('hidden');
            dropdownContainer.classList.add('hidden');
        });
    });

    // Toggle dropdown visibility
    displayElement.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent document click from closing immediately
        dropdownContainer.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!displayElement.contains(event.target) && !dropdownContainer.contains(event.target)) {
            dropdownContainer.classList.add('hidden');
        }
    });

    // Set initial display for new project
    if (!hiddenIdInput.value) {
        nameElement.textContent = 'Selecione um usuário...';
        photoElement.classList.add('hidden');
    }
}

function setCustomDropdownValue(dropdownIdPrefix, userId) {
    console.log(`DEBUG: setCustomDropdownValue called for ${dropdownIdPrefix} with userId: ${userId}`);
    const hiddenIdInput = document.getElementById(`${dropdownIdPrefix}Id`);
    const nameElement = document.getElementById(`${dropdownIdPrefix}Name`);
    const photoElement = document.getElementById(`${dropdownIdPrefix}Photo`);

    console.log(`DEBUG: hiddenIdInput:`, hiddenIdInput);
    console.log(`DEBUG: nameElement:`, nameElement);
    console.log(`DEBUG: photoElement:`, photoElement);

    if (!hiddenIdInput || !nameElement || !photoElement) {
        console.warn(`WARN: Elementos para ${dropdownIdPrefix} não encontrados ao tentar definir valor.`);
        return;
    }

    const user = allUsersWithPhotos.find(u => u.id === userId);

    if (user) {
        console.log(`DEBUG: User found for setting value: ${user.fullName}`);
        hiddenIdInput.value = user.id;
        nameElement.textContent = user.fullName;
        photoElement.src = user.profilePictureUrl || 'https://res.cloudinary.com/djikr5paz/image/upload/v1756664637/default_avatar_lxdi55.jpg';
        photoElement.classList.remove('hidden');
    } else {
        console.log(`DEBUG: User not found for setting value. Resetting display.`);
        hiddenIdInput.value = '';
        nameElement.textContent = 'Selecione um usuário...';
        photoElement.classList.add('hidden');
        photoElement.src = 'https://res.cloudinary.com/djikr5paz/image/upload/v1756664637/default_avatar_lxdi55.jpg'; // Reset to default
    }
}



async function populateDepartmentsDropdown(selectedDepartmentId = null) {
    const departmentSelect = document.getElementById('clientDepartment');
    departmentSelect.innerHTML = '<option value="">Carregando departamentos...</option>';
    try {
        // Fetch all active clients to get their department IDs
        const clientsColRef = collection(db, `artifacts/default-app-id/public/data/clients`);
        const clientsQuerySnapshot = await getDocs(clientsColRef);
        const clientDepartmentIds = new Set();
        clientsQuerySnapshot.docs.forEach(doc => {
            const clientData = doc.data();
            if (clientData.status === 'Ativo' && clientData.department?.id) {
                clientDepartmentIds.add(clientData.department.id);
            }
        });

        const departmentsColRef = collection(db, `artifacts/${appId}/public/data/departments`);
        const querySnapshot = await getDocs(departmentsColRef);
        
        const activeDepartments = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(dept => dept.status === 'Ativo' && clientDepartmentIds.has(dept.id)) // Filter by active status AND if clients exist in this department
            .sort((a, b) => a.name.localeCompare(b.name));

        departmentSelect.innerHTML = '<option value="">Selecione um departamento</option>';
        activeDepartments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            departmentSelect.appendChild(option);
        });

        if (selectedDepartmentId) {
            departmentSelect.value = selectedDepartmentId;
        }
    } catch (error) {
        console.error("Erro ao carregar departamentos para o dropdown:", error);
        departmentSelect.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}



async function populatePartnersDropdown(selectedPartnerId = null) {
    const partnerSelect = document.getElementById('projectPartner');
    partnerSelect.innerHTML = '<option value="">Carregando parceiros...</option>';
    try {
        const partnersColRef = collection(db, `artifacts/${appId}/public/data/partners`);
        const querySnapshot = await getDocs(partnersColRef);
        
        const activePartners = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(partner => partner.status === 'Ativo')
            .sort((a, b) => a.name.localeCompare(b.name));

        partnerSelect.innerHTML = '<option value="">Selecione um parceiro (opcional)</option>';
        activePartners.forEach(partner => {
            const option = document.createElement('option');
            option.value = partner.id;
            option.textContent = partner.name;
            partnerSelect.appendChild(option);
        });

        if (selectedPartnerId) {
            partnerSelect.value = selectedPartnerId;
        }
    } catch (error) {
        console.error("Erro ao carregar parceiros para o dropdown:", error);
        partnerSelect.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

async function populatePortfoliosDropdown(selectedPortfolioId = null) {
    const portfolioSelect = document.getElementById('projectPortfolio');
    portfolioSelect.innerHTML = '<option value="">Carregando portfólios...</option>';
    try {
        // 1. Fetch all users to identify "Gerente de Portfólio"
        const usersColRef = collection(db, `artifacts/${appId}/public/data/users`);
        const usersSnapshot = await getDocs(usersColRef);
        const gerentePortfolioIds = new Set();
        usersSnapshot.docs.forEach(userDoc => {
            const userData = userDoc.data();
            if (userData.profile === 'Gerente de Portfólio') {
                gerentePortfolioIds.add(userDoc.id);
            }
        });

        const portfoliosColRef = collection(db, `artifacts/${appId}/public/data/portfolios`);
        const querySnapshot = await getDocs(portfoliosColRef);
        
        const activePortfolios = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(portfolio => portfolio.status === 'Ativo')
            .sort((a, b) => a.name.localeCompare(b.name));

        portfolioSelect.innerHTML = '<option value="">Selecione um portfólio</option>';
        activePortfolios.forEach(portfolio => {
            const option = document.createElement('option');
            option.value = portfolio.id;
            option.textContent = portfolio.name;
            portfolioSelect.appendChild(option);
        });

        if (selectedPortfolioId) {
            portfolioSelect.value = selectedPortfolioId;
        }
    } catch (error) {
        console.error("Erro ao carregar portfólios para o dropdown:", error);
        portfolioSelect.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

async function main() {
    initializeGanttBackground();

    // Move all element selections here
    const sidebar = document.getElementById('sidebar-container');
    const sidebarToggleButton = document.getElementById('sidebarToggleButton');
    const sidebarCloseButton = document.getElementById('sidebarCloseButton');
    const showFormButton = document.getElementById('showFormButton');
    const cancelButton = document.getElementById('cancelButton');
    const saveProjectButton = document.getElementById('saveProjectButton');
    const approveProjectButton = document.getElementById('approveProjectButton');
    const projectStatusSelect = document.getElementById('projectStatus');
    const csatSection = document.getElementById('csatSection');
    const projetosTableBody = document.getElementById('projetosTableBody');
    const confirmationModalCancelBtn = document.getElementById('confirmationModalCancelBtn');
    const confirmationModalConfirmBtn = document.getElementById('confirmationModalConfirmBtn');
    const confirmationModal = document.getElementById('confirmationModal');
    const alertModalOkBtn = document.getElementById('alertModalOkBtn');
    const alertModal = document.getElementById('alertModal');
    const searchProjetosInput = document.getElementById('searchProjetosInput');
    const formTitleEl = document.getElementById('formTitle');
    const statusContainer = document.getElementById('statusContainer');


    await onAuthStateChanged(auth, async (user) => {
        if (!user) {
            try {
                if (initialAuthToken) { await signInWithCustomToken(auth, initialAuthToken); }
                else { await signInAnonymously(auth); }
            } catch (error) { console.error("Erro na autenticação:", error); }
        }
        userId = auth.currentUser?.uid || crypto.randomUUID();
        currentUser = await getCurrentUser();
        
        onSnapshot(collection(db, `artifacts/${appId}/public/data/projects`), (snapshot) => {
            allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            filterAndRenderProjects();
        });

        await Promise.all([
            
            populatePartnersDropdown(),
            populateUsersDropdown(),
            populatePortfoliosDropdown(),
            populateDepartmentsDropdown()
        ]);
    });

    

    // Sidebar event listeners (now that elements are guaranteed to exist)
    sidebarToggleButton?.addEventListener('click', () => sidebar.classList.remove('-translate-x-full'));
    sidebarCloseButton?.addEventListener('click', () => sidebar.classList.add('-translate-x-full'));
    document.addEventListener('click', (event) => {
        if (window.innerWidth < 768 && !sidebar.contains(event.target) && !sidebarToggleButton.contains(event.target)) {
            sidebar.classList.add('-translate-x-full');
        }
    });
    
    renderSidebar(window.location.pathname, showAlert);

    // Botões de Ação (now using the correctly initialized variables)
    showFormButton.addEventListener('click', () => {
        toggleForm(true);
    });

    cancelButton.addEventListener('click', () => {
        toggleForm(false);
    });

    saveProjectButton.addEventListener('click', (e) => {
        e.preventDefault();
        saveProject();
    });

    approveProjectButton.addEventListener('click', approveProject);

    projectStatusSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Concluído') {
            csatSection.classList.remove('hidden');
        } else {
            csatSection.classList.add('hidden');
        }
    });

    projetosTableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const projectId = editBtn.dataset.id;
            const projectToEdit = allProjects.find(p => p.id.toString() === projectId.toString());
            if (projectToEdit) {
                await toggleForm(true, projectToEdit);
            }
        } else if (deleteBtn) {
            const projectId = deleteBtn.dataset.id;
            deleteProject(projectId);
        }
    });

    // Modais
    confirmationModalCancelBtn.addEventListener('click', () => closeConfirmationModal());
    confirmationModalConfirmBtn.addEventListener('click', () => {
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
        closeConfirmationModal();
    });
    confirmationModal.addEventListener('click', (e) => {
        if (e.target.id === 'confirmationModal') closeConfirmationModal();
    });

    alertModalOkBtn.addEventListener('click', () => closeAlertModal());
    alertModal.addEventListener('click', (e) => {
        if (e.target.id === 'alertModal') closeAlertModal();
    });

    // Filtro e Pesquisa
    searchProjetosInput.addEventListener('input', filterAndRenderProjects);
    function filterAndRenderProjects() {
        const searchTerm = searchProjetosInput.value.toLowerCase();
        const filtered = allProjects.filter(project =>
            project.name.toLowerCase().includes(searchTerm)
        );
        renderProjects(filtered);
    }
}

document.addEventListener('DOMContentLoaded', main);