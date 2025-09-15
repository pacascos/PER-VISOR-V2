# Nomenclatura Estándar para PDFs

## 📋 Formato Estándar

### PDFs de Preguntas
```
YYYY-MM-TIPO_examenes.pdf
```

Donde:
- `YYYY`: Año (4 dígitos)
- `MM`: Mes (2 dígitos: 01-12)
- `TIPO`: Tipo de convocatoria
  - `RECREO`: Convocatorias de recreo
  - `DGMM`: Convocatorias DGMM/oficiales

### PDFs de Respuestas
```
YYYY-MM-TIPO_respuestas.pdf
```

## 📁 Ejemplos de Nombres Correctos

### Preguntas
- `2025-06-RECREO_examenes.pdf`
- `2025-04-RECREO_examenes.pdf` 
- `2024-11-RECREO_examenes.pdf`
- `2024-06-RECREO_examenes.pdf`
- `2021-04-DGMM_examenes.pdf`

### Respuestas
- `2025-06-RECREO_respuestas.pdf`
- `2025-04-RECREO_respuestas.pdf`
- `2024-11-RECREO_respuestas.pdf`
- `2024-06-RECREO_respuestas.pdf`
- `2021-04-DGMM_respuestas.pdf`

## 🔧 Conversión desde Nombres Originales

### Patrones Comunes a Convertir

| Nombre Original | Nombre Estándar |
|----------------|-----------------|
| `enunciados_examenes_junio_2025 (1).pdf` | `2025-06-RECREO_examenes.pdf` |
| `plantilla_respuestas_examenes_junio_2025.pdf` | `2025-06-RECREO_respuestas.pdf` |
| `examenes_recreo_abril_2025.pdf` | `2025-04-RECREO_examenes.pdf` |
| `examenes_dgmm_25_abril_2021.pdf` | `2021-04-DGMM_examenes.pdf` |
| `enunciados_diciembre_2019.pdf` | `2019-12-RECREO_examenes.pdf` |

## 📂 Estructura de Directorios

```
data/pdfs/
├── preguntas/
│   ├── 2025-06-RECREO_examenes.pdf
│   ├── 2025-04-RECREO_examenes.pdf
│   ├── 2024-11-RECREO_examenes.pdf
│   └── ...
└── respuestas/
    ├── 2025-06-RECREO_respuestas.pdf
    ├── 2025-04-RECREO_respuestas.pdf
    ├── 2024-11-RECREO_respuestas.pdf
    └── ...
```

## 🎯 Beneficios de la Nomenclatura

1. **Ordenación automática**: Los archivos se ordenan cronológicamente
2. **Extracción automática**: El sistema puede extraer año, mes y tipo automáticamente
3. **Búsqueda eficiente**: Fácil localización de convocatorias específicas
4. **Mantenimiento**: Identificación clara de archivos huérfanos o duplicados
5. **Trazabilidad**: Correspondencia clara entre preguntas y respuestas

## ⚙️ Comandos para Conversión

```bash
# Analizar PDFs existentes y mostrar conversiones sugeridas
python -m src.cli organize --dry-run

# Ejecutar conversión de nomenclatura
python -m src.cli organize --source /ruta/pdfs/originales --target data/pdfs
```
