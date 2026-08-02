import 'dotenv/config';
import app from './app';

export default app;

// Local / Render-style always-on process. On Vercel the platform invokes `app` as a function.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, '0.0.0.0', () => {
    console.log(`API listening on http://0.0.0.0:${port}`);
  });
}
