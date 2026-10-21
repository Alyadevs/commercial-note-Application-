import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';

interface Client {
  _id: string;
  nom: string;
  soldeCredit: number;
}

interface Message {
  from: 'user' | 'bot';
  text: string;
}

type Lang = 'ar-TN' | 'fr-FR';

/* ---------- Textes selon la langue ---------- */
const T = {
  'ar-TN': {
    title: 'مساعد الكريدي',
    hello: 'مرحبا! اسألني على الكريدي متاع أي كليان، مثلا: «شحال الكريدي متاع أحمد؟»',
    loadError: 'ما نجمتش نجيب الكليانة توا.',
    notFound: 'ما لقيتش هالكليان. عاود قولي الاسم، ولا قول «الكريدي متاع الكل».',
    noMic: 'المتصفح هذا ما يدعمش الصوت. استعمل Chrome ولا Edge.',
    placeholder: 'اكتب سؤالك...',
    listening: 'نسمع فيك...',
    send: 'ابعث',
    voice: 'صوت',
    one: (n: string, m: string) => `الكريدي متاع ${n} هو ${m}.`,
    all: (t: string, d: string) => `مجموع الكريدي متاع الكل هو ${t}. التفاصيل: ${d}.`,
    unit: 'دينار',
  },
  'fr-FR': {
    title: 'Assistant crédits',
    hello: 'Bonjour ! Demandez-moi le crédit d’un client, par exemple : « crédit de Ahmed ».',
    loadError: 'Impossible de charger les clients.',
    notFound: 'Client introuvable. Répétez le nom, ou dites « crédit de tous les clients ».',
    noMic: 'Reconnaissance vocale non supportée. Utilisez Chrome ou Edge.',
    placeholder: 'Écrivez votre question...',
    listening: 'Je vous écoute...',
    send: 'Envoyer',
    voice: 'Voix',
    one: (n: string, m: string) => `Le crédit total de ${n} est de ${m}.`,
    all: (t: string, d: string) => `Crédit total de tous les clients : ${t}. Détail : ${d}.`,
    unit: 'DT',
  },
};

/* ---------- Comparaison des noms arabe / latin ---------- */
// On réduit chaque mot à son "squelette" de consonnes :
// أحمد = Ahmed = "hmd", أشرف = Achref = "skrf"
const AR_MAP: Record<string, string> = {
  ب: 'b', پ: 'b', ت: 't', ث: 't', ج: 'j', ح: 'h', خ: 'k', د: 'd', ذ: 'd',
  ر: 'r', ز: 'z', س: 's', ش: 's', ص: 's', ض: 'd', ط: 't', ظ: 'z', غ: 'k',
  ف: 'f', ڤ: 'f', ق: 'k', ڨ: 'k', گ: 'k', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h',
};

function skeleton(word: string): string {
  let w = word
    .normalize('NFD')
    .replace(/[\u064B-\u065F\u0670\u0300-\u036f]/g, '') // harakat + accents
    .toLowerCase();

  // lettres arabes -> consonnes latines (les voyelles arabes sont ignorées)
  w = Array.from(w)
    .map((ch) => (AR_MAP[ch] ?? (/[\u0600-\u06FF]/.test(ch) ? '' : ch)))
    .join('');

  // digraphes puis chiffres "arabizi" (7=ح, 9=ق, 5=خ, 8=غ, 3=ع ignoré)
  w = w
    .replace(/ch|sh/g, 's').replace(/kh|gh/g, 'k')
    .replace(/th/g, 't').replace(/dh/g, 'd').replace(/ph/g, 'f')
    .replace(/7/g, 'h').replace(/[958]/g, 'k').replace(/6/g, 't')
    .replace(/[0-9]/g, '');

  const single: Record<string, string> = {
    c: 'k', g: 'k', q: 'k', p: 'b', v: 'f', x: 'ks',
  };
  w = Array.from(w)
    .map((ch) => single[ch] ?? (/[bdfhjklmnrstz]/.test(ch) ? ch : ''))
    .join('');

  return w.replace(/(.)\1+/g, '$1'); // supprime les doublons
}

// variantes d'un mot : avec/sans préfixe (ال، ل، و، ب)
function variants(word: string): string[] {
  const out = new Set<string>([skeleton(word)]);
  const stripped = word.replace(/^(ال|ل|و|ب)/, '');
  if (stripped) out.add(skeleton(stripped));
  return [...out];
}

const IGNORED_PARTS = new Set(['l', 'bn', 'b', '']); // ben, el, al, ibn...

const normalizeWords = (s: string) =>
  s.split(/[\s,.;:!?؟،]+/).filter(Boolean);

/* ---------- Petites icônes ---------- */
const BotIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="8" width="16" height="11" rx="3" strokeLinecap="round" strokeLinejoin="round" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v4M9 13h.01M15 13h.01M9.5 16h5" />
  </svg>
);

const MicIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 11a7 7 0 0014 0M12 18v3" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l14-7-5 14-2-6-7-1z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a8 8 0 01-11.5 7.2L4 20l1-4.5A8 8 0 1121 12z" />
  </svg>
);

/* ---------- Composant ---------- */
export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>('ar-TN');
  const [clients, setClients] = useState<Client[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ from: 'bot', text: T['ar-TN'].hello }]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceReply, setVoiceReply] = useState(true);
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const t = T[lang];

  const money = (n: number) =>
    `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t.unit}`;

  useEffect(() => {
    if (!open || clients.length) return;
    api.get('/clients')
      .then((res) => setClients(res.data))
      .catch(() => addBot(t.loadError));
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function speak(text: string) {
    if (!voiceReply || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (lang === 'ar-TN') {
      // pas de voix tunisienne dans les navigateurs : on prend la meilleure voix arabe
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((x) => x.lang === 'ar-TN') || voices.find((x) => x.lang.startsWith('ar'));
      if (v) u.voice = v;
      u.lang = v?.lang || 'ar-SA';
    } else {
      u.lang = 'fr-FR';
    }
    window.speechSynthesis.speak(u);
  }

  function addBot(text: string) {
    setMessages((m) => [...m, { from: 'bot', text }]);
    speak(text);
  }

  function answer(question: string): string {
    const words = normalizeWords(question);
    const qSkeletons = new Set(words.flatMap(variants));

    // score de chaque client = nombre de parties de son nom reconnues
    const scored = clients.map((c) => {
      const parts = normalizeWords(c.nom).map(skeleton).filter((p) => !IGNORED_PARTS.has(p));
      const score = parts.filter((p) => qSkeletons.has(p)).length;
      return { c, score };
    });
    const best = Math.max(0, ...scored.map((s) => s.score));
    const found = best > 0 ? scored.filter((s) => s.score === best).map((s) => s.c) : [];

    if (found.length === 1) return t.one(found[0].nom, money(found[0].soldeCredit));
    if (found.length > 1) {
      return found.map((c) => `${c.nom} : ${money(c.soldeCredit)}`).join(' ، ');
    }

    if (/(الكل|كل|جميع|الجميع|مجموع|tous|tout|total|liste|chaque|kol|koul)/i.test(question)) {
      const total = clients.reduce((s, c) => s + Number(c.soldeCredit || 0), 0);
      const detail = clients.map((c) => `${c.nom} : ${money(c.soldeCredit)}`).join(' ، ');
      return t.all(money(total), detail);
    }
    return t.notFound;
  }

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [...m, { from: 'user', text: q }]);
    setInput('');
    addBot(answer(q));
  }

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return addBot(t.noMic);
    if (listening) return recognitionRef.current?.stop();

    const rec = new SR();
    rec.lang = lang; // 'ar-TN' = arabe tunisien
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e: any) => send(e.results[0][0].transcript);
    recognitionRef.current = rec;
    rec.start();
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-xl shadow-primary-600/40 flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95"
        aria-label="Chatbot"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm h-[30rem] max-h-[calc(100vh-7rem)] bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col overflow-hidden">
          {/* En-tête */}
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <BotIcon />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 ring-2 ring-primary-600" />
              </div>
              <span className="font-semibold truncate">{t.title}</span>
            </div>

            <div className="flex items-center gap-2 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setLang(lang === 'ar-TN' ? 'fr-FR' : 'ar-TN')}
                className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 font-medium transition-colors"
              >
                {lang === 'ar-TN' ? 'FR' : 'دارجة'}
              </button>
              <label className="flex items-center gap-1.5 cursor-pointer select-none px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <input
                  type="checkbox"
                  className="accent-white"
                  checked={voiceReply}
                  onChange={(e) => {
                    setVoiceReply(e.target.checked);
                    if (!e.target.checked) window.speechSynthesis.cancel();
                  }}
                />
                {t.voice}
              </label>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.from === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                    <BotIcon className="w-4 h-4" />
                  </div>
                )}
                <div
                  dir="auto"
                  className={`max-w-[78%] px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                    m.from === 'user'
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-2xl rounded-br-sm'
                      : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Zone de saisie */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 bg-white"
          >
            <button
              type="button"
              onClick={toggleMic}
              className={`relative w-10 h-10 rounded-full shrink-0 flex items-center justify-center transition-colors ${
                listening
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-label="Micro"
            >
              {listening && (
                <span className="absolute inset-0 rounded-full bg-red-400 opacity-60 animate-ping" />
              )}
              <span className="relative"><MicIcon /></span>
            </button>

            <input
              dir="auto"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? t.listening : t.placeholder}
              className="flex-1 min-w-0 bg-gray-100 border border-transparent rounded-full px-4 py-2.5 text-base placeholder-gray-400 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition"
            />

            <button
              type="submit"
              disabled={!input.trim()}
              className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={t.send}
              title={t.send}
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </>
  );
}