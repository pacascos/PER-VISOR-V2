#!/usr/bin/env python3
"""
Script para autocompletar opciones incompletas desde los PDFs originales
Busca el texto incompleto en el PDF y extrae el texto completo
"""

import json
import os
import re
from pathlib import Path
import subprocess

# Imports para procesamiento de PDFs
try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False
    print("⚠️  pdfplumber no disponible, usando pdftotext")


def get_pdf_path(convocatoria, tipo='preguntas'):
    """
    Obtener la ruta del PDF según la convocatoria
    Ejemplo: '2022-12-RECREO' -> 'data/pdfs/preguntas/2022-12-RECREO_examenes.pdf'
    """
    base_dir = Path('data/pdfs')
    pdf_name = f"{convocatoria}_{'examenes' if tipo == 'preguntas' else 'respuestas'}.pdf"
    pdf_path = base_dir / tipo / pdf_name

    if pdf_path.exists():
        return pdf_path
    else:
        print(f"⚠️  PDF no encontrado: {pdf_path}")
        return None


def extract_text_from_pdf(pdf_path):
    """
    Extraer todo el texto de un PDF
    Intenta usar pdfplumber primero, luego pdftotext
    """
    if not os.path.exists(pdf_path):
        return None

    text = None

    # Método 1: pdfplumber (más preciso)
    if HAS_PDFPLUMBER:
        try:
            with pdfplumber.open(pdf_path) as pdf:
                text = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"
            if text.strip():
                return text
        except Exception as e:
            print(f"  Error con pdfplumber: {e}")

    # Método 2: pdftotext (fallback)
    try:
        result = subprocess.run(
            ['pdftotext', '-layout', str(pdf_path), '-'],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout
    except Exception as e:
        print(f"  Error con pdftotext: {e}")

    return None


def find_complete_text(incomplete_text, pdf_text, min_match_length=15):
    """
    Buscar el texto completo en el PDF dado un texto incompleto

    Args:
        incomplete_text: El texto incompleto de la opción (sin el punto final)
        pdf_text: Todo el texto extraído del PDF
        min_match_length: Mínimo de caracteres a usar para búsqueda

    Returns:
        El texto completo encontrado o None
    """
    if not incomplete_text or not pdf_text:
        return None

    # Limpiar el texto incompleto
    search_text = incomplete_text.strip()

    # Si es muy corto, no buscar
    if len(search_text) < min_match_length:
        return None

    # Normalizar espacios y saltos de línea en el PDF
    pdf_normalized = re.sub(r'\s+', ' ', pdf_text)
    search_normalized = re.sub(r'\s+', ' ', search_text)

    # Buscar el texto incompleto en el PDF
    # Usar los primeros N caracteres para encontrar el inicio
    search_pattern = re.escape(search_normalized[:min_match_length])

    matches = list(re.finditer(search_pattern, pdf_normalized, re.IGNORECASE))

    if not matches:
        # Intentar con menos caracteres si no hay coincidencias
        if min_match_length > 10:
            return find_complete_text(incomplete_text, pdf_text, min_match_length - 5)
        return None

    # Para cada coincidencia, extraer hasta el siguiente punto
    for match in matches:
        start_pos = match.start()

        # Buscar hacia atrás para encontrar el inicio de la opción (letra + :)
        # Las opciones suelen tener formato "a) " o "a. " o simplemente "a: "
        lookback_start = max(0, start_pos - 50)
        prefix = pdf_normalized[lookback_start:start_pos]

        # Buscar el inicio de la opción
        option_match = re.search(r'[abcd][.:)]\s*$', prefix, re.IGNORECASE)
        if option_match:
            real_start = lookback_start + option_match.end()
        else:
            real_start = start_pos

        # Extraer desde el inicio hasta el siguiente punto seguido de espacio o salto
        text_from_start = pdf_normalized[real_start:]

        # Buscar el fin: punto seguido de espacio/salto o fin de párrafo
        # IMPORTANTE: Parar ANTES de encontrar otra opción (b), c), d)) o número de pregunta

        # Primero buscar si hay una siguiente opción o pregunta cerca
        next_option_match = re.search(r'\.\s+[bcd]\)', text_from_start)
        next_question_match = re.search(r'\.\s+\d+\s+', text_from_start)

        # Usar el más cercano
        end_pos = None
        if next_option_match and next_question_match:
            end_pos = min(next_option_match.start() + 1, next_question_match.start() + 1)
        elif next_option_match:
            end_pos = next_option_match.start() + 1
        elif next_question_match:
            end_pos = next_question_match.start() + 1
        else:
            # Si no hay siguiente opción/pregunta, buscar el primer punto
            end_match = re.search(r'\.\s', text_from_start)
            if end_match:
                end_pos = end_match.start() + 1

        if end_pos:
            complete_text = text_from_start[:end_pos].strip()

            # Verificar que el texto completo contenga el incompleto
            if search_normalized.lower() in complete_text.lower():
                # Limpiar: eliminar cualquier texto que empiece con b), c), d) o número
                complete_text = re.sub(r'\s+[bcd]\).*$', '.', complete_text)
                complete_text = re.sub(r'\s+\d+\s+.*$', '.', complete_text)
                return complete_text.strip()

    return None


def get_question_from_db(question_id):
    """
    Obtener los datos completos de una pregunta desde la BD
    """
    cmd = [
        'docker', 'exec', 'per_postgres',
        'psql', '-U', 'per_user', '-d', 'per_exams',
        '-t', '-A', '-F', '|',
        '-c', f"""
        SELECT
            q.id,
            q.numero_pregunta,
            q.texto_pregunta,
            e.tipo_examen,
            e.convocatoria,
            (SELECT texto FROM answer_options WHERE question_id = q.id AND opcion = 'a') as opcion_a,
            (SELECT texto FROM answer_options WHERE question_id = q.id AND opcion = 'b') as opcion_b,
            (SELECT texto FROM answer_options WHERE question_id = q.id AND opcion = 'c') as opcion_c
        FROM questions q
        LEFT JOIN exams e ON q.exam_id = e.id
        WHERE q.id = '{question_id}';
        """
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not result.stdout.strip():
        return None

    parts = result.stdout.strip().split('|')
    if len(parts) < 8:
        return None

    return {
        'id': parts[0],
        'numero': parts[1],
        'enunciado': parts[2],
        'tipo_examen': parts[3],
        'convocatoria': parts[4],
        'opcion_a': parts[5] if len(parts) > 5 else None,
        'opcion_b': parts[6] if len(parts) > 6 else None,
        'opcion_c': parts[7] if len(parts) > 7 else None
    }


def process_incomplete_questions(report_file='data/temporal/reporte_preguntas_incompletas.json'):
    """
    Procesar todas las preguntas incompletas y buscar el texto completo
    """
    if not os.path.exists(report_file):
        print(f"❌ Reporte no encontrado: {report_file}")
        return

    with open(report_file, 'r', encoding='utf-8') as f:
        report = json.load(f)

    opciones_incompletas = report.get('detalle_opciones_incompletas', [])

    print(f"\n{'='*80}")
    print(f"🔍 AUTOCOMPLETADO DE OPCIONES INCOMPLETAS")
    print(f"{'='*80}\n")
    print(f"Total de preguntas a procesar: {len(opciones_incompletas)}\n")

    # Agrupar por convocatoria para procesar PDFs una sola vez
    by_convocatoria = {}
    for pregunta in opciones_incompletas:
        conv = pregunta.get('convocatoria', 'unknown')
        if conv not in by_convocatoria:
            by_convocatoria[conv] = []
        by_convocatoria[conv].append(pregunta)

    resultados = []
    pdf_cache = {}  # Cache de textos de PDFs

    for convocatoria, preguntas in by_convocatoria.items():
        print(f"\n{'='*80}")
        print(f"📄 Procesando convocatoria: {convocatoria} ({len(preguntas)} preguntas)")
        print(f"{'='*80}\n")

        # Obtener texto del PDF (con cache)
        if convocatoria not in pdf_cache:
            pdf_path = get_pdf_path(convocatoria, 'preguntas')
            if not pdf_path:
                print(f"  ⚠️  Saltando {len(preguntas)} preguntas\n")
                continue

            print(f"  📖 Extrayendo texto de: {pdf_path.name}...")
            pdf_text = extract_text_from_pdf(pdf_path)

            if not pdf_text:
                print(f"  ❌ No se pudo extraer texto del PDF\n")
                continue

            print(f"  ✅ Texto extraído ({len(pdf_text)} caracteres)\n")
            pdf_cache[convocatoria] = pdf_text
        else:
            pdf_text = pdf_cache[convocatoria]

        # Procesar cada pregunta
        for idx, pregunta in enumerate(preguntas, 1):
            numero = pregunta.get('numero', '?')
            opciones_problema = pregunta.get('opciones_problema', [])
            question_id = pregunta.get('id')

            print(f"  {idx}/{len(preguntas)}. Pregunta #{numero} (opciones: {', '.join(opciones_problema)})")

            # Obtener datos reales de la BD (no truncados)
            db_data = get_question_from_db(question_id)
            if not db_data:
                print(f"     ⚠️  No se pudo obtener datos de la BD")
                continue

            resultado = {
                'id': question_id,
                'numero': numero,
                'convocatoria': convocatoria,
                'enunciado': db_data['enunciado'],
                'correcciones': {}
            }

            # Buscar cada opción incompleta
            for opcion in opciones_problema:
                opcion_key = f'opcion_{opcion.lower()}'
                # Obtener el texto real completo de la BD (no el truncado del reporte)
                texto_incompleto = db_data.get(opcion_key, '')

                if texto_incompleto and texto_incompleto != '[vacía]':
                    # Buscar texto completo
                    texto_completo = find_complete_text(texto_incompleto, pdf_text)

                    if texto_completo:
                        resultado['correcciones'][opcion] = {
                            'incompleto': texto_incompleto,
                            'completo': texto_completo
                        }
                        print(f"     ✅ Opción {opcion} encontrada")
                    else:
                        resultado['correcciones'][opcion] = {
                            'incompleto': texto_incompleto,
                            'completo': None,
                            'error': 'No encontrado en PDF'
                        }
                        print(f"     ❌ Opción {opcion} NO encontrada")

            resultados.append(resultado)

    # Guardar resultados
    output_file = 'data/temporal/correcciones_propuestas.json'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)

    # Estadísticas
    total_opciones_incompletas = sum(len(p.get('opciones_problema', [])) for p in opciones_incompletas)
    total_encontradas = sum(
        len([c for c in r['correcciones'].values() if c.get('completo')])
        for r in resultados
    )

    print(f"\n{'='*80}")
    print(f"📊 RESUMEN")
    print(f"{'='*80}\n")
    print(f"Total de opciones incompletas: {total_opciones_incompletas}")
    print(f"Opciones con texto completo encontrado: {total_encontradas}")
    print(f"Opciones no encontradas: {total_opciones_incompletas - total_encontradas}")
    if total_opciones_incompletas > 0:
        print(f"Tasa de éxito: {(total_encontradas/total_opciones_incompletas*100):.1f}%")
    print(f"\n💾 Resultados guardados en: {output_file}\n")


if __name__ == "__main__":
    process_incomplete_questions()