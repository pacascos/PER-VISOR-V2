# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
# Create backup before testing
./scripts/backup_before_test.sh

# Restore from backup if needed
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