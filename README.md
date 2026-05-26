# Calendário Editorial

App de gestão de postagens para redes sociais dos clientes **Lacustre Hall** e **Alma Gastronomia**.

## Funcionalidades

- Calendário editorial por cliente (Lacustre Hall e Alma Gastronomia)
- Visualização de todos os meses de hoje até dezembro de 2026
- Clique em qualquer dia para ver ou adicionar postagens
- Campos por postagem: **Formato** (Feed, Stories, Reels, Carrossel) e **Conteúdo**
- Múltiplas postagens por dia
- Dados salvos no navegador via `localStorage` (persistem entre sessões)
- Design mobile-first, funciona bem no desktop também

## Estrutura de arquivos

```
social-calendar/
├── index.html      # HTML principal
├── style.css       # Estilos
├── app.js          # Lógica do app e persistência
├── manifest.json   # PWA manifest
├── vercel.json     # Configuração de deploy
└── README.md
```

## Deploy no Vercel

### Opção 1 — Via GitHub (recomendado)

1. Crie um repositório no GitHub e faça upload dos arquivos
2. Acesse [vercel.com](https://vercel.com) e faça login
3. Clique em **Add New Project** → importe o repositório
4. Não precisa configurar nada — o Vercel detecta automaticamente
5. Clique em **Deploy**

### Opção 2 — Via Vercel CLI

```bash
npm install -g vercel
cd social-calendar
vercel
```

## Desenvolvimento local

Como é HTML/CSS/JS puro, basta abrir o `index.html` no navegador.

Para um servidor local simples:

```bash
# Python
python3 -m http.server 3000

# Node.js (npx)
npx serve .
```

Acesse `http://localhost:3000`

## Notas

- Os dados ficam salvos no `localStorage` do navegador de cada usuário. Isso significa que cada dispositivo/navegador tem seus próprios dados.
- Para compartilhar dados entre dispositivos, seria necessário um backend (banco de dados). Consulte o desenvolvedor caso precise disso.
- As imagens de ícone (`icon-192.png`, `icon-512.png`) precisam ser adicionadas para o PWA funcionar completamente. Por enquanto o app funciona normalmente sem elas.
