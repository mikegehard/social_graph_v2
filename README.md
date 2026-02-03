# Social Graph Connector

## Purpose

Social Graph Connector is a web application for VCs and investors that identifies valuable introductions from conversations by automatically matching discussion topics against network investment theses.

Key capabilities:
- Record conversations with live transcription
- Extract investment entities (sectors, stages, check sizes, geos, personas, intents)
- Match entities against a contact/thesis database with explainable scoring
- Generate double opt-in introduction emails using AI

## Architecture

- **Frontend**: React 18 with TypeScript, built with Vite
- **State Management**: TanStack Query v5
- **Routing**: wouter
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (PostgreSQL with RLS, Auth, Edge Functions)
- **AI**: OpenAI (Whisper for transcription, GPT-4 for entity extraction and matching)

## Development

```bash
npm install
npm run dev
```

## Type Checking

```bash
npm run check
```
