// src/app/app.component.ts
import { Component, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { TopbarComponent } from './shared/components/topbar/topbar.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { SidebarService } from './core/services/sidebar.service';
import { AuthService } from './core/services/auth.service';
import { CommonModule } from '@angular/common';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { filter } from 'rxjs';

const PUBLIC_ROUTES = ['/', '/login', '/unauthorized'];

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
    @if (showShell()) {
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
      <!-- Public pages (login, unauthorized) -->
      <router-outlet />
    }

    <app-toast-container />
    <app-confirm-dialog />
  `,
})
export class AppComponent {
  showShell = signal(false);

  constructor(
    public auth: AuthService,
    public sidebar: SidebarService,
    router: Router,
  ) {
    router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = (e as NavigationEnd).urlAfterRedirects;
        const isPublic = PUBLIC_ROUTES.some(r => url.startsWith(r));
        this.showShell.set(auth.isLoggedIn() && !isPublic);
      });
  }
}
