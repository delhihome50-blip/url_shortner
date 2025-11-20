import { readFile, writeFile } from 'fs/promises';
import { createServer } from 'http';
import path from 'path';
import Crypto from 'crypto';

// ✅ Render ke liye PORT dynamic karo
const PORT = process.env.PORT || 3004;
const data_file = path.join('data', 'links.json');

const serverFile = async (res, filePath, contentType) => {
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 Not Found</h1>');
  }
};

const loadlinks = async () => {
  try {
    const data = await readFile(data_file, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      await writeFile(data_file, JSON.stringify({}));
      return {};
    }
    throw err;
  }
};

const savelinks = async (links) => {
  await writeFile(data_file, JSON.stringify(links));
};

const server = createServer(async (req, res) => {
  if (req.method === 'GET') {
    if (req.url === '/') {
      return serverFile(res, path.join('public', 'index.html'), 'text/html');
    } else if (req.url === '/style.css') {
      return serverFile(res, path.join('public', 'style.css'), 'text/css');
    } else if (req.url === "/links") {
      const links = await loadlinks();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(links));
    } else {
      const links = await loadlinks();
      const shortCode = req.url.slice(1);
      if (links[shortCode]) {
        res.writeHead(302, { location: links[shortCode] });
        return res.end();
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Shortened URL not found");
    }
  }

  if (req.method === 'POST' && req.url === '/shorten') {
    const links = await loadlinks();

    let body = '';
    req.on('data', chunk => body += chunk);

    req.on('end', async () => {
      const { url, shortCode } = JSON.parse(body);

      if (!url) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Invalid URL');
      }

      const finalShortCode = shortCode || Crypto.randomBytes(4).toString('hex');

      if (links[finalShortCode]) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Short code already in use');
      }

      links[finalShortCode] = url;
      await savelinks(links);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ shortCode: finalShortCode }));
    });
  }
});

// ✅ Bind to all interfaces for Render
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
