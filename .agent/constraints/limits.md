## CONSTRAINTS (Vercel Dashboard)
- **No Rendering on Serverless:** Do not install FFmpeg or attempt to process/render video inside Vercel. All rendering is offloaded.
- **No Direct Local Trigger:** Vercel cannot communicate via HTTP/SSH directly with the home PC; communication must be strictly asynchronous via the Supabase `video_queue` table.
- **External Asset Hosting:** No local media storage in the Next.js repository. All business logos, backgrounds, and assets must be hosted externally (Supabase Storage / Cloudinary).