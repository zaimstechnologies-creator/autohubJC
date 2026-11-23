// ==========================================================================
// AL SHAHEEN AUTO HUB - 60-INCH LOUNGE TV DISPLAY & VOICE ENGINE
// Features: Sequential FIFO Voice Announcements | Video Audio Ducking | Calm Sync
// ==========================================================================

const AL_SHAHEEN_PLAYLIST_ID = 'PLfWI-z1AjtsA';
const AL_SHAHEEN_DEFAULT_VIDEO = '3m4ApRBJmlo';

let isMuted = true;
let previousVolume = 100;
let tvJobCards = [];
let audioUnlocked = false;
let cachedVoices = [];
let knownReadyCards = new Set();
let isInitialTvLoad = true;

try {
    const storedReadyCards = JSON.parse(localStorage.getItem('legacy-tv-announced-ready-cards') || '[]');
    if (Array.isArray(storedReadyCards)) {
        knownReadyCards = new Set(storedReadyCards);
    }
} catch (e) {}

// Sequential FIFO Announcement Queue (One Announcement at a Time)
let announcementQueue = [];
let isAnnouncing = false;
let currentAnnouncingCard = null;

// Preload SpeechSynthesis Voices
function loadTvVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        cachedVoices = window.speechSynthesis.getVoices();
    }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    loadTvVoices();
    window.speechSynthesis.onvoiceschanged = loadTvVoices;
}

// User-Gesture Unlock for Web Audio & SpeechSynthesis (Bypasses Smart TV Autoplay Policies)
function unlockTvAudio() {
    if (audioUnlocked) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.resume();
            const silent = new SpeechSynthesisUtterance(' ');
            silent.volume = 0.01;
            window.speechSynthesis.speak(silent);
        }
        audioUnlocked = true;
    } catch (e) {}
}

// Initialize Lounge TV
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initYouTubePlayer();
    loadTvQueue();

    // Auto-unlock audio on any interaction with TV
    document.addEventListener('click', unlockTvAudio);
    document.addEventListener('keydown', unlockTvAudio);
    document.addEventListener('touchstart', unlockTvAudio);

    // Listen to real-time events from Centralized Server HubAPI
    window.addEventListener('hub-data-updated', () => {
        loadTvQueue();
    });

    window.addEventListener('hub-vehicle-ready', (e) => {
        const vehicle = e.detail;
        if (vehicle && vehicle.plateNo) {
            queueReadyAnnouncement(vehicle);
            loadTvQueue();
        }
    });

    window.addEventListener('hub-voice-announce', (e) => {
        const d = e.detail;
        speakCustomAnnouncement(d.message || 'Attention please: Vehicle is ready for collection.');
    });

    // Active calm queue poller every 3 seconds for central database sync
    setInterval(loadTvQueue, 3000);
});

// Live Clock
function initClock() {
    const clockEl = document.getElementById('tvClock');
    if (!clockEl) return;

    function update() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }
    update();
    setInterval(update, 1000);
}

// Locked Al Shaheen YouTube Player (with enablejsapi=1 for volume ducking)
function initYouTubePlayer() {
    const iframe = document.getElementById('tvYtIframe');
    if (!iframe) return;

    const embedUrl = `https://www.youtube.com/embed/${AL_SHAHEEN_DEFAULT_VIDEO}?list=${AL_SHAHEEN_PLAYLIST_ID}&autoplay=1&mute=1&loop=1&playsinline=1&rel=0&modestbranding=1&controls=1&enablejsapi=1`;
    iframe.src = embedUrl;
}

// Control YouTube Player via postMessage API
function sendYtCommand(func, args = []) {
    const iframe = document.getElementById('tvYtIframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: func,
            args: args
        }), '*');
    }
}

// Set YouTube Video Volume (0 to 100)
function setYtVolume(vol) {
    sendYtCommand('setVolume', [vol]);
}

// Toggle Mute on TV
function toggleTvAudio() {
    unlockTvAudio();
    const btn = document.getElementById('tvAudioBtn');
    isMuted = !isMuted;

    if (isMuted) {
        sendYtCommand('mute');
        if (btn) {
            btn.innerHTML = '🔇 Unmute Video';
            btn.classList.remove('gold');
        }
    } else {
        sendYtCommand('unMute');
        sendYtCommand('setVolume', [100]);
        if (btn) {
            btn.innerHTML = '🔊 Mute Video';
            btn.classList.add('gold');
        }
    }
}

// Toggle Fullscreen for 60-inch TV Kiosk
function toggleTvFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn('Fullscreen error:', err);
        });
    } else {
        document.exitFullscreen().catch(err => {
            console.warn('Exit fullscreen error:', err);
        });
    }
}

function isClosedCard(c) {
    if (!c) return false;
    const s = (c.status || '').toLowerCase().trim();
    const b = (c.currentBay || '').toLowerCase().trim();
    return s === 'completed' || s === 'delivered' || s === 'closed' || s === 'cancelled' || 
           s.includes('paid') || s.includes('closed') || b.includes('closed') || c.paymentCleared === true;
}

// Load and Render Queue (Centralized Database Single Source)
let lastTvHash = '';
async function loadTvQueue() {
    let newCards = [];
    if (window.HubAPI && typeof window.HubAPI.getTvQueue === 'function') {
        newCards = await window.HubAPI.getTvQueue();
    } else {
        try {
            const res = await fetch('/api/tv/queue?_t=' + Date.now(), {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    newCards = json.data;
                }
            }
        } catch (e) {
            newCards = [];
        }
    }

    tvJobCards = newCards;

    // Detect newly ready vehicles to announce sequentially over lounge speakers
    const currentReadyList = tvJobCards.filter(c => !isClosedCard(c) && (c.status === 'Ready' || c.currentBay === 'Bay 6'));
    const currentReadyIds = new Set(currentReadyList.map(c => c.id));

    const activeKnownCards = new Set(
        [...knownReadyCards].filter(id => currentReadyIds.has(id))
    );
    if (activeKnownCards.size !== knownReadyCards.size) {
        knownReadyCards = activeKnownCards;
        try {
            localStorage.setItem(
                'legacy-tv-announced-ready-cards',
                JSON.stringify([...knownReadyCards])
            );
        } catch (e) {}
    }

    if (!isInitialTvLoad) {
        currentReadyList.forEach(car => {
            if (!knownReadyCards.has(car.id)) {
                knownReadyCards.add(car.id);
                try {
                    localStorage.setItem(
                        'legacy-tv-announced-ready-cards',
                        JSON.stringify([...knownReadyCards])
                    );
                } catch (e) {}
                queueReadyAnnouncement({
                    id: car.id,
                    plateNo: car.vehicle?.plateNo || 'Vehicle',
                    makeModel: car.vehicle?.makeModel || '',
                    customer: car.customer?.name || ''
                });
            }
        });
    } else {
        currentReadyList.forEach(c => knownReadyCards.add(c.id));
        isInitialTvLoad = false;
    }

    const currentHash = tvJobCards.map(c => `${c.id}|${c.currentBay}|${c.status}`).join(';;');
    if (currentHash !== lastTvHash) {
        lastTvHash = currentHash;
        renderQueueList(tvJobCards);
    }
}

function renderQueueList(cards) {
    const listEl = document.getElementById('tvQueueList');
    const inServiceCountEl = document.getElementById('tvInServiceCount');
    const readyCountEl = document.getElementById('tvReadyCount');

    if (!listEl) return;

    // Filter cards for TV (Only show Active & Ready vehicles, exclude Closed, Paid, Delivered)
    const activeCards = cards.filter(c => !isClosedCard(c));
    const inServiceCars = activeCards.filter(c => c.status !== 'Ready' && c.currentBay !== 'Bay 6');
    const readyCars = activeCards.filter(c => c.status === 'Ready' || c.currentBay === 'Bay 6');

    if (inServiceCountEl) inServiceCountEl.textContent = `${inServiceCars.length} In Service`;
    if (readyCountEl) readyCountEl.textContent = `${readyCars.length} Ready`;

    updateAlertBanner();

    if (activeCards.length === 0) {
        listEl.innerHTML = `
            <div style="text-align:center; padding:50px 20px; color:#64748b;">
                <div style="font-size:38px; margin-bottom:12px;">🚗</div>
                <h3 style="color:#94a3b8; font-size:18px;">All Bays Operational</h3>
                <p style="font-size:13px; margin-top:6px;">Vehicles will appear here as soon as they enter the Hub.</p>
            </div>
        `;
        return;
    }

    // Sort: Ready vehicles on top, then by Bay number
    const sorted = [...activeCards].sort((a, b) => {
        const aReady = a.status === 'Ready' || a.currentBay === 'Bay 6';
        const bReady = b.status === 'Ready' || b.currentBay === 'Bay 6';
        if (aReady && !bReady) return -1;
        if (!aReady && bReady) return 1;
        return (a.currentBay || '').localeCompare(b.currentBay || '');
    });

    listEl.innerHTML = sorted.map(c => {
        const isReady = c.status === 'Ready' || c.currentBay === 'Bay 6';
        const bayName = isReady ? 'Bay 6 (Delivery)' : (c.currentBay || 'Bay 1');
        const plate = c.vehicle?.plateNo || 'REG-PENDING';
        const model = c.vehicle?.makeModel || 'Vehicle';
        const customer = c.customer?.name ? `<div class="tv-car-customer">Customer: ${escapeHtml(c.customer.name)}</div>` : '';

        return `
            <div class="tv-bay-card ${isReady ? 'ready-state' : ''}">
                <div class="tv-bay-left">
                    <div class="tv-bay-badge ${isReady ? 'ready-bay' : 'active-bay'}">
                        ${isReady ? 'READY' : bayName}
                    </div>
                    <div class="tv-car-info">
                        <div class="tv-car-plate">${escapeHtml(plate)}</div>
                        <div class="tv-car-model">${escapeHtml(model)}</div>
                        ${customer}
                    </div>
                </div>
                <div class="tv-bay-right">
                    <span class="tv-status-badge ${isReady ? 'ready' : 'in-progress'}">
                        ${isReady ? '✓ READY TO COLLECT' : '⚙ IN SERVICE'}
                    </span>
                    <div class="tv-instruction-text">
                        ${isReady ? '👉 Please proceed to Accounts Counter' : `Located at ${bayName}`}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateAlertBanner() {
    const alertBanner = document.getElementById('tvAlertBanner');
    const alertPlate = document.getElementById('tvAlertPlate');
    if (!alertBanner || !alertPlate) return;

    if (currentAnnouncingCard) {
        alertBanner.style.display = 'flex';
        alertPlate.textContent = currentAnnouncingCard.plateNo || 'READY';
    } else {
        const readyCars = tvJobCards.filter(c => !isClosedCard(c) && (c.status === 'Ready' || c.currentBay === 'Bay 6'));
        if (readyCars.length > 0) {
            alertBanner.style.display = 'flex';
            alertPlate.textContent = readyCars[0].vehicle?.plateNo || 'READY';
        } else {
            alertBanner.style.display = 'none';
        }
    }
}

// Two-tone chime sound (Web Audio API)
function playAirportChime() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        // Chime note 1: D5 (587.33 Hz)
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        // Chime note 2: A5 (880.00 Hz) - plays 0.22s after note 1
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, now + 0.22);
        gain2.gain.setValueAtTime(0.45, now + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.22);
        osc2.stop(now + 0.9);
    } catch (e) {
        console.warn('AudioContext chime error:', e);
    }
}

// ==========================================================================
// SEQUENTIAL FIFO AUDIO DUCKING VOICE ANNOUNCEMENT ENGINE
// One announcement at a time | No overlapping voice | 2.5s cooldown
// ==========================================================================
function queueReadyAnnouncement(vehicle) {
    if (!vehicle || !vehicle.plateNo) return;

    // Check if vehicle is already pending in the queue
    const alreadyQueued = announcementQueue.some(item => 
        (item.id && vehicle.id && item.id === vehicle.id) || item.plateNo === vehicle.plateNo
    );

    if (!alreadyQueued) {
        announcementQueue.push(vehicle);
        processAnnouncementQueue();
    }
}

function processAnnouncementQueue() {
    if (isAnnouncing) return;
    if (announcementQueue.length === 0) {
        currentAnnouncingCard = null;
        updateAlertBanner();
        return;
    }

    isAnnouncing = true;
    const current = announcementQueue.shift();
    currentAnnouncingCard = current;
    updateAlertBanner();

    playSingleAnnouncement(current, () => {
        // Calm cooldown pause between announcements (2.5 seconds)
        setTimeout(() => {
            isAnnouncing = false;
            currentAnnouncingCard = null;
            updateAlertBanner();
            // Process next vehicle in queue
            processAnnouncementQueue();
        }, 2500);
    });
}

function playSingleAnnouncement(vehicle, onFinished) {
    unlockTvAudio();

    if (!('speechSynthesis' in window)) {
        if (onFinished) onFinished();
        return;
    }

    window.speechSynthesis.resume();
    // Duck only after browser speech support is confirmed.
    setYtVolume(35);
    playAirportChime();

    setTimeout(() => {
        try {
            window.speechSynthesis.resume();
        } catch (e) {}

        const cleanPlate = (vehicle.plateNo || 'not available').split('').join(' ');
        const cleanModel = vehicle.makeModel ? `${vehicle.makeModel}` : '';
        const speechText = `Attention please. Registration number ${cleanPlate}, ${cleanModel}, is ready for delivery. Please proceed to the accounts counter. Thank you.`;

        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.rate = 0.88; // Calm, clear, professional broadcast cadence
        utterance.pitch = 1.05;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';

        const voices = cachedVoices.length > 0 ? cachedVoices : (window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
        const engVoice = voices.find(v => v.lang && v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('David') || v.name.includes('US') || v.name.includes('UK'))) || voices.find(v => v.lang && v.lang.startsWith('en'));
        if (engVoice) {
            utterance.voice = engVoice;
        }

        let finished = false;
        function finish() {
            if (finished) return;
            finished = true;
            setTimeout(() => {
                setYtVolume(100);
            }, 800);
            if (onFinished) onFinished();
        }

        utterance.onend = finish;
        utterance.onerror = finish;

        // Safety timeout in case browser speech synthesis hangs
        setTimeout(() => {
            if (!finished) finish();
        }, 12000);

        window.speechSynthesis.speak(utterance);
    }, 750);
}

function speakCustomAnnouncement(text) {
    unlockTvAudio();
    setYtVolume(10);
    playAirportChime();

    setTimeout(() => {
        if (!('speechSynthesis' in window)) {
            setTimeout(() => setYtVolume(100), 3000);
            return;
        }

        try {
            window.speechSynthesis.resume();
        } catch (e) {}

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.90;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';

        utterance.onend = () => {
            setTimeout(() => setYtVolume(100), 800);
        };
        utterance.onerror = () => {
            setYtVolume(100);
        };
        window.speechSynthesis.speak(utterance);
    }, 700);
}

// Test Announcement
function testVoiceAnnouncement() {
    unlockTvAudio();
    queueReadyAnnouncement({
        plateNo: 'AQP 007',
        makeModel: 'Mazda Flair',
        customer: 'Valued Customer'
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.toggleTvAudio = toggleTvAudio;
window.toggleTvFullscreen = toggleTvFullscreen;
window.testVoiceAnnouncement = testVoiceAnnouncement;
