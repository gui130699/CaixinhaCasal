// Gera os ícones PWA da Caixinha Casal
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

// SVG do ícone — cofre estilizado com moeda e corações
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#4338ca"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#818cf8;stop-opacity:0.4"/>
      <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#1e1b4b" flood-opacity="0.4"/>
    </filter>
    <filter id="innerGlow">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Fundo com cantos arredondados -->
  <rect width="512" height="512" rx="112" ry="112" fill="url(#bg)"/>

  <!-- Reflexo sutil no topo -->
  <ellipse cx="256" cy="80" rx="200" ry="80" fill="url(#glow)"/>

  <!-- Corpo do cofre -->
  <rect x="120" y="165" width="285" height="220" rx="36" ry="36" fill="white" opacity="0.95" filter="url(#shadow)"/>

  <!-- Abertura moeda (slot) no topo -->
  <rect x="218" y="148" width="76" height="26" rx="13" ry="13" fill="#4f46e5" opacity="0.9"/>

  <!-- Rosca/detalhe lateral esquerdo -->
  <circle cx="120" cy="255" r="22" fill="white" opacity="0.95" filter="url(#shadow)"/>
  <circle cx="120" cy="255" r="12" fill="#e0e7ff"/>
  <circle cx="120" cy="255" r="5" fill="#4f46e5"/>

  <!-- Olho esquerdo -->
  <circle cx="205" cy="238" r="14" fill="#4f46e5"/>
  <circle cx="209" cy="234" r="5" fill="white"/>

  <!-- Olho direito -->
  <circle cx="307" cy="238" r="14" fill="#4f46e5"/>
  <circle cx="311" cy="234" r="5" fill="white"/>

  <!-- Nariz -->
  <ellipse cx="256" cy="268" rx="22" ry="14" fill="#e0e7ff"/>
  <circle cx="249" cy="268" r="4" fill="#a5b4fc"/>
  <circle cx="263" cy="268" r="4" fill="#a5b4fc"/>

  <!-- Sorriso -->
  <path d="M 222 295 Q 256 320 290 295" stroke="#4f46e5" stroke-width="7" fill="none" stroke-linecap="round"/>

  <!-- Patas -->
  <rect x="150" y="368" width="52" height="24" rx="12" fill="white" opacity="0.95"/>
  <rect x="218" y="368" width="52" height="24" rx="12" fill="white" opacity="0.95"/>
  <rect x="286" y="368" width="52" height="24" rx="12" fill="white" opacity="0.95"/>

  <!-- Moedas decorativas -->
  <circle cx="380" cy="195" r="28" fill="#fbbf24" opacity="0.9" filter="url(#shadow)"/>
  <text x="380" y="203" text-anchor="middle" font-size="26" font-weight="bold" fill="#92400e" font-family="Arial">$</text>

  <!-- Coração pequeno -->
  <path d="M 148 175 C 148 168 155 162 162 168 C 169 162 176 168 176 175 C 176 182 162 192 162 192 C 162 192 148 182 148 175 Z" fill="#f43f5e" opacity="0.85"/>
</svg>
`

const outDir = path.join(__dirname, '..', 'public', 'icons')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

async function generate() {
  for (const size of [192, 512]) {
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `pwa-${size}x${size}.png`))
    console.log(`✓ pwa-${size}x${size}.png gerado`)
  }

  // Apple touch icon 180x180
  await sharp(Buffer.from(svgIcon))
    .resize(180, 180)
    .png()
    .toFile(path.join(__dirname, '..', 'public', 'apple-touch-icon.png'))
  console.log('✓ apple-touch-icon.png gerado')

  // Favicon 32x32
  await sharp(Buffer.from(svgIcon))
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, '..', 'public', 'favicon-32x32.png'))
  console.log('✓ favicon-32x32.png gerado')

  console.log('\nÍcones gerados com sucesso!')
}

generate().catch(console.error)
