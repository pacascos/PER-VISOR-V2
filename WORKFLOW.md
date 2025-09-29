# 🔄 Flujo de Trabajo - Git Flow Simplificado

## 📋 **Ramas Configuradas**

- **`main`** → Producción (https://bancotest.com)
- **`develop`** → Desarrollo y testing

## 🚀 **Flujo de Trabajo Diario**

### **Para nuevas funcionalidades:**

```bash
# 1. Asegurarse de estar en develop actualizada
git checkout develop
git pull origin develop

# 2. Crear rama de feature
git checkout -b feature/nombre-funcionalidad

# 3. Desarrollar y commitear
git add .
git commit -m "feat: descripción de la funcionalidad"

# 4. Merge a develop
git checkout develop
git merge feature/nombre-funcionalidad
git push origin develop

# 5. Testing en develop (localhost:8095)
# Si todo funciona correctamente...

# 6. Merge a main (producción)
git checkout main
git pull origin main
git merge develop
git push origin main

# 7. Deploy a producción (manual)
./scripts/deploy-production.sh
```

### **Para hotfixes (arreglos urgentes en producción):**

```bash
# 1. Crear rama desde main
git checkout main
git checkout -b hotfix/descripcion-arreglo

# 2. Arreglar y commitear
git add .
git commit -m "fix: descripción del arreglo"

# 3. Merge a main y develop
git checkout main
git merge hotfix/descripcion-arreglo
git push origin main

git checkout develop
git merge hotfix/descripcion-arreglo
git push origin develop

# 4. Deploy inmediato
./scripts/deploy-production.sh
```

## 🔧 **Scripts de Deploy**

### **Desarrollo (local):**
```bash
# Iniciar servicios locales
make start
# o
docker compose up -d
```

### **Producción:**
```bash
# Deploy completo
./scripts/deploy-production.sh

# Deploy solo API
./scripts/deploy-api.sh

# Deploy solo Frontend  
./scripts/deploy-frontend.sh
```

## 🎯 **Reglas Importantes**

1. **NUNCA** desarrollar directamente en `main`
2. **SIEMPRE** hacer testing en `develop` antes de producción
3. **SIEMPRE** hacer commit con mensajes descriptivos
4. **SIEMPRE** hacer pull antes de empezar a trabajar
5. **NUNCA** hacer merge sin testing previo

## 📝 **Tipos de Commits**

- `feat:` Nueva funcionalidad
- `fix:` Arreglo de bug
- `docs:` Documentación
- `style:` Formato, espacios, etc.
- `refactor:` Refactorización de código
- `test:` Añadir o modificar tests
- `chore:` Tareas de mantenimiento

## 🔍 **Verificación de Estados**

```bash
# Ver ramas disponibles
git branch -a

# Ver estado actual
git status

# Ver historial
git log --oneline -10

# Ver diferencias
git diff
```

## ⚠️ **Entornos**

- **Desarrollo:** `http://localhost:8095` (favicon normal)
- **Producción:** `https://bancotest.com` (favicon rojo/azul)
- **API:** `https://per-api-435987927843.europe-west1.run.app`

## 🆘 **Comandos de Emergencia**

```bash
# Deshacer último commit (manteniendo cambios)
git reset --soft HEAD~1

# Deshacer último commit (perdiendo cambios)
git reset --hard HEAD~1

# Volver a commit específico
git reset --hard <commit-hash>

# Crear backup de rama actual
git branch backup-$(date +%Y%m%d-%H%M%S)
```
