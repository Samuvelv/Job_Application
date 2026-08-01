// src/app/core/services/auth.service.ts
import { Injectable, Injector, signal, inject } from '@angular/core';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginPayload, LoginResponse, OtpChallengeResponse, User, UserRole } from '../models/user.model';
import { ToastService } from './toast.service';
import { registerAuthForTabSync } from '../interceptors/jwt.interceptor';
import { TranslateService } from '@ngx-translate/core';

const TOKEN_KEY = 'th_access_token';
const USER_KEY  = 'th_user';

/** How many milliseconds before expiry to show the "session expiring soon" warning. */
const EXPIRY_WARN_MS = 5 * 60 * 1000; // 5 minutes

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  // Reactive signal for current user — components can read this directly
  currentUser = signal<User | null>(this.loadUser());

  // Candidate placement status — set after profile loads; used by sidebar + guard
  candidateStatus = signal<string | null>(null);

  setCandidateStatus(status: string): void {
    this.candidateStatus.set(status);
  }

  private readonly httpBackend = inject(HttpBackend);
  private readonly injector = inject(Injector);

  // Resolved lazily (not via constructor injection) to avoid a circular DI
  // chain: AuthService is injected eagerly by jwtInterceptor on every HTTP
  // request, and TranslateService's HTTP loader depends on HttpClient, which
  // depends on the interceptor chain — injecting TranslateService in the
  // constructor here would deadlock DI (NG0200) on the very first request.
  private get translate(): TranslateService {
    return this.injector.get(TranslateService);
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private toast: ToastService,
  ) {
    // Give the BroadcastChannel listener in jwt.interceptor.ts a reference to
    // this service instance.  The listener runs outside Angular's DI context so
    // it cannot call inject() — this setter bridge is the cleanest alternative.
    registerAuthForTabSync(this);

    // Restore the expiry warning timer when the page is hard-reloaded.
    // The service is re-instantiated on every page load, so any previously
    // scheduled timer is lost.  Re-scheduling from the stored token ensures
    // the "session expiring soon" warning still fires for users who reload
    // mid-session without performing any API call before the warning window.
    const storedToken = this.getToken();
    if (storedToken) {
      this.scheduleExpiryWarning(storedToken);
    }
  }

  // ── Session expiry guard — prevents duplicate alerts/redirects ───────────────
  private sessionExpired = false;

  // ── Proactive expiry warning timer ───────────────────────────────────────────
  private expiryWarnTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Schedules a one-time "session expiring soon" toast warning based on the
   * JWT's exp claim.  Called after every successful login or token refresh.
   * Any previously scheduled warning is cancelled first.
   *
   * The warning fires EXPIRY_WARN_MS (5 min) before the token expires, giving
   * the user time to act.  The app will auto-refresh the token on the next API
   * call anyway, but the warning is useful when the user is idle on a form.
   */
  scheduleExpiryWarning(accessToken: string): void {
    this.cancelExpiryWarning();

    try {
      // Decode the JWT payload (base64url, middle segment) — no verification
      // needed here; we only want the exp timestamp for UI scheduling.
      const payloadBase64 = accessToken.split('.')[1];
      if (!payloadBase64) return;
      const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
      const expMs = (payload.exp as number) * 1000;
      const warnAt = expMs - EXPIRY_WARN_MS;
      const delay = warnAt - Date.now();

      if (delay <= 0) return; // already within the warning window or expired

      this.expiryWarnTimer = setTimeout(() => {
        // Only show the warning if the user is still logged in
        if (this.isLoggedIn()) {
          this.toast.warning(this.translate.instant('AUTH.session_expiring_soon'));
        }
      }, delay);
    } catch {
      // Non-fatal: malformed token — warning simply won't appear
    }
  }

  private cancelExpiryWarning(): void {
    if (this.expiryWarnTimer !== null) {
      clearTimeout(this.expiryWarnTimer);
      this.expiryWarnTimer = null;
    }
  }

  /**
   * Called by interceptors when the token (and refresh token) are both invalid.
   * Clears all auth storage, shows a toast, and redirects to /login.
   * The sessionExpired flag ensures this runs only once even when multiple
   * in-flight requests fail simultaneously.
   */
  handleSessionExpiry(): void {
    if (this.sessionExpired) return;
    this.sessionExpired = true;

    this.cancelExpiryWarning();

    // Clear all auth-related storage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem('auth:pendingEmail');

    // Reset in-memory state
    this.currentUser.set(null);
    this.candidateStatus.set(null);

    // Show toast first — delay redirect so the user can read it before leaving the page
    this.toast.warning(this.translate.instant('MESSAGES.session_expired'));

    setTimeout(() => {
      this.sessionExpired = false; // reset so the guard works after fresh login
      this.router.navigate(['/login']);
    }, 1500);
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  login(payload: LoginPayload): Observable<LoginResponse> {
    // withCredentials is required in cross-origin environments (e.g. local
    // development where the frontend runs on :4200 and the backend on :3000)
    // so that the browser stores the HttpOnly refresh token cookie from the
    // Set-Cookie response header.  In production the nginx proxy makes this
    // same-origin, but withCredentials is harmless there and keeps the
    // behaviour consistent across environments.
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, payload, { withCredentials: true }).pipe(
      tap((res) => {
        this.sessionExpired = false; // reset expiry guard on fresh login
        if (!('requiresOtp' in res)) {
          localStorage.setItem(TOKEN_KEY, res.accessToken);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.currentUser.set(res.user);
          this.scheduleExpiryWarning(res.accessToken);
        }
      }),
    );
  }

  // ── Verify OTP (step 2 of admin login) ───────────────────────────────────────
  verifyOtp(otpToken: string, otp: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/verify-otp`, { otpToken, otp }, { withCredentials: true })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.accessToken);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.currentUser.set(res.user);
          this.scheduleExpiryWarning(res.accessToken);
        }),
      );
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────────
  resendOtp(otpToken: string): Observable<OtpChallengeResponse> {
    return this.http.post<OtpChallengeResponse>(`${this.apiUrl}/auth/resend-otp`, { otpToken });
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  logout(): void {
    // If the access token is already expired (or missing) we should avoid
    // calling the server-side logout endpoint because it requires a valid
    // access token and will return 401. In that case perform a client-side
    // logout immediately.
    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) {
      this.clearSession();
      return;
    }

    // withCredentials is required so the browser sends the HttpOnly refresh token
    // cookie to the backend, allowing it to revoke the token in the DB and clear
    // the cookie via Set-Cookie in the response.
    this.http.post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true }).subscribe({
      complete: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }

  private clearSession(): void {
    this.cancelExpiryWarning();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.candidateStatus.set(null);
    this.router.navigate(['/login']);
  }

  // ── Refresh access token ──────────────────────────────────────────────────────
  // NOTE: Do NOT add a catchError here. The jwtInterceptor is the sole owner of
  // the refresh-failure path — it calls handleSessionExpiry() which shows the
  // toast and redirects. Adding clearSession() here as well causes a double
  // redirect: an immediate silent redirect followed by a second one 1500ms later
  // with the toast shown on the wrong page.
  refreshToken(): Observable<{ accessToken: string }> {
    // Use an HttpClient bound to the raw HttpBackend to bypass the global
    // interceptors. This prevents the refresh request from being intercepted
    // (which could otherwise try to refresh again on 401 and cause loops).
    const rawHttp = new HttpClient(this.httpBackend);
    return rawHttp
      .post<{ accessToken: string }>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.accessToken);
          // Re-arm the expiry warning for the newly issued access token
          this.scheduleExpiryWarning(res.accessToken);
        }),
      );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getRole(): UserRole | null {
    // Try in-memory signal first
    const fromSignal = this.currentUser()?.role ?? null;
    if (fromSignal) return fromSignal;
    // Fallback: re-hydrate from localStorage (covers hard-refresh with stale signal)
    const stored = this.loadUser();
    if (stored) {
      this.currentUser.set(stored);
      return stored.role;
    }
    return null;
  }

  hasRole(...roles: UserRole[]): boolean {
    const role = this.getRole();
    return role ? roles.includes(role) : false;
  }

  getDashboardRoute(): string {
    const role = this.getRole();
    switch (role) {
      case 'admin':     return '/admin/dashboard';
      case 'candidate':  return '/candidate/dashboard';
      case 'recruiter': return '/recruiter/dashboard';
      default:          return '/login';
    }
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) return true;
      const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
      const exp = payload.exp as number | undefined;
      if (!exp) return true;
      return Date.now() >= exp * 1000;
    } catch {
      return true;
    }
  }
}
