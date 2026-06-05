import { Injectable, signal } from '@angular/core';

export type TtsSpeaker = 'A' | 'B' | 'NARRATOR' | 'DEFAULT';

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  /** ID activo (e.g. 'phrase:abc' o 'conv:xyz'); null si nada está sonando. */
  readonly playing = signal<string | null>(null);

  constructor() {}

  /**
   * Usa la API Nativa del Navegador (Web Speech API)
   * Es 100% fiable, no da errores 404 y es gratuita.
   */
  speak(text: string, lang: string = 'en', speaker: TtsSpeaker = 'DEFAULT'): void {
    if (!text || !window.speechSynthesis) return;

    // Cancelar cualquier audio previo
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = this.pitchFor(speaker);

    const bestVoice = this.pickVoice(lang, speaker);
    if (bestVoice) utterance.voice = bestVoice;

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Reproduce una secuencia de líneas con voces alternadas para A y B.
   * Útil para conversaciones tipo diálogo.
   * @returns un objeto con `cancel()` para detener la reproducción.
   */
  speakSequence(
    items: { text: string; speaker?: TtsSpeaker }[],
    opts: { lang?: string; gapMs?: number; playId?: string; onDone?: () => void } = {}
  ): { cancel: () => void } {
    const lang = opts.lang || 'en';
    const gapMs = opts.gapMs ?? 350;
    const playId = opts.playId || 'sequence';

    if (!window.speechSynthesis) {
      opts.onDone?.();
      return { cancel: () => {} };
    }

    window.speechSynthesis.cancel();
    this.playing.set(playId);

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const speakIndex = (i: number) => {
      if (cancelled) return;
      if (i >= items.length) {
        this.playing.set(null);
        opts.onDone?.();
        return;
      }
      const it = items[i];
      const utterance = new SpeechSynthesisUtterance(it.text);
      utterance.lang = lang;
      utterance.rate = 0.92;
      utterance.pitch = this.pitchFor(it.speaker || 'DEFAULT');
      const v = this.pickVoice(lang, it.speaker || 'DEFAULT');
      if (v) utterance.voice = v;
      utterance.onend = () => {
        if (cancelled) return;
        timer = setTimeout(() => speakIndex(i + 1), gapMs);
      };
      utterance.onerror = () => {
        if (cancelled) return;
        timer = setTimeout(() => speakIndex(i + 1), gapMs);
      };
      window.speechSynthesis.speak(utterance);
    };

    speakIndex(0);

    return {
      cancel: () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        window.speechSynthesis.cancel();
        if (this.playing() === playId) this.playing.set(null);
      }
    };
  }

  stop(): void {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    this.playing.set(null);
  }

  // -------------------- Internos --------------------
  private pitchFor(speaker: TtsSpeaker): number {
    switch (speaker) {
      case 'A': return 1.05;
      case 'B': return 0.92;
      case 'NARRATOR': return 1.0;
      default: return 1.0;
    }
  }

  private pickVoice(lang: string, speaker: TtsSpeaker): SpeechSynthesisVoice | undefined {
    const voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith(lang));
    if (voices.length === 0) return undefined;

    // Prioriza voces "naturales" / Google
    const sortedByQuality = [...voices].sort((a, b) => this.qualityScore(b) - this.qualityScore(a));

    if (speaker === 'A' || speaker === 'B') {
      // Intentar separar por género o nombre
      const female = sortedByQuality.find(v => /female|woman|samantha|victoria|karen|moira|tessa|fiona|google us english/i.test(v.name));
      const male = sortedByQuality.find(v => /male|man|daniel|fred|alex|aaron|tom|google uk english male|microsoft.*male/i.test(v.name));

      if (speaker === 'A') return female || sortedByQuality[0];
      if (speaker === 'B') return male || sortedByQuality[1] || sortedByQuality[0];
    }

    return sortedByQuality[0];
  }

  private qualityScore(v: SpeechSynthesisVoice): number {
    const n = v.name.toLowerCase();
    let s = 0;
    if (n.includes('google')) s += 5;
    if (n.includes('natural')) s += 4;
    if (n.includes('neural')) s += 4;
    if (n.includes('microsoft')) s += 3;
    if (n.includes('premium')) s += 2;
    if (n.includes('en-us') || v.lang === 'en-US') s += 1;
    return s;
  }
}

