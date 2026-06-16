const EMOJIS = ['🍎', '🚀', '🐱', '🌵', '🎲', '🎧', '⚽', '🍕', '🐸', '⭐', '🍩', '🦊', '🎮', '🌙', '💎', '🔥'];
const NIVELES = [
  { id: 1, nombre: 'Facil', icono: '◆', pares: 8 },
  { id: 2, nombre: 'Medio', icono: '▲', pares: 12 },
  { id: 3, nombre: 'Dificil', icono: '★', pares: 16 }
];

const state = {
  cartas: [],
  volteadas: [],
  movimientos: 0,
  nombre: '',
  bloqueado: false,
  paresEncontrados: 0,
  nivel: NIVELES[0]
};

const tablero = document.getElementById('tablero');
const niveles = document.getElementById('niveles');
const inputNombre = document.getElementById('nombre');
const botonIniciar = document.getElementById('iniciar');
const botonReiniciar = document.getElementById('reiniciar');
const contadorNivel = document.getElementById('nivel');
const contadorMovimientos = document.getElementById('movimientos');
const contadorPares = document.getElementById('pares');
const mensaje = document.getElementById('mensaje');

botonIniciar.addEventListener('click', iniciarJuego);
botonReiniciar.addEventListener('click', iniciarJuego);
inputNombre.addEventListener('change', actualizarNombre);
// FIX: delegación de eventos; no se crea un listener por cada carta en cada render.
tablero.addEventListener('click', manejarClickTablero);
niveles.addEventListener('click', manejarCambioNivel);
document.addEventListener('keydown', manejarTeclado);

renderNiveles();
iniciarJuego();

function iniciarJuego() {
  state.cartas = crearMazo();
  state.volteadas = [];
  state.movimientos = 0;
  state.nombre = inputNombre.value.trim() || 'jugador';
  state.bloqueado = false;
  state.paresEncontrados = 0;
  mensaje.textContent = '';
  render();
}

function crearMazo() {
  const mazo = [];
  const emojisDelNivel = EMOJIS.slice(0, state.nivel.pares);

  emojisDelNivel.forEach(function (emoji) {
    mazo.push({ emoji: emoji, encontrada: false });
    mazo.push({ emoji: emoji, encontrada: false });
  });

  return barajar(mazo);
}

function barajar(mazo) {
  const copia = mazo.slice();

  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temporal = copia[i];
    copia[i] = copia[j];
    copia[j] = temporal;
  }

  return copia;
}

function render() {
  const fragmento = document.createDocumentFragment();

  tablero.dataset.nivel = String(state.nivel.id);

  state.cartas.forEach(function (carta, indice) {
    const boton = document.createElement('button');
    const estaVolteada = state.volteadas.includes(indice);
    const visible = carta.encontrada || estaVolteada;

    boton.type = 'button';
    boton.className = 'card';
    boton.dataset.indice = indice;
    boton.setAttribute('aria-label', visible ? 'Carta revelada' : 'Carta oculta');
    boton.textContent = visible ? carta.emoji : '?';

    if (visible) {
      boton.classList.add('volteada');
    }

    if (carta.encontrada) {
      boton.classList.add('encontrada');
    }

    fragmento.appendChild(boton);
  });

  tablero.replaceChildren(fragmento);
  contadorNivel.textContent = String(state.nivel.id);
  contadorMovimientos.textContent = String(state.movimientos);
  contadorPares.textContent = state.paresEncontrados + '/' + state.nivel.pares;
  actualizarBotonesNivel();
}

function renderNiveles() {
  const fragmento = document.createDocumentFragment();

  NIVELES.forEach(function (nivel) {
    const boton = document.createElement('button');

    boton.type = 'button';
    boton.className = 'level-btn';
    boton.dataset.nivel = String(nivel.id);
    boton.textContent = nivel.icono + ' ' + nivel.nombre;

    fragmento.appendChild(boton);
  });

  niveles.replaceChildren(fragmento);
}

function manejarClickTablero(event) {
  const carta = event.target.closest('.card');

  if (!carta || !tablero.contains(carta)) {
    return;
  }

  voltearCarta(Number(carta.dataset.indice));
}

function manejarTeclado(event) {
  if (event.key.toLowerCase() === 'r') {
    iniciarJuego();
  }
}

function manejarCambioNivel(event) {
  const boton = event.target.closest('.level-btn');

  if (!boton || !niveles.contains(boton)) {
    return;
  }

  const nivelElegido = NIVELES.find(function (nivel) {
    return nivel.id === Number(boton.dataset.nivel);
  });

  if (!nivelElegido || nivelElegido.id === state.nivel.id) {
    return;
  }

  state.nivel = nivelElegido;
  iniciarJuego();
}

function actualizarBotonesNivel() {
  niveles.querySelectorAll('.level-btn').forEach(function (boton) {
    const activo = Number(boton.dataset.nivel) === state.nivel.id;
    boton.classList.toggle('active', activo);
    boton.setAttribute('aria-pressed', String(activo));
  });
}

function actualizarNombre() {
  state.nombre = inputNombre.value.trim() || 'jugador';
}

function voltearCarta(indice) {
  const carta = state.cartas[indice];

  // BUG: el código auditado permitía una tercera carta durante el setTimeout.
  // FIX: el bloqueo vive en el estado y corta nuevos clicks hasta resolver el turno.
  if (state.bloqueado || !carta || carta.encontrada) {
    return;
  }

  // BUG: un doble click sobre la misma carta podía formar pareja consigo misma.
  // FIX: si el índice ya está volteado, el click se ignora.
  if (state.volteadas.includes(indice)) {
    return;
  }

  state.volteadas.push(indice);
  render();

  if (state.volteadas.length === 2) {
    resolverTurno();
  }
}

function resolverTurno() {
  const a = state.volteadas[0];
  const b = state.volteadas[1];
  state.movimientos++;

  // BUG: antes se comparaba leyendo textContent del DOM.
  // FIX: la comparación usa state.cartas, la fuente única de verdad.
  if (state.cartas[a].emoji === state.cartas[b].emoji) {
    state.cartas[a].encontrada = true;
    state.cartas[b].encontrada = true;
    state.volteadas = [];
    state.paresEncontrados++;
    render();
    revisarVictoria();
    return;
  }

  state.bloqueado = true;
  render();

  setTimeout(function () {
    state.volteadas = [];
    state.bloqueado = false;
    render();
  }, 800);
}

function revisarVictoria() {
  if (!state.cartas.every(function (carta) { return carta.encontrada; })) {
    return;
  }

  // BUG: innerHTML con el nombre del jugador permite inyectar HTML o scripts.
  // FIX: textContent muestra el nombre como texto seguro.
  mensaje.textContent = 'Ganaste, ' + state.nombre + '!';
}
