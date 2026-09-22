const fs = require('fs');
const pdfParse = require('pdf-parse');

async function check() {
  const filePath = 'd:/backup folder/asset/asset/backend/Attachment/1789975977857-1789914382082-0501070455_2032975260_2026-05-01.pdf';
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    return;
  }
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  console.log('--- EXTRACTED TEXT (First 1500 chars) ---');
  console.log(data.text.slice(0, 1500));
}

check();
