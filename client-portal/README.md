# Client Portal

A mobile‑first client portal for Sheila Gutierrez Designs, built with Next.js 14 (App Router), TypeScript, and Tailwind CSS.

## Development

### Prerequisites
- Node.js 18+ and npm

### Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Available Scripts

- `npm run dev` – start the development server with hot reload
- `npm run dev:open` – start dev server and open browser automatically
- `npm run build` – create a production build
- `npm run start` – serve the production build
- `npm run format` – format code with Prettier
- `npm run format:check` – check formatting without writing

## Project Structure

- `app/` – Next.js App Router pages and layouts
  - `layout.tsx` – root layout (metadata, fonts, global styles)
  - `page.tsx` – homepage (client portal dashboard)
  - `globals.css` – global Tailwind imports and custom CSS
- `public/` – static assets (images, icons, etc.)
- `tailwind.config.ts` – Tailwind configuration (using v4 inline theme)

## Design Principles

- **Mobile‑first** – all layouts are designed for small screens first, with responsive breakpoints for larger devices
- **Accessibility** – semantic HTML, ARIA labels, keyboard navigation, and sufficient contrast
- **Performance** – optimized images, code splitting, and minimal JavaScript

## Next Steps / Iteration Ideas

1. **Authentication** – integrate a simple auth layer (Clerk, NextAuth, or basic password)
2. **Project‑specific routes** – dynamic routes for each client (`/client/[id]`)
3. **File upload** – allow clients to upload inspiration images
4. **Real‑time updates** – WebSocket or polling for project status changes
5. **Email integration** – send notifications when designers post updates
6. **Calendar integration** – schedule consultations directly from the portal

## Deployment

This project can be deployed to Vercel, Netlify, or any Node.js‑compatible hosting.

```bash
# Build for production
npm run build

# Start production server
npm run start
```

---

Built for Sheila Gutierrez Designs. 🐠