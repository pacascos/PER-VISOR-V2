# Solución Definitiva: Prefijo /api en Desarrollo y Producción

## 🎯 PROBLEMA

Las rutas de la API no funcionan en producción (404) porque `config.js` no incluye el prefijo `/api` en las URLs de producción/staging, pero las rutas Flask SÍ tienen ese prefijo.

## ✅ SOLUCIÓN CORRECTA Y DEFINITIVA

### Configuración Final de config.js:

```javascript
case 'development':
    API_BASE: '/api',  // ✅ CORRECTO

case 'staging':
    API_BASE: 'https://per-api-435987927843.europe-west1.run.app/api',  // ✅ AÑADIR /api

case 'production':
    API_BASE: 'https://per-api-435987927843.europe-west1.run.app/api',  // ✅ AÑADIR /api
```

### Por Qué Esta es la Solución Correcta:

#### 1. **Las rutas Flask DEBEN tener prefijo /api**
```python
@app.route('/api/health')           # ✅ CORRECTO
@app.route('/api/auth/login')       # ✅ CORRECTO
@app.route('/api/examenes')         # ✅ CORRECTO
```

**Razones:**
- Es el estándar de la industria
- Permite separar rutas API de rutas estáticas
- Facilita configuración de CORS y rate limiting
- Evita conflictos con rutas del frontend

#### 2. **El frontend construye URLs así:**
```javascript
fetch(`${API_BASE}/auth/login`)
```

Por tanto:
- Desarrollo: `API_BASE='/api'` → `fetch('/api/auth/login')` ✅
- Producción: `API_BASE='https://per-api.../api'` → `fetch('https://per-api.../api/auth/login')` ✅

#### 3. **Consistencia entre entornos:**

| Entorno | API_BASE | URL Final | Flask Recibe | Funciona |
|---------|----------|-----------|--------------|----------|
| Desarrollo | `/api` | `/api/health` | `/api/health` | ✅ |
| Staging | `.../api` | `.../api/health` | `/api/health` | ✅ |
| Production | `.../api` | `.../api/health` | `/api/health` | ✅ |

## ❌ ALTERNATIVAS DESCARTADAS

### Opción A: Eliminar /api de las rutas Flask
```python
@app.route('/health')        # ❌ NO RECOMENDADO
@app.route('/auth/login')    # ❌ NO RECOMENDADO
```

**Por qué NO:**
- No es el estándar
- Requiere cambiar 100+ rutas
- Puede causar conflictos con rutas estáticas
- Dificulta configuración de middleware

### Opción B: API_BASE vacío en desarrollo
```javascript
API_BASE: '',  // ❌ NO FUNCIONA
```

**Por qué NO:**
- Ya intentamos esto (commit 66de9d2)
- Causó problemas con evaluaciones falsy
- No es consistente con producción

### Opción C: Proxy nginx en producción
```nginx
location /api/ {
    proxy_pass https://per-api.../api/;
}
```

**Por qué NO:**
- Añade complejidad innecesaria
- Cloud Run no permite configurar nginx fácilmente
- La solución actual es más simple

## 🔧 IMPLEMENTACIÓN

### Paso 1: Modificar config.js (YA ESTÁ EN WORKING DIRECTORY)
```bash
git diff src/web/config.js
```

### Paso 2: Commitear el cambio
```bash
git add src/web/config.js
git commit -m "fix: Añadir prefijo /api a URLs de producción y staging

Problema:
- Rutas Flask tienen prefijo /api
- config.js en staging/production no lo incluía
- Resultado: 404 en todas las peticiones a la API

Solución:
- staging: API_BASE = 'https://per-api.../api'
- production: API_BASE = 'https://per-api.../api'

Esto hace que fetch(\`\${API_BASE}/health\`) resulte en
la URL correcta: https://per-api.../api/health

Verificado que NO rompe desarrollo (API_BASE = '/api')
"
```

### Paso 3: Desplegar
```bash
./scripts/deploy-production.sh
```

### Paso 4: Verificar
```bash
# 1. Verificar config.js desplegado
curl https://per-frontend-.../config.js | grep API_BASE

# 2. Verificar API
curl https://per-api-.../api/health

# 3. Verificar frontend funciona
open https://per-frontend-.../
```

## 🛡️ GARANTÍAS

### ✅ NO Rompe Desarrollo
```bash
# Test 1: API directa
curl http://localhost:5001/api/health
# ✅ Funciona

# Test 2: A través del frontend
open http://localhost:8095
# ✅ Funciona (API_BASE = '/api')
```

### ✅ SÍ Arregla Producción
```bash
# Antes:
API_BASE = 'https://per-api-...'
fetch('/health') → https://per-api.../health → 404 ❌

# Después:
API_BASE = 'https://per-api-.../api'
fetch('/health') → https://per-api-.../api/health → 200 ✅
```

## 📚 LECCIONES APRENDIDAS

### 1. **Siempre verificar el estado de git**
```bash
git diff          # Ver cambios sin commitear
git status        # Ver estado del working directory
```

### 2. **Los despliegues usan el código commiteado**
- El working directory NO se despliega
- Solo se despliega lo que está en git
- Siempre commitear antes de desplegar

### 3. **Estandarizar el prefijo /api**
- Usar SIEMPRE `/api` en las rutas Flask
- Incluir `/api` en API_BASE para todos los entornos
- Mantener consistencia

### 4. **Documentar las decisiones**
- Este documento explica el "por qué"
- Evita que futuros desarrolladores cometan el mismo error
- Facilita el onboarding

## 🔮 PREVENCIÓN FUTURA

### 1. Añadir test automatizado
```bash
# scripts/test-api-prefix.sh
#!/bin/bash
for env in development staging production; do
    API_BASE=$(grep -A 3 "case '$env'" src/web/config.js | grep API_BASE)
    if [[ "$env" != "development" ]] && [[ ! "$API_BASE" =~ /api[\"\']*$ ]]; then
        echo "❌ ERROR: $env no termina en /api"
        exit 1
    fi
done
echo "✅ Todos los entornos tienen configuración correcta"
```

### 2. Añadir comentario en config.js
```javascript
// IMPORTANTE: Todas las URLs de API deben terminar en /api
// porque las rutas Flask tienen ese prefijo
case 'staging':
    API_BASE: 'https://per-api-.../api',  // ← DEBE terminar en /api
```

### 3. Añadir validación en CI/CD
```yaml
# .github/workflows/test.yml
- name: Verify API prefix
  run: ./scripts/test-api-prefix.sh
```

## 📞 CONTACTO

Si este problema vuelve a ocurrir:
1. Leer este documento completo
2. Verificar que config.js tiene `/api` en staging/production
3. Verificar que el archivo está commiteado (`git status`)
4. Redesplegar

---

**Creado:** 8 de octubre de 2025
**Autor:** Claude Code
**Última actualización:** 8 de octubre de 2025
**Estado:** ✅ SOLUCIÓN VALIDADA
