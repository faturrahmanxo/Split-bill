import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat konfigurasi dari file .env jika ada (tanpa modul eksternal)
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val.trim();
      }
    });
  }
} catch (e) {
  // Abaikan jika tidak ada file .env
}

const PORT = 3456;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const RECEIPT_AI_PROMPT = `Anda adalah asisten AI ahli ekstraksi struk belanja dan restoran (Receipt OCR Scanner).
Tugas Anda adalah membaca gambar struk ini dan mengembalikan data dalam format JSON murni (HANYA JSON tanpa markdown backticks, tanpa penjelasan tambahan):
{
  "merchantName": "Nama restoran / toko (contoh: Alfamart Jogja)",
  "currency": "IDR",
  "items": [
    {
      "name": "Nama menu / barang bersih",
      "qty": 1,
      "price": 2000
    }
  ],
  "fees": {
    "discount": { "type": "PERCENT", "value": 0 },
    "service": { "type": "PERCENT", "value": 0 },
    "tax": { "type": "PERCENT", "value": 0 }
  },
  "detectedSubtotal": 38000,
  "detectedTotal": 38000
}

Aturan penting:
1. Ekstrak setiap menu atau barang belanjaan dengan kuantitas numerik (qty integer >= 1) dan harga satuan (price dalam angka bulat murni).
2. Jika ada diskon, PB1 / PPN pajak restoran, atau service fee, masukkan nilainya ke objek fees.
3. currency: default "IDR" untuk struk Indonesia (atau "CHF", "USD", dll sesuai simbol struk).
4. Singkirkan nomor telepon, alamat, nomor nota/transaksi, tanggal, nama kasir, dan slogan dari daftar items.
5. Kembalikan HANYA format JSON valid.`;

async function callGeminiVision(apiKey, imageBase64, mimeType = 'image/jpeg') {
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
  const targetMime = mimeType.replace(/^image\//, '') ? mimeType : 'image/jpeg';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: RECEIPT_AI_PROMPT },
          {
            inlineData: {
              mimeType: targetMime,
              data: cleanBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const result = await response.json();
  const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('Tidak ada respon teks dari model AI.');
  }

  // Parse JSON bersih
  const jsonStr = textOutput.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(jsonStr);
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqPath = req.url.split('?')[0];

  // API 1: Status AI Server
  if (req.method === 'GET' && reqPath === '/api/ai-status') {
    const hasServerKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      hasServerKey,
      model: 'gemini-1.5-flash'
    }));
    return;
  }

  // API 2: Scan Struk dengan Gemini Vision AI
  if (req.method === 'POST' && reqPath === '/api/scan-receipt-ai') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Batasi payload maksimal 15MB
      if (body.length > 15 * 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', message: 'Ukuran foto terlalu besar (maksimal 15MB).' }));
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const imageBase64 = payload.imageBase64;
        const mimeType = payload.mimeType || 'image/jpeg';
        const apiKey = (payload.apiKey || process.env.GEMINI_API_KEY || '').trim();

        if (!imageBase64) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'MISSING_IMAGE', message: 'Data gambar struk (base64) diperlukan.' }));
          return;
        }

        if (!apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'MISSING_API_KEY',
            message: 'API Key Google Gemini belum diatur. Masukkan API Key gratis di pengaturan scanner atau file .env.'
          }));
          return;
        }

        const parsed = await callGeminiVision(apiKey, imageBase64, mimeType);

        // Normalisasi field parsed agar sesuai struktur SplitBill
        if (!parsed.items || !Array.isArray(parsed.items)) parsed.items = [];
        parsed.items = parsed.items.map((it, idx) => ({
          name: String(it.name || `Menu ${idx + 1}`).trim(),
          qty: Math.max(1, parseInt(it.qty, 10) || 1),
          price: Math.max(0, Math.round(Number(it.price) || 0))
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, parsed }));
      } catch (err) {
        console.error('Gemini Vision Scan Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'SCAN_FAILED',
          message: err.message || 'Gagal memproses struk dengan Gemini Vision AI.'
        }));
      }
    });
    return;
  }

  // Static File Serving
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(__dirname, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server SplitBill aktif di http://localhost:${PORT}`);
});
