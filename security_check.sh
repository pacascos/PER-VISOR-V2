#!/bin/bash
# Script de verificación de seguridad antes de subir a GitHub

echo "🔒 VERIFICACIÓN DE SEGURIDAD"
echo "============================"

ISSUES_FOUND=0

# Función para reportar problemas
report_issue() {
    echo "❌ PROBLEMA ENCONTRADO: $1"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
}

# 1. Buscar patrones de claves de API REALES (no contenido oficial)
echo "🔍 Buscando API keys y tokens REALES..."
SUSPICIOUS_PATTERNS=$(grep -r -E "(api[_-]?key|password|secret)[[:space:]]*[:=][[:space:]]*['\"][^'\"]{10,}" --exclude-dir=.git --exclude="security_check.sh" --exclude=".gitignore" --exclude="*.pdf" --exclude="*.json" . 2>/dev/null || true)

if [ ! -z "$SUSPICIOUS_PATTERNS" ]; then
    echo "$SUSPICIOUS_PATTERNS" | head -3
    report_issue "Posibles claves de API REALES encontradas"
fi

# 2. Buscar archivos de configuración sensibles
echo "🔍 Buscando archivos de configuración sensibles..."
SENSITIVE_FILES=(.env .env.local config.json credentials.json service-account.json)
for file in "${SENSITIVE_FILES[@]}"; do
    if find . -name "$file" -not -path "./.git/*" | head -1 | grep -q .; then
        report_issue "Archivo sensible encontrado: $file"
    fi
done

# 3. Buscar claves SSH o certificados
echo "🔍 Buscando claves SSH y certificados..."
if find . -name "*.key" -o -name "*.pem" -o -name "id_rsa*" -not -path "./.git/*" | head -5 | grep -q .; then
    report_issue "Claves privadas o certificados encontrados"
fi

# 4. Verificar que .gitignore incluye patrones de seguridad
echo "🔍 Verificando .gitignore..."
REQUIRED_PATTERNS=(".env" "*.key" "*secret*" "*token*")
for pattern in "${REQUIRED_PATTERNS[@]}"; do
    if ! grep -q "$pattern" .gitignore; then
        report_issue ".gitignore no incluye patrón de seguridad: $pattern"
    fi
done

# 5. Buscar URLs con credenciales
echo "🔍 Buscando URLs con credenciales..."
if grep -r -E "https?://[^@]+:[^@]+@" --exclude-dir=.git . | head -3 | grep -q .; then
    report_issue "URLs con credenciales encontradas"
fi

# 6. Verificar archivos grandes que podrían contener datos sensibles
echo "🔍 Verificando archivos grandes..."
LARGE_FILES=$(find . -type f -size +100M -not -path "./.git/*" -not -name "*.pdf" 2>/dev/null)
if [ ! -z "$LARGE_FILES" ]; then
    echo "⚠️ Archivos grandes encontrados (verificar manualmente):"
    echo "$LARGE_FILES"
fi

# Resultado final
echo ""
echo "📊 RESULTADO DE LA VERIFICACIÓN"
echo "==============================="

if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ ¡VERIFICACIÓN EXITOSA!"
    echo "✅ No se encontraron problemas de seguridad"
    echo "✅ El repositorio es seguro para subir a GitHub"
    exit 0
else
    echo "❌ SE ENCONTRARON $ISSUES_FOUND PROBLEMAS"
    echo "❌ REVISAR Y CORREGIR ANTES DE SUBIR A GITHUB"
    echo ""
    echo "💡 ACCIONES RECOMENDADAS:"
    echo "1. Mover archivos sensibles fuera del repositorio"
    echo "2. Añadir patrones al .gitignore"
    echo "3. Usar variables de entorno para configuración"
    echo "4. Ejecutar: git rm --cached <archivo-sensible>"
    exit 1
fi
