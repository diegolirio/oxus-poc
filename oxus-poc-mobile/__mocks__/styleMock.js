// Jest nao sabe transformar CSS (src/global.css, importado pelo layout raiz
// para o NativeWind). Sem isto, `import '@/global.css'` quebra a suite com
// SyntaxError antes mesmo do primeiro teste rodar.
module.exports = {};
