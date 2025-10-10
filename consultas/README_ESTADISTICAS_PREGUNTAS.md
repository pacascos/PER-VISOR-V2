# 📊 Estadísticas de Preguntas PER

## 📁 Archivos Generados

### 1. `preguntas_per_estadisticas.sql`
Contiene múltiples consultas SQL para analizar las preguntas:
- Consulta principal con todas las preguntas y estadísticas
- Variante solo con preguntas que han aparecido
- Variante con número de UT
- Resumen por UT
- Top 50 preguntas más falladas
- Exportación a CSV

### 2. `preguntas_per_estadisticas.csv`
**3,058 preguntas** del PER con las siguientes columnas:
- `pregunta_id`: UUID único de la pregunta
- `numero_pregunta`: Número de pregunta en el examen original
- `ut_nombre`: Nombre de la Unidad Temática
- `veces_salido`: Total de veces que ha aparecido en exámenes realizados
- `veces_fallada`: Total de veces que se ha respondido incorrectamente
- `veces_acertada`: Total de veces que se ha respondido correctamente
- `porcentaje_acierto`: Porcentaje de aciertos (0-100)
- `dificultad`: Puntuación de dificultad (0-100, mayor = más difícil)
- `texto_pregunta_preview`: Primeros 100 caracteres de la pregunta

**Total de registros:** 3,057 preguntas + 1 línea de encabezado

---

## 📊 Resumen por Unidad Temática

| UT | Total Preguntas | Apariciones | Fallos | Aciertos | % Acierto | Tasa Fallo |
|----|-----------------|-------------|--------|----------|-----------|------------|
| **Nomenclatura náutica** | 224 | 48 | 15 | 33 | 12.83% | 31.25% |
| **Reglamento (RIPA)** | 560 | 46 | 13 | 33 | 5.36% | 28.26% |
| **Teoría de la navegación** | 426 | 17 | 11 | 6 | 1.13% | **64.71%** 🔴 |
| **Seguridad** | 224 | 22 | 8 | 14 | 5.06% | 36.36% |
| **Balizamiento** | 280 | 23 | 4 | 19 | 6.25% | 17.39% |
| **Carta de navegación** | 340 | 12 | 4 | 8 | 2.35% | 33.33% |
| **Meteorología** | 344 | 13 | 3 | 10 | 2.76% | 23.08% |
| **Legislación** | 112 | 11 | 3 | 8 | 6.70% | 27.27% |
| **Maniobra y navegación** | 172 | 6 | 2 | 4 | 2.33% | 33.33% |
| **Elementos de amarre y fondeo** | 112 | 13 | 2 | 11 | 9.38% | 15.38% |
| **Emergencias en la mar** | 258 | 9 | 1 | 8 | 3.10% | **11.11%** ✅ |

### 🎯 Insights:

**UTs más difíciles (mayor tasa de fallo):**
1. 🔴 **Teoría de la navegación**: 64.71% de fallos
2. 🔴 **Seguridad**: 36.36% de fallos
3. 🟡 **Carta de navegación**: 33.33% de fallos
4. 🟡 **Maniobra y navegación**: 33.33% de fallos
5. 🟡 **Nomenclatura náutica**: 31.25% de fallos

**UTs más fáciles (menor tasa de fallo):**
1. ✅ **Emergencias en la mar**: 11.11% de fallos
2. ✅ **Elementos de amarre y fondeo**: 15.38% de fallos
3. ✅ **Balizamiento**: 17.39% de fallos

**UTs más preguntadas (más apariciones):**
1. 📊 **Nomenclatura náutica**: 48 apariciones
2. 📊 **Reglamento (RIPA)**: 46 apariciones
3. 📊 **Balizamiento**: 23 apariciones

---

## 🔴 Top 10 Preguntas Más Falladas

| # | Pregunta | UT | Salido | Fallada | % OK |
|---|----------|----|---------|---------|----|
| 1 | Las partes curvadas delanteras de los costados que convergen... | Nomenclatura náutica | 5 | 5 | **0%** 🔴 |
| 2 | En relación con el ancla, indique cuál de las siguientes afi... | Nomenclatura náutica | 4 | 3 | 25% |
| 3 | Según la Regla 3 del RIPA, un buque de vela que utiliza simu... | Reglamento (RIPA) | 4 | 2 | 50% |
| 4 | Hallar la sonda en el momento de la primera bajamar... | Carta de navegación | 2 | 2 | **0%** 🔴 |
| 5 | Deberán llevar al menos un aro salvavidas... | Seguridad | 4 | 2 | 50% |
| 6 | De acuerdo con las reglas 23.d) ii) y 30.b) del RIPA... | Reglamento (RIPA) | 2 | 2 | **0%** 🔴 |
| 7 | Según la Regla 34 del RIPA, "Señales de maniobra y advertenc... | Reglamento (RIPA) | 2 | 2 | **0%** 🔴 |
| 8 | En relación con las bengalas de mano... | Seguridad | 3 | 2 | 33% |
| 9 | El ángulo que forma el Norte de aguja con el Norte magnético... | Teoría de la navegación | 3 | 2 | 33% |
| 10 | Nos encontramos navegando al rumbo de aguja 265°... | Carta de navegación | 1 | 1 | **0%** 🔴 |

---

## 🔍 Cómo Usar Este Archivo

### Desde PostgreSQL:

```bash
# Conectar a la base de datos
docker exec -it per_postgres psql -U per_user -d per_exams

# Ejecutar consultas del archivo SQL
\i /path/to/preguntas_per_estadisticas.sql
```

### Desde CSV:

```bash
# Ver el archivo
cat consultas/preguntas_per_estadisticas.csv

# Importar a Excel/Google Sheets
# Abrir el archivo directamente en Excel o Google Sheets

# Buscar preguntas específicas
grep "Nomenclatura" consultas/preguntas_per_estadisticas.csv

# Contar preguntas por UT
awk -F',' 'NR>1 {count[$3]++} END {for (ut in count) print ut, count[ut]}' \
  consultas/preguntas_per_estadisticas.csv
```

### Desde Python (pandas):

```python
import pandas as pd

# Cargar datos
df = pd.read_csv('consultas/preguntas_per_estadisticas.csv')

# Top 10 más falladas
top_falladas = df.nlargest(10, 'veces_fallada')
print(top_falladas[['numero_pregunta', 'ut_nombre', 'veces_fallada', 'veces_salido']])

# Agrupar por UT
por_ut = df.groupby('ut_nombre').agg({
    'pregunta_id': 'count',
    'veces_salido': 'sum',
    'veces_fallada': 'sum',
    'veces_acertada': 'sum'
}).rename(columns={'pregunta_id': 'total_preguntas'})

print(por_ut)

# Preguntas nunca respondidas
nunca_respondidas = df[df['veces_salido'] == 0]
print(f"Preguntas nunca respondidas: {len(nunca_respondidas)}")
```

---

## 📈 Estadísticas Generales

- **Total preguntas PER en base de datos**: 3,057
- **Preguntas que han aparecido en exámenes**: ~86 (2.8%)
- **Total apariciones registradas**: 220
- **Total respuestas incorrectas**: 66
- **Total respuestas correctas**: 154
- **Tasa global de aciertos**: ~70%

---

## 🎯 Recomendaciones de Estudio

Basado en las estadísticas, los usuarios deberían enfocarse más en:

1. **Teoría de la navegación** (64.71% de fallos)
   - Norte de aguja vs Norte magnético
   - Cálculos de rumbo y desvío
   - Conceptos de navegación

2. **Seguridad** (36.36% de fallos)
   - Aros salvavidas (requisitos)
   - Bengalas de mano
   - Medidas con mal tiempo

3. **Nomenclatura náutica** (31.25% de fallos)
   - Partes del barco (roda, codaste, aleta)
   - Anclas y fondeo
   - Elementos estructurales

---

## 📅 Fecha de Generación

**Generado el:** 9 de Octubre de 2025  
**Base de datos:** per_exam_system  
**Filtro aplicado:** Solo PER_NORMAL y PER_LIBERADO (excluye Patrón de Yate)

---

## 🔄 Actualización de Datos

Para regenerar estos datos con estadísticas actualizadas:

```bash
# Ejecutar el script SQL
cd /Users/cascos/code/PER_Cloude
docker exec -i per_postgres psql -U per_user -d per_exams < consultas/preguntas_per_estadisticas.sql

# O usar el script automatizado (si existe)
./scripts/generar_estadisticas.sh
```

---

## 📞 Soporte

Para consultas o mejoras en las estadísticas, contactar al administrador del sistema.

