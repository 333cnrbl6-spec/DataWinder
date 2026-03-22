import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Static animal data ──────────────────────────────────────────────────────
const animals = [
  { emoji: '🦁', name: 'Lion', sound: 'Roar!', color: 'from-yellow-300 to-orange-400', fact: 'Lions live in Africa and are called the King of the Jungle!' },
  { emoji: '🐘', name: 'Elephant', sound: 'Trumpet!', color: 'from-gray-300 to-gray-500', fact: 'Elephants never forget! They have the biggest brains of any land animal.' },
  { emoji: '🦋', name: 'Butterfly', sound: 'Flutter!', color: 'from-pink-300 to-purple-400', fact: 'Butterflies taste with their feet! They have tiny taste sensors there.' },
  { emoji: '🐢', name: 'Turtle', sound: 'Plod plod!', color: 'from-green-300 to-emerald-500', fact: 'Turtles can live over 100 years! Some are even older than your great great grandparents.' },
  { emoji: '🦜', name: 'Parrot', sound: 'Squawk!', color: 'from-red-300 to-green-400', fact: 'Parrots can copy your voice! Some can even learn hundreds of words.' },
  { emoji: '🐬', name: 'Dolphin', sound: 'Click click!', color: 'from-blue-300 to-cyan-400', fact: 'Dolphins are super clever! They call each other by special whistle names.' },
  { emoji: '🦊', name: 'Fox', sound: 'Yip yip!', color: 'from-orange-300 to-red-400', fact: 'Foxes are very clever! They can hear mice hiding under deep snow.' },
  { emoji: '🐸', name: 'Frog', sound: 'Ribbit!', color: 'from-green-300 to-lime-400', fact: 'Frogs drink water through their skin! They never need to take a sip.' },
  { emoji: '🦒', name: 'Giraffe', sound: 'Hmm!', color: 'from-yellow-200 to-amber-400', fact: 'Giraffes have the longest neck of any animal! It can be 2 metres long!' },
  { emoji: '🐧', name: 'Penguin', sound: 'Squeak!', color: 'from-slate-300 to-blue-400', fact: 'Penguins are birds but they cannot fly! They swim super fast instead.' },
  { emoji: '🦔', name: 'Hedgehog', sound: 'Sniff sniff!', color: 'from-amber-200 to-brown-400', fact: 'Hedgehogs have up to 7000 spines on their back to keep them safe!' },
  { emoji: '🦩', name: 'Flamingo', sound: 'Honk!', color: 'from-pink-200 to-rose-400', fact: 'Flamingos are pink because of the tiny shrimps they eat! They are born white.' },
];

const ROSA_PROMPTS = [
  "Tap an animal to hear a fun fact! 🐾",
  "Try the big microphone button — just talk to me! 🎤",
  "Tap another animal! There are so many to discover! 🌍",
  "Say 'tell me a fact' and I will share something amazing! 🌟",
  "You are doing so well! Tap more animals! 🎉",
  "Say 'what is your favourite animal' to me! 🦁",
  "Try saying 'hello Rosa' into the microphone! 🎤",
  "Scroll down to search for a real animal! 🔍",
];

// ── Voice helpers ────────────────────────────────────────────────────────────
const stripEmojis = (str) => str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();

let currentUtterance = null;

const speak = (text, onWord, onEnd) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = stripEmojis(text);
  const utter = new SpeechSynthesisUtterance(clean);
  utter.rate = 0.8;
  utter.pitch = 1.6;
  utter.volume = 1;
  if (onWord) utter.onboundary = (e) => { if (e.name === 'word') onWord(e.charIndex, e.charLength); };
  if (onEnd) utter.onend = onEnd;
  currentUtterance = utter;

  const trySpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    const female =
      voices.find(v => /samantha|karen|moira|tessa|victoria|zira|susan|linda|amy|emma|lisa/i.test(v.name) && /en/i.test(v.lang)) ||
      voices.find(v => /female|woman/i.test(v.name) && /en/i.test(v.lang)) ||
      voices.find(v => /en/i.test(v.lang));
    if (female) utter.voice = female;
    window.speechSynthesis.speak(utter);
  };

  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = trySpeak;
  } else {
    trySpeak();
  }
};

// ── Word-highlight component ─────────────────────────────────────────────────
function SpeakingText({ text, highlightIndex, highlightLen }) {
  if (highlightIndex === null) return <span>{text}</span>;
  const before = text.slice(0, highlightIndex);
  const word = text.slice(highlightIndex, highlightIndex + highlightLen);
  const after = text.slice(highlightIndex + highlightLen);
  return (
    <span>
      {before}
      <span className="bg-yellow-300 text-yellow-900 rounded px-0.5 transition-all duration-100">{word}</span>
      {after}
    </span>
  );
}

// ── Animal Card (expands + reads aloud with word highlight) ──────────────────
function AnimalCard({ animal, onTap }) {
  const [expanded, setExpanded] = useState(false);
  const [hlIndex, setHlIndex] = useState(null);
  const [hlLen, setHlLen] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  const handleTap = () => {
    const nowExpanded = !expanded;
    setExpanded(nowExpanded);
    onTap(animal);
    if (nowExpanded) {
      const fullText = `${animal.name}! ${animal.sound} Did you know? ${animal.fact}`;
      setSpeaking(true);
      setHlIndex(null);
      speak(
        fullText,
        (charIndex, charLen) => { setHlIndex(charIndex); setHlLen(charLen); },
        () => { setHlIndex(null); setSpeaking(false); }
      );
    } else {
      window.speechSynthesis?.cancel();
      setHlIndex(null);
      setSpeaking(false);
    }
  };

  const factText = `${animal.name}! ${animal.sound} Did you know? ${animal.fact}`;

  return (
    <button
      onClick={handleTap}
      className={`bg-gradient-to-br ${animal.color} rounded-3xl flex flex-col items-center shadow-lg border-4 border-white transition-all duration-300 ${expanded ? 'col-span-2 p-5 scale-100' : 'p-3 hover:scale-110 active:scale-95'}`}
      style={{ minHeight: expanded ? 180 : undefined }}
    >
      <span className={`transition-all duration-300 ${expanded ? 'text-7xl mb-3' : 'text-4xl'}`}>{animal.emoji}</span>
      <span className={`font-black text-white drop-shadow ${expanded ? 'text-2xl mb-3' : 'text-xs'}`}>{animal.name}</span>
      {expanded && (
        <div className="bg-white/80 rounded-2xl px-4 py-3 text-center">
          <p className="text-base font-bold text-slate-700 leading-relaxed">
            <SpeakingText text={factText} highlightIndex={hlIndex} highlightLen={hlLen} />
          </p>
          {speaking && <p className="text-xs text-pink-600 font-semibold mt-2 animate-pulse">🔊 Rosa is reading…</p>}
        </div>
      )}
      {!expanded && <span className="text-xs font-semibold text-white/80 mt-0.5">Tap me!</span>}
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ForKids() {
  const [name, setName] = useState('');
  const [confirmedName, setConfirmedName] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [rosaTyping, setRosaTyping] = useState(false);
  const [count, setCount] = useState(0);
  const [stars, setStars] = useState([]);
  const [promptIdx, setPromptIdx] = useState(0);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Stars background
  useEffect(() => {
    setStars(Array.from({ length: 18 }, (_, i) => ({
      id: i, left: Math.random() * 100, top: Math.random() * 100,
      size: Math.random() * 18 + 10, delay: Math.random() * 3,
    })));
  }, []);

  // Check mic support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setMicSupported(!!SpeechRecognition);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Rotating prompt every 8 seconds
  useEffect(() => {
    if (!confirmedName) return;
    const t = setInterval(() => setPromptIdx(p => (p + 1) % ROSA_PROMPTS.length), 8000);
    return () => clearInterval(t);
  }, [confirmedName]);

  const addRosaMessage = useCallback((text) => {
    setChatMessages(prev => [...prev, { from: 'rosa', text }]);
    setTimeout(() => speak(text), 300);
  }, []);

  const handleNameSubmit = () => {
    const n = name.trim();
    if (!n) return;
    setConfirmedName(n);
    const msg = `Hiii ${n}! I am SO happy to meet you! Tap the animals below to learn fun facts. You can also use the big microphone button to talk to me!`;
    setChatMessages([{ from: 'rosa', text: `Hiii ${n}! 🌸 I'm SO happy to meet you! Tap the animals below to learn fun facts, or use the 🎤 microphone to talk to me!` }]);
    setTimeout(() => speak(msg), 300);
  };

  const handleAnimalTap = (animal) => {
    setCount(c => c + 1);
  };

  // Voice recognition
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    window.speechSynthesis?.cancel();
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-GB';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      setChatMessages(prev => [...prev, { from: 'user', text: transcript }]);
      handleVoiceInput(transcript);
    };

    recognition.start();
  };

  const handleVoiceInput = (text) => {
    setRosaTyping(true);
    setTimeout(() => {
      setRosaTyping(false);
      let response;
      if (text.includes('favourite') || text.includes('favorite')) {
        response = `My favourite animal is the elephant 🐘 because they never forget — just like me! What is yours?`;
      } else if (text.includes('fact') || text.includes('tell me')) {
        const a = animals[Math.floor(Math.random() * animals.length)];
        response = `Here is a fun fact about the ${a.name}! ${a.fact}`;
      } else if (text.includes('hello') || text.includes('hi') || text.includes('hiya')) {
        response = `Hello ${confirmedName || 'friend'}! 🌸 It is so lovely to hear your voice! Tap an animal to learn something amazing!`;
      } else if (text.includes('search') || text.includes('find')) {
        response = `Great idea! Scroll down to the animal search box and type an animal name to find real pictures from nature! 🔍`;
      } else if (text.includes('name')) {
        response = `My name is Rosa! 🌸 I love animals and helping children learn about them!`;
      } else {
        const prompts = [
          `That is so interesting ${confirmedName || 'friend'}! Tap an animal to hear a fun fact! 🐾`,
          `Wow! You are amazing! Try tapping on the big animal pictures! 🦁`,
          `I love chatting with you! Say 'tell me a fact' and I will share something cool! 🌟`,
        ];
        response = prompts[Math.floor(Math.random() * prompts.length)];
      }
      addRosaMessage(response);
    }, 900);
  };

  // Kids-safe animal search via iNaturalist
  const handleAnimalSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    const q = encodeURIComponent(searchQuery.trim());
    const url = `https://api.inaturalist.org/v1/taxa?q=${q}&rank=species,genus&per_page=6&photos=true&is_active=true`;
    const res = await fetch(url);
    const data = await res.json();
    setSearchResults(data.results || []);
    setSearching(false);
    if (data.results?.length > 0) {
      addRosaMessage(`I found some real ${searchQuery} pictures from nature! How cool! 🌿`);
    } else {
      addRosaMessage(`Hmm, I could not find that one. Try another animal name! 🔍`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-green-200 to-emerald-300 relative overflow-hidden">

      {/* Floating sparkles */}
      {stars.map(s => (
        <div key={s.id} className="absolute animate-pulse pointer-events-none select-none"
          style={{ left: `${s.left}%`, top: `${s.top}%`, fontSize: `${s.size}px`, animationDelay: `${s.delay}s`, opacity: 0.5 }}>✨</div>
      ))}

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3 animate-bounce">🌍</div>
          <h1 className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg mb-3" style={{ textShadow: '3px 3px 0px #065f46' }}>
            Hello, Little Explorer! 👋
          </h1>
          <p className="text-xl font-bold text-emerald-900 bg-white/60 rounded-2xl px-6 py-3 inline-block">
            Let's discover amazing animals! 🐾
          </p>
        </div>

        {/* ── Rosa + Chat ── */}
        <div className="bg-gradient-to-br from-pink-100 to-fuchsia-100 rounded-3xl p-5 mb-8 shadow-xl border-4 border-pink-400">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Rosa avatar */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-b from-pink-300 to-fuchsia-400 rounded-full flex items-center justify-center shadow-lg border-4 border-pink-200 text-5xl">👩</div>
                <div className="w-24 h-12 bg-gradient-to-b from-pink-400 to-fuchsia-500 rounded-b-full mx-auto -mt-1 shadow border-b-4 border-fuchsia-300 flex items-end justify-center pb-1">
                  <span className="text-white text-xs font-bold">🌸🌸</span>
                </div>
              </div>
              <p className="mt-1 text-base font-black text-pink-700">Rosa 🌸</p>
            </div>

            {/* Name entry or chat */}
            <div className="flex-1 w-full">
              {!confirmedName ? (
                <div className="text-center sm:text-left">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-2xl font-black text-pink-700">Hi! I'm Rosa! 🌸</p>
                    <button onClick={() => speak("Hi! I'm Rosa! I love animals and making friends! What is your name?")}
                      className="text-2xl hover:scale-125 transition-transform" title="Hear Rosa!">🔊</button>
                  </div>
                  <p className="text-base font-semibold text-slate-600 mb-4">I love animals and making friends! What's your name?</p>

                  {/* Name via keyboard */}
                  <div className="flex gap-2 mb-3">
                    <input
                      className="flex-1 rounded-2xl border-4 border-pink-300 px-4 py-3 text-xl font-bold text-pink-800 outline-none focus:border-fuchsia-400 bg-white"
                      placeholder="Type your name ✏️"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                      maxLength={20}
                    />
                    <button onClick={handleNameSubmit}
                      className="bg-pink-500 hover:bg-pink-600 text-white font-black text-xl rounded-2xl px-5 py-3 shadow-lg transition-all active:scale-95">
                      👋 Hi!
                    </button>
                  </div>

                  {/* Or use mic */}
                  {micSupported && (
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-500 mb-2">— or say your name! —</p>
                      <button
                        onMouseDown={startListening}
                        className={`text-5xl rounded-full w-20 h-20 flex items-center justify-center mx-auto shadow-xl border-4 transition-all ${listening ? 'bg-red-400 border-red-600 animate-pulse scale-110' : 'bg-pink-400 border-pink-600 hover:scale-110'}`}
                        title="Hold and speak!"
                      >🎤</button>
                      <p className="text-xs text-slate-500 mt-1 font-semibold">{listening ? 'Listening…' : 'Tap and speak!'}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Flowing prompt */}
                  <div className="bg-pink-50 border-2 border-pink-300 rounded-2xl px-4 py-2 mb-3 flex items-center gap-2">
                    <span className="text-xl">💡</span>
                    <p className="text-sm font-bold text-pink-700 animate-pulse">{ROSA_PROMPTS[promptIdx]}</p>
                    <button onClick={() => speak(ROSA_PROMPTS[promptIdx])} className="text-base ml-auto">🔊</button>
                  </div>

                  {/* Chat bubbles */}
                  <div className="bg-white rounded-2xl border-4 border-pink-200 p-3 h-36 overflow-y-auto flex flex-col gap-2 mb-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm font-semibold flex items-center gap-1 ${msg.from === 'rosa' ? 'bg-pink-100 text-pink-800 border-2 border-pink-200' : 'bg-fuchsia-500 text-white'}`}>
                          {msg.from === 'rosa' && <span className="mr-1">🌸</span>}
                          {msg.text}
                          {msg.from === 'rosa' && (
                            <button onClick={() => speak(msg.text)} className="ml-2 text-base flex-shrink-0 hover:scale-125 transition-transform" title="Hear this!">🔊</button>
                          )}
                        </div>
                      </div>
                    ))}
                    {rosaTyping && (
                      <div className="flex justify-start">
                        <div className="bg-pink-100 text-pink-800 border-2 border-pink-200 px-3 py-2 rounded-2xl text-sm font-semibold animate-pulse">🌸 Rosa is thinking…</div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* BIG microphone button — primary input */}
                  {micSupported && (
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onMouseDown={startListening}
                        className={`text-4xl rounded-full w-16 h-16 flex items-center justify-center shadow-xl border-4 transition-all flex-shrink-0 ${listening ? 'bg-red-400 border-red-600 animate-pulse scale-110' : 'bg-pink-400 border-pink-600 hover:scale-110 active:scale-95'}`}
                        title="Tap and talk to Rosa!"
                      >🎤</button>
                      <p className="text-sm font-bold text-pink-700">{listening ? '👂 I\'m listening!' : 'Tap to talk to me!'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Animal Grid ── */}
        <div className="bg-white/80 rounded-3xl p-6 mb-8 shadow-xl border-4 border-purple-300">
          <h2 className="text-2xl font-black text-center text-purple-700 mb-1">🐾 Tap an animal to say hello!</h2>
          <p className="text-center text-slate-600 font-semibold mb-5 text-sm">Tap to make it big — Rosa will read the fact to you! 🔊</p>
          <div className="grid grid-cols-4 gap-3">
            {animals.map((animal, i) => (
              <AnimalCard key={i} animal={animal} onTap={handleAnimalTap} />
            ))}
          </div>

          {count > 0 && (
            <div className="mt-5 text-center bg-green-100 border-4 border-green-400 rounded-3xl py-3 px-4">
              <p className="text-xl font-black text-green-700">🎉 You found {count} animal{count !== 1 ? 's' : ''}!</p>
              {count >= 4 && <p className="text-base font-bold text-purple-600 mt-1">⭐ You're a brilliant explorer!</p>}
              {count >= 8 && <p className="text-base font-bold text-orange-500 mt-1">🏆 Amazing! You found them all!</p>}
            </div>
          )}
        </div>

        {/* ── Kids-Safe Animal Search ── */}
        <div className="bg-white/90 rounded-3xl p-6 mb-8 shadow-xl border-4 border-teal-300">
          <h2 className="text-2xl font-black text-center text-teal-700 mb-1">🔍 Find a Real Animal!</h2>
          <p className="text-center text-slate-600 font-semibold mb-4 text-sm">Type any animal and see real photos from nature! 🌿</p>

          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 rounded-2xl border-4 border-teal-300 px-4 py-3 text-lg font-bold text-teal-800 outline-none focus:border-teal-500 bg-white"
              placeholder="e.g. panda, shark, owl…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnimalSearch()}
              maxLength={40}
            />
            <button
              onClick={handleAnimalSearch}
              className="bg-teal-500 hover:bg-teal-600 text-white font-black text-lg rounded-2xl px-5 py-3 shadow-lg transition-all active:scale-95"
            >
              🔍 Search!
            </button>
          </div>

          {/* Voice search */}
          {micSupported && (
            <div className="flex items-center gap-3 mb-4">
              <button
                onMouseDown={() => {
                  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                  if (!SR) return;
                  window.speechSynthesis?.cancel();
                  const r = new SR();
                  r.lang = 'en-GB';
                  r.onstart = () => setListening(true);
                  r.onend = () => setListening(false);
                  r.onresult = (e) => {
                    const t = e.results[0][0].transcript;
                    setSearchQuery(t);
                    setTimeout(() => handleAnimalSearch(), 300);
                  };
                  r.start();
                }}
                className={`text-3xl rounded-full w-12 h-12 flex items-center justify-center shadow-lg border-4 transition-all flex-shrink-0 ${listening ? 'bg-red-400 border-red-600 animate-pulse' : 'bg-teal-400 border-teal-600 hover:scale-110'}`}
              >🎤</button>
              <p className="text-sm font-bold text-teal-700">{listening ? 'Say an animal name…' : 'Or say an animal name!'}</p>
            </div>
          )}

          {searching && <p className="text-center text-teal-600 font-bold animate-pulse">🔍 Searching for animals…</p>}

          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {searchResults.map((r, i) => (
                <div key={i} className="bg-teal-50 border-4 border-teal-200 rounded-2xl overflow-hidden shadow-md hover:scale-105 transition-all cursor-pointer"
                  onClick={() => addRosaMessage(`That is a ${r.preferred_common_name || r.name}! Its scientific name is ${r.name}. Cool, right?! 🌿`)}>
                  {r.default_photo?.medium_url ? (
                    <img src={r.default_photo.medium_url} alt={r.preferred_common_name || r.name}
                      className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 bg-teal-100 flex items-center justify-center text-5xl">🌿</div>
                  )}
                  <div className="p-2 text-center">
                    <p className="font-black text-teal-800 text-sm">{r.preferred_common_name || r.name}</p>
                    <p className="text-teal-500 text-xs italic">{r.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* What we do */}
        <div className="bg-gradient-to-r from-purple-400 to-pink-400 rounded-3xl p-6 text-center shadow-xl border-4 border-white mb-6">
          <div className="text-5xl mb-3">👩‍💻</div>
          <h2 className="text-2xl font-black text-white mb-2" style={{ textShadow: '2px 2px 0px #7e22ce' }}>
            You could build this one day!
          </h2>
          <p className="text-lg text-white font-semibold leading-relaxed">
            The people who build computers do amazing things. They are called <strong>developers</strong>.
            They write <strong>code</strong> — special instructions for computers.
            Maybe <span className="text-yellow-200 font-black">YOU</span> will be one someday! 🚀
          </p>
          <button onClick={() => speak("You could build this one day! The people who build computers do amazing things. They are called developers. They write code — special instructions for computers. Maybe YOU will be one someday!")}
            className="mt-3 text-2xl hover:scale-125 transition-transform">🔊</button>
        </div>

        <p className="text-center text-white font-bold text-lg drop-shadow">Made with 💚 for a future developer</p>
      </div>
    </div>
  );
}