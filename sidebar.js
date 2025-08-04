// sidebar.js
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

export function renderSidebar(currentPage) {
    const sidebarNav = document.querySelector('#sidebar-container nav');
    if (!sidebarNav) return;

    const navItems = [
        { href: 'home.html', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>', text: 'Início' },
        { href: 'departamentos.html', icon: '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z"></path><path d="M2 7l10 5 10-5"></path><path d="M12 22V12"></path><path d="M22 7l-10 5"></path><path d="M2 17l10-5"></path>', text: 'Departamentos' },
        { href: 'calendarios.html', icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>', text: 'Calendários' },
        { href: 'usuarios.html', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>', text: 'Usuários' }
    ];

    sidebarNav.innerHTML = ''; // Clear existing content

    navItems.forEach(item => {
        const currentPath = window.location.pathname.split('/').pop(); // Get just the filename
        const isActive = currentPath === item.href; // Check if current page matches href
        const linkClass = `sidebar-link flex items-center py-3 px-4 rounded-lg transition-all duration-200 ${isActive ? 'active' : ''}`;
        const linkHtml = `
            <a href="${item.href}" class="${linkClass}">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-3">
                    ${item.icon}
                </svg>
                ${item.text}
            </a>
        `;
        sidebarNav.insertAdjacentHTML('beforeend', linkHtml);
    });

    // Add logout button
    const logoutButtonHtml = `
        <button id="logoutButtonSidebar" class="sidebar-link flex items-center py-3 px-4 rounded-lg transition-all duration-200 w-full text-left mt-6 hover:bg-red-700/50 text-red-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-3">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sair
        </button>
    `;
    sidebarNav.insertAdjacentHTML('beforeend', logoutButtonHtml);

    // Add logout functionality
    const logoutButtonSidebar = document.getElementById('logoutButtonSidebar');
    if (logoutButtonSidebar) {
        logoutButtonSidebar.addEventListener('click', async () => {
            try {
                const auth = getAuth(); // Get auth instance here
                await signOut(auth);
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('loggedInUserEmail');
                localStorage.removeItem('loggedInUserName');
                window.location.href = 'login.html';
            } catch (error) {
                console.error("Erro ao fazer logout:", error);
                // Assuming showAlert is globally available or imported
                if (typeof showAlert === 'function') {
                    showAlert("Ocorreu um erro ao fazer logout. Tente novamente.");
                } else {
                    alert("Ocorreu um erro ao fazer logout. Tente novamente.");
                }
            }
        });
    }
}