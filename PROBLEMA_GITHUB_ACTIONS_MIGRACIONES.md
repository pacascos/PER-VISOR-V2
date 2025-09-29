# PROBLEMA: GitHub Actions - Migraciones de Base de Datos

## 📋 RESUMEN DEL PROBLEMA

El workflow de GitHub Actions falla al ejecutar migraciones de base de datos en Google Cloud SQL. El error específico es:

```
psql: error: connection to server at "127.0.0.1", port 9470 failed: fe_sendauth: no password supplied
```

## 🔧 CONFIGURACIÓN ACTUAL

### Service Account y Permisos
- **Service Account**: `github-actions-deploy@webpersonal-189221.iam.gserviceaccount.com`
- **Permisos asignados**:
  - `roles/secretmanager.admin` ✅
  - `roles/secretmanager.secretAccessor` ✅
  - `roles/cloudsql.client` ✅
  - `roles/iam.serviceAccountUser` ✅
  - `roles/run.admin` ✅
  - `roles/artifactregistry.writer` ✅

### Secret Manager
- **Secret**: `database-password`
- **Estado**: ✅ Existe y se puede acceder
- **Contenido**: Contraseña de la base de datos

### Cloud SQL
- **Instancia**: `per-db-instance`
- **Base de datos**: `per_exams`
- **Usuario**: `per_user`
- **Región**: `europe-west1`

## 🚀 WORKFLOW ACTUAL

### Paso de Migraciones (`.github/workflows/deploy-google-cloud.yml`)
```yaml
- name: 🗄️ Aplicar migraciones de base de datos
  run: |
    echo "🗄️ Aplicando migraciones de base de datos..."

    # Verificar que el secret database-password existe
    echo "🔍 Verificando secret database-password..."
    if ! gcloud secrets describe database-password --project=webpersonal-189221 >/dev/null 2>&1; then
      echo "❌ El secret 'database-password' no existe"
      echo "📝 Creando secret temporal con contraseña por defecto..."
      echo "change_me_secure_password_123" | gcloud secrets create database-password --data-file=- --project=webpersonal-189221
    else
      echo "✅ Secret database-password encontrado"
    fi

    # Usar Cloud SQL Proxy en GitHub Actions para evitar restricciones de red
    echo "🔗 Configurando Cloud SQL Proxy para GitHub Actions..."

    # Instalar componentes gcloud necesarios
    echo "🔧 Instalando componentes gcloud..."
    gcloud components install cloud_sql_proxy beta --quiet

    # Descargar Cloud SQL Proxy standalone también (backup)
    curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
    chmod +x cloud_sql_proxy

    # Iniciar proxy en background
    ./cloud_sql_proxy -instances=webpersonal-189221:europe-west1:per-db-instance=tcp:5432 &
    PROXY_PID=$!

    # Esperar que esté listo
    sleep 10

    # Aplicar migraciones
    echo "🚀 Aplicando migraciones de base de datos..."
    chmod +x scripts/apply-migrations.sh
    ./scripts/apply-migrations.sh -e production

    # Limpiar
    kill $PROXY_PID || true
```

## 📄 SCRIPT DE MIGRACIONES

### Archivo: `scripts/apply-migrations.sh`

#### Configuración de Producción
```bash
elif [ "$ENVIRONMENT" = "production" ]; then
    # Configuración de producción usando gcloud sql connect
    DB_INSTANCE="per-db-instance"
    DB_NAME="per_exams"
    DB_USER="per_user"
    PROJECT_ID="webpersonal-189221"

    log "🔗 Conectando a base de datos de producción via Cloud SQL Proxy..."

    # Verificar que estamos autenticados en gcloud
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        error "No estás autenticado en gcloud. Ejecuta: gcloud auth login"
    fi

    # Obtener contraseña desde Secret Manager
    log "🔐 Obteniendo contraseña desde Secret Manager..."
    DB_PASSWORD=$(gcloud secrets versions access latest --secret="database-password" --project="${PROJECT_ID}" 2>/dev/null || echo "")
    if [ -z "$DB_PASSWORD" ]; then
        error "No se pudo obtener la contraseña de la base de datos desde Secret Manager (secret: database-password)"
    fi
    success "Contraseña obtenida desde Secret Manager"

    # Función para ejecutar comandos SQL en producción usando Cloud SQL Proxy
    execute_sql() {
        echo "🔍 Ejecutando SQL: $1" >&2
        PGPASSWORD="$DB_PASSWORD" echo "$1" | gcloud beta sql connect per-db-instance --user=per_user --database=per_exams --project=${PROJECT_ID} 2>&1
    }

    execute_sql_file() {
        echo "🔍 Ejecutando archivo SQL: $1" >&2
        PGPASSWORD="$DB_PASSWORD" gcloud beta sql connect per-db-instance --user=per_user --database=per_exams --project=${PROJECT_ID} < "$1" 2>&1
    }
fi
```

## ❌ PROBLEMA ESPECÍFICO

### Error Completo
```
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:55.7117976Z [2025-09-29 21:08:55] 🔐 Obteniendo contraseña desde Secret Manager...
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:56.5545148Z [SUCCESS] Contraseña obtenida desde Secret Manager
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:56.5560851Z [2025-09-29 21:08:56] 🔍 Verificando tabla de control de migraciones...
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:56.5561677Z 🔍 Ejecutando SQL: 
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:56.5562189Z CREATE TABLE IF NOT EXISTS schema_migrations (
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:56.5562668Z     id SERIAL PRIMARY KEY,
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:56.5563003Z     migration_name VARCHAR(255) NOT NULL UNIQUE,
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:56.5563398Z     applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:56.5563754Z     checksum VARCHAR(64),
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:56.5564187Z     environment VARCHAR(50) NOT NULL
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:56.5564703Z );
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:56.5564913Z 
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:57.4156935Z Starting Cloud SQL Proxy: [/opt/hostedtoolcache/gcloud/540.0.0/x64/bin/cloud_sql_proxy -instances webpersonal-189221:europe-west1:per-db-instance=tcp:9470 -credential_file /home/runner/.config/gcloud/legacy_credentials/github-actions-deploy@webpersonal-189221.iam.gserviceaccount.com/adc.json]
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:57.4195260Z 2025/09/29 21:08:57 current FDs rlimit set to 65536, wanted limit is 8500. Nothing to do here.
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:57.4217623Z 2025/09/29 21:08:57 using credential file for authentication; email=github-actions-deploy@webpersonal-189221.iam.gserviceaccount.com
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:57.7934300Z 2025/09-29 21:08:57 Listening on 127.0.0.1:9470 for webpersonal-189221:europe-west1:per-db-instance
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:57.7935517Z 2025/09-29 21:08:57 Ready for new connections
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:57.9394233Z Connecting to database with SQL user [per_user].Password: 
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:08:58.8524390Z psql: error: connection to server at "127.0.0.1", port 9470 failed: fe_sendauth: no password supplied
deploy	🗄️ Aplicar migraciones de base de datos	2025-09-29T21:09:03.9270705Z ##[error]Process completed with exit code 2.
```

### Análisis del Problema
1. ✅ **Cloud SQL Proxy se inicia correctamente** en puerto 9470
2. ✅ **La contraseña se obtiene exitosamente** desde Secret Manager
3. ✅ **gcloud beta sql connect se ejecuta** y inicia su propio Cloud SQL Proxy
4. ❌ **PGPASSWORD no se pasa correctamente** a psql dentro de gcloud beta sql connect

## 🔍 INVESTIGACIÓN REALIZADA

### Lo que funciona:
- ✅ Autenticación con Google Cloud
- ✅ Acceso a Secret Manager
- ✅ Instalación de componentes gcloud
- ✅ Inicio de Cloud SQL Proxy
- ✅ Obtención de contraseña

### Lo que no funciona:
- ❌ `gcloud beta sql connect` no respeta la variable `PGPASSWORD`
- ❌ El comando espera que se introduzca la contraseña interactivamente
- ❌ No hay forma de pasar la contraseña como parámetro

## 💡 POSIBLES SOLUCIONES

### Opción 1: Usar psql directamente
```bash
execute_sql() {
    echo "🔍 Ejecutando SQL: $1" >&2
    PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p 5432 -U per_user -d per_exams -c "$1"
}

execute_sql_file() {
    echo "🔍 Ejecutando archivo SQL: $1" >&2
    PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p 5432 -U per_user -d per_exams -f "$1"
}
```

### Opción 2: Crear archivo .pgpass
```bash
echo "127.0.0.1:5432:per_exams:per_user:$DB_PASSWORD" > ~/.pgpass
chmod 600 ~/.pgpass
```

### Opción 3: Usar expect o similar para automatizar entrada
```bash
execute_sql() {
    echo "🔍 Ejecutando SQL: $1" >&2
    expect << EOF
spawn gcloud beta sql connect per-db-instance --user=per_user --database=per_exams --project=${PROJECT_ID}
expect "Password:"
send "$DB_PASSWORD\r"
expect "per_exams=>"
send "$1\r"
expect "per_exams=>"
send "\\q\r"
expect eof
EOF
}
```

### Opción 4: Usar gcloud sql execute-sql (si existe)
```bash
gcloud sql execute-sql per-db-instance --sql="$1" --user=per_user --database=per_exams
```

## 🎯 PREGUNTA PARA CLAUDE

**¿Cuál es la mejor manera de ejecutar comandos SQL en Google Cloud SQL desde GitHub Actions cuando `gcloud beta sql connect` no respeta la variable `PGPASSWORD`?**

**Contexto específico:**
- Usamos Cloud SQL Proxy para conexiones seguras
- La contraseña se obtiene desde Secret Manager
- Necesitamos ejecutar archivos SQL de migración
- El entorno es GitHub Actions (Linux)
- La base de datos es PostgreSQL

**Restricciones:**
- No podemos usar entrada interactiva
- Necesitamos que sea robusto y confiable
- Debe funcionar en el entorno de GitHub Actions
- Preferiblemente usar herramientas oficiales de Google Cloud

## 📚 RECURSOS DE REFERENCIA

- [Cloud SQL Proxy Documentation](https://cloud.google.com/sql/docs/postgres/sql-proxy)
- [gcloud sql connect Documentation](https://cloud.google.com/sdk/gcloud/reference/sql/connect)
- [PostgreSQL Authentication Methods](https://www.postgresql.org/docs/current/auth-methods.html)
- [GitHub Actions with Google Cloud](https://github.com/google-github-actions)

---

**Fecha de creación**: 2025-09-29  
**Estado**: Problema activo  
**Prioridad**: Alta  
**Asignado**: Claude AI Assistant
