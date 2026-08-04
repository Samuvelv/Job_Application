import { SelectOption } from '../../shared/components/searchable-select/searchable-select.component';

export interface SortOption { value: string; label: string; }

export const PROFILE_STATUS_OPTIONS: SelectOption[] = [
  { value: 'active',       label: 'OPTIONS.profile_status_active'      },
  { value: 'inactive',     label: 'OPTIONS.profile_status_inactive'    },
  { value: 'pending_edit', label: 'OPTIONS.profile_status_pending_edit'},
  { value: 'placed',       label: 'OPTIONS.profile_status_placed'      },
];

export const PROFILE_STATUS_WITH_COLOR: { value: string; label: string; color: string }[] = [
  { value: 'active',       label: 'OPTIONS.profile_status_active',       color: 'var(--th-success)' },
  { value: 'inactive',     label: 'OPTIONS.profile_status_inactive',     color: 'var(--th-muted)'   },
  { value: 'pending_edit', label: 'OPTIONS.profile_status_pending_edit', color: 'var(--th-warning)' },
  { value: 'placed',       label: 'OPTIONS.profile_status_placed',       color: 'var(--th-info)'    },
];

export const SORT_OPTIONS: SortOption[] = [
  { value: 'newest',       label: 'OPTIONS.sort_newest'      },
  { value: 'oldest',       label: 'OPTIONS.sort_oldest'      },
  { value: 'completion',   label: 'OPTIONS.sort_completion'  },
  { value: 'updated',      label: 'OPTIONS.sort_updated'     },
  { value: 'alphabetical', label: 'OPTIONS.sort_alphabetical'},
];

export const REGISTRATION_FEE_STATUS_OPTIONS: SelectOption[] = [
  { value: 'paid',            label: 'OPTIONS.fee_paid'    },
  { value: 'pending_payment', label: 'OPTIONS.fee_pending' },
  { value: 'waived',          label: 'OPTIONS.fee_waived'  },
];

export const SOURCE_OPTIONS: SelectOption[] = [
  { value: 'Instagram',       label: 'OPTIONS.source_instagram' },
  { value: 'YouTube',         label: 'OPTIONS.source_youtube'   },
  { value: 'WhatsApp',        label: 'OPTIONS.source_whatsapp'  },
  { value: 'Friend Referral', label: 'OPTIONS.source_referral'  },
  { value: 'Other',           label: 'OPTIONS.source_other'     },
];

export const EMPLOYMENT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Currently Employed',   label: 'OPTIONS.emp_employed'   },
  { value: 'Currently Unemployed', label: 'OPTIONS.emp_unemployed' },
  { value: 'Self Employed',        label: 'OPTIONS.emp_self'       },
  { value: 'Student',              label: 'OPTIONS.emp_student'    },
  { value: 'Career Break',         label: 'OPTIONS.emp_break'      },
];

export const VISA_STATUS_OPTIONS: SelectOption[] = [
  { value: 'No Visa - Requires full visa sponsorship',    label: 'OPTIONS.visa_need_sponsorship' },
  { value: 'Have valid visa in current country',          label: 'OPTIONS.visa_have_valid'       },
  { value: 'Have UK/EU visa already',                     label: 'OPTIONS.visa_have_ukeu'        },
  { value: 'Asylum seeker',                               label: 'OPTIONS.visa_asylum'           },
  { value: 'other',                                       label: 'OPTIONS.visa_other'            },
];

export const REASON_FOR_LEAVING_OPTIONS: SelectOption[] = [
  { value: 'Career Growth',      label: 'OPTIONS.reason_career_growth'       },
  { value: 'Better Opportunity', label: 'OPTIONS.reason_better_opportunity'  },
  { value: 'Relocation',         label: 'OPTIONS.reason_relocation'          },
  { value: 'Contract Ended',     label: 'OPTIONS.reason_contract_ended'      },
  { value: 'Redundancy',         label: 'OPTIONS.reason_redundancy'          },
  { value: 'Personal Reasons',   label: 'OPTIONS.reason_personal'            },
  { value: 'Other',              label: 'OPTIONS.reason_other'               },
];

export const RECRUITER_SORT_OPTIONS: SortOption[] = [
  { value: 'newest',       label: 'OPTIONS.rec_sort_newest'      },
  { value: 'oldest',       label: 'OPTIONS.rec_sort_oldest'      },
  { value: 'most_active',  label: 'OPTIONS.rec_sort_most_active' },
  { value: 'alphabetical', label: 'OPTIONS.rec_sort_alphabetical'},
  { value: 'last_active',  label: 'OPTIONS.rec_sort_last_active' },
];
