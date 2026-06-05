import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';

type ConversationMode = 'dialogue' | 'paragraph';

interface ConversationRequest {
  mode: ConversationMode;
  topic: string;
  level: string;
  length: number;
  includeSpanish?: boolean;
  includePronunciation?: boolean;
}

interface ConversationBody {
  model?: string;
  prompt?: string;
  request?: ConversationRequest;
}

interface RawLine {
  speaker?: string;
  textEn?: string;
  english?: string;
  textEs?: string;
  spanish?: string;
  pronunciation?: string;
}

function buildDemo(body: ConversationBody, errorMsg?: string) {
  const request = body.request || {
    mode: 'dialogue' as ConversationMode,
    topic: 'Meeting a new friend at a cafe',
    level: 'A2',
    length: 6,
    includeSpanish: true,
    includePronunciation: true
  };

  const dialogueDemo = [
    { speaker: 'A', textEn: 'Hi! Is this seat taken?', textEs: '¡Hola! ¿Está ocupado este asiento?', pronunciation: 'jái! is dis sit téi-ken?' },
    { speaker: 'B', textEn: 'No, please sit down.', textEs: 'No, por favor siéntate.', pronunciation: 'nóu, plís sit dáun' },
    { speaker: 'A', textEn: 'Thank you. I love this cafe.', textEs: 'Gracias. Me encanta este café.', pronunciation: 'zenk yú. ai lóv dis ka-féi' },
    { speaker: 'B', textEn: 'Me too. Their coffee is amazing.', textEs: 'A mí también. Su café es increíble.', pronunciation: 'mí tu. déir KÓ-fi is a-MÉI-zing' },
    { speaker: 'A', textEn: 'By the way, my name is Sam.', textEs: 'Por cierto, me llamo Sam.', pronunciation: 'bai de wéi, mai néim is sam' },
    { speaker: 'B', textEn: 'Nice to meet you, Sam. I am Alex.', textEs: 'Mucho gusto, Sam. Soy Alex.', pronunciation: 'náis tu mit yú, sam. ai am Á-leks' }
  ];

  const paragraphDemo = [
    { speaker: 'NARRATOR', textEn: 'Every morning I wake up at six.', textEs: 'Cada mañana me despierto a las seis.', pronunciation: 'É-vri MÓR-ning ai wéik ap at siks' },
    { speaker: 'NARRATOR', textEn: 'I drink a hot cup of coffee.', textEs: 'Bebo una taza de café caliente.', pronunciation: 'ai drink a jot kap of KÓ-fi' },
    { speaker: 'NARRATOR', textEn: 'Then I read the news on my phone.', textEs: 'Luego leo las noticias en mi teléfono.', pronunciation: 'den ai rid de niús on mai fóun' },
    { speaker: 'NARRATOR', textEn: 'After that, I go to work by bus.', textEs: 'Después, voy al trabajo en autobús.', pronunciation: 'AF-ter dat, ai góu tu wérk bai bas' },
    { speaker: 'NARRATOR', textEn: 'I really enjoy my simple routine.', textEs: 'Disfruto mucho mi rutina sencilla.', pronunciation: 'ai RÍ-li en-CHÓI mai SÍM-pol ru-TÍN' }
  ];

  const lines = (request.mode === 'paragraph' ? paragraphDemo : dialogueDemo)
    .slice(0, Math.max(2, request.length || 6));

  return {
    model: body.model || 'demo-fallback',
    conversation: {
      id: randomUUID(),
      mode: request.mode,
      topic: request.topic,
      level: request.level,
      title: request.mode === 'paragraph'
        ? `Paragraph: ${request.topic}`
        : `Dialogue: ${request.topic}`,
      summaryEs: request.mode === 'paragraph'
        ? 'Un párrafo corto y natural sobre el tema solicitado.'
        : 'Una conversación breve y natural entre dos personas sobre el tema solicitado.',
      lines,
      source: 'demo',
      favorite: false,
      createdAt: new Date().toISOString()
    },
    raw: `Modo Demo: ${errorMsg || 'Configura DEEPSEEK_API_KEY para IA real.'}`
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body: ConversationBody = (req.body as ConversationBody) || {};
    const apiKey = process.env['DEEPSEEK_API_KEY'];
    const apiUrl = process.env['DEEPSEEK_API_URL'] || 'https://api.deepseek.com/chat/completions';
    const model = process.env['DEEPSEEK_MODEL'] || body.model || 'deepseek-chat';

    if (!apiKey) return res.status(200).json(buildDemo(body, 'Falta DEEPSEEK_API_KEY en Vercel.'));
    if (!body.prompt) return res.status(400).json({ error: 'Missing prompt' });

    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: body.prompt }],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      return res.status(200).json(buildDemo(body, `Error de DeepSeek (${aiResponse.status}): ${errorData}`));
    }

    const data: any = await aiResponse.json();
    const raw = data?.choices?.[0]?.message?.content || '{}';

    let parsed: any = null;
    try {
      const cleanJson = String(raw).replace(/^```json|```$/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      return res.status(200).json(buildDemo(body, `Error parseando JSON: ${raw}`));
    }

    const request = body.request || {
      mode: 'dialogue' as ConversationMode,
      topic: 'General',
      level: 'A2',
      length: 6,
      includeSpanish: true,
      includePronunciation: true
    };

    const linesRaw: RawLine[] = Array.isArray(parsed?.lines) ? parsed.lines : [];
    const lines = linesRaw
      .map((item) => ({
        speaker: request.mode === 'paragraph'
          ? 'NARRATOR'
          : (String(item.speaker || 'A').toUpperCase().startsWith('B') ? 'B' : 'A'),
        textEn: String(item.textEn || item.english || '').trim(),
        textEs: String(item.textEs || item.spanish || '').trim(),
        pronunciation: String(item.pronunciation || '').trim()
      }))
      .filter((l) => l.textEn);

    if (lines.length === 0) {
      return res.status(200).json(buildDemo(body, `Respuesta sin líneas válidas: ${raw}`));
    }

    const conversation = {
      id: randomUUID(),
      mode: request.mode,
      topic: String(parsed?.topic || request.topic),
      level: String(parsed?.level || request.level),
      title: String(parsed?.title || (request.mode === 'paragraph'
        ? `Paragraph: ${request.topic}`
        : `Dialogue: ${request.topic}`)),
      summaryEs: String(parsed?.summaryEs || parsed?.summary || ''),
      lines,
      source: model,
      favorite: false,
      createdAt: new Date().toISOString()
    };

    return res.status(200).json({ model, conversation, raw });

  } catch (error: any) {
    return res.status(500).json({
      error: 'Crash en el servidor',
      details: error?.message || String(error)
    });
  }
}
