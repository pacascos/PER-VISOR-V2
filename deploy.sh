#!/bin/bash
# Script de despliegue automático para PER Visor
# Uso: ./deploy.sh "mensaje del commit"

set -e  # Salir si hay error

echo "🚀 INICIANDO DESPLIEGUE A GITHUB"
echo "=================================="

# Verificar que hay cambios
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ No hay cambios para commitear"
    echo "🔄 Intentando push..."
else
    echo "📝 Añadiendo cambios..."
    git add .
    
    # Usar mensaje del parámetro o uno por defecto
    COMMIT_MSG="${1:-📈 Actualización automática del sistema PER Visor}"
    
    echo "💾 Commiteando: $COMMIT_MSG"
    git commit -m "$COMMIT_MSG"
fi

# Intentar push normal primero
echo "🔄 Subiendo a GitHub..."
if git push origin main; then
    echo "✅ ¡Despliegue exitoso!"
    echo "🌐 Ver en: https://github.com/pacascos/PER"
else
    echo "⚠️ Error en push normal, verificando archivos grandes..."
    
    # Verificar archivos grandes
    echo "📊 Archivos más grandes:"
    find . -type f -size +50M | head -10
    
    echo ""
    echo "💡 SOLUCIONES DISPONIBLES:"
    echo "1. Usar Git LFS: git lfs track '*.pdf' && git add .gitattributes"
    echo "2. Ignorar PDFs: echo 'data/pdfs/' >> .gitignore"
    echo "3. Comprimir archivos grandes"
    
    exit 1
fi

echo ""
echo "🎯 DESPLIEGUE COMPLETO"
echo "======================"
echo "📍 Repositorio: https://github.com/pacascos/PER.git"
echo "📊 Estado: $(git log -1 --pretty=format:'%h - %s (%an, %ar)')"
