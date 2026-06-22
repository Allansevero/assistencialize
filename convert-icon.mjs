import pngToIco from 'png-to-ico';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const inputPath = join(__dirname, 'assets', '98414553.png');
const outputPath = join(__dirname, 'public', 'app-icon.ico');

pngToIco(inputPath)
  .then(buf => {
    writeFileSync(outputPath, buf);
    console.log('✅ ICO gerado com sucesso:', outputPath);
    console.log('   Tamanho:', buf.length, 'bytes');
  })
  .catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  });
