// Simple-Language Scheme Assistant Page (Phase 5.D)
// Grounded strictly in the local scheme database, supporting English, Hindi, and Urdu.
import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { SCHEMES } from '../data/index.js';
import { Link } from 'react-router-dom';
import { useVoiceInput } from '../hooks/useVoiceInput.js';

function FormattedChatText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="chat-text">
      {lines.map((line, lIdx) => {
        if (!line.trim()) return <div key={lIdx} style={{ height: '0.5rem' }} />;
        const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
        return (
          <p key={lIdx} style={{ margin: '0.15rem 0', lineHeight: '1.5' }}>
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pIdx} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={pIdx} style={{ opacity: 0.85, fontSize: '0.85em' }}>{part.slice(1, -1)}</em>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}

export default function Assistant() {
  const { t, tx, lang } = useI18n();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: lang === 'hi'
        ? 'नमस्ते! मैं योजना साथी सहायक हूँ। आप मुझसे किसी भी सरकारी योजना के लाभ, आवश्यक दस्तावेज़ या आवेदन के तरीके के बारे में पूछ सकते हैं।'
        : 'Hello! I am SchemeSaathi Assistant. You can ask me about benefits, required documents, or application procedures for any verified government scheme.',
      schemes: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const messagesEndRef = useRef(null);

  const handleChatVoiceResult = (transcript) => {
    if (!transcript || !transcript.trim()) return;
    const clean = transcript.trim();
    setInput(clean);
    sendMessage(clean);
  };

  const {
    isListening,
    isTranscribing,
    interimTranscript,
    audioLevel,
    voiceError,
    setVoiceError,
    toggleListening,
    stopListening,
  } = useVoiceInput({
    lang,
    onResult: handleChatVoiceResult,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, busy]);

  const sendMessage = async (userText) => {
    const textToSend = userText || input;
    if (!textToSend.trim() || busy) return;

    const userMsg = { role: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/chat-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, lang }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply,
          schemes: data.schemes || [],
          source: data.source,
        },
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      // Client-side grounded fallback over SCHEMES
      const q = textToSend.toLowerCase();
      const localMatches = SCHEMES.filter(
        (s) => s.name.en.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      ).slice(0, 3);

      let fallbackText = '';
      if (localMatches.length > 0) {
        const top = localMatches[0];
        fallbackText = lang === 'hi'
          ? `यहाँ संबंधित योजना है:\n\n**${top.name.hi || top.name.en}**\n• **लाभ**: ${top.benefits?.hi || top.benefits?.en}\n• **विभाग**: ${top.department}\n• **आधिकारिक लिंक**: ${top.applicationUrl || 'सरकारी कार्यालय'}`
          : `Here is a relevant scheme:\n\n**${top.name.en}**\n• **Benefits**: ${top.benefits?.en}\n• **Ministry**: ${top.department}\n• **Official Link**: ${top.applicationUrl || 'Government Portal'}`;
      } else {
        fallbackText = lang === 'hi'
          ? 'माफ़ कीजिए, अभी ऑनलाइन सेवा अनुपलब्ध है। कृपया ऊपर दिए गए सर्च और योजना विकल्पों का उपयोग करें।'
          : 'The online assistant is currently operating offline. You can explore all schemes and criteria using the Find Schemes tool.';
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: fallbackText,
          schemes: localMatches.map((s) => ({ id: s.id, name: s.name })),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    sendMessage(promptText);
  };

  return (
    <main id="main" className="wrap page assistant-page">
      <div className="assistant-header">
        <h1>{t('chat.title')}</h1>
        <p className="lede-sm">{t('chat.subtitle')}</p>
        <p className="assistant-disclaimer">
          <small>ℹ {t('chat.disclaimer')}</small>
        </p>
      </div>

      <div className="assistant-container">
        {/* Quick prompt chips */}
        <div className="quick-prompts-bar" aria-label={t('chat.faqTitle')}>
          <span className="quick-label">⚡ {t('chat.faqTitle')}:</span>
          <button type="button" className="quick-chip" onClick={() => handleQuickPrompt(t('chat.quick1'))}>
            {t('chat.quick1')}
          </button>
          <button type="button" className="quick-chip" onClick={() => handleQuickPrompt(t('chat.quick2'))}>
            {t('chat.quick2')}
          </button>
          <button type="button" className="quick-chip" onClick={() => handleQuickPrompt(t('chat.quick3'))}>
            {t('chat.quick3')}
          </button>
        </div>

        {/* Message history */}
        <div className="chat-messages-box" role="log" aria-live="polite">
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-message is-${m.role}`}>
              <div className="chat-avatar" aria-hidden="true">
                {m.role === 'assistant' ? '🏛' : '👤'}
              </div>
              <div className="chat-bubble">
                <FormattedChatText text={m.text} />
                {m.schemes && m.schemes.length > 0 && (
                  <div className="chat-scheme-links">
                    <span className="links-title">Related schemes:</span>
                    {m.schemes.map((s) => (
                      <Link key={s.id} to={`/scheme/${s.id}`} className="chat-scheme-pill">
                        {tx(s.name)} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="chat-message is-assistant">
              <div className="chat-avatar" aria-hidden="true">🏛</div>
              <div className="chat-bubble is-typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-text">{t('chat.typing')}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice recording visualizer banner in chat */}
        {isListening && (
          <div className="ai-voice-active-box" style={{ marginBottom: '8px' }} role="status">
            <div className="ai-voice-active-header">
              <div className="ai-voice-status-pill">
                <span className="ai-voice-pulse-dot" />
                <span>{lang === 'hi' ? 'माइक सुन रहा है... अपना सवाल बोलें' : 'Listening... ask your question'}</span>
              </div>
              <div className="ai-wave-container">
                {[0.6, 1.2, 0.8, 1.4, 0.9].map((scale, i) => (
                  <span
                    key={i}
                    className="ai-wave-bar"
                    style={{
                      height: `${Math.max(4, Math.min(22, Math.round((audioLevel / 100) * 22 * scale)))}px`,
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                className="btn-voice-finish"
                onClick={stopListening}
              >
                ✓ {lang === 'hi' ? 'पूरा हुआ (Send)' : 'Done (Send)'}
              </button>
            </div>
            <div className="ai-voice-transcript-preview">
              {interimTranscript ? (
                <strong>"{interimTranscript}"</strong>
              ) : (
                <span className="ai-voice-transcript-placeholder">
                  {lang === 'hi'
                    ? 'बोलिए (जैसे: "पीएम किसान योजना का पैसा कब मिलेगा?")...'
                    : 'Speak now (e.g. "How to apply for PM-KISAN?")...'}
                </span>
              )}
            </div>
          </div>
        )}

        {isTranscribing && (
          <div className="ai-transcribing-box" style={{ marginBottom: '8px' }} role="status">
            <span className="ai-spinner" />
            <span>{lang === 'hi' ? '⚡ सवाल का विश्लेषण हो रहा है...' : '⚡ Processing voice question...'}</span>
          </div>
        )}

        {voiceError && (
          <div className="ai-voice-error-box" style={{ marginBottom: '8px' }} role="alert">
            <div><strong>⚠️ {voiceError}</strong></div>
            <button
              type="button"
              className="btn-dismiss-error"
              onClick={() => setVoiceError('')}
            >
              ×
            </button>
          </div>
        )}

        {/* Chat input box */}
        <form
          className="chat-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <button
            type="button"
            className={`ai-mic-btn ${isListening ? 'is-listening' : ''}`}
            onClick={toggleListening}
            title={isListening ? 'माइक बंद करें' : 'माइक से सवाल बोलें'}
            aria-label="Speak question"
          >
            {isListening ? '🛑' : '🎙️'}
          </button>

          <input
            type="text"
            className="input-text chat-input-field"
            placeholder={
              isListening
                ? lang === 'hi'
                  ? 'सुन रहा हूँ... बोलिए...'
                  : 'Listening to your voice...'
                : t('chat.placeholder')
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            aria-label="Message SchemeSaathi Assistant"
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()}>
            {t('chat.send')}
          </button>
        </form>
      </div>
    </main>
  );
}
