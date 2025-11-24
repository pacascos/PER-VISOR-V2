# 🛡️ Plan de Backup y Suspensión de PER en Google Cloud (24-11-2025)

Este documento consolida los pasos para guardar **código, base de datos y configuración** antes de apagar por completo el entorno en Google Cloud. También describe cómo restaurar todo el sistema cuando sea necesario.

---

## 1. Inventario del entorno actual

- **Proyecto GCP**: `webpersonal-189221`
- **Región principal**: `europe-west1`
- **Servicios Cloud Run**:
  - `per-api` (backend Flask)
  - `per-frontend` (Nginx estático)
- **Base de datos**: Cloud SQL PostgreSQL `per-db-instance` (`per_exams`, usuario `per_user`)
- **Secretos** (Secret Manager): `database-url`, `openai-api-key`, `jwt-secret`, `flask-secret-key`, etc.
- **Registro de contenedores**: `europe-west1-docker.pkg.dev/webpersonal-189221/per-images`
- **Dominio**: `bancotest.com` apuntando al servicio `per-frontend`

---

## 2. Backup del código fuente

> Todo vive en `/Users/cascos/code/PER_Cloude`

1. **Verificar estado del repositorio**
   ```bash
   cd /Users/cascos/code/PER_Cloude
   git status
   ```
   - Realiza commits pendientes para que el bundle incluya todo.

2. **Crear bundle git auto-contenido**
   ```bash
   mkdir -p backups
   git bundle create backups/per_cloude_repo_20251124.bundle --all
   ```
   - Archivo trasladable que permite reconstruir todas las ramas sin depender de GitHub.

3. **Empaquetar artefactos adicionales (config, assets, scripts)**
   ```bash
   tar -czf backups/per_cloude_files_20251124.tgz \
     Dockerfile frontend.Dockerfile docker-compose.yml \
     nginx.conf config/ scripts/ src/ data/ \
     requirements.txt package.json package-lock.json \
     env.example
   ```

4. **Verificación y copia offline**
   ```bash
   ls -lh backups/per_cloude_*
   shasum -a 256 backups/per_cloude_repo_20251124.bundle > backups/checksums.txt
   shasum -a 256 backups/per_cloude_files_20251124.tgz >> backups/checksums.txt
   ```
   - Copia los archivos a almacenamiento externo (disco USB o bucket GCS/Drive).

---

## 3. Backup de la base de datos (Cloud SQL)

### 3.1 Exportar desde Cloud SQL a Cloud Storage

1. **Crear bucket dedicado (si no existe)**
   ```bash
   gsutil mb -l europe-west1 gs://per-cloude-backups
   ```

2. **Exportar SQL**
   ```bash
   gcloud sql export sql per-db-instance \
     gs://per-cloude-backups/per_db_backup_20251124.sql.gz \
     --database=per_exams \
     --offload
   ```

3. **Descargar copia local**
   ```bash
   gsutil cp gs://per-cloude-backups/per_db_backup_20251124.sql.gz \
     /Users/cascos/code/PER_Cloude/backups/
   ```

4. **Guardar metadatos**
   ```bash
   gcloud sql instances describe per-db-instance \
     --format=json > backups/cloudsql_instance_20251124.json
   ```

### 3.2 Copia adicional mediante Cloud SQL Proxy (opcional)

```bash
./cloud-sql-proxy webpersonal-189221:europe-west1:per-db-instance &
pg_dump "host=127.0.0.1 port=5432 dbname=per_exams user=per_user password=TU_PASS" \
  | gzip > backups/per_db_dump_proxy_20251124.sql.gz
```

### 3.3 Backup del Postgres local (Docker)

Si tienes el contenedor `per_postgres` en marcha:

```bash
docker compose up -d postgres
make backup
ls -lh backups/backup_completo_*.sql
```

> Nota: desde este entorno no pudimos ejecutar `docker ps` (falta de permisos), por eso los comandos deben correrse manualmente en la máquina anfitriona.

---

## 4. Backup de configuración y secretos

1. **Describir servicios de Cloud Run**
   ```bash
   gcloud run services describe per-api \
     --region=europe-west1 --format=yaml > backups/cloudrun_per-api_20251124.yaml

   gcloud run services describe per-frontend \
     --region=europe-west1 --format=yaml > backups/cloudrun_per-frontend_20251124.yaml
   ```

2. **Exportar secretos**
   ```bash
   mkdir -p backups/secrets
   gcloud secrets versions access latest --secret=database-url > backups/secrets/database-url.txt
   gcloud secrets versions access latest --secret=openai-api-key > backups/secrets/openai-api-key.txt
   gcloud secrets versions access latest --secret=jwt-secret > backups/secrets/jwt-secret.txt
   gcloud secrets versions access latest --secret=flask-secret-key > backups/secrets/flask-secret-key.txt
   ```

3. **DNS y dominio**
   ```bash
   gcloud beta run domain-mappings describe \
     --domain=bancotest.com --region=europe-west1 > backups/domain_mapping_20251124.yaml
   gcloud dns record-sets export backups/dns_records_20251124.yaml --zone=bancotest-zone
   ```

4. **Artifact Registry**
   ```bash
   gcloud artifacts packages list \
     --repository=per-images --location=europe-west1 \
     --format=json > backups/artifact_registry_20251124.json
   ```

5. **GitHub Actions / CI**
   - Exporta los secretos (`GCP_SA_KEY`, `OPENAI_API_KEY`, etc.) desde la pestaña *Settings → Secrets and variables → Actions* guardando un JSON en un gestor seguro.

---

## 5. Apagar recursos para evitar costes

> Ejecutar solo una vez confirmados todos los backups.

1. **Detener Cloud Run (eliminando servicios)**
   ```bash
   gcloud run services delete per-api --region=europe-west1
   gcloud run services delete per-frontend --region=europe-west1
   ```
   - Alternativa temporal: establecer `--ingress internal` y reducir `--max-instances=1`, pero seguirá facturando mínimamente.

2. **Suspender / eliminar Cloud SQL**
   - No existe “stop” real. Tras exportar la BD:
     ```bash
     gcloud sql instances delete per-db-instance
     ```
   - Guarda también el archivo `cloudsql_instance_20251124.json` para recrearla exactamente igual.

3. **Eliminar domain mapping (opcional)**
   ```bash
   gcloud beta run domain-mappings delete \
     --domain=bancotest.com --region=europe-west1
   ```

4. **Limpiar Artifact Registry**
   ```bash
   gcloud artifacts docker images delete \
     europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-api:latest --delete-tags
   gcloud artifacts docker images delete \
     europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-frontend:latest --delete-tags
   ```

5. **Verificar facturación**
   - Revisar en `https://console.cloud.google.com/billing` que no queden recursos facturables (Storage, Cloud Logging retenido, etc.).

---

## 6. Almacenamiento externo de los backups

- Subir `*.bundle`, `*.tgz`, `*.sql.gz`, `cloudrun_*.yaml`, `cloudsql_*.json`, `secrets/*.txt` y `dns_records_*.yaml` a dos ubicaciones distintas (ej. Google Drive + disco físico).
- Mantener un registro en `backups/README_BACKUPS.md` con fecha, hash y ubicación.

---

## 7. Guía rápida para restaurar todo

1. **Clonar o descomprimir repositorio**
   ```bash
   git clone https://github.com/pacascos/PER-VISOR-V2.git
   # o restaurar desde bundle:
   git clone backups/per_cloude_repo_20251124.bundle PER_Cloude_restore
   ```

2. **Restaurar base de datos**
   ```bash
   gcloud sql instances create per-db-instance --region=europe-west1 \
     --database-version=POSTGRES_15 --tier=db-f1-micro --storage-size=10GB
   gcloud sql users create per_user --instance=per-db-instance --password=TU_PASS
   gcloud sql import sql per-db-instance \
     gs://per-cloude-backups/per_db_backup_20251124.sql.gz \
     --database=per_exams
   ```

3. **Re-crear secretos**
   ```bash
   gcloud secrets create database-url --data-file=backups/secrets/database-url.txt
   # repetir para el resto
   ```

4. **Construir y publicar imágenes**
   ```bash
   gcloud auth configure-docker europe-west1-docker.pkg.dev
   docker build -t europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-api:latest .
   docker push europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-api:latest
   docker build -f frontend.Dockerfile -t europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-frontend:latest .
   docker push europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-frontend:latest
   ```

5. **Desplegar Cloud Run**
   ```bash
   gcloud run deploy per-api --region=europe-west1 \
     --image=europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-api:latest \
    --allow-unauthenticated \
     --set-secrets="DATABASE_URL=database-url:latest" \
     --set-secrets="OPENAI_API_KEY=openai-api-key:latest" \
     --set-secrets="JWT_SECRET=jwt-secret:latest" \
     --set-secrets="SECRET_KEY=flask-secret-key:latest" \
     --add-cloudsql-instances=webpersonal-189221:europe-west1:per-db-instance

   gcloud run deploy per-frontend --region=europe-west1 \
     --image=europe-west1-docker.pkg.dev/webpersonal-189221/per-images/per-frontend:latest \
     --allow-unauthenticated
   ```

6. **Dominios y DNS**
   ```bash
   gcloud beta run domain-mappings create \
     --service=per-frontend --domain=bancotest.com --region=europe-west1
   # Actualizar registros en DonDominio con los valores exportados en 4.3
   ```

7. **Smoke tests**
   - Ejecutar `npm run test` o los scripts Playwright clave (`test-login-production.js`, `test-filtro-anuladas-playwright-produccion.js`).
   - Verificar `/health` del backend y dashboard de estadísticas.

8. **Reactivar CI/CD (opcional)**
   - Reimportar `GCP_SA_KEY` en GitHub Actions y re-habilitar workflows.

---

## 8. Checklist final antes de apagar Google Cloud

- [ ] `per_cloude_repo_20251124.bundle` y `per_cloude_files_20251124.tgz` guardados en 2 ubicaciones
- [ ] Export SQL (`per_db_backup_20251124.sql.gz`) + metadatos `cloudsql_instance_20251124.json`
- [ ] Archivos YAML/JSON de Cloud Run, Secret Manager, DNS y Artifact Registry guardados
- [ ] Validación de integridad (`shasum`) registrada
- [ ] Confirmación manual de descarga desde Cloud Storage
- [ ] Recursos GCP eliminados/verificados en consola de facturación

Con este flujo puedes suspender el entorno sin costes recurrentes y recrearlo rápidamente cuando vuelva a ser necesario.

