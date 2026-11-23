import { GoogleGenAI } from '@google/genai';
import { AIDiagnosisResult } from '@/types';
import { formatNumberedPoints } from '@/lib/diagnosisFormatting';
import { detectDiagnosisLanguage, DiagnosisLanguage } from '@/lib/diagnosisLanguage';

const FREE_DIAGNOSTIC_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-4-hydrogen',
];

const DIAGNOSIS_TIMEOUT_MS = 40_000;

export const DIAGNOSTIC_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    response_language: {
      type: 'string',
      enum: ['roman_urdu', 'english'],
      description: 'The detected language of the customer concern.',
    },
    roman_urdu_explanation: {
      type: 'string',
      description: 'A concise numbered list in natural Roman Urdu, one point per reported issue. Use 1-2 short sentences per point to state the issue, likely cause, and recommended check or repair.',
    },
    plain_english_explanation: {
      type: 'string',
      description: 'A concise numbered list in clear, non-technical English, one point per reported issue. Use 1-2 short sentences per point to state the issue, likely cause, and recommended check or repair.',
    },
    mechanical_root_cause: {
      type: 'string',
      description: 'Technical engineering diagnosis for the master technician.',
    },
    recommended_departments: {
      type: 'array',
      items: { type: 'string' },
      description: 'Applicable workshop departments (e.g. Mechanical, Electrical, AC Service, Suspension, Brakes, Alignment, Balancing, Denting, Painting, Car Wash, Detailing, Tyres Works, Inspection, General Service)',
    },
    work_to_be_done: {
      type: 'string',
      description: 'Provide 3 to 5 concise, numbered repair steps, each on its own line. Include only inspections and repairs relevant to the reported symptoms.',
    },
    suggested_parts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sku: { type: 'string' },
          description: { type: 'string' },
          qty: { type: 'number' },
          estimated_rate_pkr: { type: 'number' },
          classification: { type: 'string', enum: ['OEM Parts', 'Consumables', 'Aftermarket'] },
        },
        required: ['description', 'qty', 'estimated_rate_pkr'],
      },
      description: 'Required spare parts and consumables with realistic Pakistani Rupee (PKR) pricing for Lahore market.',
    },
  },
  required: [
    'response_language',
    'roman_urdu_explanation',
    'plain_english_explanation',
    'mechanical_root_cause',
    'recommended_departments',
    'work_to_be_done',
    'suggested_parts',
  ],
};

export const SYSTEM_INSTRUCTION = `You are the Chief Diagnostic Mechanical Specialist and Master Service Engineer at Al Shaheen Auto Hub, located on Main Bedian Road, near Askari 11, DHA Phase 6, Lahore, Pakistan.
You specialize in Japanese (Toyota, Honda, Suzuki, Nissan), European (Audi, BMW, Mercedes-Benz, Porsche), and modern Chinese (Haval, Changan, MG, Chery, BYD) vehicles prevalent in Pakistan.
The workshop advisor and customer communicate primarily in Urdu and Roman Urdu.

CRITICAL INSTRUCTIONS:
1. Write "roman_urdu_explanation" and "plain_english_explanation" as concise numbered lists, one point per reported issue, with a maximum of five points. Keep each point to 1-2 short sentences stating the issue, likely cause, and recommended check or repair. Use natural, polite Roman Urdu for the Roman Urdu field and simple English for the English field. Put each point on its own line. Do not invent extra issues, repeat details, or add lengthy risk explanations.

2. Set "response_language" to match the customer's concern: use "roman_urdu" for Roman Urdu or Hinglish, and "english" for English. Write "work_to_be_done" and "mechanical_root_cause" only in that selected language. For Roman Urdu or Hinglish, use natural Latin-script Urdu/Hinglish and retain familiar English automotive terms where useful. Do not make the repair steps bilingual. Provide 3 to 5 concise, numbered, actionable repair steps, each on its own line, based only on the reported symptoms.

3. Select all applicable workshop departments from: Mechanical, Electrical, AC Service, Suspension, Brakes, Alignment, Balancing, Denting, Painting, Car Wash, Detailing, Tyres Works, Inspection, General Service.

4. Itemize necessary spare parts, replacement bushes, fluids, or assemblies with realistic market rates in Pakistani Rupees (PKR) current to Lahore auto markets (Montgomery Road / Bilal Gunj / Authorized OEM dealers).

5. Output ONLY valid JSON adhering strictly to the provided JSON schema.`;

export async function runAIDiagnosis(params: {
  make_model: string;
  variant?: string;
  mileage_km?: number;
  customer_concern: string;
  apiKeyOverride?: string;
}): Promise<AIDiagnosisResult> {
  const apiKey = params.apiKeyOverride || process.env.GEMINI_API_KEY || '';
  const responseLanguage = detectDiagnosisLanguage(params.customer_concern);

  if (apiKey) {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 12_000,
        retryOptions: { attempts: 1 },
      },
    });
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), DIAGNOSIS_TIMEOUT_MS);

    try {
      for (const model of FREE_DIAGNOSTIC_MODELS) {
        if (abortController.signal.aborted) break;

        const prompt = `Vehicle Make & Model: ${params.make_model || 'Unknown Vehicle'}
Variant / Trim: ${params.variant || 'Standard'}
Odometer Mileage: ${params.mileage_km || 0} KM
Customer Reported Fault / Concern (Urdu / Roman Urdu / English):
"${params.customer_concern}"

Detected response language: ${responseLanguage === 'roman_urdu' ? 'Roman Urdu/Hinglish' : 'English'}.
Set "response_language" to "${responseLanguage}". Write "work_to_be_done" and "mechanical_root_cause" only in that language. Keep "roman_urdu_explanation" in Roman Urdu and "plain_english_explanation" in English so the advisor can switch explanation languages. Keep repair steps concise, numbered, and directly tied to the reported symptoms. Do not add unrelated work, unsupported assumptions, or long explanations. Recommend relevant departments and estimate only necessary parts and consumables in PKR.`;

        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              abortSignal: abortController.signal,
              systemInstruction: SYSTEM_INSTRUCTION,
              responseMimeType: 'application/json',
              responseSchema: DIAGNOSTIC_RESPONSE_SCHEMA as any,
              temperature: 0.2,
              maxOutputTokens: 4096,
            },
          });

          let responseText = response.text?.trim() || '';
          if (responseText) {
            if (responseText.startsWith('```')) {
              responseText = responseText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            const parsed = JSON.parse(responseText) as AIDiagnosisResult;
            console.log(`[Gemini Diagnosis Success with ${model}]`);
            return formatDiagnosisSteps(parsed, responseLanguage);
          }
          console.warn(`Gemini diagnostic returned an empty response with model ${model}`);
        } catch (err: any) {
          if (!abortController.signal.aborted) {
            console.warn(`Gemini diagnostic call error with model ${model}:`, err?.message || err);
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  // Domain-smart realistic fallback if all models or network fail
  return formatDiagnosisSteps(generateDomainFallbackDiagnosis(params, responseLanguage), responseLanguage);
}

function formatDiagnosisSteps(
  diagnosis: AIDiagnosisResult,
  responseLanguage: DiagnosisLanguage
): AIDiagnosisResult {
  return {
    ...diagnosis,
    response_language: responseLanguage,
    roman_urdu_explanation: formatNumberedPoints(diagnosis.roman_urdu_explanation || ''),
    plain_english_explanation: formatNumberedPoints(diagnosis.plain_english_explanation || ''),
    work_to_be_done: formatNumberedPoints(diagnosis.work_to_be_done || ''),
  };
}

function generateDomainFallbackDiagnosis(params: {
  make_model: string;
  variant?: string;
  mileage_km?: number;
  customer_concern: string;
}, responseLanguage: DiagnosisLanguage): AIDiagnosisResult {
  const concern = (params.customer_concern || '').toLowerCase();
  const vehicle = params.make_model || 'Vehicle';

  if (concern.includes('gear') || concern.includes('smoke') || concern.includes('white') || concern.includes('hop') || concern.includes('bubble') || concern.includes('jump')) {
    return {
      response_language: responseLanguage,
      roman_urdu_explanation: `Aap ki ${vehicle} mein 3 bunyadi maslay paish aa rahay hain jin ki mukammal tafseel darj zail hai:

1. Transmission / 3rd Gear Phansne ka Masla:
• Wajah: Gearbox ke andar 3rd gear ka synchronizer brass ring ghis chuka hai ya clutch hydraulic system ka pressure drop ho raha hai jis se clutch puri tarah disengage nahi hota aur gear phans jata hai.
• Nuqsaan: Agar is par gari chalate rahen tu gearbox ke internal teeth toot saktay hain aur pura gearbox change karna par sakta hai.
• Hal: Gearbox dismantle kar ke synchronizer hub, sleeve aur clutch pressure plate ki checking ki jaye gi.

2. Exhaust se Safaid Dhuwan (White Smoke):
• Wajah: Engine ke combustion chamber mein radiator ka coolant (pani) dakhil ho raha hai, jo aam tor par cylinder head gasket blow hone ya engine block ki minor warping ki wajah se hota hai.
• Nuqsaan: Coolant engine oil mein mix ho kar engine ke bearings ko seize kar sakta hai jis se engine band ho sakta hai.
• Hal: Cylinder head pressure test hoga, head gasket tabdeel ki jaye gi aur cooling system flush kiya jaye ga.

3. Gari ka Chalte Waqt Uchhalna / Bubbling Sensation:
• Wajah: Tyre ke andar internal steel wire tootne se tyre phool gaya hai (tread bubble) ya alloy rim terha/bend ho chuka hai.
• Nuqsaan: High speed par yeh tyre burst (phat) sakta hai jo ke intehai khatarnak hai.
• Hal: Tyre ko computerized wheel balancer par check kar ke out-of-shape tyre replace kiya jaye ga aur rim ki straightening ki jaye gi.`,

      plain_english_explanation: `Detailed 3-point diagnostic evaluation for your ${vehicle}:

1. Manual/Automatic Transmission 3rd Gear Engagement Failure:
Worn 3rd gear synchronizer cone ring or clutch master/slave hydraulic pressure loss preventing clean dog-teeth engagement. Requires gearbox removal, synchronizer hub overhaul, and clutch hydraulics bleed.

2. Exhaust White Smoke (Coolant Ingestion):
Coolant entering cylinders via blown cylinder head gasket or warped cylinder head deck surface. Requires head removal, crack inspection, deck resurfacing, and new multi-layer steel (MLS) head gasket.

3. Vertical Hopping / Tyre Tread Separation:
Broken internal radial tyre steel belt causing localized tread deformation ("tyre bubble") or bent alloy wheel rim. Requires immediate tyre replacement to avoid catastrophic blowout.`,

      mechanical_root_cause: responseLanguage === 'roman_urdu'
        ? 'Gearbox synchronizer ya clutch system ka masla, engine mein coolant leak, ya tyre/wheel damage ka imkaan hai. Har wajah ko inspection ke baad confirm karein.'
        : 'Combination of worn 3rd gear brass synchronizer balk ring, compromised multi-layer steel cylinder head gasket permitting coolant cross-contamination, and structural tyre carcass tread delamination.',
      recommended_departments: ['Mechanical', 'Tyres Works', 'Alignment', 'Inspection'],
      work_to_be_done: responseLanguage === 'roman_urdu'
        ? `1. Cooling system ka pressure test karke coolant leak ki tasdeeq karein.\n2. Gearbox aur clutch inspect karke gear shifting ke maslay ki wajah check karein.\n3. Tyres aur wheels ko damage, bulge, aur balance ke liye inspect karein.\n4. Zaroori repair ke baad test drive karke tamam reported issues dobara check karein.`
        : `1. Hoist vehicle on Bay 3 and perform engine cooling system pressure leak-down test (1.2 Bar) to verify head gasket breach.\n2. Dismount manual/automatic transmission assembly and inspect 3rd gear synchronizer ring and clutch fork.\n3. Remove cylinder head, inspect for micro-cracks, and measure surface warpage with straightedge gauge.\n4. Dismount all 4 wheels and run on computerized Hunter wheel balancer to pinpoint tyre tread bubble.`,
      suggested_parts: [
        { sku: 'ENG-GST-HEAD', description: 'OEM Multi-Layer Steel (MLS) Cylinder Head Gasket', qty: 1, estimated_rate_pkr: 14500, classification: 'OEM Parts' },
        { sku: 'TRN-SYNC-3RD', description: 'Transmission 3rd Gear Synchronizer Ring & Hub Set', qty: 1, estimated_rate_pkr: 12500, classification: 'OEM Parts' },
        { sku: 'TYRE-REP-FR', description: 'Radial Tubeless Tyre (Matching OEM Size & Speed Rating)', qty: 1, estimated_rate_pkr: 24000, classification: 'OEM Parts' },
        { sku: 'CLT-FLUID-DOT4', description: 'DOT 4 Brake & Clutch Hydraulic Fluid Flushing Pack', qty: 1, estimated_rate_pkr: 2200, classification: 'Consumables' },
        { sku: 'ENG-COOL-LLC', description: 'Toyota / Denso Super Long Life Coolant (Premixed 4L)', qty: 1, estimated_rate_pkr: 5500, classification: 'Consumables' },
      ],
    };
  }

  if (concern.includes('ac') || concern.includes('cooling') || concern.includes('thanda') || concern.includes('gas')) {
    return {
      response_language: responseLanguage,
      roman_urdu_explanation: `Aap ki ${vehicle} ke AC system ka tafseeli tajzia:

1. AC Cooling na hone ka Masla:
• Wajah: System ke andar R134a gas ka pressure kam ho gaya hai jo ke condenser ya cooling coil (evaporator) ke andar bareek leak ki wajah se hota hai. Is ke ilawa cabin pollen filter block hone se hawa ka flow kamzor hai.
• Nuqsaan: Gas kam hone par AC compressor dry chalta hai jis se compressor ke internal pistons seize ho saktay hain aur bara kharcha ban sakta hai.
• Hal: Digital manifold gauge se pressure leak test hoga, leak spot repair kar ke fresh gas aur synthetic compressor oil charge kiya jaye ga.`,

      plain_english_explanation: `The AC system in your ${vehicle} is not cooling adequately due to low refrigerant pressure from a condenser or evaporator coil pinhole leak, compounded by a clogged cabin pollen filter restricting airflow. We will pressure-test the system with nitrogen, repair the leak, flush the lines, and recharge pure R134a refrigerant and synthetic PAG compressor lubricant.`,

      mechanical_root_cause: responseLanguage === 'roman_urdu'
        ? 'AC system mein refrigerant pressure kam ho sakta hai, leak ho sakta hai, ya cabin filter band ho sakta hai. Pehle pressure aur airflow check karke asal wajah confirm karein.'
        : 'Refrigerant R134a pressure deficit with potential evaporator coil pinhole leak or clogged cabin pollen filter restricting airflow over the expansion valve.',
      recommended_departments: ['AC Service', 'Electrical', 'Inspection'],
      work_to_be_done: responseLanguage === 'roman_urdu'
        ? `1. AC ke high aur low pressure gauges se system pressure check karein.\n2. Condenser, evaporator, hoses, aur connections par leak test karein.\n3. Leak milne par repair karein, phir system ko vacuum karke manufacturer specification ke mutabiq refrigerant bharein.\n4. Cabin filter aur airflow check karke AC cooling verify karein.`
        : `1. Connect digital manifold gauge to check High and Low pressure ports.\n2. Perform nitrogen pressure leak test on evaporator, condenser, and lines.\n3. Evacuate AC system and recharge with pure R134a refrigerant and PAG compressor oil.\n4. Replace cabin microfilter and sanitize AC evaporator box.`,
      suggested_parts: [
        { sku: 'AC-GAS-134', description: 'R134a Pure Refrigerant Gas (Canister)', qty: 1, estimated_rate_pkr: 4500, classification: 'Consumables' },
        { sku: 'AC-OIL-PAG', description: 'PAG 46 High-Performance Compressor Oil', qty: 1, estimated_rate_pkr: 2200, classification: 'Consumables' },
        { sku: 'AC-FIL-01', description: 'OEM Carbon Activated Cabin Air Filter', qty: 1, estimated_rate_pkr: 3200, classification: 'OEM Parts' },
        { sku: 'AC-ORING-SET', description: 'High-Temperature HNBR AC O-Ring Seal Kit', qty: 1, estimated_rate_pkr: 1500, classification: 'Consumables' },
      ],
    };
  }

  // General comprehensive diagnosis
  return {
    response_language: responseLanguage,
    roman_urdu_explanation: `Aap ki ${vehicle} ka tafseeli mechanical tajzia:

1. Gari ki Performance aur Faults:
• Wajah: Gari ke engine aur running gear mein periodic maintenance aur sensor calibration ki zaroorat hai. Drivetrain aur suspension bushes par wear and tear notice hui hai.
• Nuqsaan: Regular service na hone se fuel consumption barh jati hai aur driving experience kharab hoti hai.
• Hal: Computerized OBD-II scanner se electronic scan hoga, throttle body aur spark plugs clean kiye jayen ge aur mukammal 35-point safety check execute hoga.`,

    plain_english_explanation: `Comprehensive diagnostic analysis for ${vehicle}. Based on the symptoms described, we recommend performing an electronic OBD-II diagnostic scan, inspecting drive belts and fluids, cleaning throttle intake, and executing necessary preventative service.`,
    mechanical_root_cause: responseLanguage === 'roman_urdu'
      ? 'Reported symptoms ki asal wajah abhi confirm nahi. OBD-II scan aur mutaliqa parts ki inspection ke baad hi fault tay karein.'
      : 'General mechanical and drivetrain performance deficit. Requires comprehensive OBD-II live data stream inspection, engine sensor validation, and primary maintenance.',
    recommended_departments: ['Mechanical', 'Electrical', 'Inspection', 'General Service'],
    work_to_be_done: responseLanguage === 'roman_urdu'
      ? `1. OBD-II scanner se fault codes aur live data check karein.\n2. Customer ke bataye hue symptoms se mutaliqa parts inspect karein.\n3. Sirf confirm shuda fault ki zaroori repair karein.\n4. Repair ke baad test karke customer ki complaint dobara verify karein.`
      : `1. Connect OBD-II diagnostic scanner and perform full health report of Engine, Transmission, and ABS modules.\n2. Inspect drive belts, spark plugs, throttle body carbon buildup, and fluid levels.\n3. Clean throttle body and Mass Airflow (MAF) sensor.\n4. Complete 35-point safety check and clear stored DTC error codes.`,
    suggested_parts: [
      { sku: 'GEN-SCAN-OBD', description: 'Comprehensive Computerized OBD-II Diagnostic Scan', qty: 1, estimated_rate_pkr: 2500, classification: 'Consumables' },
      { sku: 'GEN-CLNR-THROT', description: 'Liqui Moly / Würth Throttle Valve System Cleaner', qty: 1, estimated_rate_pkr: 1800, classification: 'Consumables' },
      { sku: 'GEN-FLTR-AIR', description: 'OEM Engine Air Intake Filter Element', qty: 1, estimated_rate_pkr: 2800, classification: 'OEM Parts' },
    ],
  };
}
