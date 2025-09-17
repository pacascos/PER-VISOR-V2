#!/bin/bash
# Script simple de arranque para PER VISOR 2.0

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Arrancando PER VISOR 2.0...${NC}"
docker compose up -d

echo -e "${GREEN}✅ Aplicación corriendo${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "🌐 Frontend:   http://localhost:8095"
echo -e "🚀 API:        http://localhost:5001"
echo -e "🔍 API Health: http://localhost:5001/health"
echo -e "${BLUE}============================================${NC}"
echo -e "📊 Estado:     ./scripts/status.sh"
echo -e "🛑 Para parar: ./scripts/stop.sh"
echo -e "\n${GREEN}¡Listo para usar!${NC} 🎉"