// Calls to our Express backend (which securely holds the Gemini key).
export async function getStatus() {
  try {
    const r = await fetch('/api/status');
    if (!r.ok) return { gemini: false };
    return await r.json();
  } catch {
    return { gemini: false };
  }
}

export async function parseProfileText(text) {
  const r = await fetch('/api/parse-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error('parse_failed');
  return (await r.json()).fields;
}

export async function sendChatMessage(message, lang = 'en') {
  const r = await fetch('/api/chat-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, lang }),
  });
  if (!r.ok) throw new Error('chat_failed');
  return await r.json();
}

export async function transcribeAudio(audioBlob, lang = 'hi') {
  const mimeType = audioBlob.type || 'audio/webm';
  const reader = new FileReader();
  const base64Promise = new Promise((resolve, reject) => {
    reader.onloadend = () => {
      const res = reader.result;
      const base64 = typeof res === 'string' ? res.split(',')[1] : '';
      resolve(base64);
    };
    reader.onerror = reject;
  });
  reader.readAsDataURL(audioBlob);
  const audioBase64 = await base64Promise;

  const r = await fetch('/api/transcribe-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, mimeType, lang }),
  });
  if (!r.ok) {
    const errData = await r.json().catch(() => ({}));
    throw new Error(errData.error || 'transcription_failed');
  }
  const data = await r.json();
  return data.transcript || '';
}
