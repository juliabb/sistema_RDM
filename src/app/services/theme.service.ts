import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';
  private renderer: Renderer2;
  private currentThemeSubject = new BehaviorSubject<ThemeMode>('light');
  public currentTheme$ = this.currentThemeSubject.asObservable();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  initTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as ThemeMode | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initialTheme: ThemeMode =
      savedTheme === 'dark' || savedTheme === 'light'
        ? savedTheme
        : prefersDark
          ? 'dark'
          : 'light';

    this.applyTheme(initialTheme);
    this.currentThemeSubject.next(initialTheme);
  }

  toggleTheme(): void {
    const newTheme = this.currentThemeSubject.value === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  setTheme(theme: ThemeMode): void {
    this.applyTheme(theme);
    this.currentThemeSubject.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
  }

  private applyTheme(theme: ThemeMode): void {
    const root = document.documentElement;
    const body = document.body;

    this.renderer.removeClass(root, 'light-theme');
    this.renderer.removeClass(root, 'dark-theme');
    this.renderer.removeClass(body, 'light-theme');
    this.renderer.removeClass(body, 'dark-theme');

    this.renderer.addClass(root, `${theme}-theme`);
    this.renderer.addClass(body, `${theme}-theme`);
  }

  getCurrentTheme(): ThemeMode {
    return this.currentThemeSubject.value;
  }
}
