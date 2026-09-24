const VOICE_LANGUAGES = ["or-IN", "hi-IN", "en-IN"];

function playSoftChime() {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, start);
    oscillator.frequency.exponentialRampToValueAtTime(880, start + 0.12);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.2);
    oscillator.addEventListener("ended", () => void context.close());
  } catch {
    // Audio autoplay is optional; speech should still be attempted.
  }
}

export function playOrderVoiceAlert(itemName, price) {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;

  const speech = window.speechSynthesis;
  const voices = speech.getVoices();
  const voice = VOICE_LANGUAGES.reduce(
    (selected, language) => selected || voices.find((candidate) => candidate.lang === language),
    null,
  );
  const utterance = new SpeechSynthesisUtterance(
    `ନୂଆ ଅର୍ଡର୍! ${itemName}, ${price} ଟଙ୍କା, ଦୟାକରି ପ୍ୟାକ୍ କରନ୍ତୁ।`,
  );
  utterance.lang = voice?.lang || VOICE_LANGUAGES[0];
  utterance.rate = 0.85;
  utterance.pitch = 1.0;
  if (voice) utterance.voice = voice;

  speech.cancel();
  playSoftChime();
  speech.speak(utterance);
  return true;
}