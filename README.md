# 🚢 PER_Visor_Final - Sistema de Exámenes Náuticos

Sistema completo para visualización y gestión de exámenes náuticos con explicaciones inteligentes generadas por GPT-5.

## 🎯 Características Principales

- **Visor Web Interactivo**: Navegación por preguntas con filtros avanzados
- **Explicaciones Inteligentes**: Generación automática con GPT-5 y diagramas SVG
- **Edición de Preguntas**: Modificación de enunciados, opciones y respuestas
- **Base de Datos Completa**: 8 convocatorias (2023-2025) con 2782 preguntas
- **API Backend**: Servidor Flask para generación de explicaciones

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone https://github.com/pacascos/PER.git
cd PER
```

### 2. Configurar API Key de OpenAI
```bash
# Copiar archivo de ejemplo
cp config_example.py config.py

# Editar config.py y añadir tu clave API real
nano config.py
```

### 3. Instalar Dependencias
```bash
pip install -r requirements.txt
```

### 4. Iniciar Servidores

#### Servidor Web (Puerto 8095)
```bash
cd src/web
python3 -m http.server 8095
```

#### API Flask (Puerto 5001)
```bash
cd scripts/servidores
python3 api_explicaciones.py
```

### 5. Acceder al Sistema
- **Visor Web**: http://localhost:8095
- **API Health**: http://localhost:5001/health

## 📊 Datos Incluidos

- **8 Convocatorias**: 2023-2025 (Abril, Junio, Noviembre)
- **80 Exámenes**: PER, PNB, CY, PY
- **2782 Preguntas**: Con opciones y respuestas correctas
- **8 Explicaciones**: Migradas + generación automática

## 🛠️ Estructura del Proyecto

```
PER_Visor_Final/
├── src/web/                 # Frontend (HTML, CSS, JS)
├── scripts/servidores/      # Backend Flask API
├── data/json/              # Datos JSON unificados
├── data/pdfs/              # PDFs originales
└── docs/                   # Documentación técnica
```

## 🔧 Funcionalidades

### Visor Web
- Filtros por titulación, convocatoria y tema
- Búsqueda de texto en preguntas
- Navegación página por página
- Edición inline de preguntas
- Generación de explicaciones

### API Flask
- Generación de explicaciones con GPT-5
- Guardado persistente de cambios
- Sistema de backups automáticos
- Endpoints REST para todas las operaciones

## 🔒 Seguridad

- API keys en variables de entorno
- Archivos sensibles excluidos del repositorio
- Backups automáticos antes de modificaciones
- Validación de datos en frontend y backend

## 📝 Uso

1. **Visualizar Preguntas**: Usa los filtros para encontrar preguntas específicas
2. **Generar Explicaciones**: Haz clic en "Generar explicación" en cualquier pregunta
3. **Editar Preguntas**: Usa el botón "Editar" para modificar contenido
4. **Buscar**: Utiliza la barra de búsqueda para encontrar términos específicos

## 🐛 Solución de Problemas

### El servidor Flask no inicia
- Verifica que el puerto 5001 esté libre
- Asegúrate de tener configurada la API key de OpenAI

### Las explicaciones no se generan
- Verifica la conexión a internet
- Comprueba que la API key sea válida
- Revisa los logs del servidor Flask

### Los cambios no se guardan
- Verifica que el servidor Flask esté corriendo
- Comprueba los permisos de escritura en data/json/

## 📄 Licencia

Este proyecto es de uso educativo y personal.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request.

---

**Desarrollado con ❤️ para la comunidad náutica**