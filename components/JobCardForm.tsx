'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  JobCard,
  ItemizedPart,
  InspectionMarker,
  ALL_DEPARTMENTS,
  WORKSHOP_BAYS,
  CAR_WASH_BAYS,
  AIDiagnosisResult,
} from '@/types';
import CarBlueprint from './CarBlueprint';
import { formatNumberedPoints } from '@/lib/diagnosisFormatting';
import { detectDiagnosisLanguage } from '@/lib/diagnosisLanguage';
import { createJobCardDraft } from '@/lib/jobCardDraft';
import { calculateJobCardFinancials } from '@/lib/jobCardFinancials';
import {
  Mic,
  MicOff,
  Sparkles,
  Save,
  Printer,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  Fuel,
  Wrench,
  Car,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import AuthSessionButton from '@/components/AuthSessionButton';

interface JobCardFormProps {
  initialData?: Partial<JobCard> | null;
  onSaveSuccess?: (saved: JobCard) => void;
  onPrint?: (card: JobCard) => void;
}

function mergeDiagnosisScope(
  existingScope: string | undefined,
  previousAiScope: string | undefined,
  nextAiScope: string,
  language: 'roman_urdu' | 'english'
): string {
  const existing = existingScope?.trim() || '';
  if (!existing) return nextAiScope;

  const markers = [
    '[AI DIAGNOSTIC RECOMMENDATION]',
    '[AI recommendation]',
    '[AI ki tajweez]',
  ];
  const markerIndex = markers.reduce(
    (latestIndex, marker) => Math.max(latestIndex, existing.lastIndexOf(`\n\n${marker}\n`)),
    -1
  );
  const manualScope =
    markerIndex >= 0
      ? existing.slice(0, markerIndex).trim()
      : existing === previousAiScope?.trim()
        ? ''
        : existing;

  if (!manualScope) return nextAiScope;

  const marker = language === 'roman_urdu' ? '[AI ki tajweez]' : '[AI recommendation]';
  return `${manualScope}\n\n${marker}\n${nextAiScope}`;
}

export default function JobCardForm({ initialData, onSaveSuccess, onPrint }: JobCardFormProps) {
  const [formData, setFormData] = useState<JobCard>(() => createJobCardDraft(initialData));

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechInterim, setSpeechInterim] = useState('');
  const recognitionRef = useRef<any>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const savedAiLanguage =
    initialData?.ai_diagnosis_result?.response_language ||
    detectDiagnosisLanguage(initialData?.customer_concern || '');
  const [aiLanguage, setAiLanguage] = useState<'roman_urdu' | 'english'>(savedAiLanguage);
  const [aiBanner, setAiBanner] = useState<string | null>(
    savedAiLanguage === 'english'
      ? initialData?.ai_diagnosis_result?.plain_english_explanation ||
          initialData?.ai_diagnosis_result?.roman_urdu_explanation ||
          null
      : initialData?.ai_diagnosis_result?.roman_urdu_explanation ||
          initialData?.ai_diagnosis_result?.plain_english_explanation ||
          null
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (formData.job_card_number) return;

    const jobCardNumber = `ASH-${Math.floor(100000 + Math.random() * 900000)}`;
    setFormData((prev) =>
      prev.job_card_number ? prev : { ...prev, job_card_number: jobCardNumber }
    );
  }, [formData.job_card_number]);

  // Recalculate financial balances whenever parts or rates change
  useEffect(() => {
    const financials = calculateJobCardFinancials(formData);

    setFormData((prev) => ({
      ...prev,
      ...financials,
    }));
  }, [
    formData.itemized_parts,
    formData.labor_charges,
    formData.alignment_charges,
    formData.discount_amount,
    formData.advance_deposit,
  ]);

  // Speech Recognition Setup (Urdu + English)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ur-PK'; // Primary Urdu / Pakistan, understands English & Roman Urdu

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript + ' ';
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }

        setSpeechInterim(interimTrans);
        if (finalTrans) {
          setFormData((prev) => ({
            ...prev,
            customer_concern: prev.customer_concern
              ? `${prev.customer_concern.trim()} ${finalTrans.trim()}`
              : finalTrans.trim(),
          }));
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setSpeechInterim('');
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech recognition init error:', e);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setSpeechInterim('');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Failed to start speech recognition:', err);
      }
    }
  };

  // Run Gemini AI Diagnosis
  const handleRunAIDiagnosis = async () => {
    if (!formData.customer_concern || formData.customer_concern.trim().length === 0) {
      toast.error('Please enter or dictate the Customer Concern first.');
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make_model: formData.make_model || 'Vehicle',
          variant: formData.variant || '',
          mileage_km: formData.mileage_km || 0,
          customer_concern: formData.customer_concern,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.diagnosis) {
        throw new Error(json.error || 'Diagnostic evaluation failed.');
      }

      const diag: AIDiagnosisResult = json.diagnosis;
      const responseLanguage = diag.response_language || 'roman_urdu';
      setAiLanguage(responseLanguage);
      setAiBanner(
        responseLanguage === 'english'
          ? diag.plain_english_explanation || diag.roman_urdu_explanation || ''
          : diag.roman_urdu_explanation || diag.plain_english_explanation || ''
      );

      // Auto-check departments
      const newDepts = Array.from(
        new Set([...(formData.departments || []), ...(diag.recommended_departments || [])])
      );

      // Auto-append suggested parts
      const newParts: ItemizedPart[] = [
        ...formData.itemized_parts.filter((part) => !part.id.startsWith('ai_')),
        ...(diag.suggested_parts || []).map((p, idx) => ({
          id: `ai_${Date.now()}_${idx}`,
          sku: p.sku || `PART-${idx + 1}`,
          description: p.description,
          qty: Number(p.qty || 1),
          rate: Number(p.estimated_rate_pkr || 0),
          amount: Number(p.qty || 1) * Number(p.estimated_rate_pkr || 0),
          classification: (p.classification as any) || 'OEM Parts',
        })),
      ];

      setFormData((prev) => ({
        ...prev,
        ai_diagnosis_result: diag,
        departments: newDepts,
        work_to_be_done: mergeDiagnosisScope(
          prev.work_to_be_done,
          prev.ai_diagnosis_result?.work_to_be_done,
          diag.work_to_be_done,
          responseLanguage
        ),
        itemized_parts: newParts,
      }));
      toast.success('AI diagnosis completed.');
    } catch (err: any) {
      toast.error(`AI diagnosis failed: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Add parts row
  const handleAddPartRow = () => {
    const newPart: ItemizedPart = {
      id: `p_${Date.now()}`,
      sku: '',
      description: '',
      qty: 1,
      rate: 0,
      amount: 0,
      classification: 'OEM Parts',
    };
    setFormData((prev) => ({
      ...prev,
      itemized_parts: [...prev.itemized_parts, newPart],
    }));
  };

  const handleUpdatePart = (index: number, field: keyof ItemizedPart, val: any) => {
    const updated = [...formData.itemized_parts];
    const item = { ...updated[index], [field]: val };
    if (field === 'qty' || field === 'rate') {
      const q = field === 'qty' ? Number(val) : Number(item.qty);
      const r = field === 'rate' ? Number(val) : Number(item.rate);
      item.amount = (q || 0) * (r || 0);
    }
    updated[index] = item;
    setFormData((prev) => ({ ...prev, itemized_parts: updated }));
  };

  const handleRemovePart = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      itemized_parts: prev.itemized_parts.filter((_, i) => i !== index),
    }));
  };

  const handleDepartmentToggle = (dept: string) => {
    const current = formData.departments || [];
    if (current.includes(dept)) {
      setFormData((prev) => ({
        ...prev,
        departments: current.filter((d) => d !== dept),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        departments: [...current, dept],
      }));
    }
  };

  // Save handler
  const handleSave = async (customStatus?: JobCard['status'], printAfterSave = false) => {
    if (!formData.customer_name || !formData.plate_number) {
      toast.error('Please fill in at least Customer Name and Vehicle Plate Number.');
      return;
    }

    setSaving(true);
    try {
      const payload: JobCard = {
        ...formData,
        ...(customStatus ? { status: customStatus } : {}),
        ...(customStatus === 'CLOSED_PAID' ? { closed_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      };

      const res = await fetch('/api/jobcards', {
        method: formData.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');

      setFormData(json.data);
      toast.success(
        customStatus === 'CLOSED_PAID'
          ? 'Job card closed and payment recorded.'
          : 'Job card saved successfully.'
      );
      if (printAfterSave) {
        if (onPrint) onPrint(json.data);
      } else if (onSaveSuccess) {
        onSaveSuccess(json.data);
      }
    } catch (err: any) {
      toast.error(`Error saving job card: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md sticky top-2 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/workshop"
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {formData.job_card_number}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                  formData.status === 'READY_FOR_DELIVERY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                    : formData.status === 'CLOSED_PAID'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {formData.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {formData.customer_name ? `${formData.customer_name} • ${formData.plate_number || 'New Card'}` : 'Create Job Card & Diagnosis'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (onPrint) {
                if (initialData?.id) {
                  onPrint(formData);
                } else {
                  handleSave(undefined, true);
                }
              } else {
                toast.error('Please save the job card before printing.');
              }
            }}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition shadow"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            Print A4 Job Card
          </button>

          <button
            type="button"
            onClick={() => handleSave('CLOSED_PAID')}
            disabled={saving}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            💳 Mark Paid & Close
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center gap-1.5 transition shadow-lg shadow-amber-950/50 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Job Card'}
          </button>

          <div className="ml-1 border-l border-slate-700/80 pl-2">
            <AuthSessionButton />
          </div>
        </div>
      </div>

      {/* AI Explanation Banner */}
      {aiBanner && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/95 via-slate-900/95 to-purple-950/95 border border-indigo-500/50 shadow-2xl flex items-start gap-3.5 backdrop-blur">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-800/50 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  AI Mechanical Advisor Explanation (Customer-Facing Breakdown)
                </span>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAiLanguage('roman_urdu');
                      if (formData.ai_diagnosis_result?.roman_urdu_explanation) {
                        setAiBanner(formData.ai_diagnosis_result.roman_urdu_explanation);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      aiLanguage === 'roman_urdu'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🇵🇰 Roman Urdu (اردو)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAiLanguage('english');
                      if (formData.ai_diagnosis_result?.plain_english_explanation) {
                        setAiBanner(formData.ai_diagnosis_result.plain_english_explanation);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      aiLanguage === 'english'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setAiBanner(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs"
                  title="Dismiss banner"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-slate-100 leading-relaxed font-sans whitespace-pre-wrap bg-slate-950/50 p-3 rounded-xl border border-indigo-900/40">
              {formatNumberedPoints(aiBanner)}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Customer & Vehicle Profile */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Car className="w-4 h-4 text-amber-400" />
            Customer & Vehicle Profile
          </h3>
          <span className="text-xs text-slate-400 font-mono">Step 1 of 4</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Customer Full Name *</label>
            <input
              type="text"
              required
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder="e.g. M. Haider Khan"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Phone Number *</label>
            <input
              type="text"
              required
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              placeholder="03XX-XXXXXXX"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Address / Locality</label>
            <input
              type="text"
              value={formData.customer_address || ''}
              onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
              placeholder="e.g. Askari 11, DHA Phase 6, Lahore"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Registration Plate No *</label>
            <input
              type="text"
              required
              value={formData.plate_number}
              onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })}
              placeholder="e.g. LEA 20 7860 or AQP 007"
              className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold tracking-wider placeholder-slate-600 focus:outline-none focus:border-amber-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Vehicle Make & Model *</label>
            <input
              type="text"
              required
              value={formData.make_model}
              onChange={(e) => setFormData({ ...formData, make_model: e.target.value })}
              placeholder="e.g. Toyota Fortuner / Honda Civic"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Variant / Engine</label>
            <input
              type="text"
              value={formData.variant || ''}
              onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
              placeholder="e.g. 2.8 Sigma 4 / 1.5 Turbo"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Odometer Mileage (KM)</label>
            <input
              type="number"
              value={formData.mileage_km || ''}
              onChange={(e) => setFormData({ ...formData, mileage_km: Number(e.target.value) })}
              placeholder="e.g. 45000"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Body Color</label>
            <input
              type="text"
              value={formData.body_color || ''}
              onChange={(e) => setFormData({ ...formData, body_color: e.target.value })}
              placeholder="e.g. Pearl White / Metallic Black"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Service Advisor</label>
            <input
              type="text"
              value={formData.service_advisor}
              onChange={(e) => setFormData({ ...formData, service_advisor: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Bay Allocation & Workflow Status Matrix */}
        <div className="pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Bay Category</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, bay_category: 'WORKSHOP', bay_number: 1 })}
                className={`py-2 px-3 rounded-xl font-semibold border transition ${
                  formData.bay_category === 'WORKSHOP'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                    : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Workshop Bay (1–6)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, bay_category: 'CAR_WASH', bay_number: 1 })}
                className={`py-2 px-3 rounded-xl font-semibold border transition ${
                  formData.bay_category === 'CAR_WASH'
                    ? 'bg-sky-500 text-slate-950 border-sky-400 shadow'
                    : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Car Wash Bay (1–6)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Assigned Bay Number</label>
            <select
              value={formData.bay_number}
              onChange={(e) => setFormData({ ...formData, bay_number: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-500"
            >
              {formData.bay_category === 'WORKSHOP'
                ? WORKSHOP_BAYS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                : CAR_WASH_BAYS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Workflow Stage</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className={`w-full bg-slate-950 border rounded-xl px-3 py-2 font-bold focus:outline-none ${
                formData.status === 'READY_FOR_DELIVERY'
                  ? 'border-emerald-500 text-emerald-400'
                  : formData.status === 'CLOSED_PAID'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-amber-500 text-amber-300'
              }`}
            >
              <option value="INTAKE">INTAKE (Vehicle Received)</option>
              <option value="IN_PROGRESS">IN PROGRESS (Work Underway)</option>
              <option value="READY_FOR_DELIVERY">READY FOR DELIVERY (Announce TV)</option>
              <option value="CLOSED_PAID">CLOSED & PAID (Settled)</option>
            </select>
          </div>
        </div>

        {/* Fuel Level Slider & Handed Over Items */}
        <div className="pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-amber-400" />
                Fuel Level in Tank:
              </span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                {formData.fuel_level_percent}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={formData.fuel_level_percent}
              onChange={(e) => setFormData({ ...formData, fuel_level_percent: Number(e.target.value) })}
              className="w-full accent-amber-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>EMPTY (0%)</span>
              <span>1/4</span>
              <span>HALF (50%)</span>
              <span>3/4</span>
              <span>FULL (100%)</span>
            </div>
          </div>

          <div>
            <span className="block text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Handed-Over Inventory Checklist:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.handed_over_inventory.spare_wheel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      handed_over_inventory: {
                        ...formData.handed_over_inventory,
                        spare_wheel: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-amber-500 accent-amber-500 w-4 h-4"
                />
                <span className="text-slate-300">Spare Wheel Present</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.handed_over_inventory.tools}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      handed_over_inventory: {
                        ...formData.handed_over_inventory,
                        tools: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-amber-500 accent-amber-500 w-4 h-4"
                />
                <span className="text-slate-300">Tool Kit / Jack</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.handed_over_inventory.mats}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      handed_over_inventory: {
                        ...formData.handed_over_inventory,
                        mats: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-amber-500 accent-amber-500 w-4 h-4"
                />
                <span className="text-slate-300">Floor Mats</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.handed_over_inventory.valuables_cleared}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      handed_over_inventory: {
                        ...formData.handed_over_inventory,
                        valuables_cleared: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-amber-500 accent-amber-500 w-4 h-4"
                />
                <span className="text-slate-300">Valuables Cleared</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Interactive 360° Inspection Blueprint */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
            <Wrench className="w-4 h-4 text-sky-400" />
            Section 2 Interactive 360° Vehicle Exterior Inspection
          </h3>
          <span className="text-xs text-slate-400 font-mono">Step 2 of 4</span>
        </div>

        <CarBlueprint
          markers={formData.inspection_markers || []}
          onChange={(markers) => setFormData({ ...formData, inspection_markers: markers })}
          readOnly={false}
        />
      </div>

      {/* Repair Departments Selection */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Repair Departments & Work Centers
          </h4>
          <span className="text-xs text-slate-500">Auto-filled by AI or checked manually</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {ALL_DEPARTMENTS.map((dept) => {
            const isChecked = formData.departments?.includes(dept);
            return (
              <button
                key={dept}
                type="button"
                onClick={() => handleDepartmentToggle(dept)}
                className={`p-2.5 rounded-xl text-xs font-medium border text-left transition flex items-center justify-between ${
                  isChecked
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{dept}</span>
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isChecked ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isChecked ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Voice Intake & AI Scope of Repairs */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Section 3 Voice Intake & Gemini AI Diagnostics
          </h3>
          <span className="text-xs text-slate-400 font-mono">Step 3 of 4</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Concern Box + Microphone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Customer Concern / Reported Fault (Urdu / Roman Urdu / English)
              </label>

              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-900/50'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      Listening in Urdu...
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-amber-400" />
                      Voice Intake (بول کر لکھیں)
                    </>
                  )}
                </button>
              )}
            </div>

            <textarea
              rows={5}
              value={formData.customer_concern || ''}
              onChange={(e) => setFormData({ ...formData, customer_concern: e.target.value })}
              placeholder="Record symptoms: e.g. 'gari khaday mein lagti hai tu tik tik awaz ati hai' or 'AC cooling nahi kar raha'..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
            />

            {speechInterim && (
              <div className="text-[11px] text-amber-300/80 italic font-mono px-2 py-1 bg-amber-950/30 rounded border border-amber-900/40">
                Transcribing: {speechInterim}...
              </div>
            )}

            <button
              type="button"
              onClick={handleRunAIDiagnosis}
              disabled={aiLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-purple-950/50 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              {aiLoading ? 'Analyzing Vehicle Symptoms with Gemini...' : '✨ Run AI Diagnosis & Auto-Fill Job Card'}
            </button>
          </div>

          {/* Work To Be Done Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Work To Be Done / Scope of Repairs (Master Tech Instructions)
              </label>
              <span className="text-[10px] text-slate-500">
                AI matches the language of the customer concern
              </span>
            </div>

            <textarea
              rows={8}
              value={formData.work_to_be_done || ''}
              onChange={(e) => setFormData({ ...formData, work_to_be_done: e.target.value })}
              placeholder="1. Inspect and confirm the reported faults.\n2. Complete the necessary repairs.\n3. Test the repairs and verify the results."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: Spare Parts, Materials & Pricing (PKR) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Section 4 Spare Parts, Materials & Pricing (PKR)
          </h3>
          <button
            type="button"
            onClick={handleAddPartRow}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Part Item
          </button>
        </div>

        {/* Dynamic Parts Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <th className="py-2.5 px-3 w-10">#</th>
                <th className="py-2.5 px-3">Description of Parts / Material</th>
                <th className="py-2.5 px-3 w-32">Classification</th>
                <th className="py-2.5 px-3 w-20">Qty</th>
                <th className="py-2.5 px-3 w-32">Rate (PKR)</th>
                <th className="py-2.5 px-3 w-36 text-right">Amount (PKR)</th>
                <th className="py-2.5 px-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {formData.itemized_parts.map((part, idx) => (
                <tr key={part.id || idx} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={part.description}
                      onChange={(e) => handleUpdatePart(idx, 'description', e.target.value)}
                      placeholder="e.g. Front Lower Arm Bushing Set"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-amber-500"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={part.classification || 'OEM Parts'}
                      onChange={(e) => handleUpdatePart(idx, 'classification', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 focus:outline-none"
                    >
                      <option value="OEM Parts">OEM Parts</option>
                      <option value="Aftermarket">Aftermarket</option>
                      <option value="Consumables">Consumables</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min={1}
                      value={part.qty}
                      onChange={(e) => handleUpdatePart(idx, 'qty', Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-center focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={part.rate}
                      onChange={(e) => handleUpdatePart(idx, 'rate', Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-amber-400">
                    {(part.amount || 0).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemovePart(idx)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                      title="Delete part"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {formData.itemized_parts.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-500 italic">
                    No spare parts added yet. Use "✨ Run AI Diagnosis" or click "Add Part Item" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger & Financial Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-800">
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Labour Charges (PKR)</label>
              <input
                type="number"
                min={0}
                step={250}
                value={formData.labor_charges}
                onChange={(e) => setFormData({ ...formData, labor_charges: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Wheel Alignment / Other Service Charges (PKR)
              </label>
              <input
                type="number"
                min={0}
                step={250}
                value={formData.alignment_charges}
                onChange={(e) =>
                  setFormData({ ...formData, alignment_charges: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Discount (PKR)</label>
              <input
                type="number"
                min={0}
                step={250}
                value={formData.discount_amount}
                onChange={(e) =>
                  setFormData({ ...formData, discount_amount: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Advance Received (PKR)</label>
              <input
                type="number"
                min={0}
                step={500}
                value={formData.advance_deposit}
                onChange={(e) =>
                  setFormData({ ...formData, advance_deposit: Number(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Settlement Calculation Breakdown (PKR)
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Spare Parts Total:</span>
                <span className="font-mono font-bold">
                  {(formData.parts_total || 0).toLocaleString()} PKR
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Labour Charges:</span>
                <span className="font-mono font-bold">
                  {(formData.labor_charges || 0).toLocaleString()} PKR
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Alignment & Other Charges:</span>
                <span className="font-mono font-bold">
                  {(formData.alignment_charges || 0).toLocaleString()} PKR
                </span>
              </div>
              {Number(formData.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount Applied:</span>
                  <span className="font-mono font-bold">
                    - {(formData.discount_amount || 0).toLocaleString()} PKR
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-extrabold text-white">
                <span>Net Payable:</span>
                <span className="font-mono text-amber-400">
                  {(formData.net_payable || 0).toLocaleString()} PKR
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Advance Deposited:</span>
                <span className="font-mono">
                  {(formData.advance_deposit || 0).toLocaleString()} PKR
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase">Balance Remaining:</span>
              <span className="text-lg font-black font-mono text-amber-400">
                {(formData.balance_remaining || 0).toLocaleString()} PKR
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Check Sign-offs & Handover Notes */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Quality Audit Checkmarks (Sign-Off Before Ready / Delivery)
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { key: 'exterior_clean', label: 'Exterior Cleaned' },
            { key: 'interior_clean', label: 'Interior Vacuumed' },
            { key: 'engine_area_clean', label: 'Engine Bay Inspected' },
            { key: 'all_systems_checked', label: 'Systems Checked' },
            { key: 'test_drive_done', label: 'Test Drive Done' },
            { key: 'no_warning_lights', label: 'Zero Warning Lights' },
            { key: 'work_completed', label: 'Work Scope Done' },
            { key: 'customer_satisfied', label: 'Customer Satisfied' },
          ].map(({ key, label }) => {
            const isChecked = (formData.quality_checks as any)?.[key];
            return (
              <label
                key={key}
                className="flex items-center gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700"
              >
                <input
                  type="checkbox"
                  checked={Boolean(isChecked)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quality_checks: {
                        ...formData.quality_checks,
                        [key]: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-emerald-500 accent-emerald-500 w-4 h-4"
                />
                <span className={isChecked ? 'text-white font-semibold' : 'text-slate-400'}>
                  {label}
                </span>
              </label>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Vehicle Received By</label>
            <input
              type="text"
              value={formData.received_by || ''}
              onChange={(e) => setFormData({ ...formData, received_by: e.target.value })}
              placeholder="Advisor / Reception Staff"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Delivered By & Gate Pass Sign</label>
            <input
              type="text"
              value={formData.delivered_by || ''}
              onChange={(e) => setFormData({ ...formData, delivered_by: e.target.value })}
              placeholder="Delivery Officer / Security Gate"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
