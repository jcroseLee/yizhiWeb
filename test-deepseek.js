const fs = require('fs');
const path = require('path');

// Simple .env.local parser
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      console.log('Loaded .env.local');
    } else {
      console.log('.env.local not found');
    }
  } catch (e) {
    console.error('Error loading .env.local:', e);
  }
}

loadEnv();

const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

console.log('Testing DeepSeek API connection...');
console.log('API Key present:', !!apiKey);
if (apiKey) console.log('API Key prefix:', apiKey.substring(0, 5) + '...');
console.log('Base URL:', baseURL);

if (!apiKey) {
  console.error('ERROR: No API Key found in .env.local (DEEPSEEK_API_KEY or OPENAI_API_KEY)');
  process.exit(1);
}

// Use raw fetch to test connectivity
async function testConnection() {
  try {
    console.log('Sending test request to DeepSeek (Streaming)...');
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: 'Hello, count to 5.' }
        ],
        stream: true
      })
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      console.error('API Request Failed!');
      const text = await response.text();
      console.log('Error body:', text);
      return;
    }

    console.log('Reading stream...');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      console.log('Received chunk:', chunk);
    }
    console.log('Stream finished.');
  } catch (error) {
    console.error('Network Error:', error);
  }
}

testConnection();
