import type { JobCard } from '@/types';

/**
 * Creates the form-ready representation of a job card.
 *
 * Keeping the defaults here ensures new and existing job cards use the same
 * shape without coupling the form component to the defaulting rules.
 */
export function createJobCardDraft(initialData?: Partial<JobCard> | null): JobCard {
  const now = new Date().toISOString();

  return {
    id: initialData?.id || '',
    job_card_number: initialData?.job_card_number || '',
    customer_name: initialData?.customer_name || '',
    customer_phone: initialData?.customer_phone || '',
    customer_address: initialData?.customer_address || 'Lahore, Pakistan',
    plate_number: initialData?.plate_number || '',
    make_model: initialData?.make_model || '',
    variant: initialData?.variant || '',
    mileage_km: initialData?.mileage_km || 0,
    body_color: initialData?.body_color || '',
    service_advisor: initialData?.service_advisor || 'Advisor Incharge',
    bay_category: initialData?.bay_category || 'WORKSHOP',
    bay_number: initialData?.bay_number || 1,
    status: initialData?.status || 'IN_PROGRESS',
    fuel_level_percent: initialData?.fuel_level_percent ?? 50,
    handed_over_inventory: {
      spare_wheel: initialData?.handed_over_inventory?.spare_wheel ?? true,
      tools: initialData?.handed_over_inventory?.tools ?? true,
      mats: initialData?.handed_over_inventory?.mats ?? true,
      valuables_cleared: initialData?.handed_over_inventory?.valuables_cleared ?? true,
    },
    inspection_markers: Array.isArray(initialData?.inspection_markers)
      ? initialData.inspection_markers
      : [],
    customer_concern: initialData?.customer_concern || '',
    ai_diagnosis_result: initialData?.ai_diagnosis_result || null,
    work_to_be_done: initialData?.work_to_be_done || '',
    departments:
      Array.isArray(initialData?.departments) && initialData.departments.length > 0
        ? initialData.departments
        : ['Mechanical'],
    itemized_parts: Array.isArray(initialData?.itemized_parts) ? initialData.itemized_parts : [],
    labor_charges: initialData?.labor_charges || 0,
    alignment_charges: initialData?.alignment_charges || 0,
    discount_amount: initialData?.discount_amount || 0,
    advance_deposit: initialData?.advance_deposit || 0,
    parts_total: initialData?.parts_total || 0,
    net_payable: initialData?.net_payable || 0,
    balance_remaining: initialData?.balance_remaining || 0,
    quality_checks: {
      exterior_clean: initialData?.quality_checks?.exterior_clean ?? false,
      interior_clean: initialData?.quality_checks?.interior_clean ?? false,
      engine_area_clean: initialData?.quality_checks?.engine_area_clean ?? false,
      all_systems_checked: initialData?.quality_checks?.all_systems_checked ?? false,
      test_drive_done: initialData?.quality_checks?.test_drive_done ?? false,
      no_warning_lights: initialData?.quality_checks?.no_warning_lights ?? false,
      work_completed: initialData?.quality_checks?.work_completed ?? false,
      customer_satisfied: initialData?.quality_checks?.customer_satisfied ?? false,
    },
    received_by: initialData?.received_by || 'Staff Advisor',
    delivered_by: initialData?.delivered_by || '',
    created_at: initialData?.created_at || now,
    updated_at: initialData?.updated_at || now,
    closed_at: initialData?.closed_at || null,
  };
}
