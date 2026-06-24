// ---- Éditeur FPS par blocs ----

const params = new URLSearchParams(location.search);
let fpsId = params.get('id');
let blocks = [];   // liste des blocs de contenu
let niveaux = [];  // niveaux de compétence (grille de classe)
let schemas = {};  // schémas associés à cette FPS { id: {name, png, updatedAt} }
let saveTimer = null;

const DEFAULT_PALETTE = ['#8aa399','#a3b89a','#d9c089','#e8a06a','#e0654a'];
const AFLP_PALETTE = ['#5b7c8d','#7a9b6e','#c9954a','#b1623f','#8a6a9b','#5a8a7a'];

function uid(prefix='b'){
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

function setStatus(text){
  const el = document.getElementById('saveStatus');
  el.textContent = text;
  if (text === 'Enregistré') setTimeout(() => { if(el.textContent==='Enregistré') el.textContent=''; }, 1500);
}

function goBack(){ location.href = 'index.html'; }

function goToSchema(schemaIdToOpen){
  if (!fpsId) { alert('Enregistre d\'abord la FPS pour créer un schéma.'); return; }
  const suffix = schemaIdToOpen ? `&schema=${schemaIdToOpen}` : '';
  location.href = `schema.html?fps=${fpsId}${suffix}`;
}

function goToGrille(){
  if (!fpsId) { alert('Enregistre d\'abord la FPS pour ouvrir la grille de classe.'); return; }
  location.href = `grille.html?fps=${fpsId}`;
}

function openPrint(){
  if (!fpsId) { alert('Enregistre d\'abord la FPS pour générer le PDF.'); return; }
  saveFps(() => location.href = `print.html?id=${fpsId}`);
}

function escapeAttr(s){ return (s||'').replace(/"/g,'&quot;'); }
function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// =================== BLOCS ===================

const BLOCK_LABELS = {
  bandeau:'Bandeau titre', objectif:'Objectif / citation', aflp:'Colonnes AFLP',
  texte:'Texte riche', encadre:'Encadré', tableau:'Colonnes comparatives',
  securite:'Sécurité', image:'Image / schéma'
};

const BLOCK_ACCENT = {
  bandeau:'#3a2f1f', objectif:'#a33d2e', aflp:'#3d5a72', texte:'#4a6b4a',
  encadre:'#c9954a', tableau:'#4a6b4a', securite:'#a33d2e', image:'#8a6a9b'
};

function defaultBlockData(type){
  switch(type){
    case 'bandeau':
      return { titre:'', sousTitre:'', couleur:'#3a4a4a' };
    case 'objectif':
      return { texte:'' };
    case 'aflp':
      return { cols:[
        {label:'AFLP 1', couleur:AFLP_PALETTE[0], note:''},
        {label:'AFLP 2', couleur:AFLP_PALETTE[1], note:''}
      ]};
    case 'texte':
      return { html:'' };
    case 'encadre':
      return { titre:'', texte:'', couleur:'#e7eee9' };
    case 'tableau':
      return { cols:[
        {titre:'Colonne A', couleur:'#e7eee9', note:'', texte:''},
        {titre:'Colonne B', couleur:'#e7eee9', note:'', texte:''}
      ]};
    case 'securite':
      return { texte:'' };
    case 'image':
      return { url:'', legende:'' };
    default:
      return {};
  }
}

function addBlock(type){
  blocks.push({ id: uid(), type, data: defaultBlockData(type) });
  renderBlocks();
  scheduleSave();
}

function removeBlock(id){
  blocks = blocks.filter(b => b.id !== id);
  renderBlocks();
  scheduleSave();
}

function moveBlock(id, dir){
  const i = blocks.findIndex(b => b.id === id);
  const j = i + dir;
  if (j < 0 || j >= blocks.length) return;
  [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  renderBlocks();
  scheduleSave();
}

function getBlock(id){ return blocks.find(b => b.id === id); }

function renderBlocks(){
  const list = document.getElementById('blocksList');
  list.innerHTML = blocks.map((b,i) => `
    <div class="block" data-id="${b.id}" style="--block-color:${BLOCK_ACCENT[b.type] || '#8aa399'}">
      <div class="block-head">
        <span class="btype">${BLOCK_LABELS[b.type] || b.type}</span>
        <button onclick="moveBlock('${b.id}',-1)" ${i===0?'disabled style="opacity:.3"':''}>↑</button>
        <button onclick="moveBlock('${b.id}',1)" ${i===blocks.length-1?'disabled style="opacity:.3"':''}>↓</button>
        <button onclick="removeBlock('${b.id}')">×</button>
      </div>
      <div class="block-body">${renderBlockBody(b)}</div>
    </div>
  `).join('');
  blocks.forEach(b => attachBlockEvents(b));
}

function renderBlockBody(b){
  switch(b.type){
    case 'bandeau': return renderBandeau(b);
    case 'objectif': return renderObjectif(b);
    case 'aflp': return renderAflp(b);
    case 'texte': return renderTexte(b);
    case 'encadre': return renderEncadre(b);
    case 'tableau': return renderTableau(b);
    case 'securite': return renderSecurite(b);
    case 'image': return renderImage(b);
    default: return '';
  }
}

// ---- Bandeau titre ----
function renderBandeau(b){
  const d = b.data;
  return `
    <label>Couleur du bandeau</label>
    <input type="color" class="niveau-color" style="margin-bottom:10px" value="${d.couleur}" data-field="couleur">
    <label>Titre</label>
    <input type="text" data-field="titre" value="${escapeAttr(d.titre)}" placeholder="ex. FPS · Course d'orientation">
    <label>Sous-titre</label>
    <input type="text" data-field="sousTitre" value="${escapeAttr(d.sousTitre)}" placeholder="ex. EPS · CAP · CA2 · CAP EPC 1">
    <div class="banner-preview" style="background:${d.couleur}">
      <p class="bp-title">${escapeHtml(d.titre) || 'Titre du bandeau'}</p>
      <p class="bp-sub">${escapeHtml(d.sousTitre) || 'Sous-titre / contexte'}</p>
    </div>
  `;
}

// ---- Objectif / citation ----
function renderObjectif(b){
  const d = b.data;
  return `
    <label>Texte de l'objectif</label>
    <textarea data-field="texte" placeholder="« Réaliser une activité physique de pleine nature en gérant les risques… »">${escapeHtml(d.texte)}</textarea>
  `;
}

// ---- AFLP ----
function renderAflp(b){
  const cols = b.data.cols;
  return `
    <div class="aflp-grid">
      ${cols.map((c,i) => `
        <div class="aflp-col" style="background:${c.couleur}" data-ci="${i}">
          <input type="text" data-cfield="label" value="${escapeAttr(c.label)}" placeholder="AFLP ${i+1}">
          <div class="anote">
            <input type="text" data-cfield="note" value="${escapeAttr(c.note||'')}" placeholder="—">
            <span>pts</span>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="aflp-actions">
      <button data-action="add-col">+ Ajouter une colonne</button>
      <button data-action="remove-col">− Retirer la dernière</button>
    </div>
  `;
}

// ---- Texte riche ----
function renderTexte(b){
  const d = b.data;
  return `
    <div class="rt-toolbar">
      <button data-cmd="bold" title="Gras"><b>G</b></button>
      <button data-cmd="italic" title="Italique"><i>I</i></button>
      <button data-cmd="underline" title="Souligné"><u>S</u></button>
      <button data-cmd="hiliteColor" title="Surligner">⬛</button>
      <input type="color" data-cmd="foreColor" title="Couleur du texte" value="#2b3535">
    </div>
    <div class="rt-editable" contenteditable="true" data-field="html">${d.html || ''}</div>
  `;
}

// ---- Encadré ----
function renderEncadre(b){
  const d = b.data;
  return `
    <label>Couleur de fond</label>
    <input type="color" class="niveau-color" style="margin-bottom:10px" value="${d.couleur}" data-field="couleur">
    <label>Titre (optionnel)</label>
    <input type="text" data-field="titre" value="${escapeAttr(d.titre)}" placeholder="ex. Règle spéciale">
    <label>Contenu</label>
    <textarea data-field="texte" placeholder="Texte de l'encadré…">${escapeHtml(d.texte)}</textarea>
    <div class="callout" style="background:${d.couleur}">
      ${d.titre ? `<strong>${escapeHtml(d.titre)}</strong><br>` : ''}${escapeHtml(d.texte) || 'Aperçu de l\'encadré'}
    </div>
  `;
}

// ---- Tableau / colonnes comparatives ----
function renderTableau(b){
  const cols = b.data.cols;
  return `
    <div class="table-cols" style="grid-template-columns:repeat(${cols.length},1fr)">
      ${cols.map((c,i) => `
        <div class="table-col" data-ci="${i}">
          <div class="tc-head" style="background:${c.couleur}">
            <input type="text" data-cfield="titre" value="${escapeAttr(c.titre)}" placeholder="Titre colonne">
          </div>
          <div class="tc-note">
            <input type="text" data-cfield="note" value="${escapeAttr(c.note||'')}" placeholder="—">
            <span>pts</span>
          </div>
          <textarea data-cfield="texte" placeholder="Description, critères…">${escapeHtml(c.texte)}</textarea>
        </div>
      `).join('')}
    </div>
    <div class="aflp-actions">
      <button data-action="add-col">+ Ajouter une colonne</button>
      <button data-action="remove-col">− Retirer la dernière</button>
    </div>
  `;
}

// ---- Sécurité ----
function renderSecurite(b){
  const d = b.data;
  return `
    <label>Contenu</label>
    <textarea data-field="texte" placeholder="ex. Sécurité : l'application dispose d'un bouton SOS…">${escapeHtml(d.texte)}</textarea>
    <div class="callout" style="background:#fbe4e1; border-color:#e0654a; color:#7a3325;">
      <strong>Sécurité</strong> — ${escapeHtml(d.texte) || 'Aperçu du message de sécurité'}
    </div>
  `;
}

// ---- Image ----
function renderImage(b){
  const d = b.data;
  if (d.url){
    return `
      <div class="img-block">
        <img src="${d.url}" alt="">
        <label style="margin-top:10px">Légende</label>
        <input type="text" data-field="legende" value="${escapeAttr(d.legende)}" placeholder="Légende de l'image">
        <div class="aflp-actions"><button data-action="replace-img">Remplacer l'image</button></div>
      </div>
    `;
  }
  return `<div class="img-zone" data-action="upload-img">Touchez pour ajouter une image (≤ 4 Mo)</div>`;
}

// ---- Événements liés à chaque bloc ----
function attachBlockEvents(b){
  const el = document.querySelector(`.block[data-id="${b.id}"]`);
  if (!el) return;

  // champs simples (input/textarea/select) avec data-field
  el.querySelectorAll('[data-field]').forEach(field => {
    const ev = field.tagName === 'SELECT' ? 'change' : 'input';
    field.addEventListener(ev, () => {
      b.data[field.dataset.field] = field.value;
      if (b.type === 'bandeau' || b.type === 'encadre' || b.type === 'securite') updateBlockPreview(b);
      scheduleSave();
    });
  });

  // contenteditable
  const rt = el.querySelector('.rt-editable');
  if (rt){
    rt.addEventListener('input', () => {
      b.data.html = rt.innerHTML;
      scheduleSave();
    });
  }

  // toolbar texte riche
  el.querySelectorAll('.rt-toolbar [data-cmd]').forEach(btn => {
    if (btn.tagName === 'INPUT'){
      btn.addEventListener('input', () => {
        rt.focus();
        document.execCommand(btn.dataset.cmd, false, btn.value);
        b.data.html = rt.innerHTML;
        scheduleSave();
      });
    } else {
      btn.addEventListener('click', () => {
        rt.focus();
        if (btn.dataset.cmd === 'hiliteColor'){
          document.execCommand('hiliteColor', false, '#fef3a0');
        } else {
          document.execCommand(btn.dataset.cmd, false, null);
        }
        b.data.html = rt.innerHTML;
        scheduleSave();
      });
    }
  });

  // colonnes (aflp / tableau)
  el.querySelectorAll('[data-ci]').forEach(colEl => {
    const ci = parseInt(colEl.dataset.ci, 10);
    colEl.querySelectorAll('[data-cfield]').forEach(field => {
      field.addEventListener('input', () => {
        b.data.cols[ci][field.dataset.cfield] = field.value;
        scheduleSave();
      });
    });
  });

  // actions colonnes
  el.querySelectorAll('[data-action="add-col"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = b.data.cols.length;
      if (b.type === 'aflp'){
        b.data.cols.push({ label:`AFLP ${i+1}`, couleur:AFLP_PALETTE[i % AFLP_PALETTE.length], note:'' });
      } else {
        b.data.cols.push({ titre:`Colonne ${i+1}`, couleur:'#e7eee9', note:'', texte:'' });
      }
      renderBlocks();
      scheduleSave();
    });
  });
  el.querySelectorAll('[data-action="remove-col"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (b.data.cols.length <= 1) return;
      b.data.cols.pop();
      renderBlocks();
      scheduleSave();
    });
  });

  // image
  const uploadZone = el.querySelector('[data-action="upload-img"], [data-action="replace-img"]');
  if (uploadZone){
    uploadZone.addEventListener('click', () => uploadImageForBlock(b));
  }
}

function updateBlockPreview(b){
  // re-render uniquement la preview sans perdre le focus du champ texte : on régénère le bloc complet
  // mais on le fait au blur pour éviter de casser la saisie en cours -> simplification: re-render complet
  renderBlocks();
}

function uploadImageForBlock(b){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 4*1024*1024){
      alert('Image trop volumineuse (max 4 Mo).');
      return;
    }
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    b.data.url = dataUrl;
    renderBlocks();
    scheduleSave();
  };
  input.click();
}

// =================== NIVEAUX (grille de classe) ===================
function renderNiveaux(){
  const list = document.getElementById('niveauxList');
  if (!list) return; // section supprimée du DOM — les données sont conservées en mémoire
  list.innerHTML = niveaux.map((n, i) => `
    <div class="niveau-item" data-i="${i}">
      <input type="color" class="niveau-color" value="${n.couleur}" oninput="updateNiveau(${i},'couleur',this.value)">
      <input type="text" placeholder="Nom du niveau (ex. Niveau 1 — Découverte)" value="${escapeAttr(n.label)}" oninput="updateNiveau(${i},'label',this.value)">
      <button class="niveau-remove" onclick="removeNiveau(${i})">×</button>
    </div>
  `).join('');
}

function addNiveau(){
  const i = niveaux.length;
  niveaux.push({ id: uid('n'), label: `Niveau ${i+1}`, couleur: DEFAULT_PALETTE[i % DEFAULT_PALETTE.length] });
  renderNiveaux();
  scheduleSave();
}

function removeNiveau(i){
  niveaux.splice(i,1);
  renderNiveaux();
  scheduleSave();
}

function updateNiveau(i, key, val){
  niveaux[i][key] = val;
  scheduleSave();
}

// =================== CHARGEMENT / SAUVEGARDE ===================
function loadFps(){
  if (!fpsId){
    niveaux = [
      { id: uid('n'), label: 'Niveau 1 — Découverte', couleur: DEFAULT_PALETTE[0] },
      { id: uid('n'), label: 'Niveau 2 — Adaptation', couleur: DEFAULT_PALETTE[2] },
      { id: uid('n'), label: 'Niveau 3 — Maîtrise', couleur: DEFAULT_PALETTE[4] },
    ];
    blocks = [];
    schemas = {};
    renderNiveaux();
    renderBlocks();
    renderSchemasList();
    return;
  }
  ROOT.child('fps/' + fpsId).once('value', (snap) => {
    const data = snap.val();
    if (!data) return;
    document.getElementById('titre').value = data.titre || '';
    document.getElementById('sousTitre').value = data.sousTitre || '';
    document.getElementById('apsa').value = data.apsa || 'default';
    document.getElementById('ca').value = data.ca || '';
    document.getElementById('niveauScolaire').value = data.niveauScolaire || '';
    niveaux = data.niveaux || [];
    blocks = data.blocks || [];
    schemas = data.schemas || {};
    renderNiveaux();
    renderBlocks();
    renderSchemasList();
  });
}

// =================== SCHÉMAS ===================
function renderSchemasList(){
  const list = document.getElementById('schemasList');
  const entries = Object.entries(schemas);
  if (entries.length === 0){
    list.innerHTML = `<p class="empty-hint">Aucun schéma pour l'instant.</p>`;
    return;
  }
  entries.sort((a,b) => (b[1].updatedAt||0) - (a[1].updatedAt||0));
  list.innerHTML = entries.map(([id, s]) => `
    <div class="schema-item" onclick="goToSchema('${id}')">
      <img src="${s.png}" alt="">
      <span class="sname">${escapeHtml(s.name || 'Schéma sans nom')}</span>
      <span class="sdate">${formatDate(s.updatedAt)}</span>
    </div>
  `).join('');
}

function formatDate(ts){
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' });
}

// ---- Picker "image depuis un schéma" ----
function openSchemaPicker(){
  const overlay = document.getElementById('schemaPickerOverlay');
  const list = document.getElementById('schemaPickerList');
  const entries = Object.entries(schemas);
  if (entries.length === 0){
    list.innerHTML = `<p class="empty-hint">Aucun schéma disponible. Crée d'abord un schéma via "+ Créer un nouveau schéma".</p>`;
  } else {
    entries.sort((a,b) => (b[1].updatedAt||0) - (a[1].updatedAt||0));
    list.innerHTML = entries.map(([id, s]) => `
      <div class="schema-item" data-schema-id="${id}">
        <img src="${s.png}" alt="">
        <span class="sname">${escapeHtml(s.name || 'Schéma sans nom')}</span>
        <span class="sdate">${formatDate(s.updatedAt)}</span>
      </div>
    `).join('');
    list.querySelectorAll('.schema-item').forEach(item => {
      item.addEventListener('click', () => {
        const s = schemas[item.dataset.schemaId];
        blocks.push({ id: uid(), type:'image', data: { url: s.png, legende: s.name || '' } });
        renderBlocks();
        scheduleSave();
        closeSchemaPicker();
      });
    });
  }
  overlay.classList.add('open');
}

function closeSchemaPicker(){
  document.getElementById('schemaPickerOverlay').classList.remove('open');
}

function buildPayload(){
  return {
    titre: document.getElementById('titre').value.trim(),
    sousTitre: document.getElementById('sousTitre').value.trim(),
    apsa: document.getElementById('apsa').value,
    ca: document.getElementById('ca').value,
    niveauScolaire: document.getElementById('niveauScolaire').value.trim(),
    niveaux: niveaux,
    blocks: blocks,
    archived: false,
    updatedAt: Date.now()
  };
}

// =================== IMPORT JSON ===================

const VALID_BLOCK_TYPES = ['bandeau','objectif','aflp','texte','encadre','tableau','securite','image'];

function openImportPanel(){
  document.getElementById('importTextarea').value = '';
  document.getElementById('importError').style.display = 'none';
  document.getElementById('importFileInput').value = '';
  document.getElementById('importFileZone').textContent = 'Touchez pour choisir un fichier .json';
  document.getElementById('importFileZone').classList.remove('has-file');
  importedFileContent = null;
  switchImportTab('file');
  document.getElementById('importOverlay').classList.add('open');
}

function closeImportPanel(){
  document.getElementById('importOverlay').classList.remove('open');
}

let importedFileContent = null;
let currentImportTab = 'file';

function switchImportTab(tab){
  currentImportTab = tab;
  document.querySelectorAll('.import-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('importFileTab').style.display = tab === 'file' ? '' : 'none';
  document.getElementById('importPasteTab').style.display = tab === 'paste' ? '' : 'none';
  document.getElementById('importError').style.display = 'none';
}

document.getElementById('importFileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    importedFileContent = await file.text();
    document.getElementById('importFileZone').textContent = `✓ ${file.name}`;
    document.getElementById('importFileZone').classList.add('has-file');
  } catch (err) {
    showImportError('Impossible de lire le fichier : ' + err.message);
  }
});

function showImportError(msg){
  const el = document.getElementById('importError');
  el.textContent = msg;
  el.style.display = 'block';
}

// Normalise un objet importé en structure interne valide, en complétant
// les champs manquants avec les valeurs par défaut de chaque type de bloc.
function normalizeImport(raw){
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)){
    throw new Error('Le JSON doit être un objet (commence par { et finit par }).');
  }

  const result = {
    titre: typeof raw.titre === 'string' ? raw.titre.trim() : '',
    sousTitre: typeof raw.sousTitre === 'string' ? raw.sousTitre.trim() : '',
    apsa: typeof raw.apsa === 'string' ? raw.apsa : 'default',
    ca: raw.ca !== undefined && raw.ca !== null ? String(raw.ca) : '',
    niveauScolaire: typeof raw.niveauScolaire === 'string' ? raw.niveauScolaire.trim() : '',
    niveaux: [],
    blocks: []
  };

  if (!result.titre){
    throw new Error('Le champ "titre" est obligatoire.');
  }

  // ---- niveaux ----
  if (raw.niveaux !== undefined){
    if (!Array.isArray(raw.niveaux)) throw new Error('"niveaux" doit être un tableau.');
    result.niveaux = raw.niveaux.map((n, i) => {
      if (typeof n !== 'object' || n === null) throw new Error(`niveaux[${i}] doit être un objet.`);
      if (typeof n.label !== 'string' || !n.label.trim()) throw new Error(`niveaux[${i}].label est obligatoire.`);
      return {
        id: uid('n'),
        label: n.label.trim(),
        couleur: typeof n.couleur === 'string' ? n.couleur : DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]
      };
    });
  }

  // ---- blocks ----
  if (raw.blocks !== undefined){
    if (!Array.isArray(raw.blocks)) throw new Error('"blocks" doit être un tableau.');
    result.blocks = raw.blocks.map((b, i) => {
      if (typeof b !== 'object' || b === null) throw new Error(`blocks[${i}] doit être un objet.`);
      if (!VALID_BLOCK_TYPES.includes(b.type)){
        throw new Error(`blocks[${i}].type invalide : "${b.type}". Valeurs possibles : ${VALID_BLOCK_TYPES.join(', ')}.`);
      }
      const defaults = defaultBlockData(b.type);
      const data = normalizeBlockData(b.type, b.data || {}, defaults, i);
      return { id: uid('b'), type: b.type, data };
    });
  }

  return result;
}

function normalizeBlockData(type, data, defaults, i){
  if (typeof data !== 'object' || data === null){
    throw new Error(`blocks[${i}].data doit être un objet.`);
  }
  switch(type){
    case 'bandeau':
      return {
        titre: str(data.titre, ''),
        sousTitre: str(data.sousTitre, ''),
        couleur: str(data.couleur, defaults.couleur)
      };
    case 'objectif':
    case 'securite':
      return { texte: str(data.texte, '') };
    case 'texte':
      return { html: str(data.html, '') };
    case 'encadre':
      return {
        titre: str(data.titre, ''),
        texte: str(data.texte, ''),
        couleur: str(data.couleur, defaults.couleur)
      };
    case 'image':
      return {
        url: str(data.url, ''),
        legende: str(data.legende, '')
      };
    case 'aflp':
      return { cols: normalizeCols(data.cols, i, 'label', AFLP_PALETTE) };
    case 'tableau':
      return { cols: normalizeCols(data.cols, i, 'titre', null) };
    default:
      return defaults;
  }
}

function normalizeCols(cols, i, titleField, palette){
  if (!Array.isArray(cols) || cols.length === 0){
    throw new Error(`blocks[${i}].data.cols doit être un tableau non vide.`);
  }
  return cols.map((c, j) => {
    if (typeof c !== 'object' || c === null) throw new Error(`blocks[${i}].data.cols[${j}] doit être un objet.`);
    const title = c[titleField];
    if (typeof title !== 'string' || !title.trim()){
      throw new Error(`blocks[${i}].data.cols[${j}].${titleField} est obligatoire.`);
    }
    const entry = {
      [titleField]: title.trim(),
      couleur: str(c.couleur, palette ? palette[j % palette.length] : '#e7eee9'),
      note: str(c.note, '')
    };
    if (titleField === 'titre') entry.texte = str(c.texte, '');
    return entry;
  });
}

function str(v, fallback){
  return typeof v === 'string' ? v : fallback;
}

function applyImport(){
  let raw;
  if (currentImportTab === 'file'){
    if (!importedFileContent){
      showImportError('Choisis un fichier .json avant d\'importer.');
      return;
    }
    raw = importedFileContent.trim();
  } else {
    raw = document.getElementById('importTextarea').value.trim();
    if (!raw){
      showImportError('Colle un JSON avant d\'importer.');
      return;
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e){
    showImportError('JSON invalide : ' + e.message);
    return;
  }

  let normalized;
  try {
    normalized = normalizeImport(parsed);
  } catch (e){
    showImportError(e.message);
    return;
  }

  if (fpsId && (blocks.length > 0 || niveaux.length > 0)){
    if (!confirm('Cette FPS contient déjà du contenu. L\'import va le remplacer entièrement. Continuer ?')){
      return;
    }
  }

  document.getElementById('titre').value = normalized.titre;
  document.getElementById('sousTitre').value = normalized.sousTitre;
  document.getElementById('apsa').value = normalized.apsa;
  document.getElementById('ca').value = normalized.ca;
  document.getElementById('niveauScolaire').value = normalized.niveauScolaire;
  niveaux = normalized.niveaux;
  blocks = normalized.blocks;

  renderNiveaux();
  renderBlocks();
  closeImportPanel();
  saveFps();
}

function saveFps(cb){
  const payload = buildPayload();
  if (!payload.titre){
    alert('Ajoute un titre avant d\'enregistrer.');
    return;
  }
  setStatus('Enregistrement…');
  if (!fpsId){
    fpsId = uid('f');
    history.replaceState(null, '', `editeur.html?id=${fpsId}`);
  }
  ROOT.child('fps/' + fpsId).update(payload, (err) => {
    setStatus(err ? 'Erreur' : 'Enregistré');
    if (cb) cb();
  });
}

function duplicateFps(){
  const payload = buildPayload();
  if (!payload.titre){ alert('Ajoute un titre avant de dupliquer.'); return; }
  payload.titre = payload.titre + ' (copie)';
  payload.niveaux = niveaux.map(n => ({...n, id: uid('n')}));
  payload.blocks = blocks.map(b => ({...b, id: uid('b')}));
  const newId = uid('f');
  ROOT.child('fps/' + newId).set(payload, (err) => {
    if (!err) location.href = `editeur.html?id=${newId}`;
  });
}

function scheduleSave(){
  if (!fpsId) return; // pas d'autosave avant la première sauvegarde manuelle
  clearTimeout(saveTimer);
  setStatus('…');
  saveTimer = setTimeout(saveFps, 800);
}

// champs d'identification : autosave
document.querySelectorAll('#titre, #sousTitre, #apsa, #ca, #niveauScolaire').forEach(el => {
  el.addEventListener('input', scheduleSave);
  el.addEventListener('change', scheduleSave);
});

loadFps();
