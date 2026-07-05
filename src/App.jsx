import { useState, useEffect, useRef } from 'react';
import { Sparkles, Upload, X, Plus, Lock, Mail, Camera, Trash2, ArrowLeft, Heart, Check, ImagePlus, Send, Package, LogOut, Edit3, Menu, ChevronRight, ChevronDown, Search, Download, Home, Settings, Eye, EyeOff } from 'lucide-react';
import * as db from './db';

// ===== CONFIG (à personnaliser) =====
const BRAND = "Annettebakeur";
const INSTAGRAM = '@Annettebakeur';
const EMAIL_CONTACT = 'axellehanlet@free.fr';
// ===== PASSWORD RESET STATE (à rajouter dans le composant App) =====
// (tu verras c'est utilisé dans le return)

const SHAPES = [
  { id: 1, label: 'Court arrondi', len: 22, type: 'round' },
  { id: 2, label: 'Court carré', len: 22, type: 'square' },
  { id: 3, label: 'Moyen amande', len: 42, type: 'almond' },
  { id: 4, label: 'Moyen ballerine', len: 42, type: 'coffin' },
  { id: 5, label: 'Long stiletto', len: 68, type: 'stiletto' },
  { id: 6, label: 'Long ballerine', len: 68, type: 'coffin' }
];

const FINGERS = [
  { id: 'g1', name: 'Pouce', hand: 'Main gauche' },
  { id: 'g2', name: 'Index', hand: 'Main gauche' },
  { id: 'g3', name: 'Majeur', hand: 'Main gauche' },
  { id: 'g4', name: 'Annulaire', hand: 'Main gauche' },
  { id: 'g5', name: 'Auriculaire', hand: 'Main gauche' },
  { id: 'd1', name: 'Pouce', hand: 'Main droite' },
  { id: 'd2', name: 'Index', hand: 'Main droite' },
  { id: 'd3', name: 'Majeur', hand: 'Main droite' },
  { id: 'd4', name: 'Annulaire', hand: 'Main droite' },
  { id: 'd5', name: 'Auriculaire', hand: 'Main droite' }
];

const DEFAULT_DESIGNS = [
  { id: 'd1', name: 'Black Widow', price: 55, image: null, desc: 'Noir intense, finition mate' },
  { id: 'd2', name: 'Bloodmoon', price: 60, image: null, desc: 'Bordeaux profond, chrome doré' },
  { id: 'd3', name: 'Obsidian', price: 65, image: null, desc: 'Noir glossy & strass argentés' },
  { id: 'd4', name: 'Ghost Lace', price: 50, image: null, desc: 'Dentelle gothique sur base nude' }
];

const FAQ_ITEMS = [
  { q: 'Combien de temps tiennent les press-on ?', a: "En moyenne 1 à 3 semaines selon votre application et l'entretien. La colle longue durée permet de tenir jusqu'à 3 semaines, tandis que les pastilles adhésives donnent 1 à 7 jours et permettent de réutiliser le set." },
  { q: 'Comment poser correctement les ongles ?', a: "Limez vos ongles naturels, repoussez vos cuticules, nettoyez avec de l'alcool, posez la colle ou les pastilles, et pressez 10 à 15 secondes par ongle. Un kit complet est fourni à chaque commande." },
  { q: 'Sont-ils vraiment réutilisables ?', a: "Oui ! Avec les pastilles adhésives, vous pouvez retirer délicatement vos ongles et les conserver dans leur boîte pour les remettre plusieurs fois." },
  { q: 'Combien de temps pour recevoir ma commande ?', a: "Le délai de création est de 7 à 14 jours après réception de vos mesures, puis 3 à 5 jours d'expédition." },
  { q: 'Et si la taille ne convient pas ?', a: "Si une taille ne convient pas, je refais l'ongle concerné gratuitement. Prenez bien vos mesures à côté d'une pièce pour limiter les erreurs." }
];

// ===== HELPERS =====
async function compressImage(file, maxSize = 900, quality = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function exportOrdersCSV(orders) {
  const headers = ['ID', 'Date', 'Type', 'Design', 'Prix', 'Contact', 'Forme', 'Statut'];
  const rows = orders.map(o => [
    o.id,
    new Date(o.createdAt).toLocaleString('fr-FR'),
    o.type === 'design' ? 'Design existant' : 'Sur mesure',
    o.type === 'design' ? o.designName : 'Personnalisé',
    o.type === 'design' ? `${o.designPrice}€` : '-',
    o.contact,
    o.shape ? SHAPES.find(s => s.id === o.shape)?.label : '-',
    o.status === 'done' ? 'Traitée' : o.status === 'processing' ? 'En cours' : 'Nouvelle'
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `commandes_hanletsclaws_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== ICONS =====
function NailShapeSvg({ type, len, selected }) {
  const w = 44;
  const totalH = 28 + len;
  const fill = selected ? '#E8E0D0' : '#3A3530';
  const stroke = selected ? '#F5F0E8' : '#5A524A';
  const tipY = 28;
  let path;
  if (type === 'round') path = `M 6 28 L 6 ${tipY + len - 14} Q 6 ${tipY + len} ${w/2} ${tipY + len} Q ${w-6} ${tipY + len} ${w-6} ${tipY + len - 14} L ${w-6} 28 Z`;
  else if (type === 'square') path = `M 6 28 L 6 ${tipY + len} L ${w-6} ${tipY + len} L ${w-6} 28 Z`;
  else if (type === 'almond') path = `M 6 28 L 8 ${tipY + len - 6} Q ${w/2} ${tipY + len + 4} ${w-8} ${tipY + len - 6} L ${w-6} 28 Z`;
  else if (type === 'coffin') path = `M 6 28 L 11 ${tipY + len} L ${w-11} ${tipY + len} L ${w-6} 28 Z`;
  else if (type === 'stiletto') path = `M 6 28 L ${w/2} ${tipY + len + 4} L ${w-6} 28 Z`;
  return (
    <svg viewBox={`0 0 ${w} ${totalH + 8}`} className="w-full h-full">
      <ellipse cx={w/2} cy={22} rx={(w-12)/2} ry={6} fill="#4A423A" stroke="#6B5F55" strokeWidth="0.8" />
      <path d={path} fill={fill} stroke={stroke} strokeWidth="1" strokeLinejoin="round" />
      <ellipse cx={w/2} cy={32} rx={(w-14)/2} ry={3} fill="#FFFFFF" opacity="0.15" />
    </svg>
  );
}

function Placeholder({ label, className = '' }) {
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-black ${className}`}>
      <div className="text-center px-4">
        <Sparkles className="w-7 h-7 mx-auto text-neutral-600 mb-2" />
        <p className="text-neutral-500 text-[10px] tracking-[0.25em] uppercase">{label}</p>
      </div>
    </div>
  );
}

// ===== APP =====
export default function App() {
  const [page, setPage] = useState('home');
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hero, setHero] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [designs, setDesigns] = useState(DEFAULT_DESIGNS);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordResetMessage, setPasswordResetMessage] = useState('');
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const recoveryCode = urlParams.get('code');
  const hasRecoveryUrl =
    window.location.hash.includes('type=recovery') ||
    Boolean(recoveryCode);
  const isPasswordReset = passwordRecovery || hasRecoveryUrl;

  useEffect(() => {
    loadAll();
    db.getCurrentUser().then(setUser);

    const unsub = db.onAuthChange((event, currentUser) => {
      setUser(currentUser);

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        setPasswordResetMessage('Lien validé. Choisissez maintenant votre nouveau mot de passe.');
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    async function handleRecoveryCode() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (!code) return;

      setPasswordResetLoading(true);
      setPasswordResetMessage('Préparation de la session de réinitialisation...');

      const error = await db.exchangeCodeForSession(code);

      setPasswordResetLoading(false);

      if (error) {
        setPasswordResetMessage('Erreur : impossible de valider le lien de réinitialisation. Demandez un nouveau lien.');
        return;
      }

      setPasswordResetMessage('Lien validé. Vous pouvez choisir un nouveau mot de passe.');
    }

    handleRecoveryCode();
  }, []);

  useEffect(() => {
    if (user) {
      db.listOrders().then(setOrders);
    } else {
      setOrders([]);
    }
  }, [user]);

  async function handlePasswordUpdate() {
    setPasswordResetMessage('');

    if (!newPassword || newPassword.length < 6) {
      setPasswordResetMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordResetMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setPasswordResetLoading(true);
    const error = await db.updatePassword(newPassword);
    setPasswordResetLoading(false);

    if (error) {
      setPasswordResetMessage('Erreur : ' + error.message);
      return;
    }

    setPasswordResetMessage('✅ Mot de passe mis à jour. Vous allez devoir vous reconnecter avec ce nouveau mot de passe.');

    setTimeout(async () => {
      await db.signOut();
      setUser(null);
      setPasswordRecovery(false);
      setNewPassword('');
      setConfirmNewPassword('');
      window.history.replaceState({}, document.title, window.location.origin);
      setPage('admin');
    }, 1800);
  }

  if (isPasswordReset) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-5">
        <div className="w-full max-w-md bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
          <Lock className="w-8 h-8 text-neutral-300 mb-4" />
          <h1 className="font-serif text-2xl text-neutral-50 mb-2" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>
            Nouveau mot de passe
          </h1>
          <p className="text-neutral-500 text-sm mb-6">
            Choisissez un nouveau mot de passe pour votre espace admin.
          </p>

          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 mb-3 text-neutral-100"
          />

          <input
            type="password"
            value={confirmNewPassword}
            onChange={e => setConfirmNewPassword(e.target.value)}
            placeholder="Confirmer le mot de passe"
            className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 mb-3 text-neutral-100"
          />

          {passwordResetMessage && (
            <p className="text-sm text-neutral-300 mb-3">{passwordResetMessage}</p>
          )}

          <button
            onClick={handlePasswordUpdate}
            disabled={passwordResetLoading}
            className="w-full px-6 py-3 bg-neutral-50 text-neutral-950 rounded-full hover:bg-white text-sm font-medium disabled:opacity-50"
          >
            {passwordResetLoading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
          </button>
        </div>
      </div>
    );
  }

  async function loadAll() {
    try {
      const [h, g, d] = await Promise.all([
        db.getSetting('hero'),
        db.getSetting('gallery'),
        db.getSetting('designs')
      ]);
      if (h) setHero(h);
      if (g) setGallery(g);
      if (d && d.length > 0) setDesigns(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function saveOrder(order) {
    const o = { ...order, id: uid(), createdAt: Date.now(), status: 'new' };
    const ok = await db.createOrder(o);
    if (ok) {
      setConfirmation(o);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return true;
    }
    alert("Erreur d'envoi. Veuillez réessayer.");
    return false;
  }

  function goTo(p, d = null) {
    setSelectedDesign(d);
    setPage(p);
    setMenuOpen(false);
    setConfirmation(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="site-shell min-h-screen text-neutral-100" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <Header page={page} goTo={goTo} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {confirmation ? (
        <ConfirmationScreen order={confirmation} goTo={goTo} />
      ) : loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-neutral-800 border-t-neutral-100 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {page === 'home' && <HomePage hero={hero} gallery={gallery} goTo={goTo} />}
          {page === 'designs' && <DesignsPage designs={designs} goTo={goTo} />}
          {page === 'order' && <OrderForm design={selectedDesign} saveOrder={saveOrder} goTo={goTo} />}
          {page === 'custom' && <CustomOrderForm saveOrder={saveOrder} goTo={goTo} />}
          {page === 'admin' && <AdminPage user={user} setUser={setUser} orders={orders} setOrders={setOrders} hero={hero} setHero={setHero} gallery={gallery} setGallery={setGallery} designs={designs} setDesigns={setDesigns} goTo={goTo} />}
        </>
      )}
      <Footer goTo={goTo} />
    </div>
  );
}

function Header({ page, goTo, menuOpen, setMenuOpen }) {
  const links = [{ id: 'home', label: 'Accueil' }, { id: 'designs', label: 'Designs' }, { id: 'custom', label: 'Sur mesure' }];
  return (
    <header className="sticky top-0 z-40 bg-neutral-950/85 backdrop-blur-md border-b border-neutral-800/60">
      <div className="max-w-7xl mx-auto px-5 lg:px-10 h-16 flex items-center justify-between">
        <button onClick={() => goTo('home')} className="font-serif text-xl lg:text-2xl tracking-wide text-neutral-50 hover:text-white transition-colors" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{BRAND}</button>
        <nav className="hidden md:flex items-center gap-8">
          {links.map(l => <button key={l.id} onClick={() => goTo(l.id)} className={`text-sm tracking-wide transition-colors ${page === l.id ? 'text-neutral-50' : 'text-neutral-400 hover:text-neutral-50'}`}>{l.label}</button>)}
          <button onClick={() => goTo('admin')} className="text-neutral-600 hover:text-neutral-300 transition-colors" title="Espace admin"><Lock className="w-4 h-4" /></button>
        </nav>
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-neutral-100">{menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-neutral-950">
          <div className="px-5 py-3 space-y-1">
            {links.map(l => <button key={l.id} onClick={() => goTo(l.id)} className={`block w-full text-left py-3 text-sm ${page === l.id ? 'text-neutral-50 font-medium' : 'text-neutral-400'}`}>{l.label}</button>)}
            <button onClick={() => goTo('admin')} className="flex items-center gap-2 w-full text-left py-3 text-sm text-neutral-500"><Lock className="w-3.5 h-3.5" /> Admin</button>
          </div>
        </div>
      )}
    </header>
  );
}

function BackButton({ onClick, label = "Retour à l'accueil", icon = 'home' }) {
  return (
    <button onClick={onClick} className="text-neutral-400 hover:text-neutral-100 text-sm flex items-center gap-1.5 mb-6 transition-colors group">
      {icon === 'home' ? <Home className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> : <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />}
      {label}
    </button>
  );
}

function HomePage({ hero, gallery, goTo }) {
  return (
    <div>
      <section className="relative">
        <div className="max-w-7xl mx-auto px-5 lg:px-10 pt-8 lg:pt-16 pb-16 lg:pb-24">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <p className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-4">Press-on nails artisanales</p>
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-tight text-neutral-50 mb-6" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Des ongles d'exception, <em className="italic text-neutral-300">réutilisables</em> et faits main.</h1>
              <p className="text-neutral-400 text-base lg:text-lg leading-relaxed mb-8 max-w-lg">Chaque set est unique, conçu avec soin pour sublimer vos mains au quotidien comme pour vos moments d'exception.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => goTo('designs')} className="px-7 py-3.5 bg-neutral-50 text-neutral-950 text-sm tracking-wide hover:bg-white transition-colors flex items-center justify-center gap-2 rounded-full">Voir les designs <ChevronRight className="w-4 h-4" /></button>
                <button onClick={() => goTo('custom')} className="px-7 py-3.5 border border-neutral-700 text-neutral-100 text-sm tracking-wide hover:border-neutral-50 hover:bg-neutral-900 transition-colors rounded-full">Sur mesure</button>
              </div>
            </div>
            <div className="order-1 lg:order-2 aspect-[3/4] lg:aspect-[4/5] rounded-2xl overflow-hidden bg-neutral-900 shadow-2xl border border-neutral-800">
              {hero ? <img src={hero} alt="Hero" className="w-full h-full object-cover" /> : <Placeholder label="Votre photo ici" className="w-full h-full" />}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-900 bg-neutral-900/30">
        <div className="max-w-6xl mx-auto px-5 lg:px-10 py-16 lg:py-24">
          <div className="grid md:grid-cols-2 gap-5 lg:gap-8">
            <div className="bg-neutral-900 rounded-2xl p-7 lg:p-10 border border-neutral-800 flex flex-col hover:border-neutral-700 transition-colors">
              <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-5"><Sparkles className="w-5 h-5 text-neutral-200" /></div>
              <h2 className="font-serif text-2xl lg:text-3xl mb-3 text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Designs disponibles</h2>
              <p className="text-neutral-400 leading-relaxed mb-6 flex-1">Si vous souhaitez un set mais que vous n'avez pas d'inspiration, voici les créations uniques que je propose.</p>
              <button onClick={() => goTo('designs')} className="self-start px-6 py-3 bg-neutral-50 text-neutral-950 text-sm tracking-wide hover:bg-white transition-colors rounded-full flex items-center gap-2">Voir les designs <ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="bg-neutral-900 rounded-2xl p-7 lg:p-10 border border-neutral-800 flex flex-col hover:border-neutral-700 transition-colors">
              <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-5"><Heart className="w-5 h-5 text-neutral-200" /></div>
              <h2 className="font-serif text-2xl lg:text-3xl mb-3 text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Commande personnalisée</h2>
              <p className="text-neutral-400 leading-relaxed mb-6 flex-1">Si vous avez des inspirations (ex : des poses existantes, films, livres, photos, images…), je vous crée un set personnalisé.</p>
              <button onClick={() => goTo('custom')} className="self-start px-6 py-3 bg-neutral-50 text-neutral-950 text-sm tracking-wide hover:bg-white transition-colors rounded-full flex items-center gap-2">Commande personnalisée <ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 lg:px-10 py-16 lg:py-24">
        <div className="text-center mb-12 lg:mb-16">
          <p className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-3">Le processus</p>
          <h2 className="font-serif text-3xl lg:text-4xl text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Comment ça marche</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-10">
          {[{ n: '01', t: 'Choisissez', d: "Sélectionnez un design existant ou décrivez-moi votre commande sur mesure." },{ n: '02', t: 'Mesurez', d: "Envoyez les photos de vos 10 doigts à côté d'une pièce pour des mesures précises." },{ n: '03', t: 'Recevez', d: "Je crée votre set en 7 à 14 jours, puis envoi soigné chez vous." }].map(s => (
            <div key={s.n} className="text-center md:text-left">
              <p className="font-serif text-5xl text-neutral-700 mb-3" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{s.n}</p>
              <h3 className="font-serif text-xl text-neutral-50 mb-2" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{s.t}</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 lg:px-10 py-16 lg:py-24 border-t border-neutral-900">
        <div className="text-center mb-10 lg:mb-14">
          <p className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-3">Portfolio</p>
          <h2 className="font-serif text-3xl lg:text-4xl text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Mes réalisations</h2>
        </div>
        {gallery.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="aspect-square rounded-xl overflow-hidden border border-neutral-900"><Placeholder label={`Set ${i + 1}`} className="w-full h-full" /></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
            {gallery.map((img, i) => <div key={i} className="aspect-square rounded-xl overflow-hidden bg-neutral-900 group cursor-pointer border border-neutral-800"><img src={img} alt={`Set ${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>)}
          </div>
        )}
      </section>

      <section className="max-w-3xl mx-auto px-5 lg:px-10 py-16 lg:py-24 border-t border-neutral-900">
        <div className="text-center mb-10">
          <p className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-3">Questions fréquentes</p>
          <h2 className="font-serif text-3xl lg:text-4xl text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>FAQ</h2>
        </div>
        <div className="space-y-3">{FAQ_ITEMS.map((item, i) => <FaqItem key={i} item={item} />)}</div>
      </section>
    </div>
  );
}

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900/40">
      <button onClick={() => setOpen(!open)} className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-neutral-900/80 transition-colors">
        <span className="text-neutral-100 font-medium text-sm lg:text-base pr-4">{item.q}</span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 text-neutral-400 text-sm leading-relaxed">{item.a}</div>}
    </div>
  );
}

function DesignsPage({ designs, goTo }) {
  const [sort, setSort] = useState('recent');
  const sorted = [...designs].sort((a, b) => sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : 0);
  return (
    <div className="max-w-7xl mx-auto px-5 lg:px-10 py-10 lg:py-16">
      <BackButton onClick={() => goTo('home')} />
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-10 lg:mb-14">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-3">Boutique</p>
          <h1 className="font-serif text-4xl lg:text-5xl text-neutral-50 mb-3" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Designs disponibles</h1>
          <p className="text-neutral-400 max-w-xl">Chaque set est fait main et personnalisable selon vos mesures.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 uppercase tracking-widest">Trier</span>
          <select value={sort} onChange={e => setSort(e.target.value)} className="bg-neutral-900 border border-neutral-800 text-neutral-100 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-neutral-600">
            <option value="recent">Plus récents</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
        </div>
      </div>
      {designs.length === 0 ? (
        <p className="text-neutral-500 text-center py-20">Aucun design disponible pour l'instant.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-7">
          {sorted.map(d => (
            <div key={d.id} className="group cursor-pointer" onClick={() => goTo('order', d)}>
              <div className="aspect-[4/5] rounded-xl overflow-hidden bg-neutral-900 mb-3 lg:mb-4 border border-neutral-800 group-hover:border-neutral-600 transition-colors">
                {d.image ? <img src={d.image} alt={d.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <Placeholder label={d.name} className="w-full h-full" />}
              </div>
              <h3 className="font-serif text-lg lg:text-xl text-neutral-50 mb-1" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{d.name}</h3>
              <p className="text-neutral-500 text-xs lg:text-sm mb-2 line-clamp-1">{d.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-neutral-50 font-medium">{d.price} €</span>
                <span className="text-xs text-neutral-500 group-hover:text-neutral-100 transition-colors flex items-center gap-1">Commander <ChevronRight className="w-3 h-3" /></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderForm({ design, saveOrder, goTo }) {
  const [contact, setContact] = useState('');
  const [shape, setShape] = useState(null);
  const [measurements, setMeasurements] = useState({});
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!design) { goTo('designs'); return null; }

  async function submit() {
    if (!contact.trim()) return alert('Renseignez un contact');
    if (!shape) return alert('Choisissez une forme/longueur');
    setSubmitting(true);
    await saveOrder({ type: 'design', designId: design.id, designName: design.name, designPrice: design.price, contact: contact.trim(), shape, measurements });
    setSubmitting(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-5 lg:px-10 py-10 lg:py-16">
      <BackButton onClick={() => goTo('designs')} label="Retour aux designs" icon="arrow" />
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden mb-8">
        <div className="flex flex-col sm:flex-row gap-5 p-5 lg:p-7">
          <div className="w-full sm:w-40 aspect-square rounded-xl overflow-hidden bg-neutral-800 flex-shrink-0 border border-neutral-800">
            {design.image ? <img src={design.image} alt={design.name} className="w-full h-full object-cover" /> : <Placeholder label={design.name} className="w-full h-full" />}
          </div>
          <div className="flex-1">
            <p className="text-xs tracking-[0.2em] uppercase text-neutral-500 mb-2">Commande</p>
            <h1 className="font-serif text-2xl lg:text-3xl text-neutral-50 mb-2" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{design.name}</h1>
            <p className="text-neutral-400 text-sm mb-2">{design.desc}</p>
            <p className="text-xl text-neutral-50 font-medium">{design.price} €</p>
          </div>
        </div>
      </div>
      <div className="space-y-5">
        <Section num="0" title="Votre contact">
          <p className="text-neutral-500 text-sm mb-3">Mail ou Instagram pour que je puisse vous recontacter.</p>
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder="email@exemple.com ou @votrepseudo" className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600" />
        </Section>
        <Section num="1" title="Longueur & forme"><ShapeSelector value={shape} onChange={setShape} /></Section>
        <Section num="2" title="Vos mesures" optional>
          <p className="text-neutral-500 text-sm mb-4">À renseigner uniquement si vous commandez pour la première fois.</p>
          {!showMeasurements ? (
            <button onClick={() => setShowMeasurements(true)} className="px-5 py-2.5 border border-neutral-700 hover:border-neutral-300 text-neutral-100 text-sm rounded-full transition-colors">Renseigner mes mesures</button>
          ) : <MeasurementsBlock measurements={measurements} setMeasurements={setMeasurements} />}
        </Section>
        <button onClick={submit} disabled={submitting} className="w-full px-6 py-4 bg-neutral-50 text-neutral-950 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-full flex items-center justify-center gap-2 text-sm tracking-wide font-medium">
          {submitting ? 'Envoi en cours...' : <>Envoyer ma commande <Send className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

function CustomOrderForm({ saveOrder, goTo }) {
  const [contact, setContact] = useState('');
  const [colors, setColors] = useState('');
  const [chrome, setChrome] = useState('');
  const [jewelry, setJewelry] = useState('');
  const [relief, setRelief] = useState('');
  const [desc, setDesc] = useState('');
  const [shape, setShape] = useState(null);
  const [inspirations, setInspirations] = useState([]);
  const [measurements, setMeasurements] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const inspRef = useRef(null);

  async function handleInspirations(e) {
    const files = Array.from(e.target.files);
    const toProcess = files.slice(0, 10 - inspirations.length);
    const compressed = await Promise.all(toProcess.map(f => compressImage(f, 800, 0.6)));
    setInspirations([...inspirations, ...compressed]);
    if (inspRef.current) inspRef.current.value = '';
  }

  async function submit() {
    if (!contact.trim()) return alert('Renseignez un contact');
    if (!shape) return alert('Choisissez une forme/longueur');
    setSubmitting(true);
    await saveOrder({ type: 'custom', contact: contact.trim(), colors, chrome, jewelry, relief, desc, shape, inspirations, measurements });
    setSubmitting(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-5 lg:px-10 py-10 lg:py-16">
      <BackButton onClick={() => goTo('home')} />
      <div className="mb-10">
        <p className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-3">Sur mesure</p>
        <h1 className="font-serif text-4xl lg:text-5xl text-neutral-50 mb-3" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Commande personnalisée</h1>
        <p className="text-neutral-400">Décrivez-moi votre vision, je crée votre set unique.</p>
      </div>
      <div className="space-y-5">
        <Section num="0" title="Votre contact">
          <p className="text-neutral-500 text-sm mb-3">Mail ou Instagram pour que je puisse vous recontacter.</p>
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder="email@exemple.com ou @votrepseudo" className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600" />
        </Section>
        <Section num="1" title="Couleurs">
          <textarea value={colors} onChange={e => setColors(e.target.value)} rows={2} placeholder="Décrivez les couleurs souhaitées..." className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600 resize-none" />
        </Section>
        <Section num="2" title="Chrome"><ChoiceRow options={['Doré', 'Argenté', 'Les deux', 'Aucun']} value={chrome} onChange={setChrome} /></Section>
        <Section num="3" title="Bijoux (strass, perles)"><ChoiceRow options={['Oui', 'Non']} value={jewelry} onChange={setJewelry} /></Section>
        <Section num="4" title="Relief"><ChoiceRow options={['Oui', 'Non']} value={relief} onChange={setRelief} /></Section>
        <Section num="5" title="Descriptif personnel">
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="Décrivez-moi le niveau de détails que vous souhaitez pour vos ongles + requêtes complémentaires" className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 transition-colors text-neutral-100 placeholder-neutral-600 resize-none mb-2" />
          <p className="text-neutral-500 text-sm italic">Exemple : est-ce que les ongles doivent respecter une certaine homogénéité ou voulez-vous chaque ongle très différent ?</p>
        </Section>
        <Section num="6" title="Longueur & forme"><ShapeSelector value={shape} onChange={setShape} /></Section>
        <Section num="7" title="Inspirations">
          <p className="text-neutral-500 text-sm mb-4">Importez vos photos / inspirations (10 maximum)</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
            {inspirations.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-neutral-800 border border-neutral-800">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setInspirations(inspirations.filter((_, idx) => idx !== i))} className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/80 text-white rounded-full flex items-center justify-center hover:bg-black"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {inspirations.length < 10 && (
              <button onClick={() => inspRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-neutral-700 hover:border-neutral-400 hover:bg-neutral-900 transition-colors flex flex-col items-center justify-center gap-1 text-neutral-500">
                <ImagePlus className="w-5 h-5" /><span className="text-xs">Ajouter</span>
              </button>
            )}
          </div>
          <input ref={inspRef} type="file" accept="image/*" multiple onChange={handleInspirations} className="hidden" />
          <p className="text-neutral-600 text-xs">{inspirations.length}/10 photos</p>
        </Section>
        <Section num="8" title="Vos mesures"><MeasurementsBlock measurements={measurements} setMeasurements={setMeasurements} /></Section>
        <button onClick={submit} disabled={submitting} className="w-full px-6 py-4 bg-neutral-50 text-neutral-950 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-full flex items-center justify-center gap-2 text-sm tracking-wide font-medium">
          {submitting ? 'Envoi en cours...' : <>Envoyer ma commande <Send className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

function ConfirmationScreen({ order, goTo }) {
  return (
    <div className="max-w-2xl mx-auto px-5 lg:px-10 py-16 lg:py-24">
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8 lg:p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-50 mx-auto mb-6 flex items-center justify-center"><Check className="w-8 h-8 text-neutral-950" strokeWidth={3} /></div>
        <p className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-3">Confirmation</p>
        <h1 className="font-serif text-3xl lg:text-4xl text-neutral-50 mb-4" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Commande reçue ✨</h1>
        <p className="text-neutral-400 mb-2">Merci pour votre confiance.</p>
        <p className="text-neutral-400 mb-6">Je reviens vers vous très vite via <span className="text-neutral-100 font-medium">{order.contact}</span></p>
        <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-4 mb-6 inline-block">
          <p className="text-xs text-neutral-500 mb-1 tracking-widest uppercase">Numéro de commande</p>
          <p className="font-mono text-neutral-100 text-sm">#{order.id}</p>
        </div>
        <p className="text-neutral-500 text-sm mb-8 italic">Conservez ce numéro pour toute correspondance ultérieure.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => goTo('home')} className="px-6 py-3 bg-neutral-50 text-neutral-950 hover:bg-white rounded-full text-sm flex items-center justify-center gap-2"><Home className="w-4 h-4" /> Retour à l'accueil</button>
          <button onClick={() => goTo('designs')} className="px-6 py-3 border border-neutral-700 hover:border-neutral-400 rounded-full text-sm">Voir d'autres designs</button>
        </div>
      </div>
    </div>
  );
}

function Section({ num, title, optional, children }) {
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-5 lg:p-7">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-7 h-7 rounded-full bg-neutral-50 text-neutral-950 text-xs flex items-center justify-center font-bold">{num}</span>
        <h3 className="font-serif text-lg lg:text-xl text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{title}{optional && <span className="text-neutral-500 text-sm ml-2 italic font-sans">(Optionnel)</span>}</h3>
      </div>
      {children}
    </div>
  );
}

function ChoiceRow({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => <button key={o} onClick={() => onChange(o)} className={`px-5 py-2.5 rounded-full text-sm transition-all ${value === o ? 'bg-neutral-50 text-neutral-950' : 'border border-neutral-700 text-neutral-300 hover:border-neutral-400'}`}>{o}</button>)}
    </div>
  );
}

function ShapeSelector({ value, onChange }) {
  return (
    <div>
      <p className="text-neutral-500 text-sm mb-4">Choisissez entre les 6 formes/longueurs disponibles.</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {SHAPES.map(s => (
          <button key={s.id} onClick={() => onChange(s.id)} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${value === s.id ? 'border-neutral-50 bg-neutral-800/50' : 'border-neutral-800 hover:border-neutral-600 bg-neutral-950'}`}>
            <div className="h-24 w-10 flex items-end justify-center mb-2"><NailShapeSvg type={s.type} len={s.len} selected={value === s.id} /></div>
            <span className="text-xs font-medium text-neutral-100">{s.id}</span>
            <span className="text-[10px] text-neutral-500 text-center leading-tight mt-0.5">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MeasurementsBlock({ measurements, setMeasurements }) {
  async function handleFingerUpload(fid, file) {
    if (!file) return;
    const compressed = await compressImage(file, 800, 0.55);
    setMeasurements({ ...measurements, [fid]: compressed });
  }
  function removeFinger(fid) { const m = { ...measurements }; delete m[fid]; setMeasurements(m); }
  return (
    <div>
      <p className="text-neutral-400 text-sm mb-4 leading-relaxed">Prenez en photo chacun de vos 10 doigts, pas trop proche (20 cm minimum), à côté d'une pièce de 1 ou 2 euros.</p>
      {['Main gauche', 'Main droite'].map(hand => (
        <div key={hand} className="mb-5">
          <p className="text-xs tracking-widest uppercase text-neutral-500 mb-3">{hand}</p>
          <div className="grid grid-cols-5 gap-2 lg:gap-3">
            {FINGERS.filter(f => f.hand === hand).map(f => <FingerUpload key={f.id} finger={f} image={measurements[f.id]} onUpload={(file) => handleFingerUpload(f.id, file)} onRemove={() => removeFinger(f.id)} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function FingerUpload({ finger, image, onUpload, onRemove }) {
  const ref = useRef(null);
  return (
    <div>
      <button onClick={() => ref.current?.click()} className={`relative w-full aspect-square rounded-lg overflow-hidden transition-all ${image ? 'border border-neutral-700' : 'border-2 border-dashed border-neutral-700 hover:border-neutral-400 hover:bg-neutral-900'}`}>
        {image ? <><img src={image} alt={finger.name} className="w-full h-full object-cover" /><span className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors" /></> : <div className="flex items-center justify-center h-full"><Camera className="w-5 h-5 text-neutral-500" /></div>}
      </button>
      <p className="text-[10px] lg:text-xs text-neutral-400 text-center mt-1.5 leading-tight">{finger.name}</p>
      <input ref={ref} type="file" accept="image/*" capture="environment" onChange={(e) => onUpload(e.target.files?.[0])} className="hidden" />
      {image && <button onClick={onRemove} className="block mx-auto text-[10px] text-neutral-500 hover:text-red-400 mt-0.5">retirer</button>}
    </div>
  );
}

function AdminPage({ user, setUser, orders, setOrders, hero, setHero, gallery, setGallery, designs, setDesigns, goTo }) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [tab, setTab] = useState('orders');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');


  async function login() {
    setAuthLoading(true);
    const { user, error } = await db.signIn(email, pwd);
    setAuthLoading(false);
    if (error) alert('Identifiants incorrects');
    else setUser(user);
  }

  async function requestPasswordReset() {
    if (!resetEmail.trim()) return alert('Renseignez votre email');
    setAuthLoading(true);
    const error = await db.resetPasswordForEmail(resetEmail.trim());
    setAuthLoading(false);
    if (error) {
      alert('Erreur : ' + error.message);
    } else {
      setResetMessage('✅ Un email de réinitialisation a été envoyé. Vérifiez votre boîte mail.');
      setResetEmail('');
      setTimeout(() => {
        setForgotPasswordMode(false);
        setResetMessage('');
      }, 3000);
    }
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-5 py-20">
        <BackButton onClick={() => goTo('home')} />
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-8">
          <Lock className="w-8 h-8 text-neutral-300 mb-4" />
          <h1 className="font-serif text-2xl text-neutral-50 mb-2" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Espace admin</h1>
          <p className="text-neutral-500 text-sm mb-6">Connexion réservée à la gestionnaire du site.</p>
          {!forgotPasswordMode ? (
            <>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Email" className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 mb-3 text-neutral-100" />
              <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} placeholder="Mot de passe" className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 mb-3 text-neutral-100" />
              <button onClick={login} disabled={authLoading} className="w-full px-6 py-3 bg-neutral-50 text-neutral-950 rounded-full hover:bg-white text-sm font-medium disabled:opacity-50 mb-2">{authLoading ? 'Connexion...' : 'Connexion'}</button>
              <button onClick={() => setForgotPasswordMode(true)} className="w-full px-6 py-2 text-fuchsia-400 text-sm hover:text-fuchsia-300 text-center">J'ai oublié mon mot de passe</button>
            </>
          ) : (
            <>
              <p className="text-neutral-400 text-sm mb-4">Renseignez votre email, vous recevrez un lien de réinitialisation.</p>
              <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && requestPasswordReset()} placeholder="Votre email" className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 mb-3 text-neutral-100" />
              {resetMessage && <p className="text-sm text-green-400 mb-3">{resetMessage}</p>}
              <button onClick={requestPasswordReset} disabled={authLoading} className="w-full px-6 py-3 bg-neutral-50 text-neutral-950 rounded-full hover:bg-white text-sm font-medium disabled:opacity-50 mb-2">{authLoading ? 'Envoi en cours...' : 'Envoyer le lien'}</button>
              <button onClick={() => setForgotPasswordMode(false)} className="w-full px-6 py-2 text-neutral-400 text-sm hover:text-neutral-100 text-center">← Retour à la connexion</button>
            </>
          )}
        </div>
      </div>
    );
  }

  async function logout() { await db.signOut(); setUser(null); }

  return (
    <div className="max-w-6xl mx-auto px-5 lg:px-10 py-10 lg:py-14">
      <BackButton onClick={() => goTo('home')} />
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-neutral-500 mb-2">Admin</p>
          <h1 className="font-serif text-3xl lg:text-4xl text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Tableau de bord</h1>
        </div>
        <button onClick={logout} className="text-neutral-500 hover:text-neutral-200 flex items-center gap-1.5 text-sm"><LogOut className="w-4 h-4" /> Déconnexion</button>
      </div>
      <div className="flex gap-2 mb-8 border-b border-neutral-800 overflow-x-auto">
        {[{ id: 'orders', label: `Commandes (${orders.length})`, icon: Package },{ id: 'hero', label: 'Photo accueil', icon: Camera },{ id: 'gallery', label: 'Galerie', icon: ImagePlus },{ id: 'designs', label: 'Designs', icon: Sparkles },{ id: 'settings', label: 'Paramètres', icon: Settings }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-3 text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-neutral-50 text-neutral-50' : 'border-transparent text-neutral-500 hover:text-neutral-200'}`}><t.icon className="w-4 h-4" /> {t.label}</button>
        ))}
      </div>
      {tab === 'orders' && (selectedOrder ? (
        <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)} onUpdate={async (status) => {
          await db.updateOrderStatus(selectedOrder.id, status);
          const updated = { ...selectedOrder, status };
          setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o));
          setSelectedOrder(updated);
        }} onDelete={async () => {
          if (!confirm('Supprimer cette commande ?')) return;
          await db.deleteOrder(selectedOrder.id);
          setOrders(orders.filter(o => o.id !== selectedOrder.id));
          setSelectedOrder(null);
        }} />
      ) : <OrdersList orders={orders} onSelect={setSelectedOrder} />)}
      {tab === 'hero' && <HeroManager hero={hero} setHero={setHero} />}
      {tab === 'gallery' && <GalleryManager gallery={gallery} setGallery={setGallery} />}
      {tab === 'designs' && <DesignsManager designs={designs} setDesigns={setDesigns} />}
      {tab === 'settings' && <SettingsPanel user={user} />}
    </div>
  );
}

function SettingsPanel({ user }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function changePassword() {
    setMessage('');

    if (newPassword.length < 8) {
      setMessage('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const error = await db.updatePassword(newPassword);
    setLoading(false);

    if (error) {
      setMessage('Erreur : ' + error.message);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setMessage('✅ Votre mot de passe a bien été modifié.');
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
            <Settings className="w-5 h-5 text-neutral-200" />
          </div>
          <div>
            <h3 className="font-serif text-xl text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Paramètres du compte</h3>
            <p className="text-neutral-500 text-sm">Gérez les informations de connexion à l'espace admin.</p>
          </div>
        </div>

        <div className="mb-7">
          <label className="text-xs tracking-widest uppercase text-neutral-500 block mb-2">Adresse email</label>
          <div className="px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200">
            {user?.email || 'Email indisponible'}
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-6">
          <h4 className="text-neutral-100 font-medium mb-1">Modifier le mot de passe</h4>
          <p className="text-neutral-500 text-sm mb-4">
            Pour des raisons de sécurité, l'ancien mot de passe ne peut jamais être affiché. Vous pouvez uniquement en définir un nouveau.
          </p>

          <div className="relative mb-3">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              autoComplete="new-password"
              className="w-full px-4 py-3 pr-12 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 text-neutral-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-500 hover:text-neutral-200"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && changePassword()}
            placeholder="Confirmer le nouveau mot de passe"
            autoComplete="new-password"
            className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 text-neutral-100 mb-3"
          />

          {message && (
            <p className={`text-sm mb-3 ${message.startsWith('✅') ? 'text-green-400' : 'text-amber-300'}`}>
              {message}
            </p>
          )}

          <button
            onClick={changePassword}
            disabled={loading}
            className="px-6 py-3 bg-neutral-50 text-neutral-950 rounded-full hover:bg-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Modification...' : 'Enregistrer le nouveau mot de passe'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrdersList({ orders, onSelect }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = orders.filter(o => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return o.contact.toLowerCase().includes(s) || o.id.toLowerCase().includes(s) || (o.designName || '').toLowerCase().includes(s);
  });
  if (orders.length === 0) return <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-16 text-center"><Package className="w-10 h-10 text-neutral-700 mx-auto mb-3" /><p className="text-neutral-500">Aucune commande pour le moment.</p></div>;
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par contact, ID ou design..." className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-full focus:outline-none focus:border-neutral-500 text-sm text-neutral-100 placeholder-neutral-600" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-neutral-500 text-neutral-100">
          <option value="all">Toutes</option><option value="new">Nouvelles</option><option value="processing">En cours</option><option value="done">Traitées</option>
        </select>
        <button onClick={() => exportOrdersCSV(orders)} className="px-4 py-2.5 bg-neutral-50 text-neutral-950 rounded-full text-sm hover:bg-white flex items-center justify-center gap-1.5 font-medium"><Download className="w-4 h-4" /> Export CSV</button>
      </div>
      {filtered.length === 0 ? <p className="text-neutral-500 text-center py-10">Aucun résultat.</p> : (
        <div className="space-y-3">
          {filtered.map(o => (
            <button key={o.id} onClick={() => onSelect(o)} className="w-full bg-neutral-900 rounded-xl border border-neutral-800 p-5 hover:border-neutral-600 transition-colors text-left flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full ${o.status === 'done' ? 'bg-green-950 text-green-300 border border-green-900' : o.status === 'processing' ? 'bg-amber-950 text-amber-300 border border-amber-900' : 'bg-neutral-50 text-neutral-950'}`}>{o.status === 'done' ? 'Traitée' : o.status === 'processing' ? 'En cours' : 'Nouvelle'}</span>
                  <span className="text-xs text-neutral-500">{o.type === 'design' ? 'Design existant' : 'Sur mesure'}</span>
                </div>
                <p className="font-medium text-neutral-100 truncate">{o.type === 'design' ? `${o.designName} — ${o.designPrice}€` : 'Commande personnalisée'}</p>
                <p className="text-sm text-neutral-500 truncate">{o.contact}</p>
                <p className="text-xs text-neutral-600 font-mono mt-0.5">#{o.id}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-neutral-500">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</p>
                <p className="text-xs text-neutral-600">{new Date(o.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderDetail({ order, onBack, onUpdate, onDelete }) {
  const shape = SHAPES.find(s => s.id === order.shape);
  return (
    <div>
      <button onClick={onBack} className="text-neutral-500 hover:text-neutral-100 text-sm flex items-center gap-1.5 mb-6"><ArrowLeft className="w-4 h-4" /> Retour aux commandes</button>
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6 pb-6 border-b border-neutral-800">
          <div>
            <p className="text-xs text-neutral-500 mb-1 font-mono">#{order.id}</p>
            <h2 className="font-serif text-2xl text-neutral-50 mb-1" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{order.type === 'design' ? `${order.designName} — ${order.designPrice}€` : 'Commande personnalisée'}</h2>
            <p className="text-sm text-neutral-500">{new Date(order.createdAt).toLocaleString('fr-FR')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['new', 'processing', 'done'].map(s => <button key={s} onClick={() => onUpdate(s)} className={`px-3 py-1.5 text-xs rounded-full transition-colors ${order.status === s ? 'bg-neutral-50 text-neutral-950' : 'border border-neutral-700 text-neutral-400 hover:border-neutral-400'}`}>{s === 'new' ? 'Nouvelle' : s === 'processing' ? 'En cours' : 'Traitée'}</button>)}
          </div>
        </div>
        <DetailRow label="Contact"><p className="font-medium text-neutral-100">{order.contact}</p></DetailRow>
        {shape && <DetailRow label="Forme & longueur"><p className="text-neutral-200">{shape.id} — {shape.label}</p></DetailRow>}
        {order.type === 'custom' && (<>
          {order.colors && <DetailRow label="Couleurs">{order.colors}</DetailRow>}
          {order.chrome && <DetailRow label="Chrome">{order.chrome}</DetailRow>}
          {order.jewelry && <DetailRow label="Bijoux">{order.jewelry}</DetailRow>}
          {order.relief && <DetailRow label="Relief">{order.relief}</DetailRow>}
          {order.desc && <DetailRow label="Descriptif">{order.desc}</DetailRow>}
          {order.inspirations?.length > 0 && (
            <DetailRow label="Inspirations">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                {order.inspirations.map((img, i) => <a key={i} href={img} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden bg-neutral-800 border border-neutral-800 hover:border-neutral-600"><img src={img} alt="" className="w-full h-full object-cover" /></a>)}
              </div>
            </DetailRow>
          )}
        </>)}
        {Object.keys(order.measurements || {}).length > 0 && (
          <DetailRow label="Mesures">
            <div className="space-y-4 mt-2">
              {['Main gauche', 'Main droite'].map(hand => {
                const handFingers = FINGERS.filter(f => f.hand === hand && order.measurements[f.id]);
                if (handFingers.length === 0) return null;
                return (
                  <div key={hand}>
                    <p className="text-xs tracking-widest uppercase text-neutral-500 mb-2">{hand}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {handFingers.map(f => (
                        <a key={f.id} href={order.measurements[f.id]} target="_blank" rel="noreferrer" className="block">
                          <div className="aspect-square rounded-lg overflow-hidden bg-neutral-800 border border-neutral-800 hover:border-neutral-600"><img src={order.measurements[f.id]} alt={f.name} className="w-full h-full object-cover" /></div>
                          <p className="text-[10px] text-neutral-400 text-center mt-1">{f.name}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </DetailRow>
        )}
        <div className="mt-8 pt-6 border-t border-neutral-800">
          <button onClick={onDelete} className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Supprimer cette commande</button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }) {
  return <div className="py-3 border-b border-neutral-800/60 last:border-0"><p className="text-xs tracking-widest uppercase text-neutral-500 mb-1.5">{label}</p><div className="text-neutral-200 text-sm">{children}</div></div>;
}

function HeroManager({ hero, setHero }) {
  async function handleUpload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const compressed = await compressImage(file, 1400, 0.8);
    await db.setSetting('hero', compressed); setHero(compressed);
  }
  async function handleDelete() {
    if (!confirm("Supprimer la photo d'accueil ?")) return;
    await db.setSetting('hero', null); setHero(null);
  }
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 lg:p-8">
      <h3 className="font-serif text-xl text-neutral-50 mb-2" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Photo d'accueil</h3>
      <p className="text-neutral-500 text-sm mb-5">La photo principale visible sur la page d'accueil. Format vertical (portrait) conseillé.</p>
      {hero ? (
        <div>
          <div className="aspect-[4/5] max-w-md rounded-xl overflow-hidden bg-neutral-800 mb-4 border border-neutral-800"><img src={hero} alt="Hero" className="w-full h-full object-cover" /></div>
          <div className="flex gap-2">
            <label className="px-4 py-2 border border-neutral-700 hover:border-neutral-400 rounded-full text-sm cursor-pointer text-neutral-100">Remplacer<input type="file" accept="image/*" onChange={handleUpload} className="hidden" /></label>
            <button onClick={handleDelete} className="px-4 py-2 text-red-400 hover:bg-red-950/40 rounded-full text-sm">Supprimer</button>
          </div>
        </div>
      ) : (
        <label className="aspect-[4/5] max-w-md rounded-xl border-2 border-dashed border-neutral-700 hover:border-neutral-400 flex flex-col items-center justify-center cursor-pointer transition-colors">
          <Upload className="w-8 h-8 text-neutral-500 mb-2" /><span className="text-sm text-neutral-300">Importer une photo</span>
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </label>
      )}
    </div>
  );
}

function GalleryManager({ gallery, setGallery }) {
  async function handleUpload(e) {
    const files = Array.from(e.target.files);
    const compressed = await Promise.all(files.map(f => compressImage(f, 900, 0.7)));
    const updated = [...gallery, ...compressed];
    await db.setSetting('gallery', updated); setGallery(updated);
  }
  async function handleRemove(i) {
    const updated = gallery.filter((_, idx) => idx !== i);
    await db.setSetting('gallery', updated); setGallery(updated);
  }
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 lg:p-8">
      <h3 className="font-serif text-xl text-neutral-50 mb-2" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Galerie de réalisations</h3>
      <p className="text-neutral-500 text-sm mb-5">La mosaïque visible en bas de la page d'accueil.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
        {gallery.map((img, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-neutral-800 group border border-neutral-800">
            <img src={img} alt="" className="w-full h-full object-cover" />
            <button onClick={() => handleRemove(i)} className="absolute top-2 right-2 w-7 h-7 bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        ))}
        <label className="aspect-square rounded-lg border-2 border-dashed border-neutral-700 hover:border-neutral-400 flex flex-col items-center justify-center cursor-pointer transition-colors">
          <Plus className="w-6 h-6 text-neutral-500 mb-1" /><span className="text-xs text-neutral-400">Ajouter</span>
          <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
        </label>
      </div>
      <p className="text-neutral-500 text-xs">{gallery.length} photo{gallery.length > 1 ? 's' : ''}</p>
    </div>
  );
}

function DesignsManager({ designs, setDesigns }) {
  const [editing, setEditing] = useState(null);
  async function save(d) {
    let updated;
    if (d.id && designs.find(x => x.id === d.id)) updated = designs.map(x => x.id === d.id ? d : x);
    else updated = [...designs, { ...d, id: uid() }];
    await db.setSetting('designs', updated); setDesigns(updated); setEditing(null);
  }
  async function remove(id) {
    if (!confirm('Supprimer ce design ?')) return;
    const updated = designs.filter(d => d.id !== id);
    await db.setSetting('designs', updated); setDesigns(updated);
  }
  if (editing) return <DesignEditor design={editing} onSave={save} onCancel={() => setEditing(null)} />;
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 lg:p-8">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="font-serif text-xl text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>Catalogue de designs</h3>
          <p className="text-neutral-500 text-sm mt-1">Vos croquis disponibles à la commande.</p>
        </div>
        <button onClick={() => setEditing({ name: '', price: '', desc: '', image: null })} className="px-4 py-2 bg-neutral-50 text-neutral-950 rounded-full text-sm hover:bg-white flex items-center gap-1.5 font-medium"><Plus className="w-4 h-4" /> Nouveau</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {designs.map(d => (
          <div key={d.id} className="rounded-xl border border-neutral-800 overflow-hidden bg-neutral-950">
            <div className="aspect-square bg-neutral-800">{d.image ? <img src={d.image} alt={d.name} className="w-full h-full object-cover" /> : <Placeholder label={d.name} className="w-full h-full" />}</div>
            <div className="p-3">
              <p className="font-medium text-neutral-100 text-sm truncate">{d.name}</p>
              <p className="text-neutral-500 text-xs mb-2">{d.price} €</p>
              <div className="flex gap-1">
                <button onClick={() => setEditing(d)} className="flex-1 text-xs py-1.5 border border-neutral-700 hover:border-neutral-400 rounded-full flex items-center justify-center gap-1 text-neutral-200"><Edit3 className="w-3 h-3" /> Éditer</button>
                <button onClick={() => remove(d.id)} className="text-xs py-1.5 px-2 text-red-400 hover:bg-red-950/40 rounded-full"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DesignEditor({ design, onSave, onCancel }) {
  const [d, setD] = useState({ ...design, price: design.price || '' });
  async function handleImage(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const compressed = await compressImage(file, 1000, 0.75);
    setD({ ...d, image: compressed });
  }
  function submit() {
    if (!d.name.trim()) return alert('Nom requis');
    if (!d.price || isNaN(Number(d.price))) return alert('Prix invalide');
    onSave({ ...d, price: Number(d.price), name: d.name.trim(), desc: (d.desc || '').trim() });
  }
  return (
    <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-6 lg:p-8 max-w-2xl">
      <button onClick={onCancel} className="text-neutral-500 hover:text-neutral-100 text-sm flex items-center gap-1.5 mb-5"><ArrowLeft className="w-4 h-4" /> Retour</button>
      <h3 className="font-serif text-xl text-neutral-50 mb-5" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{design.id ? 'Modifier le design' : 'Nouveau design'}</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs tracking-widest uppercase text-neutral-500 block mb-1.5">Photo</label>
          {d.image ? (
            <div className="relative w-40 aspect-square rounded-lg overflow-hidden bg-neutral-800 border border-neutral-800">
              <img src={d.image} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setD({ ...d, image: null })} className="absolute top-2 right-2 w-7 h-7 bg-black/80 text-white rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <label className="w-40 aspect-square rounded-lg border-2 border-dashed border-neutral-700 hover:border-neutral-400 flex flex-col items-center justify-center cursor-pointer">
              <Upload className="w-6 h-6 text-neutral-500 mb-1" /><span className="text-xs text-neutral-400">Importer</span>
              <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </label>
          )}
        </div>
        <div><label className="text-xs tracking-widest uppercase text-neutral-500 block mb-1.5">Nom</label><input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 text-neutral-100" /></div>
        <div><label className="text-xs tracking-widest uppercase text-neutral-500 block mb-1.5">Prix (€)</label><input type="number" value={d.price} onChange={e => setD({ ...d, price: e.target.value })} className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 text-neutral-100" /></div>
        <div><label className="text-xs tracking-widest uppercase text-neutral-500 block mb-1.5">Description courte</label><textarea value={d.desc} onChange={e => setD({ ...d, desc: e.target.value })} rows={2} className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500 resize-none text-neutral-100" /></div>
        <div className="flex gap-2 pt-3">
          <button onClick={submit} className="px-5 py-2.5 bg-neutral-50 text-neutral-950 rounded-full text-sm hover:bg-white font-medium">Enregistrer</button>
          <button onClick={onCancel} className="px-5 py-2.5 border border-neutral-700 rounded-full text-sm hover:border-neutral-400 text-neutral-200">Annuler</button>
        </div>
      </div>
    </div>
  );
}

function Footer({ goTo }) {
  return (
    <footer className="border-t border-neutral-900 bg-black mt-10">
      <div className="max-w-7xl mx-auto px-5 lg:px-10 py-10 lg:py-14">
        <div className="grid sm:grid-cols-2 gap-8">
          <div>
            <p className="font-serif text-2xl mb-3 text-neutral-50" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>{BRAND}</p>
            <p className="text-neutral-500 text-sm leading-relaxed max-w-xs">Press-on nails artisanales et réutilisables, faites main avec passion.</p>
            <div className="flex gap-3 mt-5">
              <a href={`https://instagram.com/${INSTAGRAM.replace('@', '')}`} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full border border-neutral-800 flex items-center justify-center hover:border-neutral-400"><svg className="w-4 h-4 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
              <a href={`mailto:${EMAIL_CONTACT}`} className="w-9 h-9 rounded-full border border-neutral-800 flex items-center justify-center hover:border-neutral-400"><Mail className="w-4 h-4 text-neutral-300" /></a>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-2 text-sm">
            <button onClick={() => goTo('home')} className="text-neutral-400 hover:text-neutral-100">Accueil</button>
            <button onClick={() => goTo('designs')} className="text-neutral-400 hover:text-neutral-100">Designs</button>
            <button onClick={() => goTo('custom')} className="text-neutral-400 hover:text-neutral-100">Commande personnalisée</button>
            <p className="text-neutral-600 text-xs mt-3">{INSTAGRAM}</p>
          </div>
        </div>
        <div className="border-t border-neutral-900 mt-8 pt-6 text-xs text-neutral-600 text-center">© {new Date().getFullYear()} {BRAND}. Tous droits réservés.</div>
      </div>
    </footer>
  );
}