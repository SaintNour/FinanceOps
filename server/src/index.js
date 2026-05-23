import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';

if (process.env.NODE_ENV !== 'production') {
  import('./dev/validateImportTemplates.js').then((m) => {
    m.printImportTemplateValidationReport(m.runImportTemplateValidation());
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const app = createApp();

const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

app.listen(PORT, () => {
  console.log(`Finance API listening on http://localhost:${PORT}`);
});
