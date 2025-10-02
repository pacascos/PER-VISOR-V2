#!/usr/bin/env python3
"""
Script para analizar preguntas incompletas usando docker exec
"""

import subprocess
import json
import os
from datetime import datetime

def run_query(query):
    """Ejecutar query en PostgreSQL via docker exec"""
    cmd = [
        'docker', 'exec', 'per_postgres',
        'psql', '-U', 'per_user', '-d', 'per_exams',
        '-t', '-A', '-F', '|',
        '-c', query
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return []

    lines = result.stdout.strip().split('\n')
    return [line.strip() for line in lines if line.strip()]

def is_option_incomplete(text):
    """
    Determina si una OPCIÓN DE RESPUESTA está incompleta.
    Criterio: Las opciones DEBEN terminar en punto (.)
    Si no terminan en punto, el OCR cortó el texto prematuramente.
    """
    if not text or len(text.strip()) == 0:
        return True

    text = text.strip()

    # Las opciones de respuesta correctas siempre terminan en punto
    if not text.endswith('.'):
        return True

    return False

def has_extra_text(text):
    """
    Detecta si una opción tiene texto extra capturado (pie de página, títulos de categoría, etc.)

    Indicadores de texto extra:
    - Múltiples puntos finales
    - Palabras clave de secciones: "SUBDIRECCIÓN", "ÁREA FUNCIONAL", "Elementos de", etc.
    - Texto después del punto final que parece un título
    """
    if not text or len(text.strip()) == 0:
        return False

    text = text.strip()

    # Si no termina en punto, no es este problema (es texto incompleto)
    if not text.endswith('.'):
        return False

    # Patrones comunes de texto extra capturado
    patrones_basura = [
        'SUBDIRECCIÓN',
        'ÁREA FUNCIONAL',
        'NAUTICA DE RECREO',
        'NÁUTICA DE RECREO',
        'Elementos de amarre',
        'Elementos de fondeo',
        'Emergencias en la mar',
        'Carta de navegación',
        'Reglamento',
        'Seguridad',
        'Meteorología',
        'Nomenclatura',
        'Balizamiento',
        'INSPECCIÓN MARITIMA',
        'INSPECCIÓN MARÍTIMA',
    ]

    for patron in patrones_basura:
        if patron in text:
            return True

    # Detectar si hay texto después de un punto que parece un título
    # (mayúsculas al inicio de palabra después del punto)
    partes = text.split('.')
    if len(partes) > 2:  # Más de un punto (además del final)
        # Verificar la última parte antes del punto final
        if len(partes) >= 2:
            ultima_parte = partes[-2].strip()
            if ultima_parte and len(ultima_parte) > 0:
                # Si la última parte antes del punto final empieza con mayúscula
                # y es corta, probablemente sea un título capturado
                if ultima_parte[0].isupper() and len(ultima_parte) < 50:
                    return True

    return False

def is_enunciado_incomplete(text):
    """
    Determina si un ENUNCIADO está incompleto.
    Los enunciados normalmente terminan en : o ?
    Solo están incompletos si son muy cortos o vacíos.
    """
    if not text or len(text.strip()) == 0:
        return True

    text = text.strip()

    # Los enunciados correctos terminan en : o ?
    # Solo marcar como incompleto si es demasiado corto
    if len(text) < 10:
        return True

    return False

print(f"\n{'='*80}")
print(f"📊 ANÁLISIS DE PREGUNTAS INCOMPLETAS - SOLO EXÁMENES PER")
print(f"{'='*80}\n")

# 1. Total de preguntas
total_lines = run_query("SELECT COUNT(*) FROM questions;")
total_preguntas = int(total_lines[0]) if total_lines else 0
print(f"Total de preguntas en BD: {total_preguntas}")
print(f"Filtro aplicado: Exámenes PER (PER_NORMAL + PER_LIBERADO) NO anuladas\n")

# 2. Obtener todas las preguntas de exámenes PER que NO estén anuladas
query = """
SELECT
    q.id,
    q.numero_pregunta,
    q.texto_pregunta,
    q.categoria,
    q.anulada,
    e.tipo_examen,
    e.convocatoria,
    (SELECT texto FROM answer_options WHERE question_id = q.id AND opcion = 'a') as opcion_a,
    (SELECT texto FROM answer_options WHERE question_id = q.id AND opcion = 'b') as opcion_b,
    (SELECT texto FROM answer_options WHERE question_id = q.id AND opcion = 'c') as opcion_c,
    (SELECT texto FROM answer_options WHERE question_id = q.id AND opcion = 'd') as opcion_d
FROM questions q
LEFT JOIN exams e ON q.exam_id = e.id
WHERE q.anulada = false
  AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
ORDER BY q.numero_pregunta;
"""

lines = run_query(query)

enunciados_incompletos = []
opciones_incompletas = []
opciones_con_texto_extra = []
problemas_por_tema = {}
preguntas_analizadas = 0

for line in lines:
    if not line:
        continue

    parts = line.split('|')
    if len(parts) < 11:
        continue

    q_id, numero, enunciado, categoria, anulada, tipo_examen, convocatoria, op_a, op_b, op_c, op_d = parts[:11]
    preguntas_analizadas += 1

    # Verificar enunciado (usa criterio específico para enunciados)
    if is_enunciado_incomplete(enunciado):
        enunciados_incompletos.append({
            'id': q_id,
            'numero': numero,
            'enunciado': enunciado[:100],
            'categoria': categoria
        })

    # Verificar opciones - INCOMPLETAS (no terminan en punto)
    opciones_problema = []
    if is_option_incomplete(op_a):
        opciones_problema.append('A')
    if is_option_incomplete(op_b):
        opciones_problema.append('B')
    if is_option_incomplete(op_c):
        opciones_problema.append('C')
    if is_option_incomplete(op_d):
        opciones_problema.append('D')

    # Verificar opciones - TEXTO EXTRA (terminan en punto pero tienen basura)
    opciones_con_basura = []
    if has_extra_text(op_a):
        opciones_con_basura.append('A')
    if has_extra_text(op_b):
        opciones_con_basura.append('B')
    if has_extra_text(op_c):
        opciones_con_basura.append('C')
    if has_extra_text(op_d):
        opciones_con_basura.append('D')

    if opciones_problema:
        opciones_incompletas.append({
            'id': q_id,
            'numero': numero,
            'enunciado': enunciado[:80],
            'opciones_problema': opciones_problema,
            'tipo_problema': 'incompleto',
            'opcion_a': op_a[:50] if op_a else '[vacía]',
            'opcion_b': op_b[:50] if op_b else '[vacía]',
            'opcion_c': op_c[:50] if op_c else '[vacía]',
            'opcion_d': op_d[:50] if op_d else '[vacía]',
            'categoria': categoria,
            'tipo_examen': tipo_examen,
            'convocatoria': convocatoria
        })

    if opciones_con_basura:
        opciones_con_texto_extra.append({
            'id': q_id,
            'numero': numero,
            'enunciado': enunciado[:80],
            'opciones_problema': opciones_con_basura,
            'tipo_problema': 'texto_extra',
            'opcion_a': op_a[:100] if op_a else '[vacía]',
            'opcion_b': op_b[:100] if op_b else '[vacía]',
            'opcion_c': op_c[:100] if op_c else '[vacía]',
            'opcion_d': op_d[:100] if op_d else '[vacía]',
            'categoria': categoria,
            'tipo_examen': tipo_examen,
            'convocatoria': convocatoria
        })

    # Contar por tema
    if enunciado and (is_enunciado_incomplete(enunciado) or opciones_problema or opciones_con_basura):
        if categoria not in problemas_por_tema:
            problemas_por_tema[categoria] = {
                'enunciados': 0,
                'opciones_incompletas': 0,
                'opciones_texto_extra': 0,
                'total': 0
            }
        if is_enunciado_incomplete(enunciado):
            problemas_por_tema[categoria]['enunciados'] += 1
        if opciones_problema:
            problemas_por_tema[categoria]['opciones_incompletas'] += 1
        if opciones_con_basura:
            problemas_por_tema[categoria]['opciones_texto_extra'] += 1
        problemas_por_tema[categoria]['total'] += 1

preguntas_con_problemas = len(set([q['id'] for q in enunciados_incompletos + opciones_incompletas + opciones_con_texto_extra]))

print(f"{'='*80}")
print(f"📈 RESUMEN GENERAL")
print(f"{'='*80}\n")
print(f"✅ Preguntas analizadas: {preguntas_analizadas}")
print(f"✅ Preguntas completas: {preguntas_analizadas - preguntas_con_problemas}")
print(f"⚠️  Preguntas con problemas: {preguntas_con_problemas}")
print(f"   - Con enunciado incompleto: {len(enunciados_incompletos)}")
print(f"   - Con opciones incompletas (sin punto final): {len(opciones_incompletas)}")
print(f"   - Con opciones con texto extra (basura capturada): {len(opciones_con_texto_extra)}")

if preguntas_analizadas > 0:
    print(f"\n📊 Porcentaje de preguntas con problemas: {(preguntas_con_problemas/preguntas_analizadas*100):.2f}%\n")
else:
    print(f"\n⚠️ No se pudieron analizar preguntas. Verifica la conexión a la base de datos.\n")

# Desglose por tema
if problemas_por_tema:
    print(f"{'='*80}")
    print(f"📚 PROBLEMAS POR TEMA")
    print(f"{'='*80}\n")

    for tema in sorted(problemas_por_tema.keys()):
        if not tema:
            continue
        datos = problemas_por_tema[tema]
        print(f"{tema}:")
        print(f"   Total problemas: {datos['total']}")
        print(f"   - Enunciados incompletos: {datos['enunciados']}")
        print(f"   - Opciones incompletas (sin punto): {datos['opciones_incompletas']}")
        print(f"   - Opciones con texto extra (basura): {datos['opciones_texto_extra']}")
        print()

# Detalles de opciones incompletas
if opciones_incompletas:
    print(f"{'='*80}")
    print(f"⚠️  PREGUNTAS CON OPCIONES INCOMPLETAS ({len(opciones_incompletas)} preguntas)")
    print(f"{'='*80}\n")

    for idx, q in enumerate(opciones_incompletas[:30], 1):
        print(f"{idx}. Pregunta #{q['numero']} | {q['tipo_examen']} - {q['convocatoria']} | Tema: {q['categoria']}")
        print(f"   Enunciado: {q['enunciado']}")
        print(f"   Opciones con problema: {', '.join(q['opciones_problema'])}")
        print(f"   A: {q['opcion_a']}")
        print(f"   B: {q['opcion_b']}")
        print(f"   C: {q['opcion_c']}")
        print(f"   D: {q['opcion_d']}")
        print(f"   ID: {q['id']}")
        print()

    if len(opciones_incompletas) > 30:
        print(f"... y {len(opciones_incompletas) - 30} preguntas más\n")

# Detalles de opciones con texto extra
if opciones_con_texto_extra:
    print(f"{'='*80}")
    print(f"🗑️  PREGUNTAS CON OPCIONES CON TEXTO EXTRA ({len(opciones_con_texto_extra)} preguntas)")
    print(f"{'='*80}\n")

    for idx, q in enumerate(opciones_con_texto_extra[:30], 1):
        print(f"{idx}. Pregunta #{q['numero']} | {q['tipo_examen']} - {q['convocatoria']} | Tema: {q['categoria']}")
        print(f"   Enunciado: {q['enunciado']}")
        print(f"   Opciones con basura: {', '.join(q['opciones_problema'])}")
        print(f"   A: {q['opcion_a']}")
        print(f"   B: {q['opcion_b']}")
        print(f"   C: {q['opcion_c']}")
        print(f"   D: {q['opcion_d']}")
        print(f"   ID: {q['id']}")
        print()

    if len(opciones_con_texto_extra) > 30:
        print(f"... y {len(opciones_con_texto_extra) - 30} preguntas más\n")

# Guardar reporte
report = {
    'fecha_analisis': datetime.now().isoformat(),
    'total_preguntas': preguntas_analizadas,
    'preguntas_completas': preguntas_analizadas - preguntas_con_problemas,
    'preguntas_con_problemas': preguntas_con_problemas,
    'enunciados_incompletos': len(enunciados_incompletos),
    'opciones_incompletas': len(opciones_incompletas),
    'opciones_con_texto_extra': len(opciones_con_texto_extra),
    'porcentaje_problemas': round(preguntas_con_problemas/preguntas_analizadas*100, 2),
    'problemas_por_tema': problemas_por_tema,
    'detalle_enunciados': enunciados_incompletos,
    'detalle_opciones_incompletas': opciones_incompletas,
    'detalle_opciones_texto_extra': opciones_con_texto_extra
}

os.makedirs('data/temporal', exist_ok=True)
with open('data/temporal/reporte_preguntas_incompletas.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print(f"{'='*80}")
print(f"💾 Reporte guardado en: data/temporal/reporte_preguntas_incompletas.json")
print(f"{'='*80}\n")

print(f"{'='*80}")
print(f"💡 RECOMENDACIONES")
print(f"{'='*80}\n")
print(f"1. ⚠️  Prioridad ALTA: Arreglar las {len(opciones_incompletas)} preguntas con opciones incompletas")
print(f"2. 📝 Prioridad MEDIA: Revisar las {len(enunciados_incompletos)} preguntas con enunciado incompleto")

if problemas_por_tema:
    tema_mas_problemas = max(problemas_por_tema.items(), key=lambda x: x[1]['total'])
    print(f"3. 🎯 Tema con más problemas: {tema_mas_problemas[0]} ({tema_mas_problemas[1]['total']} preguntas)")

print(f"\n💡 Editar preguntas en el admin panel:")
print(f"   http://localhost:8095/admin-panel.html\n")