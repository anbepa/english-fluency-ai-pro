import { Component, computed, signal, inject, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Conversation, ConversationMode, EnglishLevel, TOPICS_BY_LEVEL } from '../../core/models/app.models';
import { AiConversationService } from '../../core/services/ai-conversation.service';
import { ConversationService } from '../../core/services/conversation.service';
import { TtsService } from '../../core/services/tts.service';
import { ModalService } from '../../core/services/modal.service';

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversations.component.html',
  styleUrls: ['../_phrase-shared.css', './conversations.component.css']
})
export class ConversationsComponent implements OnDestroy {
  // Form state
  mode = signal<ConversationMode>('dialogue');
  level: EnglishLevel = 'A2';
  topic = 'Ordering at a coffee shop';
  length = 6;
  isCustomTopic = signal(false);

  loading = signal(false);
  showGenerator = signal(true);

  expandedId = signal<string | null>(null);
  /** Conversación actualmente reproduciéndose (id) */
  currentlyPlaying = signal<string | null>(null);
  private currentSequence: { cancel: () => void } | null = null;

  public readonly service = inject(ConversationService);
  private readonly ai = inject(AiConversationService);
  public readonly tts = inject(TtsService);
  private readonly modal = inject(ModalService);

  modes = AiConversationService.MODES;

  suggestedTopics = computed(() => {
    const fromAi = this.ai.getSuggestedTopics(this.level);
    const fromPhrases = TOPICS_BY_LEVEL[this.level] || [];
    // Combinamos ambos para máxima variedad
    return Array.from(new Set([...fromAi, ...fromPhrases]));
  });

  groupedByDate = computed(() => {
    const groups: Record<string, Conversation[]> = {};
    for (const c of this.service.conversations()) {
      const day = (c.createdAt || new Date().toISOString()).slice(0, 10);
      (groups[day] ||= []).push(c);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  });

  constructor() {
    // Si cambia el nivel, sugerir un topic acorde
    effect(() => {
      const topics = this.suggestedTopics();
      if (!this.isCustomTopic() && topics.length && !topics.includes(this.topic)) {
        this.topic = topics[0];
      }
    }, { allowSignalWrites: true });
  }

  ngOnDestroy(): void {
    this.stopPlayback();
  }

  // ---------- Generator UI ----------
  onLevelChange(): void {
    const topics = this.suggestedTopics();
    this.topic = topics[0] || this.topic;
    this.isCustomTopic.set(false);
  }

  onTopicChange(value: string): void {
    if (value === 'custom') {
      this.isCustomTopic.set(true);
      this.topic = '';
    } else {
      this.isCustomTopic.set(false);
      this.topic = value;
    }
  }

  setMode(m: ConversationMode): void {
    this.mode.set(m);
  }

  async generate(): Promise<void> {
    const cleanTopic = (this.topic || '').trim();
    if (!cleanTopic) {
      this.modal.alert('Topic required', 'Please choose or write a topic before generating.', 'info');
      return;
    }
    this.loading.set(true);
    try {
      const response = await this.ai.generate({
        mode: this.mode(),
        topic: cleanTopic,
        level: this.level,
        length: Math.max(3, Math.min(20, this.length || 6)),
        includeSpanish: true,
        includePronunciation: true
      });
      const created = await this.service.create(response.conversation);
      this.expandedId.set(created.id);
      this.showGenerator.set(false);
    } catch (error: any) {
      this.modal.alert('AI Error', error?.message || 'Could not generate.', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  // ---------- Item actions ----------
  toggleExpand(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  async toggleFavorite(c: Conversation): Promise<void> {
    await this.service.toggleFavorite(c.id);
  }

  onDelete(c: Conversation): void {
    this.modal.confirm({
      title: 'Delete conversation',
      message: 'Are you sure you want to delete this conversation? This cannot be undone.',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        if (this.currentlyPlaying() === c.id) this.stopPlayback();
        await this.service.delete(c.id);
        if (this.expandedId() === c.id) this.expandedId.set(null);
      }
    });
  }

  // ---------- TTS ----------
  speakLine(text: string, speaker: 'A' | 'B' | 'NARRATOR'): void {
    this.tts.speak(text, 'en', speaker);
  }

  playFull(c: Conversation): void {
    if (this.currentlyPlaying() === c.id) {
      this.stopPlayback();
      return;
    }
    this.stopPlayback();

    const items = c.lines.map(l => ({ text: l.textEn, speaker: l.speaker }));
    this.currentlyPlaying.set(c.id);
    this.currentSequence = this.tts.speakSequence(items, {
      lang: 'en',
      gapMs: c.mode === 'paragraph' ? 250 : 450,
      playId: `conv:${c.id}`,
      onDone: () => {
        if (this.currentlyPlaying() === c.id) this.currentlyPlaying.set(null);
      }
    });
  }

  stopPlayback(): void {
    this.currentSequence?.cancel();
    this.currentSequence = null;
    this.currentlyPlaying.set(null);
  }

  // ---------- Helpers ----------
  speakerLabel(s: 'A' | 'B' | 'NARRATOR'): string {
    if (s === 'A') return 'A';
    if (s === 'B') return 'B';
    return '•';
  }

  modeLabel(m: ConversationMode): string {
    return m === 'paragraph' ? 'Paragraph' : 'Dialogue';
  }
}
