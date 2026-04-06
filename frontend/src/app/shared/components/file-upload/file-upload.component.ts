// src/app/shared/components/file-upload/file-upload.component.ts
import {
  Component, forwardRef, signal, Input, HostListener, ElementRef, ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUploadComponent),
      multi: true,
    },
  ],
  template: `
    <div
      class="file-drop-zone"
      [class.dragover]="isDragging()"
      [class.has-file]="!!currentFile()"
      (click)="fileInput.click()"
      (dragover)="onDragOver($event)"
      (dragleave)="isDragging.set(false)"
      (drop)="onDrop($event)"
      role="button"
      tabindex="0"
      (keydown.enter)="fileInput.click()"
    >
      @if (currentFile()) {
        <i class="bi bi-paperclip text-primary fs-4"></i>
        <span class="mt-1 small fw-semibold text-truncate" style="max-width:200px">{{ currentFile()!.name }}</span>
        <button type="button" class="btn btn-link btn-sm text-danger p-0 mt-1"
                (click)="clear($event)">
          <i class="bi bi-trash"></i> Remove
        </button>
      } @else {
        <i class="bi bi-cloud-arrow-up fs-2 text-muted"></i>
        <span class="mt-1 small text-muted">{{ placeholder }}</span>
        <span class="small text-muted opacity-75">{{ hint }}</span>
      }
    </div>
    <input #fileInput type="file" class="d-none"
           [accept]="accept"
           (change)="onFileSelected($event)" />
  `,
})
export class FileUploadComponent implements ControlValueAccessor {
  @Input() placeholder = 'Click or drag & drop to upload';
  @Input() hint        = 'PNG, JPG, PDF — max 5 MB';
  @Input() accept      = 'image/*,.pdf';

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  currentFile = signal<File | null>(null);
  isDragging  = signal(false);
  isDisabled  = false;

  private onChange  = (_: File | null) => {};
  private onTouched = () => {};

  writeValue(value: File | null): void { this.currentFile.set(value); }
  registerOnChange(fn: (v: File | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.isDisabled = disabled; }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.setFile(file);
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.setFile(file);
  }

  clear(event: MouseEvent): void {
    event.stopPropagation();
    this.currentFile.set(null);
    this.fileInput.nativeElement.value = '';
    this.onChange(null);
    this.onTouched();
  }

  private setFile(file: File | null): void {
    this.currentFile.set(file);
    this.onChange(file);
    this.onTouched();
  }
}
