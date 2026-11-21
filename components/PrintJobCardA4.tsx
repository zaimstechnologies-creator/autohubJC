'use client';

import React from 'react';
import { JobCard } from '@/types';
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
    ['General', 'General Service'],
    ['Service', 'Inspection'],
    ['Mechanical', 'Mechanical'],
    ['Denting', 'Denting'],
    ['Painting', 'Painting'],
    ['Electrical', 'Electrical'],
    ['AC Service', 'AC Service'],
    ['Tyres Works', 'Tyres Works'],
    ['Car Wash', 'Car Wash'],
  ] as const;

  const qualityChecks = [
    ['Exterior Clean', card.quality_checks?.exterior_clean],
    ['Engine Area Clean', card.quality_checks?.engine_area_clean],
    ['No Warning Lights', card.quality_checks?.no_warning_lights],
    ['Interior Clean', card.quality_checks?.interior_clean],
    ['All Systems Checked', card.quality_checks?.all_systems_checked],
    ['Work Completed', card.quality_checks?.work_completed],
    ['Test Drive Done', card.quality_checks?.test_drive_done],
    ['Customer Satisfied', card.quality_checks?.customer_satisfied],
  ] as const;

  const parts = card.itemized_parts || [];
  const blankRows = Math.max(0, 5 - parts.length);
  const totalAmount =
    (card.parts_total || 0) +
    (card.labor_charges || 0) +
    (card.alignment_charges || 0);

  return (
    <div
      id="printableA4Document"
      className="print-only-container bg-white text-slate-900 font-sans"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '6mm 7mm',
        margin: '0 auto',
        boxSizing: 'border-box',
        fontSize: '10px',
        lineHeight: 1.3,
      }}
    >
      {/* Header */}
      <header
        className="border-b-2 border-slate-900"
        style={{ paddingBottom: '4mm', marginBottom: '4mm' }}
      >
        <div className="flex items-center justify-between">
          <div style={{ width: '40%' }}>
            <img
              src="/logo.png"
              alt="Al Shaheen Auto Hub"
              style={{ height: '19mm', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          <div
            className="bg-[#1b2d50] text-white font-black uppercase text-center"
            style={{
              width: '30mm',
              padding: '2.5mm 4mm',
              clipPath: 'polygon(12% 0, 100% 0, 88% 100%, 0 100%)',
              fontSize: '12px',
              letterSpacing: '1px',
            }}
          >
            Job Card
          </div>

          <div
            className="text-right text-slate-700"
            style={{ width: '44%', fontSize: '8px', lineHeight: 1.45 }}
          >
            <div className="flex items-start justify-end gap-1">
              <MapPin style={{ width: '11px', height: '11px', marginTop: '1px' }} />
              <span>Main Bedian Road, Near Askari 11,<br />DHA Phase 6, Lahore-Pakistan.</span>
            </div>
            <div className="flex items-center justify-end gap-1">
              <Phone style={{ width: '11px', height: '11px' }} />
              <span className="font-bold">+92 344-1411123 | +92 42 3573 2222</span>
            </div>
            <div className="flex items-center justify-end gap-1">
              <Globe style={{ width: '11px', height: '11px' }} />
              <span>www.alshaheenautohub.com</span>
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-between border-t border-slate-300"
          style={{ marginTop: '2mm', paddingTop: '1.5mm', fontSize: '9px' }}
        >
          <div>
            <span className="font-bold">Job Card No:</span>{' '}
            <span className="font-mono font-black">{card.job_card_number}</span>
          </div>
          <div className="flex" style={{ gap: '7mm' }}>
            <div>
              <span className="text-slate-600">Date:</span>{' '}
              <span className="font-mono font-bold border-b border-slate-500">
                {formattedDate}
              </span>
            </div>
            <div>
              <span className="text-slate-600">Time (AM/PM):</span>{' '}
              <span className="font-mono font-bold border-b border-slate-500">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Customer and vehicle details */}
      <div className="grid grid-cols-2" style={{ gap: '3mm', marginBottom: '5mm' }}>
        <DetailBox title="Customer Details" navy>
          <DetailRow label="Customer Name" value={card.customer_name} />
          <DetailRow label="Phone No." value={card.customer_phone} mono />
          <DetailRow label="Address" value={card.customer_address || 'Lahore, Pakistan'} />
        </DetailBox>

        <DetailBox title="Vehicle Details" red>
          <DetailRow label="Vehicle No." value={card.plate_number} mono red />
          <DetailRow label="Make / Model" value={card.make_model} />
          <DetailRow label="Variant" value={card.variant || 'Standard'} />
          <DetailRow label="KM Reading" value={card.mileage_km ? `${card.mileage_km.toLocaleString()} KM` : 'N/A'} />
          <DetailRow label="Color" value={card.body_color || 'Default'} />
        </DetailBox>
      </div>

      {/* Job type */}
      <section
        className="relative border border-slate-400 rounded-md"
        style={{ padding: '3mm 2mm 2mm', marginBottom: '5mm' }}
      >
        <span
          className="absolute left-1/2 -translate-x-1/2 bg-[#1b2d50] text-white font-bold uppercase rounded"
          style={{ top: '-2.2mm', padding: '0.4mm 4mm', fontSize: '8px' }}
        >
          Job Type
        </span>
        <div className="grid grid-cols-10" style={{ gap: '1mm' }}>
          {jobTypes.map(([label, match]) => {
            const checked = card.departments?.some((department) =>
              department.toLowerCase().includes(match.toLowerCase())
            );
            return (
              <div key={label} className="flex flex-col items-center" style={{ gap: '1mm' }}>
                <span style={{ fontSize: '8px', textAlign: 'center' }}>{label}</span>
                <CheckBox checked={checked} />
              </div>
            );
          })}
          <div className="flex flex-col items-center" style={{ gap: '1mm' }}>
            <span style={{ fontSize: '8px', textAlign: 'center' }}>Others</span>
            <CheckBox checked={false} />
          </div>
        </div>
      </section>

      {/* Concern and work */}
      <div className="grid grid-cols-2" style={{ gap: '3mm', marginBottom: '5mm' }}>
        <RuledBox title="Customer Concern">
          {card.customer_concern || 'Standard maintenance and safety inspection requested.'}
        </RuledBox>
        <RuledBox title="Work To Be Done">
          {card.work_to_be_done ||
            '1. Computerized electronic health scan.\n2. Preventative maintenance and fluid inspection.\n3. Master technician test drive.'}
        </RuledBox>
      </div>

      {/* Parts table */}
      <table
        className="w-full border-collapse border border-slate-500"
        style={{ marginBottom: '5mm', tableLayout: 'fixed' }}
      >
        <thead>
          <tr className="bg-[#1b2d50] text-white">
            <th className="border-r border-slate-500 text-center" style={{ width: '12mm', padding: '1.5mm 1mm' }}>Sr. No.</th>
            <th className="border-r border-slate-500 text-left" style={{ padding: '1.5mm 2mm' }}>Description of Parts / Material</th>
            <th className="border-r border-slate-500 text-center" style={{ width: '16mm', padding: '1.5mm 1mm' }}>Qty.</th>
            <th className="border-r border-slate-500 text-right" style={{ width: '26mm', padding: '1.5mm 1mm' }}>Rate (PKR)</th>
            <th className="text-right" style={{ width: '30mm', padding: '1.5mm 1mm' }}>Amount (PKR)</th>
          </tr>
        </thead>
        <tbody>
          {parts.slice(0, 5).map((part, index) => (
            <tr key={part.id || index} style={{ height: '10mm' }}>
              <td className="border-t border-r border-slate-300 text-center">{index + 1}</td>
              <td className="border-t border-r border-slate-300" style={{ padding: '1mm 2mm' }}>{part.description}</td>
              <td className="border-t border-r border-slate-300 text-center">{part.qty}</td>
              <td className="border-t border-r border-slate-300 text-right font-mono" style={{ padding: '1mm' }}>{part.rate?.toLocaleString()}</td>
              <td className="border-t border-slate-300 text-right font-mono font-bold" style={{ padding: '1mm' }}>{part.amount?.toLocaleString()}</td>
            </tr>
          ))}
          {Array.from({ length: blankRows }).map((_, index) => (
            <tr key={`blank-${index}`} style={{ height: '10mm' }}>
              <td className="border-t border-r border-slate-300 text-center">{parts.length + index + 1}</td>
              <td className="border-t border-r border-slate-300" />
              <td className="border-t border-r border-slate-300" />
              <td className="border-t border-r border-slate-300" />
              <td className="border-t border-slate-300" />
            </tr>
          ))}
        </tbody>
      </table>

      {/* Cost and signatures */}
      <div className="grid grid-cols-12" style={{ gap: '2mm', marginBottom: '5mm' }}>
        <div
          className="col-span-3 border border-slate-400 rounded-md"
          style={{ padding: '2mm' }}
        >
          <div className="font-black uppercase text-[#ba1825] border-b border-slate-300" style={{ marginBottom: '1mm', paddingBottom: '1mm' }}>
            Estimated Cost
          </div>
          <CostRow label="Labor Charges" value={card.labor_charges} />
          <CostRow label="Parts / Material" value={card.parts_total} />
          <CostRow label="Other Charges" value={card.alignment_charges} />
          <div className="border-t border-slate-300 font-bold" style={{ marginTop: '1mm', paddingTop: '1mm' }}>
            Promised Delivery
          </div>
          <div>Date: <span className="border-b border-slate-500">{formattedDate}</span></div>
          <div>Time: <span className="border-b border-slate-500">05:00 PM</span></div>
        </div>

        <div className="col-span-9 grid grid-cols-2" style={{ gap: '2mm' }}>
          <SignatureBox title="Customer Approval">
            I authorize this work and agree to the terms.
          </SignatureBox>
          <SignatureBox title="Vehicle Received By" name={card.received_by || 'Name'} />
          <SignatureBox title="Service Executive" name={card.service_advisor || 'Name'} />
          <SignatureBox title="Vehicle Delivered By" name={card.delivered_by || 'Name'} />
        </div>
      </div>

      {/* Quality and amount */}
      <div className="grid grid-cols-12" style={{ gap: '2mm', marginBottom: '5mm' }}>
        <section
          className="col-span-7 relative border border-slate-400 rounded-md"
          style={{ padding: '5mm 2mm 2mm' }}
        >
          <SectionTitle color="#b8823b">Quality Check</SectionTitle>
          <div className="grid grid-cols-3" style={{ gap: '1mm' }}>
            {qualityChecks.map(([label, checked]) => (
              <div key={label} className="flex items-center" style={{ gap: '1mm' }}>
                <CheckBox checked={Boolean(checked)} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section
          className="col-span-5 relative border border-slate-400 rounded-md"
          style={{ padding: '5mm 2mm 2mm' }}
        >
          <SectionTitle color="#b8823b">Final Amount</SectionTitle>
          <AmountRow label="Total Amount (PKR)" value={totalAmount} />
          <AmountRow label="Discount (PKR)" value={card.discount_amount || 0} negative />
          <div
            className="flex justify-between bg-[#1b2d50] text-white font-black rounded"
            style={{ padding: '1.2mm 1.5mm', fontSize: '9.5px' }}
          >
            <span>Net Payable (PKR)</span>
            <span className="font-mono">{(card.net_payable || 0).toLocaleString()}</span>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer
        className="flex items-center justify-between bg-[#1b2d50] text-white rounded"
        style={{ padding: '2mm 3mm' }}
      >
        <div className="flex items-center" style={{ gap: '1.5mm' }}>
          <ShieldCheck style={{ width: '13px', height: '13px', color: '#4ade80' }} />
          <span>Please Check Goods and Vehicle Before Leaving <strong>Al Shaheen Auto Hub.</strong></span>
        </div>
        <div className="text-right">
          <span className="italic text-[#d4a359]" style={{ fontFamily: 'Georgia, serif', fontSize: '12px' }}>Your Car, Our Care</span>
          <span className="block border-t border-slate-500 font-black" style={{ fontSize: '7px', letterSpacing: '1px' }}>
            COMPLETE PEACE OF MIND
          </span>
        </div>
      </footer>
    </div>
  );
}

function DetailBox({
  title,
  navy,
  red,
  children,
}: {
  title: string;
  navy?: boolean;
  red?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative border border-slate-400 rounded-md" style={{ padding: '4mm 2mm 1.5mm' }}>
      <div
        className={`absolute left-0 top-0 text-white font-black uppercase rounded-br-md ${navy ? 'bg-[#1b2d50]' : red ? 'bg-[#ba1825]' : 'bg-[#1b2d50]'}`}
        style={{ padding: '0.8mm 3mm', fontSize: '8px' }}
      >
        {title}
      </div>
      <div style={{ display: 'grid', gap: '1mm' }}>{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  red,
}: {
  label: string;
  value: string;
  mono?: boolean;
  red?: boolean;
}) {
  return (
    <div className="flex border-b border-dotted border-slate-400" style={{ minHeight: '4mm' }}>
      <span className="font-bold text-slate-700" style={{ width: '27mm' }}>{label}:</span>
      <span className={`${mono ? 'font-mono' : ''} ${red ? 'text-[#ba1825] font-black' : 'font-semibold'}`}>
        {value}
      </span>
    </div>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center border border-slate-800 ${checked ? 'bg-[#1b2d50] text-white' : 'bg-white'}`}
      style={{ width: '10px', height: '10px', fontSize: '8px' }}
    >
      {checked ? '✓' : ''}
    </span>
  );
}

function RuledBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="relative border border-slate-400 rounded-md"
      style={{ minHeight: '38mm', padding: '5mm 2mm 1.5mm' }}
    >
      <div
        className="absolute left-0 top-0 bg-[#1b2d50] text-white font-black uppercase rounded-br-md"
        style={{ padding: '0.8mm 3mm', fontSize: '8px' }}
      >
        {title}
      </div>
      <div className="whitespace-pre-wrap" style={{ fontSize: '8.5px', lineHeight: 1.45 }}>
        {children}
      </div>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex justify-between" style={{ marginBottom: '1mm' }}>
      <span>{label}:</span>
      <span className="font-mono font-bold">{(value || 0).toLocaleString()}</span>
    </div>
  );
}

function SignatureBox({
  title,
  name,
  children,
}: {
  title: string;
  name?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="relative border border-slate-400 rounded-md flex flex-col justify-between"
      style={{ height: '25mm', padding: '5mm 2mm 1.5mm' }}
    >
      <SectionTitle>{title}</SectionTitle>
      {children ? <div style={{ fontSize: '7.5px' }}>{children}</div> : <div>Name: <strong>{name}</strong></div>}
      <div className="border-t border-dotted border-slate-500 flex justify-between">
        <span>Signature:</span>
      </div>
    </div>
  );
}

function SectionTitle({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      className="absolute left-0 top-0 text-white font-black uppercase rounded-br-md"
      style={{ background: color || '#1b2d50', padding: '0.8mm 3mm', fontSize: '8px' }}
    >
      {children}
    </div>
  );
}

function AmountRow({
  label,
  value,
  negative,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  return (
    <div className={`flex justify-between ${negative ? 'text-[#ba1825]' : ''}`} style={{ marginBottom: '1mm' }}>
      <span className="font-semibold">{label}</span>
      <span className="font-mono font-bold">{negative ? `- ${(value || 0).toLocaleString()}` : (value || 0).toLocaleString()}</span>
    </div>
  );
}
