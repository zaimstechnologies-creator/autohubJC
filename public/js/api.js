// ==========================================================================
// AL SHAHEEN AUTO HUB - CENTRALIZED DATABASE & REAL-TIME MULTI-DEVICE SYNC
// Single Source of Truth on Central Server | Zero Echo Loops | Instant Sync
// ==========================================================================

const API_BASE = '/api';
const LOCAL_STORAGE_KEY = 'al_shaheen_job_cards_v3';

function getAdminAuthHeaders(extraHeaders = {}) {
    return { ...extraHeaders };
}

class JobCardAPI {
    constructor() {
        this.isOnline = true;
        this.ws = null;
        this.sse = null;
        this.lastKnownHash = '';
        this.initWebSocket();
        this.initSSE();
        this.startLiveHeartbeat();
    }

    // 1. Native WebSocket Connection (Direct Server Authority Push)
    initWebSocket() {
        if (typeof window === 'undefined' || !('WebSocket' in window)) return;
        try {
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${proto}//${window.location.host}/ws`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onmessage = (evt) => {
                try {
                    const msg = JSON.parse(evt.data);
                    if (msg.type === 'snapshot' && Array.isArray(msg.data)) {
                        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(msg.data));
                        window.dispatchEvent(new CustomEvent('hub-data-updated', { detail: { all: msg.data } }));
                    } else if (msg.type === 'update') {
                        window.dispatchEvent(new CustomEvent('hub-data-updated', { detail: msg.data }));
                    } else if (msg.type === 'vehicle_ready') {
                        window.dispatchEvent(new CustomEvent('hub-vehicle-ready', { detail: msg.data }));
                    } else if (msg.type === 'voice_announce') {
                        window.dispatchEvent(new CustomEvent('hub-voice-announce', { detail: msg.data }));
                    }
                } catch (e) {}
            };

            this.ws.onclose = () => {
                // Reconnect WebSocket after 3 seconds
                setTimeout(() => this.initWebSocket(), 3000);
            };

            this.ws.onerror = () => {
                try { this.ws.close(); } catch (e) {}
            };
        } catch (e) {}
    }

    // 2. Server-Sent Events (SSE) Fallback Stream
    initSSE() {
        if (typeof window === 'undefined' || !('EventSource' in window)) return;
        try {
            this.sse = new EventSource(`${API_BASE}/live-stream`);

            this.sse.addEventListener('update', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    window.dispatchEvent(new CustomEvent('hub-data-updated', { detail: data }));
                } catch (err) {}
            });

            this.sse.addEventListener('vehicle_ready', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    window.dispatchEvent(new CustomEvent('hub-vehicle-ready', { detail: data }));
                } catch (err) {}
            });

            this.sse.addEventListener('voice_announce', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    window.dispatchEvent(new CustomEvent('hub-voice-announce', { detail: data }));
                } catch (err) {}
            });

            this.sse.onerror = () => {
                // Browser handles reconnect
            };
        } catch (e) {}
    }

    // 3. Fallback Heartbeat Poller (Only active when tab is visible, relaxed to 4 seconds)
    startLiveHeartbeat() {
        if (typeof window === 'undefined') return;
        setInterval(async () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            if (!localStorage.getItem('al_shaheen_admin_session') && !sessionStorage.getItem('al_shaheen_admin_session')) return;

            try {
                const res = await fetch(`${API_BASE}/jobcards?_t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: getAdminAuthHeaders({ 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' })
                });

                if (res.status === 401) {
                    window.dispatchEvent(new CustomEvent('hub-auth-required'));
                    return;
                }

                if (res.ok) {
                    const json = await res.json();
                    if (json.success && Array.isArray(json.data)) {
                        const currentHash = json.data.map(c => `${c.id}|${c.currentBay}|${c.status}|${c.paymentCleared}|${c.netPayable}`).join(';;');
                        if (currentHash !== this.lastKnownHash) {
                            this.lastKnownHash = currentHash;
                            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json.data));
                            window.dispatchEvent(new CustomEvent('hub-data-updated', { detail: { cards: json.data } }));
                        }
                    }
                }
            } catch (e) {}
        }, 4000);
    }

    // Fetch all job cards (Protected with admin auth - Direct Server Authority)
    async getAllJobCards() {
        try {
            const res = await fetch(`${API_BASE}/jobcards?_t=${Date.now()}`, {
                cache: 'no-store',
                headers: getAdminAuthHeaders({ 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' })
            });

            if (res.status === 401) {
                window.dispatchEvent(new CustomEvent('hub-auth-required'));
                return [];
            }

            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json.data));
                    this.lastKnownHash = json.data.map(c => `${c.id}|${c.currentBay}|${c.status}|${c.paymentCleared}|${c.netPayable}`).join(';;');
                    return json.data;
                }
            }
        } catch (err) {
            console.warn('API fetch failed, reading local cache:', err.message);
        }

        return this.getLocalJobCards();
    }

    // Public TV Queue (Sanitized, no customer private data)
    async getTvQueue() {
        try {
            const res = await fetch(`${API_BASE}/tv/queue?_t=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    return json.data;
                }
            }
        } catch (e) {}
        return [];
    }

    // Public Vehicle Tracking (Sanitized, no customer private data)
    async trackVehicle(query) {
        try {
            const res = await fetch(`${API_BASE}/public/track?q=${encodeURIComponent(query)}&_t=${Date.now()}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });
            const json = await res.json();
            return json;
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    // Save or update a job card directly in Centralized Server Database
    async saveJobCard(card) {
        let savedCard = card;

        try {
            const res = await fetch(`${API_BASE}/jobcards`, {
                method: 'POST',
                headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(card)
            });
            if (res.status === 401) {
                window.dispatchEvent(new CustomEvent('hub-auth-required'));
            } else if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    savedCard = json.data;
                }
            }
        } catch (err) {
            console.warn('API save offline fallback:', err.message);
        }

        this.updateLocalCard(savedCard);
        return savedCard;
    }

    // Update vehicle bay directly in Centralized Server Database (One Action at a Time)
    async updateBay(id, bay, status) {
        let updatedCard = null;

        try {
            const res = await fetch(`${API_BASE}/jobcards/${encodeURIComponent(id)}/bay`, {
                method: 'PUT',
                headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ bay, status })
            });

            if (res.status === 401) {
                window.dispatchEvent(new CustomEvent('hub-auth-required'));
            } else if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    updatedCard = json.data;
                    this.updateLocalCard(updatedCard);
                    return updatedCard;
                }
            }
        } catch (err) {
            console.warn('API bay update failed:', err.message);
        }

        // Offline fallback
        const cards = this.getLocalJobCards();
        const found = cards.find(c => c.id.toLowerCase() === id.toLowerCase());
        if (found) {
            found.currentBay = bay;
            if (status) found.status = status;
            if (bay === 'Bay 6' || status === 'Ready') {
                found.status = 'Ready';
                found.currentBay = 'Bay 6';
            }
            updatedCard = found;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cards));
        }
        return updatedCard;
    }

    // Delete job card directly in Centralized Server Database
    async deleteJobCard(id) {
        try {
            const res = await fetch(`${API_BASE}/jobcards/${encodeURIComponent(id)}`, {
                method: 'DELETE',
                headers: getAdminAuthHeaders()
            });
            if (res.status === 401) {
                window.dispatchEvent(new CustomEvent('hub-auth-required'));
            }
        } catch (err) {
            console.warn('API delete failed:', err.message);
        }

        const cards = this.getLocalJobCards().filter(c => c.id.toLowerCase() !== id.toLowerCase());
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cards));
        return true;
    }

    // Local Storage Passive Cache Helpers
    getLocalJobCards() {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) return JSON.parse(stored);
        } catch (e) {}
        return [];
    }

    updateLocalCard(card) {
        if (!card || !card.id) return;
        const cards = this.getLocalJobCards();
        const idx = cards.findIndex(c => c.id.toLowerCase() === card.id.toLowerCase());
        if (idx >= 0) {
            cards[idx] = card;
        } else {
            cards.unshift(card);
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cards));
    }
}

const api = new JobCardAPI();
window.HubAPI = api;
