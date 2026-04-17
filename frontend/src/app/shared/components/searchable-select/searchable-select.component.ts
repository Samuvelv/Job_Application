// src/app/shared/components/searchable-select/searchable-select.component.ts
import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges,
  signal, computed, ElementRef, HostListener, forwardRef, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string; // e.g. occupation name under a job title
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SearchableSelectComponent),
    multi: true,
  }],
  template: `
    <div class="ss-wrap" [class.ss-open]="open()" [class.ss-disabled]="disabled">

      <!-- Trigger -->
      <div class="ss-trigger" (click)="toggle()" [class.ss-invalid]="invalid">
        <span class="ss-value" [class.ss-placeholder]="!displayLabel()">
          {{ displayLabel() || placeholder }}
        </span>
        <i class="bi" [class.bi-chevron-down]="!open()" [class.bi-chevron-up]="open()"></i>
      </div>

      <!-- Dropdown -->
      @if (open()) {
        <div class="ss-dropdown">
          <!-- Search input -->
          <div class="ss-search-wrap">
            <i class="bi bi-search ss-search-icon"></i>
            <input
              #searchInput
              class="ss-search"
              type="text"
              [placeholder]="'Search ' + (placeholder || 'options') + '...'"
              [(ngModel)]="query"
              (ngModelChange)="onQuery($event)"
              (click)="$event.stopPropagation()"
              autocomplete="off"
            />
            @if (query) {
              <button class="ss-clear-search" type="button" (click)="query=''; onQuery('')">
                <i class="bi bi-x"></i>
              </button>
            }
          </div>

          <!-- Options list -->
          <ul class="ss-list">
            @if (allowClear && selectedValue() !== null && selectedValue() !== '') {
              <li class="ss-option ss-clear-option" (click)="select(null)">
                <i class="bi bi-x-circle me-1"></i>Clear selection
              </li>
            }
            @for (opt of filteredOptions(); track opt.value) {
              <li
                class="ss-option"
                [class.ss-selected]="opt.value === selectedValue()"
                (click)="select(opt.value)"
              >
                <span class="ss-opt-label">{{ opt.label }}</span>
                @if (opt.sublabel) {
                  <span class="ss-opt-sub">{{ opt.sublabel }}</span>
                }
              </li>
            } @empty {
              <li class="ss-empty">No results found</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class SearchableSelectComponent implements OnChanges, OnInit, ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Select...';
  @Input() allowClear = true;
  @Input() invalid = false;
  @Input() disabled = false;

  selectedValue = signal<string | number | null>(null);
  open = signal(false);
  query = '';
  private filteredOpts = signal<SelectOption[]>([]);

  filteredOptions = computed(() => this.filteredOpts());

  displayLabel = computed(() => {
    const v = this.selectedValue();
    if (v === null || v === '') return '';
    return this.options.find((o) => String(o.value) === String(v))?.label ?? '';
  });

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elRef: ElementRef) {}

  ngOnInit() { this.filteredOpts.set(this.options); }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['options']) {
      this.filteredOpts.set(this.options);
    }
  }

  toggle() {
    if (this.disabled) return;
    this.open.update((v) => !v);
    if (this.open()) {
      this.query = '';
      this.filteredOpts.set(this.options);
      setTimeout(() => (this.elRef.nativeElement.querySelector('.ss-search') as HTMLInputElement)?.focus(), 50);
    }
  }

  onQuery(q: string) {
    const lower = q.toLowerCase();
    this.filteredOpts.set(
      this.options.filter(
        (o) => o.label.toLowerCase().includes(lower) || (o.sublabel ?? '').toLowerCase().includes(lower),
      ),
    );
  }

  select(val: string | number | null) {
    this.selectedValue.set(val);
    this.onChange(val);
    this.onTouched();
    this.open.set(false);
    this.query = '';
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    if (!this.elRef.nativeElement.contains(e.target)) {
      this.open.set(false);
    }
  }

  // ControlValueAccessor
  writeValue(val: any) { this.selectedValue.set(val ?? null); }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }
}
