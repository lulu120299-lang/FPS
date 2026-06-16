// ---- Page d'accueil : liste des FPS en mode tableau ----

const APSA_ICONS = {
  'demi-fond':'DF','course-duree':'CD','course-vitesse':'CV','orientation':'CO',
  'acrosport':'AC','badminton':'BD','tennis-table':'TT','volley':'VB',
  'athletisme':'AT','musculation':'MU','default':'FPS'
};

const APSA_COLORS = {
  'demi-fond':'#5b7c8d','course-duree':'#7a9b6e','course-vitesse':'#b1623f','orientation':'#8aa399',
  'acrosport':'#8a6a9b','badminton':'#7a5fb0','tennis-table':'#2f7d5a','volley':'#d0a23a',
  'athletisme':'#c9954a','musculation':'#5a8a7a','default':'#5a6e6e'
};

let allFps = {};
let currentFilter = 'all';

function levelColor(i, total){
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

  entries.sort((a,b) => (b[1].updatedAt||0) - (a[1].updatedAt||0));

  content.innerHTML = `
    <div class="fps-table">
      <div class="fps-table-head">
        <div class="col-titre">FPS</div>
        <div class="col-niveau">Niveau</div>
        <div class="col-niveaux">Compétences</div>
        <div class="col-actions"></div>
      </div>
      ${entries.map(([id, fps]) => {
        const apsaColor = APSA_COLORS[fps.apsa] || APSA_COLORS.default;
        const apsaLabel = (fps.apsa || 'default').replace(/-/g,' ');
        const niveaux = fps.niveaux || [];
        const dots = niveaux.map((n,i) =>
          `<div class="lvl-dot" style="background:${n.couleur || levelColor(i, niveaux.length)}"></div>`
        ).join('') || '<span style="font-size:11px;color:var(--line)">—</span>';
        const niveauTxt = [fps.niveauScolaire, fps.ca ? `CA${fps.ca}` : null].filter(Boolean).join(' · ') || '—';

        return `
          <div class="fps-row" style="--apsa-color:${apsaColor}" data-id="${id}">
            <div class="col-titre" onclick="location.href='editeur.html?id=${id}'">
              <p class="ftitle">${escapeHtml(fps.titre || 'Sans titre')}</p>
              <span class="fapsa">${escapeHtml(apsaLabel)}</span>
            </div>
            <div class="col-niveau" onclick="location.href='editeur.html?id=${id}'">${escapeHtml(niveauTxt)}</div>
            <div class="col-niveaux" onclick="location.href='editeur.html?id=${id}'">${dots}</div>
            <div class="col-actions">
              <button class="del-btn" data-del="${id}" title="Supprimer">×</button>
            </div>
          </div>`;
      }).join('')}
    </div>`;

  content.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteFps(btn.dataset.del);
    });
  });
}

function escapeHtml(s){
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
