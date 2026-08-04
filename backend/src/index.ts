import 'dotenv/config';
import app from './app';

function assertJwtSecretConfigured() {
  if (!process.env.JWT_SECRET?.trim()) {
    throw new Error('JWT_SECRET is required. Set it in the environment before starting the API.');
  }
}

assertJwtSecretConfigured();

export default app;

// Local / Render-style always-on process. On Vercel the platform invokes `app` as a function.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, '0.0.0.0', () => {
    console.log(`API listening on http://0.0.0.0:${port}`);
  });
}
