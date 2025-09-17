#!/bin/bash
# Script simple de estado para PER VISOR 2.0

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📊 Estado de PER VISOR 2.0${NC}"
echo -e "${BLUE}=========================${NC}"

# Mostrar contenedores
echo -e "\n${YELLOW}🐳 Contenedores Docker:${NC}"
docker compose ps

# Verificar servicios
echo -e "\n${YELLOW}🔍 Verificación de servicios:${NC}"

if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API: Disponible (http://localhost:5001)${NC}"
else
    echo -e "${YELLOW}⚠️ API: No disponible${NC}"
fi

if curl -s http://localhost:8095/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Web: Disponible (http://localhost:8095)${NC}"
else
    echo -e "${YELLOW}⚠️ Web: No disponible${NC}"
fi

echo -e "\n${BLUE}⚙️ Comandos útiles:${NC}"
echo -e "▶️ Arrancar:    ./scripts/start.sh"
echo -e "⏹️ Parar:       ./scripts/stop.sh"
echo -e "📝 Ver logs:    docker compose logs -f"
echo -e "🔄 Reiniciar:   docker compose restart"