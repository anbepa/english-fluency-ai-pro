import { Injectable, inject, signal } from '@angular/core';
import { Phrase, EnglishLevel } from '../models/app.models';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class PhraseService {
  private readonly supabase = inject(SupabaseService);
  private readonly state = signal<Phrase[]>([]);
  readonly phrases = this.state.asReadonly();
  readonly isLoading = signal(true);

  constructor() {}

  private reloadCallback: ((silent: boolean) => void) | null = null;

  registerReload(fn: (silent: boolean) => void) {
    this.reloadCallback = fn;
  }

  private triggerReload() {
    this.reloadCallback?.(true); // Siempre recargamos silenciosamente después de una acción
  }

  // Traductor de niveles para compatibilidad con la base de datos
  private mapLevelToDb(level: EnglishLevel): string {
    switch (level) {
      case 'A1': case 'A2': return 'beginner';
      case 'B1': case 'B2': return 'intermediate';
      case 'C1': return 'advanced';
      default: return 'beginner';
    }
  }

  private mapDbToLevel(dbLevel: string): EnglishLevel {
    const level = dbLevel?.toLowerCase();
    if (level === 'beginner') return 'A1';
    if (level === 'intermediate') return 'B1';
    if (level === 'advanced') return 'C1';
    return 'A1';
  }

  private mapRow(row: any): Phrase {
    return {
      id: row.id,
      textEn: row.text_en,
      textEs: row.text_es,
      pronunciation: row.pronunciation,
      topic: row.topic,
      level: this.mapDbToLevel(row.level),
      favorite: !!row.favorite,
      mastered: !!row.is_mastered,
      source: row.source,
      createdAt: row.created_at
    };
  }

  async loadPage(page: number, pageSize: number, mastered: boolean, dateFilter?: string, silent = false): Promise<{ phrases: Phrase[], total: number }> {
    if (!this.supabase.client) return { phrases: [], total: 0 };
    
    if (!silent) {
      this.isLoading.set(true);
      this.state.set([]); // Solo limpiamos si no es una recarga silenciosa
    }

    try {
      let query = this.supabase.client
        .from('phrases')
        .select('*', { count: 'exact' })
        .eq('is_mastered', mastered);

      if (dateFilter) {
        query = query.gte('created_at', `${dateFilter}T00:00:00`)
                     .lte('created_at', `${dateFilter}T23:59:59`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      const mapped = (data as any[]).map(row => this.mapRow(row));
      this.state.set(mapped);
      
      return { phrases: mapped, total: count || 0 };
    } finally {
      this.isLoading.set(false);
    }
  }

  async getRandomDaily(): Promise<Phrase | null> {
    if (!this.supabase.client) return null;
    const { data, error } = await this.supabase.client
      .from('phrases')
      .select('*')
      .eq('is_mastered', false)
      .limit(50); // Traemos una muestra para elegir una al azar localmente de forma barata

    if (error || !data || data.length === 0) return null;
    const randomIdx = Math.floor(Math.random() * data.length);
    return this.mapRow(data[randomIdx]);
  }

  async load(): Promise<void> {
    // Mantener para compatibilidad, pero ahora carga por defecto la primera página de aprendizaje
    await this.loadPage(0, 5, false);
  }

  async bulkCreate(items: Omit<Phrase, 'id' | 'createdAt'>[]): Promise<Phrase[]> {
    if (!this.supabase.client) return [];

    const rows = items.map(item => ({ 
      text_en: item.textEn,
      text_es: item.textEs,
      pronunciation: item.pronunciation || '',
      topic: item.topic || 'General',
      level: this.mapLevelToDb(item.level),
      favorite: !!item.favorite,
      is_mastered: !!item.mastered,
      source: item.source || 'ai'
    }));

    const { data, error } = await this.supabase.client
      .from('phrases')
      .insert(rows)
      .select();
    
    if (data && !error) {
      const mapped = (data as any[]).map(row => this.mapRow(row));
      this.state.update(current => [...mapped, ...current]);
      return mapped;
    }
    return [];
  }

  async update(id: string, data: Partial<Omit<Phrase, 'id' | 'createdAt'>>): Promise<void> {
    this.state.update(items => items.map(item => item.id === id ? { ...item, ...data } : item));

    if (this.supabase.client) {
      const row: any = {};
      if (data.textEn !== undefined) row.text_en = data.textEn;
      if (data.textEs !== undefined) row.text_es = data.textEs;
      if (data.pronunciation !== undefined) row.pronunciation = data.pronunciation;
      if (data.topic !== undefined) row.topic = data.topic;
      if (data.level !== undefined) row.level = this.mapLevelToDb(data.level);
      if (data.favorite !== undefined) row.favorite = data.favorite;
      if (data.mastered !== undefined) row.is_mastered = data.mastered;
      row.updated_at = new Date().toISOString();

      await this.supabase.client.from('phrases').update(row).eq('id', id);
    }
  }

  async delete(id: string): Promise<void> {
    this.state.update(items => items.filter(item => item.id !== id));
    if (this.supabase.client) {
      await this.supabase.client.from('phrases').delete().eq('id', id);
    }
    this.triggerReload();
  }

  async bulkUpdateState(ids: string[], updates: Partial<Phrase>): Promise<void> {
    this.state.update(items => items.map(item => ids.includes(item.id) ? { ...item, ...updates } : item));
    if (this.supabase.client) {
      const row: any = {};
      if (updates.mastered !== undefined) row.is_mastered = updates.mastered;
      if (updates.favorite !== undefined) row.favorite = updates.favorite;
      await this.supabase.client.from('phrases').update(row).in('id', ids);
    }
    this.triggerReload();
  }

  async bulkDelete(ids: string[]): Promise<void> {
    this.state.update(items => items.filter(item => !ids.includes(item.id)));
    if (this.supabase.client) {
      await this.supabase.client.from('phrases').delete().in('id', ids);
    }
    this.triggerReload();
  }

  toggleMastered(id: string) {
    const phrase = this.state().find(p => p.id === id);
    if (phrase) this.update(id, { mastered: !phrase.mastered }).then(() => this.triggerReload());
  }

  toggleFavorite(id: string) {
    const phrase = this.state().find(p => p.id === id);
    if (phrase) this.update(id, { favorite: !phrase.favorite }).then(() => this.triggerReload());
  }
}
