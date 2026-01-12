# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📖 Navegación Rápida

**Para entender la estructura completa del proyecto, consulta: [`PROJECT_MAP.md`](PROJECT_MAP.md)**

El mapa del proyecto contiene:
- Arquitectura detallada del sistema
- Ubicación de todos los archivos importantes
- Puntos de entrada de APIs y frontend
- Guía de búsqueda por funcionalidad
- Flujos de trabajo comunes
- Convenciones de código

## Project Architecture

This is a Spanish maritime exam (PER - Patrón de Embarcaciones de Recreo) management system with two main components:

1. **Web Viewer** (`src/web/`): Interactive frontend for browsing and managing exam questions
2. **Flask API Server** (`scripts/servidores/`): Backend service for generating intelligent explanations using GPT-5

### Data Architecture
- **JSON Files**: Exam data stored in `data/json/` with unified format containing questions, answers, and explanations
- **Modular Structure**: 
  - `src/`: Main application code with CLI, processors, extractors, and web components
  - `scripts/`: Organized into analysis, fixes, debug, and server scripts
  - `data/`: JSON data files, PDFs, and temporary files

## CRITICAL SAFETY RULES

### Production Testing
⚠️ **ALWAYS run production tests after important changes!**

After deploying changes to API, database, or core functionality:
```bash
# Run comprehensive production tests
./scripts/test-production.sh

# Tests verify:
# - API health and database connectivity
# - All main pages load without errors
# - CORS functionality
# - Exam system works correctly
# - Statistics dashboard loads
# - Question browser functions

# See scripts/TEST_PRODUCTION_README.md for details
```

### Database Testing and Modifications
⚠️ **NEVER modify production data without backup first!**

Before any database modifications or testing:
```bash
# ALWAYS create backup first
./scripts/backup_before_test.sh

# Then perform tests/modifications
# Example: curl -X PUT http://localhost:5001/preguntas/...
```

### Backup and Restore Commands
```bash
# Create complete backup (RECOMMENDED)
make backup
# or directly:
./scripts/backup.sh

# Create backup before testing
./scripts/backup_before_test.sh

# Restore from backup
make restore FILE=backup_completo_20250928_232240.sql
# or directly:
./scripts/restore.sh backup_completo_20250928_232240.sql

# List available backups
make list-backups

# Manual commands (alternatives)
docker exec -i per_postgres psql -U per_user -d per_exams < backups/backup_file.sql
```

## Common Development Commands

### Starting the Application
```bash
# Start web server (port 8095)
cd src/web && python3 -m http.server 8095

# Start Flask API server (port 5001) 
cd scripts/servidores && python3 api_explicaciones.py
```

### Using Makefile Commands
```bash
make help          # Show available commands
make web           # Start web server
make install       # Install dependencies  
make test          # Run tests (if available)
make deploy        # Deploy with security check
make status        # Show repository status
make clean         # Clean temporary files
```

### Development Workflow
```bash
pip install -r requirements.txt  # Install dependencies
make security                    # Run security checks before deployment
```

### Testing and Analysis
```bash
# Analysis scripts
cd scripts/analisis && python3 analizador_completo.py
cd scripts/analisis && python3 verificar_estado.py

# Debug and testing
cd scripts/debug && python3 test_duplicados.py
```

### Frontend Tests (Playwright)
```bash
# Test funcional completo del Banco de Preguntas (35 tests)
node tests/test-banco-preguntas.js

# Resultados se guardan en:
# - test-screenshots-banco/test-results.json
# - test-screenshots-banco/*.png (screenshots)
```

**Tests disponibles:**
| Script | Descripcion |
|--------|-------------|
| `tests/test-banco-preguntas.js` | Banco de preguntas: filtros, botones, paginacion, modales |

**Credenciales de test:** `testuser` / `123`

## Key Technical Details

### Configuration
- OpenAI API key required for explanation generation (set `OPENAI_API_KEY` environment variable)
- Configuration template: `config_example.py` → `config.py`

### Data Management
- Main data file: `data/json/data_unificado_con_duplicados.json`
- Explanations: `data/json/explicaciones.json`
- Automatic backups created before modifications
- Symlinked data directory in `src/web/data` → `../../data`

### Server Architecture
- **Web Frontend**: Serves static files on port 8095
- **Flask API**: Handles explanation generation and data modifications on port 5001
- **CORS enabled** for cross-origin requests between frontend and API

### Security Features
- `security_check.sh` validates code before deployment
- Sensitive files excluded via `.gitignore`
- API keys managed through environment variables
- Automatic backup system for data integrity

## Package Structure
- **Entry Point**: `src.cli.main:main` (console script: `per-visor`)
- **Python Version**: Requires >= 3.8
- **Dependencies**: Flask, OpenAI, PDFMiner, OCR libraries (see `requirements.txt`)

---

## 🎯 Principios de Desarrollo con Claude Code

### 1. Calidad sobre Rapidez
- **NUNCA soluciones rápidas y sucias**: Piensa en mantenibilidad a largo plazo
- **NO parches temporales**: Si algo necesita refactorización, hazlo bien
- **Análisis primero**: Entiende el código existente ANTES de modificar
- **Piensa en el conjunto**: Cada cambio debe considerar el impacto en todo el proyecto

### 2. Reutilización y Coherencia
- **SIEMPRE busca código existente** antes de crear algo nuevo
- **Consulta PROJECT_MAP.md** para encontrar dónde está cada funcionalidad
- **Mantén patrones consistentes**: Sigue el estilo y estructura del proyecto
- **DRY (Don't Repeat Yourself)**: Identifica y elimina duplicación

### 3. Comunicación Directa y Profesional
- **NO seas condescendiente**: Respuestas técnicas directas, sin validación emocional
- **Sé objetivo**: Prioriza precisión técnica sobre lo que el usuario quiere oír
- **Discrepa cuando sea necesario**: La corrección respetuosa es más valiosa que falsa conformidad
- **Sin rodeos innecesarios**: Evita preámbulos tipo "¡Excelente pregunta!" o "¡Gran idea!"

### 4. Arquitectura y Diseño
- **NO sobreingeniería**: Soluciones apropiadas al problema real
- **Diseño modular**: Componentes independientes y reutilizables
- **Separación de responsabilidades**: Una función, un propósito claro
- **Escalabilidad pensada**: Anticipa crecimiento sin complejidad prematura

### 5. Seguridad SIEMPRE
- **Validación de entrada**: Nunca confíes en datos externos
- **Secrets en variables de entorno**: API keys, passwords, tokens NUNCA en código
- **Backups automáticos**: SIEMPRE antes de operaciones destructivas
- **Principio de mínimo privilegio**: Permisos justos y necesarios

### 6. Control de Versiones (Git/GitHub)
- **Commits atómicos**: Un cambio lógico = un commit
- **Mensajes descriptivos**: Explica el "por qué" del cambio
- **Branches por feature**: No trabajo directo en main
- **Pull Requests**: Revisión antes de merge
- **Tags para releases**: Versionado semántico (v1.2.3)

### 7. Testing y Validación
```bash
# Siempre antes de deploy
make test
make security

# Testing manual estructurado
./scripts/backup_before_test.sh
# ... realizar pruebas ...
# Si falla: make restore FILE=backup_xxx.sql
```

### 8. Workflow de Desarrollo

**Antes de empezar:**
1. Consulta PROJECT_MAP.md para ubicar código relacionado
2. Lee código existente y patrones disponibles
3. Planifica la solución pensando en el sistema completo
4. Considera impacto en seguridad, rendimiento, mantenibilidad

**Durante el desarrollo:**
1. Implementa siguiendo patrones existentes
2. Escribe código limpio y testeable
3. Refactoriza código duplicado o problemático
4. Valida seguridad y edge cases

**Antes de commit:**
```bash
make security          # Validación de seguridad
git diff              # Revisa cambios
# Commit con mensaje descriptivo
```

### 9. Antipatrones a EVITAR

❌ **Soluciones temporales** que se vuelven permanentes
❌ **Copy-paste** sin entender el código
❌ **Hardcodear valores** que deberían ser configurables
❌ **Ignorar errores** sin logging apropiado
❌ **Commits gigantes** que mezclan múltiples cambios
❌ **Código comentado** (usa git para historial)
❌ **Dependencias innecesarias** que inflan el proyecto
❌ **Magic numbers**: `if x > 42:` → `if x > MAX_RETRIES:`

### 10. Checklist de Revisión

Antes de considerar completa una tarea:

- [ ] ¿Reutiliza código existente en lugar de duplicar?
- [ ] ¿Sigue los patrones arquitectónicos del proyecto?
- [ ] ¿Maneja errores apropiadamente?
- [ ] ¿Valida inputs y considera edge cases?
- [ ] ¿Tiene impacto en seguridad? (Si → revisión extra)
- [ ] ¿Logs apropiados para debugging?
- [ ] ¿Documentación necesaria actualizada?
- [ ] ¿Backup creado si modifica datos?
- [ ] ¿Tests añadidos/actualizados si procede?
- [ ] ¿Código limpio, legible, mantenible?

---

## 📚 Archivos de Referencia

- **PROJECT_MAP.md**: Mapa completo del proyecto y guía de navegación
- **CLAUDE.md**: Este archivo - Principios y comandos comunes
- **README.md**: Documentación general del proyecto
- **config_example.py**: Template de configuración
- **.claudeignore**: Archivos excluidos de búsquedas de Claude