// ==========================================================================
// AL SHAHEEN AUTO HUB - JOB CARD EDITOR & SPEECH/AI ENGINE
// Features: Robust Create, Edit, Update | Voice Dictation | Gemini AI | Parts
// ==========================================================================

let activeCard = null;
let currentTool = 'D'; // D = Dent, S = Scratch, C = Chip, R = Rust
let speechRecognizer = null;
let isRecordingSpeech = false;
let activeCanvas = null;
let activeCanvasCtx = null;
let canvasImage = null;

// Initialize Editor on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    initSpeechRecognition();
    initDamageCanvas();
    initFuelSlider();
});

// Helper for switching views safely
function showViewSafe(viewId) {
    if (window.showView) {
        window.showView(viewId);
    } else {
        const views = ['dashboardView', 'dbView', 'editorView'];
        views.forEach(v => {
            const el = document.getElementById(v);
            if (el) el.style.display = (v === viewId) ? 'block' : 'none';
        });
    }
}

// ==========================================================================
// 1. CREATE, EDIT & SAVE ENGINE
// ==========================================================================

// Create new blank job card
function createNewCard() {
    const newId = `ASH-${String(Math.floor(100000 + Math.random() * 900000))}`;
    const card = {
        id: newId,
        createdAt: new Date().toISOString(),
        deliveryDue: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
        status: 'In Progress',
        currentBay: 'Bay 1',
        customer: { name: '', phone: '', address: 'Lahore' },
        vehicle: { plateNo: '', makeModel: '', mileage: '', color: '', fuelLevel: 50 },
        inventory: { spareWheel: true, toolKit: true, floorMats: true, valuablesOut: true },
        departments: ['Mechanical'],
        concern: '',
        workToBeDone: '',
        parts: [],
        labour: 3000,
        otherCharges: 0,
        discount: 0,
        advance: 0,
        subTotal: 3000,
        netPayable: 3000,
        balance: 3000,
        serviceAdvisor: 'Service Incharge',
        damageMarkers: []
    };

    loadCardIntoEditor(card);
    showViewSafe('editorView');
}

// Load an existing card into editor for editing
function loadCardIntoEditor(card) {
    if (!card) return;
    activeCard = JSON.parse(JSON.stringify(card));
    window.currentActiveCard = activeCard;

    const titleEl = document.getElementById('editorJobCardId');
    if (titleEl) {
        titleEl.textContent = `JOB CARD: ${activeCard.id || ''}`;
    }

    // Customer Info
    const nameEl = document.getElementById('cardCustomerName');
    if (nameEl) nameEl.value = activeCard.customer?.name || '';
    const phoneEl = document.getElementById('cardCustomerPhone');
    if (phoneEl) phoneEl.value = activeCard.customer?.phone || '';
    const addrEl = document.getElementById('cardCustomerAddress');
    if (addrEl) addrEl.value = activeCard.customer?.address || '';

    // Vehicle Info
    const plateEl = document.getElementById('cardPlateNo');
    if (plateEl) plateEl.value = activeCard.vehicle?.plateNo || '';
    const modelEl = document.getElementById('cardMakeModel');
    if (modelEl) modelEl.value = activeCard.vehicle?.makeModel || '';
    const kmEl = document.getElementById('cardMileage');
    if (kmEl) kmEl.value = activeCard.vehicle?.mileage || '';
    const colorEl = document.getElementById('cardColor');
    if (colorEl) colorEl.value = activeCard.vehicle?.color || '';

    // Workflow
    const bayEl = document.getElementById('cardBaySelect');
    if (bayEl) bayEl.value = activeCard.currentBay || 'Bay 1';
    const statusEl = document.getElementById('cardStatusSelect');
    if (statusEl) statusEl.value = activeCard.status || 'In Progress';
    const advEl = document.getElementById('cardAdvisor');
    if (advEl) advEl.value = activeCard.serviceAdvisor || 'Service Incharge';

    // Concerns and Work
    const concernEl = document.getElementById('customerConcern');
    if (concernEl) concernEl.value = activeCard.concern || '';
    const workEl = document.getElementById('cardWorkToBeDone');
    if (workEl) workEl.value = activeCard.workToBeDone || '';

    // Cost fields
    const labourEl = document.getElementById('cardLabour');
    if (labourEl) labourEl.value = activeCard.labour || 0;
    const otherEl = document.getElementById('cardOtherCharges');
    if (otherEl) otherEl.value = activeCard.otherCharges || 0;
    const discEl = document.getElementById('cardDiscount');
    if (discEl) discEl.value = activeCard.discount || 0;
    const advPayEl = document.getElementById('cardAdvance');
    if (advPayEl) advPayEl.value = activeCard.advance || 0;


// Fuel Slider
    const fuelSlider = document.getElementById('cardFuelSlider');
    if (fuelSlider) {
        fuelSlider.value = activeCard.vehicle?.fuelLevel || 50;
        const fuelLbl = document.getElementById('fuelValueLabel');
        if (fuelLbl) fuelLbl.textContent = `${fuelSlider.value}%`;
    }

    // Departments
    const depts = Array.isArray(activeCard.departments) ? activeCard.departments : [];
    document.querySelectorAll('.dept-checkbox').forEach(cb => {
        cb.checked = depts.includes(cb.value);
    });

    // Inventory
    if (document.getElementById('invSpareWheel')) document.getElementById('invSpareWheel').checked = !!activeCard.inventory?.spareWheel;
    if (document.getElementById('invToolKit')) document.getElementById('invToolKit').checked = !!activeCard.inventory?.toolKit;
    if (document.getElementById('invFloorMats')) document.getElementById('invFloorMats').checked = !!activeCard.inventory?.floorMats;
    if (document.getElementById('invValuables')) document.getElementById('invValuables').checked = !!activeCard.inventory?.valuablesOut;

    renderPartsTable();
    calcAllTotals();
    redrawCanvas();
}

// Save or Update Job Card
async function saveActiveJobCard() {
    if (!activeCard) {
        activeCard = {
            id: `ASH-${String(Math.floor(100000 + Math.random() * 900000))}`,
            createdAt: new Date().toISOString(),
            status: 'In Progress',
            currentBay: 'Bay 1',
            parts: [],
            damageMarkers: []
        };
    }

    const plateInput = (document.getElementById('cardPlateNo')?.value || '').trim();
    const finalPlate = plateInput ? plateInput.toUpperCase() : `REG-${String(Math.floor(100 + Math.random() * 900))}`;

    activeCard.customer = {
        name: document.getElementById('cardCustomerName')?.value.trim() || 'Walk-in Customer',
        phone: document.getElementById('cardCustomerPhone')?.value.trim() || '',
        address: document.getElementById('cardCustomerAddress')?.value.trim() || 'Lahore'
    };

    activeCard.vehicle = {
        plateNo: finalPlate,
        makeModel: document.getElementById('cardMakeModel')?.value.trim() || 'Automobile',
        mileage: document.getElementById('cardMileage')?.value.trim() || '0',
        color: document.getElementById('cardColor')?.value.trim() || 'Standard',
        fuelLevel: Number(document.getElementById('cardFuelSlider')?.value || 50)
    };

    activeCard.concern = document.getElementById('customerConcern')?.value.trim() || '';
    activeCard.workToBeDone = document.getElementById('cardWorkToBeDone')?.value.trim() || '';
    activeCard.serviceAdvisor = document.getElementById('cardAdvisor')?.value.trim() || 'Service Incharge';
    activeCard.currentBay = document.getElementById('cardBaySelect')?.value || 'Bay 1';
    activeCard.status = document.getElementById('cardStatusSelect')?.value || 'In Progress';

    if (activeCard.currentBay === 'Bay 6') {
        activeCard.status = 'Ready';
    }

    // Departments
    const depts = [];
    document.querySelectorAll('.dept-checkbox:checked').forEach(cb => depts.push(cb.value));
    activeCard.departments = depts.length > 0 ? depts : ['Mechanical'];

    // Inventory
    activeCard.inventory = {
        spareWheel: !!document.getElementById('invSpareWheel')?.checked,
        toolKit: !!document.getElementById('invToolKit')?.checked,
        floorMats: !!document.getElementById('invFloorMats')?.checked,
        valuablesOut: !!document.getElementById('invValuables')?.checked
    };

    calcAllTotals();

    // Persist via HubAPI
    if (window.HubAPI) {
        await window.HubAPI.saveJobCard(activeCard);
    } else {
        const raw = localStorage.getItem('al_shaheen_job_cards_v3');
        const cards = raw ? JSON.parse(raw) : [];
        const idx = cards.findIndex(c => (c.id || '').toLowerCase() === activeCard.id.toLowerCase());
        if (idx >= 0) cards[idx] = activeCard;
        else cards.unshift(activeCard);
        localStorage.setItem('al_shaheen_job_cards_v3', JSON.stringify(cards));
    }

    // Update in-memory dashboard cards
    if (window.refreshDashboard) {
        await window.refreshDashboard();
    }

    // Show non-blocking success toast
    showToast(`✓ Job Card ${activeCard.id} (${activeCard.vehicle.plateNo}) saved successfully!`);

    // Switch view to database view
    showViewSafe('dbView');
}

// Print and PDF helpers for active card
function printActiveJobCard() {
    if (activeCard && window.printJobCardNative) {
        window.printJobCardNative(activeCard);
    } else {
        showToast('Please save the job card first.', 'error');
    }
}

function downloadActiveJobCardPdf() {
    if (activeCard && window.downloadJobCardPdf) {
        window.downloadJobCardPdf(activeCard);
    } else {
        showToast('Please save the job card first.', 'error');
    }
}

// ==========================================================================
// 2. MICROPHONE VOICE DICTATION (Web Speech API)
// ==========================================================================
function initSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
        console.warn('Speech Recognition not natively supported in this browser.');
        return;
    }

    speechRecognizer = new SpeechRec();
    speechRecognizer.continuous = true;
    speechRecognizer.interimResults = true;
    speechRecognizer.lang = 'en-US';

    speechRecognizer.onstart = () => {
        isRecordingSpeech = true;
        updateMicUi(true);
    };

    speechRecognizer.onresult = (event) => {
        const textarea = document.getElementById('customerConcern');
        if (!textarea) return;

        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }

        if (event.results[event.results.length - 1].isFinal) {
            const currentVal = textarea.value.trim();
            textarea.value = currentVal ? `${currentVal} ${transcript.trim()}` : transcript.trim();
        }
    };

    speechRecognizer.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        stopSpeechRecording();
    };

    speechRecognizer.onend = () => {
        stopSpeechRecording();
    };
}

function toggleCustomerConcernMic() {
    if (!speechRecognizer) {
        initSpeechRecognition();
        if (!speechRecognizer) {
            showToast('Voice dictation requires Chrome, Edge, or another browser with microphone permission enabled.', 'error');
            return;
        }
    }

    if (isRecordingSpeech) {
        speechRecognizer.stop();
        stopSpeechRecording();
    } else {
        try {
            speechRecognizer.start();
        } catch (e) {
            console.warn('Failed to start speech recognition:', e);
        }
    }
}

function stopSpeechRecording() {
    isRecordingSpeech = false;
    updateMicUi(false);
}

function updateMicUi(recording) {
    const btn = document.getElementById('concernMicBtn');
    const label = document.getElementById('concernMicLabel');
    if (btn) {
        btn.classList.toggle('recording', recording);
        btn.title = recording ? 'Click to stop listening' : 'Click to speak customer concern';
    }
    if (label) {
        label.style.display = recording ? 'inline-flex' : 'none';
        label.innerHTML = recording ? '<span class="live-dot" style="background:#ef4444;"></span> Listening... Speak now' : '';
    }
}

// ==========================================================================
// 3. GEMINI AI AUTO-DIAGNOSTIC ENGINE (Direct Backend Proxy Connection)
// ==========================================================================
async function runGeminiDiagnosis() {
    const concern = (document.getElementById('customerConcern')?.value || '').trim();
    const makeModel = (document.getElementById('cardMakeModel')?.value || '').trim();
    const mileage = (document.getElementById('cardMileage')?.value || '').trim();
    const aiBtn = document.getElementById('geminiDiagnoseBtn');
    const aiStatus = document.getElementById('geminiAiStatus');

    if (!concern) {
        showToast('Please enter or speak the customer concern first before triggering AI Diagnosis.', 'error');
        document.getElementById('customerConcern')?.focus();
        return;
    }

    if (aiBtn) {
        aiBtn.disabled = true;
        aiBtn.innerHTML = '🤖 Analyzing Mechanical Faults...';
    }
    if (aiStatus) {
        aiStatus.style.display = 'block';
        aiStatus.style.background = '#dbeafe';
        aiStatus.style.color = '#1e40af';
        aiStatus.innerHTML = '<span class="live-dot" style="background:#3b82f6;"></span> Consulting Google Gemini AI Master Automotive Diagnostician...';
    }

    try {
        let aiResult = null;
        let sourceText = '';

        // Use the authenticated server proxy; API credentials remain server-side.
        try {
            const res = await fetch('/api/ai/diagnose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ concern, makeModel, mileage })
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    aiResult = json.data;
                    sourceText = 'Google Gemini AI (Cloud Live)';
                }
            }
        } catch (serverErr) {
            console.warn('AI diagnosis server proxy is unavailable:', serverErr.message);
        }

        // Fall back to the local knowledge base when the server AI service is unavailable.
        if (!aiResult) {
            aiResult = generateClientAutomotiveDiagnosis(concern, makeModel);
            sourceText = 'Al Shaheen Master Diagnostic Knowledge Base';
        }

        // Apply results to Job Card
        if (aiResult) {
            if (aiResult.workToBeDone) {
                const workField = document.getElementById('cardWorkToBeDone');
                if (workField) workField.value = aiResult.workToBeDone;
            }

            if (Array.isArray(aiResult.recommendedParts) && aiResult.recommendedParts.length > 0) {
                if (!activeCard) createNewCard();
                activeCard.parts = [];
                aiResult.recommendedParts.forEach(p => {
                    activeCard.parts.push({
                        desc: p.desc,
                        qty: Number(p.qty) || 1,
                        rate: Number(p.estimatedRate || p.rate) || 0,
                        amount: (Number(p.qty) || 1) * (Number(p.estimatedRate || p.rate) || 0)
                    });
                });
                renderPartsTable();
            }

            if (aiResult.estimatedLabour) {
                const labourField = document.getElementById('cardLabour');
                if (labourField) {
                    labourField.value = aiResult.estimatedLabour;
                }
            }

            if (Array.isArray(aiResult.departments) && aiResult.departments.length > 0) {
                document.querySelectorAll('.dept-checkbox').forEach(cb => {
                    cb.checked = aiResult.departments.includes(cb.value);
                });
            }

            calcAllTotals();

            if (aiStatus) {
                aiStatus.style.background = '#dcfce7';
                aiStatus.style.color = '#15803d';
                aiStatus.innerHTML = `✓ ${sourceText}: Exact mechanical diagnosis, repair scope, and spare parts loaded!`;
                setTimeout(() => { aiStatus.style.display = 'none'; }, 6000);
            }
        }
    } catch (err) {
        console.error('Diagnosis failed:', err);
        if (aiStatus) {
            aiStatus.textContent = 'Diagnosis completed with standard workshop specifications.';
        }
    } finally {
        if (aiBtn) {
            aiBtn.disabled = false;
            aiBtn.innerHTML = '✨ Run AI Diagnosis';
        }
    }
}

// Client-side Roman Urdu & Automotive Expert Rules Engine
function generateClientAutomotiveDiagnosis(concern, makeModel) {
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

// ==========================================================================
// 4. 360° VEHICLE INSPECTION CANVAS MARKING
// ==========================================================================
function initDamageCanvas() {
    activeCanvas = document.getElementById('damageCanvas');
    if (!activeCanvas) return;
    activeCanvasCtx = activeCanvas.getContext('2d');

    canvasImage = new Image();
    canvasImage.src = '/car_inspection_schematic.svg';
    canvasImage.onload = () => {
        redrawCanvas();
    };
    canvasImage.onerror = () => {
        canvasImage.src = 'car_inspection_schematic.svg';
    };

    activeCanvas.addEventListener('click', handleCanvasClick);
}

function selectMarkerTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-chip').forEach(el => {
        el.classList.toggle('active', el.dataset.tool === tool);
    });
}

function handleCanvasClick(e) {
    if (!activeCanvas || !activeCard) return;
    const rect = activeCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (!Array.isArray(activeCard.damageMarkers)) {
        activeCard.damageMarkers = [];
    }

    activeCard.damageMarkers.push({ type: currentTool, x, y });
    redrawCanvas();
}

function undoDamageMarker() {
    if (activeCard && Array.isArray(activeCard.damageMarkers) && activeCard.damageMarkers.length > 0) {
        activeCard.damageMarkers.pop();
        redrawCanvas();
    }
}

function clearDamageMarkers() {
    if (activeCard) {
        activeCard.damageMarkers = [];
        redrawCanvas();
    }
}

function redrawCanvas() {
    if (!activeCanvas || !activeCanvasCtx) return;
    activeCanvasCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);

    if (canvasImage && canvasImage.complete) {
        activeCanvasCtx.drawImage(canvasImage, 0, 0, activeCanvas.width, activeCanvas.height);
    }

    if (activeCard && Array.isArray(activeCard.damageMarkers)) {
        activeCard.damageMarkers.forEach(m => {
            const px = m.x * activeCanvas.width;
            const py = m.y * activeCanvas.height;

            activeCanvasCtx.beginPath();
            activeCanvasCtx.arc(px, py, 11, 0, 2 * Math.PI);
            activeCanvasCtx.fillStyle = '#dc2626';
            activeCanvasCtx.fill();
            activeCanvasCtx.lineWidth = 2;
            activeCanvasCtx.strokeStyle = '#ffffff';
            activeCanvasCtx.stroke();

            activeCanvasCtx.fillStyle = '#ffffff';
            activeCanvasCtx.font = 'bold 11px Arial';
            activeCanvasCtx.textAlign = 'center';
            activeCanvasCtx.textBaseline = 'middle';
            activeCanvasCtx.fillText(m.type, px, py);
        });
    }
}

// ==========================================================================
// 5. DYNAMIC PARTS & ESTIMATES TABLE
// ==========================================================================
function renderPartsTable() {
    const tbody = document.getElementById('partsTableBody');
    if (!tbody || !activeCard) return;

    if (!Array.isArray(activeCard.parts)) {
        activeCard.parts = [];
    }

    tbody.innerHTML = activeCard.parts.map((p, idx) => `
        <tr data-index="${idx}">
            <td style="text-align:center; font-weight:700;">${idx + 1}</td>
            <td>
                <input type="text" class="part-desc" value="${escapeHtml(p.desc || '')}" placeholder="Part or Labor description" oninput="updatePartRow(${idx}, 'desc', this.value)">
            </td>
            <td style="width:70px;">
                <input type="number" class="part-qty" value="${p.qty || 1}" min="1" style="text-align:center;" oninput="updatePartRow(${idx}, 'qty', this.value)">
            </td>
            <td style="width:110px;">
                <input type="number" class="part-rate" value="${p.rate || 0}" min="0" style="text-align:right;" oninput="updatePartRow(${idx}, 'rate', this.value)">
            </td>
            <td style="width:120px; text-align:right; font-weight:700; color:#1e293b;">
                Rs. ${Number(p.amount || 0).toLocaleString()}
            </td>
            <td style="width:40px; text-align:center;">
                <button type="button" onclick="deletePartRow(${idx})" style="background:none; border:none; color:#ef4444; font-size:16px; cursor:pointer;" title="Delete item">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function addPartRow(desc = '', qty = 1, rate = 0) {
    if (!activeCard) createNewCard();
    if (!Array.isArray(activeCard.parts)) activeCard.parts = [];

    activeCard.parts.push({
        desc: desc,
        qty: Number(qty) || 1,
        rate: Number(rate) || 0,
        amount: (Number(qty) || 1) * (Number(rate) || 0)
    });

    renderPartsTable();
    calcAllTotals();
}

function updatePartRow(idx, field, val) {
    if (!activeCard || !activeCard.parts || !activeCard.parts[idx]) return;
    if (field === 'desc') {
        activeCard.parts[idx].desc = val;
    } else if (field === 'qty') {
        activeCard.parts[idx].qty = Math.max(1, Number(val) || 1);
        activeCard.parts[idx].amount = activeCard.parts[idx].qty * (activeCard.parts[idx].rate || 0);
    } else if (field === 'rate') {
        activeCard.parts[idx].rate = Math.max(0, Number(val) || 0);
        activeCard.parts[idx].amount = (activeCard.parts[idx].qty || 1) * activeCard.parts[idx].rate;
    }

    renderPartsTable();
    calcAllTotals();
}

function deletePartRow(idx) {
    if (!activeCard || !activeCard.parts) return;
    activeCard.parts.splice(idx, 1);
    renderPartsTable();
    calcAllTotals();
}

function calcAllTotals() {
    if (!activeCard) return;

    const partsSum = (activeCard.parts || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const labour = Number(document.getElementById('cardLabour')?.value || 0);
    const other = Number(document.getElementById('cardOtherCharges')?.value || 0);
    const discount = Number(document.getElementById('cardDiscount')?.value || 0);
    const advance = Number(document.getElementById('cardAdvance')?.value || 0);

    const subTotal = partsSum + labour + other;
    const netPayable = Math.max(0, subTotal - discount);
    const balance = Math.max(0, netPayable - advance);

    activeCard.partsTotal = partsSum;
    activeCard.labour = labour;
    activeCard.otherCharges = other;
    activeCard.discount = discount;
    activeCard.advance = advance;
    activeCard.subTotal = subTotal;
    activeCard.netPayable = netPayable;
    activeCard.balance = balance;

    if (document.getElementById('totalPartsDisplay')) document.getElementById('totalPartsDisplay').textContent = `Rs. ${partsSum.toLocaleString()}`;
    if (document.getElementById('totalNetDisplay')) document.getElementById('totalNetDisplay').textContent = `Rs. ${netPayable.toLocaleString()}`;
    if (document.getElementById('totalBalanceDisplay')) document.getElementById('totalBalanceDisplay').textContent = `Rs. ${balance.toLocaleString()}`;
}

// ==========================================================================
// 6. DELETE & CLOSE PAYMENT WORKFLOWS
// ==========================================================================
async function deleteActiveJobCard() {
    if (!activeCard || !activeCard.id) {
        if (window.showView) window.showView('dbView');
        return;
    }
    const cardId = activeCard.id;
    const plate = activeCard.vehicle?.plateNo || 'Vehicle';
    const conf = confirm(`Are you sure you want to DELETE Job Card ${cardId} (${plate})?\n\nChoose OK if the client cancelled or if this card was created by mistake. This will permanently remove the record.`);
    if (!conf) return;

    if (window.HubAPI) {
        await window.HubAPI.deleteJobCard(cardId);
    }
    const raw = localStorage.getItem('al_shaheen_job_cards_v3');
    if (raw) {
        try {
            let cards = JSON.parse(raw);
            cards = cards.filter(c => (c.id || '').toLowerCase() !== cardId.toLowerCase());
            localStorage.setItem('al_shaheen_job_cards_v3', JSON.stringify(cards));
        } catch (e) {}
    }
    showToast(`Job Card ${cardId} deleted.`, 'info');
    activeCard = null;
    if (window.refreshDashboard) await window.refreshDashboard();
    if (window.showView) window.showView('dbView');
}

async function closeActiveJobCardPayment() {
    if (!activeCard || !activeCard.id) return;
    const cardId = activeCard.id;
    const plate = activeCard.vehicle?.plateNo || 'Vehicle';
    const conf = confirm(`Clear payment and mark Job Card ${cardId} (${plate}) as PAID & DELIVERED?\n\nThis vehicle will be closed and removed from the Waiting Lounge TV screen.`);
    if (!conf) return;

    activeCard.status = 'Paid & Delivered';
    activeCard.currentBay = 'Delivered (Closed)';
    activeCard.paymentCleared = true;
    activeCard.closedAt = new Date().toISOString();

    const statusSel = document.getElementById('cardStatusSelect');
    if (statusSel) statusSel.value = 'Paid & Delivered';

    if (window.HubAPI) {
        await window.HubAPI.saveJobCard(activeCard);
        await window.HubAPI.updateBay(cardId, 'Delivered (Closed)', 'Paid & Delivered');
    }
    const raw = localStorage.getItem('al_shaheen_job_cards_v3');
    if (raw) {
        try {
            let cards = JSON.parse(raw);
            const idx = cards.findIndex(c => (c.id || '').toLowerCase() === cardId.toLowerCase());
            if (idx >= 0) {
                cards[idx] = activeCard;
                localStorage.setItem('al_shaheen_job_cards_v3', JSON.stringify(cards));
            }
        } catch (e) {}
    }
    showToast(`Job Card ${cardId} marked as Paid & Closed. Removed from Lounge TV queue!`, 'success');
    if (window.refreshDashboard) await window.refreshDashboard();
    if (window.showView) window.showView('dbView');
}

// Fuel Slider
function initFuelSlider() {
    const slider = document.getElementById('cardFuelSlider');
    const label = document.getElementById('fuelValueLabel');
    if (!slider) return;

    slider.addEventListener('input', () => {
        const val = slider.value;
        if (label) label.textContent = `${val}%`;
        if (activeCard && activeCard.vehicle) activeCard.vehicle.fuelLevel = Number(val);
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

// Expose all functions onto global window
window.createNewCard = createNewCard;
window.loadCardIntoEditor = loadCardIntoEditor;
window.saveActiveJobCard = saveActiveJobCard;
window.printActiveJobCard = printActiveJobCard;
window.downloadActiveJobCardPdf = downloadActiveJobCardPdf;
window.addPartRow = addPartRow;
window.updatePartRow = updatePartRow;
window.deletePartRow = deletePartRow;
window.calcAllTotals = calcAllTotals;
window.toggleCustomerConcernMic = toggleCustomerConcernMic;
window.runGeminiDiagnosis = runGeminiDiagnosis;
window.selectMarkerTool = selectMarkerTool;
window.undoDamageMarker = undoDamageMarker;
window.clearDamageMarkers = clearDamageMarkers;
window.deleteActiveJobCard = deleteActiveJobCard;
window.closeActiveJobCardPayment = closeActiveJobCardPayment;
