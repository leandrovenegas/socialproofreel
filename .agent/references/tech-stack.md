## FRONTEND (Next.js)
- **Framework:** Next.js 14+ (App Router).
- **Template:** Multi-tenant starter (hexclave).
- **Styling:** Tailwind CSS for the premium corporate dark/glassmorphism aesthetic.
- **Video Engine (Future):** Remotion integration for programmatic video rendering from React components.

## DATA SYNC & STORAGE (Supabase)
- **Auth:** Supabase Auth for multi-tenant dashboard access control.
- **Database (Realtime):** `video_queue` table acting as an asynchronous message broker to track rendering progress in real time.
- **Storage:** Supabase Storage (or Cloudinary) for hosting business logos and static assets.
- **Video Delivery:** Embedded Bunny.net player for streaming videos with 'completed' status.

## EXTERNAL BACKEND (Local Worker)
- **Runtime:** Python.
- **Core Libraries:** Google Maps Scraping engine & FFmpeg for automatic MP4 generation (to be replaced by Remotion CLI).