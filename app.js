const NIVELES = [
  { id: 1, nombre: 'Facil', icono: '◆', pares: 8 },
  { id: 2, nombre: 'Medio', icono: '▲', pares: 12 },
  { id: 3, nombre: 'Dificil', icono: '★', pares: 16 }
];
const STORAGE_KEY = 'juego-memoria-partida';
const HISTORY_KEY = 'juego-memoria-historial';
const AUDIO_SRC = 'cancion_juego.mp3';
const ICONOS = crearIconos(Math.max.apply(null, NIVELES.map(function (nivel) {
  return nivel.pares;
})));
const musica = new Audio(AUDIO_SRC);

musica.loop = true;
musica.volume = 0.35;

const state = {
  cartas: [],
  volteadas: [],
  movimientos: 0,
  nombre: '',
  bloqueado: false,
  paresEncontrados: 0,
  iniciado: false,
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
const historial = document.getElementById('historial');

botonIniciar.addEventListener('click', iniciarJuego);
botonReiniciar.addEventListener('click', iniciarJuego);
inputNombre.addEventListener('change', actualizarNombre);
// FIX: delegación de eventos; no se crea un listener por cada carta en cada render.
tablero.addEventListener('click', manejarClickTablero);
niveles.addEventListener('click', manejarCambioNivel);
document.addEventListener('keydown', manejarTeclado);

renderNiveles();
renderHistorial();

if (!cargarPartida()) {
  render();
  mensaje.textContent = 'Escribe tu nombre y presiona Start';
}

function iniciarJuego() {
  const nombre = inputNombre.value.trim();

  if (!nombre) {
    state.iniciado = false;
    mensaje.textContent = 'Escribe tu nombre para iniciar';
    inputNombre.focus();
    return;
  }

  state.cartas = crearMazo();
  state.volteadas = [];
  state.movimientos = 0;
  state.nombre = nombre;
  state.bloqueado = false;
  state.paresEncontrados = 0;
  state.iniciado = true;
  mensaje.textContent = '';
  render();
  guardarPartida();
  iniciarMusica();
}

function crearMazo() {
  const mazo = [];
  const iconosDelNivel = ICONOS.slice(0, state.nivel.pares);

  iconosDelNivel.forEach(function (icono) {
    mazo.push({ id: icono.id, src: icono.src, encontrada: false });
    mazo.push({ id: icono.id, src: icono.src, encontrada: false });
  });

  return barajar(mazo);
}

function crearIconos(total) {
  const iconos = [];

  for (let i = 1; i <= total; i++) {
    iconos.push({
      id: i,
      src: 'iconos/' + i + '.svg'
    });
  }

  return iconos;
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

    if (visible) {
      boton.appendChild(crearImagenCarta(carta));
    } else {
      boton.textContent = '?';
    }

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

function crearImagenCarta(carta) {
  const imagen = document.createElement('img');

  imagen.className = 'card-icon';
  imagen.src = carta.src;
  imagen.alt = 'Icono de pareja ' + carta.id;
  imagen.draggable = false;

  return imagen;
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
  if (!state.iniciado) {
    mensaje.textContent = 'Presiona Start o Enter para iniciar';
    return;
  }

  const carta = event.target.closest('.card');

  if (!carta || !tablero.contains(carta)) {
    return;
  }

  voltearCarta(Number(carta.dataset.indice));
}

function manejarTeclado(event) {
  if (event.key === 'Enter') {
    iniciarJuego();
    return;
  }

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
  state.nombre = inputNombre.value.trim();
  guardarPartida();
}

function voltearCarta(indice) {
  const carta = state.cartas[indice];

  if (!state.iniciado) {
    return;
  }

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
  guardarPartida();

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
  if (state.cartas[a].id === state.cartas[b].id) {
    state.cartas[a].encontrada = true;
    state.cartas[b].encontrada = true;
    state.volteadas = [];
    state.paresEncontrados++;
    render();
    guardarPartida();
    revisarVictoria();
    return;
  }

  state.bloqueado = true;
  render();
  guardarPartida();

  setTimeout(function () {
    state.volteadas = [];
    state.bloqueado = false;
    render();
    guardarPartida();
  }, 800);
}

function revisarVictoria() {
  if (!state.cartas.every(function (carta) { return carta.encontrada; })) {
    return;
  }

  // BUG: innerHTML con el nombre del jugador permite inyectar HTML o scripts.
  // FIX: textContent muestra el nombre como texto seguro.
  mensaje.textContent = 'Ganaste, ' + state.nombre + '!';
  guardarResultado();
  localStorage.removeItem(STORAGE_KEY);
}

function guardarResultado() {
  const resultados = cargarHistorial();
  const resultado = {
    nombre: state.nombre,
    nivel: state.nivel.nombre,
    intentos: state.movimientos,
    fecha: new Date().toLocaleString('es-CL')
  };

  resultados.unshift(resultado);
  guardarHistorial(resultados);
  renderHistorial(resultados);
}

function renderHistorial(resultados) {
  const datos = Array.isArray(resultados) ? resultados : cargarHistorial();
  const fragmento = document.createDocumentFragment();

  datos.forEach(function (resultado) {
    const item = document.createElement('li');
    const nombre = document.createElement('strong');
    const detalle = document.createElement('span');
    const fecha = document.createElement('small');

    item.className = 'history-item';
    nombre.textContent = resultado.nombre;
    detalle.textContent = 'Nivel ' + resultado.nivel + ' · ' + resultado.intentos + ' intentos';
    fecha.textContent = resultado.fecha;

    item.appendChild(nombre);
    item.appendChild(detalle);
    item.appendChild(fecha);
    fragmento.appendChild(item);
  });

  if (datos.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'history-empty';
    vacio.textContent = 'Sin partidas ganadas';
    fragmento.appendChild(vacio);
  }

  historial.replaceChildren(fragmento);
}

function cargarHistorial() {
  const guardado = localStorage.getItem(HISTORY_KEY);

  if (!guardado) {
    return [];
  }

  try {
    const resultados = JSON.parse(guardado);

    if (!Array.isArray(resultados)) {
      localStorage.removeItem(HISTORY_KEY);
      return [];
    }

    return resultados.filter(esResultadoValido);
  } catch (error) {
    localStorage.removeItem(HISTORY_KEY);
    return [];
  }
}

function guardarHistorial(resultados) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(resultados));
}

function guardarPartida() {
  const partida = {
    cartas: state.cartas,
    volteadas: state.bloqueado ? [] : state.volteadas,
    movimientos: state.movimientos,
    nombre: state.nombre,
    paresEncontrados: state.paresEncontrados,
    iniciado: state.iniciado,
    nivelId: state.nivel.id
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(partida));
}

function cargarPartida() {
  const guardado = localStorage.getItem(STORAGE_KEY);

  if (!guardado) {
    return false;
  }

  try {
    const partida = JSON.parse(guardado);
    const nivel = NIVELES.find(function (item) {
      return item.id === partida.nivelId;
    });

    if (!nivel || !Array.isArray(partida.cartas) || !partida.cartas.every(esCartaValida)) {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }

    state.cartas = partida.cartas;
    state.volteadas = Array.isArray(partida.volteadas) ? partida.volteadas : [];
    state.movimientos = Number(partida.movimientos) || 0;
    state.nombre = typeof partida.nombre === 'string' ? partida.nombre : '';
    state.bloqueado = false;
    state.paresEncontrados = contarParesEncontrados(state.cartas);
    state.iniciado = partida.iniciado !== false;
    state.nivel = nivel;

    inputNombre.value = state.nombre;
    render();
    guardarPartida();
    return true;
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

function contarParesEncontrados(cartas) {
  return cartas.filter(function (carta) {
    return carta.encontrada;
  }).length / 2;
}

function iniciarMusica() {
  musica.currentTime = 0;
  musica.play().catch(function () {
    mensaje.textContent = 'Juego iniciado. Activa el audio si el navegador lo bloqueo.';
  });
}

function esCartaValida(carta) {
  return typeof carta.id === 'number' && typeof carta.src === 'string' && typeof carta.encontrada === 'boolean';
}

function esResultadoValido(resultado) {
  return typeof resultado.nombre === 'string' &&
    typeof resultado.nivel === 'string' &&
    typeof resultado.intentos === 'number' &&
    typeof resultado.fecha === 'string';
}
