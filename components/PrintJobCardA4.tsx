'use client';

import React from 'react';
import { JobCard } from '@/types';
import CarBlueprint from './CarBlueprint';
import { Phone, Globe, MapPin, ShieldCheck } from 'lucide-react';

interface PrintJobCardA4Props {
  card: JobCard;
}

export default function PrintJobCardA4({ card }: PrintJobCardA4Props) {
  const createdDate = new Date(card.created_at || Date.now());
  const formattedDate = createdDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = createdDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const jobTypes = [
    { label: 'General', match: 'General Service' },
    { label: 'Service', match: 'Inspection' },
    { label: 'Mechanical', match: 'Mechanical' },
    { label: 'Denting', match: 'Denting' },
    { label: 'Painting', match: 'Painting' },
    { label: 'Electrical', match: 'Electrical' },
    { label: 'AC Service', match: 'AC Service' },
    { label: 'Tyres Works', match: 'Tyres Works' },
    { label: 'Car Wash', match: 'Car Wash' },
  ];

  return (
    <div className="print-only-container bg-white text-slate-900 font-sans text-[11px] p-6 max-w-[210mm] mx-auto min-h-[297mm] shadow-2xl print:shadow-none print:p-2 print:max-w-none print:m-0">
      {/* =========================================================================
          OFFICIAL AL SHAHEEN AUTO HUB HEADER
         ========================================================================= */}
      <div className="relative border-b-2 border-slate-900 pb-3 mb-2.5">
        <div className="flex items-center justify-between">
          {/* Official Logo Block */}
          <div className="w-[42%] flex items-center">
            <img
              src="/logo.png"
              alt="Al Shaheen Auto Hub"
              className="h-20 w-auto object-contain"
            />
          </div>

          {/* Slanted Centered "JOB CARD" Ribbon Banner */}
          <div className="hidden sm:flex items-center justify-center -ml-6">
            <div
              className="bg-[#18254c] text-white font-black text-xl px-10 py-2.5 uppercase tracking-widest shadow-md flex items-center justify-center"
              style={{
                clipPath: 'polygon(12% 0%, 100% 0%, 88% 100%, 0% 100%)',
              }}
            >
              JOB CARD
            </div>
          </div>

          {/* Right Contact Info Block */}
          <div className="w-[42%] text-right space-y-1 text-[9.5px] text-slate-700">
            <div className="flex items-center justify-end gap-1.5 font-bold">
              <Phone className="w-3.5 h-3.5 text-[#ba1825]" />
              <span>+92 344-1411123</span>
            </div>
            <div className="flex items-center justify-end gap-1.5 font-bold">
              <Phone className="w-3.5 h-3.5 text-[#ba1825]" />
              <span>+92 42 3573 2222</span>
            </div>
            <div className="flex items-center justify-end gap-1.5 text-slate-800 font-medium">
              <Globe className="w-3.5 h-3.5 text-[#ba1825]" />
              <span>www.alshaheenautohub.com</span>
            </div>
            <div className="flex items-start justify-end gap-1.5 text-[9px] text-slate-600 leading-tight">
              <MapPin className="w-3.5 h-3.5 text-[#ba1825] shrink-0 mt-0.5" />
              <span>
                Main Bedian Road, Near Askari 11, DHA Phase 6, Lahore-Pakistan.
              </span>
            </div>
          </div>
        </div>

        {/* Job Card No & Date/Time Line */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Job Card No.</span>
            <span className="bg-[#ba1825] text-white font-mono font-black px-3 py-0.5 rounded-full text-xs tracking-wider shadow-sm">
              {card.job_card_number}
            </span>
          </div>

          <div className="flex items-center gap-6 font-medium text-slate-800">
            <div>
              <span className="text-slate-500 mr-1">Date:</span>
              <span className="font-mono font-bold border-b border-slate-400 px-2">
                {formattedDate}
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">Time (AM/PM):</span>
              <span className="font-mono font-bold border-b border-slate-400 px-2">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CUSTOMER DETAILS & VEHICLES DETAILS (TWO SIDE-BY-SIDE CARDS)
         ========================================================================= */}
      <div className="grid grid-cols-2 gap-3 mb-2.5">
        {/* Left: Customer Details */}
        <div className="border border-slate-400 rounded-xl overflow-hidden shadow-sm relative pt-6 p-2.5 bg-white">
          <div className="absolute top-0 left-0 bg-[#18254c] text-white text-[9.5px] font-extrabold uppercase px-4 py-1 rounded-br-xl flex items-center gap-1.5 tracking-wider shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            CUSTOMER DETAILS
          </div>
          <div className="space-y-1.5 pt-1 text-[10.5px]">
            <div className="flex">
              <span className="w-28 font-bold text-slate-700">Customer Name:</span>
              <span className="flex-1 font-bold text-slate-900 border-b border-dotted border-slate-400 pb-0.5">
                {card.customer_name}
              </span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold text-slate-700">Phone No.:</span>
              <span className="flex-1 font-mono font-bold text-slate-900 border-b border-dotted border-slate-400 pb-0.5">
                {card.customer_phone}
              </span>
            </div>
            <div className="flex">
              <span className="w-28 font-bold text-slate-700">Address:</span>
              <span className="flex-1 text-slate-800 border-b border-dotted border-slate-400 pb-0.5 truncate">
                {card.customer_address || 'Lahore, Pakistan'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Vehicles Details */}
        <div className="border border-slate-400 rounded-xl overflow-hidden shadow-sm relative pt-6 p-2.5 bg-white">
          <div className="absolute top-0 left-0 bg-[#ba1825] text-white text-[9.5px] font-extrabold uppercase px-4 py-1 rounded-br-xl flex items-center gap-1.5 tracking-wider shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            VEHICLES DETAILS
          </div>
          <div className="space-y-1 pt-0.5 text-[10.5px]">
            <div className="flex">
              <span className="w-24 font-bold text-slate-700">Vehicle No.:</span>
              <span className="flex-1 font-mono font-black text-slate-900 border-b border-dotted border-slate-400 pb-0.5 text-xs text-[#ba1825]">
                {card.plate_number}
              </span>
            </div>
            <div className="flex">
              <span className="w-24 font-bold text-slate-700">Make / Model:</span>
              <span className="flex-1 font-bold text-slate-900 border-b border-dotted border-slate-400 pb-0.5">
                {card.make_model}
              </span>
            </div>
            <div className="flex">
              <span className="w-24 font-bold text-slate-700">Variant:</span>
              <span className="flex-1 text-slate-800 border-b border-dotted border-slate-400 pb-0.5">
                {card.variant || 'Standard'}
              </span>
            </div>
            <div className="flex">
              <span className="w-24 font-bold text-slate-700">KM Reading:</span>
              <span className="flex-1 font-mono text-slate-800 border-b border-dotted border-slate-400 pb-0.5">
                {card.mileage_km ? `${card.mileage_km.toLocaleString()} KM` : 'N/A'}
              </span>
            </div>
            <div className="flex">
              <span className="w-24 font-bold text-slate-700">Color:</span>
              <span className="flex-1 text-slate-800 border-b border-dotted border-slate-400 pb-0.5">
                {card.body_color || 'Default'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          JOB TYPE CHECKBOXES BAR
         ========================================================================= */}
      <div className="border border-slate-400 rounded-xl p-2 mb-2.5 relative pt-4 bg-white">
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#18254c] text-white text-[9px] font-extrabold uppercase px-4 py-0.5 rounded-full tracking-wider shadow">
          JOB TYPE
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 text-[10px] items-center text-center">
          {jobTypes.map((t) => {
            const isChecked = card.departments?.some((d) =>
              d.toLowerCase().includes(t.match.toLowerCase())
            );
            return (
              <div key={t.label} className="flex flex-col items-center gap-1">
                <span className="font-semibold text-slate-700">{t.label}</span>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center font-bold text-[10px] ${
                    isChecked
                      ? 'bg-[#18254c] text-white border-[#18254c]'
                      : 'border-slate-400 bg-white'
                  }`}
                >
                  {isChecked ? '✓' : ''}
                </div>
              </div>
            );
          })}
          <div className="flex flex-col items-center gap-1">
            <span className="font-semibold text-slate-700">Others</span>
            <div className="w-4 h-4 rounded border border-slate-400 bg-white" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          CUSTOMER CONCERN & WORK TO BE DONE
         ========================================================================= */}
      <div className="grid grid-cols-2 gap-3 mb-2.5">
        {/* Customer Concern */}
        <div className="border border-slate-400 rounded-xl overflow-hidden shadow-sm relative pt-6 p-2.5 bg-white">
          <div className="absolute top-0 left-0 bg-[#18254c] text-white text-[9.5px] font-extrabold uppercase px-4 py-1 rounded-br-xl tracking-wider shadow">
            CUSTOMER CONCERN
          </div>
          <p className="text-[10px] text-slate-800 italic leading-relaxed whitespace-pre-wrap min-h-[55px] pt-1">
            "{card.customer_concern || 'Standard maintenance and safety inspection requested.'}"
          </p>

          {/* AI Roman Urdu Diagnostic Summary */}
          {(card.ai_diagnosis_result?.roman_urdu_explanation ||
            card.ai_diagnosis_result?.plain_english_explanation) && (
            <div className="mt-2 pt-1 border-t border-slate-200 text-[9px] text-[#18254c] font-medium bg-slate-50 p-1.5 rounded">
              <strong className="text-[#ba1825]">AI Mechanical Diagnosis (Tafseel):</strong>
              <div className="mt-0.5 text-slate-800 leading-normal line-clamp-3">
                {card.ai_diagnosis_result.roman_urdu_explanation ||
                  card.ai_diagnosis_result.plain_english_explanation}
              </div>
            </div>
          )}
        </div>

        {/* Work To Be Done */}
        <div className="border border-slate-400 rounded-xl overflow-hidden shadow-sm relative pt-6 p-2.5 bg-white">
          <div className="absolute top-0 left-0 bg-[#18254c] text-white text-[9.5px] font-extrabold uppercase px-4 py-1 rounded-br-xl tracking-wider shadow">
            WORK TO BE DONE
          </div>
          <p className="text-[10px] text-slate-900 font-mono whitespace-pre-wrap leading-relaxed min-h-[55px] pt-1">
            {card.work_to_be_done ||
              '1. Computerized electronic health scan.\n2. Preventative maintenance & fluid level inspection.\n3. Master technician test drive.'}
          </p>
        </div>
      </div>

      {/* Compact 360° Inspection Blueprint in Print */}
      <div className="mb-2.5 border border-slate-300 rounded-xl overflow-hidden p-1 bg-slate-950">
        <CarBlueprint markers={card.inspection_markers || []} readOnly={true} />
      </div>

      {/* =========================================================================
          ITEMIZED PARTS & MATERIAL STATEMENT TABLE
         ========================================================================= */}
      <div className="border border-slate-400 rounded-xl overflow-hidden mb-2.5">
        <table className="w-full text-left text-[10px] border-collapse">
          <thead>
            <tr className="bg-[#18254c] text-white font-extrabold tracking-wider uppercase text-[9.5px]">
              <th className="py-1.5 px-2.5 w-12 text-center border-r border-slate-600">Sr. No.</th>
              <th className="py-1.5 px-3 border-r border-slate-600">DESCRIPTION OF PARTS / MATERIAL</th>
              <th className="py-1.5 px-2.5 w-14 text-center border-r border-slate-600">QTY.</th>
              <th className="py-1.5 px-3 w-28 text-right border-r border-slate-600">RATE (PKR)</th>
              <th className="py-1.5 px-3 w-32 text-right">AMOUNT (PKR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {card.itemized_parts && card.itemized_parts.length > 0 ? (
              card.itemized_parts.map((part, idx) => (
                <tr key={part.id || idx} className="hover:bg-slate-50">
                  <td className="py-1 px-2.5 text-center font-mono text-slate-600 border-r border-slate-200">
                    {idx + 1}
                  </td>
                  <td className="py-1 px-3 font-semibold text-slate-900 border-r border-slate-200">
                    {part.description}
                  </td>
                  <td className="py-1 px-2.5 text-center font-mono border-r border-slate-200">
                    {part.qty}
                  </td>
                  <td className="py-1 px-3 text-right font-mono border-r border-slate-200">
                    {part.rate?.toLocaleString()}
                  </td>
                  <td className="py-1 px-3 text-right font-mono font-bold text-slate-900">
                    {part.amount?.toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-2.5 text-center text-slate-400 italic">
                  No replacement parts billed. General service charges apply.
                </td>
              </tr>
            )}
            {/* Blank row filler for certified appearance */}
            {(!card.itemized_parts || card.itemized_parts.length < 3) && (
              <tr className="h-6">
                <td className="border-r border-slate-200" />
                <td className="border-r border-slate-200" />
                <td className="border-r border-slate-200" />
                <td className="border-r border-slate-200" />
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* =========================================================================
          ESTIMATED COST, SIGNATURE BOXES & FINAL AMOUNT MATRIX
         ========================================================================= */}
      <div className="grid grid-cols-12 gap-2.5 mb-2.5">
        {/* Col 1: Estimated Cost & Promised Delivery (3 cols) */}
        <div className="col-span-3 border border-slate-400 rounded-xl p-2.5 space-y-2 bg-slate-50/50">
          <div>
            <h4 className="text-[10px] font-black uppercase text-[#ba1825] tracking-wider border-b border-slate-300 pb-0.5 mb-1.5">
              ESTIMATED COST:
            </h4>
            <div className="space-y-1 text-[9.5px]">
              <div className="flex justify-between">
                <span className="text-slate-600">Labour Charges:</span>
                <span className="font-mono font-bold">
                  {(card.labor_charges || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Parts / Material:</span>
                <span className="font-mono font-bold">
                  {(card.parts_total || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Other Charges:</span>
                <span className="font-mono font-bold">
                  {(card.alignment_charges || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-300">
            <h4 className="text-[9.5px] font-black uppercase text-slate-800 tracking-wider mb-1">
              PROMISED DELIVERY:
            </h4>
            <div className="space-y-0.5 text-[9px] text-slate-600">
              <div>Date: <span className="font-mono font-bold text-slate-800 border-b border-slate-400 px-1">{formattedDate}</span></div>
              <div>Time: <span className="font-mono font-bold text-slate-800 border-b border-slate-400 px-1">05:00 PM</span></div>
            </div>
          </div>
        </div>

        {/* Col 2: 4 Official Approval & Sign-Off Boxes (9 cols) */}
        <div className="col-span-9 grid grid-cols-2 gap-2">
          {/* Customer Approval */}
          <div className="border border-slate-400 rounded-xl overflow-hidden p-2 relative pt-5 bg-white flex flex-col justify-between h-20">
            <div className="absolute top-0 left-0 bg-[#18254c] text-white text-[8.5px] font-extrabold uppercase px-3 py-0.5 rounded-br-lg tracking-wider">
              CUSTOMER APPROVAL
            </div>
            <p className="text-[8px] text-slate-500 leading-tight">
              I authorize the above work to be performed on my vehicle. I've read & agree to all terms & conditions.
            </p>
            <div className="border-t border-dashed border-slate-400 pt-0.5 flex justify-between text-[8px] text-slate-600">
              <span>Signature:</span>
              <span className="italic text-slate-400">Customer</span>
            </div>
          </div>

          {/* Vehicle Received By */}
          <div className="border border-slate-400 rounded-xl overflow-hidden p-2 relative pt-5 bg-white flex flex-col justify-between h-20">
            <div className="absolute top-0 left-0 bg-[#18254c] text-white text-[8.5px] font-extrabold uppercase px-3 py-0.5 rounded-br-lg tracking-wider">
              VEHICLE RECEIVED BY
            </div>
            <div className="text-[9px] text-slate-700">
              Name: <span className="font-bold">{card.received_by || 'Staff Advisor'}</span>
            </div>
            <div className="border-t border-dashed border-slate-400 pt-0.5 flex justify-between text-[8px] text-slate-600">
              <span>Signature:</span>
              <span className="italic text-slate-400">Intake Staff</span>
            </div>
          </div>

          {/* Service Executive */}
          <div className="border border-slate-400 rounded-xl overflow-hidden p-2 relative pt-5 bg-white flex flex-col justify-between h-20">
            <div className="absolute top-0 left-0 bg-[#18254c] text-white text-[8.5px] font-extrabold uppercase px-3 py-0.5 rounded-br-lg tracking-wider">
              SERVICE EXECUTIVE
            </div>
            <div className="text-[9px] text-slate-700">
              Name: <span className="font-bold">{card.service_advisor || 'Advisor Incharge'}</span>
            </div>
            <div className="border-t border-dashed border-slate-400 pt-0.5 flex justify-between text-[8px] text-slate-600">
              <span>Signature:</span>
              <span className="italic text-slate-400">Advisor</span>
            </div>
          </div>

          {/* Vehicle Delivered By */}
          <div className="border border-slate-400 rounded-xl overflow-hidden p-2 relative pt-5 bg-white flex flex-col justify-between h-20">
            <div className="absolute top-0 left-0 bg-[#18254c] text-white text-[8.5px] font-extrabold uppercase px-3 py-0.5 rounded-br-lg tracking-wider">
              VEHICLE DELIVERED BY
            </div>
            <div className="text-[9px] text-slate-700">
              Name: <span className="font-bold">{card.delivered_by || 'Gate Security'}</span>
            </div>
            <div className="border-t border-dashed border-slate-400 pt-0.5 flex justify-between text-[8px] text-slate-600">
              <span>Signature:</span>
              <span className="italic text-slate-400">Delivery Officer</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          QUALITY CHECK & FINAL AMOUNT
         ========================================================================= */}
      <div className="grid grid-cols-12 gap-2.5 mb-3">
        {/* Quality Check (7 cols) */}
        <div className="col-span-7 border border-slate-400 rounded-xl overflow-hidden p-2.5 relative pt-6 bg-white">
          <div className="absolute top-0 left-0 bg-[#b8823b] text-white text-[9px] font-extrabold uppercase px-3.5 py-0.5 rounded-br-lg tracking-wider shadow">
            QUALITY CHECK
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[9.5px]">
            <label className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded border flex items-center justify-center font-bold text-[8px] ${card.quality_checks?.exterior_clean ? 'bg-[#18254c] text-white' : 'border-slate-400 bg-white'}`}>
                {card.quality_checks?.exterior_clean ? '✓' : ''}
              </span>
              <span>Exterior Clean</span>
            </label>
            <label className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded border flex items-center justify-center font-bold text-[8px] ${card.quality_checks?.engine_area_clean ? 'bg-[#18254c] text-white' : 'border-slate-400 bg-white'}`}>
                {card.quality_checks?.engine_area_clean ? '✓' : ''}
              </span>
              <span>Engine Area Clean</span>
            </label>
            <label className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded border flex items-center justify-center font-bold text-[8px] ${card.quality_checks?.no_warning_lights ? 'bg-[#18254c] text-white' : 'border-slate-400 bg-white'}`}>
                {card.quality_checks?.no_warning_lights ? '✓' : ''}
              </span>
              <span>No Warning Lights</span>
            </label>
            <label className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded border flex items-center justify-center font-bold text-[8px] ${card.quality_checks?.interior_clean ? 'bg-[#18254c] text-white' : 'border-slate-400 bg-white'}`}>
                {card.quality_checks?.interior_clean ? '✓' : ''}
              </span>
              <span>Interior Clean</span>
            </label>
            <label className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded border flex items-center justify-center font-bold text-[8px] ${card.quality_checks?.all_systems_checked ? 'bg-[#18254c] text-white' : 'border-slate-400 bg-white'}`}>
                {card.quality_checks?.all_systems_checked ? '✓' : ''}
              </span>
              <span>All Systems Checked</span>
            </label>
            <label className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded border flex items-center justify-center font-bold text-[8px] ${card.quality_checks?.work_completed ? 'bg-[#18254c] text-white' : 'border-slate-400 bg-white'}`}>
                {card.quality_checks?.work_completed ? '✓' : ''}
              </span>
              <span>Work Completed</span>
            </label>
            <label className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded border flex items-center justify-center font-bold text-[8px] ${card.quality_checks?.test_drive_done ? 'bg-[#18254c] text-white' : 'border-slate-400 bg-white'}`}>
                {card.quality_checks?.test_drive_done ? '✓' : ''}
              </span>
              <span>Test Drive Done</span>
            </label>
            <label className="flex items-center gap-1 col-span-2">
              <span className={`w-3 h-3 rounded border flex items-center justify-center font-bold text-[8px] ${card.quality_checks?.customer_satisfied ? 'bg-[#18254c] text-white' : 'border-slate-400 bg-white'}`}>
                {card.quality_checks?.customer_satisfied ? '✓' : ''}
              </span>
              <span>Customer Satisfied</span>
            </label>
          </div>
        </div>

        {/* Final Amount Ledger (5 cols) */}
        <div className="col-span-5 border border-slate-400 rounded-xl overflow-hidden p-2.5 relative pt-6 bg-white">
          <div className="absolute top-0 left-0 bg-[#b8823b] text-white text-[9px] font-extrabold uppercase px-3.5 py-0.5 rounded-br-lg tracking-wider shadow">
            FINAL AMOUNT
          </div>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Total Amount (PKR):</span>
              <span className="font-mono font-bold text-slate-900">
                {((card.parts_total || 0) + (card.labor_charges || 0) + (card.alignment_charges || 0)).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-[#ba1825]">
              <span className="font-semibold">Discount (PKR):</span>
              <span className="font-mono font-bold">
                - {(card.discount_amount || 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-[#18254c] text-white p-1.5 rounded-lg flex justify-between items-center text-xs font-black mt-1">
              <span>Net Payable (PKR):</span>
              <span className="font-mono text-sm tracking-wide">
                {(card.net_payable || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          OFFICIAL SECURITY FOOTER BANNER
         ========================================================================= */}
      <div className="bg-[#18254c] text-white px-4 py-2 rounded-xl flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2 text-[10px]">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Please Check Goods and Vehicle Before Leaving{' '}
            <strong className="text-[#ba1825]">Al Shaheen Auto Hub.</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-script text-base text-[#d4a359] italic tracking-wide">
            Your Car, Our Care
          </span>
          <span className="text-[9px] font-black tracking-widest uppercase text-slate-200 border-l border-slate-600 pl-3">
            COMPLETE PEACE OF MIND
          </span>
        </div>
      </div>
    </div>
  );
}
