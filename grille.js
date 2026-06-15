// ---- Grille de classe : répartition des élèves par niveau ----

const params = new URLSearchParams(location.search);
const fpsId = params.get('fps');

let fps = null;          // données de la FPS (titre, niveaux)
let eleves = [];         // [{id, nom}]
let placement = {};       // {eleveId: niveauId}
let mode = 'prof';
let saveTimer = null;

function uid(){
  return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

function setStatus(text){
  const el = document.getElementById('saveStatus');
  el.textContent = text;
  if (text === 'Enregistré') setTimeout(() => { if(el.textContent==='Enregistré') el.textContent=''; }, 1500);
}

function goBack(){
  location.href = fpsId ? `editeur.html?id=${fpsId}` : 'index.html';
}

function initiales(nom){
  return (nom||'').trim().split(/\s+/).map(p => p[0]).slice(0,2).join('').toUpperCase();
}

// ---- Chargement FPS ----
function loadFps(){
  if (!fpsId){
    document.getElementById('pageTitle').textContent = 'Grille de classe';
    return;
  }
  ROOT.child('fps/' + fpsId).once('value', (snap) => {
    fps = snap.val();
    if (!fps){
      document.getElementById('pageTitle').textContent = 'FPS introuvable';
      return;
    }
    document.getElementById('pageTitle').textContent = fps.titre || 'Grille de classe';
    if (!fps.niveaux || fps.niveaux.length === 0){
      document.getElementById('content').innerHTML = `
        <div class="empty-state">
          <div class="sym">!</div>
          <h2>Aucun niveau configuré</h2>
          <p>Retourne dans l'éditeur de cette FPS pour ajouter<br>au moins un niveau de compétence.</p>
        </div>`;
      return;
    }
    loadGrille();
  });
}

// ---- Chargement grille (élèves + placement) ----
function loadGrille(){
  ROOT.child('grilles/' + fpsId).once('value', (snap) => {
    const data = snap.val() || {};
    eleves = data.eleves || [];
    placement = data.placement || {};
    if (eleves.length > 0){
      renderAll();
    }
  });
}

// ---- Import xlsx ----
document.getElementById('xlsxInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Heuristique simple : on cherche une colonne "Nom" et "Prénom" dans la première ligne,
  // sinon on prend la première colonne non vide comme nom complet.
  let header = rows[0].map(c => String(c).toLowerCase());
  let nomIdx = header.findIndex(c => c.includes('nom') && !c.includes('prénom') && !c.includes('prenom'));
  let prenomIdx = header.findIndex(c => c.includes('prénom') || c.includes('prenom'));

  const newEleves = [];
  for (let i = 1; i < rows.length; i++){
    const row = rows[i];
    if (!row || row.every(c => c === '')) continue;
    let nomComplet;
    if (nomIdx >= 0 && prenomIdx >= 0){
      nomComplet = `${row[prenomIdx]||''} ${row[nomIdx]||''}`.trim();
    } else {
      nomComplet = String(row[0]||'').trim();
    }
    if (!nomComplet) continue;
    newEleves.push({ id: uid(), nom: nomComplet });
  }

  if (newEleves.length === 0){
    alert("Aucun élève détecté dans ce fichier. Vérifie qu'il contient bien une colonne Nom/Prénom.");
    e.target.value = '';
    return;
  }

  eleves = newEleves;
  placement = {};
  renderAll();
  saveGrille();
  e.target.value = '';
});

// ---- Rendu ----
function renderAll(){
  document.getElementById('content').innerHTML = '';
  document.getElementById('poolSection').style.display = '';
  document.getElementById('lanes').style.display = '';
  document.getElementById('clearBtn').style.display = '';
  renderLanes();
  renderPool();
  renderStudentSelect();
  applyMode();
}

function renderLanes(){
  const lanes = document.getElementById('lanes');
  lanes.innerHTML = fps.niveaux.map(n => `
    <div class="lane">
      <div class="lane-head" style="border-bottom-color:${n.couleur || '#dcdfd9'}">
        <div class="lname">${n.label}</div>
        <div class="lcount" data-count="${n.id}">0 élève</div>
      </div>
      <div class="lane-body" data-niveau="${n.id}"></div>
    </div>
  `).join('');

  lanes.querySelectorAll('.lane-body').forEach(zone => {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const eleveId = e.dataTransfer.getData('text/plain');
      placeEleve(eleveId, zone.dataset.niveau);
    });
  });

  const pool = document.getElementById('poolCards');
  pool.addEventListener('dragover', e => { e.preventDefault(); pool.classList.add('dragover'); });
  pool.addEventListener('dragleave', () => pool.classList.remove('dragover'));
  pool.addEventListener('drop', e => {
    e.preventDefault();
    pool.classList.remove('dragover');
    const eleveId = e.dataTransfer.getData('text/plain');
    placeEleve(eleveId, null);
  });
}

function renderPool(){
  const pool = document.getElementById('poolCards');
  const unplaced = eleves.filter(el => !placement[el.id]);
  pool.innerHTML = unplaced.map(cardHtml).join('') || '<span style="font-size:12px;color:var(--slate-light)">Tous les élèves sont placés.</span>';
  attachCardEvents(pool);

  // placer les élèves déjà assignés dans leur couloir + compteurs
  fps.niveaux.forEach(n => {
    const zone = document.querySelector(`.lane-body[data-niveau="${n.id}"]`);
    const inLane = eleves.filter(el => placement[el.id] === n.id);
    zone.innerHTML = inLane.map(cardHtml).join('');
    document.querySelector(`[data-count="${n.id}"]`).textContent =
      `${inLane.length} élève${inLane.length>1?'s':''}`;
    attachCardEvents(zone);
  });
}

function cardHtml(el){
  return `<div class="eleve-card" draggable="true" data-eleve="${el.id}">
    <span class="initiale">${initiales(el.nom)}</span>
    <span class="nom">${el.nom}</span>
  </div>`;
}

function attachCardEvents(container){
  container.querySelectorAll('.eleve-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', card.dataset.eleve);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
}

function placeEleve(eleveId, niveauId){
  if (!eleveId) return;
  if (niveauId) placement[eleveId] = niveauId;
  else delete placement[eleveId];
  renderPool();
  saveGrille();
}

function resetGrille(){
  if (!confirm('Réinitialiser la répartition de tous les élèves ?')) return;
  placement = {};
  renderPool();
  saveGrille();
}

// ---- Sauvegarde ----
function saveGrille(){
  setStatus('…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    ROOT.child('grilles/' + fpsId).set({ eleves, placement, updatedAt: Date.now() }, (err) => {
      setStatus(err ? 'Erreur' : 'Enregistré');
    });
  }, 400);
}

// ---- Mode élève (autoévaluation) ----
function renderStudentSelect(){
  const sel = document.getElementById('studentSelect');
  sel.innerHTML = '<option value="">— Choisis ton prénom —</option>' +
    eleves.map(el => `<option value="${el.id}">${el.nom}</option>`).join('');
}

document.getElementById('modeToggle').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelectorAll('#modeToggle button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  mode = btn.dataset.mode;
  applyMode();
});

function applyMode(){
  const pick = document.getElementById('studentPick');
  const pool = document.getElementById('poolSection');
  if (mode === 'eleve'){
    pick.classList.add('show');
    pool.style.display = 'none';
    document.getElementById('clearBtn').style.display = 'none';
    document.querySelector('.btn-import').style.display = 'none';
  } else {
    pick.classList.remove('show');
    pool.style.display = '';
    document.getElementById('clearBtn').style.display = '';
    document.querySelector('.btn-import').style.display = '';
  }
}

// En mode élève : seul l'élève sélectionné est draggable, et seulement sa carte est visible dans les couloirs/pool
document.getElementById('studentSelect').addEventListener('change', () => {
  const selected = document.getElementById('studentSelect').value;
  document.querySelectorAll('.eleve-card').forEach(card => {
    const isSelf = card.dataset.eleve === selected;
    card.style.display = (!selected || isSelf) ? '' : 'none';
    card.setAttribute('draggable', isSelf ? 'true' : 'false');
  });
});

loadFps();
