// ==========================================================================
// AL SHAHEEN AUTO HUB - WORKSHOP DASHBOARD, KANBAN & SECURITY CONTROLLER
// Enterprise Secure Token Authentication & Real-time Live Synchronizer
// ==========================================================================

const ADMIN_AUTH_KEY = 'al_shaheen_admin_session';
const ADMIN_TOKEN_KEY = 'al_shaheen_admin_token';

let allCards = [];
let activeDeptFilter = 'all';
let searchQuery = '';

function getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

let isActionPending = false;
let refreshDebounceTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initial token existence check
    if (checkAdminAuth()) {
        showAuthenticatedUi();
        // Asynchronously verify token signature with server
        verifySessionWithServer();
    } else {
        showAdminLogin();
    }

    await refreshDashboard(true);

    // Real-time event listener (Centralized backend push - debounced to execute one calm render)
    window.addEventListener('hub-data-updated', () => {
        if (!checkAdminAuth() || isActionPending) return;
        if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
        refreshDebounceTimer = setTimeout(() => {
            refreshDashboard();
        }, 300);
    });

    window.addEventListener('hub-auth-required', () => {
        adminLogout();
    });

    handleInitialNavigation();
});

// ==========================================================================
// 1. SECURE TOKEN AUTHENTICATION & LOGIN GATE
// ==========================================================================
function checkAdminAuth() {
    const token = getAdminToken();
    return !!token && token.length > 10;
}

async function verifySessionWithServer() {
    const token = getAdminToken();
    if (!token) {
        showAdminLogin();
        return false;
    }
    try {
        const res = await fetch('/api/auth/verify', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            adminLogout();
            return false;
        }
        const json = await res.json();
        if (json.success && json.valid) {
            showAuthenticatedUi(json.user);
            return true;
        }
    } catch (e) {
        // Network offline fallback: allow existing session
        return true;
    }
    adminLogout();
    return false;
}

function showAdminLogin() {
    const authScreen = document.getElementById('adminAuthScreen');
    const mainWrapper = document.getElementById('authenticatedAppWrapper');
    if (authScreen) authScreen.style.display = 'flex';
    if (mainWrapper) mainWrapper.style.display = 'none';

    const passwordInput = document.getElementById('authPassword');
    if (passwordInput) passwordInput.value = '';
}

function showAuthenticatedUi(userName) {
    const authScreen = document.getElementById('adminAuthScreen');
    const mainWrapper = document.getElementById('authenticatedAppWrapper');
    if (authScreen) authScreen.style.display = 'none';
    if (mainWrapper) mainWrapper.style.display = 'block';

    try {
        let displayName = userName;
        if (!displayName) {
            const session = JSON.parse(localStorage.getItem(ADMIN_AUTH_KEY) || sessionStorage.getItem(ADMIN_AUTH_KEY) || '{}');
            displayName = session.user || 'Service Incharge';
        }
        const userBadge = document.getElementById('adminUserBadge');
        if (userBadge) {
            userBadge.textContent = `👤 ${displayName}`;
        }
    } catch (e) {}
}

// Strict Form-based Login with Server Verification
async function handleAdminLoginSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const errBox = document.getElementById('authErrorMessage');
    if (errBox) {
        errBox.style.display = 'none';
        errBox.textContent = '';
    }

    const usernameInput = document.getElementById('authUsername');
    const passwordInput = document.getElementById('authPassword');
    const rememberMe = document.getElementById('authRememberMe')?.checked;
    const submitBtn = document.getElementById('authSubmitBtn');

    const username = (usernameInput?.value || '').trim();
    const password = (passwordInput?.value || '').trim();

    if (!username || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[!-~]{12}$/.test(password)) {
        if (errBox) {
            errBox.textContent = 'Password must be exactly 12 characters with uppercase, lowercase, a number, and a symbol (no spaces).';
            errBox.style.display = 'block';
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '🔒 Verifying Credentials...';
    }

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.success && data.token) {
            const storage = rememberMe ? localStorage : sessionStorage;

            // Clear previous session remnants
            localStorage.removeItem(ADMIN_TOKEN_KEY);
            sessionStorage.removeItem(ADMIN_TOKEN_KEY);
            localStorage.removeItem(ADMIN_AUTH_KEY);
            sessionStorage.removeItem(ADMIN_AUTH_KEY);

            // Store verified token & session
            storage.setItem(ADMIN_TOKEN_KEY, data.token);
            storage.setItem(ADMIN_AUTH_KEY, JSON.stringify({
                user: data.user || username,
                role: data.role || 'admin',
                loginTime: Date.now()
            }));

            if (passwordInput) passwordInput.value = '';

            showAuthenticatedUi(data.user || username);
            await refreshDashboard();
        } else {
            if (errBox) {
                errBox.textContent = data.error || 'Access Denied: Invalid username or password.';
                errBox.style.display = 'block';
            }
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
        }
    } catch (err) {
        if (errBox) {
            errBox.textContent = 'Connection error. Unable to verify credentials with server.';
            errBox.style.display = 'block';
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '🔒 Sign In Securely';
        }
    }
}

// Secure Admin Logout
function adminLogout() {
    const token = getAdminToken();
    if (token) {
        try {
            fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => {});
        } catch (e) {}
    }

    localStorage.removeItem(ADMIN_AUTH_KEY);
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);

    allCards = [];
    showAdminLogin();
}

// Change Admin Password
async function changeAdminPassword() {
    const statusEl = document.getElementById('changePasswordStatus');
    const currentPass = document.getElementById('currentAdminPasswordInput')?.value || '';
    const newPass = document.getElementById('newAdminPasswordInput')?.value || '';
    const confirmPass = document.getElementById('confirmAdminPasswordInput')?.value || '';

    if (statusEl) {
        statusEl.style.display = 'none';
        statusEl.textContent = '';
    }

    if (!currentPass || !newPass || !confirmPass) {
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#fee2e2';
            statusEl.style.color = '#991b1b';
            statusEl.textContent = 'All password fields are required.';
        }
        return;
    }

    if (newPass !== confirmPass) {
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#fee2e2';
            statusEl.style.color = '#991b1b';
            statusEl.textContent = 'New passwords do not match.';
        }
        return;
    }

    if (newPass.length < 4) {
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#fee2e2';
            statusEl.style.color = '#991b1b';
            statusEl.textContent = 'Password must be at least 4 characters.';
        }
        return;
    }

    const token = getAdminToken();
    try {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.style.background = '#dcfce7';
                statusEl.style.color = '#166534';
                statusEl.textContent = '✓ Password updated successfully! Please keep it secure.';
            }
            document.getElementById('currentAdminPasswordInput').value = '';
            document.getElementById('newAdminPasswordInput').value = '';
            document.getElementById('confirmAdminPasswordInput').value = '';
        } else {
            if (statusEl) {
                statusEl.style.display = 'block';
                statusEl.style.background = '#fee2e2';
                statusEl.style.color = '#991b1b';
                statusEl.textContent = data.error || 'Failed to update password.';
            }
        }
    } catch (e) {
        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.background = '#fee2e2';
            statusEl.style.color = '#991b1b';
            statusEl.textContent = 'Network error while updating password.';
        }
    }
}

// ==========================================================================
// 2. VIEW ROUTING & NAVIGATION
// ==========================================================================
function handleInitialNavigation() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');

    if (view === 'editor') {
        showView('editorView');
    } else if (view === 'database') {
        showView('dbView');
    } else {
        showView('dashboardView');
    }
}

function showView(viewId) {
    const views = ['dashboardView', 'dbView', 'editorView'];
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.style.display = (v === viewId) ? 'block' : 'none';
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewId);
    });

    if (viewId === 'dashboardView') {
        renderKanban();
        updateKpis();
    } else if (viewId === 'dbView') {
        renderTable();
    }
}

let lastDashboardFingerprint = '';

async function refreshDashboard(force = false) {
    if (!checkAdminAuth()) return;

    let cards = [];
    if (window.HubAPI) {
        cards = await window.HubAPI.getAllJobCards();
    } else {
        const raw = localStorage.getItem('al_shaheen_job_cards_v3');
        cards = raw ? JSON.parse(raw) : [];
    }
    allCards = cards;

    const currentFingerprint = allCards.map(c => 
        `${c.id}|${c.currentBay}|${c.status}|${c.paymentCleared}|${c.netPayable}`
    ).join(';;');

    // Only update DOM if dataset has actually changed or if force=true
    if (force || currentFingerprint !== lastDashboardFingerprint) {
        lastDashboardFingerprint = currentFingerprint;
        updateKpis();
        renderKanban();
        renderTable();
    }
}

// ==========================================================================
// 3. EXECUTIVE KPIS
// ==========================================================================
function updateKpis() {
    const totalVehiclesEl = document.getElementById('kpiTotalVehicles');
    const inBaysEl = document.getElementById('kpiInBays');
    const readyEl = document.getElementById('kpiReady');
    const revenueEl = document.getElementById('kpiRevenue');

    const activeCards = allCards.filter(c => c.status !== 'Completed' && c.status !== 'Delivered');
    const inBays = activeCards.filter(c => c.status !== 'Ready' && c.currentBay !== 'Bay 6');
    const ready = activeCards.filter(c => c.status === 'Ready' || c.currentBay === 'Bay 6');
    const revenue = allCards.reduce((sum, c) => sum + (Number(c.netPayable) || 0), 0);

    if (totalVehiclesEl) totalVehiclesEl.textContent = activeCards.length;
    if (inBaysEl) inBaysEl.textContent = inBays.length;
    if (readyEl) readyEl.textContent = ready.length;
    if (revenueEl) revenueEl.textContent = `Rs. ${revenue.toLocaleString()}`;
}

// ==========================================================================
// 4. LIVE BAY FLOW KANBAN BOARD
// ==========================================================================
function renderKanban() {
    const bays = [
        { id: 'Bay 1', name: 'Bay 1: Diagnostics' },
        { id: 'Bay 2', name: 'Bay 2: Electrical & AC' },
        { id: 'Bay 3', name: 'Bay 3: Suspension & Brakes' },
        { id: 'Bay 4', name: 'Bay 4: Denting & Body' },
        { id: 'Bay 5', name: 'Bay 5: Detailing & Wash' },
        { id: 'Bay 6', name: 'Bay 6: Ready for Delivery' }
    ];

    const container = document.getElementById('kanbanColumns');
    if (!container) return;

    container.innerHTML = bays.map(bay => {
        const matchingCards = allCards.filter(c => !isClosedCard(c) && (c.currentBay || 'Bay 1') === bay.id);
        const isReadyBay = bay.id === 'Bay 6';

        const cardsHtml = matchingCards.map(c => `
            <div class="bay-card" onclick="openCardInEditor('${c.id}')">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div class="bay-card-plate">${escapeHtml(c.vehicle?.plateNo || 'REG-PENDING')}</div>
                    <button type="button" style="background:none; border:none; color:#ef4444; font-size:12px; cursor:pointer;" onclick="event.stopPropagation(); deleteJobCardById('${c.id}')" title="Delete Card">🗑️</button>
                </div>
                <div class="bay-card-model">${escapeHtml(c.vehicle?.makeModel || 'Vehicle')}</div>
                <div class="bay-card-customer">👤 ${escapeHtml(c.customer?.name || 'Walk-in')}</div>
                <div class="bay-card-status">
                    <span class="status-tag ${c.status === 'Ready' ? 'ready' : 'in-progress'}">${c.status || 'In Progress'}</span>
                    ${isReadyBay ? `
                        <button type="button" class="btn-success" style="padding:2px 7px; font-size:10px;" onclick="event.stopPropagation(); closeJobCardPayment('${c.id}')" title="Clear Payment and Remove from TV">
                            💳 Clear &amp; Close
                        </button>
                    ` : `
                        <button type="button" class="btn-secondary" style="padding:2px 8px; font-size:10px;" onclick="event.stopPropagation(); quickAdvanceBay('${c.id}', '${bay.id}')">
                            Move Next ➔
                        </button>
                    `}
                </div>
            </div>
        `).join('');

        return `
            <div class="bay-column">
                <div class="bay-col-header">
                    <h5>${bay.name}</h5>
                    <span class="bay-col-badge ${isReadyBay ? 'ready' : ''}">${matchingCards.length}</span>
                </div>
                <div class="bay-col-list">
                    ${cardsHtml || '<div style="text-align:center; padding:30px 10px; color:#94a3b8; font-size:12px;">Bay Available</div>'}
                </div>
            </div>
        `;
    }).join('');
}

async function quickAdvanceBay(cardId, currentBay, btnEl) {
    if (isActionPending) return;
    isActionPending = true;
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.style.opacity = '0.5';
    }

    try {
        const baySequence = ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4', 'Bay 5', 'Bay 6'];
        const idx = baySequence.indexOf(currentBay);
        const nextBay = idx < baySequence.length - 1 ? baySequence[idx + 1] : 'Bay 6';
        const nextStatus = nextBay === 'Bay 6' ? 'Ready' : 'In Progress';

        if (window.HubAPI) {
            await window.HubAPI.updateBay(cardId, nextBay, nextStatus);
        }
        await refreshDashboard(true);
    } catch (e) {
        console.error('Advance bay error:', e);
    } finally {
        isActionPending = false;
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.style.opacity = '1';
        }
    }
}

// ==========================================================================
// 5. JOB CARDS DATABASE TABLE & FILTER
// ==========================================================================
let activeStatusFilter = 'active'; // 'active' | 'closed' | 'all'

function isClosedCard(c) {
    if (!c) return false;
    const s = (c.status || '').toLowerCase().trim();
    const b = (c.currentBay || '').toLowerCase().trim();
    return s === 'completed' || s === 'delivered' || s === 'closed' || s === 'cancelled' ||
           s.includes('paid') || s.includes('closed') || b.includes('closed') || c.paymentCleared === true;
}

function setStatusViewFilter(filter) {
    activeStatusFilter = filter;
    document.querySelectorAll('.daily-status-tab').forEach(el => {
        el.classList.remove('active');
    });
    if (filter === 'active') document.getElementById('tabActiveJobs')?.classList.add('active');
    if (filter === 'closed') document.getElementById('tabClosedJobs')?.classList.add('active');
    if (filter === 'all') document.getElementById('tabAllJobs')?.classList.add('active');
    renderTable();
}

function setDeptFilter(dept) {
    activeDeptFilter = dept;
    document.querySelectorAll('.dept-pill').forEach(el => {
        el.classList.toggle('active', el.dataset.dept === dept);
    });
    renderTable();
}

function handleSearch(q) {
    searchQuery = (q || '').toLowerCase().trim();
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('jobCardsTableBody');
    if (!tbody) return;

    // Update count badges
    const activeCount = allCards.filter(c => !isClosedCard(c)).length;
    const closedCount = allCards.filter(c => isClosedCard(c)).length;
    const allCount = allCards.length;

    if (document.getElementById('countActiveJobs')) document.getElementById('countActiveJobs').textContent = activeCount;
    if (document.getElementById('countClosedJobs')) document.getElementById('countClosedJobs').textContent = closedCount;
    if (document.getElementById('countAllJobs')) document.getElementById('countAllJobs').textContent = allCount;

    let filtered = allCards;

    // 1. Status Filter (Today's Active vs Closed Archive vs All)
    if (activeStatusFilter === 'active') {
        filtered = filtered.filter(c => !isClosedCard(c));
    } else if (activeStatusFilter === 'closed') {
        filtered = filtered.filter(c => isClosedCard(c));
    }

    // 2. Department Filter
    if (activeDeptFilter !== 'all') {
        filtered = filtered.filter(c => (c.departments || []).includes(activeDeptFilter));
    }

    // 3. Search Query Filter
    if (searchQuery) {
        filtered = filtered.filter(c => {
            const plate = (c.vehicle?.plateNo || '').toLowerCase();
            const model = (c.vehicle?.makeModel || '').toLowerCase();
            const name = (c.customer?.name || '').toLowerCase();
            const id = (c.id || '').toLowerCase();
            return plate.includes(searchQuery) || model.includes(searchQuery) || name.includes(searchQuery) || id.includes(searchQuery);
        });
    }

    if (filtered.length === 0) {
        const msg = activeStatusFilter === 'closed' ? 'No closed or paid job cards found.' : 
                    activeStatusFilter === 'active' ? 'No active vehicle jobs in the workshop bays today.' : 
                    'No job cards found matching your criteria.';
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px; color:#94a3b8;">
                    ${msg}
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(c => {
        const isClosed = isClosedCard(c);
        const isReady = (c.status === 'Ready' || c.currentBay === 'Bay 6') && !isClosed;
        return `
            <tr style="${isClosed ? 'background-color:#fafafa; opacity:0.85;' : ''}">
                <td style="font-weight:800; color:#162544;">
                    ${c.id}
                    ${isClosed ? '<div style="font-size:10px; color:#15803d; font-weight:700;">✓ PAID & CLOSED</div>' : ''}
                </td>
                <td>
                    <span style="display:inline-block; background:#0f172a; color:#fff; font-weight:800; padding:2px 7px; border-radius:4px; font-size:11px;">
                        ${escapeHtml(c.vehicle?.plateNo || '-')}
                    </span>
                    <div style="font-size:11.5px; color:#64748b; margin-top:2px;">${escapeHtml(c.vehicle?.makeModel || '-')}</div>
                </td>
                <td>
                    <div style="font-weight:700;">${escapeHtml(c.customer?.name || '-')}</div>
                    <div style="font-size:11px; color:#64748b;">${escapeHtml(c.customer?.phone || '-')}</div>
                </td>
                <td>
                    ${isClosed ? `
                        <span style="font-size:11.5px; font-weight:700; color:#15803d;">Delivered (Accounts Settled)</span>
                    ` : `
                        <select onchange="updateCardBay('${c.id}', this.value, this)" style="padding:4px 8px; border-radius:6px; border:1px solid #cbd5e1; font-size:12px; font-weight:700; background:#f8fafc;">
                            <option value="Bay 1" ${c.currentBay === 'Bay 1' ? 'selected' : ''}>Bay 1: Diagnostics</option>
                            <option value="Bay 2" ${c.currentBay === 'Bay 2' ? 'selected' : ''}>Bay 2: Electrical & AC</option>
                            <option value="Bay 3" ${c.currentBay === 'Bay 3' ? 'selected' : ''}>Bay 3: Suspension & Brakes</option>
                            <option value="Bay 4" ${c.currentBay === 'Bay 4' ? 'selected' : ''}>Bay 4: Denting & Body</option>
                            <option value="Bay 5" ${c.currentBay === 'Bay 5' ? 'selected' : ''}>Bay 5: Detailing & Wash</option>
                            <option value="Bay 6" ${c.currentBay === 'Bay 6' ? 'selected' : ''}>Bay 6: Ready for Delivery</option>
                        </select>
                    `}
                </td>
                <td>
                    <span class="status-tag ${isClosed ? 'closed' : (isReady ? 'ready' : 'in-progress')}">
                        ${isClosed ? 'Closed & Paid' : (isReady ? 'Ready' : (c.status || 'In Progress'))}
                    </span>
                </td>
                <td style="font-weight:800; color:#162544; text-align:right;">
                    Rs. ${Number(c.netPayable || 0).toLocaleString()}
                </td>
                <td style="text-align:right; white-space:nowrap;">
                    ${!isClosed ? `
                        <button type="button" class="btn-success" style="padding:4px 8px; font-size:11px;" onclick="closeJobCardPayment('${c.id}')" title="Clear payment and remove from TV screen">
                            💳 Mark Paid & Close
                        </button>
                    ` : `
                        <button type="button" class="btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="reopenJobCard('${c.id}')" title="Reopen card">
                            🔄 Reopen
                        </button>
                    `}
                    <button type="button" class="btn-secondary" style="padding:4px 7px; font-size:11px; margin-left:3px;" onclick="printJobCardNativeById('${c.id}')" title="Print Official A4">
                        🖨️
                    </button>
                    <button type="button" class="btn-secondary" style="padding:4px 7px; font-size:11px; margin-left:3px;" onclick="downloadJobCardPdfById('${c.id}')" title="Download PDF">
                        📄
                    </button>
                    <button type="button" class="btn-primary" style="padding:4px 8px; font-size:11px; margin-left:3px;" onclick="openCardInEditor('${c.id}')" title="Edit">
                        ✏️
                    </button>
                    <button type="button" class="btn-danger" style="padding:4px 8px; font-size:11px; margin-left:3px;" onclick="deleteJobCardById('${c.id}')" title="Delete permanently (if created by mistake or cancelled)">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function closeJobCardPayment(cardId) {
    if (isActionPending) return;
    const card = allCards.find(c => c.id === cardId);
    if (!card) return;
    const plate = card.vehicle?.plateNo || cardId;
    const conf = confirm(`Mark Job Card ${cardId} (${plate}) as PAID & DELIVERED?\n\nThis will clear payment and remove the vehicle from the Waiting Lounge TV Screen.`);
    if (!conf) return;

    isActionPending = true;
    try {
        card.status = 'Paid & Delivered';
        card.currentBay = 'Delivered (Closed)';
        card.paymentCleared = true;
        card.closedAt = new Date().toISOString();

        if (window.HubAPI) {
            await window.HubAPI.saveJobCard(card);
            await window.HubAPI.updateBay(cardId, 'Delivered (Closed)', 'Paid & Delivered');
        }
        await refreshDashboard(true);
        if (window.showToast) window.showToast(`Job Card ${cardId} closed & cleared. Removed from Lounge TV!`, 'success');
    } catch (e) {
        console.error('Close card error:', e);
    } finally {
        isActionPending = false;
    }
}

async function reopenJobCard(cardId) {
    if (isActionPending) return;
    const card = allCards.find(c => c.id === cardId);
    if (!card) return;
    isActionPending = true;
    try {
        card.status = 'In Progress';
        card.currentBay = 'Bay 1';
        card.paymentCleared = false;
        delete card.closedAt;

        if (window.HubAPI) {
            await window.HubAPI.saveJobCard(card);
            await window.HubAPI.updateBay(cardId, 'Bay 1', 'In Progress');
        }
        await refreshDashboard(true);
        if (window.showToast) window.showToast(`Job Card ${cardId} reopened into Bay 1.`, 'info');
    } catch (e) {
        console.error('Reopen card error:', e);
    } finally {
        isActionPending = false;
    }
}

async function deleteJobCardById(cardId) {
    if (isActionPending) return;
    const card = allCards.find(c => c.id === cardId);
    const plate = card?.vehicle?.plateNo || cardId;
    const conf = confirm(`Are you sure you want to DELETE Job Card ${cardId} (${plate})?\n\nChoose OK if the client cancelled or if this card was created by mistake. This will permanently remove the record.`);
    if (!conf) return;

    isActionPending = true;
    try {
        allCards = allCards.filter(c => c.id.toLowerCase() !== cardId.toLowerCase());
        if (window.HubAPI) {
            await window.HubAPI.deleteJobCard(cardId);
        }
        await refreshDashboard(true);
        if (window.showToast) window.showToast(`Job Card ${cardId} permanently deleted.`, 'info');
    } catch (e) {
        console.error('Delete card error:', e);
    } finally {
        isActionPending = false;
    }
}

async function updateCardBay(cardId, bay, selectEl) {
    if (isActionPending) return;
    isActionPending = true;
    if (selectEl) {
        selectEl.disabled = true;
        selectEl.style.opacity = '0.5';
    }

    try {
        const status = bay === 'Bay 6' ? 'Ready' : 'In Progress';
        if (window.HubAPI) {
            await window.HubAPI.updateBay(cardId, bay, status);
        }
        await refreshDashboard(true);
        if (window.showToast) window.showToast(`Updated to ${bay}`, 'success');
    } catch (err) {
        console.error('Update bay error:', err);
    } finally {
        isActionPending = false;
        if (selectEl) {
            selectEl.disabled = false;
            selectEl.style.opacity = '1';
        }
    }
}

async function openCardInEditor(cardId) {
    if (!cardId) return;
    const cleanId = String(cardId).trim().toLowerCase();
    let card = allCards.find(c => (c.id || '').toLowerCase() === cleanId);
    if (!card && window.HubAPI) {
        allCards = await window.HubAPI.getAllJobCards();
        card = allCards.find(c => (c.id || '').toLowerCase() === cleanId);
    }
    if (card && window.loadCardIntoEditor) {
        window.loadCardIntoEditor(card);
        showView('editorView');
    }
}

async function printJobCardNativeById(cardId) {
    if (!cardId) return;
    const cleanId = String(cardId).trim().toLowerCase();
    let card = allCards.find(c => (c.id || '').toLowerCase() === cleanId);
    if (!card && window.HubAPI) {
        allCards = await window.HubAPI.getAllJobCards();
        card = allCards.find(c => (c.id || '').toLowerCase() === cleanId);
    }
    if (card && window.printJobCardNative) {
        window.printJobCardNative(card);
    }
}

async function downloadJobCardPdfById(cardId) {
    if (!cardId) return;
    const cleanId = String(cardId).trim().toLowerCase();
    let card = allCards.find(c => (c.id || '').toLowerCase() === cleanId);
    if (!card && window.HubAPI) {
        allCards = await window.HubAPI.getAllJobCards();
        card = allCards.find(c => (c.id || '').toLowerCase() === cleanId);
    }
    if (card && window.downloadJobCardPdf) {
        window.downloadJobCardPdf(card);
    }
}

// Settings modal
function openSettingsModal() {
    const m = document.getElementById('settingsModal');
    if (m) m.style.display = 'flex';
}

function closeSettingsModal() {
    const m = document.getElementById('settingsModal');
    if (m) m.style.display = 'none';
}

function saveGeminiSettings() {
    const key = document.getElementById('geminiApiKeyInput')?.value.trim();
    if (key) {
        localStorage.setItem('al_shaheen_gemini_key', key);
        alert('✓ Gemini API Key saved successfully!');
        closeSettingsModal();
    } else {
        alert('Please enter a valid Google Gemini API key.');
    }
}

// Global Exports
window.showView = showView;
window.refreshDashboard = refreshDashboard;
window.openCardInEditor = openCardInEditor;
window.quickAdvanceBay = quickAdvanceBay;
window.updateCardBay = updateCardBay;
window.printJobCardNativeById = printJobCardNativeById;
window.downloadJobCardPdfById = downloadJobCardPdfById;
window.setDeptFilter = setDeptFilter;
window.handleSearch = handleSearch;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveGeminiSettings = saveGeminiSettings;
window.setStatusViewFilter = setStatusViewFilter;
window.closeJobCardPayment = closeJobCardPayment;
window.reopenJobCard = reopenJobCard;
window.deleteJobCardById = deleteJobCardById;
window.handleAdminLoginSubmit = handleAdminLoginSubmit;
window.changeAdminPassword = changeAdminPassword;
window.adminLogout = adminLogout;
