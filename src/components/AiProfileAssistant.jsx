// Interactive Conversational AI Voice & Chat Profile Assistant
// Asks questions step-by-step (e.g. "Age बताओ -> Farmer tells age -> Auto-filled"),
// supports Dual-Engine Voice recognition (Web Speech + Gemini STT fallback),
// real-time audio wave visualizer, Text-to-Speech audio questions, and 1-click real-world presets.
import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import {
  extractAge,
  extractState,
  extractOccupation,
  extractLandOwnership,
  extractIncome,
  extractGender,
  extractFullProfile,
} from '../utils/profileExtractor.js';
import { parseProfileText } from '../services/api.js';
import { useVoiceInput } from '../hooks/useVoiceInput.js';

export default function AiProfileAssistant({ onComplete, onClose, activeFieldTarget = null }) {
  const { t, lang } = useI18n();
  const { form, setField, applyExtracted } = useProfile();

  // Mode: 'guided' (step-by-step Q&A), 'freeform' (speak entire profile), 'presets'
  const [mode, setMode] = useState('guided');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [lastExtractedMsg, setLastExtractedMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatLog, setChatLog] = useState([]);

  const inputRef = useRef(null);

  // Questions definitions
  const STEPS = [
    {
      id: 'age',
      field: 'age',
      question: {
        hi: 'नमस्ते! आपकी उम्र (Age) कितनी है? (जैसे: 35, 45, 60)',
        en: 'Hello! What is your age in years? (e.g., 35, 45, 60)',
        ur: 'ہیلو! آپ کی عمر کتنی ہے؟ (جیسے: 35، 45، 60)',
      },
      chips: [
        { label: lang === 'hi' ? '18-25 वर्ष (युवा)' : '18-25 (Youth)', value: '22' },
        { label: lang === 'hi' ? '26-40 वर्ष' : '26-40 years', value: '35' },
        { label: lang === 'hi' ? '41-59 वर्ष' : '41-59 years', value: '45' },
        { label: lang === 'hi' ? '60+ वर्ष (वरिष्ठ)' : '60+ (Senior)', value: '65' },
      ],
      extractor: extractAge,
      confirmText: (v) => (lang === 'hi' ? `उम्र: ${v} वर्ष दर्ज हो गई ✓` : `Age: ${v} years recorded ✓`),
    },
    {
      id: 'state',
      field: 'state',
      question: {
        hi: 'आप भारत के किस राज्य में रहते हैं?',
        en: 'Which Indian State or Union Territory do you currently live in?',
        ur: 'آپ ہندوستان کی کس ریاست میں رہتے ہیں؟',
      },
      chips: [
        { label: lang === 'hi' ? 'बिहार (Bihar)' : 'Bihar', value: 'Bihar' },
        { label: lang === 'hi' ? 'उत्तर प्रदेश (UP)' : 'Uttar Pradesh', value: 'Uttar Pradesh' },
        { label: lang === 'hi' ? 'मध्य प्रदेश (MP)' : 'Madhya Pradesh', value: 'Madhya Pradesh' },
        { label: lang === 'hi' ? 'राजस्थान (Rajasthan)' : 'Rajasthan', value: 'Rajasthan' },
        { label: lang === 'hi' ? 'दिल्ली (Delhi)' : 'Delhi', value: 'Delhi' },
        { label: lang === 'hi' ? 'महाराष्ट्र (Maharashtra)' : 'Maharashtra', value: 'Maharashtra' },
      ],
      extractor: extractState,
      confirmText: (v) => (lang === 'hi' ? `राज्य: ${v} दर्ज हो गया ✓` : `State: ${v} recorded ✓`),
    },
    {
      id: 'occupation',
      field: 'occupation',
      question: {
        hi: 'आपका मुख्य व्यवसाय या पेशा क्या है?',
        en: 'What is your primary occupation or source of livelihood?',
        ur: 'آپ کا بنیادی پیشہ یا روزگار کیا ہے؟',
      },
      chips: [
        { label: lang === 'hi' ? '👨‍🌾 किसान (Farmer)' : '👨‍🌾 Farmer', value: 'farmer' },
        { label: lang === 'hi' ? '👩‍🎓 छात्र / विद्यार्थी (Student)' : '👩‍🎓 Student', value: 'student' },
        { label: lang === 'hi' ? '🏪 स्व-व्यवसायी / दुकान / वेंडर' : '🏪 Self-Employed / Vendor', value: 'selfEmployed' },
        { label: lang === 'hi' ? '💼 नौकरीपेशा (Employed)' : '💼 Employed', value: 'employed' },
        { label: lang === 'hi' ? '⏳ बेरोजगार (Jobseeker)' : '⏳ Unemployed', value: 'unemployed' },
      ],
      extractor: extractOccupation,
      confirmText: (v) => (lang === 'hi' ? `व्यवसाय: ${v} दर्ज हो गया ✓` : `Occupation: ${v} recorded ✓`),
    },
    {
      id: 'ownsLand',
      field: 'ownsLand',
      condition: (f) => f.occupation === 'farmer',
      question: {
        hi: 'क्या आपके या आपके परिवार के नाम पर खेती योग्य ज़मीन है?',
        en: 'Do you or your family own cultivable agricultural land?',
        ur: 'کیا آپ یا آپ کے خاندان کے نام پر زرعی زمین ہے؟',
      },
      chips: [
        { label: lang === 'hi' ? '✅ हाँ, ज़मीन है' : '✅ Yes, I own land', value: 'yes' },
        { label: lang === 'hi' ? '❌ नहीं / भूमिहीन' : '❌ No / Landless', value: 'no' },
      ],
      extractor: extractLandOwnership,
      confirmText: (v) => (lang === 'hi' ? `कृषि भूमि: ${v === 'yes' ? 'हाँ' : 'नहीं'} दर्ज हो गया ✓` : `Farmland: ${v} recorded ✓`),
    },
    {
      id: 'income',
      field: 'income',
      question: {
        hi: 'आपकी अनुमानित वार्षिक पारिवारिक आय (Annual Income) लगभग कितनी है?',
        en: 'What is your approximate annual household income in Rupees?',
        ur: 'آپ کے خاندان کی سالانہ آمدنی کا تخمینہ کतना ہے؟',
      },
      chips: [
        { label: lang === 'hi' ? '₹50,000 से कम (BPL)' : '< ₹50,000 (BPL)', value: '45000' },
        { label: lang === 'hi' ? '₹80,000 (गरीब परिवार)' : '₹80,000 / year', value: '80000' },
        { label: lang === 'hi' ? '₹1.5 लाख' : '₹1,50,000 / year', value: '150000' },
        { label: lang === 'hi' ? '₹2.5 लाख' : '₹2,50,000 / year', value: '250000' },
        { label: lang === 'hi' ? '❓ ठीक से पता नहीं' : '❓ Unsure / Not certain', value: 'unsure' },
      ],
      extractor: extractIncome,
      confirmText: (v) => (lang === 'hi' ? `आय: ${v === 'unsure' ? 'पता नहीं' : '₹' + Number(v).toLocaleString('en-IN')} दर्ज हो गई ✓` : `Income: ${v === 'unsure' ? 'Unsure' : '₹' + Number(v).toLocaleString('en-IN')} recorded ✓`),
    },
    {
      id: 'gender',
      field: 'gender',
      question: {
        hi: 'आपका लिंग (Gender) क्या है?',
        en: 'What is your gender?',
        ur: 'آپ کی جنس کیا ہے؟',
      },
      chips: [
        { label: lang === 'hi' ? '👨 पुरुष (Male)' : '👨 Male', value: 'male' },
        { label: lang === 'hi' ? '👩 महिला (Female)' : '👩 Female', value: 'female' },
        { label: lang === 'hi' ? 'अन्य (Other)' : 'Other', value: 'other' },
      ],
      extractor: extractGender,
      confirmText: (v) => (lang === 'hi' ? `लिंग: ${v} दर्ज हो गया ✓` : `Gender: ${v} recorded ✓`),
    },
  ];

  // Filter steps based on conditions
  const activeSteps = STEPS.filter((s) => !s.condition || s.condition(form));
  const currentStep = activeSteps[currentStepIndex] || null;

  // Text-To-Speech: speak question aloud
  const speakCurrentQuestion = useCallback((textToSpeak) => {
    if (!ttsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'ur' ? 'ur-IN' : 'en-IN';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio blocked or unsupported
    }
  }, [ttsEnabled, lang]);

  // Speak when step changes
  useEffect(() => {
    if (mode === 'guided' && currentStep) {
      const qText = currentStep.question[lang] || currentStep.question.en;
      speakCurrentQuestion(qText);
      inputRef.current?.focus();
    }
  }, [currentStepIndex, mode, lang, currentStep, speakCurrentQuestion]);

  // Jump to specific field if activeFieldTarget is provided
  useEffect(() => {
    if (activeFieldTarget) {
      const idx = activeSteps.findIndex((s) => s.field === activeFieldTarget);
      if (idx !== -1) {
        setCurrentStepIndex(idx);
        setMode('guided');
      }
    }
  }, [activeFieldTarget, activeSteps]);

  // Process user input for current guided question or multi-field sentence
  const handleProcessInput = useCallback((rawText) => {
    const text = (rawText !== undefined ? rawText : userInput).trim();
    if (!text) return;

    setIsProcessing(true);

    // 1. Check if user spoke a full multi-field sentence (e.g. "मेरी उम्र 45 साल है, बिहार का किसान हूँ")
    const full = extractFullProfile(text);
    const extractedFields = Object.entries(full).filter(([_, v]) => v !== null && v !== '');

    if (extractedFields.length > 1) {
      applyExtracted(full, true);
      const fieldNames = extractedFields
        .map(([k, v]) => `${k === 'annualIncome' ? 'आय' : k === 'occupation' ? 'पेशा' : k === 'age' ? 'उम्र' : k}: ${v}`)
        .join(', ');
      const successMsg = lang === 'hi'
        ? `कई फ़ील्ड्स एक साथ दर्ज हो गए ✓ (${fieldNames})`
        : `Multiple details recorded ✓ (${fieldNames})`;
      setLastExtractedMsg(successMsg);
      setUserInput('');
      setIsProcessing(false);

      // Advance to next step that is still empty
      setTimeout(() => {
        const nextIncompleteIdx = activeSteps.findIndex((s) => {
          const val = s.field === 'income' ? (form.incomeUnsure || form.income) : form[s.field];
          return !val;
        });
        if (nextIncompleteIdx !== -1) {
          setCurrentStepIndex(nextIncompleteIdx);
          setLastExtractedMsg('');
        } else {
          setCurrentStepIndex(activeSteps.length);
        }
      }, 700);
      return;
    }

    // 2. Single field processing for current step
    if (!currentStep) {
      setIsProcessing(false);
      return;
    }

    let extractedVal = currentStep.extractor ? currentStep.extractor(text) : null;

    // Fallback: direct match with chips
    if (extractedVal === null && currentStep.chips) {
      const matchChip = currentStep.chips.find(
        (c) => text.toLowerCase().includes(c.value.toLowerCase()) || text.includes(c.label)
      );
      if (matchChip) extractedVal = matchChip.value;
    }

    // Fallback: simple text for state/occupation if not already resolved
    if (extractedVal === null && text.length > 0 && currentStep.field !== 'age' && currentStep.field !== 'income') {
      extractedVal = text;
    }

    if (extractedVal !== null) {
      const updateObj = {};
      if (currentStep.field === 'income') {
        updateObj.annualIncome = extractedVal;
      } else {
        updateObj[currentStep.field] = extractedVal;
        if (currentStep.field === 'state') {
          updateObj.domicile = extractedVal;
        }
      }

      applyExtracted(updateObj, true);

      const confirmMsg = currentStep.confirmText(extractedVal);
      setLastExtractedMsg(confirmMsg);

      // Add to chat history
      setChatLog((prev) => [
        ...prev,
        { role: 'user', text },
        { role: 'assistant', text: confirmMsg },
      ]);

      setUserInput('');
      setIsProcessing(false);

      // Advance to next step
      setTimeout(() => {
        if (currentStepIndex < activeSteps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
          setLastExtractedMsg('');
        } else {
          setCurrentStepIndex(activeSteps.length);
        }
      }, 700);
    } else {
      setIsProcessing(false);
      setLastExtractedMsg(
        lang === 'hi'
          ? `सुना: "${text}"। कृपया नीचे दिए विकल्पों में से चुनें या स्पष्ट बोलें।`
          : `Heard: "${text}". Please choose from options or speak clearly.`
      );
    }
  }, [userInput, currentStep, currentStepIndex, activeSteps, form, lang, applyExtracted]);

  // Freeform profile processing (e.g. speak complete sentence)
  const handleFreeformSubmit = useCallback(async (e, directText) => {
    if (e) e.preventDefault();
    const textToProcess = (directText || userInput).trim();
    if (!textToProcess) return;

    setIsProcessing(true);
    try {
      const res = await parseProfileText(textToProcess);
      if (res && Object.keys(res).length > 0) {
        applyExtracted(res, true);
        setLastExtractedMsg(
          lang === 'hi' ? 'आपकी जानकारी सफलतापूर्वक भर दी गई है!' : 'Your profile details have been successfully autofilled!'
        );
      } else {
        const local = extractFullProfile(textToProcess);
        applyExtracted(local, true);
        setLastExtractedMsg(
          lang === 'hi' ? 'स्थानीय नियमों से जानकारी भर दी गई है!' : 'Details extracted and populated!'
        );
      }
    } catch {
      const local = extractFullProfile(textToProcess);
      applyExtracted(local, true);
      setLastExtractedMsg(
        lang === 'hi' ? 'जानकारी भर दी गई है!' : 'Details extracted and populated!'
      );
    }
    setIsProcessing(false);
  }, [userInput, lang, applyExtracted]);

  // Voice transcript receiver callback
  const handleVoiceTranscript = useCallback((transcript) => {
    if (!transcript) return;
    setUserInput(transcript);
    if (mode === 'guided') {
      handleProcessInput(transcript);
    } else if (mode === 'freeform') {
      handleFreeformSubmit(null, transcript);
    }
  }, [mode, handleProcessInput, handleFreeformSubmit]);

  // Dual-Engine Voice Input Hook
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
    onResult: handleVoiceTranscript,
  });

  // Quick chip click handler
  const handleChipClick = (value) => {
    setUserInput(value);
    handleProcessInput(value);
  };

  // 1-Click Real World Presets
  const PRESETS = [
    {
      id: 'farmer-bihar',
      title: lang === 'hi' ? '👨‍🌾 बिहार का छोटा किसान' : '👨‍🌾 Small Farmer - Bihar',
      desc: lang === 'hi' ? '45 वर्ष, ₹80,000 आय, खेती की ज़मीन है (PM-KISAN, KCC, BRFSY)' : 'Age 45, ₹80,000 income, cultivable land (PM-KISAN, KCC, BRFSY)',
      data: { age: 45, state: 'Bihar', domicile: 'Bihar', occupation: 'farmer', ownsLand: 'yes', annualIncome: 80000, gender: 'male' },
    },
    {
      id: 'student-girl',
      title: lang === 'hi' ? '👩‍🎓 कॉलेज छात्रा' : '👩‍🎓 College Student (Woman)',
      desc: lang === 'hi' ? '20 वर्ष, उत्तर प्रदेश, ₹1.5 लाख आय, उच्च शिक्षा' : 'Age 20, Uttar Pradesh, ₹1.5L income, higher education',
      data: { age: 20, state: 'Uttar Pradesh', domicile: 'Uttar Pradesh', occupation: 'student', isStudent: 'yes', annualIncome: 150000, gender: 'female' },
    },
    {
      id: 'senior-citizen',
      title: lang === 'hi' ? '👴 वरिष्ठ नागरिक (पेंशन)' : '👴 Senior Citizen (Pension)',
      desc: lang === 'hi' ? '65 वर्ष, बिहार, ₹50,000 आय, BPL (IGNOAPS, Ayushman Bharat)' : 'Age 65, Bihar, ₹50,000 income, BPL (IGNOAPS, PM-JAY)',
      data: { age: 65, state: 'Bihar', domicile: 'Bihar', occupation: 'unemployed', annualIncome: 50000, gender: 'male' },
    },
    {
      id: 'street-vendor',
      title: lang === 'hi' ? '🏪 रेहड़ी-पटरी / स्ट्रीट वेंडर' : '🏪 Street Vendor / Small Business',
      desc: lang === 'hi' ? '36 वर्ष, दिल्ली, ₹1 लाख आय (PM SVANidhi, MUDRA loan)' : 'Age 36, Delhi, ₹1L income (PM SVANidhi, MUDRA loan)',
      data: { age: 36, state: 'Delhi', domicile: 'Delhi', occupation: 'selfEmployed', annualIncome: 100000, gender: 'male' },
    },
  ];

  const handleApplyPreset = (preset) => {
    applyExtracted(preset.data, false);
    setLastExtractedMsg(
      lang === 'hi' ? `${preset.title} की प्रोफाइल सफलतापूर्वक लोड हो गई!` : `${preset.title} profile successfully loaded!`
    );
    if (onComplete) onComplete();
  };

  const isAllComplete = currentStepIndex >= activeSteps.length;

  return (
    <div className="ai-assistant-card" aria-label="AI Profile Autofill Assistant">
      <div className="ai-assistant-header">
        <div className="ai-title-wrap">
          <span className="ai-sparkle-badge">✨ AI Autofill</span>
          <div>
            <h3 className="ai-heading">
              {lang === 'hi' ? 'AI सवाल-जवाब से प्रोफाइल भरें' : 'Autofill Profile with AI Assistant'}
            </h3>
            <p className="ai-subheading">
              {lang === 'hi'
                ? 'माइक दबाकर बोलें (जैसे अपनी उम्र, राज्य, पेशा) और फॉर्म अपने आप भर जाएगा। बोलें या लिखें।'
                : 'Click mic and speak your answers (age, state, occupation). The form will be autofilled automatically.'}
            </p>
          </div>
        </div>

        <div className="ai-header-controls">
          <button
            type="button"
            className={`btn-tts-toggle ${ttsEnabled ? 'is-active' : ''}`}
            onClick={() => {
              setTtsEnabled(!ttsEnabled);
              if (ttsEnabled && typeof window !== 'undefined') window.speechSynthesis?.cancel();
            }}
            title={ttsEnabled ? 'Mute AI voice' : 'Enable AI voice speaking'}
            aria-label="Toggle Voice Read-Out"
          >
            {ttsEnabled ? '🔊 Voice On' : '🔇 Muted'}
          </button>
          {onClose && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              title="Close AI Assistant"
            >
              ✕ {lang === 'hi' ? 'सहायक छुपाएं' : 'Hide'}
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="ai-mode-tabs" role="tablist">
        <button
          type="button"
          className={`ai-tab ${mode === 'guided' ? 'is-active' : ''}`}
          onClick={() => setMode('guided')}
        >
          💬 {lang === 'hi' ? 'चरणबद्ध सवाल-जवाब (Q&A)' : 'Step-by-Step Q&A'}
        </button>
        <button
          type="button"
          className={`ai-tab ${mode === 'freeform' ? 'is-active' : ''}`}
          onClick={() => setMode('freeform')}
        >
          🎙️ {lang === 'hi' ? 'एक साथ पूरा बोलें' : 'Speak Entire Profile'}
        </button>
        <button
          type="button"
          className={`ai-tab ${mode === 'presets' ? 'is-active' : ''}`}
          onClick={() => setMode('presets')}
        >
          ⚡ {lang === 'hi' ? '1-क्लिक डेमो प्रोफाइल्स' : '1-Click Presets'}
        </button>
      </div>

      {/* 1. GUIDED QUESTION-BY-QUESTION MODE */}
      {mode === 'guided' && (
        <div className="ai-guided-flow">
          {!isAllComplete && currentStep ? (
            <>
              {/* Step counter bar */}
              <div className="ai-step-indicator">
                <span>
                  {lang === 'hi' ? 'सवाल' : 'Question'} {currentStepIndex + 1} / {activeSteps.length}
                </span>
                <div className="ai-step-dots">
                  {activeSteps.map((s, idx) => (
                    <span
                      key={s.id}
                      className={`ai-dot ${idx === currentStepIndex ? 'is-current' : idx < currentStepIndex ? 'is-done' : ''}`}
                      onClick={() => setCurrentStepIndex(idx)}
                      title={`Go to ${s.id}`}
                    />
                  ))}
                </div>
              </div>

              {/* Question bubble */}
              <div className="ai-question-bubble">
                <div className="ai-avatar">🏛️</div>
                <div className="ai-bubble-content">
                  <p className="ai-q-text">
                    {currentStep.question[lang] || currentStep.question.en}
                  </p>
                  <button
                    type="button"
                    className="ai-speak-btn"
                    onClick={() => speakCurrentQuestion(currentStep.question[lang] || currentStep.question.en)}
                    title="Speak question aloud"
                  >
                    🔊 {lang === 'hi' ? 'सुनें' : 'Listen'}
                  </button>
                </div>
              </div>

              {/* Quick Choice Chips */}
              {currentStep.chips && (
                <div className="ai-chips-grid">
                  {currentStep.chips.map((chip, cIdx) => (
                    <button
                      key={cIdx}
                      type="button"
                      className="ai-chip-btn"
                      onClick={() => handleChipClick(chip.value)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Voice & Input reply bar */}
              <form
                className="ai-reply-bar"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessInput();
                }}
              >
                <button
                  type="button"
                  className={`ai-mic-btn ${isListening ? 'is-listening' : ''}`}
                  onClick={toggleListening}
                  title={isListening ? 'माइक चालू है - रोकने के लिए क्लिक करें' : 'माइक दबाकर जवाब बोलें'}
                  aria-label="Speak answer"
                >
                  {isListening ? '🛑' : '🎙️'}
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  className="ai-reply-input"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={
                    isListening
                      ? lang === 'hi'
                        ? 'माइक चालू है... बोलिए (जैसे "35 साल" या "बिहार")...'
                        : 'Listening... speak your answer...'
                      : lang === 'hi'
                      ? 'यहाँ लिखें या 🎙️ माइक दबाकर बोलें...'
                      : 'Type here or click 🎙️ mic to speak...'
                  }
                  autoComplete="off"
                />

                <button
                  type="submit"
                  className="btn btn-solid"
                  disabled={!userInput.trim() || isProcessing}
                >
                  {isProcessing ? '...' : lang === 'hi' ? 'दर्ज करें' : 'Autofill'}
                </button>
              </form>

              {/* Live Audio Visualizer Banner when Microphone is Listening */}
              {isListening && (
                <div className="ai-voice-active-box" role="status" aria-live="polite">
                  <div className="ai-voice-active-header">
                    <div className="ai-voice-status-pill">
                      <span className="ai-voice-pulse-dot" />
                      <span>{lang === 'hi' ? 'माइक सुन रहा है... बोलिए' : 'Listening to your microphone...'}</span>
                    </div>

                    {/* Animated Waveform Meter */}
                    <div className="ai-wave-container" aria-label="Audio level meter">
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
                      ✓ {lang === 'hi' ? 'हो गया (Done)' : 'Done'}
                    </button>
                  </div>

                  {/* Live speech preview */}
                  <div className="ai-voice-transcript-preview">
                    {interimTranscript ? (
                      <strong>"{interimTranscript}"</strong>
                    ) : (
                      <span className="ai-voice-transcript-placeholder">
                        {lang === 'hi'
                          ? 'बोलिए (जैसे: "35 साल" या "मेरी उम्र 35 है")...'
                          : 'Speak now (e.g. "35" or "I am 35 years old")...'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* AI Transcribing in progress */}
              {isTranscribing && (
                <div className="ai-transcribing-box" role="status">
                  <span className="ai-spinner" />
                  <span>
                    {lang === 'hi'
                      ? '⚡ आवाज़ से शब्द समझे जा रहे हैं...'
                      : '⚡ Transcribing audio with AI...'}
                  </span>
                </div>
              )}

              {/* Voice Error Notice */}
              {voiceError && (
                <div className="ai-voice-error-box" role="alert">
                  <div>
                    <strong>⚠️ {voiceError}</strong>
                    <div style={{ marginTop: '2px', opacity: 0.9 }}>
                      {lang === 'hi'
                        ? 'सुझाव: आप ऊपर दिए गए बटनों (chips) पर क्लिक करके भी तुरंत जवाब दर्ज कर सकते हैं।'
                        : 'Tip: You can also tap the quick choice buttons above to answer instantly.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-dismiss-error"
                    onClick={() => setVoiceError('')}
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Last confirmed feedback */}
              {lastExtractedMsg && (
                <p className="ai-feedback-msg" role="status">
                  {lastExtractedMsg}
                </p>
              )}
            </>
          ) : (
            /* Completed all questions screen */
            <div className="ai-completed-box">
              <span className="completed-icon">🎉</span>
              <h4>{lang === 'hi' ? 'बधाई! आपकी प्रोफाइल पूरी हो गई है' : 'Profile Complete!'}</h4>
              <p>
                {lang === 'hi'
                  ? 'सभी आवश्यक विवरण फॉर्म में भर दिए गए हैं। आप नीचे दिए बटन से अपनी पात्र योजनाएँ देख सकते हैं।'
                  : 'All details have been autofilled into the form. You can now view your matched government schemes.'}
              </p>

              <div className="ai-filled-summary">
                <span className="sum-tag">उम्र: {form.age || '-'}</span>
                <span className="sum-tag">राज्य: {form.state || '-'}</span>
                <span className="sum-tag">पेशा: {form.occupation || '-'}</span>
                {form.ownsLand && <span className="sum-tag">ज़मीन: {form.ownsLand === 'yes' ? 'हाँ' : 'नहीं'}</span>}
                <span className="sum-tag">
                  आय: {form.incomeUnsure ? 'पता नहीं' : form.income ? `₹${Number(form.income).toLocaleString('en-IN')}` : '-'}
                </span>
                <span className="sum-tag">लिंग: {form.gender || '-'}</span>
              </div>

              <div className="ai-completed-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => {
                    if (onComplete) onComplete();
                  }}
                >
                  🔍 {lang === 'hi' ? 'मेरी पात्र योजनाएँ खोजें' : 'Find My Eligible Schemes'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setCurrentStepIndex(0)}
                >
                  🔄 {lang === 'hi' ? 'दोबारा शुरू करें' : 'Start Over'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. FREEFORM NATURAL VOICE & SENTENCE MODE */}
      {mode === 'freeform' && (
        <div className="ai-freeform-flow">
          <p className="freeform-intro">
            {lang === 'hi'
              ? 'एक ही वाक्य में अपने बारे में बताएँ या माइक दबाकर बोलें। उदाहरण: "मेरी उम्र 45 साल है, बिहार का किसान हूँ, 2 एकड़ ज़मीन है और वार्षिक आय 80,000 है।"'
              : 'Describe yourself in a sentence or tap the mic. Example: "I am 45 years old farmer from Bihar with 2 acres land and 80,000 annual income."'}
          </p>

          <form onSubmit={handleFreeformSubmit} className="freeform-form">
            <div className="freeform-input-wrap">
              <textarea
                className="input freeform-textarea"
                rows={3}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={
                  isListening
                    ? lang === 'hi'
                      ? 'माइक सुन रहा है... पूरा वाक्य बोलिए...'
                      : 'Listening... speak your complete profile sentence...'
                    : lang === 'hi'
                    ? 'यहाँ बोलकर या लिखकर पूरा वाक्य दर्ज करें...'
                    : 'Speak or type your entire profile sentence here...'
                }
              />
              <button
                type="button"
                className={`freeform-mic-btn ${isListening ? 'is-listening' : ''}`}
                onClick={toggleListening}
                title="Speak into microphone"
              >
                {isListening ? '🛑 बंद करें' : '🎙️ बोलें (Speak)'}
              </button>
            </div>

            {/* Active recording visualizer in freeform mode */}
            {isListening && (
              <div className="ai-voice-active-box" role="status" style={{ marginBottom: '12px' }}>
                <div className="ai-voice-active-header">
                  <div className="ai-voice-status-pill">
                    <span className="ai-voice-pulse-dot" />
                    <span>{lang === 'hi' ? 'माइक सुन रहा है... पूरा वाक्य बोलिए' : 'Listening to your profile...'}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-voice-finish"
                    onClick={stopListening}
                  >
                    ✓ {lang === 'hi' ? 'हो गया (Done)' : 'Done'}
                  </button>
                </div>
                <div className="ai-voice-transcript-preview">
                  {interimTranscript ? (
                    <strong>"{interimTranscript}"</strong>
                  ) : (
                    <span className="ai-voice-transcript-placeholder">
                      {lang === 'hi' ? 'बोलिए (जैसे: "मैं 45 साल का बिहार का किसान हूँ...")...' : 'Listening for your voice...'}
                    </span>
                  )}
                </div>
              </div>
            )}

            {isTranscribing && (
              <div className="ai-transcribing-box" role="status" style={{ marginBottom: '12px' }}>
                <span className="ai-spinner" />
                <span>{lang === 'hi' ? '⚡ वाक्य का विश्लेषण हो रहा है...' : '⚡ Processing speech...'}</span>
              </div>
            )}

            {voiceError && (
              <div className="ai-voice-error-box" role="alert" style={{ marginBottom: '12px' }}>
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

            <div className="freeform-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!userInput.trim() || isProcessing}
              >
                {isProcessing
                  ? lang === 'hi' ? 'विश्लेषण हो रहा है...' : 'Extracting...'
                  : lang === 'hi' ? '✨ सभी फ़ील्ड्स ऑटो-फिल करें' : '✨ Autofill All Fields'}
              </button>
              {lastExtractedMsg && (
                <span className="freeform-status" role="status">
                  {lastExtractedMsg}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* 3. 1-CLICK REAL WORLD PRESETS */}
      {mode === 'presets' && (
        <div className="ai-presets-grid">
          {PRESETS.map((p) => (
            <div key={p.id} className="preset-card">
              <div className="preset-head">
                <h4>{p.title}</h4>
                <p className="preset-desc">{p.desc}</p>
              </div>
              <button
                type="button"
                className="btn btn-solid btn-sm"
                onClick={() => handleApplyPreset(p)}
              >
                ⚡ {lang === 'hi' ? 'यह प्रोफाइल चुनें' : 'Autofill This'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
