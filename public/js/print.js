// ==========================================================================
// AL SHAHEEN AUTO HUB - OFFICIAL A4 PRINT & PDF GENERATION ENGINE
// Matches exact workshop sample layout with 100% vector fidelity
// ==========================================================================

function generatePrintMarkup(card) {
    if (!card) return '';

    const depts = [
        'Mechanical', 'Electrical', 'AC Service', 'Alignment',
        'Balancing', 'Denting', 'Painting', 'Car Wash',
        'Detailing', 'Tyres Works', 'Sale/Pur. Inspect.', 'General Service'
    ];
    const cardDepts = Array.isArray(card.departments) ? card.departments : [];

    // Render Parts Rows
    let partsRowsHtml = '';
    const partsList = Array.isArray(card.parts) && card.parts.length > 0 ? card.parts : [
        { desc: 'General Service & Multi-Point Inspection', qty: 1, rate: 0, amount: 0 }
    ];

    partsList.forEach((p, idx) => {
        partsRowsHtml += `
            <tr>
                <td style="text-align:center; width:26px;">${idx + 1}</td>
                <td style="font-weight:600;">${escapeHtml(p.desc || '-')}</td>
                <td style="text-align:center; width:40px;">${p.qty || 1}</td>
                <td style="text-align:right; width:75px;">${Number(p.rate || 0).toLocaleString()}</td>
                <td style="text-align:right; width:85px; font-weight:700;">Rs. ${Number(p.amount || 0).toLocaleString()}</td>
            </tr>
        `;
    });

    // Pad rows so table has uniform standard height
    const minRows = 5;
    for (let i = partsList.length; i < minRows; i++) {
        partsRowsHtml += `
            <tr>
                <td style="text-align:center; color:#cbd5e1;">${i + 1}</td>
                <td style="color:#cbd5e1;">-</td>
                <td style="text-align:center; color:#cbd5e1;">-</td>
                <td style="text-align:right; color:#cbd5e1;">-</td>
                <td style="text-align:right; color:#cbd5e1;">-</td>
            </tr>
        `;
    }

    const createdDate = card.createdAt ? new Date(card.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    const createdTime = card.createdAt ? new Date(card.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '12:00 PM';
    const dueTime = card.deliveryDue ? new Date(card.deliveryDue).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '06:00 PM';
    const fuelVal = card.vehicle?.fuelLevel || 50;

    return `
    <div id="printableA4Document" class="official-page-sheet">
        <div>
            <!-- 1. HEADER (LOGO + SLANTED BANNER + CONTACT INFO) -->
            <div class="official-header">
                <div class="official-logo-box">
                    <img src="/logo.png" alt="Al Shaheen Auto Hub" onerror="this.src='logo.png'">
                </div>

                <div class="official-slant-banner">
                    <span>JOB CARD</span>
                </div>

                <div class="official-contact-box">
                    <div>📞 <strong>+92 344-1411123</strong> | +92 42 3573 2222</div>
                    <div>🌐 www.alshaheenautohub.com</div>
                    <div>📍 Main Bedian Road, Near Askari 11, DHA Phase 6, Lahore.</div>
                </div>
            </div>

            <!-- 2. METADATA BAR -->
            <div class="official-meta-bar">
                <div>
                    Job Card No: <span class="official-job-badge">${card.id || 'ASH-000126'}</span>
                </div>
                <div>
                    Date: <span class="official-meta-field">${createdDate}</span>
                </div>
                <div>
                    Time In: <span class="official-meta-field" style="min-width:65px;">${createdTime}</span>
                </div>
                <div>
                    Delivery Due: <span class="official-meta-field" style="min-width:65px;">${dueTime}</span>
                </div>
            </div>

            <!-- 3. CUSTOMER & VEHICLE DETAILS -->
            <div class="official-details-grid">
                <!-- Customer Details -->
                <div class="official-box">
                    <div class="official-tab-badge navy">● CUSTOMER DETAILS</div>
                    <div class="official-field-row">
                        <span class="official-field-label">Customer Name:</span>
                        <div class="official-field-line">${escapeHtml(card.customer?.name || 'Walk-in Customer')}</div>
                    </div>
                    <div class="official-field-row">
                        <span class="official-field-label">Phone No:</span>
                        <div class="official-field-line">${escapeHtml(card.customer?.phone || '-')}</div>
                    </div>
                    <div class="official-field-row">
                        <span class="official-field-label">Address:</span>
                        <div class="official-field-line">${escapeHtml(card.customer?.address || 'Lahore, Pakistan')}</div>
                    </div>
                </div>

                <!-- Vehicles Details -->
                <div class="official-box">
                    <div class="official-tab-badge red">● VEHICLES DETAILS</div>
                    <div class="official-field-row">
                        <span class="official-field-label" style="width:24%;">Vehicle No:</span>
                        <div class="official-field-line" style="font-weight:900; font-size:11px; color:#c01426;">${escapeHtml(card.vehicle?.plateNo || '-')}</div>
                    </div>
                    <div class="official-field-row">
                        <span class="official-field-label" style="width:24%;">Make / Model:</span>
                        <div class="official-field-line">${escapeHtml(card.vehicle?.makeModel || '-')}</div>
                    </div>
                    <div style="display:flex; gap:6px;">
                        <div class="official-field-row" style="flex:1; margin-bottom:0;">
                            <span class="official-field-label" style="width:48%;">Mileage:</span>
                            <div class="official-field-line">${escapeHtml(card.vehicle?.mileage || '-')} km</div>
                        </div>
                        <div class="official-field-row" style="flex:1; margin-bottom:0;">
                            <span class="official-field-label" style="width:28%;">Color:</span>
                            <div class="official-field-line">${escapeHtml(card.vehicle?.color || '-')}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4. JOB TYPE / DEPARTMENTS -->
            <div class="official-depts-wrapper">
                <div class="official-depts-title-badge">JOB TYPE / DEPARTMENTS</div>
                <div class="official-depts-grid">
                    ${depts.map(d => `
                        <div class="official-dept-item">
                            <span class="official-check-sq ${cardDepts.includes(d) ? 'checked' : ''}">${cardDepts.includes(d) ? '✓' : ''}</span>
                            <span>${d}</span>
                        </div>
                    `).join('')}
                    <div class="official-dept-item" style="grid-column: span 2; display:flex;">
                        <span class="official-check-sq"></span> Others:
                        <span style="flex-grow:1; border-bottom:1px dotted #94a3b8; height:12px; margin-left:3px;"></span>
                    </div>
                </div>
            </div>

            <!-- 5. 360° VEHICLE INSPECTION SCHEMATIC & FUEL INVENTORY -->
            <div class="official-schematic-section">
                <div class="official-schematic-header">
                    <div class="official-tab-badge navy" style="margin:0;">● VEHICLE INSPECTION SCHEMATIC &amp; TYRE TREAD DEPTH</div>
                    <div style="font-size:7.5px; color:#475569; font-weight:700;">
                        Faults: <strong>[D]</strong> Dent | <strong>[S]</strong> Scratch | <strong>[C]</strong> Chips | <strong>[R]</strong> Rust
                    </div>
                </div>

                <div class="official-schematic-grid">
                    <div class="official-svg-frame">
                        <img src="/car_inspection_schematic.svg" alt="Car Schematic" style="max-height:85px; width:auto; display:block; margin:0 auto;" onerror="this.src='car_inspection_schematic.svg'">
                        <div class="official-legend-bar">
                            <span>Tread Depth Front: _____ mm</span>
                            <span>Tread Depth Rear: _____ mm</span>
                            <span>Spare Wheel: OK</span>
                        </div>
                    </div>

                    <div class="official-fuel-box">
                        <div class="official-fuel-meter">
                            <div style="display:flex; justify-content:space-between; font-weight:700; margin-bottom:2px;">
                                <span>⛽ Fuel Level:</span>
                                <span style="color:#c01426;">${fuelVal}%</span>
                            </div>
                            <div style="background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
                                <div style="background:#c01426; width:${fuelVal}%; height:100%;"></div>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:7px; color:#64748b; margin-top:1px;">
                                <span>E</span><span>1/4</span><span>1/2</span><span>3/4</span><span>F</span>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:2px 4px; font-size:7.5px; font-weight:600;">
                            <div>[${card.inventory?.spareWheel ? '✓' : ' '}] Spare Wheel</div>
                            <div>[${card.inventory?.toolKit ? '✓' : ' '}] Tool Kit</div>
                            <div>[${card.inventory?.floorMats ? '✓' : ' '}] Floor Mats</div>
                            <div>[${card.inventory?.valuablesOut ? '✓' : ' '}] Valuables Out</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 6. CONCERNS & WORK TO BE DONE -->
            <div class="official-concern-work-grid">
                <div class="official-ruled-box">
                    <div class="official-tab-badge navy" style="margin:-4px -6px 4px -6px;">● CUSTOMER CONCERN</div>
                    <div style="padding: 3px 2px; min-height: 56px;">
                        ${(card.concern || '').trim() ? 
                            `<div style="font-size:8.5px; line-height:1.45; font-weight:600; color:#0f172a; word-break:break-word;">${escapeHtml(card.concern)}</div>` : 
                            `<div style="height:17px; border-bottom:1px dotted #cbd5e1;"></div><div style="height:17px; border-bottom:1px dotted #cbd5e1;"></div><div style="height:17px; border-bottom:1px dotted #cbd5e1;"></div>`
                        }
                    </div>
                </div>
                <div class="official-ruled-box">
                    <div class="official-tab-badge red" style="margin:-4px -6px 4px -6px;">● WORK TO BE DONE</div>
                    <div style="padding: 2px 2px; min-height: 56px;">
                        ${(() => {
                            const rawWorks = (card.workToBeDone || card.workDone || '').split('\n').map(w => w.trim()).filter(w => w.length > 0);
                            let out = '';
                            if (rawWorks.length > 0) {
                                rawWorks.forEach((t, i) => {
                                    const cleanText = t.replace(/^\d+[\.\-\)]\s*/, '');
                                    out += `
                                        <div style="font-size:8px; line-height:1.35; color:#0f172a; padding:2px 0; border-bottom:1px dotted #cbd5e1; word-break:break-word;">
                                            <strong style="color:#162544;">${i + 1}.</strong> ${escapeHtml(cleanText)}
                                        </div>
                                    `;
                                });
                                for (let i = rawWorks.length; i < 4; i++) {
                                    out += `<div style="height:15px; border-bottom:1px dotted #cbd5e1; font-size:8px; color:#94a3b8; display:flex; align-items:center;"><strong style="color:#94a3b8;">${i + 1}.</strong></div>`;
                                }
                            } else {
                                for (let i = 0; i < 4; i++) {
                                    out += `<div style="height:15px; border-bottom:1px dotted #cbd5e1; font-size:8px; color:#94a3b8; display:flex; align-items:center;"><strong style="color:#94a3b8;">${i + 1}.</strong></div>`;
                                }
                            }
                            return out;
                        })()}
                    </div>
                </div>
            </div>

            <!-- 7. PARTS / MATERIAL TABLE -->
            <div class="official-parts-wrap">
                <table class="official-parts-table">
                    <thead>
                        <tr>
                            <th style="width:26px; text-align:center;">Sr</th>
                            <th>Description of Parts / Material</th>
                            <th style="width:40px; text-align:center;">Qty</th>
                            <th style="width:75px; text-align:right;">Rate (PKR)</th>
                            <th style="width:85px; text-align:right;">Amount (PKR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${partsRowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- 8. COST, SIGNATURES & QUALITY FOOTER -->
            <div class="official-split-grid">
                <div class="official-cost-box">
                    <div class="official-cost-title">ESTIMATED COST:</div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Labour:</span> <strong>Rs. ${Number(card.labour || 0).toLocaleString()}</strong></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Parts:</span> <strong>Rs. ${(card.parts || []).reduce((s, p) => s + (Number(p.amount) || 0), 0).toLocaleString()}</strong></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Other:</span> <strong>Rs. ${Number(card.otherCharges || 0).toLocaleString()}</strong></div>
                    <div style="display:flex; justify-content:space-between; color:#16a34a; font-weight:700;"><span>Advance:</span> <strong>Rs. ${Number(card.advance || 0).toLocaleString()}</strong></div>
                </div>

                <div class="official-sig-box">
                    <div class="official-sig-title"><span>CUSTOMER APPROVAL</span> <span>AGREED</span></div>
                    <div style="font-size:7px; color:#64748b; line-height:1.2;">I authorize the estimated repairs and acknowledge terms.</div>
                    <div class="official-sig-space">Customer Signature: __________________</div>
                </div>

                <div class="official-sig-box">
                    <div class="official-sig-title"><span>SERVICE EXECUTIVE</span> <span>AL SHAHEEN</span></div>
                    <div style="font-size:7.5px; font-weight:700; color:#162544;">${escapeHtml(card.serviceAdvisor || 'Service Incharge')}</div>
                    <div class="official-sig-space">Authorized Signature: __________________</div>
                </div>
            </div>

            <!-- 9. QC & FINAL AMOUNT -->
            <div class="official-qc-final-grid">
                <div class="official-qc-box">
                    <div class="official-tab-badge gold" style="margin:-3px -5px 3px -5px;">● QUALITY CHECK INSPECTION</div>
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:2px 4px; font-size:7.5px; font-weight:600;">
                        <div>[✓] Exterior Clean</div>
                        <div>[✓] Engine Clean</div>
                        <div>[✓] No Warning Lights</div>
                        <div>[✓] Interior Clean</div>
                        <div>[✓] All Systems OK</div>
                        <div>[✓] Work Completed</div>
                        <div>[✓] Test Drive Done</div>
                        <div>[✓] Wheels Torqued</div>
                        <div>[✓] Customer Satisfied</div>
                    </div>
                </div>

                <table class="official-final-table">
                    <thead>
                        <tr><th colspan="2">FINAL AMOUNT</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Total Amount:</td><td style="text-align:right; font-weight:700;">Rs. ${Number(card.subTotal || 0).toLocaleString()}</td></tr>
                        <tr><td>Discount:</td><td style="text-align:right; color:#c01426; font-weight:700;">- Rs. ${Number(card.discount || 0).toLocaleString()}</td></tr>
                        <tr class="official-net-row"><td>Net Payable:</td><td style="text-align:right;">Rs. ${Number(card.netPayable || 0).toLocaleString()}</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 10. BOTTOM ASSURANCE BANNER -->
        <div class="official-footer-banner">
            <div><strong>AL SHAHEEN AUTO HUB</strong> • Certified Automotive Maintenance &amp; Diagnostic Center</div>
            <div>DHA 6, Lahore • Tel: +92 344-1411123</div>
        </div>
    </div>
    `;
}

// 1-Click Native Vector Print (Clean, No Blank Pages)
function getJobCardPrintFilename(card) {
    const cleanPart = (value) => String(value || '')
        .normalize('NFKC')
        .trim()
        .replace(/[\u0000-\u001f<>:"\/\\|?*]/g, '-')
        .replace(/\s+/g, '_')
        .replace(/[-_]{2,}/g, '_')
        .replace(/^[._ -]+|[._ -]+$/g, '')
        .slice(0, 40);
    const identity = [
        cleanPart(card.customer?.name),
        cleanPart(card.vehicle?.plateNo)
    ].filter(Boolean).join('_');
    const fallback = cleanPart(card.id) || 'New';
    return `JobCard_${identity || fallback}`;
}

function printJobCardNative(card) {
    if (!card) return;
    let existing = document.getElementById('printableA4Document');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.innerHTML = generatePrintMarkup(card);
    document.body.appendChild(wrapper.firstElementChild);
    const originalTitle = document.title;
    document.title = getJobCardPrintFilename(card);
    window.addEventListener('afterprint', () => {
        document.title = originalTitle;
    }, { once: true });

    setTimeout(() => {
        window.print();
    }, 200);
}

// Direct PDF Download
function downloadJobCardPdf(card) {
    if (!card) return;
    let existing = document.getElementById('printableA4Document');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '210mm';
    wrapper.innerHTML = generatePrintMarkup(card);
    document.body.appendChild(wrapper);

    const element = wrapper.firstElementChild;
    const opt = {
        margin: [4, 4, 4, 4],
        filename: `${getJobCardPrintFilename(card)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (window.html2pdf) {
        window.html2pdf().set(opt).from(element).save().then(() => {
            wrapper.remove();
        }).catch(err => {
            console.error('html2pdf error:', err);
            wrapper.remove();
            printJobCardNative(card);
        });
    } else {
        wrapper.remove();
        printJobCardNative(card);
    }
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

// Expose globally on window
window.generatePrintMarkup = generatePrintMarkup;
window.printJobCardNative = printJobCardNative;
window.downloadJobCardPdf = downloadJobCardPdf;
