import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fvrgsbnncnapbldhnmrx.supabase.co';
const supabaseKey = 'sb_publishable_tFrNVDhhEU83L-HYV9G7fQ_OacEAeLs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Iniciando prueba de inserción en Supabase...');
  const { data, error } = await supabase
    .from('phrases')
    .insert([
      { 
        text_en: 'Testing mastered status', 
        text_es: 'Probando estado dominado', 
        topic: 'Debug', 
        level: 'beginner',
        is_mastered: true,
        source: 'manual'
      }
    ])
    .select();

  if (error) {
    console.error('❌ Error de Supabase:', error.message);
    console.error('Código de error:', error.code);
    console.error('Detalles:', error.details);
  } else {
    console.log('✅ Inserción exitosa:', data);
  }
}

test();
