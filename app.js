// ---- Page d'accueil : 3 tableaux (Collège / Lycée / Lycée Pro) x colonnes CA ----

const APSA_ICONS = {
  'demi-fond':'⚡️','course-duree':'🏃','course-vitesse':'💨','orientation':'🧭',
  'acrosport':'🤸','badminton':'🏸','tennis-table':'🏓','volley':'🏐','gymnastique':'🤸‍♂️',
  'athletisme':'🏃‍♂️','musculation':'🏋️','rugby':'🏉', 'natation':'🏊', 'default':'📋'
};

const CA_COLUMNS = [
  { id: '1', label: 'CA1' },
  { id: '2', label: 'CA2' },
  { id: '3', label: 'CA3' },
  { id: '4', label: 'CA4' },
  { id: '5', label: 'CA5' },
];

const LEVEL_BOARDS = [
  { id: 'college', label: 'Collège' },
  { id: 'lycee', label: 'Lycée' },
  { id: 'pro', label: 'Lycée Pro' }
];

let allFps = {};

function levelColor(i, total){
  const palette = ['#5b7c8d','#7a9b6e','#c9954a','#b1623f','#8a6a9b','#5a8a7a'];
  return palette[i % palette.length];
}

function escapeHtml(s){
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Classe un niveau scolaire libre dans une des trois catégories de tableau.
function classifyNiveau(niveauScolaire){
  const s = (niveauScolaire || '').toLowerCase();
  if (s.includes('pro') || s.includes('cap')) return 'pro';
  if (s.includes('6e') || s.includes('6ème') || s.includes('5e') || s.includes('5ème') ||
      s.includes('4e') || s.includes('4ème') || s.includes('3e') || s.includes('3ème') ||
      s.includes('cycle 3') || s.includes('cycle 4') || s.includes('collège') || s.includes('college')){
    return 'college';
  }
  if (s.includes('seconde') || s.includes('2nde') || s.includes('première') || s.includes('premiere') ||
      s.includes('1ère') || s.includes('terminale') || s.includes('tle') || s.includes('lycée') || s.includes('lycee')){
    return 'lycee';
  }
  return 'lycee';
}

function caKey(fps){
  const ca = (fps.ca || '').toString().trim();
  return CA_COLUMNS.some(c => c.id === ca) ? ca : '';
}

function cardHtml(id, fps){
  const icon = APSA_ICONS[fps.apsa] || APSA_ICONS.default;
  const niveaux = fps.niveaux || [];
  const meta = [fps.niveauScolaire, (fps.apsa || '').replace(/-/g,' ')].filter(Boolean).join(' · ');
  const pegs = niveaux.length
    ? niveaux.map((n,i) => `<div class="peg" style="background:${n.couleur || levelColor(i, niveaux.length)}"></div>`).join('')
    : '';

  return `
    <div class="card" data-id="${id}" draggable="true">
      <div class="card-actions">
        <button data-del="${id}" title="Supprimer">🗑️</button>
      </div>
      <div class="card-top">
        <div class="card-icon">${icon}</div>
        <div class="card-title">${escapeHtml(fps.titre || 'Sans titre')}</div>
      </div>
      <div class="card-meta">${escapeHtml(meta || '—')}</div>
      <div class="pegs">${pegs}</div>
    </div>`;
}

function renderBoards(){
  const boardsEl = document.getElementById('boards');
  const active = Object.entries(allFps).filter(([id, fps]) => !fps.archived);
  const archived = Object.entries(allFps).filter(([id, fps]) => !!fps.archived);

  if (active.length === 0 && archived.length === 0){
    boardsEl.innerHTML = `
      <div class="empty-note">
        ✏️ Carnet vide
        <p>Crée ta première fiche : modalités, niveaux<br>de compétence, schémas et PDF associés.</p>
      </div>`;
    return;
  }

  const byLevel = { college: [], lycee: [], pro: [] };
  active.forEach(([id, fps]) => byLevel[classifyNiveau(fps.niveauScolaire)].push([id, fps]));

  const boardsHtml = LEVEL_BOARDS.map(board => {
    const entries = byLevel[board.id];
    const cols = CA_COLUMNS.map(col => {
      const colEntries = entries.filter(([id, fps]) => caKey(fps) === col.id);
      colEntries.sort((a,b) => (b[1].updatedAt||0) - (a[1].updatedAt||0));
      const cardsHtml = colEntries.map(([id, fps]) => cardHtml(id, fps)).join('')
        || `<div class="column-empty">Vide</div>`;
      return `
        <div class="column" data-board="${board.id}" data-ca="${col.id}">
          <div class="column-head"><span>${col.label}</span><span>${colEntries.length}</span></div>
          <div class="column-body" data-board="${board.id}" data-ca="${col.id}">${cardsHtml}</div>
        </div>`;
    }).join('');

    return `
      <div class="level-board">
        <div class="level-head">
          <h2>${board.label}</h2>
          <span class="count">${entries.length} fiche${entries.length>1?'s':''}</span>
        </div>
        <div class="columns">${cols}</div>
      </div>`;
  }).join('');

  const archiveHtml = archived.length ? `
    <div class="archive-toggle" id="archiveToggle">Archivées (${archived.length}) — toucher pour afficher</div>
    <div class="archive-list" id="archiveList">
      <div class="columns">
        <div class="column" style="flex:1 1 auto">
          <div class="column-body">${archived.map(([id, fps]) => cardHtml(id, fps)).join('')}</div>
        </div>
      </div>
    </div>` : '';

  boardsEl.innerHTML = archiveHtml + boardsHtml;

  attachCardEvents();
  attachColumnDropZones();

  const toggle = document.getElementById('archiveToggle');
  if (toggle){
    toggle.addEventListener('click', () => {
      document.getElementById('archiveList').classList.toggle('open');
    });
  }
}

function attachCardEvents(){
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.dataset.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-del]')) return;
      location.href = `editeur.html?id=${card.dataset.id}`;
    });
  });
  document.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFps(btn.dataset.del);
    });
  });
}

function attachColumnDropZones(){
  document.querySelectorAll('.column-body[data-board]').forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.closest('.column').classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => {
      zone.closest('.column').classList.remove('dragover');
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.closest('.column').classList.remove('dragover');
      const fpsId = e.dataTransfer.getData('text/plain');
      moveFpsToCa(fpsId, zone.dataset.board, zone.dataset.ca);
    });
  });
}

// Déplace une FPS vers une nouvelle colonne CA, uniquement si elle reste dans le même tableau
// (même niveau scolaire classifié) — un déplacement inter-tableau est ignoré silencieusement
// puisque le drag-and-drop est limité aux colonnes d'un même tableau.
function moveFpsToCa(fpsId, boardId, newCa){
  const fps = allFps[fpsId];
  if (!fps) return;
  if (classifyNiveau(fps.niveauScolaire) !== boardId) return;
  if (caKey(fps) === newCa) return;
  ROOT.child('fps/' + fpsId + '/ca').set(newCa, (err) => {
    if (err) alert('Erreur lors du déplacement : ' + err.message);
  });
}

function deleteFps(id){
  const fps = allFps[id];
  const titre = fps ? (fps.titre || 'Sans titre') : 'cette FPS';
  if (!confirm(`Supprimer définitivement « ${titre} » ?\nCette action est irréversible (contenu, schémas et grille de classe associés seront perdus).`)) return;
  ROOT.child('fps/' + id).remove((err) => {
    if (err) alert('Erreur lors de la suppression : ' + err.message);
  });
}

ROOT.child('fps').on('value', (snap) => {
  allFps = snap.val() || {};
  renderBoards();
});
