import { SelectOption } from '../../shared/components/searchable-select/searchable-select.component';

export interface SortOption { value: string; label: string; }

export const PROFILE_STATUS_OPTIONS: SelectOption[] = [
  { value: 'active',       label: 'Active'       },
  { value: 'inactive',     label: 'Inactive'     },
  { value: 'pending_edit', label: 'Pending Edit' },
  { value: 'placed',       label: 'Placed'       },
];

export const PROFILE_STATUS_WITH_COLOR: { value: string; label: string; color: string }[] = [
  { value: 'active',       label: 'Active',       color: 'var(--th-success)' },
  { value: 'inactive',     label: 'Inactive',     color: 'var(--th-muted)'   },
  { value: 'pending_edit', label: 'Pending Edit', color: 'var(--th-warning)' },
  { value: 'placed',       label: 'Placed',       color: 'var(--th-info)'    },
];

export const SORT_OPTIONS: SortOption[] = [
  { value: 'newest',       label: 'Newest First'             },
  { value: 'oldest',       label: 'Oldest First'             },
  { value: 'completion',   label: 'Profile Completion ↓' },
  { value: 'updated',      label: 'Last Updated'             },
  { value: 'alphabetical', label: 'Alphabetical A–Z'   },
];

export const REGISTRATION_FEE_STATUS_OPTIONS: SelectOption[] = [
  { value: 'paid',            label: 'Paid'            },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'waived',          label: 'Waived'          },
];

export const CV_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'uk_format',         label: 'UK Format'         },
  { value: 'european_format',   label: 'European Format'   },
  { value: 'canadian_format',   label: 'Canadian Format'   },
  { value: 'australian_format', label: 'Australian Format' },
  { value: 'gulf_format',       label: 'Gulf Format'       },
  { value: 'asian_format',      label: 'Asian Format'      },
  { value: 'others',            label: 'CV Format - Others' },
  { value: 'not_yet_created',   label: 'Not Yet Created'   },
];

export const SOURCE_OPTIONS: SelectOption[] = [
  { value: 'Instagram',       label: 'Instagram'       },
  { value: 'YouTube',         label: 'YouTube'         },
  { value: 'WhatsApp',        label: 'WhatsApp'        },
  { value: 'Friend Referral', label: 'Friend Referral' },
  { value: 'Other',           label: 'Other'           },
];

export const EMPLOYMENT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'Currently Employed',   label: 'Currently Employed'   },
  { value: 'Currently Unemployed', label: 'Currently Unemployed' },
  { value: 'Self Employed',        label: 'Self Employed'        },
  { value: 'Student',              label: 'Student'              },
  { value: 'Career Break',         label: 'Career Break'         },
];

export const VISA_STATUS_OPTIONS: SelectOption[] = [
  { value: 'No visa — need full sponsorship',      label: 'No visa — need full sponsorship'      },
  { value: 'Have valid visa in current country',   label: 'Have valid visa in current country'   },
  { value: 'Have UK/EU visa already',              label: 'Have UK/EU visa already'              },
  { value: 'Asylum seeker',                        label: 'Asylum seeker'                        },
  { value: 'other',                                label: 'Other — specify'                      },
];

export const REASON_FOR_LEAVING_OPTIONS: SelectOption[] = [
  { value: 'Career Growth',      label: 'Career Growth'      },
  { value: 'Better Opportunity', label: 'Better Opportunity' },
  { value: 'Relocation',         label: 'Relocation'         },
  { value: 'Contract Ended',     label: 'Contract Ended'     },
  { value: 'Redundancy',         label: 'Redundancy'         },
  { value: 'Personal Reasons',   label: 'Personal Reasons'   },
  { value: 'Other',              label: 'Other'              },
];

export const RECRUITER_SORT_OPTIONS: SortOption[] = [
  { value: 'newest',       label: 'Newest First'     },
  { value: 'oldest',       label: 'Oldest First'     },
  { value: 'most_active',  label: 'Most Active'      },
  { value: 'alphabetical', label: 'Alphabetical A–Z' },
  { value: 'last_active',  label: 'Last Active'      },
];
