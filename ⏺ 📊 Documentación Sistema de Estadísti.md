⏺ 📊 Documentación: Sistema de Estadísticas PER VISOR 2.0

  🎯 Funcionalidad del Sistema de Estadísticas

  Objetivo

  El sistema de estadísticas proporciona un dashboard gamificado que permite a los usuarios:
  - Seguir su progreso de aprendizaje
  - Identificar áreas débiles y fuertes
  - Visualizar su evolución a través del tiempo
  - Obtener logros y recompensas por su rendimiento

  Características Principales

  🏆 Sistema de Gamificación

  - Niveles y XP: Los usuarios ganan experiencia (XP) por completar exámenes
  - Logros: Sistema de achievements desbloqueables
  - Rachas: Seguimiento de días consecutivos de estudio
  - Progreso Visual: Barras de progreso y gráficos interactivos

  📈 Análisis de Rendimiento

  - Puntuación Global: Promedio de todos los exámenes
  - Rendimiento por Temas: Análisis detallado por UT (Unidades Temáticas)
  - Evolución Temporal: Gráficos de progreso en el tiempo
  - Identificación de Áreas Débiles: Topics con menor rendimiento

  📊 Visualizaciones

  - Dashboard Interactivo: Vista general con métricas clave
  - Gráfico de Evolución: Línea temporal del rendimiento
  - Radar de Temas: Comparación visual por categorías
  - Historial de Exámenes: Lista detallada de intentos

  ---
  🗄️ Modelo de Datos

  Arquitectura de Base de Datos

  El sistema utiliza PostgreSQL con las siguientes tablas principales:

  📋 Tabla: user_exams (Existente)

  user_exams
  ├── id (UUID, PK)
  ├── user_id (UUID, FK → users.id)
  ├── exam_type (VARCHAR)
  ├── started_at (TIMESTAMP)
  ├── completed_at (TIMESTAMP)
  ├── duration_minutes (INTEGER)
  ├── total_questions (INTEGER)
  ├── correct_answers (INTEGER)
  ├── score_percentage (DECIMAL)
  ├── status (VARCHAR) -- 'completed', 'in_progress', 'abandoned'
  ├── metadata (JSONB) -- Contiene ut_results por tema
  └── created_at (TIMESTAMP)

  📈 Tabla: user_statistics (Sistema de Estadísticas)

  user_statistics
  ├── id (SERIAL, PK)
  ├── user_id (UUID, FK → users.id)
  ├── level (INTEGER) -- Nivel del usuario (1, 2, 3...)
  ├── total_xp (INTEGER) -- Experiencia acumulada
  ├── exams_completed (INTEGER) -- Total de exámenes completados
  ├── total_questions_answered (INTEGER) -- Preguntas respondidas
  ├── correct_answers (INTEGER) -- Respuestas correctas
  ├── study_time_minutes (INTEGER) -- Tiempo total de estudio
  ├── daily_streak_count (INTEGER) -- Racha actual de días
  ├── longest_streak (INTEGER) -- Racha más larga
  ├── last_study_date (DATE) -- Última fecha de estudio
  ├── last_exam_date (TIMESTAMP) -- Último examen completado
  ├── created_at (TIMESTAMP)
  └── updated_at (TIMESTAMP)

  🏆 Tabla: user_achievements (Logros)

  user_achievements
  ├── id (SERIAL, PK)
  ├── user_id (UUID, FK → users.id)
  ├── achievement_id (VARCHAR) -- 'first_exam', 'week_streak', etc.
  ├── unlocked_at (TIMESTAMP) -- Cuándo se desbloqueó
  ├── xp_earned (INTEGER) -- XP ganado por este logro
  └── notification_seen (BOOLEAN) -- Si el usuario vio la notificación

  📊 Tabla: exam_topic_performance (Rendimiento por Tema)

  exam_topic_performance
  ├── id (SERIAL, PK)
  ├── exam_id (UUID, FK → user_exams.id)
  ├── category (VARCHAR) -- 'UT1', 'UT2', etc.
  ├── correct_answers (INTEGER)
  ├── total_questions (INTEGER)
  ├── percentage (DECIMAL)
  ├── time_spent_seconds (INTEGER)
  └── created_at (TIMESTAMP)

  🔍 Tabla: question_attempts (Intentos Individuales)

  question_attempts
  ├── id (SERIAL, PK)
  ├── exam_id (UUID, FK → user_exams.id)
  ├── question_id (VARCHAR)
  ├── user_answer (VARCHAR) -- 'A', 'B', 'C', 'D'
  ├── correct_answer (VARCHAR)
  ├── is_correct (BOOLEAN)
  ├── time_spent_seconds (INTEGER)
  ├── category (VARCHAR) -- 'UT1', 'UT2', etc.
  ├── attempt_order (INTEGER)
  └── created_at (TIMESTAMP)

  ---
  🔌 API Endpoints

  Estadísticas del Usuario

  GET /api/user-stats

  Descripción: Obtiene las estadísticas completas del usuario autenticado
  Autenticación: JWT Token requerido
  Respuesta:
  {
    "level": 1,
    "xp": 100,
    "xp_to_next": 400,
    "exams_completed": 2,
    "total_questions": 90,
    "correct_answers": 63,
    "overall_score": 70.0,
    "study_time_hours": 1.6,
    "daily_streak": 1,
    "longest_streak": 1,
    "weak_topics": ["UT3", "UT7"],
    "strong_topics": ["UT1", "UT2"],
    "last_exam_date": "2025-09-16T16:21:45",
    "topic_progress": {
      "UT1": {
        "correct": 6,
        "total": 8,
        "percentage": 75.0,
        "trend": "stable"
      }
    },
    "exam_history": [
      {
        "date": "2025-09-16",
        "score": 71,
        "time_minutes": 39
      }
    ]
  }

  POST /api/statistics/exam-completed

  Descripción: Registra un examen completado y actualiza estadísticas
  Autenticación: JWT Token requerido
  Body:
  {
    "score": 75,
    "time_minutes": 45,
    "topic_results": {
      "UT1": {"correct": 4, "total": 5, "percentage": 80},
      "UT2": {"correct": 3, "total": 4, "percentage": 75}
    },
    "question_attempts": [
      {
        "question_id": "abc123",
        "user_answer": "A",
        "correct_answer": "A",
        "is_correct": true,
        "category": "UT1"
      }
    ],
    "passed": true,
    "total_questions": 45,
    "questions_answered": 45
  }

  ---
  🔄 Flujo de Datos

  1. Completar Examen

  Usuario completa examen
      ↓
  exam-system.js llama saveExamStatistics()
      ↓
  POST /api/statistics/exam-completed
      ↓
  Se actualiza user_statistics
      ↓
  Se crean registros en exam_topic_performance
      ↓
  Se crean registros en question_attempts
      ↓
  Se calculan nuevos logros
      ↓
  Respuesta con XP ganado y logros

  2. Ver Dashboard

  Usuario accede a statistics-dashboard.html
      ↓
  statistics-manager.js se inicializa
      ↓
  GET /api/user-stats
      ↓
  Se procesan los datos reales
      ↓
  Se renderizan gráficos con Chart.js
      ↓
  Dashboard muestra estadísticas actualizadas

  ---
  🎮 Sistema de Gamificación

  Cálculo de Niveles

  - Nivel 1: 0-499 XP
  - Nivel 2: 500-999 XP
  - Nivel 3: 1000-1499 XP
  - Fórmula: nivel = 1 + (xp_total // 500)

  Fuentes de XP

  - Examen completado: 50 XP base
  - Bonificación por puntuación: +10 XP si score > 80%
  - Logros desbloqueados: Variable según logro

  Tipos de Logros

  - first_exam: Primer examen completado
  - exam_master: 10 exámenes completados
  - perfectionist: Examen con 100% de aciertos
  - week_streak: 7 días consecutivos estudiando
  - navigation_expert: 90% en tema de navegación
  - night_owl: Examen completado después de las 22h

  ---
  📱 Frontend: Dashboard de Estadísticas

  Archivos Principales

  - statistics-dashboard.html: Interfaz HTML del dashboard
  - statistics-manager.js: Lógica JavaScript para cargar y procesar datos
  - Bootstrap 5 + Chart.js: Framework UI y gráficos

  Componentes del Dashboard

  1. Header con Level/XP: Muestra progreso del usuario
  2. Métricas Clave: Exámenes, puntuación, tiempo, racha
  3. Gráfico de Evolución: Línea temporal de puntuaciones
  4. Radar de Temas: Rendimiento por categorías
  5. Grid de Logros: Achievements desbloqueados
  6. Historial de Exámenes: Lista de intentos recientes

  Estados del Sistema

  - Usuario Nuevo: Datos en 0, mensaje motivacional
  - Usuario con Datos: Estadísticas reales calculadas
  - Error de API: Fallback a datos vacíos (no hardcodeados)
  - Sin Autenticación: Redirección automática al login

  ---
  ⚙️ Estado Actual del Sistema

  ✅ Implementado

  - Dashboard completo con datos reales
  - Endpoint /api/user-stats funcional
  - Cálculo automático desde user_exams
  - Eliminación de datos hardcodeados
  - Integración con sistema de autenticación

  🔄 En Desarrollo

  - Endpoint /api/statistics/exam-completed (existe pero puede fallar)
  - Actualización automática post-examen
  - Sistema completo de logros
  - Cálculo de áreas débiles más sofisticado

  📋 Pendiente

  - API Key válida para GPT-5
  - Notificaciones de logros en tiempo real
  - Estadísticas comparativas entre usuarios
  - Exportación de datos de progreso