# Makefile para PER Visor - Comandos rápidos de despliegue

.PHONY: help setup deploy status clean web

help:  ## 📖 Mostrar ayuda
	@echo "🎯 PER VISOR - COMANDOS DE DESPLIEGUE"
	@echo "====================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup:  ## 🔧 Configuración inicial para GitHub
	@chmod +x setup_github.sh
	@./setup_github.sh

deploy:  ## 🚀 Desplegar cambios a GitHub (con verificación de seguridad)
	@chmod +x security_check.sh deploy.sh
	@echo "🔒 Ejecutando verificación de seguridad..."
	@./security_check.sh
	@echo "✅ Verificación exitosa, procediendo con el despliegue..."
	@./deploy.sh "📈 Actualización desde Cursor - $(shell date '+%Y-%m-%d %H:%M')"

deploy-msg:  ## 🚀 Desplegar con mensaje personalizado (uso: make deploy-msg MSG="tu mensaje")
	@chmod +x security_check.sh deploy.sh
	@echo "🔒 Ejecutando verificación de seguridad..."
	@./security_check.sh
	@echo "✅ Verificación exitosa, procediendo con el despliegue..."
	@./deploy.sh "$(MSG)"

security:  ## 🔒 Ejecutar solo verificación de seguridad
	@chmod +x security_check.sh
	@./security_check.sh

status:  ## 📊 Ver estado del repositorio
	@echo "📍 ESTADO DEL REPOSITORIO"
	@echo "========================"
	@echo "🌿 Rama actual: $(shell git branch --show-current)"
	@echo "📝 Último commit: $(shell git log -1 --pretty=format:'%h - %s (%an, %ar)')"
	@echo "🔄 Estado de archivos:"
	@git status --short
	@echo ""
	@echo "📊 Estadísticas:"
	@echo "  - Archivos JSON: $(shell find . -name '*.json' | wc -l | tr -d ' ')"
	@echo "  - Archivos Python: $(shell find . -name '*.py' | wc -l | tr -d ' ')"
	@echo "  - Archivos PDF: $(shell find . -name '*.pdf' | wc -l | tr -d ' ')"

web:  ## 🌐 Iniciar servidor web local
	@echo "🌐 Iniciando servidor web en http://localhost:8095"
	@cd src/web && python3 -m http.server 8095

clean:  ## 🧹 Limpiar archivos temporales
	@echo "🧹 Limpiando archivos temporales..."
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	@find . -name "temp_*" -delete
	@find . -name "debug_*" -delete
	@echo "✅ Limpieza completada"

github:  ## 🔗 Abrir repositorio en GitHub
	@open "https://github.com/pacascos/PER"

# Reglas especiales para desarrollo
install:  ## 📦 Instalar dependencias
	@pip install -r requirements.txt

test:  ## 🧪 Ejecutar tests (si existen)
	@if [ -d "tests" ]; then python -m pytest tests/ -v; else echo "No hay tests configurados"; fi

backup:  ## 💾 Crear backup completo de la base de datos
	@echo "🔄 Creando backup completo de la base de datos..."
	@./scripts/backup.sh

restore:  ## 🔄 Restaurar desde backup (uso: make restore FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "❌ Error: Especifica el archivo de backup"; \
		echo "💡 Uso: make restore FILE=backup_completo_20250916_155823.sql"; \
		echo ""; \
		echo "📄 Archivos de backup disponibles:"; \
		ls -la backups/*.sql 2>/dev/null || echo "  No hay backups disponibles"; \
		exit 1; \
	fi
	@echo "🔄 Restaurando desde backup: $(FILE)"
	@./scripts/restore.sh $(FILE)

list-backups:  ## 📋 Listar todos los backups disponibles
	@echo "📄 BACKUPS DISPONIBLES"
	@echo "===================="
	@if [ -d "backups" ]; then \
		ls -la backups/*.sql 2>/dev/null | while read line; do \
			echo "📄 $$line"; \
		done; \
	else \
		echo "❌ No se encontró el directorio de backups"; \
	fi
