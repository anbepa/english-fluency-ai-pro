const { randomUUID } = require('crypto');

module.exports = async (req, res) => {
  function demo(body, res, errorMsg) {
    const request = body.request || { topic: 'Daily routine', count: 5, level: 'beginner', includeSpanish: true, includePronunciation: true };
    const samples = [
      ['Today I woke up early.', 'Hoy me desperté temprano.', 'tu-DÉI ai WÓUK ap ÉR-li'],
      ['I usually go to work by bus.', 'Normalmente voy al trabajo en bus.', 'ai YÚ-yu-a-li góu tu wérk bai bas'],
      ['Yesterday I watched a movie.', 'Ayer vi una película.', 'YÉS-ter-dei ai wócht a MÚ-vi'],
      ['I think this lesson is useful.', 'Creo que esta lección es útil.', 'ai zink dis LÉ-son is YÚS-ful'],
      ['I can speak for two minutes.', 'Puedo hablar durante dos minutos.', 'ai can spík for tú MÍ-nits']
    ];
    const phrases = samples.slice(0, request.count).map(([textEn, textEs, pronunciation]) => ({
      id: randomUUID(), textEn, textEs, pronunciation, topic: request.topic, level: request.level, favorite: false, source: 'demo', createdAt: new Date().toISOString()
    }));
    res.status(200).json({ 
      model: body.model || 'demo-fallback', 
      phrases, 
      raw: `Modo Demo: ${errorMsg || 'Configura DEEPSEEK_API_KEY para IA real.'}` 
    });
  }

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const body = req.body || {};
    const apiKey = process.env['DEEPSEEK_API_KEY'];
    const apiUrl = process.env['DEEPSEEK_API_URL'] || 'https://api.deepseek.com/chat/completions';
    const model = process.env['DEEPSEEK_MODEL'] || body.model || 'deepseek-chat';
    
    if (!apiKey) return demo(body, res, 'Falta DEEPSEEK_API_KEY en Vercel.');
    if (!body.prompt) return res.status(400).json({ error: 'Missing prompt' });

    // En Node.js antiguo, fetch no es global, pero en Vercel Node 18+ sí lo es.
    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey}` 
      },
      body: JSON.stringify({ 
        model, 
        messages: [{ role: 'user', content: body.prompt }], 
        temperature: 0.7 
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.text();
      return demo(body, res, `Error de DeepSeek (${aiResponse.status}): ${errorData}`);
    }
    
    const data = await aiResponse.json();
    const raw = data?.choices?.[0]?.message?.content || '[]';
    
    let parsed = [];
    try { 
      const cleanJson = String(raw).replace(/^```json|```$/g, '').trim();
      parsed = JSON.parse(cleanJson); 
    } catch (e) { 
      return demo(body, res, `Error parseando JSON: ${raw}`);
    }

    const request = body.request || { topic: 'Daily routine', count: 5, level: 'beginner', includeSpanish: true, includePronunciation: true };
    const list = Array.isArray(parsed) ? parsed : [];
    
    const phrases = list.map(item => ({
      id: randomUUID(),
      textEn: String(item.textEn || item.english || ''),
      textEs: String(item.textEs || item.spanish || ''),
      pronunciation: String(item.pronunciation || ''),
      topic: String(item.topic || request.topic),
      level: String(item.level || request.level),
      favorite: false,
      source: model,
      createdAt: new Date().toISOString()
    })).filter(p => p.textEn);

    return res.status(200).json({ model, phrases, raw });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Crash en el servidor', 
      details: error.message 
    });
  }
};
