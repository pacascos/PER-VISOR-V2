#!/bin/bash

# ==============================================
# Script de Verificación de Servicios PER
# ==============================================
# Verifica que todos los servicios del proyecto PER estén funcionando correctamente

echo "🔍 VERIFICACIÓN DE SERVICIOS PER"
echo "================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar estado
show_status() {
    local service=$1
    local port=$2
    local url=$3
    local test_type=$4
    
    echo -e "${BLUE}📊 Verificando $service:${NC}"
    
    if [ "$test_type" = "port" ]; then
        if lsof -i :$port >/dev/null 2>&1; then
            echo -e "   ${GREEN}✅ Puerto $port activo${NC}"
        else
            echo -e "   ${RED}❌ Puerto $port no está en uso${NC}"
        fi
    elif [ "$test_type" = "http" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" $url 2>/dev/null)
        if [ "$response" = "200" ]; then
            echo -e "   ${GREEN}✅ HTTP $response - $service funcionando${NC}"
        else
            echo -e "   ${RED}❌ HTTP $response - $service no responde${NC}"
        fi
    elif [ "$test_type" = "api" ]; then
        response=$(curl -s $url 2>/dev/null)
        if [[ $response == *"healthy"* ]]; then
            echo -e "   ${GREEN}✅ API funcionando - $response${NC}"
        else
            echo -e "   ${RED}❌ API no responde${NC}"
        fi
    elif [ "$test_type" = "database" ]; then
        if pg_isready -h localhost -p $port >/dev/null 2>&1; then
            echo -e "   ${GREEN}✅ PostgreSQL aceptando conexiones${NC}"
        else
            echo -e "   ${RED}❌ PostgreSQL no responde${NC}"
        fi
    fi
    echo ""
}

# Verificación de servicios principales
echo -e "${YELLOW}1. SERVICIOS DOCKER:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep per_ || echo -e "${RED}❌ No se encontraron contenedores PER${NC}"
echo ""

echo -e "${YELLOW}2. VERIFICACIÓN DE PUERTOS:${NC}"
show_status "Frontend Web" "8095" "" "port"
show_status "API Backend" "5001" "" "port"
show_status "PostgreSQL" "5432" "" "port"
show_status "Redis" "6379" "" "port"

echo -e "${YELLOW}3. VERIFICACIÓN FUNCIONAL:${NC}"
show_status "Frontend" "" "http://localhost:8095/" "http"
show_status "API Health" "" "http://localhost:5001/health" "api"
show_status "PostgreSQL" "" "" "database"

echo -e "${YELLOW}4. URLS PRINCIPALES:${NC}"
echo -e "${BLUE}   🌐 Sistema principal:${NC} http://localhost:8095/"
echo -e "${BLUE}   📚 Visor de preguntas:${NC} http://localhost:8095/visor-nueva-arquitectura.html"
echo -e "${BLUE}   📊 Estadísticas:${NC} http://localhost:8095/statistics-dashboard.html"
echo -e "${BLUE}   📈 Dashboard de preguntas:${NC} http://localhost:8095/question-statistics-dashboard.html"
echo ""

echo -e "${YELLOW}5. RESUMEN:${NC}"
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8095/ 2>/dev/null)
api_status=$(curl -s http://localhost:5001/health 2>/dev/null | grep -o "healthy" || echo "error")
db_status=$(pg_isready -h localhost -p 5432 >/dev/null 2>&1 && echo "ready" || echo "error")

if [ "$frontend_status" = "200" ] && [[ $api_status == *"healthy"* ]] && [ "$db_status" = "ready" ]; then
    echo -e "   ${GREEN}✅ TODOS LOS SERVICIOS PRINCIPALES FUNCIONANDO${NC}"
    echo -e "   ${GREEN}✅ Sistema listo para usar${NC}"
    exit 0
else
    echo -e "   ${RED}❌ ALGÚN SERVICIO TIENE PROBLEMAS${NC}"
    echo -e "   ${YELLOW}💡 Revisa los detalles arriba${NC}"
    exit 1
fi
