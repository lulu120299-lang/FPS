// ---- Vue impression / PDF ----

const params = new URLSearchParams(location.search);
const fpsId = params.get('id');

function goBack(){
  location.href = fpsId ? `editeur.html?id=${fpsId}` : 'index.html';
}

function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function nl2br(s){ return escapeHtml(s).replace(/\n/g,'<br>'); }

function renderBlock(b){
  switch(b.type){
    case 'bandeau':
      return `<div class="pv-bandeau" style="background:${b.data.couleur}">
        <p class="t1">${escapeHtml(b.data.titre)}</p>
        <p class="t2">${escapeHtml(b.data.sousTitre)}</p>
      </div>`;

    case 'objectif':
      return `<div class="pv-objectif">${nl2br(b.data.texte)}</div>`;

    case 'aflp':
      return `<div class="pv-aflp" style="grid-template-columns:repeat(${b.data.cols.length},1fr)">
        ${b.data.cols.map(c => `
          <div class="pv-aflp-col" style="background:${c.couleur}">
            <div class="lbl">${escapeHtml(c.label)}</div>
            <div class="txt">${nl2br(c.texte)}</div>
          </div>
        `).join('')}
      </div>`;

    case 'texte':
      return `<div class="pv-texte">${b.data.html || ''}</div>`;

    case 'encadre':
      return `<div class="pv-encadre" style="background:${b.data.couleur}">
        ${b.data.titre ? `<strong>${escapeHtml(b.data.titre)}</strong>` : ''}${nl2br(b.data.texte)}
      </div>`;

    case 'tableau':
      return `<div class="pv-tableau" style="grid-template-columns:repeat(${b.data.cols.length},1fr)">
        ${b.data.cols.map(c => `
          <div class="pv-tableau-col">
            <div class="h" style="background:${c.couleur}">${escapeHtml(c.titre)}</div>
            <div class="b">${nl2br(c.texte)}</div>
          </div>
        `).join('')}
      </div>`;

    case 'securite':
      return `<div class="pv-securite"><strong>Sécurité —</strong>${nl2br(b.data.texte)}</div>`;

    case 'image':
      return `<div class="pv-image">
        <img src="${b.data.url}" alt="">
        ${b.data.legende ? `<div class="leg">${escapeHtml(b.data.legende)}</div>` : ''}
      </div>`;

    default:
      return '';
  }
}

function render(data){
  const page = document.getElementById('page');
  if (!data.blocks || data.blocks.length === 0){
    page.innerHTML = `<div class="empty-state">Cette FPS ne contient aucun bloc de contenu.<br>Retourne dans l'éditeur pour en ajouter.</div>`;
    return;
  }
  const meta = [data.niveauScolaire, data.ca ? `CA${data.ca}` : null].filter(Boolean).join(' · ');
  page.innerHTML = data.blocks.map(renderBlock).join('') + `
    <div class="pv-footer">${escapeHtml(data.titre || '')}${meta ? ' — ' + escapeHtml(meta) : ''}</div>
  `;
  document.title = (data.titre || 'FPS') + ' — Aperçu PDF';
}

if (!fpsId){
  document.getElementById('page').innerHTML = '<div class="empty-state">Aucune FPS sélectionnée.</div>';
} else {
  ROOT.child('fps/' + fpsId).once('value', (snap) => {
    const data = snap.val();
    if (!data){
      document.getElementById('page').innerHTML = '<div class="empty-state">FPS introuvable.</div>';
      return;
    }
    render(data);
  });
}
