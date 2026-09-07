import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

export type ColorSchemePreference = 'light' | 'dark' | 'system';

const storageKey = 'contacts-manager.color-scheme';

/** The class the preset's darkModeSelector watches for. */
const darkClass = 'app-dark';

/**
 * Remembers whether the user wants light, dark, or whatever the operating system is doing, and
 * keeps the one class the theme keys off in step with that choice.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly preference = signal<ColorSchemePreference>(readStoredPreference());

  /** Tracks the OS setting so 'system' stays live rather than being sampled once at startup. */
  private readonly systemPrefersDark = signal(false);

  readonly current = this.preference.asReadonly();

  readonly isDark = computed(() =>
    this.preference() === 'system' ? this.systemPrefersDark() : this.preference() === 'dark',
  );

  constructor() {
    const query = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');

    if (query) {
      this.systemPrefersDark.set(query.matches);
      query.addEventListener('change', (event) => this.systemPrefersDark.set(event.matches));
    }

    effect(() => {
      this.document.documentElement.classList.toggle(darkClass, this.isDark());
    });
  }

  set(preference: ColorSchemePreference): void {
    this.preference.set(preference);

    try {
      this.document.defaultView?.localStorage?.setItem(storageKey, preference);
    } catch {
      // A blocked or full store is not worth failing a page render over.
    }
  }

  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }
}

function readStoredPreference(): ColorSchemePreference {
  try {
    const stored = globalThis.localStorage?.getItem(storageKey);

    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}
