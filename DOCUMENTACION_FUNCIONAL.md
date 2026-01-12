# Documentacion Funcional - Zarpeo

Sistema de preparacion para el examen PER (Patron de Embarcaciones de Recreo).

---

## Navegacion Principal

La aplicacion tiene 4 secciones principales accesibles desde el menu de navegacion unificado:

| Tab | Pagina | Descripcion |
|-----|--------|-------------|
| Principal | `exam-system.html` | Dashboard con accesos directos |
| Banco | `visor-nueva-arquitectura.html` | Banco de preguntas con filtros |
| Estadisticas | `statistics-dashboard.html` | Progreso, analisis y bookmarks |
| Estudio | `study-config.html` | Configuracion de tests personalizados |

---

## 1. Principal (Dashboard)

**Archivo:** `exam-system.html`

### 1.1 Informacion del Usuario
- **Bienvenida**: Muestra nombre del usuario logueado
- **Boton Salir**: Cierra sesion y redirige al login

### 1.2 Tarjetas de Accion

| Tarjeta | ID | Accion | Descripcion |
|---------|-----|--------|-------------|
| Estudio | `studyModeBtn` | Navega a `study-config.html` | Practica seleccionando UTs especificas y modo de estudio |
| Nuevo Examen | `startExamBtn` | Inicia examen completo | Examen de 45 preguntas con 90 minutos |
| Estadisticas | `viewStatsBtn` | Navega a `statistics-dashboard.html` | Tu progreso, analisis por temas y preguntas marcadas |
| Banco de Preguntas | `viewQuestionsBankBtn` | Navega a `visor-nueva-arquitectura.html` | Acceder al visor de preguntas |
| Panel Admin | `adminPanelBtn` | Navega a `admin-panel.html` | Solo visible para administradores |

### 1.3 Interfaz de Examen (dentro de la misma pagina)

Cuando se inicia un examen, la vista cambia a:

#### Header del Examen
- **Numero de pregunta**: "Pregunta X"
- **Categoria**: "UTX - Categoria"
- **Timer**: Cuenta regresiva de 90:00

#### Barra de Progreso
- Barra visual del progreso
- Texto: "Pregunta X de 45"

#### Tarjeta de Pregunta
- **Texto de la pregunta**
- **Opciones A, B, C, D** (seleccionables)

#### Navegacion del Examen
| Boton | ID | Funcion |
|-------|-----|---------|
| Cancelar Examen | `cancelExamBtn` | Abandona el examen |
| Anterior | `prevBtn` | Pregunta anterior |
| Siguiente | `nextBtn` | Siguiente pregunta |
| Finalizar | `finishBtn` | Termina y muestra resultados |

### 1.4 Resultados del Examen
- **Icono de resultado**: Check verde (aprobado) o X roja (suspendido)
- **Puntuacion**: Porcentaje obtenido
- **Detalles**: Correctas, incorrectas, tiempo total

### 1.5 Pie de Pagina
- Version de la aplicacion
- Hash del commit
- Fecha de build
- Fecha de despliegue

---

## 2. Banco de Preguntas

**Archivo:** `visor-nueva-arquitectura.html`

### 2.1 Filtros Disponibles

| Filtro | ID | Tipo | Descripcion |
|--------|-----|------|-------------|
| Convocatoria | `filterConvocatoria` | Select | Filtra por fecha de examen (ej: 2024-06) |
| Titulacion | `filterTitulacion` | Select | Patron de Embarcaciones de Recreo |
| Numero de Test | `filterTest` | Select | Filtra por numero de test (1-4) |
| Tema/UT | `filterTema` | Select | Filtra por Unidad Tematica (UT1-UT11) |
| Con Duplicados | `filterDuplicados` | Checkbox | Incluir/excluir preguntas duplicadas |
| Incluir Anuladas | `filterAnuladas` | Checkbox | Mostrar preguntas anuladas |
| Busqueda | `searchInput` | Input texto | Busqueda por texto o ID de pregunta |

### 2.2 Botones de Accion

| Boton | ID | Funcion |
|-------|-----|---------|
| BUSCAR | `searchBtn` | Aplica filtros y busca |
| LIMPIAR | `clearFilters` | Resetea todos los filtros |
| OCULTAR/MOSTRAR RESPUESTAS | `toggleAnswers` | Alterna visibilidad de respuestas correctas |
| EXPLICACIONES AUTO | `autoExplain` | Genera explicaciones automaticas con IA |

### 2.3 Panel de Estadisticas

| Estadistica | ID | Descripcion |
|-------------|-----|-------------|
| Total Preguntas | `totalQuestions` | Numero total en la base de datos |
| Filtradas | `filteredQuestions` | Preguntas que coinciden con filtros |
| Examenes | `totalExams` | Numero total de examenes |

### 2.4 Visualizacion de Preguntas

Cada tarjeta de pregunta (`question-card`) muestra:

- **Badges superiores**:
  - Convocatoria
  - Test numero
  - UT (Unidad Tematica)
  - Badge "ANULADA" si corresponde

- **Contenido**:
  - ID de la pregunta
  - Texto de la pregunta
  - Imagen (si existe)
  - Opciones A, B, C, D
  - Respuesta correcta (resaltada en verde)

- **Acciones por pregunta**:
  - Ver/generar explicacion
  - Editar pregunta (admin)

### 2.5 Modal de Edicion de Pregunta

**ID:** `editModal`

#### Tabs del Modal:
1. **Contenido** (`tab-content`):
   - Texto de la pregunta
   - Opciones (editables, se pueden anadir/eliminar)

2. **Respuesta** (`tab-answer`):
   - Selector de respuesta correcta (A, B, C, D)
   - Checkbox "Pregunta anulada"

3. **Metadata** (`tab-metadata`):
   - Categoria
   - Subcategoria

#### Botones:
- Guardar cambios
- Cancelar

### 2.6 Modal de Explicacion

Muestra la explicacion generada por IA con:
- Texto de la pregunta original
- Opciones con respuesta correcta resaltada
- Explicacion en formato Markdown
- Contenido visual (imagen/SVG si existe)
- Metadata (fecha, modelo IA, ID)
- Botones: Editar explicacion, Regenerar

### 2.7 Paginacion

- Navegacion por paginas
- Muestra numero de resultados por pagina

---

## 3. Estadisticas

**Archivo:** `statistics-dashboard.html`

### 3.1 Header de Usuario

| Elemento | ID | Descripcion |
|----------|-----|-------------|
| Nivel | `userLevel` | Nivel del usuario (calculado por XP) |
| Racha | `streakIndicator` | Dias consecutivos de estudio |

### 3.2 Tabs Internas

La pagina tiene 3 tabs:

#### Tab 1: Mi Progreso (`tab-progress`)

**Tarjetas de KPI:**

| KPI | ID | Descripcion |
|-----|-----|-------------|
| Rendimiento Global | `overallScore` | Puntuacion promedio en examenes |
| Examenes Completados | `examsCompleted` | Total de examenes realizados |
| Tiempo de Estudio | `studyTime` | Horas totales estudiando |
| Areas de Mejora | `weakAreas` | UTs que requieren mas practica |

**Graficos:**

| Grafico | ID | Tipo | Descripcion |
|---------|-----|------|-------------|
| Evolucion | `evolutionChart` | Linea | Progreso a lo largo del tiempo |
| Dominio por Temas | `radarChart` | Radar | Nivel por cada UT |

**Secciones adicionales:**

| Seccion | ID | Descripcion |
|---------|-----|-------------|
| Progreso por UT | `topicMastery` | Barras de progreso por tema |
| Historial | `examHistoryContainer` | Lista de examenes realizados |
| Logros | `achievementsGrid` | Medallas desbloqueadas |
| Recomendaciones | `recommendationsList` | Sugerencias de estudio |

#### Tab 2: Analisis por Temas (`tab-topics`)

**Resumen:**
- Tarjetas con estadisticas globales por UT

**Grafico:**
- `attemptsChart`: Distribucion de intentos por UT

**Botones de Accion:**

| Boton | Destino | Descripcion |
|-------|---------|-------------|
| Ver Heatmap Visual | `question-heatmap.html` | Visualizacion de frecuencia |
| Resumen de Estudio | `study-summary.html` | Resumen detallado por UT |

**Tarjetas por UT:**
- Numero de preguntas
- Porcentaje de aciertos
- Top 5 preguntas mas falladas (con enlaces)

#### Tab 3: Preguntas Marcadas (`tab-bookmarks`)

| Elemento | ID | Descripcion |
|----------|-----|-------------|
| Contador | `bookmarkCount` | Numero de preguntas marcadas |
| Contenedor | `bookmarkedQuestionsContainer` | Lista de preguntas guardadas |

**Cada pregunta marcada muestra:**
- Texto de la pregunta
- UT correspondiente
- Boton para quitar de marcados
- Enlace para ver en el banco

---

## 4. Estudio (Configuracion)

**Archivo:** `study-config.html`

### 4.1 Seleccion de Unidades Tematicas

**Contenedor:** `ut-grid`

Grid de botones para seleccionar UTs:
- UT1: Nomenclatura nautica
- UT2: Elementos de amarre y fondeo
- UT3: Seguridad
- UT4: Legislacion
- UT5: Balizamiento
- UT6: RIPA (Reglamento)
- UT7: Maniobra
- UT8: Emergencias en la mar
- UT9: Meteorologia
- UT10: Teoria de navegacion
- UT11: Carta de navegacion

**Opcion especial:**
- `select-all-uts`: Seleccionar todas (examen completo - 45 preguntas)

### 4.2 Modos de Estudio

| Modo | ID | Icono | Descripcion |
|------|-----|-------|-------------|
| Aleatorio | `mode-random` | Dado | Preguntas aleatorias de las UTs seleccionadas |
| Falladas | `mode-failed` | X roja | Solo preguntas que has fallado antes |
| Nuevas | `mode-new` | Estrella | Solo preguntas que nunca has visto |

### 4.3 Mensajes de Estado

| Elemento | ID | Descripcion |
|----------|-----|-------------|
| Error | `error-message` | Muestra errores de validacion |
| Texto error | `error-text` | Contenido del mensaje |

### 4.4 Flujo de Generacion

1. Seleccionar una o mas UTs
2. Seleccionar modo de estudio
3. Click en "Comenzar Test"
4. Redirige a `exam-unified.html` con parametros

---

## 5. Examen Unificado

**Archivo:** `exam-unified.html`

### 5.1 Timer Fijo

| Elemento | ID | Descripcion |
|----------|-----|-------------|
| Valor | `timer-value` | Tiempo restante (90:00 para examen completo) |

### 5.2 Seccion de Carga

**ID:** `loading-section`
- Spinner de carga
- Mensaje "Generando Examen..."

### 5.3 Seccion de Examen

**ID:** `exam-section`

#### Header
- Titulo "Examen Nautico"
- Subtitulo "Zarpeo"

#### Progreso
| Elemento | ID | Descripcion |
|----------|-----|-------------|
| Texto | `progress-text` | "Pregunta X de Y - Respondidas: Z/Y" |
| Barra | `progress-bar` | Barra visual de progreso |

#### Pregunta
| Elemento | ID | Descripcion |
|----------|-----|-------------|
| Numero | `question-number` | "Pregunta X de Y" |
| Categoria | `question-category` | "UT X - Nombre" |
| Marcar | `bookmark-btn` | Guardar pregunta para revision |
| Texto | `question-text` | Enunciado de la pregunta |
| Respuestas | `answers-container` | Opciones A, B, C, D |

#### Navegacion
| Boton | ID | Funcion |
|-------|-----|---------|
| Cancelar | `cancel-btn` | Abandona el examen |
| Anterior | `prev-btn` | Pregunta anterior |
| Ver en Banco | `view-in-bank-btn` | Abre pregunta en banco (solo modo estudio) |
| Siguiente | `next-btn` | Siguiente pregunta |
| Finalizar | `finish-btn` | Termina el examen |

### 5.4 Atajos de Teclado

| Tecla | Accion |
|-------|--------|
| Flecha izquierda | Pregunta anterior |
| Flecha derecha | Siguiente pregunta |
| 1, A | Seleccionar opcion A |
| 2, B | Seleccionar opcion B |
| 3, C | Seleccionar opcion C |
| 4, D | Seleccionar opcion D |

### 5.5 Tipos de Examen

| Tipo | Preguntas | Tiempo | Origen |
|------|-----------|--------|--------|
| Examen Completo | 45 | 90 min | Desde "Nuevo Examen" |
| Modo Estudio | Variable | Sin limite | Desde "Estudio" |

---

## 6. Heatmap de Preguntas

**Archivo:** `question-heatmap.html`

### 6.1 Filtros

| Boton | Data-filter | Descripcion |
|-------|-------------|-------------|
| Todos | `all` | Examenes + Tests |
| Solo Examenes | `exams` | Solo examenes oficiales |
| Solo Tests | `tests` | Solo tests de practica |

### 6.2 Resumen de Estadisticas

**ID:** `statsSummary`
- Total de preguntas
- Preguntas nunca vistas
- Preguntas contestadas

### 6.3 Visualizacion Heatmap

**ID:** `heatmapContent`

Muestra un mapa de calor por UT donde:
- Color verde claro = pocas apariciones
- Color verde oscuro = muchas apariciones

### 6.4 Leyenda

Escala de colores de 0 a 5+ apariciones

---

## 7. Resumen de Estudio

**Archivo:** `study-summary.html`

### 7.1 Header

- Titulo "Resumen de Estudio por UT"
- Botones de accion:
  - Volver a Estadisticas
  - Exportar (PDF/CSV)

### 7.2 Filtros

| Filtro | Descripcion |
|--------|-------------|
| UT | Filtrar por Unidad Tematica |
| Estado | Todas/Acertadas/Falladas/Sin contestar |

### 7.3 Contenido por UT

Para cada UT muestra:
- Nombre de la UT
- Total de preguntas
- Porcentaje de aciertos
- Preguntas mas falladas
- Preguntas sin contestar

---

## 8. Funcionalidades Transversales

### 8.1 Sistema de Autenticacion

- Login con usuario/password
- Token JWT almacenado en localStorage
- Redireccion automatica si no autenticado

### 8.2 Sistema de Bookmarks

- Marcar preguntas durante examen/estudio
- Ver preguntas marcadas en Estadisticas > Tab 3
- Eliminar bookmark desde cualquier lugar

### 8.3 Tracker de Estadisticas

**Archivo:** `question-statistics-tracker.js`

Registra automaticamente:
- Preguntas vistas
- Respuestas dadas
- Aciertos/errores
- Tiempo por pregunta

### 8.4 Generacion de Explicaciones

- Usa GPT-5 para generar explicaciones
- Renderiza Markdown con marked.js
- Soporta imagenes y SVG

### 8.5 Indicador de Entorno

Todas las paginas muestran:
- "DESARROLLO" (verde) en local
- "PRODUCCION" (rojo) en produccion

### 8.6 Informacion de Version

Footer con:
- Version de la app
- Hash del commit
- Fecha de build
- Fecha de despliegue

---

## Archivos de Configuracion

| Archivo | Proposito |
|---------|-----------|
| `config.js` | URLs de API, configuracion de entorno |
| `feature-flags.js` | Activar/desactivar funcionalidades |
| `version.json` | Informacion de version y despliegue |

---

## APIs Utilizadas

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/auth/login` | POST | Autenticacion |
| `/api/examenes` | GET | Lista de examenes |
| `/api/preguntas-filtradas` | GET | Preguntas con filtros |
| `/api/explicaciones` | GET | Obtener explicaciones |
| `/api/explicaciones/{id}` | POST | Generar explicacion |
| `/api/questions/bookmarked` | GET | Preguntas marcadas |
| `/api/questions/{id}/bookmark` | POST/DELETE | Marcar/desmarcar |
| `/api/user/stats` | GET | Estadisticas del usuario |
| `/api/question-stats/by-ut` | GET | Estadisticas por UT |

---

*Documentacion generada: 2026-01-12*
*Version de Zarpeo documentada: 1.0.1+*
