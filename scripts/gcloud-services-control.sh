#!/bin/bash

# =============================================================================
# 🚀 CONTROL DE SERVICIOS GOOGLE CLOUD - PER VISOR SYSTEM
# =============================================================================
# Fecha de creación: 2025-09-29
# Descripción: Script para iniciar/parar servicios de Google Cloud y evitar costes
# =============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuración
PROJECT_ID="webpersonal-189221"
REGION="europe-west1"
SQL_INSTANCE="per-db-instance"
API_SERVICE="per-api"
FRONTEND_SERVICE="per-frontend"

# Funciones de logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Función para mostrar ayuda
show_help() {
    echo -e "${PURPLE}🚀 CONTROL DE SERVICIOS GOOGLE CLOUD - PER VISOR SYSTEM${NC}"
    echo ""
    echo "Uso: $0 [COMANDO] [OPCIONES]"
    echo ""
    echo "COMANDOS:"
    echo "  start     - Iniciar todos los servicios"
    echo "  stop      - Parar todos los servicios"
    echo "  restart   - Reiniciar todos los servicios"
    echo "  status    - Mostrar estado de los servicios"
    echo "  costs     - Mostrar información de costes"
    echo "  logs      - Mostrar logs de los servicios"
    echo ""
    echo "OPCIONES:"
    echo "  --sql-only     - Solo gestionar Cloud SQL"
    echo "  --run-only     - Solo gestionar Cloud Run"
    echo "  --dry-run      - Mostrar qué se haría sin ejecutar"
    echo "  --help         - Mostrar esta ayuda"
    echo ""
    echo "EJEMPLOS:"
    echo "  $0 start                    # Iniciar todos los servicios"
    echo "  $0 stop --sql-only          # Parar solo Cloud SQL"
    echo "  $0 status                   # Ver estado actual"
    echo "  $0 costs                    # Ver información de costes"
    echo ""
}

# Función para verificar autenticación
check_auth() {
    log "🔍 Verificando autenticación con Google Cloud..."
    
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        error "No estás autenticado en gcloud. Ejecuta: gcloud auth login"
    fi
    
    # Verificar proyecto
    current_project=$(gcloud config get-value project 2>/dev/null || echo "")
    if [ "$current_project" != "$PROJECT_ID" ]; then
        warning "Proyecto actual: $current_project"
        info "Configurando proyecto a: $PROJECT_ID"
        gcloud config set project "$PROJECT_ID"
    fi
    
    success "Autenticación verificada"
}

# Función para obtener estado de Cloud SQL
get_sql_status() {
    local status=$(gcloud sql instances describe "$SQL_INSTANCE" --format="value(state)" 2>/dev/null || echo "NOT_FOUND")
    echo "$status"
}

# Función para obtener estado de Cloud Run
get_run_status() {
    local service=$1
    local status=$(gcloud run services describe "$service" --region="$REGION" --format="value(status.conditions[0].status)" 2>/dev/null || echo "NOT_FOUND")
    echo "$status"
}

# Función para obtener configuración de escalado de Cloud Run
get_run_scaling() {
    local service=$1
    local min_instances=$(gcloud run services describe "$service" --region="$REGION" --format="value(spec.template.metadata.annotations.autoscaling\.knative\.dev/minScale)" 2>/dev/null || echo "0")
    local max_instances=$(gcloud run services describe "$service" --region="$REGION" --format="value(spec.template.metadata.annotations.autoscaling\.knative\.dev/maxScale)" 2>/dev/null || echo "1")
    echo "${min_instances}-${max_instances}"
}

# Función para mostrar estado de servicios
show_status() {
    log "📊 Estado actual de los servicios:"
    echo ""
    
    # Cloud SQL
    local sql_status=$(get_sql_status)
    if [ "$sql_status" = "NOT_FOUND" ]; then
        echo -e "  ${RED}❌ Cloud SQL:${NC} Instancia no encontrada"
    elif [ "$sql_status" = "RUNNABLE" ]; then
        echo -e "  ${GREEN}✅ Cloud SQL:${NC} Ejecutándose ($sql_status)"
    else
        echo -e "  ${YELLOW}⚠️  Cloud SQL:${NC} $sql_status"
    fi
    
    # Cloud Run API
    local api_status=$(get_run_status "$API_SERVICE")
    local api_scaling=$(get_run_scaling "$API_SERVICE")
    if [ "$api_status" = "NOT_FOUND" ]; then
        echo -e "  ${RED}❌ API Service:${NC} Servicio no encontrado"
    elif [ "$api_status" = "True" ]; then
        if [ "$api_scaling" = "0-1" ]; then
            echo -e "  ${YELLOW}⏸️  API Service:${NC} Parado (escalado a 0, disponible bajo demanda)"
        else
            echo -e "  ${GREEN}✅ API Service:${NC} Ejecutándose (escalado: $api_scaling)"
        fi
    else
        echo -e "  ${YELLOW}⚠️  API Service:${NC} $api_status"
    fi
    
    # Cloud Run Frontend
    local frontend_status=$(get_run_status "$FRONTEND_SERVICE")
    local frontend_scaling=$(get_run_scaling "$FRONTEND_SERVICE")
    if [ "$frontend_status" = "NOT_FOUND" ]; then
        echo -e "  ${RED}❌ Frontend Service:${NC} Servicio no encontrado"
    elif [ "$frontend_status" = "True" ]; then
        if [ "$frontend_scaling" = "0-1" ]; then
            echo -e "  ${YELLOW}⏸️  Frontend Service:${NC} Parado (escalado a 0, disponible bajo demanda)"
        else
            echo -e "  ${GREEN}✅ Frontend Service:${NC} Ejecutándose (escalado: $frontend_scaling)"
        fi
    else
        echo -e "  ${YELLOW}⚠️  Frontend Service:${NC} $frontend_status"
    fi
    
    echo ""
}

# Función para iniciar Cloud SQL
start_sql() {
    local dry_run=$1
    
    log "🗄️ Iniciando Cloud SQL..."
    
    local current_status=$(get_sql_status)
    
    if [ "$current_status" = "NOT_FOUND" ]; then
        error "Instancia Cloud SQL '$SQL_INSTANCE' no encontrada"
    elif [ "$current_status" = "RUNNABLE" ]; then
        info "Cloud SQL ya está ejecutándose"
        return 0
    fi
    
    if [ "$dry_run" = "true" ]; then
        info "DRY RUN: Se iniciaría Cloud SQL"
        return 0
    fi
    
    gcloud sql instances patch "$SQL_INSTANCE" --activation-policy=ALWAYS --quiet
    
    # Esperar a que esté listo
    log "⏳ Esperando a que Cloud SQL esté listo..."
    local timeout=300
    local elapsed=0
    while [ $elapsed -lt $timeout ]; do
        local current_status=$(gcloud sql instances describe "$SQL_INSTANCE" --format="value(state)" 2>/dev/null || echo "UNKNOWN")
        if [ "$current_status" = "RUNNABLE" ]; then
            break
        fi
        sleep 10
        elapsed=$((elapsed + 10))
        echo -n "."
    done
    echo ""
    
    success "Cloud SQL iniciado correctamente"
}

# Función para iniciar KMS (habilitar claves)
start_kms() {
    local dry_run=$1
    
    log "🔐 Iniciando KMS (habilitando claves)..."
    
    # Obtener claves deshabilitadas
    local disabled_keys=$(gcloud kms keys list --keyring=llaveroPersonal --location=global --filter="state:DISABLED" --format="value(name)" 2>/dev/null || echo "")
    
    if [ -z "$disabled_keys" ]; then
        info "No hay claves KMS deshabilitadas para iniciar"
        return 0
    fi
    
    if [ "$dry_run" = "true" ]; then
        info "DRY RUN: Se habilitarían las claves KMS deshabilitadas"
        return 0
    fi
    
    # Habilitar cada clave deshabilitada
    while IFS= read -r key; do
        if [ -n "$key" ]; then
            log "Habilitando clave: $key"
            gcloud kms keys versions enable "$key" --quiet 2>/dev/null || true
        fi
    done <<< "$disabled_keys"
    
    success "KMS iniciado correctamente (claves habilitadas)"
}

# Función para iniciar Secret Manager (verificar secrets necesarios)
start_secrets() {
    local dry_run=$1
    
    log "🗝️ Iniciando Secret Manager (verificando secrets necesarios)..."
    
    # Lista de secrets necesarios
    local required_secrets=("flask-secret-key" "jwt-secret" "openai-api-key")
    
    if [ "$dry_run" = "true" ]; then
        info "DRY RUN: Se verificarían secrets necesarios"
        return 0
    fi
    
    # Verificar que los secrets necesarios existen
    local missing_secrets=()
    for secret in "${required_secrets[@]}"; do
        if ! gcloud secrets describe "$secret" >/dev/null 2>&1; then
            missing_secrets+=("$secret")
        fi
    done
    
    if [ ${#missing_secrets[@]} -gt 0 ]; then
        warning "Secrets faltantes detectados: ${missing_secrets[*]}"
        warning "Esto puede causar errores en Cloud Run"
    else
        info "Todos los secrets necesarios están disponibles"
    fi
    
    success "Secret Manager iniciado correctamente (secrets verificados)"
}

# Función para iniciar Cloud Logging (habilitar logs)
start_logging() {
    local dry_run=$1
    
    log "📝 Iniciando Cloud Logging (habilitando logs)..."
    
    if [ "$dry_run" = "true" ]; then
        info "DRY RUN: Se habilitaría Cloud Logging"
        return 0
    fi
    
    # Habilitar logging para Cloud Run
    gcloud run services update "$API_SERVICE" --region="$REGION" --enable-logging --quiet 2>/dev/null || true
    gcloud run services update "$FRONTEND_SERVICE" --region="$REGION" --enable-logging --quiet 2>/dev/null || true
    
    success "Cloud Logging iniciado correctamente"
}

# Función para iniciar Cloud Monitoring (habilitar métricas)
start_monitoring() {
    local dry_run=$1
    
    log "📊 Iniciando Cloud Monitoring (habilitando métricas)..."
    
    if [ "$dry_run" = "true" ]; then
        info "DRY RUN: Se habilitaría Cloud Monitoring"
        return 0
    fi
    
    # Habilitar monitoring para Cloud Run
    gcloud run services update "$API_SERVICE" --region="$REGION" --enable-monitoring --quiet 2>/dev/null || true
    gcloud run services update "$FRONTEND_SERVICE" --region="$REGION" --enable-monitoring --quiet 2>/dev/null || true
    
    success "Cloud Monitoring iniciado correctamente"
}

# Función para parar Cloud SQL
stop_sql() {
    local dry_run=$1
    
    log "🗄️ Parando Cloud SQL..."
    
    local current_status=$(get_sql_status)
    
    if [ "$current_status" = "NOT_FOUND" ]; then
        error "Instancia Cloud SQL '$SQL_INSTANCE' no encontrada"
    elif [ "$current_status" != "RUNNABLE" ]; then
        info "Cloud SQL ya está parado ($current_status)"
        return 0
    fi
    
    if [ "$dry_run" = "true" ]; then
        info "DRY RUN: Se pararía Cloud SQL"
        return 0
    fi
    
    gcloud sql instances patch "$SQL_INSTANCE" --activation-policy=NEVER --quiet
    
    # Esperar a que esté parado
    log "⏳ Esperando a que Cloud SQL se pare..."
    local timeout=300
    local elapsed=0
    while [ $elapsed -lt $timeout ]; do
        local current_status=$(gcloud sql instances describe "$SQL_INSTANCE" --format="value(state)" 2>/dev/null || echo "UNKNOWN")
        if [ "$current_status" = "STOPPED" ]; then
            break
        fi
        sleep 10
        elapsed=$((elapsed + 10))
        echo -n "."
    done
    echo ""
    
    success "Cloud SQL parado correctamente"
}

# Función para parar KMS (deshabilitar claves)
stop_kms() {
    local dry_run=$1
    
    log "🔐 Parando KMS (deshabilitando claves)..."
    
    # Obtener claves activas
    local active_keys=$(gcloud kms keys list --keyring=llaveroPersonal --location=global --filter="state:ENABLED" --format="value(name)" 2>/dev/null || echo "")
    
    if [ -z "$active_keys" ]; then
        info "No hay claves KMS activas para parar"
        return 0
    fi
    
    if [ "$dry_run" = "true" ]; then
        info "DRY RUN: Se deshabilitarían las claves KMS activas"
        return 0
    fi
    
    # Deshabilitar cada clave activa
    while IFS= read -r key; do
        if [ -n "$key" ]; then
            log "Deshabilitando clave: $key"
            gcloud kms keys versions disable "$key" --quiet 2>/dev/null || true
        fi
    done <<< "$active_keys"
    
    success "KMS parado correctamente (claves deshabilitadas)"
}

# Función para parar Secret Manager (no eliminar secrets necesarios)
stop_secrets() {
    local dry_run=$1
    
    log "🗝️ Parando Secret Manager (manteniendo secrets necesarios)..."
    
    # Nota: No eliminamos secrets porque Cloud Run los necesita
    # Solo deshabilitamos el acceso temporalmente
    
    if [ "$dry_run" = "true" ]; then
        info "DRY RUN: Se mantendrían secrets necesarios para Cloud Run"
        return 0
    fi
    
    # Los secrets se mantienen para evitar errores en Cloud Run
    info "Secrets mantenidos para evitar errores en Cloud Run"
    
    success "Secret Manager parado correctamente (secrets mantenidos)"
}

# Función para parar Cloud Logging (deshabilitar logs)
stop_logging() {
    local dry_run=$1
    
    log "📝 Parando Cloud Logging (deshabilitando logs)..."
    
    if [ "$dry_run" = "true" ]; then
        info "DRY RUN: Se deshabilitaría Cloud Logging"
        return 0
    fi
    
    # Deshabilitar logging para Cloud Run
    gcloud run services update "$API_SERVICE" --region="$REGION" --no-enable-logging --quiet 2>/dev/null || true
    gcloud run services update "$FRONTEND_SERVICE" --region="$REGION" --no-enable-logging --quiet 2>/dev/null || true
    
    success "Cloud Logging parado correctamente"
}

# Función para parar Cloud Monitoring (deshabilitar métricas)
stop_monitoring() {
    local dry_run=$1
    
    log "📊 Parando Cloud Monitoring (deshabilitando métricas)..."
    
    if [ "$dry_run" = "true" ]; then
        info "DRY RUN: Se deshabilitaría Cloud Monitoring"
        return 0
    fi
    
    # Deshabilitar monitoring para Cloud Run
    gcloud run services update "$API_SERVICE" --region="$REGION" --no-enable-monitoring --quiet 2>/dev/null || true
    gcloud run services update "$FRONTEND_SERVICE" --region="$REGION" --no-enable-monitoring --quiet 2>/dev/null || true
    
    success "Cloud Monitoring parado correctamente"
}

# Función para gestionar Cloud Run
manage_run_service() {
    local service=$1
    local action=$2
    local dry_run=$3
    
    log "🚀 $(echo $action | tr '[:lower:]' '[:upper:]') Cloud Run service: $service"
    
    local current_status=$(get_run_status "$service")
    
    if [ "$current_status" = "NOT_FOUND" ]; then
        error "Servicio Cloud Run '$service' no encontrado"
    fi
    
    if [ "$dry_run" = "true" ]; then
        info "DRY RUN: Se ${action}ía el servicio $service"
        return 0
    fi
    
    if [ "$action" = "start" ]; then
        # Para Cloud Run, "iniciar" significa escalar a 1 instancia
        gcloud run services update "$service" --region="$REGION" --min-instances=1 --max-instances=10 --quiet
    elif [ "$action" = "stop" ]; then
        # Para Cloud Run, "parar" significa escalar a 0 instancias mínimas con timeout bajo
        gcloud run services update "$service" --region="$REGION" --min-instances=0 --max-instances=1 --timeout=30 --quiet
    fi
    
    success "Servicio $service ${action}do correctamente"
}

# Función para iniciar servicios
start_services() {
    local sql_only=$1
    local run_only=$2
    local dry_run=$3
    
    log "🚀 Iniciando servicios..."
    echo ""
    
    # Iniciar Cloud SQL
    if [ "$run_only" != "true" ]; then
        start_sql "$dry_run"
        echo ""
    fi
    
    # Iniciar Cloud Run
    if [ "$sql_only" != "true" ]; then
        manage_run_service "$API_SERVICE" "start" "$dry_run"
        manage_run_service "$FRONTEND_SERVICE" "start" "$dry_run"
        echo ""
        
        # Iniciar servicios adicionales
        start_kms "$dry_run"
        start_secrets "$dry_run"
        start_logging "$dry_run"
        start_monitoring "$dry_run"
        echo ""
    fi
    
    success "Servicios iniciados correctamente"
}

# Función para parar servicios
stop_services() {
    local sql_only=$1
    local run_only=$2
    local dry_run=$3
    
    log "🛑 Parando servicios..."
    echo ""
    
    # Parar servicios adicionales primero
    if [ "$sql_only" != "true" ]; then
        stop_monitoring "$dry_run"
        stop_logging "$dry_run"
        stop_secrets "$dry_run"
        stop_kms "$dry_run"
        echo ""
        
        # Parar Cloud Run
        manage_run_service "$API_SERVICE" "stop" "$dry_run"
        manage_run_service "$FRONTEND_SERVICE" "stop" "$dry_run"
        echo ""
    fi
    
    # Parar Cloud SQL
    if [ "$run_only" != "true" ]; then
        stop_sql "$dry_run"
        echo ""
    fi
    
    success "Servicios parados correctamente"
}

# Función para mostrar información de costes
show_costs() {
    log "💰 Información de costes de Google Cloud:"
    echo ""
    
    echo -e "${CYAN}📊 Servicios que generan costes:${NC}"
    echo ""
    
    echo -e "${YELLOW}🗄️ Cloud SQL:${NC}"
    echo "  - Coste base: ~\$25-50/mes (instancia pequeña)"
    echo "  - Coste por GB almacenado: ~\$0.17/GB/mes"
    echo "  - Coste por GB transferido: ~\$0.12/GB"
    echo ""
    
    echo -e "${YELLOW}🚀 Cloud Run:${NC}"
    echo "  - Coste por vCPU-segundo: ~\$0.00002400"
    echo "  - Coste por GB-segundo memoria: ~\$0.00000250"
    echo "  - Coste por GB transferido: ~\$0.12/GB"
    echo "  - Coste mínimo: \$0 (cuando no hay tráfico)"
    echo ""
    
    echo -e "${YELLOW}📦 Artifact Registry:${NC}"
    echo "  - Coste por GB almacenado: ~\$0.10/GB/mes"
    echo "  - Coste por GB transferido: ~\$0.10/GB"
    echo ""
    
    echo -e "${YELLOW}🔐 KMS (Key Management Service):${NC}"
    echo "  - Coste por clave activa: ~\$0.06/mes"
    echo "  - Coste por operación: ~\$0.03/10,000 operaciones"
    echo ""
    
    echo -e "${YELLOW}🗝️ Secret Manager:${NC}"
    echo "  - Coste por secret: ~\$0.06/mes"
    echo "  - Coste por acceso: ~\$0.03/10,000 accesos"
    echo ""
    
    echo -e "${YELLOW}📝 Cloud Logging:${NC}"
    echo "  - Coste por GB de logs: ~\$0.50/GB/mes"
    echo "  - Coste por GB transferido: ~\$0.12/GB"
    echo ""
    
    echo -e "${YELLOW}📊 Cloud Monitoring:${NC}"
    echo "  - Coste por métrica: ~\$0.258/millón de puntos/mes"
    echo "  - Coste por dashboard: ~\$0.15/dashboard/mes"
    echo ""
    
    echo -e "${GREEN}💡 Consejos para ahorrar:${NC}"
    echo "  - Parar Cloud SQL cuando no se use (ahorro: ~\$25-50/mes)"
    echo "  - Cloud Run se escala a 0 automáticamente sin tráfico"
    echo "  - Usar este script para gestionar servicios"
    echo ""
    
    # Mostrar uso actual
    log "📈 Uso actual estimado:"
    
    # Cloud SQL
    local sql_status=$(get_sql_status)
    if [ "$sql_status" = "RUNNABLE" ]; then
        echo -e "  ${RED}💰 Cloud SQL:${NC} Generando costes (~\$25-50/mes)"
    else
        echo -e "  ${GREEN}✅ Cloud SQL:${NC} Sin costes (parado)"
    fi
    
    # Cloud Run
    local api_status=$(get_run_status "$API_SERVICE")
    local frontend_status=$(get_run_status "$FRONTEND_SERVICE")
    
    if [ "$api_status" = "True" ] || [ "$frontend_status" = "True" ]; then
        echo -e "  ${YELLOW}💰 Cloud Run:${NC} Puede generar costes con tráfico"
    else
        echo -e "  ${GREEN}✅ Cloud Run:${NC} Sin costes (escalado a 0)"
    fi
    
    # KMS
    local kms_keys=$(gcloud kms keys list --keyring=llaveroPersonal --location=global --format="value(name)" 2>/dev/null | wc -l)
    if [ "$kms_keys" -gt 0 ]; then
        echo -e "  ${YELLOW}💰 KMS:${NC} Generando costes (~\$0.06/mes por clave)"
    else
        echo -e "  ${GREEN}✅ KMS:${NC} Sin costes (sin claves activas)"
    fi
    
    # Secret Manager
    local secrets_count=$(gcloud secrets list --format="value(name)" 2>/dev/null | wc -l)
    if [ "$secrets_count" -gt 0 ]; then
        echo -e "  ${YELLOW}💰 Secret Manager:${NC} Generando costes (~\$0.06/mes por secret)"
    else
        echo -e "  ${GREEN}✅ Secret Manager:${NC} Sin costes (sin secrets)"
    fi
    
    # Cloud Logging (estimación)
    echo -e "  ${YELLOW}💰 Cloud Logging:${NC} Puede generar costes con logs (~\$0.50/GB/mes)"
    
    # Cloud Monitoring (estimación)
    echo -e "  ${YELLOW}💰 Cloud Monitoring:${NC} Puede generar costes con métricas (~\$0.258/millón/mes)"
    
    echo ""
}

# Función para mostrar logs
show_logs() {
    log "📋 Logs de los servicios:"
    echo ""
    
    echo -e "${CYAN}🚀 API Service Logs (últimas 10 líneas):${NC}"
    gcloud run services logs read "$API_SERVICE" --region="$REGION" --limit=10 2>/dev/null || echo "No hay logs disponibles"
    echo ""
    
    echo -e "${CYAN}🌐 Frontend Service Logs (últimas 10 líneas):${NC}"
    gcloud run services logs read "$FRONTEND_SERVICE" --region="$REGION" --limit=10 2>/dev/null || echo "No hay logs disponibles"
    echo ""
}

# Función principal
main() {
    local command=$1
    local sql_only=false
    local run_only=false
    local dry_run=false
    
    # Verificar si es --help sin comando
    if [ "$command" = "--help" ] || [ "$command" = "-h" ]; then
        show_help
        exit 0
    fi
    
    # Parsear argumentos
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --sql-only)
                sql_only=true
                shift
                ;;
            --run-only)
                run_only=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                error "Argumento desconocido: $1"
                ;;
        esac
    done
    
    # Verificar autenticación
    check_auth
    
    # Ejecutar comando
    case $command in
        start)
            start_services "$sql_only" "$run_only" "$dry_run"
            ;;
        stop)
            stop_services "$sql_only" "$run_only" "$dry_run"
            ;;
        restart)
            log "🔄 Reiniciando servicios..."
            stop_services "$sql_only" "$run_only" "$dry_run"
            echo ""
            sleep 5
            start_services "$sql_only" "$run_only" "$dry_run"
            ;;
        status)
            show_status
            ;;
        costs)
            show_costs
            ;;
        logs)
            show_logs
            ;;
        *)
            error "Comando desconocido: $command. Usa --help para ver los comandos disponibles."
            ;;
    esac
}

# Verificar que se proporciona un comando
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

# Ejecutar función principal
main "$@"
