import { Component, computed, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Phrase, EnglishLevel, TOPICS_BY_LEVEL } from '../../core/models/app.models';
import { PhraseService } from '../../core/services/phrase.service';
import { AiPhraseService } from '../../core/services/ai-phrase.service';
import { TtsService } from '../../core/services/tts.service';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../core/services/modal.service';

@Component({
  selector: 'app-phrases',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './phrases.component.html',
  styleUrls: ['../_phrase-shared.css', './phrases.component.css']
})
export class PhrasesComponent {
  aiLevel: EnglishLevel = 'auto';
  aiTopic = 'General Topics';
  aiCount = 8;
  loading = signal(false);
  showGenerator = signal(false);

  selectedIds = signal<Set<string>>(new Set());
  isCustomTopic = signal(false);
  
  // Paginación
  currentPage = signal(1);
  pageSize = 5;
  totalItems = signal(0);

  suggestedTopics = computed(() => TOPICS_BY_LEVEL[this.aiLevel] || TOPICS_BY_LEVEL['auto']);

  constructor(
    public readonly service: PhraseService, 
    private readonly ai: AiPhraseService, 
    public readonly tts: TtsService,
    private readonly modal: ModalService
  ) {
    // Cargar página inicial y reaccionar a cambios de página
    effect(() => {
      this.fetchPage(this.currentPage());
    }, { allowSignalWrites: true });

    // Registrar recarga para que toggleMastered/toggleFavorite/delete refresquen la lista
    this.service.registerReload((silent: boolean) => this.fetchPage(this.currentPage(), silent));
  }

  private async fetchPage(page: number, silent = false) {
    const result = await this.service.loadPage(page - 1, this.pageSize, false, undefined, silent);
    this.totalItems.set(result.total);
  }

  dailyPhrase = computed(() => {
    const phrases = this.service.phrases();
    if (phrases.length === 0) return null;
    const day = new Date().getDate();
    return phrases[day % phrases.length];
  });

  onLevelChange(): void {
    const topics = this.suggestedTopics();
    this.aiTopic = topics[0];
    this.isCustomTopic.set(false);
  }

  onTopicChange(value: string): void {
    if (value === 'custom') {
      this.isCustomTopic.set(true);
      this.aiTopic = '';
    } else {
      this.isCustomTopic.set(false);
      this.aiTopic = value;
    }
  }

  filtered = computed(() => this.service.phrases()); // Ya vienen filtradas del servidor

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize));

  groupedPhrases = computed(() => {
    const groups: { [key: string]: Phrase[] } = {};
    this.filtered().forEach(p => {
      const date = (p.createdAt || new Date().toISOString()).slice(0, 10);
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

  async bulkMarkMastered(): Promise<void> {
    const ids = Array.from(this.selectedIds());
    await this.service.bulkUpdateState(ids, { mastered: true });
    this.selectedIds.set(new Set());
  }

  async bulkDelete(): Promise<void> {
    const count = this.selectedIds().size;
    this.modal.confirm({
      title: 'Delete Phrases',
      message: `Are you sure you want to delete ${count} phrases? This cannot be undone.`,
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
      title: 'Delete Phrase',
      message: `Are you sure you want to delete this phrase?`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: () => this.service.delete(phrase.id)
    });
  }

  async generateAi(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await this.ai.generate({ 
        topic: this.aiTopic, 
        count: this.aiCount, 
        level: this.aiLevel, 
        includeSpanish: true, 
        includePronunciation: true 
      });
      
      const newPhrases = (response.phrases as Partial<Phrase>[]).map(p => ({ 
        ...p, 
        mastered: false, 
        source: 'deepseek-v4-flash' 
      })) as Phrase[];

      await this.service.bulkCreate(newPhrases);
      this.showGenerator.set(false);
      this.fetchPage(this.currentPage()); // Asegurar que vemos las nuevas
    } catch (error: any) {
      this.modal.alert('AI Error', error.message, 'danger');
    } finally { this.loading.set(false); }
  }
}
