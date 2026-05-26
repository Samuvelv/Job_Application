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
import { CookieConsentBannerComponent } from './shared/components/cookie-consent-banner/cookie-consent-banner.component';
import { CookiePreferencesModalComponent } from './shared/components/cookie-preferences-modal/cookie-preferences-modal.component';
import { FooterComponent } from './shared/components/footer/footer.component';
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
    CookieConsentBannerComponent,
    CookiePreferencesModalComponent,
    FooterComponent,
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

      <!-- Main content + Footer column -->
      <div class="app-layout">
        <div class="app-main-col" [class.sidebar-collapsed]="sidebar.isCollapsed()">
          <main class="main-content">
            <router-outlet />
          </main>
          <!-- Footer — rendered inside the authenticated shell only -->
          <app-footer />
        </div>
      </div>
    } @else {
      <!-- Public pages — full-height column so footer pins to viewport bottom -->
      <div class="public-layout">
        <router-outlet />
        <app-footer />
      </div>
    }

    <!-- Global overlays — rendered outside the shell so they appear on every page -->
    <app-toast-container />
    <app-confirm-dialog />
    <!-- Cookie consent banner — shown to any visitor who has not yet given consent -->
    <app-cookie-consent-banner />
    <!-- Cookie preferences modal — opened from banner or footer "Manage Cookies" -->
    <app-cookie-preferences-modal />
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
        const isPublic = PUBLIC_ROUTES.some(r =>
          r === '/' ? url === '/' : url.startsWith(r)
        );
        this.showShell.set(auth.isLoggedIn() && !isPublic);
      });
  }
}
