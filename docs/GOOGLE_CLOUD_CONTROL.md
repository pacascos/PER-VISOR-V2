# 🚀 Control de Servicios Google Cloud - PER Visor System

## 📋 Descripción

Script para gestionar los servicios de Google Cloud (Cloud SQL, Cloud Run) y evitar costes innecesarios cuando no se usan.

## 🎯 Objetivo

- **Ahorrar costes** parando servicios cuando no se necesiten
- **Facilitar el desarrollo** con comandos simples para iniciar/parar servicios
- **Monitorear estado** de los servicios y costes

## 📁 Archivos

- `scripts/gcloud-services-control.sh` - Script principal completo
- `scripts/gcloud-control.sh` - Alias corto
- `docs/GOOGLE_CLOUD_CONTROL.md` - Esta documentación

## 🚀 Uso Rápido

```bash
# Ver estado actual
./scripts/gcloud-control.sh status

# Parar todos los servicios (ahorrar costes)
./scripts/gcloud-control.sh stop

# Iniciar todos los servicios
./scripts/gcloud-control.sh start

# Ver información de costes
./scripts/gcloud-control.sh costs

# Ver logs de servicios
./scripts/gcloud-control.sh logs
```

## 📖 Comandos Disponibles

### Comandos Principales

| Comando | Descripción |
|---------|-------------|
| `start` | Iniciar todos los servicios |
| `stop` | Parar todos los servicios |
| `restart` | Reiniciar todos los servicios |
| `status` | Mostrar estado actual |
| `costs` | Mostrar información de costes |
| `logs` | Mostrar logs de servicios |

### Opciones

| Opción | Descripción |
|--------|-------------|
| `--sql-only` | Solo gestionar Cloud SQL |
| `--run-only` | Solo gestionar Cloud Run |
| `--dry-run` | Mostrar qué se haría sin ejecutar |
| `--help` | Mostrar ayuda |

## 💰 Información de Costes

### Servicios que Generan Costes

#### 🗄️ Cloud SQL
- **Coste base**: ~$25-50/mes (instancia pequeña)
- **Almacenamiento**: ~$0.17/GB/mes
- **Transferencia**: ~$0.12/GB

#### 🚀 Cloud Run
- **vCPU**: ~$0.00002400/segundo
- **Memoria**: ~$0.00000250/GB-segundo
- **Transferencia**: ~$0.12/GB
- **Mínimo**: $0 (cuando no hay tráfico)

#### 📦 Artifact Registry
- **Almacenamiento**: ~$0.10/GB/mes
- **Transferencia**: ~$0.10/GB

### 💡 Consejos para Ahorrar

1. **Parar Cloud SQL** cuando no se use (ahorro: ~$25-50/mes)
2. **Cloud Run se escala a 0** automáticamente sin tráfico
3. **Usar este script** para gestionar servicios fácilmente

## 🔧 Ejemplos de Uso

### Desarrollo Diario

```bash
# Al empezar a trabajar
./scripts/gcloud-control.sh start

# Al terminar de trabajar
./scripts/gcloud-control.sh stop
```

### Solo Base de Datos

```bash
# Parar solo la base de datos (mayor ahorro)
./scripts/gcloud-control.sh stop --sql-only

# Iniciar solo la base de datos
./scripts/gcloud-control.sh start --sql-only
```

### Solo Aplicación

```bash
# Parar solo Cloud Run (menor impacto)
./scripts/gcloud-control.sh stop --run-only

# Iniciar solo Cloud Run
./scripts/gcloud-control.sh start --run-only
```

### Verificación

```bash
# Ver estado actual
./scripts/gcloud-control.sh status

# Ver qué se haría sin ejecutar
./scripts/gcloud-control.sh stop --dry-run

# Ver logs si hay problemas
./scripts/gcloud-control.sh logs
```

## 🔍 Monitoreo

### Estado de Servicios

```bash
./scripts/gcloud-control.sh status
```

**Salida esperada:**
```
✅ Cloud SQL: Ejecutándose (RUNNABLE)
✅ API Service: Ejecutándose
✅ Frontend Service: Ejecutándose
```

### Costes Actuales

```bash
./scripts/gcloud-control.sh costs
```

**Salida esperada:**
```
💰 Cloud SQL: Generando costes (~$25-50/mes)
✅ Cloud Run: Sin costes (escalado a 0)
```

## ⚠️ Consideraciones

### Autenticación

- El script requiere autenticación con `gcloud auth login`
- Verifica automáticamente el proyecto correcto

### Tiempo de Inicio/Parada

- **Cloud SQL**: 2-5 minutos para iniciar/parar
- **Cloud Run**: Inmediato (escalado)

### Dependencias

- Cloud Run puede fallar si Cloud SQL está parado
- Recomendado parar Cloud Run antes que Cloud SQL

## 🛠️ Configuración

### Variables del Script

```bash
PROJECT_ID="webpersonal-189221"
REGION="europe-west1"
SQL_INSTANCE="per-db-instance"
API_SERVICE="per-api"
FRONTEND_SERVICE="per-frontend"
```

### Personalización

Para cambiar la configuración, edita las variables al inicio del script:

```bash
# Cambiar proyecto
PROJECT_ID="tu-proyecto-id"

# Cambiar región
REGION="us-central1"

# Cambiar instancia SQL
SQL_INSTANCE="tu-instancia-sql"
```

## 📞 Soporte

### Problemas Comunes

1. **Error de autenticación**
   ```bash
   gcloud auth login
   ```

2. **Proyecto incorrecto**
   ```bash
   gcloud config set project webpersonal-189221
   ```

3. **Permisos insuficientes**
   - Verificar roles IAM necesarios
   - Contactar administrador del proyecto

### Logs de Depuración

```bash
# Ver logs detallados
./scripts/gcloud-control.sh logs

# Ver logs específicos de un servicio
gcloud run services logs read per-api --region=europe-west1 --limit=50
```

---

**Fecha de creación**: 2025-09-29  
**Versión**: 1.0  
**Autor**: Sistema PER Visor
