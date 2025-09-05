
// parceiros.js

import { db, auth, app, firebaseConfig } from './firebase-config.js';
import { renderSidebar } from './sidebar.js';

let allPartners = [];
import { collection, onSnapshot, doc, setDoc, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
// ...
const appId = firebaseConfig.projectId;

// Global variables for multi-select
const multiSelectOptions = document.getElementById('multiSelectOptions');
const partnerAreaCheckboxes = multiSelectOptions ? multiSelectOptions.querySelectorAll('input[type="checkbox"]') : [];
let selectedAreas = [];

const selectedAreasDisplay = document.getElementById('selectedAreasDisplay');

function updateSelectedAreasDisplay() {
    if (selectedAreas.length === 0) {
        selectedAreasDisplay.textContent = 'Selecione a(s) Área(s) de Atuação';
    } else {
        selectedAreasDisplay.textContent = selectedAreas.join(', ');
    }
}



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

async function openPartnerDetailsModal(partnerId) {
    const partner = allPartners.find(p => p.id.toString() === partnerId.toString());
    if (!partner) {
        showAlert("Parceiro não encontrado.");
        return;
    }

    document.getElementById('detailsPartnerId').value = partner.id;
    document.getElementById('detailsPartnerPhone').value = partner.phone || '';
    document.getElementById('detailsPartnerContractLink').value = partner.contractLink || '';
    document.getElementById('detailsPartnerNotes').value = partner.notes || '';

    document.getElementById('partnerDetailsModal').classList.remove('hidden');
    document.getElementById('partnerDetailsModal').classList.add('flex');
}

async function savePartnerDetails() {
    const partnerId = document.getElementById('detailsPartnerId').value;
    const phone = document.getElementById('detailsPartnerPhone').value.trim();
    const contractLink = document.getElementById('detailsPartnerContractLink').value.trim();
    const notes = document.getElementById('detailsPartnerNotes').value.trim();

    if (!partnerId) {
        showAlert("ID do parceiro não encontrado para salvar detalhes.");
        return;
    }

    const partnerData = {
        phone: phone,
        contractLink: contractLink,
        notes: notes
    };

    try {
        const docRef = doc(db, `artifacts/${appId}/public/data/partners`, partnerId);
        await setDoc(docRef, partnerData, { merge: true });
        showAlert("Detalhes do parceiro atualizados com sucesso!");
        document.getElementById('partnerDetailsModal').classList.add('hidden');
    } catch (error) {
        console.error("Erro ao salvar detalhes do parceiro:", error);
        showAlert("Ocorreu um erro ao salvar os detalhes do parceiro. Tente novamente.");
    }
}

// --- FUNÇÕES DO FIRESTORE (CRUD) ---
async function savePartner() {
    const partnerId = document.getElementById('partnerId').value;
    const partnerName = document.getElementById('partnerName').value.trim();
    const partnerEmail = document.getElementById('partnerEmail').value.trim();
    const partnerCompany = document.getElementById('partnerCompany').value.trim();
    const partnerArea = selectedAreas;
    

    if (!partnerName || !partnerEmail) {
        showAlert('Por favor, preencha nome e e-mail.');
        return;
    }

    const partnerData = {
        name: partnerName,
        email: partnerEmail,
        company: partnerCompany,
        area: partnerArea,
        
    };

    try {
        if (partnerId) { // Update
            const docRef = doc(db, `artifacts/${appId}/public/data/partners`, partnerId);
            await setDoc(docRef, partnerData, { merge: true });
            showAlert("Parceiro atualizado com sucesso!");
        } else { // Create
            const partnersColRef = collection(db, `artifacts/${appId}/public/data/partners`);
            const querySnapshotForNewId = await getDocs(partnersColRef);
            const lastId = querySnapshotForNewId.docs.reduce((max, doc) => {
                const docIdNum = parseInt(doc.id);
                return docIdNum > max ? docIdNum : max;
            }, 0);
            const newId = lastId + 1;

            partnerData.id = newId; // Store the generated ID within the document
            partnerData.status = 'Ativo'; // Status padrão para novos parceiros
            
            await setDoc(doc(db, `artifacts/${appId}/public/data/partners`, newId.toString()), partnerData);
            showAlert("Parceiro cadastrado com sucesso!");
        }
        toggleForm(false);
    } catch (error) {
        console.error("Erro ao salvar parceiro:", error);
        showAlert("Ocorreu um erro ao salvar o parceiro. Tente novamente.");
    }
}

async function deletePartner(id) {
    showConfirmation(`Tem certeza que deseja excluir o parceiro com ID ${id}?`, async () => {
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/public/data/partners`, id));
            showAlert("Parceiro excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao deletar parceiro:", error);
            showAlert("Ocorreu um erro ao excluir o parceiro. Tente novamente.");
        }
    });
}

function renderPartners(partners) {
    const partnersTableBody = document.getElementById('partnersTableBody');
    if (!partnersTableBody) return;

    partnersTableBody.innerHTML = '';

    if (partners.length === 0) {
        partnersTableBody.innerHTML = '<tr><td colspan="8" class="text-center p-8">Nenhum parceiro encontrado.</td></tr>'; // Colspan ajustado para 8
        return;
    }

    partners.forEach(partner => {
        const tr = document.createElement('tr');
        tr.className = "bg-slate-900 border-b border-slate-700 hover:bg-slate-800 transition-colors";

        
            const status = partner.status || 'N/A';
        let statusColor = 'bg-slate-500/20 text-slate-400';
        if (status === 'Ativo') statusColor = 'bg-green-500/20 text-green-400';
        if (status === 'Inativo') statusColor = 'bg-red-500/20 text-red-400';

        tr.innerHTML = `
            <td class="px-6 py-4 table-cell-responsive">${partner.id}</td>
            <td class="px-6 py-4 table-cell-responsive">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${statusColor}">${status}</span>
            </td>
            <td class="px-6 py-4 font-medium text-white table-cell-responsive">${partner.name}</td>
            <td class="px-6 py-4 table-cell-responsive">${partner.email}</td>
            <td class="px-6 py-4 table-cell-responsive">${partner.phone || 'N/A'}</td>
            <td class="px-6 py-4 table-cell-responsive">${partner.company || 'N/A'}</td>
            <td class="px-6 py-4 table-cell-responsive">${(partner.area && partner.area.length > 0) ? partner.area.join(', ') : 'N/A'}</td>
            <td class="px-2 py-2 text-right table-cell-responsive">
                <div class="flex items-center justify-end gap-2">
                    <button class="text-sky-400 hover:text-sky-500 edit-btn transition-transform hover:scale-110" data-id="${partner.id}" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="text-blue-400 hover:text-blue-300 details-btn transition-transform hover:scale-110" data-id="${partner.id}" title="Ver Detalhes">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-file-text"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </button>
                    <button class="text-red-500 hover:text-red-600 delete-btn transition-transform hover:scale-110" data-id="${partner.id}" title="Excluir">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        partnersTableBody.appendChild(tr);
    });
}

function toggleForm(show, partner = null) {
    const cadastroForm = document.getElementById('cadastroFormContainer');
    const listContainer = document.getElementById('partnersListContainer');
    const searchContainer = document.getElementById('search-form-container');
    const formTitleEl = document.getElementById('formTitle');
    const saveButton = document.getElementById('savePartnerButton');

    // Reset form
    document.getElementById('partnerId').value = "";
    document.getElementById('partnerName').value = "";
    document.getElementById('partnerEmail').value = "";
    document.getElementById('partnerCompany').value = "";
    

    if (show) {
        listContainer.classList.add('hidden');
        searchContainer.classList.add('hidden');
        cadastroForm.classList.remove('hidden');

        if (partner) { // Edit mode
            formTitleEl.textContent = 'Editar Parceiro';
            saveButton.textContent = 'Atualizar';
            document.getElementById('partnerId').value = partner.id;
            document.getElementById('partnerName').value = partner.name || '';
            document.getElementById('partnerEmail').value = partner.email || '';
            document.getElementById('partnerCompany').value = partner.company || '';
            
            // Populate the new field (custom multi-select checkboxes)
            const savedAreas = partner.area || [];
            partnerAreaCheckboxes.forEach(checkbox => {
                checkbox.checked = savedAreas.includes(checkbox.value);
            });
            // Update the display of selected areas
            selectedAreas = savedAreas; // Update the global selectedAreas array
            updateSelectedAreasDisplay();
        } else { // Add mode
            formTitleEl.textContent = 'Cadastrar Novo Parceiro';
            saveButton.textContent = 'Salvar';
            // Clear the new field for add mode
            partnerAreaCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            selectedAreas = []; // Clear the global selectedAreas array
            updateSelectedAreasDisplay();
            
        }
    } else {
        cadastroForm.classList.add('hidden');
        listContainer.classList.remove('hidden');
        searchContainer.classList.remove('hidden');
    }
}

async function main() {
    onSnapshot(collection(db, `artifacts/${appId}/public/data/partners`), (snapshot) => {
        allPartners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filterAndRenderPartners();
    });

    // --- LISTENERS DE EVENTOS ---
    // Custom Multi-select Dropdown Logic
    const multiSelectBtn = document.getElementById('multiSelectBtn');
    const selectedAreasDisplay = document.getElementById('selectedAreasDisplay');

    function updateSelectedAreasDisplay() {
        if (selectedAreas.length === 0) {
            selectedAreasDisplay.textContent = 'Selecione a(s) Área(s) de Atuação';
        } else {
            selectedAreasDisplay.textContent = selectedAreas.join(', ');
        }
    }

    multiSelectBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent document click from closing immediately
        multiSelectOptions.classList.toggle('hidden');
    });

    partnerAreaCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                selectedAreas.push(checkbox.value);
            } else {
                selectedAreas = selectedAreas.filter(area => area !== checkbox.value);
            }
            updateSelectedAreasDisplay();
        });
    });

    document.addEventListener('click', (event) => {
        if (!multiSelectBtn.contains(event.target) && !multiSelectOptions.contains(event.target)) {
            multiSelectOptions.classList.add('hidden');
        }
    });

    // Initial display update (important for edit mode)
    updateSelectedAreasDisplay();

    renderSidebar(window.location.pathname, showAlert);

    document.getElementById('showFormButton').addEventListener('click', () => {
        toggleForm(true);
    });

    document.getElementById('cancelButton').addEventListener('click', () => {
        toggleForm(false);
    });

    document.getElementById('savePartnerButton').addEventListener('click', (e) => {
        e.preventDefault();
        savePartner();
    });

    document.getElementById('partnersTableBody').addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const detailsBtn = e.target.closest('.details-btn'); // <-- Adicionar esta linha

        if (editBtn) {
            const partnerId = editBtn.dataset.id;
            const partnerToEdit = allPartners.find(partner => partner.id.toString() === partnerId.toString());
            if (partnerToEdit) {
                toggleForm(true, partnerToEdit);
            }
        } else if (deleteBtn) {
            const partnerId = deleteBtn.dataset.id;
            deletePartner(partnerId);
        } else if (detailsBtn) { // <-- Adicionar este bloco
            const partnerId = detailsBtn.dataset.id;
            openPartnerDetailsModal(partnerId);
        }
    });

    document.getElementById('confirmationModalCancelBtn').addEventListener('click', () => closeConfirmationModal());
    document.getElementById('confirmationModalConfirmBtn').addEventListener('click', () => {
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
        closeConfirmationModal();
    });
    document.getElementById('confirmationModal').addEventListener('click', (e) => {
        if (e.target.id === 'confirmationModal') closeConfirmationModal();
    });

    document.getElementById('alertModalOkBtn').addEventListener('click', () => closeAlertModal());
    document.getElementById('alertModal').addEventListener('click', (e) => {
        if (e.target.id === 'alertModal') closeAlertModal();
    });

    document.getElementById('cancelDetailsButton').addEventListener('click', () => {
        document.getElementById('partnerDetailsModal').classList.add('hidden');
    });

    

    document.getElementById('searchPartnersInput').addEventListener('input', filterAndRenderPartners);
    function filterAndRenderPartners() {
        const searchTerm = document.getElementById('searchPartnersInput').value.toLowerCase();
        const filtered = allPartners.filter(partner =>
            partner.name.toLowerCase().includes(searchTerm) ||
            partner.email.toLowerCase().includes(searchTerm) ||
            (partner.company && partner.company.toLowerCase().includes(searchTerm))
        );
        renderPartners(filtered);
    }
}

document.addEventListener('DOMContentLoaded', main);
