console.log("sidebar-no-firebase.js: Script started.");

export function renderSidebar(currentPage, showAlertCallback) {
    console.log("sidebar-no-firebase.js: renderSidebar function called.");
    const sidebarNav = document.querySelector('#sidebar-container nav');
    if (!sidebarNav) {
        console.error("sidebar-no-firebase.js: #sidebar-container nav not found.");
        return;
    }
    console.log("sidebar-no-firebase.js: #sidebar-container nav found.");

    const navItems = [
        { href: 'home.html', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>', text: 'Início' },
        {
            text: 'Gestão',
            icon: '<path d="M12 14l9-5-9-5-9 5 9 5z"></path><path d="M12 14l6.16-3.422"></path><path d="M12 14l-6.16-3.422"></path><path d="M5 19l7 4 7-4"></path><path d="M5 19v-5.5"></path><path d="M19 19v-5.5"></path>',
            submenu: [
                { href: 'departamentos.html', icon: '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z"></path><path d="M2 7l10 5 10-5"></path><path d="M12 22V12"></path><path d="M22 7l-10 5"></path><path d="M2 17l10-5"></path>', text: 'Departamentos' },
                { href: 'calendarios.html', icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>', text: 'Calendários' },
                { href: 'usuarios.html', icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>', text: 'Usuários' },
                { href: 'clientes.html', icon: '<path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2z"></path><circle cx="12" cy="7" r="4"></circle><path d="M22 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4"></path><path d="M2 14h20"></path>', text: 'Clientes' }
            ]
        },
        {
            text: 'Orçamentos',
            icon: '<path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path>',
            submenu: [
                { href: 'sistemas.html', icon: '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z"></path><path d="M2 7l10 5 10-5"></path><path d="M12 22V12"></path><path d="M22 7l-10 5"></path><path d="M2 17l10-5"></path>', text: 'Sistemas' }
            ]
        }
    ];

    sidebarNav.innerHTML = ''; // Clear existing content
    console.log("sidebar-no-firebase.js: Cleared sidebarNav content.");

    navItems.forEach(item => {
        if (item.submenu) {
            const currentPath = window.location.pathname.split('/').pop();
            const isSubmenuActive = item.submenu.some(subItem => currentPath === subItem.href);

            const submenuId = `submenu-${item.text.toLowerCase().replace(/ /g, '-')}`;
            const linkHtml = `
                <div class="submenu-container">
                    <a href="#" class="sidebar-link flex items-center justify-between py-3 px-4 rounded-lg transition-all duration-200" data-submenu-toggle="${submenuId}">
                        <div class="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-3">
                                ${item.icon}
                            </svg>
                            ${item.text}
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="submenu-arrow transition-transform duration-300">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </a>
                    <div id="${submenuId}" class="submenu-content pl-8 overflow-hidden transition-max-height duration-300 ease-in-out ${isSubmenuActive ? 'max-h-screen' : 'max-h-0'}">
                        ${item.submenu.map(subItem => {
                const isSubActive = currentPath === subItem.href;
                const subLinkClass = `sidebar-link flex items-center py-2 px-2 rounded-lg transition-all duration-200 ${isSubActive ? 'active' : ''}`;
                return `
                                <a href="${subItem.href}" class="${subLinkClass}">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-3">
                                        ${subItem.icon}
                                    </svg>
                                    ${subItem.text}
                                </a>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
            sidebarNav.insertAdjacentHTML('beforeend', linkHtml);
        } else {
            const currentPath = window.location.pathname.split('/').pop();
            const isActive = currentPath === item.href;
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
        }
    });
    console.log("sidebar-no-firebase.js: Nav items rendered.");

    // Add submenu toggle functionality
    document.querySelectorAll('[data-submenu-toggle]').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const submenuId = toggle.getAttribute('data-submenu-toggle');
            const submenu = document.getElementById(submenuId);
            const arrow = toggle.querySelector('.submenu-arrow');

            if (submenu.classList.contains('max-h-0')) {
                submenu.classList.remove('max-h-0');
                submenu.classList.add('max-h-screen'); // A large value to ensure it fits content
                arrow.classList.add('rotate-180');
            } else {
                submenu.classList.remove('max-h-screen');
                submenu.classList.add('max-h-0');
                arrow.classList.remove('rotate-180');
            }
        });
    });
    console.log("sidebar-no-firebase.js: Submenu toggle functionality added.");

    // Add logout button (simplified for no Firebase)
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
    console.log("sidebar-no-firebase.js: Logout button added.");

    const logoutButtonSidebar = document.getElementById('logoutButtonSidebar');
    if (logoutButtonSidebar) {
        logoutButtonSidebar.addEventListener('click', () => {
            console.log("sidebar-no-firebase.js: Logout button clicked. Performing local logout.");
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('loggedInUserEmail');
            localStorage.removeItem('loggedInUserName');
            window.location.href = 'login.html';
        });
    }
    console.log("sidebar-no-firebase.js: Logout functionality added.");
}
console.log("sidebar-no-firebase.js: Script finished.");