# Contexto: Priorización de Preguntas Incompletas en Generación de Exámenes

## 🎯 **OBJETIVO**

Implementar una funcionalidad temporal en el sistema de generación de exámenes PER que **priorice las preguntas con respuestas incompletas** (sin punto final) para facilitar su revisión y corrección.

## 📊 **ANÁLISIS REALIZADO**

### Estadísticas del PER:
- **Total de respuestas del PER:** 12,208
- **Respuestas sin punto final:** 769 (6.30%)
- **Preguntas con respuestas incompletas:** 543 preguntas únicas

### Categorías más afectadas:
1. **Emergencias en la mar:** 13.28% sin punto
2. **Legislación:** 10.27% sin punto  
3. **Carta de navegación:** 9.19% sin punto

### Archivo generado:
- `preguntas_per_sin_punto.csv` - Lista completa de 561 preguntas del PER con respuestas sin punto final

## 🏗️ **ARQUITECTURA DEL SISTEMA**

### Componentes principales:
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Flask     │    │   PostgreSQL    │
│   (exam-system) │◄──►│   (api_postgresql) │◄──►│   (per_exams)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Flujo de generación de exámenes:
1. Usuario hace clic en "Nuevo Examen" en `exam-system.html`
2. Frontend llama a `POST /exams/generate` en `api_postgresql.py`
3. API genera examen usando configuración de UT (`ut_configuration`)
4. API selecciona preguntas por categoría y las asigna al examen
5. Frontend carga las preguntas y muestra la interfaz

## 📁 **ARCHIVOS PRINCIPALES**

### 1. **Backend API** - `scripts/servidores/api_postgresql.py`
- **Función:** `generate_exam()` (líneas ~1492-1635)
- **Responsabilidad:** Generar exámenes y seleccionar preguntas
- **Estado actual:** Funciona correctamente sin priorización

### 2. **Frontend** - `src/web/exam-system.js`
- **Función:** `startNewExam()` (líneas ~283-317)
- **Responsabilidad:** Llamar a la API y manejar la respuesta
- **Estado actual:** Funciona correctamente

### 3. **Base de datos** - PostgreSQL
- **Tabla principal:** `questions` - Preguntas del sistema
- **Tabla relacionada:** `answer_options` - Opciones de respuesta
- **Tabla configuración:** `ut_configuration` - Configuración por UT

## 🔍 **PROBLEMA ACTUAL**

### Error encontrado:
```
ERROR:__main__:Error generando examen: tuple index out of range
ERROR:__main__:Tipo de error: IndexError
ERROR:__main__:Traceback: Traceback (most recent call last):
  File "/app/api_postgresql.py", line 1543, in generate_exam
    cur.execute("""
  File "/usr/local/lib/python3.11/site-packages/psycopg2/extras.py", line 146, in execute
    return super().execute(query, vars)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
IndexError: tuple index out of range
```

### Línea problemática:
```python
# Línea 1543 en api_postgresql.py
cur.execute("""
    SELECT q.id FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE q.categoria = %s
    AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
    AND q.id IN (
        SELECT DISTINCT ao.question_id
        FROM answer_options ao
        WHERE ao.texto IS NOT NULL 
        AND ao.texto != '' 
        AND ao.texto NOT LIKE '%.'
    )
    ORDER BY RANDOM()
    LIMIT %s
""", (category_name, questions_needed))
```

## 🎯 **ENFOQUE DE LA SOLUCIÓN**

### Estrategia implementada:
1. **Primera consulta:** Obtener preguntas incompletas por categoría
2. **Lógica de fallback:** Si no hay suficientes incompletas, completar con preguntas normales
3. **Logging detallado:** Para seguimiento de la priorización

### Código implementado:
```python
# TEMPORAL: Priorizar preguntas con respuestas incompletas (sin punto final)
# TODO: Remover esta lógica cuando se hayan completado todas las respuestas

# Primero intentar obtener preguntas incompletas
cur.execute("""
    SELECT q.id FROM questions q
    JOIN exams e ON q.exam_id = e.id
    WHERE q.categoria = %s
    AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
    AND q.anulada = false
    AND q.id IN (
        SELECT DISTINCT ao.question_id
        FROM answer_options ao
        WHERE ao.texto IS NOT NULL 
        AND ao.texto != '' 
        AND ao.texto NOT LIKE '%.'
    )
    ORDER BY RANDOM()
    LIMIT %s
""", (category_name, questions_needed))

ut_questions = cur.fetchall()
questions_selected_count = len(ut_questions)

# Si no hay suficientes preguntas incompletas, completar con preguntas normales
if questions_selected_count < questions_needed:
    remaining_needed = questions_needed - questions_selected_count
    logger.info(f"📝 UT{ut_number} ({category_name}): {questions_selected_count} preguntas incompletas, completando con {remaining_needed} preguntas normales")
    
    # Obtener preguntas normales (excluyendo las ya seleccionadas)
    selected_ids = [str(q['id']) for q in ut_questions]
    
    if selected_ids:
        # Construir consulta con NOT IN
        placeholders = ','.join(['%s'] * len(selected_ids))
        query = f"""
            SELECT q.id FROM questions q
            JOIN exams e ON q.exam_id = e.id
            WHERE q.categoria = %s
            AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
            AND q.anulada = false
            AND q.id NOT IN ({placeholders})
            ORDER BY RANDOM()
            LIMIT %s
        """
        params = [category_name] + selected_ids + [remaining_needed]
    else:
        # Si no hay preguntas seleccionadas, obtener cualquier pregunta normal
        query = """
            SELECT q.id FROM questions q
            JOIN exams e ON q.exam_id = e.id
            WHERE q.categoria = %s
            AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
            AND q.anulada = false
            ORDER BY RANDOM()
            LIMIT %s
        """
        params = [category_name, remaining_needed]
    
    cur.execute(query, params)
    
    additional_questions = cur.fetchall()
    ut_questions.extend(additional_questions)
    
    logger.info(f"✅ UT{ut_number} ({category_name}): Total {len(ut_questions)} preguntas seleccionadas")
else:
    logger.info(f"✅ UT{ut_number} ({category_name}): {questions_selected_count} preguntas incompletas seleccionadas")
```

## 🧪 **PRUEBAS REALIZADAS**

### 1. **Consulta SQL directa** - ✅ FUNCIONA
```sql
SELECT q.id FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE q.categoria = 'Nomenclatura náutica'
AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
AND q.anulada = false
AND q.id IN (
    SELECT DISTINCT ao.question_id
    FROM answer_options ao
    WHERE ao.texto IS NOT NULL 
    AND ao.texto != '' 
    AND ao.texto NOT LIKE '%.'
)
ORDER BY RANDOM()
LIMIT 4;
```

### 2. **Generación de examen sin priorización** - ✅ FUNCIONA
- El sistema genera exámenes correctamente con 45 preguntas
- Las preguntas se cargan y muestran en la interfaz
- Todas las respuestas tienen punto final (comportamiento normal)

### 3. **Generación de examen con priorización** - ❌ FALLA
- Error "tuple index out of range" en la línea 1543
- El examen no se genera
- Error 500 en la API

## 🔧 **ESTADO ACTUAL**

### ✅ **Funcionando:**
- Sistema de exámenes básico
- Generación de exámenes sin priorización
- Análisis de preguntas incompletas
- Archivo CSV con preguntas incompletas

### ❌ **Con problemas:**
- Implementación de priorización de preguntas incompletas
- Error en consulta SQL compleja

## 🎯 **PRÓXIMOS PASOS SUGERIDOS**

1. **Investigar el error "tuple index out of range"**
   - Verificar si el problema está en los parámetros de la consulta
   - Revisar si hay algún problema con la construcción de la consulta dinámica

2. **Simplificar la implementación**
   - Usar un enfoque más directo para la priorización
   - Implementar la lógica en pasos más pequeños

3. **Alternativas de implementación**
   - Usar una consulta más simple
   - Implementar la lógica en Python en lugar de SQL complejo
   - Usar un enfoque de dos pasos: primero incompletas, luego normales

## 📝 **NOTAS TÉCNICAS**

- **Docker:** API se ejecuta en contenedor `per_api`
- **Base de datos:** PostgreSQL en contenedor `per_postgres`
- **Logs:** `docker logs per_api` para ver errores
- **Reconstrucción:** `docker compose build api && docker compose up -d api`

## 🏷️ **TAGS TEMPORALES**

- `TEMPORAL:` - Lógica que debe removerse cuando se completen las respuestas
- `TODO:` - Tareas pendientes de implementación
- `FIXME:` - Problemas conocidos que necesitan corrección
