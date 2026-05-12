import { Component, computed, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhraseService } from '../../core/services/phrase.service';
import { TtsService } from '../../core/services/tts.service';
import { FormsModule } from '@angular/forms';
import { Phrase } from '../../core/models/app.models';
import { ModalService } from '../../core/services/modal.service';

@Component({
  selector: 'app-mastered',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mastered.component.html',
  styleUrls: ['../_phrase-shared.css', './mastered.component.css']
})
export class MasteredComponent {
  selectedDate = signal('');
  selectedIds = signal<Set<string>>(new Set());
  
  currentPage = signal(1);
  pageSize = 5;
  totalItems = signal(0);

  public readonly service = inject(PhraseService);
  public readonly tts = inject(TtsService);
  private readonly modal = inject(ModalService);

  constructor() {
    // Resetear página al cambiar la fecha
    effect(() => {
      this.selectedDate();
      this.currentPage.set(1);
    }, { allowSignalWrites: true });

    // Cargar página cuando cambia la página o la fecha
    effect(() => {
      this.fetchPage(this.currentPage(), this.selectedDate());
    }, { allowSignalWrites: true });

    // Registrar recarga para que las acciones individuales refresquen la lista
    this.service.registerReload((silent: boolean) => this.fetchPage(this.currentPage(), this.selectedDate(), silent));
  }

  private async fetchPage(page: number, date?: string, silent = false) {
    const result = await this.service.loadPage(page - 1, this.pageSize, true, date, silent);
    this.totalItems.set(result.total);
  }

  totalMastered = computed(() => this.totalItems());

  filtered = computed(() => this.service.phrases());

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize));

  groupedMastered = computed(() => {
    const mastered = this.filtered();
    const groups: { [key: string]: Phrase[] } = {};
    mastered.forEach(p => {
      const date = p.createdAt.slice(0, 10);
      if (!groups[date]) groups[date] = [];
      groups[date].push(p);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  });

  isAllSelected = computed(() => {
    const current = this.filtered();
    return current.length > 0 && current.every(p => this.selectedIds().has(p.id));
  });

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      const allIds = this.filtered().map(p => p.id);
      this.selectedIds.set(new Set(allIds));
    }
  }

  toggleSelect(id: string): void {
    const newSet = new Set(this.selectedIds());
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    this.selectedIds.set(newSet);
  }

  async bulkRestore(): Promise<void> {
    const ids = Array.from(this.selectedIds());
    await this.service.bulkUpdateState(ids, { mastered: false });
    this.selectedIds.set(new Set());
  }

  async bulkDelete(): Promise<void> {
    const count = this.selectedIds().size;
    this.modal.confirm({
      title: 'Delete Achievements',
      message: `Are you sure you want to delete ${count} achievements? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        const ids = Array.from(this.selectedIds());
        await this.service.bulkDelete(ids);
        this.selectedIds.set(new Set());
      }
    });
  }

  onDelete(phrase: Phrase): void {
    this.modal.confirm({
      title: 'Delete Achievement',
      message: `Are you sure you want to delete this achievement?`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => this.service.delete(phrase.id)
    });
  }
}
