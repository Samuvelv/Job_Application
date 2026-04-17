// src/app/shared/components/chip-multi-select/chip-multi-select.component.ts
import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges,
  signal, computed, ElementRef, HostListener, forwardRef, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface ChipOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-chip-multi-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ChipMultiSelectComponent),
    multi: true,
  }],
  template: `
    <div class="cms-wrap" [class.cms-open]="open()" [class.cms-disabled]="disabled">

      <!-- Selected chips + trigger row -->
      <div class="cms-trigger" (click)="toggle()" [class.cms-invalid]="invalid">
        @if (selectedValues().length === 0) {
          <span class="cms-placeholder">{{ placeholder }}</span>
        }
        @for (val of selectedValues(); track val) {
          <span class="cms-chip" (click)="$event.stopPropagation()">
            {{ labelFor(val) }}
            <button type="button" class="cms-chip-remove" (click)="remove(val); $event.stopPropagation()">
              <i class="bi bi-x"></i>
            </button>
          </span>
        }
        <i class="bi ms-auto flex-shrink-0"
           [class.bi-chevron-down]="!open()"
           [class.bi-chevron-up]="open()"></i>
      </div>

      <!-- Dropdown -->
      @if (open()) {
        <div class="cms-dropdown">
          <!-- Search -->
          <div class="ss-search-wrap">
            <i class="bi bi-search ss-search-icon"></i>
            <input
              #searchEl
              class="ss-search"
              type="text"
              placeholder="Search..."
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

          <!-- Options -->
          <ul class="ss-list">
            @for (opt of filteredOptions(); track opt.value) {
              <li
                class="ss-option"
                [class.ss-selected]="isSelected(opt.value)"
                (click)="toggle_option(opt.value)"
              >
                <i class="bi me-2"
                   [class.bi-check-square-fill]="isSelected(opt.value)"
                   [class.bi-square]="!isSelected(opt.value)"></i>
                {{ opt.label }}
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
export class ChipMultiSelectComponent implements OnChanges, OnInit, ControlValueAccessor {
  @Input() options: ChipOption[] = [];
  @Input() placeholder = 'Select...';
  @Input() invalid = false;
  @Input() disabled = false;

  selectedValues = signal<string[]>([]);
  open = signal(false);
  query = '';
  private filteredOpts = signal<ChipOption[]>([]);
  filteredOptions = computed(() => this.filteredOpts());

  private onChange: (v: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elRef: ElementRef) {}

  ngOnInit() { this.filteredOpts.set(this.options); }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['options']) this.filteredOpts.set(this.options);
  }

  labelFor(val: string) {
    return this.options.find((o) => o.value === val)?.label ?? val;
  }

  isSelected(val: string) {
    return this.selectedValues().includes(val);
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

  toggle_option(val: string) {
    const cur = this.selectedValues();
    const next = cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val];
    this.selectedValues.set(next);
    this.onChange(next);
    this.onTouched();
  }

  remove(val: string) {
    const next = this.selectedValues().filter((v) => v !== val);
    this.selectedValues.set(next);
    this.onChange(next);
    this.onTouched();
  }

  onQuery(q: string) {
    const lower = q.toLowerCase();
    this.filteredOpts.set(this.options.filter((o) => o.label.toLowerCase().includes(lower)));
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    if (!this.elRef.nativeElement.contains(e.target)) this.open.set(false);
  }

  // ControlValueAccessor
  writeValue(val: string[] | null) { this.selectedValues.set(val ?? []); }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.disabled = d; }
}
