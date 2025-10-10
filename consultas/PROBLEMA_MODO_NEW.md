# 🔴 Problema: Modo NEW Repite Preguntas en Tests de Estudio

**Fecha:** 10 de Octubre 2025  
**Severidad:** 🔴 ALTA (afecta experiencia de usuario)  
**Usuario afectado:** testuser (probablemente todos)

---

## 🎯 PROBLEMA IDENTIFICADO

### **El modo "NEW" solo excluye preguntas de exámenes completos, NO de tests de estudio previos**

**Lo que pasó hoy:**
- Usuario hizo **10 tests de estudio** en UTs 1, 2, 3
- Vio **76 preguntas únicas** (esperado: ~100)
- **24 preguntas se repitieron** entre tests diferentes
- Algunas preguntas aparecieron **3-4 veces**

**Ejemplo:**
- "Se dice que una hélice es dextrógira cuando..." → **4 veces** en 10 tests

---

## 🔬 CAUSA RAÍZ

### Consulta Actual en `study_mode_logic.py` (líneas 260-265):

```sql
AND q.id NOT IN (
    SELECT DISTINCT ua.question_id
    FROM user_answers ua          -- ❌ Solo exámenes completos
    JOIN user_exams ue ON ua.user_exam_id = ue.id
    WHERE ue.user_id = %s
)
```

**Problema:**
- ✅ Excluye preguntas de `user_answers` (exámenes completos): 1,579 preguntas
- ❌ **NO excluye** preguntas de `study_test_questions` (tests de estudio): 508 preguntas
- ❌ **NO excluye** preguntas ya vistas HOY

---

## 📊 DATOS DEL PROBLEMA

### Tests Realizados Hoy:

| Hora | Modo | Preguntas | Únicas | Repetidas en Test |
|------|------|-----------|--------|-------------------|
| 12:50 | new | 10 | 10 | ✅ 0 |
| 12:50 | new | 10 | 10 | ✅ 0 |
| 12:42 | new | 10 | 10 | ✅ 0 |
| 12:42 | new | 10 | 10 | ✅ 0 |
| 12:19 | new | 10 | 10 | ✅ 0 |
| 12:19 | new | 10 | 10 | ✅ 0 |
| 12:13 | new | 10 | 10 | ✅ 0 |
| 12:13 | new | 10 | 10 | ✅ 0 |
| 12:07 | new | 10 | 10 | ✅ 0 |
| 12:07 | new | 10 | 10 | ✅ 0 |

**Total:** 100 apariciones de preguntas, **76 únicas** → **24 repetidas entre tests**

### Top Preguntas Repetidas Hoy:

| Veces | UT | Pregunta |
|-------|----|----------|
| **4** | Nomenclatura | Se dice que una hélice es dextrógira cuando... |
| **3** | Elementos amarre | Un guía-cabos sirve para... |
| **3** | Nomenclatura | ¿Cuál características NO es propia de la bocina? |
| **3** | Nomenclatura | El desplazamiento máximo corresponde al... |
| **3** | Seguridad | ¿Cuál de las afirmaciones es INCORRECTA? |

---

## 🔧 SOLUCIÓN PROPUESTA

### Opción 1: **Excluir también tests de estudio** ✅ Recomendado

**Modificar líneas 260-265 de `study_mode_logic.py`:**

```python
# ANTES (solo excluye exámenes completos)
AND q.id NOT IN (
    SELECT DISTINCT ua.question_id
    FROM user_answers ua
    JOIN user_exams ue ON ua.user_exam_id = ue.id
    WHERE ue.user_id = %s
)

# DESPUÉS (excluye exámenes Y tests de estudio)
AND q.id NOT IN (
    -- Preguntas de exámenes completos
    SELECT DISTINCT ua.question_id
    FROM user_answers ua
    JOIN user_exams ue ON ua.user_exam_id = ue.id
    WHERE ue.user_id = %s
    
    UNION
    
    -- Preguntas de tests de estudio
    SELECT DISTINCT stq.question_id
    FROM study_test_questions stq
    JOIN study_tests st ON stq.study_test_id = st.id
    WHERE st.user_id = %s
)
```

**Beneficio:**
- ✅ El modo "NEW" será realmente "nuevo"
- ✅ No verás preguntas ya vistas en tests anteriores
- ✅ Mayor variedad en tests consecutivos

---

### Opción 2: **Excluir solo tests de hoy** (más permisivo)

```python
AND q.id NOT IN (
    SELECT DISTINCT ua.question_id
    FROM user_answers ua
    JOIN user_exams ue ON ua.user_exam_id = ue.id
    WHERE ue.user_id = %s
    
    UNION
    
    -- Solo tests de hoy
    SELECT DISTINCT stq.question_id
    FROM study_test_questions stq
    JOIN study_tests st ON stq.study_test_id = st.id
    WHERE st.user_id = %s
    AND DATE(st.created_at) = CURRENT_DATE
)
```

**Beneficio:**
- ✅ Evita repeticiones en la misma sesión
- ✅ Permite repasar preguntas en días diferentes
- ✅ Balance entre variedad y repaso

---

### Opción 3: **Excluir tests recientes (últimas 24-48 horas)**

```python
AND q.id NOT IN (
    SELECT DISTINCT ua.question_id
    FROM user_answers ua
    JOIN user_exams ue ON ua.user_exam_id = ue.id
    WHERE ue.user_id = %s
    
    UNION
    
    -- Tests de las últimas 24 horas
    SELECT DISTINCT stq.question_id
    FROM study_test_questions stq
    JOIN study_tests st ON stq.study_test_id = st.id
    WHERE st.user_id = %s
    AND st.created_at > NOW() - INTERVAL '24 hours'
)
```

**Beneficio:**
- ✅ Evita repeticiones inmediatas
- ✅ Permite repaso después de 24 horas
- ✅ Flexible y educativo

---

## 📊 IMPACTO ESPERADO

### Con Opción 1 (Excluir todos los tests de estudio):

| Métrica | Antes | Después |
|---------|-------|---------|
| **Preguntas únicas en 10 tests** | 76 | **~95** |
| **Repeticiones entre tests** | 24 | **~5** |
| **Probabilidad de repetición** | 24% | **~5%** |

### Con Opción 2 (Excluir solo hoy):

| Métrica | Antes | Después |
|---------|-------|---------|
| **Preguntas únicas en 10 tests** | 76 | **~98** |
| **Repeticiones en mismo día** | 24 | **~2** |
| **Probabilidad de repetición** | 24% | **~2%** |

---

## 🎯 RECOMENDACIÓN

**Opción 2: Excluir tests de hoy** (balance entre variedad y repaso)

**Razones:**
1. ✅ Evita repeticiones molestas en la misma sesión de estudio
2. ✅ Permite repasar preguntas en días diferentes (pedagógicamente útil)
3. ✅ No agota el banco de preguntas tan rápido
4. ✅ Mejor experiencia de usuario

---

## 🚀 IMPLEMENTACIÓN

**Archivo a modificar:**
- `scripts/servidores/study_mode_logic.py`
- Líneas: 260-265 (modo NEW)
- También verificar líneas 293-307 (fallback random)

**Cambios necesarios:**
1. Modificar consulta en `select_questions_new()`
2. Añadir UNION con `study_test_questions`
3. Filtrar por fecha: `DATE(st.created_at) = CURRENT_DATE`
4. Probar con tests consecutivos

**Tiempo estimado:** 10 minutos

---

## 📝 NOTAS

**¿Por qué no se detectó antes?**
- El modo NEW era poco usado
- Los tests de estudio son recientes
- Los usuarios hacían 1-2 tests, no 10 consecutivos

**¿Afecta a otros modos?**
- Random: NO (siempre aleatorio)
- Failed: NO (solo preguntas falladas)
- Solo afecta al modo NEW

---

**Detectado:** 10 de Octubre 2025  
**Prioridad:** ALTA  
**Estado:** Identificado, solución propuesta

