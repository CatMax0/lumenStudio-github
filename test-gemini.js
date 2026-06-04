const http = require('http');
const https = require('https');
const url = require('url');

const apiKey = 'AIzaSyAo6GMrr3XaOo_kzUL1IcGxLrJVAeOyFHw';
const targetUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// We can try connecting directly (as the user might have global VPN/TUN turned on now)
const MODELS_TO_TRY = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-pro'];

function testModelDirect(model) {
  return new Promise((resolve) => {
    console.log(`\nTesting model: ${model} (Direct)...`);
    const postData = JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: 'Hi! Reply with 1 word.' }],
      temperature: 0.7
    });

    const req = https.request(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`Status for ${model}:`, res.statusCode);
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(body);
            console.log(`🎉 Success! ${model} reply:`, data.choices[0].message.content);
            resolve(true);
          } catch (e) {
            console.log(`Failed to parse response:`, body.slice(0, 150));
            resolve(false);
          }
        } else {
          console.log(`Error Response for ${model}:`, body.slice(0, 200));
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`Connection failed for ${model}:`, err.message);
      resolve(false);
    });

    req.setTimeout(8000, () => {
      req.destroy();
      console.log(`Timeout for ${model}`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  for (const model of MODELS_TO_TRY) {
    const success = await testModelDirect(model);
    if (success) {
      console.log(`\n🔑 Perfect! Model "${model}" is working and fully online!`);
    }
  }
}

runTests();
