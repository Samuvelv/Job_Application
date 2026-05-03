// src/app/core/services/notification.service.ts
import { Injectable, signal, computed, OnDestroy, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

interface NotificationCounts {
  pendingEdits: number;
  pendingContactRequests: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private counts = signal<NotificationCounts>({
    pendingEdits: 0,
    pendingContactRequests: 0,
  });

  // Public computed properties for UI
  pendingEdits = computed(() => this.counts().pendingEdits);
  pendingContactRequests = computed(() => this.counts().pendingContactRequests);
  totalPending = computed(() => this.counts().pendingEdits + this.counts().pendingContactRequests);

  private pollingInterval: any = null;
  private readonly POLLING_INTERVAL_MS = 30000; // 30 seconds

  constructor() {
    // Only set up for admin users
    const currentUser = this.auth.currentUser();
    if (currentUser?.role === 'admin') {
      // Initial load
      this.refreshCounts();

      // Set up polling
      this.setupPolling();
    }
  }

  /**
   * Set up HTTP polling to refresh notification counts
   */
  private setupPolling(): void {
    // Poll every 30 seconds
    this.pollingInterval = setInterval(() => {
      this.refreshCounts();
    }, this.POLLING_INTERVAL_MS);

    console.log('[NOTIFICATION] Polling started (30s interval)');
  }

  /**
   * Refresh notification counts from HTTP
   */
  private refreshCounts(): void {
    this.http
      .get<NotificationCounts>(`${environment.apiUrl}/stats/notifications/counts`)
      .subscribe({
        next: (data) => {
          this.counts.set(data);
          console.log('[NOTIFICATION] Counts updated:', data);
        },
        error: (err) => {
          console.warn('[NOTIFICATION] Failed to fetch counts:', err);
        },
      });
  }

  /**
   * Get current counts
   */
  getCounts(): NotificationCounts {
    return this.counts();
  }

  /**
   * Stop polling (for cleanup)
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[NOTIFICATION] Polling stopped');
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }
}
