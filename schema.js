// ---- Éditeur de schéma : canvas avec formes, flèches, texte ----

const params = new URLSearchParams(location.search);
const fpsId = params.get('fps');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let shapes = [];      // liste des formes dessinées
let history = [];     // pile pour annuler
let currentTool = 'select';
let currentColor = '#3a4a4a';
let drawing = false;
let startX, startY;
let selectedShape = null;
let saveTimer = null;
let fpsTitre = '';

function setStatus(text){
  const el = document.getElementById('saveStatus');
  el.textContent = text;
  if (text === 'Enregistré') setTimeout(() => { if(el.textContent==='Enregistré') el.textContent=''; }, 1500);
}

function goBack(){
  location.href = fpsId ? `editeur.html?id=${fpsId}` : 'index.html';
}

// ---- Outils ----
document.getElementById('toolbar').addEventListener('click', (e) => {
  const btn = e.target.closest('.tool');
  if (!btn) return;
  const tool = btn.dataset.tool;

  if (tool === 'undo'){ undo(); return; }
  if (tool === 'delete'){ deleteSelected(); return; }
  if (tool === 'clear'){ clearAll(); return; }

  document.querySelectorAll('.tool[data-tool]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTool = tool;
  selectedShape = null;
  redraw();
});

document.getElementById('colorPicker').addEventListener('input', (e) => {
  currentColor = e.target.value;
  if (selectedShape){
    selectedShape.color = currentColor;
    redraw();
    scheduleSave();
  }
});

// ---- Coordonnées pointeur ----
function getPos(e){
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

// ---- Dessin ----
function pushHistory(){
  history.push(JSON.stringify(shapes));
  if (history.length > 50) history.shift();
}

function undo(){
  if (history.length === 0) return;
  shapes = JSON.parse(history.pop());
  selectedShape = null;
  redraw();
  scheduleSave();
}

function deleteSelected(){
  if (!selectedShape) return;
  pushHistory();
  shapes = shapes.filter(s => s !== selectedShape);
  selectedShape = null;
  redraw();
  scheduleSave();
}

function clearAll(){
  if (shapes.length === 0) return;
  if (!confirm('Effacer tout le schéma ?')) return;
  pushHistory();
  shapes = [];
  selectedShape = null;
  redraw();
  scheduleSave();
}

function hitTest(x, y){
  // parcourt en ordre inverse pour sélectionner l'élément le plus "au-dessus"
  for (let i = shapes.length - 1; i >= 0; i--){
    const s = shapes[i];
    if (s.type === 'rect'){
      const x0 = Math.min(s.x1,s.x2), x1 = Math.max(s.x1,s.x2);
      const y0 = Math.min(s.y1,s.y2), y1 = Math.max(s.y1,s.y2);
      if (x>=x0 && x<=x1 && y>=y0 && y<=y1) return s;
    } else if (s.type === 'circle'){
      const r = Math.hypot(s.x2-s.x1, s.y2-s.y1);
      if (Math.hypot(x-s.x1, y-s.y1) <= r + 4) return s;
    } else if (s.type === 'arrow' || s.type === 'line'){
      const d = distToSegment(x,y,s.x1,s.y1,s.x2,s.y2);
      if (d <= 8) return s;
    } else if (s.type === 'text'){
      ctx.font = `${s.size||22}px ${getComputedStyle(document.body).fontFamily}`;
      const w = ctx.measureText(s.text).width;
      if (x>=s.x1 && x<=s.x1+w && y>=s.y1-(s.size||22) && y<=s.y1) return s;
    }
  }
  return null;
}

function distToSegment(px,py,x1,y1,x2,y2){
  const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
  const dot=A*C+B*D, lenSq=C*C+D*D;
  let t = lenSq ? dot/lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const xx=x1+t*C, yy=y1+t*D;
  return Math.hypot(px-xx, py-yy);
}

function onPointerDown(e){
  e.preventDefault();
  const {x,y} = getPos(e);
  startX = x; startY = y;

  if (currentTool === 'select'){
    selectedShape = hitTest(x,y);
    if (selectedShape){
      drawing = 'move';
      document.getElementById('colorPicker').value = selectedShape.color;
    }
    redraw();
    return;
  }

  if (currentTool === 'text'){
    const text = prompt('Texte à afficher :');
    if (text){
      pushHistory();
      shapes.push({ type:'text', x1:x, y1:y, text, color: currentColor, size: 22 });
      redraw();
      scheduleSave();
    }
    return;
  }

  drawing = 'new';
  pushHistory();
}

function onPointerMove(e){
  if (!drawing) return;
  e.preventDefault();
  const {x,y} = getPos(e);

  if (drawing === 'move' && selectedShape){
    const dx = x - startX, dy = y - startY;
    moveShape(selectedShape, dx, dy);
    startX = x; startY = y;
    redraw();
    return;
  }

  if (drawing === 'new'){
    redraw();
    drawPreview(currentTool, startX, startY, x, y);
  }
}

function onPointerUp(e){
  if (!drawing) return;
  const {x,y} = getPos(e);

  if (drawing === 'new'){
    if (Math.hypot(x-startX, y-startY) > 3 && currentTool !== 'select'){
      shapes.push({ type: currentTool, x1:startX, y1:startY, x2:x, y2:y, color: currentColor });
    } else {
      history.pop(); // mouvement nul, on annule l'historique poussé
    }
    redraw();
    scheduleSave();
  } else if (drawing === 'move'){
    scheduleSave();
  }
  drawing = false;
}

function moveShape(s, dx, dy){
  s.x1 += dx; s.y1 += dy;
  if (s.x2 !== undefined) s.x2 += dx;
  if (s.y2 !== undefined) s.y2 += dy;
}

// ---- Rendu ----
function redraw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  shapes.forEach(s => drawShape(s, s === selectedShape));
}

function drawShape(s, isSelected){
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';

  if (s.type === 'rect'){
    ctx.strokeRect(Math.min(s.x1,s.x2), Math.min(s.y1,s.y2), Math.abs(s.x2-s.x1), Math.abs(s.y2-s.y1));
  } else if (s.type === 'circle'){
    const r = Math.hypot(s.x2-s.x1, s.y2-s.y1);
    ctx.beginPath();
    ctx.arc(s.x1, s.y1, r, 0, Math.PI*2);
    ctx.stroke();
  } else if (s.type === 'line'){
    ctx.beginPath();
    ctx.moveTo(s.x1,s.y1);
    ctx.lineTo(s.x2,s.y2);
    ctx.stroke();
  } else if (s.type === 'arrow'){
    drawArrow(s.x1,s.y1,s.x2,s.y2);
  } else if (s.type === 'text'){
    ctx.font = `600 ${s.size||22}px -apple-system, sans-serif`;
    ctx.fillText(s.text, s.x1, s.y1);
  }

  if (isSelected){
    ctx.save();
    ctx.strokeStyle = '#e0654a';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5,4]);
    const bbox = getBBox(s);
    ctx.strokeRect(bbox.x-6, bbox.y-6, bbox.w+12, bbox.h+12);
    ctx.restore();
  }
}

function getBBox(s){
  if (s.type === 'circle'){
    const r = Math.hypot(s.x2-s.x1, s.y2-s.y1);
    return { x:s.x1-r, y:s.y1-r, w:r*2, h:r*2 };
  }
  if (s.type === 'text'){
    ctx.font = `600 ${s.size||22}px -apple-system, sans-serif`;
    const w = ctx.measureText(s.text).width;
    return { x:s.x1, y:s.y1-(s.size||22), w, h:(s.size||22) };
  }
  const x = Math.min(s.x1,s.x2), y = Math.min(s.y1,s.y2);
  return { x, y, w:Math.abs(s.x2-s.x1), h:Math.abs(s.y2-s.y1) };
}

function drawArrow(x1,y1,x2,y2){
  const headlen = 14;
  const angle = Math.atan2(y2-y1, x2-x1);
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2,y2);
  ctx.lineTo(x2-headlen*Math.cos(angle-Math.PI/6), y2-headlen*Math.sin(angle-Math.PI/6));
  ctx.lineTo(x2-headlen*Math.cos(angle+Math.PI/6), y2-headlen*Math.sin(angle+Math.PI/6));
  ctx.closePath();
  ctx.fill();
}

function drawPreview(tool, x1,y1,x2,y2){
  ctx.save();
  ctx.strokeStyle = currentColor;
  ctx.fillStyle = currentColor;
  ctx.lineWidth = 3;
  ctx.setLineDash([6,4]);
  if (tool === 'rect') ctx.strokeRect(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1));
  else if (tool === 'circle'){
    const r = Math.hypot(x2-x1,y2-y1);
    ctx.beginPath(); ctx.arc(x1,y1,r,0,Math.PI*2); ctx.stroke();
  } else if (tool === 'line'){
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  } else if (tool === 'arrow'){
    ctx.setLineDash([]);
    drawArrow(x1,y1,x2,y2);
  }
  ctx.restore();
}

// ---- Événements pointeur (souris + tactile) ----
canvas.addEventListener('mousedown', onPointerDown);
canvas.addEventListener('mousemove', onPointerMove);
canvas.addEventListener('mouseup', onPointerUp);
canvas.addEventListener('touchstart', onPointerDown, {passive:false});
canvas.addEventListener('touchmove', onPointerMove, {passive:false});
canvas.addEventListener('touchend', onPointerUp, {passive:false});

// ---- Export / sauvegarde ----
function exportImage(){
  const link = document.createElement('a');
  link.download = `schema-${(fpsTitre||'fps').replace(/[^a-z0-9]+/gi,'-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function scheduleSave(){
  setStatus('…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveSchema, 800);
}

function saveSchema(){
  if (!fpsId){
    setStatus('Sans FPS liée');
    return;
  }
  setStatus('Enregistrement…');
  const dataUrl = canvas.toDataURL('image/png');
  ROOT.child('fps/' + fpsId).once('value', (snap) => {
    const data = snap.val() || {};
    const files = data.files || [];
    const existingIdx = files.findIndex(f => f.schemaRef === true);
    const fileEntry = {
      name: 'schema.png',
      type: 'image/png',
      url: dataUrl,
      schemaRef: true
    };
    if (existingIdx >= 0) files[existingIdx] = fileEntry;
    else files.push(fileEntry);

    ROOT.child('fps/' + fpsId).update({ files, schemaShapes: shapes, updatedAt: Date.now() }, (err) => {
      setStatus(err ? 'Erreur' : 'Enregistré');
    });
  });
}

// ---- Chargement ----
function loadSchema(){
  if (!fpsId) return;
  ROOT.child('fps/' + fpsId).once('value', (snap) => {
    const data = snap.val();
    if (!data) return;
    fpsTitre = data.titre || '';
    document.getElementById('pageTitle').textContent = 'Schéma — ' + fpsTitre;
    shapes = data.schemaShapes || [];
    redraw();
  });
}

loadSchema();
