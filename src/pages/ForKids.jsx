import React, { useState, useEffect, useRef } from 'react';

const animals = [
  { emoji: '🦁', name: 'Lion', sound: 'Roar!', color: 'from-yellow-300 to-orange-400', fact: 'Lions live in Africa!' },
  { emoji: '🐘', name: 'Elephant', sound: 'Trumpet!', color: 'from-gray-300 to-gray-500', fact: 'Elephants never forget!' },
  { emoji: '🦋', name: 'Butterfly', sound: 'Flutter!', color: 'from-pink-300 to-purple-400', fact: 'Butterflies taste with their feet!' },
  { emoji: '🐢', name: 'Turtle', sound: 'Plod plod!', color: 'from-green-300 to-emerald-500', fact: 'Turtles can live 100 years!' },
  { emoji: '🦜', name: 'Parrot', sound: 'Squawk!', color: 'from-red-300 to-green-400', fact: 'Parrots can copy your voice!' },
  { emoji: '🐬', name: 'Dolphin', sound: 'Click click!', color: 'from-blue-300 to-cyan-400', fact: 'Dolphins are super clever!' },
  { emoji: '🦊', name: 'Fox', sound: 'Yip yip!', color: 'from-orange-300 to-red-400', fact: 'Foxes are very sneaky!' },
  { emoji: '🐸', name: 'Frog', sound: 'Ribbit!', color: 'from-green-300 to-lime-400', fact: 'Frogs drink through their skin!' },
];

const steps = [
  { emoji: '🔍', title: 'Find Animals', desc: 'We search the whole internet to find animals from all over the world!', color: 'bg-yellow-100 border-yellow-300' },
  { emoji: '📝', title: 'Write it Down', desc: 'We write down everything we know about each animal — like where it lives and how many are left!', color: 'bg-pink-100 border-pink-300' },
  { emoji: '🗺️', title: 'Draw a Map', desc: 'We put dots on a map to show where the animals were spotted!', color: 'bg-blue-100 border-blue-300' },
  { emoji: '💚', title: 'Save Them!', desc: 'We help scientists know which animals need our help the most so they can save them!', color: 'bg-green-100 border-green-300' },
];

const ROSA_MESSAGES = [
  "Hi {name}! I'm Rosa! 🌸 I love animals SO much!",
  "Did you know butterflies taste with their feet? 🦋 Eww and cool!",
  "My favourite animal is the elephant 🐘 because they never forget — just like me!",
  "You are SO good at this! Keep tapping animals! 🐾",
  "Dolphins are my best friends 🐬 they're super clever just like you!",
  "One day YOU could make computer apps too! 💻✨",
  "Tap more animals! I want to hear them all! 🦁🐸🦜",
  "You're my favourite explorer EVER! 🌍⭐",
];

export default function ForKids() {
  const [clickedAnimal, setClickedAnimal] = useState(null);
  const [stars, setStars] = useState([]);
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  const [confirmedName, setConfirmedName] = useState('');
  const [rosaMessage, setRosaMessage] = useState(0);
  const [rosaTyping, setRosaTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    const s = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 20 + 10,
      delay: Math.random() * 3,
    }));
    setStars(s);
  }, []);

  const handleAnimalClick = (animal) => {
    setClickedAnimal(animal);
    setCount(c => c + 1);
    setTimeout(() => setClickedAnimal(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-green-200 to-emerald-300 relative overflow-hidden">

      {/* Floating stars */}
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute animate-pulse pointer-events-none select-none"
          style={{ left: `${star.left}%`, top: `${star.top}%`, fontSize: `${star.size}px`, animationDelay: `${star.delay}s`, opacity: 0.6 }}
        >
          ✨
        </div>
      ))}

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">

        {/* Hero Title */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4 animate-bounce">🌍</div>
          <h1 className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg mb-3" style={{ textShadow: '3px 3px 0px #065f46' }}>
            Hello, Little Explorer! 👋
          </h1>
          <p className="text-xl sm:text-2xl font-bold text-emerald-900 bg-white/60 rounded-2xl px-6 py-3 inline-block">
            Want to see what we're building? 🛠️
          </p>
        </div>

        {/* What we do */}
        <div className="bg-white/80 rounded-3xl p-6 mb-8 shadow-xl border-4 border-yellow-300">
          <h2 className="text-3xl font-black text-center text-emerald-700 mb-2">🌿 What are we doing?</h2>
          <p className="text-xl text-center text-slate-700 font-semibold leading-relaxed">
            We are building a special <span className="text-bangor-red font-black">computer helper</span> that finds animals 🐾 all around the world and helps keep them <span className="text-green-600 font-black">safe!</span>
          </p>
        </div>

        {/* Steps */}
        <h2 className="text-2xl font-black text-white text-center mb-4 drop-shadow">Here's how it works! 👇</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {steps.map((step, i) => (
            <div key={i} className={`${step.color} border-4 rounded-3xl p-5 shadow-lg`}>
              <div className="text-5xl mb-2 text-center">{step.emoji}</div>
              <h3 className="text-xl font-black text-center text-slate-800 mb-1">{i + 1}. {step.title}</h3>
              <p className="text-base text-center text-slate-700 font-medium">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Interactive animals */}
        <div className="bg-white/80 rounded-3xl p-6 mb-8 shadow-xl border-4 border-purple-300">
          <h2 className="text-2xl font-black text-center text-purple-700 mb-2">🐾 Tap an animal to say hello!</h2>
          <p className="text-center text-slate-600 font-semibold mb-5">These are some of the animals our computer helps protect 💚</p>
          <div className="grid grid-cols-4 gap-3">
            {animals.map((animal, i) => (
              <button
                key={i}
                onClick={() => handleAnimalClick(animal)}
                className={`bg-gradient-to-br ${animal.color} rounded-2xl p-3 flex flex-col items-center gap-1 shadow-md hover:scale-110 active:scale-95 transition-all duration-150 border-4 border-white`}
              >
                <span className="text-4xl">{animal.emoji}</span>
                <span className="text-xs font-black text-white drop-shadow">{animal.name}</span>
              </button>
            ))}
          </div>

          {/* Popup when animal clicked */}
          {clickedAnimal && (
            <div className="mt-5 bg-gradient-to-r from-yellow-200 to-orange-200 border-4 border-orange-400 rounded-3xl p-5 text-center animate-bounce shadow-xl">
              <div className="text-6xl mb-2">{clickedAnimal.emoji}</div>
              <p className="text-2xl font-black text-orange-700">{clickedAnimal.sound}</p>
              <p className="text-lg font-bold text-slate-700 mt-1">🤓 Did you know? {clickedAnimal.fact}</p>
            </div>
          )}
        </div>

        {/* Counter */}
        {count > 0 && (
          <div className="text-center mb-8">
            <div className="bg-white/90 rounded-3xl px-8 py-4 inline-block shadow-xl border-4 border-green-400">
              <p className="text-2xl font-black text-green-700">
                🎉 You said hello to {count} animal{count !== 1 ? 's' : ''}!
              </p>
              {count >= 5 && <p className="text-lg font-bold text-purple-600">⭐ You're an amazing explorer!</p>}
              {count >= 8 && <p className="text-lg font-bold text-red-500">🏆 You found ALL the animals! WOW!</p>}
            </div>
          </div>
        )}

        {/* Future developer message */}
        <div className="bg-gradient-to-r from-purple-400 to-pink-400 rounded-3xl p-6 text-center shadow-xl border-4 border-white mb-6">
          <div className="text-5xl mb-3">👩‍💻</div>
          <h2 className="text-2xl font-black text-white mb-2" style={{ textShadow: '2px 2px 0px #7e22ce' }}>
            You could build this one day!
          </h2>
          <p className="text-lg text-white font-semibold leading-relaxed">
            The people who make computers do amazing things are called <strong>developers</strong>. 
            They write special instructions (called <strong>code</strong>) that tell the computer what to do. 
            Maybe <span className="text-yellow-200 font-black">YOU</span> will be one someday! 🚀
          </p>
        </div>

        <p className="text-center text-white font-bold text-lg drop-shadow">Made with 💚 for a future developer</p>
      </div>
    </div>
  );
}