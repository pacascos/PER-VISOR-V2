#!/bin/bash
# Script simple de parada para PER VISOR 2.0

# Colores para output
RED='\033[0;31m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${BLUE}🛑 Parando PER VISOR 2.0...${NC}"
docker compose down

echo -e "${GREEN}✅ Aplicación parada${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "Los servicios han sido detenidos"
echo -e "▶️ Para arrancar: ./scripts/start.sh"
echo -e "${BLUE}============================================${NC}"
echo -e "\n${GREEN}¡Servicios detenidos correctamente!${NC} ✅"