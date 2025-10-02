# 🚨 Problema: Endpoints 404 en el Backend

## 📋 Resumen del Problema

Los endpoints `/user-statistics/update` y `/user/exam/<exam_id>/failed-questions` están devolviendo error 404 (NOT FOUND) aunque están definidos en el archivo `scripts/servidores/api_postgresql.py`.

## 🔍 Síntomas Observados

### Error en el Frontend:
```
exam-page.js:483  POST http://localhost:8095/api/user-statistics/update 404 (NOT FOUND)
exam-page.js:516  GET http://localhost:8095/api/user/exam/df7cf927-3a1c-4c09-8c1b-1f18b7cacb65/failed-questions 404 (NOT FOUND)
```

### Error en cURL:
```bash
curl -X POST http://localhost:8095/api/user-statistics/update
# Respuesta: <!doctype html><html lang=en><title>404 Not Found</title>
```

## 📁 Archivos Afectados

### 1. Backend - `scripts/servidores/api_postgresql.py`
- **Línea 2207**: `@app.route('/user-statistics/update', methods=['POST'])`
- **Línea 2264**: `@app.route('/user/exam/<exam_id>/failed-questions', methods=['GET'])`

### 2. Frontend - `src/web/exam-page.js`
- **Línea 483**: Llamada a `/user-statistics/update`
- **Línea 516**: Llamada a `/user/exam/<exam_id>/failed-questions`

## 🔧 Cambios Realizados

### 1. Eliminación de Función Duplicada
- **Problema**: Había dos funciones con el mismo endpoint `/user/exam/<exam_id>/failed-questions`
- **Solución**: Eliminé la función duplicada `get_exam_failed_questions()` (líneas 2352-2422)
- **Mantuve**: La función `get_failed_questions_from_exam()` (línea 2264)

### 2. Regeneración del Contenedor
```bash
docker compose stop api
docker compose build --no-cache api
docker compose up -d api
```

### 3. Reinicio del Contenedor
```bash
docker compose restart api
```

## ✅ Verificaciones Realizadas

### 1. Sintaxis del Archivo
```bash
python3 -m py_compile scripts/servidores/api_postgresql.py
# ✅ Sin errores de sintaxis
```

### 2. Presencia de Endpoints
```bash
grep -n "user-statistics" scripts/servidores/api_postgresql.py
# ✅ Encontrado en línea 2207

grep -n "failed-questions" scripts/servidores/api_postgresql.py
# ✅ Encontrado en líneas 1715 y 2264
```

### 3. Estado del Contenedor
```bash
docker compose ps
# ✅ per_api: Up 15 seconds (healthy)
```

### 4. Autenticación
```bash
curl -X POST http://localhost:8095/api/auth/login
# ✅ Login exitoso, token válido obtenido
```

## 🚨 Estado Actual

- **Contenedor**: ✅ Ejecutándose correctamente
- **Sintaxis**: ✅ Sin errores
- **Endpoints definidos**: ✅ Presentes en el código
- **Registro de endpoints**: ❌ **PROBLEMA**: Los endpoints no se están registrando en Flask

## 🤔 Hipótesis del Problema

1. **Función incompleta**: La función `update_user_statistics()` puede estar truncada o tener errores de sintaxis que impiden su registro
2. **Error en la aplicación Flask**: El contenedor puede estar ejecutándose pero no cargando todos los endpoints
3. **Problema de importación**: Los endpoints pueden estar en una sección del código que no se ejecuta

## 📋 Próximos Pasos Sugeridos

1. **Verificar integridad de las funciones**:
   ```bash
   # Verificar que las funciones estén completas
   sed -n '2207,2300p' scripts/servidores/api_postgresql.py
   sed -n '2264,2320p' scripts/servidores/api_postgresql.py
   ```

2. **Verificar logs detallados del contenedor**:
   ```bash
   docker logs per_api --tail 50
   ```

3. **Probar endpoints existentes** para confirmar que Flask funciona:
   ```bash
   curl -X GET http://localhost:8095/api/auth/me
   ```

4. **Verificar que no hay errores de importación** en el archivo Python

## 📝 Contexto del Desarrollo

Este problema surgió después de implementar dos nuevas funcionalidades:
- **Actualización de estadísticas**: Para registrar el progreso del usuario después de completar un examen
- **Enlace a preguntas falladas**: Para permitir al usuario revisar las preguntas que respondió incorrectamente

Ambas funcionalidades requieren nuevos endpoints en el backend que actualmente no están siendo registrados por Flask.

---
**Fecha**: 2025-10-01  
**Estado**: 🔴 CRÍTICO - Endpoints no funcionando  
**Prioridad**: ALTA - Bloquea funcionalidad principal del examen
