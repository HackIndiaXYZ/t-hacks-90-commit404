// Robust Dual-Engine Voice Input Hook for SchemeSaathi
// Combines Browser Web Speech API (for low-latency real-time interim results)
// with MediaRecorder + Gemini Speech-to-Text (as reliable fallback across iframes and mobile browsers)
import { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio } from '../services/api.js';

export function useVoiceInput({ lang = 'hi', onResult }) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 for visualizer
  const [voiceError, setVoiceError] = useState('');

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const speechCapturedRef = useRef('');
  const isStoppingRef = useRef(false);

  // Clean up all audio tracks and contexts
  const cleanupAudioStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Stop recording and process result
  const stopListening = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    // Stop Web Speech API if active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupAudioStream();
      setIsListening(false);
      isStoppingRef.current = false;
    }
  }, [cleanupAudioStream]);

  // Start dual-engine listening
  const startListening = useCallback(async () => {
    setVoiceError('');
    setInterimTranscript('');
    speechCapturedRef.current = '';
    isStoppingRef.current = false;
    audioChunksRef.current = [];

    // 1. Request microphone access via getUserMedia
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
    } catch (err) {
      console.warn('Microphone permission or device error:', err);
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const msg = isDenied
        ? (lang === 'hi'
            ? 'माइक्रोफ़ोन की अनुमति नहीं मिली। कृपया ब्राउज़र में माइक की अनुमति (Allow Mic) दें।'
            : 'Microphone permission denied. Please allow microphone in browser settings.')
        : (lang === 'hi'
            ? 'माइक्रोफ़ोन कनेक्ट नहीं है या उपलब्ध नहीं है।'
            : 'Microphone not found or audio device is busy.');
      setVoiceError(msg);
      return;
    }

    setIsListening(true);

    // 2. Setup Audio Visualizer (real-time RMS volume)
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Scale to 0-100 with non-linear boost for speech
          const level = Math.min(100, Math.round((avg / 128) * 100 * 1.5));
          setAudioLevel(level);
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }
    } catch {
      // AudioContext visualizer non-fatal fallback
    }

    // 3. Setup MediaRecorder for recording audio fallback
    let mimeType = 'audio/webm';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      try {
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          cleanupAudioStream();
          setIsListening(false);
          isStoppingRef.current = false;

          const captured = speechCapturedRef.current.trim();
          if (captured) {
            // Web Speech API successfully returned a transcript!
            if (onResult) onResult(captured);
            setInterimTranscript('');
            return;
          }

          // If Web Speech API didn't return text (e.g., iframe limitation or unsupported browser),
          // fallback to Gemini Audio Transcription!
          const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });
          if (recordedBlob.size > 1200) {
            setIsTranscribing(true);
            try {
              const aiTranscript = await transcribeAudio(recordedBlob, lang);
              if (aiTranscript && aiTranscript.trim()) {
                if (onResult) onResult(aiTranscript.trim());
                setInterimTranscript(aiTranscript.trim());
              } else {
                setVoiceError(
                  lang === 'hi'
                    ? 'कोई आवाज़ स्पष्ट सुनाई नहीं दी। कृपया दोबारा माइक दबाकर बोलें।'
                    : 'No clear speech detected. Please try speaking again.'
                );
              }
            } catch (err) {
              console.warn('AI transcription error:', err);
              setVoiceError(
                lang === 'hi'
                  ? 'आवाज़ प्रोसेस नहीं हो सकी। कृपया नीचे दिए विकल्पों में से चुनें या लिखकर बताएं।'
                  : 'Could not process audio. Please type or select from options below.'
              );
            } finally {
              setIsTranscribing(false);
            }
          } else {
            setVoiceError(
              lang === 'hi'
                ? 'कोई आवाज़ रिकॉर्ड नहीं हुई। माइक दबाने के बाद बोलें।'
                : 'No audio recorded. Please speak after tapping the mic.'
            );
          }
        };

        recorder.start(250); // Slice chunks every 250ms
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.warn('MediaRecorder init failed:', err);
      }
    }

    // 4. Setup Browser Web Speech API alongside MediaRecorder
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.continuous = false;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        rec.lang = lang === 'hi' ? 'hi-IN' : lang === 'ur' ? 'ur-IN' : 'en-IN';

        rec.onresult = (e) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const transcript = e.results[i][0].transcript;
            if (e.results[i].isFinal) {
              speechCapturedRef.current = transcript;
            } else {
              interim += transcript;
            }
          }
          setInterimTranscript(speechCapturedRef.current || interim);
        };

        rec.onerror = (e) => {
          console.warn('SpeechRecognition error (MediaRecorder will handle):', e.error);
          // Non-fatal because MediaRecorder will handle transcription on stop
        };

        rec.onend = () => {
          // If stopped naturally, stop the mediaRecorder to finalize
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err) {
        console.warn('SpeechRecognition start failed (falling back to recorder):', err);
      }
    }
  }, [lang, onResult, cleanupAudioStream]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupAudioStream();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [cleanupAudioStream]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isTranscribing,
    interimTranscript,
    audioLevel,
    voiceError,
    setVoiceError,
    startListening,
    stopListening,
    toggleListening,
    hasBrowserSpeech: typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
  };
}
