import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../../core/services/modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (modal.isOpen()) {
      <div class="modal-overlay" (click)="modal.handleCancel()">
        <div class="modal-container animate-in" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-icon" [class]="modal.config()?.type">
              {{ modal.config()?.type === 'danger' ? '⚠️' : 'ℹ️' }}
            </span>
            <h3>{{ modal.config()?.title }}</h3>
          </div>
          
          <div class="modal-body">
            <p>{{ modal.config()?.message }}</p>
          </div>

          <div class="modal-footer">
            @if (modal.config()?.cancelText) {
              <button class="btn-cancel" (click)="modal.handleCancel()">
                {{ modal.config()?.cancelText }}
              </button>
            }
            <button class="btn-confirm" 
                    [class]="modal.config()?.type"
                    (click)="modal.handleConfirm()">
              {{ modal.config()?.confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
    }

    .modal-container {
      background: white;
      width: 100%;
      max-width: 320px;
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      text-align: center;
    }

    .modal-header h3 {
      font-size: 19px;
      font-weight: 800;
      margin: 12px 0 8px 0;
      color: #1d1d1f; /* Color explícito para asegurar visibilidad */
    }

    .modal-icon {
      font-size: 32px;
      display: block;
    }

    .modal-body p {
      font-size: 15px;
      color: #48484a; /* Color explícito gris oscuro */
      line-height: 1.5;
      margin-bottom: 24px;
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }

    .btn-confirm, .btn-cancel {
      flex: 1;
      padding: 14px;
      border-radius: 16px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: transform 0.1s, opacity 0.2s;
    }

    .btn-confirm {
      background: var(--accent);
      color: white;
    }

    .btn-confirm.danger {
      background: var(--danger);
    }

    .btn-cancel {
      background: #f2f2f7;
      color: var(--text-primary);
    }

    .btn-confirm:active, .btn-cancel:active {
      transform: scale(0.96);
    }

    .animate-in {
      animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.9) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `]
})
export class ModalComponent {
  public readonly modal = inject(ModalService);
}
