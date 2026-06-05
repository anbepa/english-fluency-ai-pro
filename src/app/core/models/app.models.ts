export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'auto';

export interface Phrase {
  id: string;
  textEn: string;
  textEs: string;
  pronunciation: string;
  topic: string;
  level: EnglishLevel;
  mastered: boolean;
  favorite: boolean;
  createdAt: string;
  source: string;
}

export interface GeneratePhraseRequest {
  topic: string;
  count: number;
  level: EnglishLevel;
  includeSpanish?: boolean;
  includePronunciation?: boolean;
}

export interface GeneratePhraseResponse {
  phrases: Partial<Phrase>[];
}

export interface SpeakingSession {
  id: string;
  date: string;
  topic: string;
  durationSeconds: number;
  fluencyLevel: number;
  notes: string;
  phraseIds: string[];
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

// ============================================================
//   Conversations & Paragraphs (AI-generated content)
// ============================================================

export type ConversationMode = 'dialogue' | 'paragraph';

export interface ConversationLine {
  speaker: 'A' | 'B' | 'NARRATOR';
  textEn: string;
  textEs: string;
  pronunciation: string;
}

export interface Conversation {
  id: string;
  mode: ConversationMode;
  topic: string;
  level: EnglishLevel;
  title: string;
  summaryEs: string;
  lines: ConversationLine[];
  source: string;
  favorite: boolean;
  createdAt: string;
}

export interface GenerateConversationRequest {
  mode: ConversationMode;
  topic: string;
  level: EnglishLevel;
  /** Approximate number of lines for dialogue / sentences for paragraph */
  length: number;
  includeSpanish?: boolean;
  includePronunciation?: boolean;
}

export interface GenerateConversationResponse {
  model: string;
  conversation: Conversation;
  raw?: string;
}

export const TOPICS_BY_LEVEL: Record<string, string[]> = {
  'A1': [
    'Daily Routine', 'Family & Friends', 'Food & Drinks', 'Shopping', 'Colors & Numbers', 
    'Basic Greetings', 'My House', 'Animals', 'Weather', 'Body Parts', 
    'Clocks & Time', 'Days & Months', 'My School', 'Simple Actions', 'Feelings'
  ],
  'A2': [
    'Travel Experiences', 'Past Events', 'Health & Fitness', 'Housing', 'Work & Jobs', 
    'Holidays', 'Cooking & Recipes', 'Directions', 'Future Intentions', 'Comparing Things',
    'Clothing & Fashion', 'Personal History', 'Entertainment', 'Transport', 'Nature'
  ],
  'B1': [
    'Future Plans', 'Environment', 'Entertainment', 'Social Media', 'Education', 
    'Opinions & Advice', 'Lifestyles', 'Technology', 'Crime & Punishment', 'Customer Service',
    'Success & Failure', 'Modern Habits', 'Sports & Games', 'Rules & Laws', 'Media & News'
  ],
  'B2': [
    'Business English', 'Current Affairs', 'Science & Tech', 'Complex Negotiations', 'Global Issues', 
    'Art & Culture', 'Psychology', 'Financial Advice', 'Marketing & Trends', 'Human Rights',
    'Corporate Life', 'Inventions', 'Urban Development', 'History & Society', 'Scientific Discoveries'
  ],
  'C1': [
    'Academic Writing', 'Public Speaking', 'Philosophy', 'Idioms & Nuances', 'Professional Ethics',
    'Advanced Literature', 'Geopolitics', 'Linguistic Evolution', 'Critical Thinking', 'Abstract Concepts',
    'Corporate Strategy', 'Sociology', 'Artificial Intelligence', 'Economic Theories', 'Diplomatic Language'
  ],
  'auto': [
    'General Topics', 'Mixed Situations', 'Surprise Me', 'Random Conversation', 'Daily Slang',
    'Common Idioms', 'Phrasal Verbs', 'Small Talk', 'Situational English', 'Emergency Phrases'
  ]
};
