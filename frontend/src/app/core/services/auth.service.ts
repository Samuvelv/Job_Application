// src/app/core/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginPayload, User, UserRole } from '../models/user.model';

const TOKEN_KEY = 'th_access_token';
const USER_KEY  = 'th_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  // Reactive signal for current user — components can read this directly
  currentUser = signal<User | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  // ── Login ────────────────────────────────────────────────────────────────────
  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, payload).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.accessToken);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.currentUser.set(res.user);
      }),
    );
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  logout(): void {
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
      complete: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  // ── Refresh access token ──────────────────────────────────────────────────────
  refreshToken(): Observable<{ accessToken: string }> {
    return this.http
      .post<{ accessToken: string }>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res) => localStorage.setItem(TOKEN_KEY, res.accessToken)),
        catchError((err) => {
          this.clearSession();
          return throwError(() => err);
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
}
