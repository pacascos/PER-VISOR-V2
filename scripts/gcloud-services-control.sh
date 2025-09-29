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
    if [ "$api_status" = "NOT_FOUND" ]; then
        echo -e "  ${RED}❌ API Service:${NC} Servicio no encontrado"
    elif [ "$api_status" = "True" ]; then
        echo -e "  ${GREEN}✅ API Service:${NC} Ejecutándose"
    else
        echo -e "  ${YELLOW}⚠️  API Service:${NC} $api_status"
    fi
    
    # Cloud Run Frontend
    local frontend_status=$(get_run_status "$FRONTEND_SERVICE")
    if [ "$frontend_status" = "NOT_FOUND" ]; then
        echo -e "  ${RED}❌ Frontend Service:${NC} Servicio no encontrado"
    elif [ "$frontend_status" = "True" ]; then
        echo -e "  ${GREEN}✅ Frontend Service:${NC} Ejecutándose"
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
    gcloud sql instances describe "$SQL_INSTANCE" --format="value(state)" --filter="state:RUNNABLE" --timeout=300
    
    success "Cloud SQL iniciado correctamente"
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
    gcloud sql instances describe "$SQL_INSTANCE" --format="value(state)" --filter="state:STOPPED" --timeout=300
    
    success "Cloud SQL parado correctamente"
}

# Función para gestionar Cloud Run
manage_run_service() {
    local service=$1
    local action=$2
    local dry_run=$3
    
    log "🚀 ${action^} Cloud Run service: $service"
    
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
        # Para Cloud Run, "parar" significa escalar a 0 instancias
        gcloud run services update "$service" --region="$REGION" --min-instances=0 --max-instances=0 --quiet
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
    
    # Parar Cloud Run primero (para evitar errores)
    if [ "$sql_only" != "true" ]; then
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
