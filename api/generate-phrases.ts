import { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';

interface Body {
  model?: string;
  prompt?: string;
  request?: { topic: string; count: number; level: 'beginner' | 'intermediate' | 'advanced'; includeSpanish: boolean; includePronunciation: boolean };
}

function demo(body: Body, res: VercelResponse): void {
  const request = body.request ?? { topic: 'Daily routine', count: 5, level: 'beginner', includeSpanish: true, includePronunciation: true };
  const samples = [
    ['Today I woke up early.', 'Hoy me desperté temprano.', 'tu-DÉI ai WÓUK ap ÉR-li'],
    ['I usually go to work by bus.', 'Normalmente voy al trabajo en bus.', 'ai YÚ-yu-a-li góu tu wérk bai bas'],
    ['Yesterday I watched a movie.', 'Ayer vi una película.', 'YÉS-ter-dei ai wócht a MÚ-vi'],
    ['I think this lesson is useful.', 'Creo que esta lección es útil.', 'ai zink dis LÉ-son is YÚS-ful'],
    ['I can speak for two minutes.', 'Puedo hablar durante dos minutos.', 'ai can spík for tú MÍ-nits']
  ];
  const phrases = samples.slice(0, request.count).map(([textEn, textEs, pronunciation]) => ({
    id: randomUUID(), textEn, textEs, pronunciation, topic: request.topic, level: request.level, favorite: false, source: 'deepseek-v4-flash', createdAt: new Date().toISOString()
  }));
  res.status(200).json({ model: body.model ?? 'deepseek-v4-flash', phrases, raw: 'Demo local: configura DEEPSEEK_API_KEY en Vercel para usar IA real.' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const body = req.body as Body;
  const apiKey = process.env['DEEPSEEK_API_KEY'];
  const apiUrl = process.env['DEEPSEEK_API_URL'] ?? 'https://api.deepseek.com/chat/completions';
  const model = process.env['DEEPSEEK_MODEL'] ?? body.model ?? 'deepseek-v4-flash';
  
  if (!apiKey || !body.prompt) return demo({ ...body, model }, res);

  try {
    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: body.prompt }], temperature: 0.7 })
    });

    if (!aiResponse.ok) return demo({ ...body, model }, res);
    
    const data = await aiResponse.json() as any;
    const raw = data?.choices?.[0]?.message?.content ?? '[]';
    let parsed: any[] = [];
    
    try { 
      parsed = JSON.parse(String(raw).replace(/^```json|```$/g, '').trim()); 
    } catch { 
      parsed = []; 
    }

    const request = body.request ?? { topic: 'Daily routine', count: 5, level: 'beginner', includeSpanish: true, includePronunciation: true };
    const list = Array.isArray(parsed) ? parsed : [];
    
    const phrases = list.map((item: any) => ({
      id: randomUUID(),
      textEn: String(item.textEn ?? item.english ?? ''),
      textEs: String(item.textEs ?? item.spanish ?? ''),
      pronunciation: String(item.pronunciation ?? ''),
      topic: String(item.topic ?? request.topic),
      level: request.level,
      favorite: false,
      source: 'deepseek-v4-flash',
      createdAt: new Date().toISOString()
    })).filter((p: any) => p.textEn);

    return res.status(200).json({ model, phrases, raw });
  } catch (error) {
    return demo({ ...body, model }, res);
  }
}
