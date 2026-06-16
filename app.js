// ---- Page d'accueil : carnet de fiches FPS ----

const APSA_ICONS = {
  'demi-fond':'⚡️','course-duree':'🏃','course-vitesse':'💨','orientation':'🧭',
  'acrosport':'🤸','badminton':'🏸','tennis-table':'🏓','volley':'🏐',
  'athletisme':'🏃‍♂️','musculation':'🏋️','default':'📋'
};

const NIVEAU_STAMP_CLASS = {
  cap:'cap', bacpro:'bacpro', seconde:'seconde'
};

let allFps = {};
let currentFilter = 'all';

function levelColor(i, total){
  const palette = ['#5b7c8d','#7a9b6e','#c9954a','#b1623f','#8a6a9b','#5a8a7a'];
  return palette[i % palette.length];
}

function escapeHtml(s){
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function guessStampClass(niveauScolaire){
  const s = (niveauScolaire || '').toLowerCase();
  if (s.includes('cap')) return 'cap';
  if (s.includes('bac pro') || s.includes('bacpro') || s.includes('pro')) return 'bacpro';
  if (s.includes('seconde') || s.includes('2nde')) return 'seconde';
  return 'cap';
}

function renderList(){
  const content = document.getElementById('content');
  const entries = Object.entries(allFps).filter(([id, fps]) => {
    if (currentFilter === 'all') return !fps.archived;
    if (currentFilter === 'archive') return !!fps.archived;
    return !fps.archived && (fps.niveauScolaire || '').toLowerCase().includes(currentFilter);
  });

  if (entries.length === 0){
    content.innerHTML = `
      <div class="empty-note">
        ✏️ Carnet vide
        <p>Crée ta première fiche : modalités, niveaux<br>de compétence, schémas et PDF associés.</p>
      </div>`;
    return;
  }

  entries.sort((a,b) => (b[1].updatedAt||0) - (a[1].updatedAt||0));

  content.innerHTML = entries.map(([id, fps]) => {
    const icon = APSA_ICONS[fps.apsa] || APSA_ICONS.default;
    const niveaux = fps.niveaux || [];
    const stampClass = guessStampClass(fps.niveauScolaire);
    const stampLabel = fps.niveauScolaire ? fps.niveauScolaire.slice(0, 10) : '—';
    const meta = [fps.ca ? `CA${fps.ca}` : null, (fps.apsa || '').replace(/-/g,' ')].filter(Boolean).join(' · ');

    const pegs = niveaux.length
      ? niveaux.map((n,i) => `<div class="peg" style="background:${n.couleur || levelColor(i, niveaux.length)}"></div>`).join('')
      : `<span class="pegs-empty">Pas de niveaux définis</span>`;

    return `
      <div class="card" data-id="${id}">
        <div class="stamp ${stampClass}">${escapeHtml(stampLabel)}</div>
        <div class="card-icon">${icon}</div>
        <div class="card-title">${escapeHtml(fps.titre || 'Sans titre')}</div>
        <div class="card-meta">${escapeHtml(meta || '—')}</div>
        <div class="clearfix"></div>
        <div class="pegs">${pegs}</div>
        <button class="del-btn" data-del="${id}" title="Supprimer">🗑️</button>
      </div>`;
  }).join('');

  content.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-del]')) return;
      location.href = `editeur.html?id=${card.dataset.id}`;
    });
  });
  content.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFps(btn.dataset.del);
    });
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

document.getElementById('filters').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(c => c.classList.remove('active'));
  tab.classList.add('active');
  currentFilter = tab.dataset.filter;
  renderList();
});

ROOT.child('fps').on('value', (snap) => {
  allFps = snap.val() || {};
  renderList();
});
