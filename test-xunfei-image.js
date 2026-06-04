const crypto = require('node:crypto');

const appId = process.env.XUNFEI_APP_ID;
const apiKey = process.env.XUNFEI_API_KEY;
const apiSecret = process.env.XUNFEI_API_SECRET;
if (!appId || !apiKey || !apiSecret) {
  console.error('Set XUNFEI_APP_ID, XUNFEI_API_KEY, XUNFEI_API_SECRET env vars');
  process.exit(1);
}

const secretsToTry = [apiSecret];

const requestUrl = 'https://maas-api.cn-huabei-1.xf-yun.com/v2.1/tti';
const model = 'xopqwentti20b';

function assembleXunfeiUrl(requestUrl, method, appId, apiKey, apiSecret, customDate) {
  const urlObj = new URL(requestUrl);
  const host = urlObj.host;
  const path = urlObj.pathname;

  const date = customDate || new Date().toUTCString();
  const signatureOrigin = `host: ${host}\ndate: ${date}\n${method} ${path} HTTP/1.1`;

  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(signatureOrigin)
    .digest('base64');

  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin).toString('base64');

  const params = new URLSearchParams({
    host,
    date,
    authorization
  });

  return `${requestUrl}?${params.toString()}`;
}

async function testWithSecret(apiSecret, label, serverDate) {
  console.log(`\n--- Testing with ${label} (${apiSecret}) ---`);
  const signedUrl = assembleXunfeiUrl(requestUrl, 'POST', appId, apiKey, apiSecret, serverDate);
  
  const payload = {
    header: {
      app_id: appId,
      uid: '123456789',
      patch_id: ['']
    },
    parameter: {
      chat: {
        domain: model
      }
    },
    payload: {
      message: {
        text: [
          {
            role: 'user',
            content: 'A futuristic cyber punk city with neon lights, cinematic ray tracing, 8k, masterpiece'
          }
        ]
      }
    }
  };

  try {
    const response = await fetch(signedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    console.log('Response Status:', response.status);
    console.log('Response Text:', text);
  } catch (error) {
    console.error('Fetch Error:', error);
  }
}

async function runAll() {
  console.log('Fetching remote server date for perfect sync...');
  let serverDate = null;
  try {
    const preflight = await fetch('https://maas-api.cn-huabei-1.xf-yun.com/v2.1/tti', { method: 'POST' });
    serverDate = preflight.headers.get('date');
    console.log('Synchronized Server Date:', serverDate);
  } catch (e) {
    console.warn('Could not fetch server date, using local clock.', e.message);
  }

  await testWithSecret(secretsToTry[0], 'Raw string', serverDate);
  await testWithSecret(secretsToTry[1], 'Base64 decoded', serverDate);
}

runAll();
