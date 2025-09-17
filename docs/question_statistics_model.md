# 📊 Modelo de Datos - Estadísticas Detalladas de Preguntas

## 🎯 Objetivo
Sistema completo para rastrear estadísticas detalladas de cada pregunta individual:
- Cuántas veces ha salido en exámenes
- Cuántas veces se ha acertado/fallado
- Estadísticas por usuario y en general
- Rankings de preguntas más falladas por categoría

## 🗄️ Estructura de Tablas

### Tablas Principales

#### 1. `question_global_stats`
**Estadísticas globales por pregunta**
```sql
- question_id (UUID) → questions(id)
- total_appearances (INTEGER) - Total apariciones
- total_correct_answers (INTEGER) - Total aciertos
- total_incorrect_answers (INTEGER) - Total fallos
- total_unanswered (INTEGER) - Sin responder
- success_rate (DECIMAL) - Porcentaje de éxito
- difficulty_score (DECIMAL) - Puntuación dificultad
- avg_time_spent_seconds (DECIMAL) - Tiempo promedio
- first_appeared_at (TIMESTAMP) - Primera aparición
- last_appeared_at (TIMESTAMP) - Última aparición
```

#### 2. `question_user_stats`
**Estadísticas por usuario y pregunta**
```sql
- user_id (INTEGER) → users(id)
- question_id (UUID) → questions(id)
- total_attempts (INTEGER) - Intentos del usuario
- correct_attempts (INTEGER) - Aciertos del usuario
- incorrect_attempts (INTEGER) - Fallos del usuario
- user_success_rate (DECIMAL) - Éxito del usuario
- avg_time_spent_seconds (DECIMAL) - Tiempo promedio usuario
- first_attempt_at (TIMESTAMP) - Primer intento
- last_attempt_at (TIMESTAMP) - Último intento
```

#### 3. `question_category_stats`
**Estadísticas por categoría UT**
```sql
- question_id (UUID) → questions(id)
- category (VARCHAR) - Categoría UT
- total_appearances (INTEGER) - Apariciones en categoría
- total_correct_answers (INTEGER) - Aciertos en categoría
- total_incorrect_answers (INTEGER) - Fallos en categoría
- category_success_rate (DECIMAL) - Éxito en categoría
- difficulty_rank (INTEGER) - Ranking dificultad
```

#### 4. `question_attempt_details`
**Registro detallado de intentos**
```sql
- user_id (INTEGER) → users(id)
- question_id (UUID) → questions(id)
- exam_id (INTEGER) → exams(id) [opcional]
- user_answer (CHAR) - Respuesta del usuario
- correct_answer (CHAR) - Respuesta correcta
- is_correct (BOOLEAN) - Si acertó
- time_spent_seconds (INTEGER) - Tiempo empleado
- category (VARCHAR) - Categoría UT
- attempt_order (INTEGER) - Orden en examen
- session_type (VARCHAR) - Tipo de sesión
```

#### 5. `question_failure_rankings`
**Rankings de preguntas más falladas**
```sql
- question_id (UUID) → questions(id)
- category (VARCHAR) - Categoría UT
- failure_count (INTEGER) - Número de fallos
- failure_rate (DECIMAL) - Porcentaje de fallos
- total_attempts (INTEGER) - Total intentos
- difficulty_score (DECIMAL) - Puntuación dificultad
- ranking_position (INTEGER) - Posición ranking
```

## 🔗 Relaciones

```
questions (1) ←→ (1) question_global_stats
questions (1) ←→ (N) question_user_stats
questions (1) ←→ (N) question_category_stats
questions (1) ←→ (N) question_attempt_details
questions (1) ←→ (N) question_failure_rankings

users (1) ←→ (N) question_user_stats
users (1) ←→ (N) question_attempt_details

exams (1) ←→ (N) question_attempt_details [opcional]
```

## 📊 Vistas Principales

### 1. `most_failed_questions_by_category`
**Preguntas más falladas por categoría**
- Ranking de dificultad por categoría UT
- Estadísticas de éxito/fallo
- Tiempo de aparición

### 2. `user_question_performance`
**Rendimiento del usuario por pregunta**
- Estadísticas individuales
- Tiempo promedio por usuario
- Último intento

### 3. `category_performance_summary`
**Resumen de rendimiento por categoría**
- Estadísticas agregadas por UT
- Porcentajes de éxito globales

## ⚙️ Funciones de Actualización

### 1. `update_question_global_stats(question_id)`
- Actualiza estadísticas globales de una pregunta
- Calcula métricas desde `question_attempt_details`

### 2. `update_question_user_stats(user_id, question_id)`
- Actualiza estadísticas de usuario para una pregunta
- Calcula métricas individuales

### 3. `update_failure_rankings()`
- Actualiza rankings de preguntas más falladas
- Ordena por categoría y dificultad

## 🎯 Casos de Uso

### 1. **Análisis de Dificultad**
- Identificar preguntas más difíciles por categoría
- Calcular puntuaciones de dificultad
- Generar rankings de fallos

### 2. **Seguimiento Individual**
- Rendimiento personal por pregunta
- Identificar áreas débiles del usuario
- Tiempo promedio de respuesta

### 3. **Análisis Global**
- Estadísticas agregadas de todas las preguntas
- Tendencias de dificultad por categoría
- Evolución temporal del rendimiento

### 4. **Recomendaciones**
- Preguntas prioritarias para repasar
- Categorías que necesitan más estudio
- Preguntas con mayor impacto en el éxito

## 🚀 Próximos Pasos

1. **Aplicar esquema** a la base de datos
2. **Implementar captura** de datos en el frontend
3. **Crear endpoints API** para consultar estadísticas
4. **Desarrollar interfaz** de visualización
5. **Configurar actualización** automática de rankings
