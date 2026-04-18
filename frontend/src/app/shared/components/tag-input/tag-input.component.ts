// src/app/shared/components/tag-input/tag-input.component.ts
import {
  Component, forwardRef, signal, Input, HostListener,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="tag-input-field" [class.disabled]="isDisabled">
      <!-- Existing chips -->
      @for (tag of tags(); track tag) {
        <span class="tag-chip">
          {{ tag }}
          @if (!isDisabled) {
            <button type="button" class="tag-chip-remove" (click)="remove(tag)" [attr.aria-label]="'Remove ' + tag">
              <i class="bi bi-x"></i>
            </button>
          }
        </span>
      }

      <!-- Input -->
      @if (!isDisabled) {
        <input
          class="tag-input-inner"
          [placeholder]="tags().length === 0 ? placeholder : ''"
          [(ngModel)]="inputValue"
          (keydown)="onKeydown($event)"
          (blur)="commitInput()"
        />
      }
    </div>
  `,
})
export class TagInputComponent implements ControlValueAccessor {
  @Input() placeholder = 'Add a tag…';
  @Input() separator   = ',';

  tags      = signal<string[]>([]);
  inputValue = '';
  isDisabled = false;

  private onChange = (_: string[]) => {};
  private onTouched = () => {};

  writeValue(value: string[]): void {
    this.tags.set(Array.isArray(value) ? [...value] : []);
  }
  registerOnChange(fn: (v: string[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.isDisabled = disabled; }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === this.separator || event.key === 'Tab') {
      event.preventDefault();
      this.commitInput();
    } else if (event.key === 'Backspace' && !this.inputValue) {
      const current = this.tags();
      if (current.length) this.removeAt(current.length - 1);
    }
  }

  commitInput(): void {
    const val = this.inputValue.trim().replace(/,$/, '').trim();
    if (val && !this.tags().includes(val)) {
      this.tags.update(t => [...t, val]);
      this.emit();
    }
    this.inputValue = '';
    this.onTouched();
  }

  remove(tag: string): void {
    this.tags.update(t => t.filter(x => x !== tag));
    this.emit();
  }

  private removeAt(index: number): void {
    this.tags.update(t => t.filter((_, i) => i !== index));
    this.emit();
  }

  private emit(): void {
    this.onChange(this.tags());
  }
}
