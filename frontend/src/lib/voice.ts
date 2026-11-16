// Arabic voice announcements using the phone/browser's own speech engine (no cost, no API key).
// The voice is chosen from the Arabic voices installed on the device; a female one is preferred when the device has it.
const KEY = 'aq_voice'

export const voiceSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window
export function voiceEnabled(): boolean { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } }
export function setVoiceEnabled(on: boolean) { try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* ignore */ } if (!on && voiceSupported()) window.speechSynthesis.cancel() }

const FEMALE = /female|zira|hoda|laila|salma|noura|amira|hala|sara|google.*(عرب|arab)|\u0639\u0631\u0628/i
const MALE = /\bmale\b|maged|majed|naayf|hamed|tarik|shakir|bassel/i

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    const have = window.speechSynthesis.getVoices()
    if (have.length) return resolve(have)
    const done = () => resolve(window.speechSynthesis.getVoices())
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1500)
  })
}

async function pickVoice(): Promise<{ v: SpeechSynthesisVoice; female: boolean } | null> {
  const ar = (await loadVoices()).filter(v => /^ar([-_]|$)/i.test(v.lang))
  if (!ar.length) return null
  const f = ar.find(v => FEMALE.test(v.name) && !MALE.test(v.name))
  if (f) return { v: f, female: true }
  const neutral = ar.find(v => !MALE.test(v.name))
  return { v: neutral || ar[0], female: !!neutral }
}

export async function speak(text: string): Promise<void> {
  if (!voiceSupported() || !voiceEnabled() || !text) return
  try {
    const pick = await pickVoice()
    if (!pick) return // no Arabic voice on this device: stay silent rather than read Arabic with a wrong voice
    const u = new SpeechSynthesisUtterance(text)
    u.voice = pick.v; u.lang = pick.v.lang || 'ar-SA'
    u.rate = 0.95; u.pitch = pick.female ? 1.05 : 1.25 // a slightly higher pitch makes a non-female voice sound softer
    window.speechSynthesis.speak(u)
  } catch { /* speech is optional */ }
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

export function greeting(): string {
  const h = new Date().getHours()
  const part = h < 12 ? 'صباح الخير' : h < 18 ? 'طاب يومك' : 'مساء الخير'
  return pick([
    `السلام عليكم ورحمة الله وبركاته. ${part}، أهلاً وسهلاً بك في الثراء كوانتوم.`,
    `السلام عليكم. ${part}، يسعدنا عودتك. نتمنى لك يوماً مباركاً.`,
    `أهلاً بك مجدداً. ${part}، تفضّل، نحن في خدمتك.`,
  ])
}

const WON = [
  'مبروك! صفقة رابحة بإذن الله. أحسنت، ونسأل الله لك المزيد من التوفيق.',
  'ما شاء الله، تهانينا على هذه الصفقة الرابحة. بارك الله لك في رزقك.',
]
const LOST = [
  'لا بأس، الخسارة جزء من طريق التداول. أنت شجاع، فخذ نفساً عميقاً وواصل بحكمة، والقادم أفضل بإذن الله.',
  'لا تحزن، فكل متداول ناجح مرّ بصفقات خاسرة. تعلّم منها وانهض بثقة، وتذكّر أن تتداول بمبلغ تستطيع تحمّله.',
  'اطمئن، هذه صفقة واحدة وليست نهاية الطريق. ثقتنا بك كبيرة، واستمر بهدوء وصبر، والله يوفقك.',
]

// Turns a notification into something polite to say, or null when it should stay silent.
export function phraseFor(n: { type: string; title_ar: string | null; message_ar: string | null }): string | null {
  const t = `${n.title_ar || ''} ${n.message_ar || ''}`
  if (n.type === 'trade') {
    if (/ربحت/.test(t)) return pick(WON)
    if (/خسرت/.test(t)) return pick(LOST)
    if (/تعادل|أُلغيت|ألغيت/.test(t)) return 'تم إرجاع مبلغ الصفقة إليك كاملاً. شكراً لصبرك.'
    if (/تم فتح صفقة/.test(t)) return 'تم فتح الصفقة بنجاح. نسأل الله لك التوفيق.'
    if (/تم إغلاق صفقة/.test(t)) {
      const m = t.match(/النتيجة:\s*([+-]?\d+(?:\.\d+)?)/)
      const v = m ? Number(m[1]) : 0
      return v > 0 ? pick(WON) : v < 0 ? pick(LOST) : 'تم إغلاق الصفقة بنجاح.'
    }
    if (/تنبيه سعر/.test(t)) return 'وصل السعر إلى هدفك الذي حدّدته.'
    return null
  }
  if (n.type === 'deposit') {
    if (/تمت إضافة إيداعك/.test(t)) return pick(['تمت إضافة إيداعك بنجاح. شكراً لثقتك بنا.', 'وصل إيداعك وأُضيف إلى رصيدك. نشكر لك ثقتك الغالية.'])
    if (/جزء من المبلغ/.test(t)) return 'وصل جزء من المبلغ، وبانتظار اكتمال التحويل.'
    if (/رصد/.test(t)) return 'تم رصد تحويلك، ونحن بانتظار التأكيد. شكراً لصبرك.'
    return null
  }
  if (n.type === 'withdrawal') {
    if (/رُفض|مرفوض|رفض|تعذّر|تعذر/.test(t)) return 'نعتذر، تعذّر تنفيذ طلب السحب. يرجى مراجعة الإشعار لمعرفة التفاصيل.'
    if (/اكتمل|مكتمل|تم تنفيذ|تم إرسال|تم تحويل|تمت الموافقة/.test(t)) return pick(['تم تنفيذ طلب السحب بنجاح. بارك الله لك في رزقك.', 'اكتمل سحبك بنجاح، ونتمنى لك دوام التوفيق.'])
    if (/قيد المراجعة|مقدّم|مقدم/.test(t)) return 'استلمنا طلب السحب، وهو الآن قيد المراجعة. شكراً لصبرك.'
    return 'تم تحديث حالة طلب السحب الخاص بك.'
  }
  if (n.type === 'investment') {
    if (/مستجد/.test(t)) return 'هناك مستجد جديد في أحد مشاريعك الاستثمارية.'
    if (/استرداد/.test(t)) return 'تم استرداد استثمارك بنجاح. شكراً لثقتك بنا.'
    return pick(['تم تسجيل استثمارك بنجاح. بارك الله لك فيه، وجعله استثماراً مباركاً.', 'نشكر ثقتك، لقد تم استثمارك بنجاح. نسأل الله أن يبارك لك فيه.'])
  }
  if (n.type === 'bonus') return 'مبارك، تمت إضافة مكافأة الترحيب إلى حسابك.'
  return null
}
