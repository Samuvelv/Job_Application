// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { TopbarComponent } from './shared/components/topbar/topbar.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { SidebarService } from './core/services/sidebar.service';
import { AuthService } from './core/services/auth.service';
import { CommonModule } from '@angular/common';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ToastContainerComponent,
    TopbarComponent,
    SidebarComponent,
    ConfirmDialogComponent,
  ],
  template: `
    @if (auth.isLoggedIn()) {
      <!-- Topbar -->
      <app-topbar />

      <!-- Sidebar backdrop (mobile) -->
      <div class="sidebar-backdrop"
           [class.visible]="sidebar.isOpen()"
           (click)="sidebar.close()">
      </div>

      <!-- Sidebar -->
      <app-sidebar />

      <!-- Main content -->
      <div class="app-layout">
        <main class="main-content" [class.sidebar-collapsed]="sidebar.isCollapsed()">
          <router-outlet />
        </main>
      </div>
    } @else {
      <!-- Unauthenticated: just render the outlet (login page) -->
      <router-outlet />
    }

    <app-toast-container />
    <app-confirm-dialog />
  `,
})
export class AppComponent {
  constructor(
    public auth: AuthService,
    public sidebar: SidebarService,
  ) {}
}
