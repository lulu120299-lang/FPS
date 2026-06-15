// ---- Bibliothèque de terrains de sport ----
// Chaque terrain est défini par : un ratio largeur/hauteur "naturel",
// une fonction de dessin sur un contexte canvas dans un rectangle donné,
// et une miniature SVG pour le panneau de sélection.

const TERRAINS = {

  foot: {
    label: 'Football',
    ratio: 1.55, // L/H proche d'un terrain de foot
    draw(ctx, x, y, w, h){
      drawPitch(ctx, x, y, w, h, '#4f8f5b');
      // ligne médiane
      strokeRect(ctx, x, y, w, h);
      line(ctx, x+w/2, y, x+w/2, y+h);
      circle(ctx, x+w/2, y+h/2, h*0.14);
      dot(ctx, x+w/2, y+h/2);
      // surfaces de réparation
      const boxW = w*0.13, boxH = h*0.5;
      rect(ctx, x, y+(h-boxH)/2, boxW, boxH);
      rect(ctx, x+w-boxW, y+(h-boxH)/2, boxW, boxH);
      // petites surfaces
      const smallW = w*0.05, smallH = h*0.22;
      rect(ctx, x, y+(h-smallH)/2, smallW, smallH);
      rect(ctx, x+w-smallW, y+(h-smallH)/2, smallW, smallH);
      // points de penalty
      dot(ctx, x+boxW*0.78, y+h/2);
      dot(ctx, x+w-boxW*0.78, y+h/2);
    },
    thumb: `<svg viewBox="0 0 100 64"><rect width="100" height="64" rx="4" fill="#4f8f5b"/>
      <rect x="2" y="2" width="96" height="60" fill="none" stroke="#fff" stroke-width="1.5"/>
      <line x1="50" y1="2" x2="50" y2="62" stroke="#fff" stroke-width="1.5"/>
      <circle cx="50" cy="32" r="9" fill="none" stroke="#fff" stroke-width="1.5"/>
      <rect x="2" y="14" width="13" height="36" fill="none" stroke="#fff" stroke-width="1.5"/>
      <rect x="85" y="14" width="13" height="36" fill="none" stroke="#fff" stroke-width="1.5"/></svg>`
  },

  basket: {
    label: 'Basketball',
    ratio: 1.87, // 28m x 15m
    draw(ctx, x, y, w, h){
      drawPitch(ctx, x, y, w, h, '#c98a4b');
      strokeRect(ctx, x, y, w, h);
      line(ctx, x+w/2, y, x+w/2, y+h);
      circle(ctx, x+w/2, y+h/2, h*0.18);
      // raquettes (zones restrictives) + cercles de lancer-franc
      const keyW = w*0.16, keyH = h*0.45;
      rect(ctx, x, y+(h-keyH)/2, keyW, keyH);
      rect(ctx, x+w-keyW, y+(h-keyH)/2, keyW, keyH);
      arcHalf(ctx, x+keyW, y+h/2, h*0.18, 'right');
      arcHalf(ctx, x+w-keyW, y+h/2, h*0.18, 'left');
      // cercles restrictifs sous le panier
      arcHalf(ctx, x+w*0.04, y+h/2, h*0.10, 'right');
      arcHalf(ctx, x+w-w*0.04, y+h/2, h*0.10, 'left');
      // ligne à 3 points (arc)
      threePointArc(ctx, x, y, w, h, true);
      threePointArc(ctx, x, y, w, h, false);
    },
    thumb: `<svg viewBox="0 0 100 53"><rect width="100" height="53" rx="4" fill="#c98a4b"/>
      <rect x="2" y="2" width="96" height="49" fill="none" stroke="#fff" stroke-width="1.5"/>
      <line x1="50" y1="2" x2="50" y2="51" stroke="#fff" stroke-width="1.5"/>
      <circle cx="50" cy="26.5" r="8" fill="none" stroke="#fff" stroke-width="1.5"/>
      <rect x="2" y="12" width="14" height="29" fill="none" stroke="#fff" stroke-width="1.5"/>
      <rect x="84" y="12" width="14" height="29" fill="none" stroke="#fff" stroke-width="1.5"/>
      <path d="M2,4 A46,46 0 0 1 2,49" fill="none" stroke="#fff" stroke-width="1.5"/>
      <path d="M98,4 A46,46 0 0 0 98,49" fill="none" stroke="#fff" stroke-width="1.5"/></svg>`
  },

  hand: {
    label: 'Handball',
    ratio: 2.0, // 40m x 20m
    draw(ctx, x, y, w, h){
      drawPitch(ctx, x, y, w, h, '#3f7fb0');
      strokeRect(ctx, x, y, w, h);
      line(ctx, x+w/2, y, x+w/2, y+h);
      circle(ctx, x+w/2, y+h/2, h*0.06);
      // zones de but (demi-cercles 6m)
      goalArea(ctx, x, y, w, h, true);
      goalArea(ctx, x, y, w, h, false);
      // ligne de jet franc (9m) en tirets
      goalArea(ctx, x, y, w, h, true, true);
      goalArea(ctx, x, y, w, h, false, true);
      // but
      goalMouth(ctx, x, y, h, true);
      goalMouth(ctx, x+w, y, h, false);
    },
    thumb: `<svg viewBox="0 0 100 50"><rect width="100" height="50" rx="4" fill="#3f7fb0"/>
      <rect x="2" y="2" width="96" height="46" fill="none" stroke="#fff" stroke-width="1.5"/>
      <line x1="50" y1="2" x2="50" y2="48" stroke="#fff" stroke-width="1.5"/>
      <path d="M2,8 A22,22 0 0 1 2,42" fill="none" stroke="#fff" stroke-width="1.5"/>
      <path d="M98,8 A22,22 0 0 0 98,42" fill="none" stroke="#fff" stroke-width="1.5"/>
      <path d="M2,2 A30,30 0 0 1 2,48" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="2,2"/>
      <path d="M98,2 A30,30 0 0 0 98,48" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="2,2"/></svg>`
  },

  badminton: {
    label: 'Badminton',
    ratio: 0.91, // 13.4m x 6.1m (double) -> en orientation portrait court simple proportion
    draw(ctx, x, y, w, h){
      drawPitch(ctx, x, y, w, h, '#7a5fb0');
      strokeRect(ctx, x, y, w, h);
      // filet
      line(ctx, x, y+h/2, x+w, y+h/2);
      // lignes de service (à 1/4 de chaque côté du filet, approx)
      line(ctx, x, y+h*0.36, x+w, y+h*0.36);
      line(ctx, x, y+h*0.64, x+w, y+h*0.64);
      // couloirs simples
      const margin = w*0.07;
      line(ctx, x+margin, y, x+margin, y+h);
      line(ctx, x+w-margin, y, x+w-margin, y+h);
      // ligne médiane verticale (service)
      line(ctx, x+w/2, y, x+w/2, y+h*0.36);
      line(ctx, x+w/2, y+h*0.64, x+w/2, y+h);
    },
    thumb: `<svg viewBox="0 0 64 100"><rect width="64" height="100" rx="4" fill="#7a5fb0"/>
      <rect x="2" y="2" width="60" height="96" fill="none" stroke="#fff" stroke-width="1.5"/>
      <line x1="2" y1="50" x2="62" y2="50" stroke="#fff" stroke-width="2"/>
      <line x1="2" y1="36" x2="62" y2="36" stroke="#fff" stroke-width="1.5"/>
      <line x1="2" y1="64" x2="62" y2="64" stroke="#fff" stroke-width="1.5"/>
      <line x1="6" y1="2" x2="6" y2="98" stroke="#fff" stroke-width="1.5"/>
      <line x1="58" y1="2" x2="58" y2="98" stroke="#fff" stroke-width="1.5"/>
      <line x1="32" y1="2" x2="32" y2="36" stroke="#fff" stroke-width="1.5"/>
      <line x1="32" y1="64" x2="32" y2="98" stroke="#fff" stroke-width="1.5"/></svg>`
  },

  volley: {
    label: 'Volleyball',
    ratio: 2.0, // 18m x 9m
    draw(ctx, x, y, w, h){
      drawPitch(ctx, x, y, w, h, '#d0a23a');
      strokeRect(ctx, x, y, w, h);
      // filet
      line(ctx, x+w/2, y, x+w/2, y+h);
      // lignes d'attaque à 3m du filet
      const att = w*0.166;
      line(ctx, x+w/2-att, y, x+w/2-att, y+h);
      line(ctx, x+w/2+att, y, x+w/2+att, y+h);
    },
    thumb: `<svg viewBox="0 0 100 50"><rect width="100" height="50" rx="4" fill="#d0a23a"/>
      <rect x="2" y="2" width="96" height="46" fill="none" stroke="#fff" stroke-width="1.5"/>
      <line x1="50" y1="2" x2="50" y2="48" stroke="#fff" stroke-width="2"/>
      <line x1="34" y1="2" x2="34" y2="48" stroke="#fff" stroke-width="1.5"/>
      <line x1="66" y1="2" x2="66" y2="48" stroke="#fff" stroke-width="1.5"/></svg>`
  },

  tennis: {
    label: 'Tennis',
    ratio: 0.93, // 23.77m x 8.23m simple, en portrait
    draw(ctx, x, y, w, h){
      drawPitch(ctx, x, y, w, h, '#2f7d5a');
      strokeRect(ctx, x, y, w, h);
      // filet
      line(ctx, x, y+h/2, x+w, y+h/2);
      // couloirs de simple
      const margin = w*0.08;
      line(ctx, x+margin, y, x+margin, y+h);
      line(ctx, x+w-margin, y, x+w-margin, y+h);
      // lignes de service
      line(ctx, x+margin, y+h*0.28, x+w-margin, y+h*0.28);
      line(ctx, x+margin, y+h*0.72, x+w-margin, y+h*0.72);
      // ligne médiane de service
      line(ctx, x+w/2, y+h*0.28, x+w/2, y+h*0.72);
    },
    thumb: `<svg viewBox="0 0 64 100"><rect width="64" height="100" rx="4" fill="#2f7d5a"/>
      <rect x="2" y="2" width="60" height="96" fill="none" stroke="#fff" stroke-width="1.5"/>
      <line x1="2" y1="50" x2="62" y2="50" stroke="#fff" stroke-width="2"/>
      <line x1="8" y1="2" x2="8" y2="98" stroke="#fff" stroke-width="1.5"/>
      <line x1="56" y1="2" x2="56" y2="98" stroke="#fff" stroke-width="1.5"/>
      <line x1="8" y1="28" x2="56" y2="28" stroke="#fff" stroke-width="1.5"/>
      <line x1="8" y1="72" x2="56" y2="72" stroke="#fff" stroke-width="1.5"/>
      <line x1="32" y1="28" x2="32" y2="72" stroke="#fff" stroke-width="1.5"/></svg>`
  }
};

// ---- Primitives de dessin ----
function drawPitch(ctx, x, y, w, h, color){
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function strokeRect(ctx, x, y, w, h){
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(2, w*0.004);
  ctx.strokeRect(x, y, w, h);
}
function line(ctx, x1, y1, x2, y2){
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1.5, (x2-x1 || y2-y1) === 0 ? 2 : 2);
  ctx.stroke();
}
function rect(ctx, x, y, w, h){
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}
function circle(ctx, cx, cy, r){
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
}
function dot(ctx, cx, cy){
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI*2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}
function arcHalf(ctx, cx, cy, r, side){
  ctx.beginPath();
  if (side === 'right') ctx.arc(cx, cy, r, -Math.PI/2, Math.PI/2);
  else ctx.arc(cx, cy, r, Math.PI/2, Math.PI*1.5);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
}
function threePointArc(ctx, x, y, w, h, leftSide){
  const r = h*0.42;
  ctx.beginPath();
  if (leftSide) ctx.arc(x+w*0.04, y+h/2, r, -Math.PI*0.42, Math.PI*0.42);
  else ctx.arc(x+w-w*0.04, y+h/2, r, Math.PI - Math.PI*0.42, Math.PI + Math.PI*0.42);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
}
function goalArea(ctx, x, y, w, h, leftSide, dashed){
  const r = dashed ? h*0.34 : h*0.22;
  ctx.save();
  if (dashed) ctx.setLineDash([4,4]);
  ctx.beginPath();
  if (leftSide) ctx.arc(x, y+h/2, r, -Math.PI/2, Math.PI/2);
  else ctx.arc(x+w, y+h/2, r, Math.PI/2, Math.PI*1.5);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
function goalMouth(ctx, x, y, h, leftSide){
  const gw = h*0.14, off = leftSide ? 6 : -6;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(leftSide ? x : x+off, y+h/2-gw/2, Math.abs(off), gw);
}
