// ---- Éditeur FPS ----

const params = new URLSearchParams(location.search);
let fpsId = params.get('id');
let niveaux = [];
let files = [];
let saveTimer = null;

const DEFAULT_PALETTE = ['#8aa399','#a3b89a','#d9c089','#e8a06a','#e0654a'];

function uid(){
  return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

function setStatus(text){
  const el = document.getElementById('saveStatus');
  el.textContent = text;
  if (text === 'Enregistré') setTimeout(() => { if(el.textContent==='Enregistré') el.textContent=''; }, 1500);
}

function goBack(){ location.href = 'index.html'; }

function goToSchema(){
  if (!fpsId) { alert('Enregistre d\'abord la FPS pour créer un schéma.'); return; }
  location.href = `schema.html?fps=${fpsId}`;
}

function goToGrille(){
  if (!fpsId) { alert('Enregistre d\'abord la FPS pour ouvrir la grille de classe.'); return; }
  location.href = `grille.html?fps=${fpsId}`;
}

// ---- Niveaux ----
function renderNiveaux(){
  const list = document.getElementById('niveauxList');
  list.innerHTML = niveaux.map((n, i) => `
    <div class="niveau-item" data-i="${i}">
      <input type="color" class="niveau-color" value="${n.couleur}" oninput="updateNiveau(${i},'couleur',this.value)">
      <input type="text" placeholder="Nom du niveau (ex. Niveau 1 — Découverte)" value="${escapeAttr(n.label)}" oninput="updateNiveau(${i},'label',this.value)">
      <button class="niveau-remove" onclick="removeNiveau(${i})">×</button>
    </div>
  `).join('');
}

function escapeAttr(s){
  return (s||'').replace(/"/g,'&quot;');
}

function addNiveau(){
  const i = niveaux.length;
  niveaux.push({ id: uid(), label: `Niveau ${i+1}`, couleur: DEFAULT_PALETTE[i % DEFAULT_PALETTE.length] });
  renderNiveaux();
}

function removeNiveau(i){
  niveaux.splice(i,1);
  renderNiveaux();
}

function updateNiveau(i, key, val){
  niveaux[i][key] = val;
}

// ---- Fichiers ----
function renderFiles(){
  const list = document.getElementById('fileList');
  list.innerHTML = files.map((f,i) => {
    const isImg = f.type && f.type.startsWith('image');
    const icon = isImg ? 'IMG' : 'PDF';
    return `
    <div class="file-chip">
      <div class="ficon">${icon}</div>
      <div class="fname">${f.name}</div>
      <a href="${f.url}" target="_blank" download="${f.name}">⇣</a>
      <button onclick="removeFile(${i})">×</button>
    </div>`;
  }).join('');
}

function removeFile(i){
  files.splice(i,1);
  renderFiles();
}

document.getElementById('fileInput').addEventListener('change', async (e) => {
  for (const file of e.target.files){
    if (file.size > 4 * 1024 * 1024){
      alert(`"${file.name}" dépasse 4 Mo et ne peut pas être stocké directement. Utilise un lien externe pour ce fichier.`);
      continue;
    }
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    files.push({ name: file.name, type: file.type, url: dataUrl });
  }
  renderFiles();
  e.target.value = '';
});

// ---- Chargement ----
function loadFps(){
  if (!fpsId){
    niveaux = [
      { id: uid(), label: 'Niveau 1 — Découverte', couleur: DEFAULT_PALETTE[0] },
      { id: uid(), label: 'Niveau 2 — Adaptation', couleur: DEFAULT_PALETTE[2] },
      { id: uid(), label: 'Niveau 3 — Maîtrise', couleur: DEFAULT_PALETTE[4] },
    ];
    renderNiveaux();
    renderFiles();
    return;
  }
  ROOT.child('fps/' + fpsId).once('value', (snap) => {
    const data = snap.val();
    if (!data) return;
    document.getElementById('titre').value = data.titre || '';
    document.getElementById('apsa').value = data.apsa || 'default';
    document.getElementById('ca').value = data.ca || '';
    document.getElementById('niveauScolaire').value = data.niveauScolaire || '';
    document.getElementById('dispositif').value = data.dispositif || '';
    document.getElementById('consignes').value = data.consignes || '';
    document.getElementById('criteres').value = data.criteres || '';
    niveaux = data.niveaux || [];
    files = data.files || [];
    renderNiveaux();
    renderFiles();
  });
}

// ---- Sauvegarde ----
function buildPayload(){
  return {
    titre: document.getElementById('titre').value.trim(),
    apsa: document.getElementById('apsa').value,
    ca: document.getElementById('ca').value,
    niveauScolaire: document.getElementById('niveauScolaire').value.trim(),
    dispositif: document.getElementById('dispositif').value.trim(),
    consignes: document.getElementById('consignes').value.trim(),
    criteres: document.getElementById('criteres').value.trim(),
    niveaux: niveaux,
    files: files,
    archived: false,
    updatedAt: Date.now()
  };
}

function saveFps(){
  const payload = buildPayload();
  if (!payload.titre){
    alert('Ajoute un titre avant d\'enregistrer.');
    return;
  }
  setStatus('Enregistrement…');
  if (!fpsId){
    fpsId = uid();
    history.replaceState(null, '', `editeur.html?id=${fpsId}`);
  }
  ROOT.child('fps/' + fpsId).update(payload, (err) => {
    setStatus(err ? 'Erreur' : 'Enregistré');
  });
}

function duplicateFps(){
  const payload = buildPayload();
  if (!payload.titre){ alert('Ajoute un titre avant de dupliquer.'); return; }
  payload.titre = payload.titre + ' (copie)';
  payload.niveaux = niveaux.map(n => ({...n, id: uid()}));
  const newId = uid();
  ROOT.child('fps/' + newId).set(payload, (err) => {
    if (!err) location.href = `editeur.html?id=${newId}`;
  });
}

// auto-save léger sur les champs texte (debounce)
document.querySelectorAll('input[type=text], textarea, select').forEach(el => {
  el.addEventListener('input', () => {
    if (!fpsId) return; // on ne sauvegarde pas automatiquement avant la première création
    clearTimeout(saveTimer);
    setStatus('…');
    saveTimer = setTimeout(saveFps, 800);
  });
});

loadFps();
