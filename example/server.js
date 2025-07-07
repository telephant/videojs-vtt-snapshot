import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Serve static files from example directory
app.use(express.static(__dirname));

// Serve dist directory for the plugin
app.use('/dist', express.static(join(__dirname, '../dist')));

// Serve the index.html
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Example server running at http://localhost:${port}`);
  console.log(`View the example at http://localhost:${port}/index.html`);
}); 