#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Archivos a limpiar
const filesToClean = [
    'src/web/visor-nueva-arquitectura.html',
    'src/web/script.js',
    'src/web/statistics-manager.js',
    'src/web/exam-system.js'
];

// Patrones de logs a limpiar (mantener solo errores importantes)
const logPatterns = [
    /console\.log\([^)]*\);?/g,
    /console\.info\([^)]*\);?/g,
    /console\.debug\([^)]*\);?/g,
    // Mantener console.error y console.warn para debugging
];

// Patrones de logs que NO queremos limpiar (errores importantes)
const keepPatterns = [
    /console\.error\([^)]*\);?/g,
    /console\.warn\([^)]*\);?/g,
];

function cleanLogs(content) {
    let cleaned = content;
    
    // Limpiar logs informativos
    logPatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, (match) => {
            // Verificar si es un error o warning que queremos mantener
            if (keepPatterns.some(keepPattern => keepPattern.test(match))) {
                return match;
            }
            // Comentar el log
            return '// ' + match;
        });
    });
    
    return cleaned;
}

function processFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  Archivo no encontrado: ${filePath}`);
            return;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const cleaned = cleanLogs(content);
        
        if (content !== cleaned) {
            fs.writeFileSync(filePath, cleaned, 'utf8');
            console.log(`✅ Limpiado: ${filePath}`);
        } else {
            console.log(`ℹ️  Sin cambios: ${filePath}`);
        }
    } catch (error) {
        console.error(`❌ Error procesando ${filePath}:`, error.message);
    }
}

// Procesar archivos
console.log('🧹 Limpiando logs de JavaScript...\n');

filesToClean.forEach(file => {
    processFile(file);
});

console.log('\n✨ Limpieza completada!');
