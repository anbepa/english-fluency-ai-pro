import { Injectable, computed, inject, signal } from '@angular/core';
import { SpeakingSession } from '../models/app.models';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly supabase = inject(SupabaseService);
  private readonly state = signal<SpeakingSession[]>([]);
  readonly sessions = this.state.asReadonly();
  readonly totalSeconds = computed(() => this.state().reduce((sum, item) => sum + item.durationSeconds, 0));

  constructor() {
    this.load();
  }

  async load(): Promise<void> {
    if (!this.supabase.client) return;

    const { data, error } = await this.supabase.client
      .from('speaking_sessions')
      .select('id, date, topic, duration_seconds, fluency_level, notes, phrase_ids, status, created_at')
      .order('created_at', { ascending: false });

    if (data && !error) {
      const mapped = (data as any[]).map(row => ({
        id: row.id,
        date: row.date,
        topic: row.topic,
        durationSeconds: row.duration_seconds,
        fluencyLevel: row.fluency_level,
        notes: row.notes,
        phraseIds: row.phrase_ids,
        status: row.status,
        createdAt: row.created_at
      }));
      this.state.set(mapped as SpeakingSession[]);
    }
  }

  async update(id: string, data: Partial<Omit<SpeakingSession, 'id' | 'createdAt'>>): Promise<void> {
    this.state.update(items => items.map(item => item.id === id ? { ...item, ...data } : item));

    if (this.supabase.client) {
      const row: any = {};
      if (data.date !== undefined) row.date = data.date;
      if (data.topic !== undefined) row.topic = data.topic;
      if (data.durationSeconds !== undefined) row.duration_seconds = data.durationSeconds;
      if (data.fluencyLevel !== undefined) row.fluency_level = data.fluencyLevel;
      if (data.notes !== undefined) row.notes = data.notes;
      if (data.phraseIds !== undefined) row.phrase_ids = data.phraseIds;
      if (data.status !== undefined) row.status = data.status;
      row.updated_at = new Date().toISOString();

      await this.supabase.client
        .from('speaking_sessions')
        .update(row)
        .eq('id', id);
    }
  }

  async create(data: Omit<SpeakingSession, 'id' | 'createdAt'>): Promise<SpeakingSession> {
    const row = { 
      date: data.date,
      topic: data.topic,
      duration_seconds: data.durationSeconds,
      fluency_level: data.fluencyLevel,
      notes: data.notes,
      phrase_ids: data.phraseIds,
      status: data.status,
      created_at: new Date().toISOString() 
    };

    if (this.supabase.client) {
      const { data: created, error } = await this.supabase.client
        .from('speaking_sessions')
        .insert(row)
        .select()
        .single();
      
      if (created && !error) {
        const mapped = {
          id: (created as any).id,
          date: (created as any).date,
          topic: (created as any).topic,
          durationSeconds: (created as any).duration_seconds,
          fluencyLevel: (created as any).fluency_level,
          notes: (created as any).notes,
          phraseIds: (created as any).phrase_ids,
          status: (created as any).status,
          createdAt: (created as any).created_at
        } as SpeakingSession;
        this.state.set([mapped, ...this.state()]);
        return mapped;
      }
    }

    const fallback = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() } as SpeakingSession;
    this.state.set([fallback, ...this.state()]);
    return fallback;
  }

  async delete(id: string): Promise<void> {
    this.state.update(items => items.filter(item => item.id !== id));

    if (this.supabase.client) {
      await this.supabase.client
        .from('speaking_sessions')
        .delete()
        .eq('id', id);
    }
  }
}
