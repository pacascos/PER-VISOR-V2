# 📋 Guía: Anular Preguntas Duplicadas

## 🎯 Objetivo

Marcar como **anuladas** las preguntas duplicadas, dejando solo UNA instancia activa de cada pregunta única (por hash).

---

## 📊 Análisis Realizado

### Estado Actual:
- **Total preguntas PER**: 3,013
- **Preguntas únicas (hash)**: 1,849
- **Duplicados**: 1,164 (38.63%)

### Acción Propuesta:
- **Mantener activas**: 1,849 preguntas (convocatorias más recientes)
- **Anular**: 1,164 duplicados

---

## 🎯 Criterio de Selección

Para cada grupo de preguntas duplicadas (mismo hash), se mantiene activa:

1. **Convocatoria más reciente** (2024-11 > 2023-11 > 2022-12, etc.)
2. Si hay empate: **PER_NORMAL** > PER_LIBERADO
3. Si sigue empate: **ID menor**

### Ejemplo:

```
Pregunta: "Si en navegación con arrancada avante..."
- ✅ MANTENER: 2023-11-RECREO PER_NORMAL (más reciente)
- ❌ ANULAR: 2023-11-RECREO PER_LIBERADO (duplicado)
- ❌ ANULAR: 2021-07-RECREO PER_NORMAL (duplicado antiguo)
```

---

## 📋 Desglose por UT

| UT | Mantener | Anular | Total |
|----|----------|--------|-------|
| Reglamento (RIPA) | 329 | 229 | 558 |
| Teoría de navegación | 231 | 191 | 422 |
| Meteorología | 185 | 159 | 344 |
| Carta de navegación | 192 | 132 | 324 |
| Emergencias | 147 | 105 | 252 |
| Balizamiento | 196 | 80 | 276 |
| Maniobra | 92 | 78 | 170 |
| Seguridad | 159 | 63 | 222 |
| Legislación | 64 | 48 | 112 |
| Nomenclatura | 175 | 48 | 223 |
| Elementos amarre | 79 | 31 | 110 |

---

## 🚀 Archivos Disponibles

### 1. `anular_preguntas_duplicadas.sql`
**Script principal** que ejecuta la anulación.

**Características:**
- ✅ Análisis previo detallado
- ✅ Pide confirmación antes de ejecutar
- ✅ Verifica resultado post-anulación
- ✅ Muestra resumen final

**Cómo ejecutar:**
```bash
docker exec -i per_postgres psql -U per_user -d per_exams < consultas/anular_preguntas_duplicadas.sql
```

**⚠️ IMPORTANTE:** El script pedirá confirmación. Presiona Enter para continuar o Ctrl+C para cancelar.

---

### 2. `revertir_anulacion_duplicadas.sql`
**Script de rollback** que revierte la anulación.

**Uso:**
Si después de anular decides revertir, ejecuta:
```bash
docker exec -i per_postgres psql -U per_user -d per_exams < consultas/revertir_anulacion_duplicadas.sql
```

---

## ✅ Beneficios de Anular Duplicados

### Antes:
- 3,013 preguntas disponibles
- Cobertura en 20 exámenes: 26.22%
- Sensación de ver preguntas repetidas

### Después:
- **1,849 preguntas únicas** disponibles
- Cobertura en 20 exámenes: **42.73%** ✅
- **Mayor variedad percibida** (+60%)
- **Sin duplicados** en el banco activo

---

## 🔍 Verificación Post-Anulación

El script incluye verificaciones automáticas:

1. ✅ Cuenta de preguntas activas vs anuladas
2. ✅ Verifica que NO queden duplicados activos
3. ✅ Confirma que preguntas únicas = preguntas activas

**Resultado esperado:**
```
✅ Preguntas únicas activas: 1,849
Total preguntas activas: 1,849
Total preguntas anuladas: 1,164
Estado: ✅ PERFECTO: Sin duplicados activos
```

---

## ⚠️ Consideraciones Importantes

### ✅ Lo que NO se verá afectado:
- Exámenes ya realizados
- Estadísticas históricas
- Respuestas de usuarios

### ✅ Lo que SÍ cambiará:
- Nuevos exámenes solo usarán las 1,849 preguntas únicas
- Mejor variedad en la selección
- Menor sensación de repetición

### 🔒 Seguridad:
- El campo `anulada` ya existe en el modelo
- La consulta de selección ya filtra `anulada = false`
- Es reversible con el script de rollback

---

## 📊 Consultas de Verificación

### Ver estado actual:
```sql
SELECT 
    COUNT(*) FILTER (WHERE anulada = false) AS "Activas",
    COUNT(*) FILTER (WHERE anulada = true) AS "Anuladas"
FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE e.tipo_examen IN ('PER_NORMAL', 'PER_LIBERADO');
```

### Ver duplicados activos restantes:
```sql
SELECT q.hash_pregunta, COUNT(*)
FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE e.tipo_examen IN ('PER_NORMAL', 'PER_LIBERADO')
AND q.anulada = false
GROUP BY q.hash_pregunta
HAVING COUNT(*) > 1;
```

### Ver qué se mantiene de una pregunta específica:
```sql
SELECT 
    q.id,
    e.convocatoria,
    e.tipo_examen,
    q.anulada,
    LEFT(q.texto_pregunta, 80) as pregunta
FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE q.hash_pregunta = 'XXXXX'  -- Reemplazar con hash específico
ORDER BY e.convocatoria DESC;
```

---

## 🚀 Pasos Recomendados

### 1. **Backup (Recomendado)**
```bash
docker exec per_postgres pg_dump -U per_user per_exams > backup_antes_anular_$(date +%Y%m%d_%H%M%S).sql
```

### 2. **Ejecutar Análisis**
Ya ejecutado ✅ (ver arriba)

### 3. **Ejecutar Anulación**
```bash
docker exec -i per_postgres psql -U per_user -d per_exams < consultas/anular_preguntas_duplicadas.sql
```

### 4. **Verificar Resultados**
El script ya incluye verificación automática ✅

### 5. **(Opcional) Probar Generación de Exámenes**
```bash
cd tests && node test-full-exam-flow.js
```

### 6. **(Si es necesario) Revertir**
```bash
docker exec -i per_postgres psql -U per_user -d per_exams < consultas/revertir_anulacion_duplicadas.sql
```

---

## 💡 Alternativa: Ejecución Manual

Si prefieres más control, puedes ejecutar paso a paso en `psql`:

```bash
# 1. Conectar
docker exec -it per_postgres psql -U per_user -d per_exams

# 2. Ver análisis
\i consultas/anular_preguntas_duplicadas.sql

# 3. Si todo OK, confirmar con Enter
# 4. Verificar resultados
```

---

## 📞 Soporte

**Archivos generados:**
- `anular_preguntas_duplicadas.sql` - Script principal
- `revertir_anulacion_duplicadas.sql` - Script de rollback
- `README_ANULACION_DUPLICADAS.md` - Esta guía

**Informes relacionados:**
- `INFORME_PREGUNTAS_DUPLICADAS.md` - Análisis detallado
- `INFORME_ALEATORIEDAD_EXAMENES.md` - Prueba de aleatoriedad

---

**Fecha:** 9 de Octubre 2025  
**Por:** Sistema PER_Cloude

