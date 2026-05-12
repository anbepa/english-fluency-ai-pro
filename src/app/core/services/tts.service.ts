import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  constructor() {}

  /**
   * Usa la API Nativa del Navegador (Web Speech API)
   * Es 100% fiable, no da errores 404 y es gratuita.
   */
  speak(text: string, lang: string = 'en'): void {
    if (!text || !window.speechSynthesis) return;

    // Cancelar cualquier audio previo
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9; // Velocidad ligeramente reducida para claridad
    utterance.pitch = 1;

    // Intentar seleccionar la mejor voz disponible en el sistema
    const voices = window.speechSynthesis.getVoices();
    
    // Prioridad: Voces de Google (Online), luego Microsoft (Online), luego cualquier inglesa
    const bestVoice = voices.find(v => v.name.includes('Google US English') && v.lang.startsWith(lang))
                   || voices.find(v => v.name.includes('Natural') && v.lang.startsWith(lang))
                   || voices.find(v => v.name.includes('Google') && v.lang.startsWith(lang))
                   || voices.find(v => v.lang.startsWith(lang));

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}
