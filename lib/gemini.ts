import { GoogleGenAI } from '@google/genai';
import { AIDiagnosisResult } from '@/types';
import { formatNumberedPoints } from '@/lib/diagnosisFormatting';
import { detectDiagnosisLanguage, DiagnosisLanguage } from '@/lib/diagnosisLanguage';

// Use the model verified for this project instead of probing unavailable models first.
// This keeps the diagnostic request fast and avoids temporary 503 capacity errors.
const FREE_DIAGNOSTIC_MODELS = ['gemini-3.1-flash-lite'];

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
      description: 'A concise numbered list in natural Roman Urdu, one point per reported issue. Distinguish the reported symptom from an unconfirmed cause and recommend relevant checks.',
    },
    plain_english_explanation: {
      type: 'string',
      description: 'A concise numbered list in clear, non-technical English, one point per reported issue. Distinguish the reported symptom from an unconfirmed cause and recommend relevant checks.',
    },
    mechanical_root_cause: {
      type: 'string',
      description: 'Evidence-based technical assessment. State when the root cause cannot be confirmed without inspection or test results.',
    },
    recommended_departments: {
      type: 'array',
      items: { type: 'string' },
      description: 'Applicable workshop departments (e.g. Mechanical, Electrical, AC Service, Suspension, Brakes, Alignment, Balancing, Denting, Painting, Car Wash, Detailing, Tyres Works, Inspection, General Service)',
    },
    work_to_be_done: {
      type: 'string',
      description: 'Provide 3 to 5 concise, numbered steps, each on its own line. Start with relevant inspection/tests; make any replacement conditional on confirming a fault.',
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
      description: 'Only parts clearly supported as necessary by the reported evidence. If inspection is needed to determine parts, return an empty array rather than guessing quantities or prices.',
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
1. Treat the customer concern as the only evidence. Do not invent symptoms, faults, inspection results, or damage. Separate reported symptoms from possible causes, and clearly say a cause is unconfirmed when the concern alone cannot establish it. Write "roman_urdu_explanation" and "plain_english_explanation" as concise numbered lists, one point per reported issue, with a maximum of five points. Use natural, polite Roman Urdu and simple English respectively; put each point on its own line.

2. Set "response_language" to match the customer's concern: use "roman_urdu" for Roman Urdu or Hinglish, and "english" for English. Write "work_to_be_done" and "mechanical_root_cause" only in that selected language. For Roman Urdu or Hinglish, use natural Latin-script Urdu/Hinglish and retain familiar English automotive terms where useful. Provide 3 to 5 concise, numbered, actionable steps, each on its own line. Recommend relevant inspection/tests first; do not state that an unperformed test, repair, or replacement has happened.

3. Select all applicable workshop departments from: Mechanical, Electrical, AC Service, Suspension, Brakes, Alignment, Balancing, Denting, Painting, Car Wash, Detailing, Tyres Works, Inspection, General Service.

4. Do not recommend parts, quantities, or prices unless the provided evidence clearly establishes they are needed. Do not fabricate current Lahore market prices. If diagnosis or inspection is needed before identifying parts, return an empty "suggested_parts" array and make replacement conditional on confirmed findings.

5. Output ONLY valid JSON adhering strictly to the provided JSON schema.`;

export async function runAIDiagnosis(params: {
  make_model: string;
  variant?: string;
  mileage_km?: number;
  customer_concern: string;
}): Promise<AIDiagnosisResult> {
  const apiKey = process.env.GEMINI_API_KEY || '';
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

  // Avoid presenting a guessed diagnosis when the model is unavailable.
  return formatDiagnosisSteps(generateDomainFallbackDiagnosis(responseLanguage), responseLanguage);
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

function generateDomainFallbackDiagnosis(responseLanguage: DiagnosisLanguage): AIDiagnosisResult {
  return {
    response_language: responseLanguage,
    roman_urdu_explanation: '1. Aap ki report ki hui complaint ki asal wajah abhi confirm nahi hui; mutaliqa system ko inspect aur test karna zaroori hai.',
    plain_english_explanation: '1. The reported concern cannot be diagnosed from the description alone; the relevant system needs inspection and testing.',
    mechanical_root_cause: responseLanguage === 'roman_urdu'
      ? 'Customer ki report se exact root cause confirm nahi hota; inspection aur test results ke baad hi diagnosis dein.'
      : 'The exact root cause is not established by the customer report; diagnose only after inspection and test results.',
    recommended_departments: ['Inspection'],
    work_to_be_done: responseLanguage === 'roman_urdu'
      ? '1. Customer ki complaint detail se confirm karein.\n2. Sirf complaint se mutaliqa system ko inspect aur munasib tests karein.\n3. Findings customer ko batayein; koi part replace karne se pehle fault confirm aur approval lein.\n4. Repair ke baad complaint dobara verify karein.'
      : '1. Confirm the concern and relevant operating conditions with the customer.\n2. Inspect and test only the system related to the reported concern.\n3. Share findings and obtain approval; replace parts only after confirming a fault.\n4. Verify the original concern is resolved after repair.',
    suggested_parts: [],
  };
}
