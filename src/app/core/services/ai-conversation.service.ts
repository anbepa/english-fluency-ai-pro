import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  GenerateConversationRequest,
  GenerateConversationResponse,
  ConversationMode
} from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class AiConversationService {
  readonly model = environment.aiModel;
  /** Endpoint del nuevo handler de conversaciones (Vercel function) */
  readonly endpoint = '/api/generate-conversation';

  buildPrompt(request: GenerateConversationRequest): string {
    const levelInstruction = request.level && request.level !== 'auto'
      ? `The English MUST be strictly at CEFR level ${request.level}. Use vocabulary and grammar appropriate for this level — do not exceed it.`
      : 'Use natural, balanced English suitable for a general learner.';

    if (request.mode === 'paragraph') {
      return this.buildParagraphPrompt(request, levelInstruction);
    }
    return this.buildDialoguePrompt(request, levelInstruction);
  }

  private buildDialoguePrompt(request: GenerateConversationRequest, levelInstruction: string): string {
    const wantSpanish = request.includeSpanish !== false;
    const wantPron = request.includePronunciation !== false;

    return `Act as an expert English-speaking coach. Create a SHORT, NATURAL DIALOGUE between two people (A and B) for a Spanish-speaking learner.

TOPIC: ${request.topic}
LEVEL: ${request.level}
TOTAL LINES: about ${request.length} (alternating A and B, never the same speaker twice in a row).

RULES:
1. ${levelInstruction}
2. Sound natural and conversational — like a real exchange, not a textbook.
3. Each line MUST be short (5–14 words). No monologues.
4. Avoid clichés like "Hello, how are you" unless the topic requires it.
5. ${wantSpanish ? 'Provide a faithful Spanish translation in "textEs".' : 'Leave "textEs" as an empty string.'}
6. ${wantPron ? 'Provide a Spanish-phonetic guide in "pronunciation" so a Spanish speaker can pronounce the ENGLISH text. Example: "He tends to overthink" -> "ji tends tu óu-ver-sink". NEVER put the Spanish translation here.' : 'Leave "pronunciation" as an empty string.'}
7. The first line MUST start with speaker "A".
8. Variety token (do not include in output): ${new Date().toISOString()}

RETURN ONLY VALID JSON (no markdown fences) matching exactly this shape:
{
  "title": "Short descriptive title in English",
  "topic": "${request.topic}",
  "level": "${request.level}",
  "summaryEs": "Resumen breve en español de 1 oración",
  "lines": [
    { "speaker": "A", "textEn": "...", "textEs": "...", "pronunciation": "..." },
    { "speaker": "B", "textEn": "...", "textEs": "...", "pronunciation": "..." }
  ]
}`;
  }

  private buildParagraphPrompt(request: GenerateConversationRequest, levelInstruction: string): string {
    const wantSpanish = request.includeSpanish !== false;
    const wantPron = request.includePronunciation !== false;

    return `Act as an expert English-speaking coach. Write a SHORT, COHERENT PARAGRAPH in first or third person about the given topic, broken down sentence by sentence so a Spanish-speaking learner can practice speaking.

TOPIC: ${request.topic}
LEVEL: ${request.level}
TOTAL SENTENCES: about ${request.length}.

RULES:
1. ${levelInstruction}
2. The paragraph must FLOW: each sentence should logically connect to the next.
3. Each sentence MUST be short (6–16 words) and easy to say out loud.
4. Use connectors when natural ("first", "then", "after that", "finally", "however", "for example").
5. ${wantSpanish ? 'Provide a faithful Spanish translation per sentence in "textEs".' : 'Leave "textEs" as empty string.'}
6. ${wantPron ? 'Provide a Spanish-phonetic guide in "pronunciation" for the ENGLISH text only. Example: "I really enjoy" -> "ai RÍ-li en-CHÓI". Never include the Spanish there.' : 'Leave "pronunciation" empty.'}
7. Variety token (do not include in output): ${new Date().toISOString()}

RETURN ONLY VALID JSON (no markdown fences) matching exactly this shape:
{
  "title": "Short descriptive title in English",
  "topic": "${request.topic}",
  "level": "${request.level}",
  "summaryEs": "Resumen breve en español de 1 oración",
  "lines": [
    { "speaker": "NARRATOR", "textEn": "Sentence 1.", "textEs": "...", "pronunciation": "..." },
    { "speaker": "NARRATOR", "textEn": "Sentence 2.", "textEs": "...", "pronunciation": "..." }
  ]
}`;
  }

  async generate(request: GenerateConversationRequest): Promise<GenerateConversationResponse> {
    const prompt = this.buildPrompt(request);

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt, request })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`AI conversation generation failed: ${res.status} ${res.statusText}. ${errorText}`);
    }

    return await res.json() as GenerateConversationResponse;
  }

  /** Sugerencias de subtemas comunes por nivel para diálogos/párrafos */
  static readonly SUGGESTED_SUBTOPICS: Record<string, string[]> = {
    A1: [
      'Ordering at a coffee shop', 'Greeting a neighbor', 'Asking the time',
      'My morning routine', 'Buying fruit at the market', 'Meeting a classmate',
      'Asking for directions to the bathroom'
    ],
    A2: [
      'Booking a hotel room', 'Talking about last weekend', 'Planning a short trip',
      'Describing my city', 'Talking about hobbies', 'Asking for a refund',
      'Making a doctor appointment'
    ],
    B1: [
      'Job interview small talk', 'Discussing a movie you watched', 'Apartment hunting',
      'Negotiating a price', 'Resolving a customer complaint', 'Sharing weekend plans',
      'Giving advice to a friend'
    ],
    B2: [
      'Discussing remote work pros and cons', 'Debate: social media impact',
      'Negotiating a contract', 'Explaining a tech problem to support',
      'Persuading a colleague on an idea', 'Discussing climate change',
      'Mentoring a junior teammate'
    ],
    C1: [
      'Pitching a startup idea', 'Academic debate on AI ethics',
      'Diplomatic conversation about policy', 'Critiquing a book',
      'Explaining abstract concepts simply', 'Negotiating a partnership'
    ],
    auto: [
      'Surprise me — daily life', 'Surprise me — work', 'Surprise me — travel',
      'Surprise me — small talk', 'Surprise me — funny scenario'
    ]
  };

  getSuggestedTopics(level: string): string[] {
    return AiConversationService.SUGGESTED_SUBTOPICS[level] || AiConversationService.SUGGESTED_SUBTOPICS['auto'];
  }

  /** Sugerencias rápidas de "modo" amigables */
  static readonly MODES: { value: ConversationMode; label: string; emoji: string; hint: string }[] = [
    { value: 'dialogue', label: 'Dialogue', emoji: '💬', hint: 'Two-person conversation (A & B)' },
    { value: 'paragraph', label: 'Paragraph', emoji: '📖', hint: 'Coherent narration, sentence by sentence' }
  ];
}
