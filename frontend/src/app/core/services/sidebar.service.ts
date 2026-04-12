// src/app/core/services/sidebar.service.ts
import { Injectable, signal } from '@angular/core';

const COLLAPSE_KEY = 'th_sidebar_collapsed';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  private _open = signal(false);
  readonly isOpen = this._open.asReadonly();

  private _collapsed = signal<boolean>(
    localStorage.getItem(COLLAPSE_KEY) === 'true'
  );
  readonly isCollapsed = this._collapsed.asReadonly();

  open():   void { this._open.set(true); }
  close():  void { this._open.set(false); }
  toggle(): void { this._open.update(v => !v); }

  toggleCollapse(): void {
    this._collapsed.update(v => {
      const next = !v;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }
}
