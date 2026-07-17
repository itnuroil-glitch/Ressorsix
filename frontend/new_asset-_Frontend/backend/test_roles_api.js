const http = require('http');

http.get('http://127.0.0.1:5000/api/roles', (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Body:', data);
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
