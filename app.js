const NIVELES = [
  { id: 1, nombre: 'Fácil', icono: '◆', pares: 8 },
  { id: 2, nombre: 'Medio', icono: '▲', pares: 12 },
  { id: 3, nombre: 'Difícil', icono: '★', pares: 16 }
];
const STORAGE_KEY = 'juego-memoria-partida';
const HISTORY_KEY = 'juego-memoria-historial';
const AUDIO_KEY = 'juego-memoria-audio-muteado';
const RECURSOS_PATH = 'recursos/';
const AUDIO_SRC = RECURSOS_PATH + 'cancion_juego.mp3';
const ACTION_LABELS = {
  start: 'Iniciar',
  reset: 'Reiniciar'
};
const UI_ICONS = {
  play: RECURSOS_PATH + 'play.svg',
  mute: RECURSOS_PATH + 'mute.svg',
  egg: RECURSOS_PATH + 'huevo.svg'
};
const ICONOS = crearIconos(Math.max.apply(null, NIVELES.map(function (nivel) {
  return nivel.pares;
})));
const musica = new Audio(AUDIO_SRC);

musica.loop = true;
musica.volume = 0.35;

// El estado concentra toda la información de la partida; la interfaz se vuelve a dibujar desde aquí.
const state = {
  cartas: [],
  volteadas: [],
  movimientos: 0,
  nombre: '',
  bloqueado: false,
  paresEncontrados: 0,
  iniciado: false,
  audioMuteado: false,
  nivel: NIVELES[0]
};

const tablero = document.getElementById('tablero');
const niveles = document.getElementById('niveles');
const inputNombre = document.getElementById('nombre');
const botonIniciar = document.getElementById('iniciar');
const botonAudio = document.getElementById('audio-toggle');
const contadorNivel = document.getElementById('nivel');
const contadorMovimientos = document.getElementById('movimientos');
const contadorPares = document.getElementById('pares');
const mensaje = document.getElementById('mensaje');
const historial = document.getElementById('historial');
const botonHuevo = document.getElementById('easter-egg');
const mensajeHuevo = document.getElementById('egg-message');
let temporizadorHuevo = null;

botonIniciar.addEventListener('click', manejarAccionPrincipal);
botonAudio.addEventListener('click', alternarAudio);
botonHuevo.addEventListener('click', mostrarMensajeHuevo);
inputNombre.addEventListener('input', manejarCambioNombre);
// Un solo listener en el tablero detecta qué carta se presionó usando delegación de eventos.
tablero.addEventListener('click', manejarClickTablero);
niveles.addEventListener('click', manejarCambioNivel);
document.addEventListener('keydown', manejarTeclado);

cargarAudio();
renderBotonHuevo();
renderNiveles();
renderHistorial();

if (!cargarPartida()) {
  prepararTableroBloqueado('Escribe tu nombre y presiona Iniciar', true);
} else if (!state.iniciado) {
  prepararTableroBloqueado('Escribe tu nombre y presiona Iniciar', false);
  mensaje.textContent = 'Escribe tu nombre y presiona Iniciar';
}

function manejarAccionPrincipal() {
  if (state.iniciado) {
    reiniciarPartida();
    return;
  }

  iniciarJuego(true);
}

function iniciarJuego(reiniciarMusica) {
  const nombre = inputNombre.value.trim();

  if (!nombre) {
    state.iniciado = false;
    mensaje.textContent = 'Escribe tu nombre para iniciar';
    inputNombre.focus();
    return;
  }

  // Al iniciar o reiniciar se crea un mazo nuevo y se limpian los datos del turno anterior.
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
  iniciarMusica(reiniciarMusica);
}

function reiniciarPartida() {
  iniciarJuego(false);
}

function prepararTableroBloqueado(texto, regenerar) {
  if (regenerar || state.cartas.length === 0) {
    state.cartas = crearMazo();
  }

  state.volteadas = [];
  state.movimientos = 0;
  state.bloqueado = true;
  state.paresEncontrados = 0;
  state.iniciado = false;
  mensaje.textContent = texto;
  render();
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
      src: RECURSOS_PATH + i + '.svg'
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

  // render() traduce el estado actual en botones de cartas, contadores y controles visibles.
  tablero.dataset.nivel = String(state.nivel.id);
  tablero.classList.toggle('board-locked', !state.iniciado);

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
  actualizarBotonPrincipal();
  actualizarBotonAudio();
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

function crearIconoUI(src, alt) {
  const icono = document.createElement('img');

  icono.className = 'btn-icon';
  icono.src = src;
  icono.alt = alt;
  icono.draggable = false;

  return icono;
}

function renderBotonHuevo() {
  botonHuevo.replaceChildren(crearIconoUI(UI_ICONS.egg, 'Huevo secreto'));
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
    mensaje.textContent = 'Presiona Iniciar o Enter para comenzar';
    return;
  }

  // El click puede venir desde la imagen dentro del botón, por eso se busca la carta más cercana.
  const carta = event.target.closest('.card');

  if (!carta || !tablero.contains(carta)) {
    return;
  }

  voltearCarta(Number(carta.dataset.indice));
}

function manejarTeclado(event) {
  if (event.key === 'Enter') {
    if (!state.iniciado) {
      iniciarJuego(true);
    }
    return;
  }

  if (event.key.toLowerCase() === 'r' && state.iniciado) {
    reiniciarPartida();
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

  if (state.iniciado) {
    iniciarJuego(false);
  } else {
    prepararTableroBloqueado(inputNombre.value.trim() ? 'Presiona Iniciar para comenzar' : 'Escribe tu nombre para iniciar', true);
    guardarPartida();
  }
}

function actualizarBotonPrincipal() {
  const texto = document.createElement('span');

  texto.textContent = state.iniciado ? ACTION_LABELS.reset : ACTION_LABELS.start;

  if (state.iniciado) {
    botonIniciar.replaceChildren(texto);
  } else {
    botonIniciar.replaceChildren(crearIconoUI(UI_ICONS.play, 'Iniciar'), texto);
  }

  botonIniciar.classList.toggle('btn-reset', state.iniciado);
  botonIniciar.classList.toggle('btn-start', !state.iniciado);
  botonIniciar.setAttribute('aria-label', state.iniciado ? 'Reiniciar juego' : 'Iniciar juego');
}

function actualizarBotonAudio() {
  botonAudio.replaceChildren(crearIconoUI(UI_ICONS.mute, state.audioMuteado ? 'Activar musica' : 'Silenciar musica'));
  botonAudio.classList.toggle('audio-muted', state.audioMuteado);
  botonAudio.setAttribute('aria-label', state.audioMuteado ? 'Activar musica' : 'Silenciar musica');
}

function actualizarBotonesNivel() {
  niveles.querySelectorAll('.level-btn').forEach(function (boton) {
    const activo = Number(boton.dataset.nivel) === state.nivel.id;
    boton.classList.toggle('active', activo);
    boton.setAttribute('aria-pressed', String(activo));
  });
}

function manejarCambioNombre() {
  const nombre = inputNombre.value.trim();

  if (!state.iniciado && nombre === state.nombre) {
    return;
  }

  state.nombre = nombre;
  detenerMusica();
  localStorage.removeItem(STORAGE_KEY);
  prepararTableroBloqueado(nombre ? 'Presiona Iniciar para comenzar' : 'Escribe tu nombre para iniciar', true);
}

function voltearCarta(indice) {
  const carta = state.cartas[indice];

  if (!state.iniciado) {
    return;
  }

  // El bloqueo evita jugar otra carta mientras se resuelve una pareja incorrecta.
  if (state.bloqueado || !carta || carta.encontrada) {
    return;
  }

  // Si la carta ya está volteada en este turno, se ignora para no comparar una carta consigo misma.
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

  // La comparación se hace con los datos del estado, no leyendo texto desde el DOM.
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

  // Si no coinciden, se bloquea el tablero hasta que el timeout vuelva a ocultarlas.
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

  // textContent muestra el nombre como texto seguro y evita interpretar HTML del usuario.
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
    state.iniciado = Boolean(partida.iniciado && state.nombre);
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

function iniciarMusica(reiniciar) {
  musica.muted = state.audioMuteado;

  if (reiniciar) {
    musica.currentTime = 0;
  }

  musica.play().catch(function () {
    mensaje.textContent = 'Juego iniciado. Activa el audio si el navegador lo bloqueo.';
  });
}

function detenerMusica() {
  musica.pause();
  musica.currentTime = 0;
}

function alternarAudio() {
  state.audioMuteado = !state.audioMuteado;
  musica.muted = state.audioMuteado;
  guardarAudio();
  actualizarBotonAudio();
}

function cargarAudio() {
  state.audioMuteado = localStorage.getItem(AUDIO_KEY) === 'true';
  musica.muted = state.audioMuteado;
}

function guardarAudio() {
  localStorage.setItem(AUDIO_KEY, String(state.audioMuteado));
}

function mostrarMensajeHuevo() {
  mensajeHuevo.textContent = 'Felicidades, eres un curioso!';
  mensajeHuevo.classList.add('egg-message-visible');

  if (temporizadorHuevo) {
    clearTimeout(temporizadorHuevo);
  }

  temporizadorHuevo = setTimeout(function () {
    mensajeHuevo.classList.remove('egg-message-visible');
    mensajeHuevo.textContent = '';
  }, 3200);
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
