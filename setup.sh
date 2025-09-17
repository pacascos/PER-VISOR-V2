#!/bin/bash

# Script de configuración para PER_Cloude
echo "🚢 Configurando PER_Cloude - Sistema de Exámenes Náuticos"
echo "=================================================="

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor, instala Docker primero."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Por favor, instala Docker Compose primero."
    exit 1
fi

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env desde env.example..."
    cp env.example .env
    echo "✅ Archivo .env creado. Por favor, edítalo con tu API key de OpenAI."
    echo "   nano .env"
    echo ""
    echo "⚠️  IMPORTANTE: Configura las siguientes variables:"
    echo "   - OPENAI_API_KEY: Tu clave API de OpenAI"
    echo "   - OPENAI_MODEL: Modelo a usar (gpt-4o, gpt-4, gpt-3.5-turbo, etc.)"
    echo ""
    read -p "¿Has configurado el archivo .env? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Por favor, configura el archivo .env y ejecuta este script nuevamente."
        exit 1
    fi
fi

# Construir y ejecutar con Docker Compose
echo "🔨 Construyendo y ejecutando servicios con Docker Compose..."
docker-compose up --build -d

# Verificar que los servicios estén funcionando
echo "🔍 Verificando servicios..."
sleep 10

if docker-compose ps | grep -q "Up"; then
    echo "✅ Servicios iniciados correctamente!"
    echo ""
    echo "🌐 Accede al sistema en:"
    echo "   - Visor Web: http://localhost:8095"
    echo "   - API Health: http://localhost:5001/health"
    echo "   - API Docs: http://localhost:5001/docs"
    echo ""
    echo "📋 Comandos útiles:"
    echo "   - Ver logs: docker-compose logs -f"
    echo "   - Detener: docker-compose down"
    echo "   - Reiniciar: docker-compose restart"
else
    echo "❌ Error al iniciar los servicios. Revisa los logs:"
    echo "   docker-compose logs"
fi
