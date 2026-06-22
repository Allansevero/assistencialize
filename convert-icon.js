const pngToIco = require('png-to-ico');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, 'assets', '98414553.png');
const outputPath = path.join(__dirname, 'public', 'app-icon.ico');

pngToIco(inputPath)
  .then(buf => {
    fs.writeFileSync(outputPath, buf);
    console.log('✅ ICO gerado com sucesso:', outputPath);
    console.log('   Tamanho:', buf.length, 'bytes');
  })
  .catch(err => {
    console.error('❌ Erro ao gerar ICO:', err.message);
    process.exit(1);
  });
