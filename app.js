// ---- Page d'accueil : liste des FPS ----

const APSA_ICONS = {
  'demi-fond':'DF','course-duree':'CD','course-vitesse':'CV','orientation':'CO',
  'acrosport':'AC','badminton':'BD','tennis-table':'TT','volley':'VB',
  'athletisme':'AT','musculation':'MU','default':'FPS'
};

let allFps = {};
let currentFilter = 'all';

function levelColor(i, total){
  // dégradé sage -> corail selon position du niveau
  const palette = ['#8aa399','#a3b89a','#d9c089','#e8a06a','#e0654a'];
  if (total <= 1) return palette[0];
  const idx = Math.round((i/(total-1)) * (palette.length-1));
  return palette[idx];
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
      <div class="empty">
        <div class="sym">FPS</div>
        <h2>Aucune fiche pour l'instant</h2>
        <p>Crée ta première FPS : modalités, niveaux de compétence,<br>schémas et PDF associés.</p>
      </div>`;
    return;
  }

  // tri par date de modification décroissante
  entries.sort((a,b) => (b[1].updatedAt||0) - (a[1].updatedAt||0));

  content.innerHTML = `<div class="fps-list">${entries.map(([id, fps]) => {
    const icon = APSA_ICONS[fps.apsa] || APSA_ICONS.default;
    const niveaux = fps.niveaux || [];
    const dots = niveaux.map((n,i) =>
      `<div class="lvl-dot" style="background:${n.couleur || levelColor(i, niveaux.length)}"></div>`
    ).join('');
    const meta = [
      fps.niveauScolaire,
      fps.ca ? `CA${fps.ca}` : null,
      niveaux.length ? `${niveaux.length} niveaux` : null
    ].filter(Boolean).map(m => `<span>${m}</span>`).join('');

    return `
      <div class="fps-card" onclick="location.href='editeur.html?id=${id}'">
        <div class="fps-tag">${icon}</div>
        <div class="fps-info">
          <p class="fps-title">${fps.titre || 'Sans titre'}</p>
          <div class="fps-meta">${meta}</div>
        </div>
        <div class="levels-preview">${dots}</div>
        <div class="fps-arrow">›</div>
      </div>`;
  }).join('')}</div>`;
}

document.getElementById('filters').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  currentFilter = chip.dataset.filter;
  renderList();
});

ROOT.child('fps').on('value', (snap) => {
  allFps = snap.val() || {};
  renderList();
});
