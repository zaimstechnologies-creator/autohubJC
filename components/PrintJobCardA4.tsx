'use client';

import React from 'react';
import { JobCard } from '@/types';
import { Phone, Globe, MapPin, ShieldCheck, CircleUserRound, CarFront } from 'lucide-react';

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
        style={{ marginBottom: '4mm' }}
      >
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: 'minmax(0, 1fr) 43mm minmax(0, 1fr)',
            minHeight: '27.6mm',
            paddingBottom: 0,
            borderBottom: '0.6mm solid #1b2d50',
          }}
        >
          <div>
            <img
              src="/logo.png"
              alt="Al Shaheen Auto Hub"
              style={{ display: 'block', width: '58mm', height: 'auto', objectFit: 'contain' }}
            />
            <div
              className="flex items-center font-black text-[#1b2d50]"
              style={{ width: '58mm', gap: '1.5mm', marginTop: '1mm', fontSize: '6.5px', letterSpacing: '0.3px' }}
            >
              <span style={{ flex: 1, borderTop: '0.3mm solid #1b2d50' }} />
              <span style={{ whiteSpace: 'nowrap' }}>One Stop Solution</span>
              <span style={{ flex: 1, borderTop: '0.3mm solid #1b2d50' }} />
            </div>
          </div>

          <div style={{ position: 'relative', justifySelf: 'center', width: '48mm', height: '27mm' }}>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                left: '13.5mm',
                width: '0.7mm',
                height: '27mm',
                background: '#1b2d50',
                transform: 'skewX(-23deg)',
                transformOrigin: 'top',
              }}
            />
            <div
              className="absolute right-0 top-0 flex flex-col items-center justify-center bg-[#1b2d50] text-white font-black uppercase text-center"
              style={{
                width: '43mm',
                height: '27mm',
                clipPath: 'polygon(27% 0, 100% 0, 73% 100%, 0 100%)',
                gap: '0.5mm',
              }}
            >
              <div className="flex w-full flex-col items-center" style={{ gap: '0.5mm' }}>
                <img
                  src="/jobcardicon-white.png"
                  alt=""
                  style={{ width: '11mm', height: '11mm', objectFit: 'contain' }}
                />
                <span style={{ width: '100%', fontSize: '10px', letterSpacing: '0.5px', textAlign: 'center' }}>
                  Job Card
                </span>
              </div>
            </div>
          </div>

          <div
            className="flex flex-col text-slate-900"
            style={{
              width: 'max-content',
              justifySelf: 'end',
              gap: '2mm',
              fontSize: '10px',
              lineHeight: 1.3,
            }}
          >
            <div className="flex items-start" style={{ gap: '2mm' }}>
              <MapPin style={{ width: '3.5mm', height: '3.5mm', marginTop: '0.2mm', color: '#ba1825', flexShrink: 0 }} />
              <span>Main Bedian Road, Near Askari 11,<br />DHA Phase 6, Lahore-Pakistan.</span>
            </div>
            <div className="flex items-center" style={{ gap: '2mm' }}>
              <Phone style={{ width: '3.5mm', height: '3.5mm', color: '#ba1825', flexShrink: 0 }} />
              <span className="font-bold">+92 344-1411123 | +92 42 3573 2222</span>
            </div>
            <div className="flex items-center" style={{ gap: '2mm' }}>
              <Globe style={{ width: '3.5mm', height: '3.5mm', color: '#ba1825', flexShrink: 0 }} />
              <span>www.alshaheenautohub.com</span>
            </div>
          </div>
        </div>

        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: '1.2fr 0.8fr 1.2fr',
            gap: '4mm',
            marginTop: '2mm',
            fontSize: '10px',
          }}
        >
          <div className="flex items-end" style={{ gap: '1.5mm' }}>
            <span className="font-bold whitespace-nowrap">Job Card No.</span>
            <span
              className="font-mono font-black text-center"
              style={{ flex: 1, minWidth: 0, borderBottom: '1px solid #475569', fontSize: '13px' }}
            >
              {card.job_card_number}
            </span>
          </div>
          <div className="flex items-end" style={{ gap: '1.5mm' }}>
            <span className="font-bold whitespace-nowrap">Date:</span>
            <span className="font-mono font-bold text-center" style={{ flex: 1, minWidth: 0, borderBottom: '1px solid #475569' }}>
                {formattedDate}
            </span>
          </div>
          <div className="flex items-end" style={{ gap: '1.5mm' }}>
            <span className="font-bold whitespace-nowrap">Time (AM/PM):</span>
            <span className="font-mono font-bold text-center" style={{ flex: 1, minWidth: 0, borderBottom: '1px solid #475569' }}>
                {formattedTime}
            </span>
          </div>
        </div>
      </header>

      {/* Customer and vehicle details */}
      <div className="grid grid-cols-2 print-keep-together" style={{ gap: '4mm', marginBottom: '5mm' }}>
        <DetailBox title="Customer Details" navy icon={<CircleUserRound size={12} strokeWidth={2} />}>
          <DetailRow label="Customer Name" value={card.customer_name} />
          <DetailRow label="Phone No" value={card.customer_phone} mono />
          <DetailRow label="Address" value={card.customer_address || 'Lahore, Pakistan'} multiline />
        </DetailBox>

        <DetailBox title="Vehicle Details" red icon={<CarFront size={12} strokeWidth={2} />}>
          <DetailRow label="Vehicle No." value={card.plate_number} mono red />
          <DetailRow label="Make / Model" value={card.make_model} />
          <DetailRow label="Variant" value={card.variant || 'Standard'} />
          <DetailRow label="KM Reading" value={card.mileage_km ? `${card.mileage_km.toLocaleString()} KM` : 'N/A'} />
          <DetailRow label="Color" value={card.body_color || 'Default'} />
        </DetailBox>
      </div>

      {/* Job type */}
      <section
        className="relative border border-slate-400 rounded-md print-keep-together"
        style={{ padding: '3mm 2mm 2mm', marginBottom: '5mm' }}
      >
        <span
          className="absolute left-1/2 -translate-x-1/2 bg-[#1b2d50] text-white font-bold uppercase rounded"
          style={{ top: '-2.2mm', padding: '0.4mm 4mm', fontSize: '9px' }}
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
                <span style={{ fontSize: '9px', textAlign: 'center' }}>{label}</span>
                <CheckBox checked={checked} />
              </div>
            );
          })}
          <div className="flex flex-col items-center" style={{ gap: '1mm' }}>
            <span style={{ fontSize: '9px', textAlign: 'center' }}>Others</span>
            <CheckBox checked={false} />
          </div>
        </div>
      </section>

      {/* Concern and work */}
      <div className="grid grid-cols-2 print-keep-together" style={{ gap: '3mm', marginBottom: '5mm' }}>
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
          {parts.map((part, index) => (
            <tr key={part.id || index} style={{ height: '10mm' }}>
              <td className="border-t border-r border-slate-300 text-center">{index + 1}</td>
              <td
                className="border-t border-r border-slate-300"
                style={{
                  padding: '1mm 2mm',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {part.description}
              </td>
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
      <div
        className="grid print-keep-together"
        style={{ gridTemplateColumns: '30% minmax(0, 1fr)', gap: '2mm', marginBottom: '3mm' }}
      >
        <div
          className="rounded-md"
          style={{
            padding: '2mm',
            border: '0.4mm solid #1b2d50',
            borderRadius: '1.5mm',
          }}
        >
          <div className="font-black uppercase text-[#ba1825]" style={{ marginBottom: '1.5mm' }}>
            Estimated Cost:
          </div>
          <CostRow label="Labour Charges" value={card.labor_charges} />
          <CostRow label="Parts / Material" value={card.parts_total} />
          <CostRow label="Other Charges" value={card.alignment_charges} />
          <div className="font-black uppercase" style={{ marginTop: '2mm', marginBottom: '1mm' }}>
            Promised Delivery:
          </div>
          <div className="flex items-center" style={{ minHeight: '5mm' }}>
            <span>Date:</span>
            <span className="border-b border-slate-500" style={{ flex: 1, marginLeft: '2mm' }}>{formattedDate}</span>
          </div>
          <div className="flex items-center" style={{ minHeight: '5mm' }}>
            <span style={{ whiteSpace: 'nowrap' }}>Time (AM/PM):</span>
            <span className="border-b border-slate-500" style={{ flex: 1, marginLeft: '2mm' }}>05:00 PM</span>
          </div>
        </div>

        <div className="grid grid-cols-2" style={{ gap: '3mm' }}>
          <SignatureBox title="Customer Approval">
            I authorize the above work to be performed on my vehicle. I've read &amp; agree all the terms &amp; conditions.
          </SignatureBox>
          <SignatureBox title="Vehicle Received By" name={card.received_by || 'Name'} />
          <SignatureBox title="Service Executive" name={card.service_advisor || 'Name'} />
          <SignatureBox title="Vehicle Delivered By" name={card.delivered_by || 'Name'} />
        </div>
      </div>

      {/* Quality and amount */}
      <div className="grid grid-cols-12 print-keep-together" style={{ gap: '2mm', marginBottom: '2mm' }}>
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
            <span>Net Payable (PKR):</span>
            <span className="font-mono">{(card.net_payable || 0).toLocaleString()}</span>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer
        className="flex items-center justify-between bg-[#1b2d50] text-white"
        style={{ minHeight: '9mm', padding: '1.5mm 3mm', gap: '3mm' }}
      >
        <div className="flex items-center" style={{ gap: '1.5mm', whiteSpace: 'nowrap' }}>
          <ShieldCheck style={{ width: '13px', height: '13px', color: '#fff', flexShrink: 0 }} />
          <span>Please Check Goods and Vehicle Before Leaving</span>
          <strong
            className="bg-[#ba1825] text-white"
            style={{ padding: '0.5mm 1mm', whiteSpace: 'nowrap' }}
          >
            Al Shaheen Auto Hub.
          </strong>
        </div>
        <div className="flex items-center" style={{ gap: '2mm', whiteSpace: 'nowrap' }}>
          <span className="italic text-[#d4a359]" style={{ fontFamily: 'Georgia, serif', fontSize: '12px' }}>
            Your Car, Our Care
          </span>
          <span className="font-black" style={{ fontSize: '7px', letterSpacing: '0.6px' }}>
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
  icon,
  children,
}: {
  title: string;
  navy?: boolean;
  red?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative rounded-md print-keep-together"
      style={{ minWidth: 0, padding: '7mm 2mm 2mm', border: '0.35mm solid #1b2d50' }}
    >
      <div
        className="absolute left-0 top-0 flex items-center text-white font-black uppercase"
        style={{
          width: '45mm',
          height: '5mm',
          gap: '1.5mm',
          padding: '0 3mm',
          background: navy ? '#1b2d50' : red ? '#ba1825' : '#1b2d50',
          fontSize: '9px',
          clipPath: 'polygon(0 0, 100% 0, 90% 100%, 0 100%)',
        }}
      >
        <span style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
        <span>{title}</span>
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
  multiline,
}: {
  label: string;
  value: string;
  mono?: boolean;
  red?: boolean;
  multiline?: boolean;
}) {
  const valueClassName = `border-b border-slate-500 ${mono ? 'font-mono' : ''} ${red ? 'text-[#ba1825] font-black' : 'font-semibold'}`;

  if (multiline) {
    return (
      <div
        style={{
          minHeight: '11mm',
          lineHeight: '5.5mm',
          backgroundImage: 'linear-gradient(to bottom, transparent calc(100% - 0.3mm), #64748b calc(100% - 0.3mm))',
          backgroundSize: '100% 5.5mm',
          backgroundRepeat: 'repeat-y',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        <span
          className="font-bold text-slate-700"
          style={{
            display: 'inline-block',
            height: '5.5mm',
            verticalAlign: 'top',
            marginRight: '2mm',
            paddingRight: '1mm',
            background: '#ffffff',
          }}
        >
          {label}
        </span>
        <span className={red ? 'text-[#ba1825] font-black' : 'font-semibold'}>
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start" style={{ minHeight: '5mm' }}>
      <span
        className="font-bold text-slate-700"
        style={{ flexShrink: 0, marginRight: '2mm', whiteSpace: 'nowrap' }}
      >
        {label}
      </span>
      <span
        className={valueClassName}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: '4mm',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
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
      className="relative rounded-md print-keep-together"
      style={{ minHeight: '34mm', padding: '8mm 2mm 2mm', border: '0.4mm solid #1b2d50' }}
    >
      <div
        className="absolute left-0 top-0 flex items-center bg-[#1b2d50] text-white font-black uppercase"
        style={{
          width: '48mm',
          height: '5mm',
          padding: '0 3mm',
          fontSize: '9px',
          clipPath: 'polygon(0 0, 100% 0, 90% 100%, 0 100%)',
        }}
      >
        {title}:
      </div>
      <div
        className="whitespace-pre-wrap"
        style={{
          fontSize: '10px',
          lineHeight: 1.4,
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex items-end" style={{ marginBottom: '1.2mm', minHeight: '5mm' }}>
      <span style={{ whiteSpace: 'nowrap' }}>{label}:</span>
      <span
        className="font-mono font-bold"
        style={{
          flex: 1,
          minWidth: 0,
          marginLeft: '2mm',
          borderBottom: '1px solid #475569',
          whiteSpace: 'nowrap',
        }}
      >
        {(value || 0).toLocaleString()}
      </span>
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
      className="relative border border-slate-700 rounded-md flex flex-col print-keep-together"
      style={{ height: children ? '23mm' : '20mm', padding: '5mm 2mm 1.5mm', borderWidth: '0.4mm' }}
    >
      <SectionTitle>{title}</SectionTitle>
      {children ? (
        <>
          <div style={{ fontSize: '10px', lineHeight: 1.25 }}>
            {children}
          </div>
          <div className="flex items-end" style={{ gap: '2mm', marginTop: 'auto', minHeight: '3mm' }}>
            <span style={{ whiteSpace: 'nowrap' }}>Signature:</span>
            <span style={{ flex: 1, minWidth: 0, borderBottom: '1px solid #475569' }} />
          </div>
        </>
      ) : (
        <div className="flex flex-col justify-center" style={{ flex: 1, minHeight: 0 }}>
          <div className="flex items-center" style={{ minHeight: '4mm', gap: '2mm' }}>
            <span>Name:</span>
            <span
              className="flex items-end"
              style={{ flex: 1, minWidth: 0, borderBottom: '1px solid #475569' }}
            >
              <strong style={{ whiteSpace: 'nowrap' }}>{name}</strong>
            </span>
          </div>
          <div className="flex items-end" style={{ gap: '2mm', marginTop: '1.5mm', minHeight: '3mm' }}>
            <span>Signature:</span>
            <span style={{ flex: 1, minWidth: 0, borderBottom: '1px solid #475569' }} />
          </div>
        </div>
      )}
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
      style={{
        background: color || '#1b2d50',
        padding: '0.8mm 3mm',
        fontSize: '9px',
        clipPath: 'polygon(0 0, 100% 0, 91% 100%, 0 100%)',
      }}
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
      <span className="font-semibold">{label}:</span>
      <span className="font-mono font-bold">{negative ? `- ${(value || 0).toLocaleString()}` : (value || 0).toLocaleString()}</span>
    </div>
  );
}
