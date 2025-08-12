document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO E DADOS ---
    const META_CONTRATACAO = 60;

    // IMPORTANTE: Defina aqui o Nick do Administrador e a SENHA DE ACESSO.
    const ADMIN_NICK = 'J2Z#013'; 
    const ADMIN_PASSWORD = 'supercap'; // Altere esta senha para algo seguro!
    
    // Carrega dados do localStorage ou inicia arrays vazios.
    let hires = JSON.parse(localStorage.getItem('hiresData')) || [];
    let currentUser = localStorage.getItem('currentUser') === 'null' ? null : localStorage.getItem('currentUser');
    let allowedStudents = JSON.parse(localStorage.getItem('allowedStudents')) || [ADMIN_NICK, 'AlunoAprovador#1234', 'LiderEquipe#7777'];
    let allowedApprovers = JSON.parse(localStorage.getItem('allowedApprovers')) || [ADMIN_NICK];

    // --- ELEMENTOS DO DOM (HTML) ---
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const loginNickInput = document.getElementById('login-nick');
    const loginPasswordInput = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');
    const appContainer = document.getElementById('app-container');
    const currentUserNickEl = document.getElementById('current-user-nick');
    const logoutButton = document.getElementById('logout-button');
    const countContratadosEl = document.getElementById('contratados-count');
    const countFaltamEl = document.getElementById('faltam-count');
    const openFormButton = document.getElementById('open-form-button');
    const formModalOverlay = document.getElementById('form-modal-overlay');
    const addHireForm = document.getElementById('add-hire-form');
    const cancelFormButton = document.getElementById('cancel-form-button');
    const pendingCardsContainer = document.getElementById('pending-cards');
    const approvedCardsContainer = document.getElementById('approved-cards');
    const deniedCardsContainer = document.getElementById('denied-cards');
    const hiresBoard = document.getElementById('hires-board');
    const navButtons = document.querySelectorAll('#main-nav .nav-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const rankingTableBody = document.querySelector('#ranking-list tbody');
    const adminTabButton = document.querySelector('[data-tab="admin-tab"]');
    const addStudentForm = document.getElementById('add-student-form');
    const newStudentInput = document.getElementById('new-student-nick');
    const studentList = document.getElementById('student-list');
    
    // Elementos do Modal de Confirmação
    const confirmationOverlay = document.getElementById('confirmation-overlay');
    const confirmationMessage = document.getElementById('confirmation-message');
    const confirmActionBtn = document.getElementById('confirm-action-btn');
    const cancelConfirmationBtn = document.getElementById('cancel-confirmation-btn');

    // --- FUNÇÕES DE LÓGICA ---

    function saveData() {
        localStorage.setItem('hiresData', JSON.stringify(hires));
        localStorage.setItem('currentUser', currentUser);
        localStorage.setItem('allowedStudents', JSON.stringify(allowedStudents));
        localStorage.setItem('allowedApprovers', JSON.stringify(allowedApprovers));
    }

    function renderApp() {
        if (!currentUser) return;

        currentUserNickEl.textContent = currentUser;

        const isAdmin = currentUser === ADMIN_NICK;
        const isApprover = allowedApprovers.includes(currentUser);
        document.body.classList.toggle('admin-logged-in', isAdmin);
        adminTabButton.classList.toggle('hidden', !isAdmin);

        const pending = hires.filter(h => h.status === 'pending');
        const approved = hires.filter(h => h.status === 'approved');
        const denied = hires.filter(h => h.status === 'denied');

        const approvedCount = approved.length;
        countContratadosEl.textContent = approvedCount;
        countFaltamEl.textContent = Math.max(0, META_CONTRATACAO - approvedCount);
        
        renderCards(pending, pendingCardsContainer, isApprover);
        renderCards(approved, approvedCardsContainer, isApprover);
        renderCards(denied, deniedCardsContainer, isApprover);
        
        renderRanking();
        
        if(isAdmin) {
            renderAdminPanel();
        }
    }

    function renderCards(list, container, isApprover) {
        container.innerHTML = '';
        if (list.length === 0) {
            container.innerHTML = `<p class="empty-state" style="text-align: center; color: #555; font-size: 0.9em;">Nenhuma submissão aqui.</p>`;
            return;
        }

        list.forEach(hire => {
            const card = document.createElement('div');
            card.className = `hire-card ${hire.status}`;
            card.dataset.id = hire.id;

            let actionsHtml = '';
            if (hire.status === 'pending' && isApprover) {
                actionsHtml += `
                    <button class="approve-btn">Aprovar</button>
                    <button class="deny-btn">Recusar</button>
                `;
            }

            if (currentUser === ADMIN_NICK) {
                actionsHtml += `<button class="delete-btn">Excluir</button>`;
            }

            const fullActionsHtml = actionsHtml ? `<div class="card-actions">${actionsHtml}</div>` : '';

            card.innerHTML = `
                <h3>${hire.contratadoNick}</h3>
                <p><strong>Print:</strong> <a href="${hire.printUrl}" target="_blank" rel="noopener noreferrer">Ver Imagem</a></p>
                <p><strong>Postagem:</strong> <a href="${hire.postUrl}" target="_blank" rel="noopener noreferrer">Ver Link</a></p>
                <p><small>Submetido por: ${hire.submittedBy}</small></p>
                ${fullActionsHtml}
            `;
            container.appendChild(card);
        });
    }

    function renderRanking() {
        if (!rankingTableBody) return;

        const approvedHires = hires.filter(h => h.status === 'approved');
        
        const rankingMap = new Map();
        allowedStudents.forEach(student => rankingMap.set(student, 0));
        
        approvedHires.forEach(hire => {
            const currentCount = rankingMap.get(hire.submittedBy) || 0;
            rankingMap.set(hire.submittedBy, currentCount + 1);
        });
        
        const rankingList = Array.from(rankingMap.entries())
            .map(([nick, count]) => ({ nick, count }));

        rankingList.sort((a, b) => b.count - a.count);

        rankingTableBody.innerHTML = rankingList.map((item, index) => `
            <tr>
                <td data-label="Posição">${index + 1}</td>
                <td data-label="Nick">${item.nick}</td>
                <td data-label="Contratações">${item.count}</td>
            </tr>
        `).join('');
    }

    // CORRIGIDO: Renderiza o label com a classe 'active' se necessário
    function renderAdminPanel() {
        if (!studentList) return;
        studentList.innerHTML = allowedStudents.map(student => `
            <li>
                <span class="student-name">${student}</span>
                <div class="permission-control">
                    ${student !== ADMIN_NICK ? `
                        <label>
                            <input type="checkbox" data-nick="${student}" ${allowedApprovers.includes(student) ? 'checked' : ''}>
                            <span class="slider ${allowedApprovers.includes(student) ? 'active' : ''}"></span>
                        </label>
                        <button class="remove-student-btn" data-nick="${student}">Remover</button>
                    ` : ''}
                </div>
            </li>
        `).join('');
    }
    
    function showConfirmationModal(message, onConfirm) {
        confirmationMessage.textContent = message;
        confirmationOverlay.classList.add('active');
        
        confirmActionBtn.onclick = null; 
        
        confirmActionBtn.onclick = () => {
            confirmationOverlay.classList.remove('active');
            onConfirm();
        };
    }

    // --- MANIPULADORES DE EVENTOS (HANDLERS) ---
    
    cancelConfirmationBtn.addEventListener('click', () => {
        confirmationOverlay.classList.remove('active');
    });
    
    // CORRIGIDO: Adicionado listener para gerenciar o toggle
    if (studentList) {
        studentList.addEventListener('click', (e) => {
            const target = e.target;
            const checkbox = target.closest('li')?.querySelector('input[type="checkbox"]');
            
            if (checkbox) {
                const studentNick = checkbox.dataset.nick;
                const slider = checkbox.nextElementSibling; // O slider é o irmão imediatamente após a checkbox

                // Inverte o estado da checkbox
                checkbox.checked = !checkbox.checked;

                // Alterna a classe 'active' do slider com base no novo estado da checkbox
                if (checkbox.checked) {
                    slider.classList.add('active');
                    if (!allowedApprovers.includes(studentNick)) {
                        allowedApprovers.push(studentNick);
                    }
                } else {
                    slider.classList.remove('active');
                    allowedApprovers = allowedApprovers.filter(nick => nick !== studentNick);
                }

                saveData();
                // Não é necessário chamar renderApp() aqui para evitar re-renderização completa e piscar a tela
            }
        });
    }

    function togglePasswordInput() {
        const isCurrentUserAdmin = loginNickInput.value.trim() === ADMIN_NICK;
        loginPasswordInput.classList.toggle('hidden', !isCurrentUserAdmin);
    }
    
    function handleLogin(e) {
        e.preventDefault();
        const nick = loginNickInput.value.trim();
        const password = loginPasswordInput.value.trim();

        if (allowedStudents.includes(nick)) {
            if (nick === ADMIN_NICK) {
                if (password === ADMIN_PASSWORD) {
                    currentUser = nick;
                    loginError.textContent = '';
                    loginNickInput.value = '';
                    loginPasswordInput.value = '';
                    saveData();
                    loginOverlay.classList.remove('active');
                    appContainer.classList.remove('hidden');
                    renderApp();
                } else {
                    loginError.textContent = 'Senha incorreta.';
                    loginPasswordInput.value = '';
                }
            } else {
                currentUser = nick;
                loginError.textContent = '';
                loginNickInput.value = '';
                loginPasswordInput.value = '';
                    saveData();
                    loginOverlay.classList.remove('active');
                    appContainer.classList.add('hidden');
                    renderApp();
                }
        } else {
            loginError.textContent = 'Acesso negado. Nick ou Numeração inválidos.';
        }
    }

    function handleLogout() {
        currentUser = null;
        document.body.classList.remove('admin-logged-in');
        localStorage.removeItem('currentUser');
        loginOverlay.classList.add('active');
        appContainer.classList.add('hidden');
    }
    
    function handleFormSubmit(e) {
        e.preventDefault();
        hires.push({
            id: Date.now(),
            submittedBy: currentUser,
            contratadoNick: document.getElementById('contratado-nick').value.trim(),
            printUrl: document.getElementById('print-url').value.trim(),
            postUrl: document.getElementById('post-url').value.trim(),
            status: 'pending'
        });
        addHireForm.reset();
        formModalOverlay.classList.remove('active');
        saveData();
        renderApp();
    }

    function handleBoardClick(e) {
        const target = e.target;
        const card = target.closest('.hire-card');
        if (!card) return;

        const hireId = parseInt(card.dataset.id, 10);
        
        if (target.classList.contains('approve-btn')) {
            const hire = hires.find(h => h.id === hireId);
            if (hire) hire.status = 'approved';
            saveData();
            renderApp();
        } else if (target.classList.contains('deny-btn')) {
            const hire = hires.find(h => h.id === hireId);
            if (hire) hire.status = 'denied';
            saveData();
            renderApp();
        } else if (target.classList.contains('delete-btn')) {
            if (currentUser === ADMIN_NICK) {
                showConfirmationModal('Tem certeza que deseja excluir esta submissão permanentemente?', () => {
                    hires = hires.filter(h => h.id !== hireId);
                    saveData();
                    renderApp();
                });
            }
        }
    }
    
    function handleTabChange(e) {
        const targetTabId = e.target.dataset.tab;
        
        navButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(tab => tab.classList.add('hidden'));

        e.target.classList.add('active');
        document.getElementById(targetTabId).classList.remove('hidden');
    }

    function handleAdminPanel(e) {
        e.preventDefault();
        const target = e.target;

        if (target.id === 'add-student-form') {
            const newNick = newStudentInput.value.trim();
            if (newNick && !allowedStudents.includes(newNick)) {
                allowedStudents.push(newNick);
                newStudentInput.value = '';
                saveData();
                renderAdminPanel();
            }
        } else if (target.classList.contains('remove-student-btn')) {
            const nickToRemove = target.dataset.nick;
            
            showConfirmationModal(`Tem certeza que deseja remover ${nickToRemove}?`, () => {
                allowedStudents = allowedStudents.filter(nick => nick !== nickToRemove);
                allowedApprovers = allowedApprovers.filter(nick => nick !== nickToRemove);
                saveData();
                renderAdminPanel();
                renderApp(); 
            });
        }
    }

    // --- INICIALIZAÇÃO E EVENT LISTENERS ---
    
    if (currentUser) {
        loginOverlay.classList.remove('active');
        appContainer.classList.remove('hidden');
        renderApp();
    } else {
        loginOverlay.classList.add('active');
        appContainer.classList.add('hidden');
    }

    loginForm.addEventListener('submit', handleLogin);
    logoutButton.addEventListener('click', handleLogout);
    openFormButton.addEventListener('click', () => formModalOverlay.classList.add('active'));
    cancelFormButton.addEventListener('click', () => {
        formModalOverlay.classList.remove('active');
        addHireForm.reset();
    });
    addHireForm.addEventListener('submit', handleFormSubmit);

    if (hiresBoard) {
        hiresBoard.addEventListener('click', handleBoardClick);
    }
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', handleTabChange);
    });

    addStudentForm.addEventListener('submit', handleAdminPanel);
    if(studentList) {
        studentList.addEventListener('click', handleAdminPanel);
    }

    loginNickInput.addEventListener('input', togglePasswordInput);
});
