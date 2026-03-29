# TopCell

Sistema web da TopCell para gerenciamento de ordens de servico de assistencia tecnica.

## Stack
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- UI: Tailwind + componentes UI locais

## Como rodar o backend
```bash
cd backend
npm install
npm run dev
```

Backend padrao:
- URL base: `http://localhost:4001`
- Health check: `GET /health`
- API de OS: `GET|POST /api/os` e `GET|PUT /api/os/:id`

## Como rodar o frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend padrao:
- URL local: `http://localhost:5173`
- Variavel de API: `VITE_API_BASE=http://localhost:4001`

## Observacao importante
A implementacao atual de Ordem de Servico utiliza armazenamento em memoria no backend.

Isso significa que os dados de OS sao perdidos quando o servidor reinicia.
