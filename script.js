document.addEventListener('DOMContentLoaded', () => {
    // VARIÁVEIS DE CONFIGURAÇÃO
    const ADMIN_NICK = 'J2Z#1337'; // Defina o nick do admin aqui

    // SELETORES DE ELEMENTOS
    const loginOverlay = document.getElementById('login-overlay');
    const loginNickInput = document.getElementById('login-nick');
    const loginPasswordInput = document.getElementById('login-password');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    const appContainer = document.getElementById('app-container');
    const currentUserNickElement = document.getElementById('current-user-nick');
    const logoutButton = document.getElementById('logout-button');

    const navButtons = document.querySelectorAll('.nav-button');
    const tabs = document.querySelectorAll('.tab-content');
    const adminTabButton = document.querySelector('[data-tab="admin-tab"]');

    const contratadosCount = document.getElementById('contratados-count');
    const faltamCount = document.getElementById('faltam-count');

    const pendingCardsContainer = document.getElementById('pending-cards');
    const approvedCardsContainer = document.getElementById('approved-cards');
    const deniedCardsContainer = document.getElementById('denied-cards');

    const openFormButton = document.getElementById('open-form-button');
    const formModalOverlay = document.getElementById('form-modal-overlay');
    const addHireForm = document.getElementById('add-hire-form');
    const cancelFormButton = document.getElementById('cancel-form-button');
    const contratadoNickInput = document.getElementById('contratado-nick');
    const printUrlInput = document.getElementById('print-url');
    const postUrlInput = document.getElementById('post-url');

    const rankingListBody = document.querySelector('#ranking-list tbody');

    const confirmationOverlay = document.getElementById('confirmation-overlay');
    const confirmationMessage = document.getElementById('confirmation-message');
    const confirmActionButton = document.getElementById('confirm-action-btn');
    const cancelConfirmationButton = document.getElementById('cancel-confirmation-btn');
    
    const addStudentForm = document.getElementById('add-student-form');
    const newStudentNickInput = document.getElementById('new-student-nick');
    const studentList = document.getElementById('student-list');

    // VARIÁVEIS DE ESTADO
    let currentUser = localStorage.getItem('currentUser');
    let hires = JSON.parse(localStorage.getItem('hires')) || [];
    let students = JSON.parse(localStorage.getItem('students')) || [];

    // FUNÇÕES
    function handleLogin(event) {
        event.preventDefault();
        const nick = loginNickInput.value.trim();
        const password = loginPasswordInput.value.trim();
        const isAdmin = nick === ADMIN_NICK;

        if (isAdmin) {
            if (password === 'senhaadmin123') { // Defina a senha do admin aqui
                currentUser = nick;
                localStorage.setItem('currentUser', currentUser);
                loginOverlay.classList.remove('active');
                appContainer.classList.remove('hidden');
                loginError.textContent = '';
                renderApp();
            } else {
                loginError.textContent = 'Senha de admin incorreta.';
            }
        } else if (students.includes(nick)) {
            currentUser = nick;
            localStorage.setItem('currentUser', currentUser);
            loginOverlay.classList.remove('active');
            appContainer.classList.remove('hidden');
            loginError.textContent = '';
            renderApp();
        } else {
            loginError.textContent = 'Nick não autorizado ou inválido.';
        }
    }

    function handleLogout() {
        localStorage.removeItem('currentUser');
        currentUser = null;
        loginOverlay.classList.add('active');
        appContainer.classList.add('hidden');
        loginNickInput.value = '';
        loginPasswordInput.value = '';
        loginError.textContent = '';
    }

    function renderApp() {
        if (currentUser) {
            currentUserNickElement.textContent = currentUser;
            const isAdmin = currentUser === ADMIN_NICK;
            adminTabButton.classList.toggle('hidden', !isAdmin);
            updateDashboard();
            renderHires();
            renderRanking();
            renderAdminPanel();
        }
    }

    function updateDashboard() {
        const approvedCount = hires.filter(h => h.status === 'approved').length;
        contratadosCount.textContent = approvedCount;
        const faltam = 60 - approvedCount;
        faltamCount.textContent = faltam;
    }

    function renderHires() {
        pendingCardsContainer.innerHTML = '';
        approvedCardsContainer.innerHTML = '';
        deniedCardsContainer.innerHTML = '';

        hires.forEach(hire => {
            const hireCard = createHireCard(hire);
            if (hire.status === 'pending') {
                pendingCardsContainer.appendChild(hireCard);
            } else if (hire.status === 'approved') {
                approvedCardsContainer.appendChild(hireCard);
            } else {
                deniedCardsContainer.appendChild(hireCard);
            }
        });
    }

    function createHireCard(hire) {
        const card = document.createElement('div');
        card.className = `hire-card ${hire.status}`;
        card.dataset.id = hire.id;
        card.innerHTML = `
            <h3>${hire.nick}</h3>
            <p><strong>Submetido por:</strong> ${hire.submittedBy}</p>
            <p><strong>Print:</strong> <a href="${hire.printUrl}" target="_blank">Visualizar</a></p>
            <p><strong>Post:</strong> <a href="${hire.postUrl}" target="_blank">Ver no Fórum</a></p>
            <div class="card-actions">
                ${currentUser === ADMIN_NICK ? `
                    ${hire.status === 'pending' ? `<button class="approve-btn">Aprovar</button>` : ''}
                    ${hire.status === 'pending' ? `<button class="deny-btn">Recusar</button>` : ''}
                    <button class="delete-btn">Excluir</button>
                ` : ''}
            </div>
        `;
        return card;
    }
    
    function handleCardAction(event) {
        const card = event.target.closest('.hire-card');
        const hireId = card.dataset.id;
        const action = event.target.textContent;

        if (event.target.classList.contains('approve-btn')) {
            showConfirmationModal('Tem certeza que deseja aprovar esta contratação?', () => {
                const hireIndex = hires.findIndex(h => h.id == hireId);
                if (hireIndex !== -1) {
                    hires[hireIndex].status = 'approved';
                    localStorage.setItem('hires', JSON.stringify(hires));
                    renderApp();
                }
            });
        } else if (event.target.classList.contains('deny-btn')) {
            showConfirmationModal('Tem certeza que deseja recusar esta contratação?', () => {
                const hireIndex = hires.findIndex(h => h.id == hireId);
                if (hireIndex !== -1) {
                    hires[hireIndex].status = 'denied';
                    localStorage.setItem('hires', JSON.stringify(hires));
                    renderApp();
                }
            });
        } else if (event.target.classList.contains('delete-btn')) {
            showConfirmationModal('Tem certeza que deseja excluir esta contratação? Esta ação é irreversível.', () => {
                const hireIndex = hires.findIndex(h => h.id == hireId);
                if (hireIndex !== -1) {
                    hires.splice(hireIndex, 1);
                    localStorage.setItem('hires', JSON.stringify(hires));
                    renderApp();
                }
            });
        }
    }

    function renderRanking() {
        rankingListBody.innerHTML = '';
        const approvedHires = hires.filter(h => h.status === 'approved');
        const ranking = {};

        approvedHires.forEach(hire => {
            ranking[hire.submittedBy] = (ranking[hire.submittedBy] || 0) + 1;
        });

        const sortedRanking = Object.entries(ranking).sort((a, b) => b[1] - a[1]);

        sortedRanking.forEach(([nick, count], index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Posição">${index + 1}</td>
                <td data-label="Nick">${nick}</td>
                <td data-label="Contratações">${count}</td>
            `;
            rankingListBody.appendChild(row);
        });
    }

    function renderAdminPanel() {
        if (currentUser === ADMIN_NICK) {
            studentList.innerHTML = '';
            students.forEach(student => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="student-name">${student}</span>
                    <button class="remove-student-btn" data-nick="${student}">Remover</button>
                `;
                studentList.appendChild(li);
            });
        }
    }

    function handleAdminPanel(event) {
        event.preventDefault();
        const target = event.target;

        if (target.id === 'add-student-form') {
            const newNick = newStudentNickInput.value.trim();
            if (newNick && !students.includes(newNick)) {
                students.push(newNick);
                localStorage.setItem('students', JSON.stringify(students));
                renderAdminPanel();
                newStudentNickInput.value = '';
            }
        } else if (target.classList.contains('remove-student-btn')) {
            const nickToRemove = target.dataset.nick;
            if (nickToRemove !== ADMIN_NICK) {
                showConfirmationModal(`Tem certeza que deseja remover ${nickToRemove}?`, () => {
                    students = students.filter(s => s !== nickToRemove);
                    localStorage.setItem('students', JSON.stringify(students));
                    renderAdminPanel();
                });
            }
        }
    }

    function handleFormSubmit(event) {
        event.preventDefault();
        const newHire = {
            id: Date.now(),
            nick: contratadoNickInput.value,
            printUrl: printUrlInput.value,
            postUrl: postUrlInput.value,
            submittedBy: currentUser,
            status: 'pending'
        };
        hires.push(newHire);
        localStorage.setItem('hires', JSON.stringify(hires));
        formModalOverlay.classList.remove('active');
        addHireForm.reset();
        renderApp();
    }

    function handleTabChange(event) {
        const activeTab = document.querySelector('.tab-content.active');
        const activeNav = document.querySelector('.nav-button.active');
        activeTab.classList.remove('active');
        activeTab.classList.add('hidden');
        activeNav.classList.remove('active');

        const newTabId = event.target.dataset.tab;
        const newTab = document.getElementById(newTabId);
        newTab.classList.remove('hidden');
        newTab.classList.add('active');
        event.target.classList.add('active');
    }

    function showConfirmationModal(message, callback) {
        confirmationMessage.textContent = message;
        confirmationOverlay.classList.add('active');
        
        confirmActionButton.onclick = () => {
            callback();
            confirmationOverlay.classList.remove('active');
        };

        cancelConfirmationButton.onclick = () => {
            confirmationOverlay.classList.remove('active');
        };
    }
    
    // NOVO: Função para exibir/ocultar o campo de senha
    function toggleAdminPasswordInput() {
        const isCurrentUserAdmin = loginNickInput.value.trim() === ADMIN_NICK;
        loginPasswordInput.classList.toggle('hidden', !isCurrentUserAdmin);
    }
    
    // INICIALIZAÇÃO
    if (currentUser) {
        loginOverlay.classList.remove('active');
        appContainer.classList.remove('hidden');
        renderApp();
    } else {
        loginOverlay.classList.add('active');
        appContainer.classList.add('hidden');
    }
    
    // EVENT LISTENERS
    loginForm.addEventListener('submit', handleLogin);
    logoutButton.addEventListener('click', handleLogout);
    openFormButton.addEventListener('click', () => formModalOverlay.classList.add('active'));
    cancelFormButton.addEventListener('click', () => {
        formModalOverlay.classList.remove('active');
        addHireForm.reset();
    });
    addHireForm.addEventListener('submit', handleFormSubmit);
    navButtons.forEach(btn => {
        btn.addEventListener('click', handleTabChange);
    });
    pendingCardsContainer.addEventListener('click', handleCardAction);
    approvedCardsContainer.addEventListener('click', handleCardAction);
    deniedCardsContainer.addEventListener('click', handleCardAction);
    addStudentForm.addEventListener('submit', handleAdminPanel);
    if(studentList) {
        studentList.addEventListener('click', handleAdminPanel);
    }
    
    // NOVO: Adiciona o evento para alternar a senha de admin
    loginNickInput.addEventListener('input', toggleAdminPasswordInput);
});
