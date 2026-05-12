const fs = require('fs');
const path = require('path');

const envFile = `
export const environment = {
  production: true,
  supabaseUrl: '${process.env.SUPABASE_URL || ''}',
  supabaseAnonKey: '${process.env.SUPABASE_ANON_KEY || ''}',
  aiModel: '${process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'}',
  aiEndpoint: '/api/generate-phrases'
};
`;

const dir = path.join(__dirname, 'src', 'environments');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(path.join(dir, 'environment.ts'), envFile);
fs.writeFileSync(path.join(dir, 'environment.prod.ts'), envFile);

console.log('Environment files generated successfully.');
