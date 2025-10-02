#!/usr/bin/env python3
"""
Script para analizar preguntas incompletas en la base de datos
Identifica:
1. Preguntas con enunciado incompleto
2. Preguntas con opciones de respuesta incompletas
3. Estadísticas detalladas por tema
"""

import psycopg2
import psycopg2.extras
import os
import json
from datetime import datetime

# Configuración de base de datos
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    import re
    match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', DATABASE_URL)
    if match:
        DB_CONFIG = {
            'host': match.group(3),
            'port': int(match.group(4)),
            'database': match.group(5),
            'user': match.group(1),
            'password': match.group(2)
        }
    else:
        # Formato con socket Unix
        match = re.match(r'postgresql://([^:]+):([^@]+)@/([^?]+)\?host=(.+)', DATABASE_URL)
        if match:
            DB_CONFIG = {
                'host': match.group(4),
                'database': match.group(3),
                'user': match.group(1),
                'password': match.group(2)
            }
else:
    DB_CONFIG = {
        'host': os.getenv('DATABASE_HOST', 'localhost'),
        'port': int(os.getenv('DATABASE_PORT', 5432)),
        'database': os.getenv('DATABASE_NAME', 'per_exams'),
        'user': os.getenv('DATABASE_USER', 'per_user'),
        'password': os.getenv('DATABASE_PASSWORD', 'per_password_change_me')
    }

def get_db_connection():
    """Obtener conexión a PostgreSQL"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"❌ Error conectando a PostgreSQL: {e}")
        return None

def is_text_incomplete(text):
    """
    Determina si un texto está incompleto
    Criterios:
    - Termina con "..." (puntos suspensivos)
    - Termina con "-" (guión, indicando continuación)
    - Es muy corto (<10 caracteres) y no es una opción de tipo "Sí/No"
    - Contiene marcadores de texto faltante como "[...]", "___", etc.
    """
    if not text or not isinstance(text, str):
        return True

    text = text.strip()

    # Texto vacío
    if len(text) == 0:
        return True

    # Marcadores de texto incompleto
    incomplete_markers = ['...', '..', ' - ', '[...]', '___', '???', '[falta', '[pending']
    for marker in incomplete_markers:
        if text.endswith(marker) or marker in text.lower():
            return True

    # Texto demasiado corto (menos de 5 caracteres) y no es una respuesta simple
    simple_answers = ['sí', 'si', 'no', 'a', 'b', 'c', 'd', 'todas', 'ninguna']
    if len(text) < 5 and text.lower() not in simple_answers:
        return True

    return False

def analyze_questions():
    """Analizar todas las preguntas buscando datos incompletos"""
    conn = get_db_connection()
    if not conn:
        return

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Obtener todas las preguntas (tabla questions en la nueva arquitectura)
        cur.execute("""
            SELECT
                q.id,
                q.numero_pregunta,
                q.texto_pregunta as enunciado,
                q.categoria as category,
                q.respuesta_correcta,
                q.anulada,
                q.metadata
            FROM questions q
            ORDER BY q.numero_pregunta
        """)

        preguntas_raw = cur.fetchall()

        # Para cada pregunta, obtener sus opciones
        preguntas = []
        for q in preguntas_raw:
            cur.execute("""
                SELECT option_letter, option_text
                FROM answer_options
                WHERE question_id = %s
                ORDER BY option_letter
            """, (q['id'],))
            opciones = cur.fetchall()

            # Extraer convocatoria del metadata si existe
            convocatoria = None
            if q['metadata'] and isinstance(q['metadata'], dict):
                convocatoria = q['metadata'].get('convocatoria')

            # Construir estructura similar a la anterior
            pregunta = {
                'id': str(q['id']),
                'numero_pregunta': q['numero_pregunta'],
                'enunciado': q['enunciado'],
                'respuesta_a': None,
                'respuesta_b': None,
                'respuesta_c': None,
                'respuesta_correcta': q['respuesta_correcta'],
                'tema_numero': int(q['category'].replace('UT', '')) if q['category'] and 'UT' in q['category'] else None,
                'tema_nombre': q['category'],
                'convocatoria': convocatoria,
                'anulada': q['anulada']
            }

            # Asignar opciones
            for opcion in opciones:
                if opcion['option_letter'] == 'A':
                    pregunta['respuesta_a'] = opcion['option_text']
                elif opcion['option_letter'] == 'B':
                    pregunta['respuesta_b'] = opcion['option_text']
                elif opcion['option_letter'] == 'C':
                    pregunta['respuesta_c'] = opcion['option_text']

            preguntas.append(pregunta)

        print(f"\n{'='*80}")
        print(f"📊 ANÁLISIS DE PREGUNTAS INCOMPLETAS")
        print(f"{'='*80}\n")
        print(f"Total de preguntas en BD: {len(preguntas)}")
        print(f"Fecha de análisis: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        # Contadores
        enunciados_incompletos = []
        opciones_incompletas = []
        preguntas_con_problemas = set()
        problemas_por_tema = {}

        # Analizar cada pregunta
        for p in preguntas:
            problemas = []

            # Verificar enunciado
            if is_text_incomplete(p['enunciado']):
                problemas.append('enunciado_incompleto')
                enunciados_incompletos.append({
                    'id': p['id'],
                    'numero': p['numero_pregunta'],
                    'enunciado': p['enunciado'][:100] + '...' if len(p['enunciado']) > 100 else p['enunciado'],
                    'tema': p['tema_numero'],
                    'tema_nombre': p['tema_nombre']
                })

            # Verificar opciones
            opciones_problema = []
            if is_text_incomplete(p['respuesta_a']):
                opciones_problema.append('A')
            if is_text_incomplete(p['respuesta_b']):
                opciones_problema.append('B')
            if is_text_incomplete(p['respuesta_c']):
                opciones_problema.append('C')

            if opciones_problema:
                problemas.append('opciones_incompletas')
                opciones_incompletas.append({
                    'id': p['id'],
                    'numero': p['numero_pregunta'],
                    'enunciado': p['enunciado'][:80] + '...' if len(p['enunciado']) > 80 else p['enunciado'],
                    'opciones_problema': opciones_problema,
                    'respuesta_a': p['respuesta_a'][:50] if p['respuesta_a'] else '[vacía]',
                    'respuesta_b': p['respuesta_b'][:50] if p['respuesta_b'] else '[vacía]',
                    'respuesta_c': p['respuesta_c'][:50] if p['respuesta_c'] else '[vacía]',
                    'tema': p['tema_numero'],
                    'tema_nombre': p['tema_nombre']
                })

            # Registrar problemas por tema
            if problemas:
                preguntas_con_problemas.add(p['id'])
                tema_key = f"UT{p['tema_numero']}"
                if tema_key not in problemas_por_tema:
                    problemas_por_tema[tema_key] = {
                        'nombre': p['tema_nombre'],
                        'enunciados': 0,
                        'opciones': 0,
                        'total': 0
                    }
                if 'enunciado_incompleto' in problemas:
                    problemas_por_tema[tema_key]['enunciados'] += 1
                if 'opciones_incompletas' in problemas:
                    problemas_por_tema[tema_key]['opciones'] += 1
                problemas_por_tema[tema_key]['total'] += 1

        # Imprimir resultados
        print(f"{'='*80}")
        print(f"📈 RESUMEN GENERAL")
        print(f"{'='*80}\n")
        print(f"✅ Preguntas completas: {len(preguntas) - len(preguntas_con_problemas)}")
        print(f"⚠️  Preguntas con problemas: {len(preguntas_con_problemas)}")
        print(f"   - Con enunciado incompleto: {len(enunciados_incompletos)}")
        print(f"   - Con opciones incompletas: {len(opciones_incompletas)}")
        print(f"\n📊 Porcentaje de preguntas con problemas: {(len(preguntas_con_problemas)/len(preguntas)*100):.2f}%\n")

        # Desglose por tema
        print(f"{'='*80}")
        print(f"📚 PROBLEMAS POR TEMA")
        print(f"{'='*80}\n")

        for tema in sorted(problemas_por_tema.keys()):
            datos = problemas_por_tema[tema]
            print(f"{tema}: {datos['nombre']}")
            print(f"   Total problemas: {datos['total']}")
            print(f"   - Enunciados incompletos: {datos['enunciados']}")
            print(f"   - Opciones incompletas: {datos['opciones']}")
            print()

        # Detalles de preguntas con opciones incompletas
        if opciones_incompletas:
            print(f"{'='*80}")
            print(f"⚠️  PREGUNTAS CON OPCIONES INCOMPLETAS ({len(opciones_incompletas)} preguntas)")
            print(f"{'='*80}\n")

            for idx, q in enumerate(opciones_incompletas[:20], 1):  # Mostrar primeras 20
                print(f"{idx}. ID: {q['id']} | Pregunta #{q['numero']} | Tema: UT{q['tema']}")
                print(f"   Enunciado: {q['enunciado']}")
                print(f"   Opciones con problema: {', '.join(q['opciones_problema'])}")
                print(f"   A: {q['respuesta_a']}")
                print(f"   B: {q['respuesta_b']}")
                print(f"   C: {q['respuesta_c']}")
                print()

            if len(opciones_incompletas) > 20:
                print(f"... y {len(opciones_incompletas) - 20} preguntas más con opciones incompletas\n")

        # Detalles de preguntas con enunciado incompleto
        if enunciados_incompletos:
            print(f"{'='*80}")
            print(f"📝 PREGUNTAS CON ENUNCIADO INCOMPLETO ({len(enunciados_incompletos)} preguntas)")
            print(f"{'='*80}\n")

            for idx, q in enumerate(enunciados_incompletos[:10], 1):  # Mostrar primeras 10
                print(f"{idx}. ID: {q['id']} | Pregunta #{q['numero']} | Tema: UT{q['tema']}")
                print(f"   Enunciado: {q['enunciado']}")
                print()

            if len(enunciados_incompletos) > 10:
                print(f"... y {len(enunciados_incompletos) - 10} preguntas más con enunciado incompleto\n")

        # Guardar reporte JSON
        report = {
            'fecha_analisis': datetime.now().isoformat(),
            'total_preguntas': len(preguntas),
            'preguntas_completas': len(preguntas) - len(preguntas_con_problemas),
            'preguntas_con_problemas': len(preguntas_con_problemas),
            'enunciados_incompletos': len(enunciados_incompletos),
            'opciones_incompletas': len(opciones_incompletas),
            'porcentaje_problemas': round(len(preguntas_con_problemas)/len(preguntas)*100, 2),
            'problemas_por_tema': problemas_por_tema,
            'detalle_enunciados': enunciados_incompletos,
            'detalle_opciones': opciones_incompletas
        }

        report_file = 'data/temporal/reporte_preguntas_incompletas.json'
        os.makedirs(os.path.dirname(report_file), exist_ok=True)
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        print(f"{'='*80}")
        print(f"💾 Reporte guardado en: {report_file}")
        print(f"{'='*80}\n")

        # Recomendaciones
        print(f"{'='*80}")
        print(f"💡 RECOMENDACIONES")
        print(f"{'='*80}\n")
        print(f"1. Prioriza arreglar las {len(opciones_incompletas)} preguntas con opciones incompletas")
        print(f"2. Revisa las {len(enunciados_incompletos)} preguntas con enunciado incompleto")

        if problemas_por_tema:
            tema_mas_problemas = max(problemas_por_tema.items(), key=lambda x: x[1]['total'])
            print(f"3. Tema con más problemas: {tema_mas_problemas[0]} ({tema_mas_problemas[1]['total']} preguntas)")

        print(f"\n💡 Puedes usar el admin panel para editar estas preguntas:")
        print(f"   http://localhost:8095/admin-panel.html\n")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error durante el análisis: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    analyze_questions()