document.addEventListener('DOMContentLoaded', () => {
    const ADMIN_NICK = 'J2Z#1337'; // Nickname do administrador

    const API_URL = 'http://localhost:3000/api';

    const loginOverlay = document.getElementById('login-overlay');
    const loginNickInput = document.getElementById('login-nick');
    const loginPasswordInput = document.getElementById('login-password');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    const appContainer = document.getElementById('app-container');
    const currentUserNickElement = document.getElementById('current-user-nick');
    const logoutButton = document.getElementById('logout-button');

    const navButtons = document.querySelectorAll('.nav-button');
    const adminTabButton = document.querySelector('[data-tab="admin-tab"]');

    const contratadosCount = document.getElementById('contratados-count');
    const faltamCount = document.getElementById('faltam-count');

    const pendingColumn = document.getElementById('pending-column');
    const approvedColumn = document.getElementById('approved-column');
    const deniedColumn = document.getElementById('denied-column');

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
    
    const restrictedNotice = document.getElementById('restricted-notice');

    const auditTableBody = document.querySelector('#audit-table tbody');

    let currentUser = localStorage.getItem('currentUser');
    let hires = []; 
    let students = [];
    let audit = [];

    async function handleLogin(event) {
        event.preventDefault();
        const nick = loginNickInput.value.trim();
        const password = loginPasswordInput.value.trim();
        const isAdmin = nick.toLowerCase() === ADMIN_NICK.toLowerCase(); 
        
        try {
            const response = await fetch(`${API_URL}/students`);
            if (!response.ok) throw new Error('Falha ao conectar com o servidor.');
            students = await response.json();
        } catch (error) {
            loginError.textContent = 'Erro de conexão com o servidor. Verifique o terminal.';
            return;
        }

        if (isAdmin) {
            if (password === 'senhaadmin123') {
                currentUser = nick;
                localStorage.setItem('currentUser', currentUser);
                loginOverlay.classList.remove('active');
                appContainer.classList.remove('hidden');
                loginError.textContent = '';
                await renderApp();
            } else {
                loginError.textContent = 'Senha de admin incorreta.';
            }
        } else {
            const student = students.find(s => s.nick === nick);
            if (student && student.canApply) {
                currentUser = nick;
                localStorage.setItem('currentUser', currentUser);
                loginOverlay.classList.remove('active');
                appContainer.classList.remove('hidden');
                loginError.textContent = '';
                await renderApp();
            } else {
                loginError.textContent = 'Nick não autorizado ou inválido.';
            }
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

    async function renderApp() {
        if (currentUser) {
            currentUserNickElement.textContent = currentUser;
            
            try {
                const [hiresResponse, studentsResponse, auditResponse] = await Promise.all([
                    fetch(`${API_URL}/hires`),
                    fetch(`${API_URL}/students`),
                    fetch(`${API_URL}/audit`)
                ]);
                
                if (!hiresResponse.ok || !studentsResponse.ok || !auditResponse.ok) {
                    throw new Error('Falha ao buscar dados.');
                }

                hires = await hiresResponse.json();
                students = await studentsResponse.json();
                audit = await auditResponse.json();

                const isAdmin = currentUser.toLowerCase() === ADMIN_NICK.toLowerCase();
                adminTabButton.classList.toggle('hidden', !isAdmin);
                
                const student = students.find(s => s.nick === currentUser);
                const canDoAdminActions = isAdmin || (student && student.canApply); // Condição para exibir botões de aprovação/recusa
                
                openFormButton.classList.toggle('hidden', !canDoAdminActions);
                restrictedNotice.classList.toggle('hidden', canDoAdminActions);

                updateDashboard();
                renderHires();
                renderRanking();
                renderAdminPanel();
                renderAuditLog();

            } catch (error) {
                console.error('Erro ao buscar dados da API:', error);
                alert('Não foi possível conectar ao servidor. Verifique se ele está rodando.');
            }
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

        let approvedCount = 0;
        let deniedCount = 0;

        hires.forEach(hire => {
            let cardNumber = null;
            if (hire.status === 'approved') {
                approvedCount++;
                cardNumber = approvedCount;
            } else if (hire.status === 'denied') {
                deniedCount++;
                cardNumber = deniedCount;
            }

            const hireCard = createHireCard(hire, cardNumber);
            if (hire.status === 'pending') {
                pendingCardsContainer.appendChild(hireCard);
            } else if (hire.status === 'approved') {
                approvedCardsContainer.appendChild(hireCard);
            } else {
                deniedCardsContainer.appendChild(hireCard);
            }
        });
        
        const pendingTitleH2 = pendingColumn.querySelector('h2');
        pendingTitleH2.className = 'centered';
        pendingTitleH2.innerHTML = `<span class="status-dot pending"></span>Análise Pendente`;
        
        const approvedTitleH2 = approvedColumn.querySelector('h2');
        approvedTitleH2.className = 'spaced';
        approvedTitleH2.innerHTML = `<span class="status-dot approved"></span>Contratados Aprovados <span class="count">(${approvedCount})</span>`;
        
        const deniedTitleH2 = deniedColumn.querySelector('h2');
        deniedTitleH2.className = 'spaced';
        deniedTitleH2.innerHTML = `<span class="status-dot denied"></span>Submissões Recusadas <span class="count">(${deniedCount})</span>`;
    }

    function createHireCard(hire, cardNumber) {
        const isAdmin = currentUser && currentUser.toLowerCase() === ADMIN_NICK.toLowerCase();
        const student = students.find(s => s.nick === currentUser);
        const canApproveDeny = isAdmin || (student && student.canApply);

        const card = document.createElement('div');
        card.className = `hire-card ${hire.status}`;
        card.dataset.id = hire.id;
        card.innerHTML = `
            ${cardNumber ? `<span class="card-number">#${cardNumber}</span>` : ''}
            <h3>${hire.nick}</h3>
            <p><strong>Submetido por:</strong> ${hire.submittedBy}</p>
            <p><strong>Print:</strong> <a href="${hire.printUrl}" target="_blank">Visualizar</a></p>
            <p><strong>Post:</strong> <a href="${hire.postUrl}" target="_blank">Ver no Fórum</a></p>
            <div class="card-actions">
                ${canApproveDeny ? `
                    ${hire.status === 'pending' ? `<button class="approve-btn">Aprovar</button>` : ''}
                    ${hire.status === 'pending' ? `<button class="deny-btn">Recusar</button>` : ''}
                ` : ''}
                ${isAdmin ? `<button class="delete-btn">Excluir</button>` : ''}
            </div>
        `;
        return card;
    }
    
    function handleCardAction(event) {
        const card = event.target.closest('.hire-card');
        if (!card) return;
        
        const hireId = card.dataset.id;
        const target = event.target;
        
        if (target.classList.contains('approve-btn')) {
            showConfirmationModal('Tem certeza que deseja aprovar esta contratação?', async () => {
                try {
                    await fetch(`${API_URL}/hires/${hireId}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'approved', adminNick: currentUser })
                    });
                    renderApp();
                } catch (error) {
                    console.error('Erro ao aprovar:', error);
                }
            });
        } else if (target.classList.contains('deny-btn')) {
            showConfirmationModal('Tem certeza que deseja recusar esta contratação?', async () => {
                try {
                    await fetch(`${API_URL}/hires/${hireId}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'denied', adminNick: currentUser })
                    });
                    renderApp();
                } catch (error) {
                    console.error('Erro ao recusar:', error);
                }
            });
        } else if (target.classList.contains('delete-btn')) {
            showConfirmationModal('Tem certeza que deseja excluir esta contratação? Esta ação é irreversível.', async () => {
                try {
                    await fetch(`${API_URL}/hires/${hireId}?adminNick=${encodeURIComponent(currentUser)}`, {
                        method: 'DELETE'
                    });
                    renderApp();
                } catch (error) {
                    console.error('Erro ao excluir:', error);
                }
            });
        }
    }

    function renderRanking() {
        rankingListBody.innerHTML = '';
        const approvedHires = hires.filter(h => h.status === 'approved');
        const ranking = {};

        students.forEach(student => {
            ranking[student.nick] = 0;
        });
        
        if(currentUser && !ranking.hasOwnProperty(currentUser)) {
            ranking[currentUser] = 0;
        }

        approvedHires.forEach(hire => {
            if (ranking.hasOwnProperty(hire.submittedBy)) {
                ranking[hire.submittedBy]++;
            }
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
        if (currentUser.toLowerCase() === ADMIN_NICK.toLowerCase()) {
            studentList.innerHTML = '';
            students.forEach(student => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="student-name">${student.nick}</span>
                    <div class="permission-control">
                        <label>
                            <input type="checkbox" data-nick="${student.nick}" ${student.canApply ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <button class="remove-student-btn" data-nick="${student.nick}">Remover</button>
                    </div>
                `;
                studentList.appendChild(li);
            });
        }
    }
    
    async function handleAdminPanel(event) {
        const target = event.target;
        
        if (target.closest('#add-student-form')) {
            event.preventDefault();
            const newNick = newStudentNickInput.value.trim();
            if (!newNick.includes('#')) {
                alert('Por favor, insira o nick completo no formato: nome#1234');
                return;
            }
            if (newNick) {
                try {
                    const response = await fetch(`${API_URL}/students`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nick: newNick })
                    });
                    if (response.ok) {
                        newStudentNickInput.value = '';
                        await renderApp();
                    } else if (response.status === 409) {
                        alert('Este membro já existe.');
                    }
                } catch (error) {
                    console.error('Erro ao adicionar membro:', error);
                }
            }
        } else if (target.classList.contains('remove-student-btn')) {
            const nickToRemove = target.dataset.nick;
            showConfirmationModal(`Tem certeza que deseja remover ${nickToRemove}?`, async () => {
                try {
                    await fetch(`${API_URL}/students/${encodeURIComponent(nickToRemove)}?adminNick=${encodeURIComponent(currentUser)}`, {
                        method: 'DELETE'
                    });
                    await renderApp();
                } catch (error) {
                    console.error('Erro ao remover membro:', error);
                    alert('Erro ao remover membro: ' + error.message);
                }
            });
        } else if (target.type === 'checkbox') {
            const nickToToggle = target.dataset.nick;
            const canApply = target.checked;
            try {
                await fetch(`${API_URL}/students/${encodeURIComponent(nickToToggle)}/permission`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ canApply: canApply, adminNick: currentUser })
                });
                await renderApp();
            } catch (error) {
                console.error('Erro ao atualizar permissão:', error);
                alert('Erro ao atualizar permissão: ' + error.message);
            }
        }
    }
    
    function renderAuditLog() {
        auditTableBody.innerHTML = '';
        audit.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        audit.forEach(log => {
            const row = document.createElement('tr');
            const date = new Date(log.timestamp);
            row.innerHTML = `
                <td data-label="Data/Hora">${date.toLocaleString()}</td>
                <td data-label="Ação">${log.action}</td>
                <td data-label="Alvo">${log.target}</td>
                <td data-label="Admin">${log.admin}</td>
            `;
            auditTableBody.appendChild(row);
        });
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const newHire = {
            nick: contratadoNickInput.value,
            printUrl: printUrlInput.value,
            postUrl: postUrlInput.value,
            submittedBy: currentUser
        };
        
        try {
            const response = await fetch(`${API_URL}/hires`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newHire)
            });
            
            if (response.ok) {
                formModalOverlay.classList.remove('active');
                addHireForm.reset();
                renderApp();
            } else {
                console.error('Falha ao adicionar contratação');
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
        }
    }

    function handleTabChange(event) {
        const activeTab = document.querySelector('.tab-content.active');
        const activeNav = document.querySelector('.nav-button.active');
        if (activeTab) {
            activeTab.classList.remove('active');
            activeTab.classList.add('hidden');
        }
        if (activeNav) {
            activeNav.classList.remove('active');
        }

        const newTabId = event.target.dataset.tab;
        const newTab = document.getElementById(newTabId);
        if (newTab) {
            newTab.classList.remove('hidden');
            newTab.classList.add('active');
        }
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
    
    function toggleAdminPasswordInput() {
        const isCurrentUserAdmin = loginNickInput.value.trim().toLowerCase() === ADMIN_NICK.toLowerCase(); 
        loginPasswordInput.classList.toggle('hidden', !isCurrentUserAdmin);
    }
    
    openFormButton.addEventListener('click', () => {
        formModalOverlay.classList.add('active');
    });

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
    
    if(addStudentForm) {
        addStudentForm.addEventListener('submit', handleAdminPanel);
    }
    if(studentList) {
        studentList.addEventListener('click', handleAdminPanel);
    }
    
    loginNickInput.addEventListener('input', toggleAdminPasswordInput);
});