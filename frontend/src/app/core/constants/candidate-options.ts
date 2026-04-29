import { SelectOption } from '../../shared/components/searchable-select/searchable-select.component';

export interface SortOption { value: string; label: string; }

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
  { value: 'not_yet_created',   label: 'Not Yet Created'   },
];
