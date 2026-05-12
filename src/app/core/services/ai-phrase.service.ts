import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { GeneratePhraseRequest, GeneratePhraseResponse } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class AiPhraseService {
  readonly model = environment.aiModel;

  buildPrompt(request: GeneratePhraseRequest): string {
    const level = request.level;
    const count = request.count;
    const topic = request.topic;
    const levelInstruction = level && level !== 'auto' 
      ? `The level of English MUST be strictly ${level} (CEFR). Use vocabulary and grammar structures appropriate for this level.`
      : 'Generate natural phrases suitable for a general learner.';

    return `Act as an expert English teacher. Generate ${count} useful phrases for a student learning English.
    TOPIC: ${topic}
    LEVEL: ${level === 'auto' ? 'Determine the best CEFR level (A1, A2, B1, B2, or C1) for each phrase' : level}
    
    RULES:
    1. ${levelInstruction}
    2. Extremely important: NEVER repeat phrases. Ensure a high variety of vocabulary and sentence structures.
    3. SHORT & PUNCHY: Keep phrases between 4 to 8 words.
    4. ${request.includeSpanish ? 'Include the Spanish translation in the "textEs" field.' : 'No translation.'}
    5. ${request.includePronunciation ? 'Include a phonetic guide FOR THE ENGLISH TEXT using Spanish phonetics in the "pronunciation" field. IMPORTANT: This is for helping a Spanish speaker pronounce the English phrase. Example: "He tends to overthink" -> "ji tends tu óu-ver-sink". NEVER put the Spanish translation here.' : 'No pronunciation.'}
    6. For each phrase, provide: textEn, textEs, pronunciation, topic, and level (MUST be one of: A1, A2, B1, B2, C1).
    7. Avoid generic "Hello, how are you" unless explicitly asked.
    8. Current Timestamp for variety: ${new Date().toISOString()}
    
    RETURN ONLY A VALID JSON ARRAY OF OBJECTS: [{"textEn":"...","textEs":"...","pronunciation":"...","topic":"...","level":"A1"}] (Use a real level for each object).`;
  }

  async generate(request: GeneratePhraseRequest): Promise<GeneratePhraseResponse> {
    const prompt = this.buildPrompt(request);
    
    const res = await fetch(environment.aiEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt, request })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`AI generation failed: ${res.status} ${res.statusText}. ${errorText}`);
    }

    return await res.json() as GeneratePhraseResponse;
  }
}
