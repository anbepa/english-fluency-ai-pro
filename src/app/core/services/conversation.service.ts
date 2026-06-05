import { Injectable, inject, signal } from '@angular/core';
import { Conversation, ConversationLine, ConversationMode, EnglishLevel } from '../models/app.models';
import { SupabaseService } from './supabase.service';
import { LocalStoreService } from './local-store.service';

const STORAGE_KEY = 'fluency-conversations-v1';

/**
 * Almacena conversaciones generadas por IA.
 * - Si Supabase está configurado y tiene la tabla `conversations`, persiste allí.
 * - En caso contrario (o cualquier error), usa localStorage como fallback.
 *   Esto garantiza que la feature funcione incluso sin migración SQL aplicada.
 */
@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly supabase = inject(SupabaseService);
  private readonly local = inject(LocalStoreService);

  private readonly state = signal<Conversation[]>([]);
  readonly conversations = this.state.asReadonly();
  readonly isLoading = signal(false);
  /** Indica si la última operación recurrió a localStorage (no Supabase) */
  readonly usingLocal = signal(false);

  constructor() {
    this.load();
  }

  // -------------------- Mapeo --------------------
  private mapLevelToDb(level: EnglishLevel): string {
    switch (level) {
      case 'A1': case 'A2': return 'beginner';
      case 'B1': case 'B2': return 'intermediate';
      case 'C1': return 'advanced';
      default: return 'beginner';
    }
  }

  private mapDbToLevel(dbLevel: string): EnglishLevel {
    const level = (dbLevel || '').toLowerCase();
    if (level === 'beginner') return 'A1';
    if (level === 'intermediate') return 'B1';
    if (level === 'advanced') return 'C1';
    // Si vino un CEFR directo (A1/B2/etc), úsalo
    const upper = (dbLevel || '').toUpperCase();
    if (['A1', 'A2', 'B1', 'B2', 'C1'].includes(upper)) return upper as EnglishLevel;
    return 'A1';
  }

  private mapRow(row: any): Conversation {
    const lines: ConversationLine[] = Array.isArray(row.lines) ? row.lines : [];
    return {
      id: row.id,
      mode: (row.mode || 'dialogue') as ConversationMode,
      topic: row.topic || 'General',
      level: this.mapDbToLevel(row.level),
      title: row.title || '',
      summaryEs: row.summary_es || row.summaryEs || '',
      lines,
      source: row.source || 'ai',
      favorite: !!row.favorite,
      createdAt: row.created_at || row.createdAt || new Date().toISOString()
    };
  }

  // -------------------- Persistencia local --------------------
  private readLocal(): Conversation[] {
    return this.local.get<Conversation[]>(STORAGE_KEY, []);
  }

  private writeLocal(items: Conversation[]) {
    this.local.set(STORAGE_KEY, items);
  }

  // -------------------- API pública --------------------
  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      if (this.supabase.client) {
        const { data, error } = await this.supabase.client
          .from('conversations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          this.usingLocal.set(false);
          this.state.set((data as any[]).map(r => this.mapRow(r)));
          return;
        }
      }
      // Fallback localStorage
      this.usingLocal.set(true);
      const items = this.readLocal();
      this.state.set(items);
    } finally {
      this.isLoading.set(false);
    }
  }

  async create(conv: Conversation): Promise<Conversation> {
    if (this.supabase.client && !this.usingLocal()) {
      const row = {
        id: conv.id,
        mode: conv.mode,
        topic: conv.topic,
        level: this.mapLevelToDb(conv.level),
        title: conv.title,
        summary_es: conv.summaryEs,
        lines: conv.lines,
        source: conv.source,
        favorite: conv.favorite
      };
      const { data, error } = await this.supabase.client
        .from('conversations')
        .insert(row)
        .select()
        .single();

      if (!error && data) {
        const mapped = this.mapRow(data);
        this.state.update(items => [mapped, ...items]);
        return mapped;
      }
      // Si falla por tabla inexistente u otro motivo, caemos a local
      this.usingLocal.set(true);
    }

    // Local
    const items = this.readLocal();
    const merged = [conv, ...items];
    this.writeLocal(merged);
    this.state.set(merged);
    return conv;
  }

  async toggleFavorite(id: string): Promise<void> {
    const item = this.state().find(c => c.id === id);
    if (!item) return;
    const nextFav = !item.favorite;

    this.state.update(items => items.map(c => c.id === id ? { ...c, favorite: nextFav } : c));

    if (this.supabase.client && !this.usingLocal()) {
      const { error } = await this.supabase.client
        .from('conversations')
        .update({ favorite: nextFav })
        .eq('id', id);
      if (error) {
        this.usingLocal.set(true);
      } else {
        return;
      }
    }
    const items = this.readLocal().map(c => c.id === id ? { ...c, favorite: nextFav } : c);
    this.writeLocal(items);
  }

  async delete(id: string): Promise<void> {
    this.state.update(items => items.filter(c => c.id !== id));

    if (this.supabase.client && !this.usingLocal()) {
      const { error } = await this.supabase.client
        .from('conversations')
        .delete()
        .eq('id', id);
      if (!error) return;
      this.usingLocal.set(true);
    }
    const items = this.readLocal().filter(c => c.id !== id);
    this.writeLocal(items);
  }
}
