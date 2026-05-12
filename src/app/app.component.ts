import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ModalComponent } from './shared/components/modal/modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ModalComponent],
  template: `
    <main class="container">
      <header style="text-align: center; margin-bottom: 40px; margin-top: 20px;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 30px;">
          <span style="font-size: 32px;">🎙️</span>
          <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -1px;">ñañelis <span style="color: var(--accent);">AI</span> Pro</h1>
        </div>

        <!-- Segmented Control Estilo iOS -->
        <nav class="segmented-control">
          <button routerLink="/phrases" routerLinkActive="active" class="segment">Smart Phrases</button>
          <button routerLink="/mastered" routerLinkActive="active" class="segment">Mastered Collection</button>
        </nav>
      </header>

      <router-outlet></router-outlet>
      <app-modal></app-modal>
    </main>
  `,
  styles: [`
    .segmented-control {
      display: flex;
      background: #e3e3e8;
      padding: 3px;
      border-radius: 14px;
      margin: 0 auto;
      max-width: 400px;
      position: relative;
    }
    .segment {
      flex: 1;
      padding: 10px 16px;
      border-radius: 11px;
      border: none;
      font-size: 14px;
      font-weight: 600;
      color: #3a3a3c;
      background: transparent;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1;
    }
    .segment.active {
      background: white;
      color: #000;
      box-shadow: 0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04);
    }
  `]
})
export class AppComponent {}
