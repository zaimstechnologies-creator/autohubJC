const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
let WebSocket = null;
try {
    WebSocket = require('ws');
} catch (e) {}

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'jobcards.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Disable all HTTP caching on API routes for live runtime freshness across all devices
app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/jobcards')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    }
    next();
});

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
try {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
} catch (e) {
    // Read-only serverless environment (e.g. Vercel Lambda)
}

// Pre-load default seed job cards so Vercel NFT bundles it
let bundledSeedCards = [];
try {
    bundledSeedCards = require('./data/jobcards.json');
} catch (e) {
    bundledSeedCards = [];
}

let inMemoryCards = null;
let lastDbMtime = 0;

// Helpers for Data Persistence (Authoritative Centralized Backend Database)
function getDbFilePath() {
    if (fs.existsSync(DATA_FILE)) return DATA_FILE;
    const tmpFile = path.join('/tmp', 'jobcards.json');
    if (fs.existsSync(tmpFile)) return tmpFile;
    return DATA_FILE;
}

function readJobCards() {
    const dbPath = getDbFilePath();
    try {
        if (fs.existsSync(dbPath)) {
            const stat = fs.statSync(dbPath);
            if (!inMemoryCards || stat.mtimeMs !== lastDbMtime) {
                const raw = fs.readFileSync(dbPath, 'utf8');
                inMemoryCards = JSON.parse(raw);
                lastDbMtime = stat.mtimeMs;
                return inMemoryCards;
            }
            return inMemoryCards;
        }
    } catch (e) {
        console.warn('Error reading centralized database file:', e.message);
    }

    if (inMemoryCards && Array.isArray(inMemoryCards) && inMemoryCards.length > 0) {
        return inMemoryCards;
    }

    // Fallback to bundled seed cards
    inMemoryCards = JSON.parse(JSON.stringify(bundledSeedCards));
    return inMemoryCards;
}

function writeJobCards(cards) {
    inMemoryCards = cards;
    let written = false;

    // 1. Attempt local file write
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(cards, null, 2), 'utf8');
        try { lastDbMtime = fs.statSync(DATA_FILE).mtimeMs; } catch (e) {}
        written = true;
    } catch (err) {
        // 2. Serverless Lambda fallback: write to writable /tmp
        try {
            const tmpFile = path.join('/tmp', 'jobcards.json');
            fs.writeFileSync(tmpFile, JSON.stringify(cards, null, 2), 'utf8');
            try { lastDbMtime = fs.statSync(tmpFile).mtimeMs; } catch (e) {}
            written = true;
        } catch (e2) {}
    }

    broadcastEvent('update', { count: cards.length, timestamp: Date.now() });
    return written;
}

function getGeminiApiKey() {
    if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const conf = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (conf.geminiApiKey) return conf.geminiApiKey;
        }
    } catch (e) {}
    return '';
}

// Server-Sent Events (SSE) & WebSocket Engine for Real-Time TV and Multi-Device Sync
let sseClients = [];
let wssInstance = null;

function broadcastEvent(eventType, payload) {
    // 1. Broadcast to SSE Clients
    const dataStr = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
    sseClients.forEach(client => {
        try {
            client.res.write(dataStr);
        } catch (e) {
            // Client disconnected
        }
    });

    // 2. Broadcast to Native WebSocket Clients (Sub-millisecond sync)
    if (wssInstance && WebSocket) {
        const wsMsg = JSON.stringify({ type: eventType, data: payload, timestamp: Date.now() });
        wssInstance.clients.forEach(wsClient => {
            if (wsClient.readyState === WebSocket.OPEN) {
                try { wsClient.send(wsMsg); } catch (e) {}
            }
        });
    }
}

// SSE Endpoint
app.get(['/api/live-stream', '/live-stream'], (req, res) => {
    if (process.env.VERCEL) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'close');
        res.write(`event: connected\ndata: ${JSON.stringify({ vercel: true, time: Date.now() })}\n\n`);
        return res.end();
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders && res.flushHeaders();

    const clientId = Date.now() + Math.random().toString(36).substring(2, 9);
    sseClients.push({ id: clientId, res });

    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, time: Date.now() })}\n\n`);

    req.on('close', () => {
        sseClients = sseClients.filter(c => c.id !== clientId);
    });
});

// ==========================================================================
// ENTERPRISE HMAC-SHA256 AUTHENTICATION & SECURITY ENGINE
// Shields confidential client records (phones, addresses, financial billing)
// ==========================================================================
const AUTH_SECRET = process.env.AUTH_SECRET || '';

function getAdminCredentials() {
    const username = process.env.AUTH_USERNAME && process.env.AUTH_USERNAME.trim();
    const passwordHash = process.env.AUTH_PASSWORD_HASH || '';
    if (!username || Buffer.byteLength(AUTH_SECRET, 'utf8') < 32 || !parsePasswordHash(passwordHash)) {
        return null;
    }
    return { username, passwordHash };
}

function parsePasswordHash(value) {
    const parts = value.split(':');
    if (
        parts.length !== 6 ||
        parts[0] !== 'scrypt' ||
        parts[1] !== '16384' ||
        parts[2] !== '8' ||
        parts[3] !== '1'
    ) {
        return null;
    }

    try {
        const salt = Buffer.from(parts[4], 'base64url');
        const hash = Buffer.from(parts[5], 'base64url');
        if (salt.length !== 16 || hash.length !== 32) return null;
        return { salt, hash };
    } catch (e) {
        return null;
    }
}

function verifyAdminPassword(password, passwordHash) {
    const parsedHash = parsePasswordHash(passwordHash);
    if (!parsedHash) return false;
    const derivedHash = crypto.scryptSync(password, parsedHash.salt, 32, {
        N: 16384,
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(derivedHash, parsedHash.hash);
}

function generateSignedToken(username) {
    if (Buffer.byteLength(AUTH_SECRET, 'utf8') < 32) {
        throw new Error('Authentication signing secret is not configured.');
    }
    const issuedAt = Date.now();
    const expiresAt = issuedAt + (8 * 60 * 60 * 1000);
    const payload = `${username}:${issuedAt}:${expiresAt}`;
    const hmac = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
    const token = Buffer.from(`${payload}:${hmac}`).toString('base64url');
    return { token, expiresAt, username };
}

function verifySignedToken(token) {
    const credentials = getAdminCredentials();
    if (!credentials || !token || typeof token !== 'string') return null;
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf8');
        const parts = decoded.split(':');
        if (parts.length !== 4) return null;
        const [username, issuedAt, expiresAt, receivedHmac] = parts;
        const issuedAtMs = Number(issuedAt);
        const expiresAtMs = Number(expiresAt);
        if (
            username !== credentials.username ||
            !Number.isSafeInteger(issuedAtMs) ||
            !Number.isSafeInteger(expiresAtMs) ||
            issuedAtMs > Date.now() + 60_000 ||
            expiresAtMs <= Date.now() ||
            expiresAtMs - issuedAtMs > 8 * 60 * 60 * 1000
        ) {
            return null; // Expired
        }
        const expectedPayload = `${username}:${issuedAt}:${expiresAt}`;
        const calculatedHmac = crypto.createHmac('sha256', AUTH_SECRET).update(expectedPayload).digest('hex');
        const bufA = Buffer.from(receivedHmac, 'hex');
        const bufB = Buffer.from(calculatedHmac, 'hex');
        if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
            return { username, expiresAt: expiresAtMs };
        }
    } catch (e) {}
    return null;
}

function requireAdminAuth(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token'] || '';
    let token = '';
    if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    } else {
        token = authHeader.trim();
    }

    const session = verifySignedToken(token);
    if (!session) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized: Admin authentication required to access client records.'
        });
    }
    req.adminUser = session;
    next();
}

// --------------------------------------------------------------------------
// AUTHENTICATION & SECURITY ENDPOINTS
// --------------------------------------------------------------------------

// 1. Admin Sign In (Strict Credential Verification)
app.post(['/api/auth/login', '/auth/login'], async (req, res) => {
    const { username, password } = req.body || {};
    const creds = getAdminCredentials();

    if (!creds) {
        return res.status(503).json({
            success: false,
            error: 'Admin authentication is not configured.'
        });
    }
    if (
        typeof username === 'string' &&
        username.length <= 128 &&
        typeof password === 'string' &&
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])[!-~]{12}$/.test(password)
    ) {
        try {
            if (username.trim() === creds.username && verifyAdminPassword(password, creds.passwordHash)) {
                const tokenData = generateSignedToken(creds.username);
                return res.json({
                    success: true,
                    token: tokenData.token,
                    expiresAt: tokenData.expiresAt,
                    user: creds.username,
                    role: 'admin'
                });
            }
        } catch (e) {
            console.error('Admin sign-in verification failed:', e.message);
            return res.status(500).json({
                success: false,
                error: 'Unable to sign in right now.'
            });
        }
    }

    return res.status(401).json({
        success: false,
        error: 'Invalid admin username or password. Access denied.'
    });
});

// 2. Verify Session Validity
app.get(['/api/auth/verify', '/auth/verify'], (req, res) => {
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
    const session = verifySignedToken(token);
    if (session) {
        return res.json({ success: true, valid: true, user: session.username });
    }
    return res.status(401).json({ success: false, valid: false, error: 'Session expired or invalid.' });
});

// 3. Change Admin Password (Managed through deployment secrets)
app.post(['/api/auth/change-password', '/auth/change-password'], requireAdminAuth, (req, res) => {
    return res.status(501).json({
        success: false,
        error: 'Admin credentials are managed through deployment secrets.'
    });
});

// 4. Admin Sign Out
app.post(['/api/auth/logout', '/auth/logout'], (req, res) => {
    res.json({ success: true, message: 'Logged out successfully.' });
});

// 5. Public Waiting Lounge TV Queue (Strictly Sanitized - Zero Customer Private Data)
app.get(['/api/tv/queue', '/tv/queue'], (req, res) => {
    const cards = readJobCards();
    const sanitized = cards
        .filter(c => {
            const s = (c.status || '').toLowerCase().trim();
            const b = (c.currentBay || '').toLowerCase().trim();
            const isClosed = s === 'completed' || s === 'delivered' || s === 'closed' || s === 'cancelled' ||
                             s.includes('paid') || s.includes('closed') || b.includes('closed') || c.paymentCleared === true;
            return !isClosed;
        })
        .map(c => ({
            id: c.id,
            currentBay: c.currentBay || 'Bay 1',
            status: c.status || 'In Progress',
            vehicle: {
                plateNo: c.vehicle?.plateNo || 'Vehicle',
                makeModel: c.vehicle?.makeModel || '',
                color: c.vehicle?.color || ''
            }
        }));

    res.json({ success: true, data: sanitized });
});

// 6. Public Customer Vehicle Tracking (Strictly Sanitized - Zero Other Customer Data)
app.get(['/api/public/track', '/public/track'], (req, res) => {
    const q = (req.query.q || req.query.plate || req.query.id || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!q) {
        return res.status(400).json({ success: false, message: 'Vehicle registration number or Job Card ID required.' });
    }
    const cards = readJobCards();
    const found = cards.find(c => {
        const p = (c.vehicle?.plateNo || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const id = (c.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return p.includes(q) || id.includes(q);
    });

    if (!found) {
        return res.status(404).json({ success: false, message: 'No active job card found for this registration number.' });
    }

    res.json({
        success: true,
        data: {
            id: found.id,
            vehicle: {
                plateNo: found.vehicle?.plateNo || 'Vehicle',
                makeModel: found.vehicle?.makeModel || ''
            },
            currentBay: found.currentBay || 'Bay 1',
            status: found.status || 'In Progress',
            serviceAdvisor: found.serviceAdvisor || 'Service Incharge'
        }
    });
});

// REST API Endpoints (Protected with requireAdminAuth)
app.get(['/api/jobcards', '/jobcards'], requireAdminAuth, (req, res) => {
    const cards = readJobCards();
    res.json({ success: true, data: cards });
});

app.get(['/api/jobcards/:id', '/jobcards/:id'], requireAdminAuth, (req, res) => {
    const cards = readJobCards();
    const found = cards.find(c => c.id.toLowerCase() === req.params.id.toLowerCase());
    if (found) {
        res.json({ success: true, data: found });
    } else {
        res.status(404).json({ success: false, message: 'Job card not found' });
    }
});

// Create or Update Job Card via POST (Protected)
app.post(['/api/jobcards', '/jobcards'], requireAdminAuth, (req, res) => {
    const newCard = req.body;
    if (!newCard || !newCard.id) {
        return res.status(400).json({ success: false, message: 'Valid job card object required' });
    }

    const cards = readJobCards();
    const existingIdx = cards.findIndex(c => c.id.toLowerCase() === newCard.id.toLowerCase());
    const oldCard = existingIdx >= 0 ? cards[existingIdx] : null;

    if (existingIdx >= 0) {
        cards[existingIdx] = { ...cards[existingIdx], ...newCard };
    } else {
        cards.unshift(newCard);
    }

    writeJobCards(cards);

    if (newCard.status === 'Ready' && (!oldCard || oldCard.status !== 'Ready')) {
        broadcastEvent('vehicle_ready', {
            id: newCard.id,
            plateNo: newCard.vehicle?.plateNo || 'Vehicle',
            makeModel: newCard.vehicle?.makeModel || '',
            customer: newCard.customer?.name || '',
            bay: newCard.currentBay || 'Bay 6'
        });
    }

    res.json({ success: true, data: newCard });
});

// Update Job Card via PUT (Protected)
app.put(['/api/jobcards/:id', '/jobcards/:id'], requireAdminAuth, (req, res) => {
    const updated = req.body;
    const cards = readJobCards();
    const idx = cards.findIndex(c => c.id.toLowerCase() === req.params.id.toLowerCase());
    const oldCard = idx >= 0 ? cards[idx] : null;

    if (idx >= 0) {
        cards[idx] = { ...cards[idx], ...updated };
    } else {
        cards.unshift(updated);
    }

    writeJobCards(cards);

    if (updated.status === 'Ready' && (!oldCard || oldCard.status !== 'Ready')) {
        broadcastEvent('vehicle_ready', {
            id: updated.id,
            plateNo: updated.vehicle?.plateNo || 'Vehicle',
            makeModel: updated.vehicle?.makeModel || '',
            customer: updated.customer?.name || '',
            bay: updated.currentBay || 'Bay 6'
        });
    }

    res.json({ success: true, data: cards[idx >= 0 ? idx : 0] });
});

app.put(['/api/jobcards/:id/bay', '/jobcards/:id/bay'], requireAdminAuth, (req, res) => {
    const { bay, status } = req.body;
    const cards = readJobCards();
    const idx = cards.findIndex(c => c.id.toLowerCase() === req.params.id.toLowerCase());

    if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Job card not found' });
    }

    const prevStatus = cards[idx].status;
    if (bay) cards[idx].currentBay = bay;
    if (status) cards[idx].status = status;

    if (bay === 'Bay 6' || status === 'Ready') {
        cards[idx].status = 'Ready';
        cards[idx].currentBay = 'Bay 6';
    }

    writeJobCards(cards);

    if (cards[idx].status === 'Ready' && prevStatus !== 'Ready') {
        broadcastEvent('vehicle_ready', {
            id: cards[idx].id,
            plateNo: cards[idx].vehicle?.plateNo || 'Vehicle',
            makeModel: cards[idx].vehicle?.makeModel || '',
            customer: cards[idx].customer?.name || '',
            bay: cards[idx].currentBay
        });
    }

    res.json({ success: true, data: cards[idx] });
});

app.delete(['/api/jobcards/:id', '/jobcards/:id'], requireAdminAuth, (req, res) => {
    let cards = readJobCards();
    const initialLen = cards.length;
    cards = cards.filter(c => c.id.toLowerCase() !== req.params.id.toLowerCase());

    if (cards.length === initialLen) {
        return res.status(404).json({ success: false, message: 'Job card not found' });
    }

    writeJobCards(cards);
    res.json({ success: true, message: 'Deleted successfully' });
});

// ==========================================================================
// GEMINI AI AUTOMOTIVE DIAGNOSTIC ENGINE (SERVER-SIDE PROXY)
// Accurately interprets English, Urdu, and Roman Urdu mechanical concerns
// ==========================================================================
app.post(['/api/ai/diagnose', '/ai/diagnose'], requireAdminAuth, (req, res) => {
    const { concern, makeModel, mileage, apiKey: clientApiKey } = req.body;
    const apiKey = clientApiKey || getGeminiApiKey();

    if (!concern) {
        return res.status(400).json({ success: false, message: 'Customer concern is required' });
    }

    const prompt = `You are a Master Automotive Engineer and Chief Technical Diagnostician at Al Shaheen Auto Hub (Lahore, Pakistan).
Vehicle Details: ${makeModel || 'Automobile'} (Mileage: ${mileage || 'Unknown'} km).
Customer Concern (as reported by driver in English or Roman Urdu):
"${concern}"

Understand the mechanical symptoms described by Pakistani drivers:
- "Gari aik trf khainchti hai / pulling to one side": Steering pulling, wheel alignment camber/caster out, worn tie rod ends, damaged lower control arm ball joint or bushings, uneven tire pressure.
- "Jhatky ly kr chlti hai / jerking": Engine misfire, fouled spark plugs, dirty fuel injectors, clogged fuel filter, carbon buildup on throttle body, or ignition coil breakdown.
- "Gear shift main masla / 3rd gear phas jata hai": Manual transmission 3rd gear synchronizer brass ring worn/chipped, clutch pressure plate or release bearing worn, gear shift linkage cable out of adjustment, or low/burnt gear oil.
- "Khady main awaz / tik tik sound": Worn outer CV axle joints, stabilizer sway bar links, or strut mount bearings.
- "AC cooling issue": Low refrigerant gas (R134a), evaporator leak, faulty compressor clutch, or clogged cabin filter.

Provide a comprehensive, professional automotive solution for the official Al Shaheen Job Card:
1. workToBeDone: Formatted as numbered actionable repair tasks for the mechanics.
2. recommendedParts: Array of specific spare parts and consumables needed with realistic Pakistani market rates (PKR).
3. estimatedLabour: Estimated total labour charges in PKR.

Return STRICTLY valid JSON with no markdown wrapping:
{
  "workToBeDone": "1. ...\\n2. ...\\n3. ...",
  "recommendedParts": [
    { "desc": "Part description", "qty": 1, "estimatedRate": 5000 }
  ],
  "estimatedLabour": 6500
}`;

    const payload = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    if (apiKey) {
        let hasResponded = false;
        const respondSafe = (source, data) => {
            if (hasResponded || res.headersSent) return;
            hasResponded = true;
            return res.json({ success: true, source, data });
        };

        const reqAi = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            },
            timeout: 3500,
            agent: new https.Agent({ rejectUnauthorized: false })
        }, (resAi) => {
            let body = '';
            resAi.on('data', d => body += d);
            resAi.on('end', () => {
                if (resAi.statusCode === 200) {
                    try {
                        const json = JSON.parse(body);
                        const text = json.candidates[0].content.parts[0].text;
                        const parsedData = JSON.parse(text);
                        return respondSafe('gemini-flash-latest', parsedData);
                    } catch (parseErr) {
                        console.warn('Failed parsing Gemini output, using heuristic fallback:', parseErr.message);
                    }
                }
                const fallback = generateAdvancedAutomotiveDiagnosis(concern, makeModel);
                return respondSafe('al-shaheen-expert-system', fallback);
            });
        });

        reqAi.on('error', (err) => {
            const fallback = generateAdvancedAutomotiveDiagnosis(concern, makeModel);
            return respondSafe('al-shaheen-expert-system', fallback);
        });

        reqAi.on('timeout', () => {
            reqAi.destroy();
            const fallback = generateAdvancedAutomotiveDiagnosis(concern, makeModel);
            return respondSafe('al-shaheen-expert-system', fallback);
        });

        reqAi.write(payload);
        reqAi.end();
    } else {
        const fallback = generateAdvancedAutomotiveDiagnosis(concern, makeModel);
        return res.json({ success: true, source: 'al-shaheen-expert-system', data: fallback });
    }
});

// Advanced Automotive Knowledge Base (Expert Fallback with Roman Urdu Understanding)
function generateAdvancedAutomotiveDiagnosis(concern, makeModel) {
    const text = (concern || '').toLowerCase();
    const parts = [];
    const tasks = [];
    const matchedDepts = new Set(['General Service']);
    let labour = 2500;

    // 1. Smell / Interior Cleaning / Detailing / Spills / Odor
    const hasSmell = text.includes('smell') || text.includes('badbu') || text.includes('gir') || text.includes('clean') ||
                     text.includes('wash') || text.includes('detail') || text.includes('stain') || text.includes('carpet') ||
                     text.includes('seat') || text.includes('chahing') || text.includes('gand') || text.includes('odor') || text.includes('safai');

    // 2. Wheel Alignment / Steering Pulling
    const hasPulling = text.includes('khainch') || text.includes('pull') || text.includes('alignment') || text.includes('side') ||
                       text.includes('ek taraf') || text.includes('steering') || text.includes('teerha') || text.includes('lehrana');

    // 3. Engine Jerking / Misfire / Missing / Fuel System
    const hasJerking = text.includes('jhatk') || text.includes('jerk') || text.includes('misfire') || text.includes('missing') ||
                       text.includes('chlti') || text.includes('kachay petrol') || text.includes('plug') || text.includes('injector') || text.includes('pickup');

    // 4. Gearbox / Shifter / 3rd Gear / Transmission / Clutch
    const hasGearIssue = text.includes('gear') || text.includes('3rd') || text.includes('clutch') || text.includes('phas') ||
                         text.includes('hard') || text.includes('reverse') || text.includes('slipping') || text.includes('gearbox');

    // 5. Brakes / Squeaking / Soft Pedal
    const hasBrakes = text.includes('brake') || text.includes('break') || text.includes('chee chee') || text.includes('squeak') ||
                      text.includes('pedal') || text.includes('ruk nahi');

    // 6. Suspension / Clunking / Khada Awaz / Tik Tik
    const hasSuspension = text.includes('khad') || text.includes('awaz') || text.includes('sound') || text.includes('tik') ||
                          text.includes('thuk') || text.includes('jump') || text.includes('speed breaker') || text.includes('shock') ||
                          text.includes('axle') || text.includes('cv joint') || text.includes('chimtay');

    // 7. AC / Cooling / Gas / Compressor
    const hasAC = text.includes('ac') || text.includes('cooling') || text.includes('hawa') || text.includes('garam') ||
                  text.includes('gas') || text.includes('compressor') || text.includes('thanda');

    // 8. Overheating / Radiator / Temperature
    const hasOverheat = text.includes('heat') || text.includes('overheat') || text.includes('radiator') || text.includes('coolant') ||
                        text.includes('pani') || text.includes('temperature') || text.includes('boil');

    // 9. Battery / Electrical / Self Starter
    const hasElectrical = text.includes('battery') || text.includes('self') || text.includes('start nahi') || text.includes('dynamo') ||
                          text.includes('alternator') || text.includes('light') || text.includes('fuse') || text.includes('wiring');

    // 10. Denting / Painting / Scratches / Bodywork
    const hasBodywork = text.includes('dent') || text.includes('paint') || text.includes('scratch') || text.includes('bumper') ||
                        text.includes('fender') || text.includes('darwaza') || text.includes('accident') || text.includes('hit') || text.includes('color');

    // 11. Oil Service / Tuning / Maintenance
    const hasOilService = text.includes('oil') || text.includes('mobil') || text.includes('tuning') || text.includes('service') || text.includes('filter');

    // 12. Tyres / Puncture / Balancing
    const hasTyres = text.includes('tyre') || text.includes('tire') || text.includes('puncture') || text.includes('balancing') || text.includes('hawa');

    // --- APPLY DIAGNOSTIC KNOWLEDGE BASE ---
    if (hasSmell) {
        tasks.push('Perform deep extraction steam & foam wash on carpets, seat upholstery, and floor mats where spillage or contamination occurred.');
        tasks.push('Apply bio-enzymatic odor-neutralizing treatment to eradicate organic food/spill bacteria at the molecular level.');
        tasks.push('Remove contaminated cabin AC air filter, chemically sanitize HVAC evaporator core air ducts, and run 30-min cabin ozone deodorization.');
        parts.push({ desc: 'Bio-Enzymatic Interior Cleaner & Stain Remover', qty: 1, estimatedRate: 2200 });
        parts.push({ desc: 'Anti-Bacterial Cabin AC Air Filter (OEM)', qty: 1, estimatedRate: 2500 });
        parts.push({ desc: 'Cabin Ozone Deodorizing & Antibacterial Mist Treatment', qty: 1, estimatedRate: 1800 });
        matchedDepts.add('Car Wash');
        matchedDepts.add('Detailing');
        matchedDepts.add('AC Service');
        labour += 4500;
    }

    if (hasPulling) {
        tasks.push('Inspect front suspension geometry, lower control arm bushings, and steering tie rod ends for mechanical play.');
        tasks.push('Perform 4-wheel computerized 3D laser alignment and calibrate electronic steering angle sensor (SAS).');
        parts.push({ desc: 'Front Lower Control Arm Bushings Set', qty: 1, estimatedRate: 4800 });
        parts.push({ desc: 'Steering Tie Rod Ends (Pair)', qty: 1, estimatedRate: 4200 });
        matchedDepts.add('Mechanical');
        matchedDepts.add('Alignment');
        labour += 2500;
    }

    if (hasJerking) {
        tasks.push('Perform complete EFI diagnostic tune-up: scan OBD-II for cylinder misfire codes, replace fouled spark plugs, and clean fuel injectors.');
        tasks.push('Disassemble electronic throttle body, clean carbon deposits with sensor-safe chemical, and recalibrate idle airflow.');
        parts.push({ desc: 'OEM Iridium Spark Plugs Set', qty: 1, estimatedRate: 7500 });
        parts.push({ desc: 'Electronic Throttle Body & MAF Chemical Cleaner Spray', qty: 2, estimatedRate: 1400 });
        matchedDepts.add('Mechanical');
        labour += 3500;
    }

    if (hasGearIssue) {
        tasks.push('Inspect clutch assembly, release bearing, and gear shifter linkage cables for tension and bushing wear.');
        tasks.push('Drain burnt gear oil, inspect for synchronizer brass debris, and refill with high-grade synthetic gear oil (75W-90).');
        tasks.push('If 3rd gear sticks or grinds, remove transmission to inspect/replace worn 3rd gear synchronizer brass cone ring.');
        parts.push({ desc: '3rd Gear Synchronizer Brass Cone Ring', qty: 1, estimatedRate: 6800 });
        parts.push({ desc: 'Full Synthetic 75W-90 Transmission Gear Oil (1L)', qty: 3, estimatedRate: 2800 });
        matchedDepts.add('Mechanical');
        labour += 7500;
    }

    if (hasBrakes) {
        tasks.push('Measure front brake pad and rear brake shoe friction lining thickness against safety tolerances.');
        tasks.push('Inspect front brake disc rotors for grooves and lateral runout; precision skim on lathe if required; bleed brake fluid with fresh DOT-4.');
        parts.push({ desc: 'Front Ceramic Brake Pads (OEM)', qty: 1, estimatedRate: 6500 });
        parts.push({ desc: 'Brake Rotor Disc Precision Skimming / Lathe Resurfacing (Pair)', qty: 1, estimatedRate: 2500 });
        parts.push({ desc: 'DOT-4 Hydraulic Brake Fluid (500ml)', qty: 2, estimatedRate: 1200 });
        matchedDepts.add('Mechanical');
        labour += 3000;
    }

    if (hasSuspension && !hasPulling) {
        tasks.push('Inspect front shock absorbers, strut mount bearings, and drive axles for fluid leakage and abnormal play.');
        tasks.push('Check stabilizer sway bar links and rubber D-bushings; road-test over speed bumps to verify contact noise elimination.');
        parts.push({ desc: 'Front Outer CV Joint & Axle Boot Assembly', qty: 1, estimatedRate: 8500 });
        parts.push({ desc: 'Front Stabilizer Sway Bar Drop Links (Pair)', qty: 1, estimatedRate: 3600 });
        matchedDepts.add('Mechanical');
        labour += 3500;
    }

    if (hasAC && !hasSmell) {
        tasks.push('Connect dual-gauge AC manifold to analyze high and low refrigerant pressure circuits; inspect for micro-leaks.');
        tasks.push('Evacuate AC system; recharge pure R134a refrigerant with UV leak detection dye and PAG lubricant oil; replace cabin filter.');
        parts.push({ desc: 'R134a Refrigerant Gas Recharge & PAG Compressor Oil', qty: 1, estimatedRate: 3800 });
        parts.push({ desc: 'Premium Anti-Pollen Cabin AC Air Filter', qty: 1, estimatedRate: 2200 });
        matchedDepts.add('AC Service');
        labour += 3000;
    }

    if (hasOverheat) {
        tasks.push('Pressure-test cooling system for leaks in radiator, water pump, and hoses; inspect thermostat valve operation.');
        tasks.push('Verify high-speed radiator cooling fan activation; chemically flush radiator and refill with long-life anti-freeze coolant.');
        parts.push({ desc: 'Concentrated Long-Life Engine Coolant (Green/Pink) - 4L', qty: 1, estimatedRate: 4500 });
        parts.push({ desc: 'OEM Thermostat Valve Assembly', qty: 1, estimatedRate: 3200 });
        matchedDepts.add('Mechanical');
        labour += 3000;
    }

    if (hasElectrical) {
        tasks.push('Perform automated digital battery conductance test (CCA, voltage drop, internal resistance).');
        tasks.push('Inspect alternator charging circuit under full electrical load (13.8V - 14.4V); clean battery grounding terminals.');
        parts.push({ desc: 'Automotive Maintenance-Free Sealed Battery', qty: 1, estimatedRate: 16500 });
        parts.push({ desc: 'Anti-Corrosion Terminal Spray & Washers', qty: 1, estimatedRate: 800 });
        matchedDepts.add('Electrical');
        labour += 2000;
    }

    if (hasBodywork) {
        tasks.push('Perform precision panel beating on dented areas to restore factory body contours.');
        tasks.push('Apply anti-corrosive primer, computerized color-matched 2K basecoat, and high-gloss clearcoat; bake in heated paint booth.');
        parts.push({ desc: 'Computerized 2K Color-Matched Automotive Paint & Clearcoat Kit', qty: 1, estimatedRate: 9500 });
        parts.push({ desc: 'Body Polyester Lightweight Filler & 2K Primer Consumables', qty: 1, estimatedRate: 4200 });
        matchedDepts.add('Denting');
        matchedDepts.add('Painting');
        labour += 12000;
    }

    if (hasOilService && !hasJerking) {
        tasks.push('Drain old engine oil; install new genuine engine oil filter with fresh drain plug washer.');
        tasks.push('Refill engine with manufacturer-recommended fully synthetic oil; replace air intake filter and inspect all vital fluids.');
        parts.push({ desc: 'Fully Synthetic 5W-30 Engine Oil (4L)', qty: 1, estimatedRate: 11500 });
        parts.push({ desc: 'OEM Engine Oil Filter', qty: 1, estimatedRate: 2200 });
        parts.push({ desc: 'High-Flow Engine Air Filter', qty: 1, estimatedRate: 2400 });
        matchedDepts.add('General Service');
        labour += 2000;
    }

    if (hasTyres && !hasPulling) {
        tasks.push('Inspect all 4 tyres for tread wear, sidewall damage, or foreign object punctures; apply internal patch if needed.');
        tasks.push('Dynamically balance wheels on computerized balancing machine and set cold manufacturer tyre inflation pressures.');
        parts.push({ desc: 'High-Speed Wheel Balancing Lead Weights Set', qty: 1, estimatedRate: 1200 });
        parts.push({ desc: 'Internal Cold Tyre Puncture Repair Patch Material', qty: 1, estimatedRate: 800 });
        matchedDepts.add('Tyres Works');
        matchedDepts.add('Balancing');
        labour += 1500;
    }

    // Comprehensive Fallback if no specific condition matched
    if (tasks.length === 0) {
        tasks.push(`Perform targeted technical diagnostic inspection addressing reported vehicle concern: "${concern}".`);
        tasks.push('Connect OBD-II professional scanner to record live engine, transmission, and body control sensor telemetry.');
        tasks.push('Conduct multi-point chassis, suspension, braking, and fluid level inspection with Service Incharge road-test.');
        parts.push({ desc: 'OBD-II Electronic Diagnostic Scan & Sensor Telemetry Report', qty: 1, estimatedRate: 2500 });
        parts.push({ desc: 'Comprehensive Multi-Point Technical Safety Inspection Kit', qty: 1, estimatedRate: 2000 });
        matchedDepts.add('Mechanical');
        labour = 3500;
    }

    return {
        workToBeDone: tasks.map((t, i) => `${i + 1}. ${t}`).join('\n'),
        recommendedParts: parts,
        estimatedLabour: labour,
        departments: Array.from(matchedDepts)
    };
}

// Trigger voice announcement (Protected)
app.post(['/api/tv/announce', '/tv/announce'], requireAdminAuth, (req, res) => {
    const { plateNo, makeModel, message } = req.body;
    broadcastEvent('voice_announce', {
        plateNo: plateNo || 'Test Vehicle',
        makeModel: makeModel || 'Al Shaheen Auto Hub',
        message: message || 'Please proceed to the Accounts Counter for key collection.'
    });
    res.json({ success: true, message: 'Announcement broadcasted to 60-inch TV' });
});

// Serve Static Assets from /public
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    setHeaders: (res, pathStr) => {
        if (pathStr.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Clean Page Route Rewrites
app.get('/tv', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tv.html'));
});

app.get('/lounge', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tv.html'));
});

app.get('/track', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

app.get('/workshop', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
if (require.main === module) {
    const server = http.createServer(app);

    // Attach WebSocket server for real-time multi-device sync
    if (WebSocket) {
        try {
            wssInstance = new WebSocket.Server({ server, path: '/ws' });
            wssInstance.on('connection', (ws) => {
                ws.isAdminAuthenticated = false;
                ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));

                ws.on('message', (msgStr) => {
                    try {
                        const parsed = JSON.parse(msgStr);
                        if (parsed.type === 'auth' && parsed.token) {
                            const session = verifySignedToken(parsed.token);
                            if (session) {
                                ws.isAdminAuthenticated = true;
                                const cards = readJobCards();
                                ws.send(JSON.stringify({ type: 'snapshot', data: cards, timestamp: Date.now() }));
                            }
                        }
                    } catch (err) {}
                });
            });
        } catch (wsErr) {
            console.warn('WebSocket init warning:', wsErr.message);
        }
    }

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`===================================================================`);
        console.log(`🚗 Al Shaheen Auto Hub - Modern Node.js Enterprise Application`);
        console.log(`===================================================================`);
        console.log(`📡 Workshop Admin Portal: http://localhost:${PORT}/workshop`);
        console.log(`📺 60" Lounge TV Display:  http://localhost:${PORT}/tv`);
        console.log(`📱 Customer Mobile Track:  http://localhost:${PORT}/track`);
        console.log(`⚡ REST API & SSE Live:    http://localhost:${PORT}/api/live-stream`);
        console.log(`⚡ WebSocket Runtime Sync: ws://localhost:${PORT}/ws`);
        console.log(`===================================================================`);
    });
}

module.exports = app;
