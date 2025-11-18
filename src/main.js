/* main.js — lógica do Ballistic Lab MVP
   - carrega um mapa (local file map.png em /assets)
   - captura dois cliques: base e alvo
   - converte pixels para metros com escala conhecida
   - calcula distância e azimute (0° = Norte, sentido horário)
   - desenha marcadores e linha no canvas
*/
//
// Provavelmente vou esquecer dos parametros de configuração, então deixo tudo junto aqui:


/* ----- CONFIGURAÇÃO ----- */
const CANVAS_ID = 'mapCanvas';
const MAP_SRC = 'assets/map.png'; // coloque a imagem do mapa aqui


// dimensão real do mapa em metros (4,0 km x 4,0 km), preciso ajustar depois para input do usuario
const MAP_METERS = { width: 4000, height: 4000 }; //modificar posteriormente para deixar o corno do usuario colocar as dimensoes

/*
  dimensões em pixels do canvas (devem bater com o arquivo HTML)
  OBS: o canvas pode ser redimensionado via CSS, mas as coordenadas de clique
  são relativas ao tamanho real do canvas (width/height atributos)... até onde testado rs
*/
const CANVAS_PX = { width: 783, height: 768 };

/* ----- ESTADO ----- */
let base = null;    // {x, y} em pixels
let target = null;  // {x, y} em pixels
let showGrid = false;

/* ----- ELEMENTOS DOM ----- */
const canvas = document.getElementById(CANVAS_ID);
const ctx = canvas.getContext('2d');

const basePxEl = document.getElementById('basePx');
const targetPxEl = document.getElementById('targetPx');
const distanceEl = document.getElementById('distance');
const azimuthEl = document.getElementById('azimuth');
const resetBtn = document.getElementById('resetBtn');
const showGridCheckbox = document.getElementById('showGrid');

/* ----- ESCALAS ----- */
// metros por pixel (cada eixo separado para preservar não-quadratura de pixels), necessario reavaliar posteriormente....
const metersPerPx = {
  x: MAP_METERS.width / CANVAS_PX.width,
  y: MAP_METERS.height / CANVAS_PX.height
};

/* ----- CARREGA O MAPA ----- */
const mapImg = new Image();
mapImg.src = MAP_SRC;
mapImg.onload = () => {
  draw();
};

/* ----- EVENTOS ----- */
canvas.addEventListener('click', (ev) => {
  const rect = canvas.getBoundingClientRect();
  // obter posição do clique relativa ao canvas (em px)
  const x = Math.round((ev.clientX - rect.left) * (canvas.width / rect.width));
  const y = Math.round((ev.clientY - rect.top) * (canvas.height / rect.height));

  if (!base) {
    base = { x, y };
    basePxEl.textContent = `${x}, ${y}`;
  } else if (!target) {
    target = { x, y };
    targetPxEl.textContent = `${x}, ${y}`;
    // quando temos base e alvo, calculamos e atualizamos a UI
    updateCalculations();
  } else {
    // já temos dois pontos — cliques subsequentes reiniciam o alvo (útil para testar)
    base = { ...target }; // faz o alvo virar base
    target = { x, y };
    basePxEl.textContent = `${base.x}, ${base.y}`;
    targetPxEl.textContent = `${target.x}, ${target.y}`;
    updateCalculations();
  }

  draw();
});

resetBtn.addEventListener('click', () => {
  base = null;
  target = null;
  basePxEl.textContent = '—';
  targetPxEl.textContent = '—';
  distanceEl.textContent = '—';
  azimuthEl.textContent = '—';
  draw();
});

showGridCheckbox.addEventListener('change', (ev) => {
  showGrid = ev.target.checked;
  draw();
});

/* ----- FUNÇÕES MATEMÁTICAS ----- */

/**
 * Converte um delta em pixels para metros
 * @param {number} dx_px diferença em px no eixo x (x2 - x1)
 * @param {number} dy_px diferença em px no eixo y (y2 - y1)
 * @returns {object} {dx_m, dy_m}
 */
function pxToMeters(dx_px, dy_px) {
  return {
    dx_m: dx_px * metersPerPx.x,
    dy_m: dy_px * metersPerPx.y
  };
}

/**
 * Calcula distância Euclidiana em metros
 */
function calcDistanceMeters(dx_m, dy_m) {
  return Math.hypot(dx_m, dy_m);
}

/**
 * Calcula azimute (degrees) a partir de base -> alvo.
 * Convenção: 0° = Norte, 90° = Leste, 180° = Sul, 270° = Oeste.
 * Observação: no canvas, y cresce para baixo, então o eixo norte é -y. ATT
 */
function calcAzimuthDeg(dx_m, dy_m) {
  // atan2 retorna ângulo relativo ao eixo x positivo (em rad).
  // Para obter ângulo a partir do Norte, sentido horário:
  //   angle_rad = atan2(dx, -dy)
  // porque PRECISAMOS o componente leste (dx) como "x" para atan2,
  // e -dy para transformar o eixo y para "norte positivo".
  const angleRad = Math.atan2(dx_m, -dy_m);
  let angleDeg = angleRad * (180 / Math.PI);
  // normalizar para 0..360
  if (angleDeg < 0) angleDeg += 360;
  return angleDeg;
}

/* ----- ATUALIZA CÁLCULOS NA UI ----- */
function updateCalculations() {
  if (!base || !target) return;

  const dx_px = target.x - base.x;
  const dy_px = target.y - base.y;

  const { dx_m, dy_m } = pxToMeters(dx_px, dy_px);
  const dist = calcDistanceMeters(dx_m, dy_m);
  const az = calcAzimuthDeg(dx_m, dy_m);

  // apresentação: arredondar para 1 casa
  distanceEl.textContent = dist.toFixed(1);
  azimuthEl.textContent = az.toFixed(1);
}

/* ----- DESENHO NO CANVAS ----- */
function drawGrid() {
  const stepPx = 100; // espaçamento visual da grade em pixels
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = stepPx; x < canvas.width; x += stepPx) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = stepPx; y < canvas.height; y += stepPx) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function draw() {
  // limpar
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // desenhar mapa (se carregado)
  if (mapImg.complete) {
    // desenha a imagem esticando/encaixando no canvas real (Revisar)
    ctx.drawImage(mapImg, 0, 0, canvas.width, canvas.height);
  } else {
    // retângulo fallback
    ctx.fillStyle = '#123';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (showGrid) drawGrid();

  // desenhar base e alvo e linha
  if (base) {
    drawMarker(base.x, base.y, 'B');
  }
  if (target) {
    drawMarker(target.x, target.y, 'T');
  }
  if (base && target) {
    drawLine(base, target);
  }
}

/* marcador circular com texto */
function drawMarker(x, y, label) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = 'rgba(6,182,212,0.95)';
  ctx.strokeStyle = '#001216';
  ctx.lineWidth = 2;
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#001216';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
  ctx.restore();
}

function drawLine(p1, p2) {
  ctx.save();
  ctx.beginPath();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // desenhar seta apontando para o alvo
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const arrowLen = 14;
  ctx.beginPath();
  ctx.moveTo(p2.x, p2.y);
  ctx.lineTo(p2.x - arrowLen * Math.cos(angle - Math.PI / 6), p2.y - arrowLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(p2.x - arrowLen * Math.cos(angle + Math.PI / 6), p2.y - arrowLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
  ctx.restore();
}

// desenhar inicialmente (caso imagem carregue sincronamente)
draw();
