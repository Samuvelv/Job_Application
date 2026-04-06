// src/app/core/services/sidebar.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private _open = signal(false);
  readonly isOpen = this._open.asReadonly();

  open():   void { this._open.set(true); }
  close():  void { this._open.set(false); }
  toggle(): void { this._open.update(v => !v); }
}
