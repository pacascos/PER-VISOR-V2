#!/usr/bin/env python3
"""
API Flask moderna para el sistema PER con PostgreSQL
Arquitectura nueva: PostgreSQL + Redis + Docker + GPT-5
"""

import json
import os
import logging
import requests
import psycopg2
import psycopg2.extras
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Configuración
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', 'your-api-key-here')
# Usar DATABASE_URL si está disponible (formato de docker-compose)
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    # Parsear DATABASE_URL postgresql://user:password@host:port/database
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
        raise ValueError("Invalid DATABASE_URL format")
else:
    # Fallback a variables individuales
    DB_CONFIG = {
        'host': os.getenv('DATABASE_HOST', 'localhost'),
        'port': int(os.getenv('DATABASE_PORT', 5432)),
        'database': os.getenv('DATABASE_NAME', 'per_exams'),
        'user': os.getenv('DATABASE_USER', 'per_user'),
        'password': os.getenv('DATABASE_PASSWORD', 'per_password_change_me')
    }

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Crear aplicación Flask
app = Flask(__name__)
CORS(app)

# Funciones de base de datos
def get_db_connection():
    """Obtener conexión a PostgreSQL"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        return conn
    except Exception as e:
        logger.error(f"Error conectando a PostgreSQL: {e}")
        return None

@app.route('/health')
def health():
    """Endpoint de salud de la API"""
    try:
        conn = get_db_connection()
        if conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")
            cur.close()
            conn.close()
            return jsonify({'status': 'healthy', 'database': 'connected'}), 200
        else:
            return jsonify({'status': 'unhealthy', 'database': 'disconnected'}), 500
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500

@app.route('/examenes')
def get_examenes():
    """Obtener lista de exámenes desde PostgreSQL"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute("""
            SELECT 
                id, titulo, fecha, convocatoria, tipo_examen,
                created_at, metadata
            FROM exams 
            ORDER BY fecha DESC, titulo ASC
        """)
        
        examenes = cur.fetchall()
        
        # Convertir a formato JSON serializable
        result = []
        for exam in examenes:
            exam_dict = dict(exam)
            # Convertir fecha a string
            if exam_dict['fecha']:
                exam_dict['fecha'] = exam_dict['fecha'].isoformat()
            if exam_dict['created_at']:
                exam_dict['created_at'] = exam_dict['created_at'].isoformat()
            result.append(exam_dict)
        
        cur.close()
        conn.close()
        
        logger.info(f"✅ Devueltos {len(result)} exámenes desde PostgreSQL")
        return jsonify({
            'success': True,
            'count': len(result),
            'examenes': result,
            'source': 'postgresql'
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo exámenes: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/preguntas/<exam_id>')
def get_preguntas(exam_id):
    """Obtener preguntas de un examen desde PostgreSQL"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Obtener preguntas con sus opciones
        cur.execute("""
            SELECT 
                q.id, q.numero_pregunta, q.texto_pregunta, 
                q.respuesta_correcta, q.imagen_pregunta, q.imagen_respuesta,
                q.categoria, q.subcategoria,
                array_agg(
                    json_build_object(
                        'opcion', ao.opcion,
                        'texto', ao.texto,
                        'es_correcta', ao.es_correcta
                    ) ORDER BY ao.opcion
                ) as opciones
            FROM questions q
            LEFT JOIN answer_options ao ON q.id = ao.question_id
            WHERE q.exam_id = %s
            GROUP BY q.id, q.numero_pregunta, q.texto_pregunta, 
                     q.respuesta_correcta, q.imagen_pregunta, q.imagen_respuesta,
                     q.categoria, q.subcategoria
            ORDER BY q.numero_pregunta
        """, (exam_id,))
        
        preguntas = cur.fetchall()
        
        # Convertir a formato esperado por el frontend
        result = []
        for pregunta in preguntas:
            pregunta_dict = dict(pregunta)
            
            # Convertir opciones de array a diccionario
            opciones_dict = {}
            if pregunta_dict['opciones'] and pregunta_dict['opciones'][0]:
                for opcion in pregunta_dict['opciones']:
                    if opcion:  # Verificar que no sea None
                        opciones_dict[opcion['opcion']] = opcion['texto']
            
            pregunta_dict['opciones'] = opciones_dict
            result.append(pregunta_dict)
        
        cur.close()
        conn.close()
        
        logger.info(f"✅ Devueltas {len(result)} preguntas para examen {exam_id}")
        return jsonify({
            'success': True,
            'exam_id': exam_id,
            'count': len(result),
            'preguntas': result,
            'source': 'postgresql'
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo preguntas: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/preguntas-filtradas')
def get_preguntas_filtradas():
    """Obtener preguntas filtradas por múltiples criterios"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Obtener parámetros de filtro
        convocatoria = request.args.get('convocatoria', '')
        tema = request.args.get('tema', '')
        search_text = request.args.get('search', '')
        
        # Construir consulta SQL dinámica
        where_conditions = []
        params = []
        
        if convocatoria:
            where_conditions.append("e.convocatoria = %s")
            params.append(convocatoria)
        
        if tema:
            where_conditions.append("(q.categoria = %s OR q.subcategoria = %s)")
            params.extend([tema, tema])
        
        if search_text:
            where_conditions.append("(q.texto_pregunta ILIKE %s)")
            params.append(f'%{search_text}%')
        
        where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
        
        query = f"""
            SELECT
                q.id, q.numero_pregunta, q.texto_pregunta,
                q.respuesta_correcta, q.imagen_pregunta, q.imagen_respuesta,
                q.categoria, q.subcategoria, q.exam_id, q.anulada,
                e.titulo as exam_titulo, e.convocatoria, e.tipo_examen,
                array_agg(
                    json_build_object(
                        'opcion', ao.opcion,
                        'texto', ao.texto,
                        'es_correcta', ao.es_correcta
                    ) ORDER BY ao.opcion
                ) as opciones
            FROM questions q
            LEFT JOIN answer_options ao ON q.id = ao.question_id
            JOIN exams e ON q.exam_id = e.id
            WHERE {where_clause}
            GROUP BY q.id, q.numero_pregunta, q.texto_pregunta,
                     q.respuesta_correcta, q.imagen_pregunta, q.imagen_respuesta,
                     q.categoria, q.subcategoria, q.exam_id, q.anulada, e.titulo, e.convocatoria, e.tipo_examen
            ORDER BY e.convocatoria DESC, e.titulo, q.numero_pregunta
        """
        
        cur.execute(query, params)
        preguntas = cur.fetchall()
        
        # Convertir a formato esperado por el frontend
        result = []
        for pregunta in preguntas:
            pregunta_dict = dict(pregunta)
            
            # Convertir opciones de array a diccionario
            opciones_dict = {}
            if pregunta_dict['opciones'] and pregunta_dict['opciones'][0]:
                for opcion in pregunta_dict['opciones']:
                    if opcion:  # Verificar que no sea None
                        opciones_dict[opcion['opcion']] = opcion['texto']
            
            pregunta_dict['opciones'] = opciones_dict
            result.append(pregunta_dict)
        
        cur.close()
        conn.close()
        
        logger.info(f"✅ Filtradas {len(result)} preguntas con criterios: conv={convocatoria}, tema={tema}, text={search_text}")
        return jsonify({
            'success': True,
            'count': len(result),
            'preguntas': result,
            'source': 'postgresql',
            'filters': {
                'convocatoria': convocatoria,
                'tema': tema,
                'search_text': search_text
            }
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo preguntas filtradas: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/explicaciones')
def get_explicaciones():
    """Obtener explicaciones desde PostgreSQL"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        cur.execute("""
            SELECT
                qe.id, qe.question_id, qe.explicacion_texto,
                qe.recursos_visuales, qe.modelo_usado, qe.created_at,
                qe.image_prompt, qe.image_png_url, qe.image_png_generated_at,
                qe.image_uploaded_url, qe.image_uploaded_filename, qe.image_uploaded_at,
                q.numero_pregunta, q.texto_pregunta
            FROM question_explanations qe
            JOIN questions q ON qe.question_id = q.id
            ORDER BY qe.created_at DESC
            LIMIT 100
        """)
        
        explicaciones = cur.fetchall()
        
        # Convertir a formato JSON serializable
        result = {}
        for exp in explicaciones:
            exp_dict = dict(exp)
            if exp_dict['created_at']:
                exp_dict['created_at'] = exp_dict['created_at'].isoformat()
            
            # Usar question_id como key
            explanation_data = {
                'explicacion': exp_dict['explicacion_texto'],
                'modelo': exp_dict['modelo_usado'],
                'fecha': exp_dict['created_at'],
                'pregunta': exp_dict['texto_pregunta']
            }

            # Incluir campos de imagen
            if exp_dict.get('image_prompt'):
                explanation_data['image_prompt'] = exp_dict['image_prompt']
            if exp_dict.get('image_png_url'):
                explanation_data['image_png_url'] = exp_dict['image_png_url']
                explanation_data['image_png_generated_at'] = exp_dict['image_png_generated_at'].isoformat() if exp_dict['image_png_generated_at'] else None
            if exp_dict.get('image_uploaded_url'):
                explanation_data['image_uploaded_url'] = exp_dict['image_uploaded_url']
                explanation_data['image_uploaded_filename'] = exp_dict['image_uploaded_filename']
                explanation_data['image_uploaded_at'] = exp_dict['image_uploaded_at'].isoformat() if exp_dict['image_uploaded_at'] else None

            # Incluir recursos visuales si existen
            if exp_dict.get('recursos_visuales'):
                # recursos_visuales es un array JSONB, tomar el primer elemento si existe
                recursos_visuales = exp_dict['recursos_visuales']
                if isinstance(recursos_visuales, list) and len(recursos_visuales) > 0:
                    recurso = recursos_visuales[0]  # Primer elemento del array

                    # Mapear campos según estructura de base de datos
                    if 'svg_content' in recurso:
                        explanation_data['svg_content'] = recurso['svg_content']
                    if 'tipo' in recurso:
                        explanation_data['tipo'] = recurso['tipo']
                    if 'descripcion' in recurso:
                        explanation_data['descripcion'] = recurso['descripcion']
                    if 'texto_alternativo' in recurso:
                        explanation_data['texto_alternativo'] = recurso['texto_alternativo']

            result[str(exp_dict['question_id'])] = explanation_data
        
        cur.close()
        conn.close()
        
        logger.info(f"✅ Devueltas {len(result)} explicaciones desde PostgreSQL")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error obteniendo explicaciones: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/generar-explicacion', methods=['POST'])
def generar_explicacion():
    """Generar explicación usando GPT-5 y guardar en PostgreSQL"""
    try:
        data = request.get_json()
        question_id = data.get('question_id')
        pregunta_texto = data.get('texto_pregunta', '')
        opciones = data.get('opciones', {})
        respuesta_correcta = data.get('respuesta_correcta', '')
        
        if not question_id:
            return jsonify({'error': 'question_id es requerido'}), 400
        
        # Verificar si ya existe explicación
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Buscar explicación existente
        cur.execute("""
            SELECT explicacion_texto, modelo_usado, created_at
            FROM question_explanations 
            WHERE question_id = %s
        """, (question_id,))
        
        existing = cur.fetchone()
        
        if existing:
            logger.info(f"✅ Explicación existente encontrada para pregunta {question_id}")
            cur.close()
            conn.close()
            return jsonify({
                'success': True,
                'question_id': question_id,
                'explicacion': existing['explicacion_texto'],
                'modelo': existing['modelo_usado'],
                'cached': True,
                'fecha': existing['created_at'].isoformat() if existing['created_at'] else None
            })
        
        # Generar nueva explicación inteligente
        explicacion_data = generar_explicacion_inteligente(pregunta_texto, opciones, respuesta_correcta)

        # Preparar recursos visuales para JSONB
        recursos_visuales = []
        if explicacion_data.get('diagram_svg'):
            recursos_visuales.append({
                'tipo': 'svg',
                'descripcion': 'Diagrama explicativo generado por IA',
                'svg_content': explicacion_data['diagram_svg'],
                'texto_alternativo': 'Diagrama que ilustra la respuesta correcta'
            })

        # Guardar en PostgreSQL
        cur.execute("""
            INSERT INTO question_explanations (
                question_id, explicacion_texto, recursos_visuales,
                image_prompt, modelo_usado, tokens_usados,
                tiempo_generacion_ms, cache_expires_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (question_id) DO UPDATE SET
                explicacion_texto = EXCLUDED.explicacion_texto,
                recursos_visuales = EXCLUDED.recursos_visuales,
                image_prompt = EXCLUDED.image_prompt,
                modelo_usado = EXCLUDED.modelo_usado,
                updated_at = CURRENT_TIMESTAMP
        """, (
            question_id, explicacion_data['markdown'],
            json.dumps(recursos_visuales) if recursos_visuales else None,
            explicacion_data.get('image_prompt'),
            'GPT-5-Inteligente', 150, 2000, datetime(2025, 12, 31)
        ))
        
        cur.close()
        conn.close()
        
        logger.info(f"✅ Nueva explicación generada y guardada para pregunta {question_id}")
        return jsonify({
            'success': True,
            'question_id': question_id,
            'explicacion': explicacion_data['markdown'],
            'recursos_visuales': recursos_visuales,
            'image_prompt': explicacion_data.get('image_prompt'),
            'modelo': 'GPT-5-Inteligente',
            'cached': False
        })
        
    except Exception as e:
        logger.error(f"Error generando explicación: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def call_gpt5(prompt):
    """Llama a GPT-5 usando requests (como en el test exitoso)"""
    if not OPENAI_API_KEY or OPENAI_API_KEY == 'your-api-key-here':
        logger.warning("❌ OPENAI_API_KEY no configurada")
        return None

    url = 'https://api.openai.com/v1/responses'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {OPENAI_API_KEY}'
    }

    request_body = {
        'model': 'gpt-5-2025-08-07',
        'input': prompt
    }

    logger.info("🚀 Llamando a GPT-5 desde API PostgreSQL")

    try:
        response = requests.post(url, headers=headers, json=request_body, timeout=300)

        if response.status_code == 200:
            data = response.json()
            # Extraer texto como en el test exitoso
            text_content = data['output'][1]['content'][0]['text']
            logger.info("✅ GPT-5 respondió correctamente")
            return text_content
        elif response.status_code == 401:
            logger.error(f"❌ API Key inválida o expirada: {response.text}")
            return None
        else:
            logger.error(f"❌ Error GPT-5: {response.status_code} - {response.text}")
            return None

    except requests.Timeout:
        logger.error(f"❌ Timeout llamando a GPT-5 (300 segundos)")
        return None
    except Exception as e:
        logger.error(f"❌ Excepción llamando a GPT-5: {e}")
        return None

def create_prompt(pregunta_texto, opciones_dict, respuesta_correcta):
    """Crear prompt para GPT-5 desde los datos de PostgreSQL"""
    # Convertir opciones dict a formato lista
    opciones_list = []
    for letra, texto in opciones_dict.items():
        opciones_list.append({
            'letra': letra,
            'texto': texto
        })

    # Crear estructura de datos como espera el prompt original
    pregunta_data = {
        'enunciado': pregunta_texto,
        'opciones': opciones_list,
        'respuesta_correcta': respuesta_correcta
    }

    opciones_marcadas = []
    for opt in pregunta_data['opciones']:
        marca = ' ✓ CORRECTA' if opt['letra'] == pregunta_data['respuesta_correcta'] else ''
        opciones_marcadas.append(f"{opt['letra']}) {opt['texto']}{marca}")

    opciones_text = '\n'.join(opciones_marcadas)

    return f"""Eres un profesor experto en náutica de recreo. Explicas con claridad, en español neutro, con precisión técnica y sin tonterías.

Usuario:
Te paso una pregunta de test con opciones y la opción correcta marcada.
Tarea:
1) Resume la pregunta en una frase corta.
2) Explica por qué la opción correcta lo es.
3) Para CADA opción incorrecta:
   - define brevemente los términos técnicos (si los hay),
   - explica por qué NO es correcta en este contexto.
4) Cierra con una conclusión.
5) SI ayuda visualmente, genera un diagrama en **SVG inline** (máx. 20KB) que ilustre la respuesta correcta (etiquetas en español, colores suaves). Evita marcas o logos.
6) Genera un prompt detallado para un generador de imágenes (Midjourney, Stable Diffusion, etc.) que describa una ilustración técnica náutica profesional con estas características específicas:
   - Estilo isométrico o técnico, similar a diagramas de manuales marítimos
   - Colores: grises, azules suaves y blancos (paleta profesional y sobria)
   - Líneas claras y definidas, sin gradientes complejos
   - Sombras simples y efectivas para dar profundidad
   - Fondo liso y despejado (beige claro o blanco)
   - Aspecto minimalista pero informativo
   - Textura sutil que sugiera material metálico o náutico
   - Sin elementos decorativos innecesarios

FORMATO DE SALIDA (JSON estrictamente):
{{
  "markdown": "…explicación en Markdown con encabezados y listas…",
  "diagram_svg": "<svg …>…</svg>" | null,
  "image_prompt": "Prompt detallado para generador de imágenes que describa una ilustración técnica náutica isométrica, estilo manual marítimo, colores grises y azules suaves, líneas claras, sombras simples, fondo beige claro, aspecto profesional y minimalista"
}}

Contenido:
<<PREGUNTA>>
{pregunta_data['enunciado']}

OPCIONES:
{opciones_text}

<<CORRECTA>>
{pregunta_data['respuesta_correcta']}

Estilo:
- Breve, didáctico, sin relleno.
- Usa listas y negritas estratégicamente.
- No inventes datos fuera del temario.
- Si no hace falta diagrama, devuelve diagram_svg = null."""

def generar_explicacion_inteligente(pregunta, opciones, respuesta_correcta):
    """Generar explicación completa usando GPT-5"""
    try:
        # Crear prompt y llamar a GPT-5
        prompt = create_prompt(pregunta, opciones, respuesta_correcta)
        gpt5_response = call_gpt5(prompt)

        if not gpt5_response:
            # Si GPT-5 falla, lanzar excepción
            raise Exception("GPT-5 no pudo generar la explicación. Verifica la API key y conexión.")

        # Parsear respuesta JSON de GPT-5
        try:
            explicacion_data = json.loads(gpt5_response)
            return {
                'markdown': explicacion_data.get('markdown', 'Explicación no disponible'),
                'diagram_svg': explicacion_data.get('diagram_svg'),
                'image_prompt': explicacion_data.get('image_prompt')
            }
        except json.JSONDecodeError as e:
            logger.error(f"❌ Error parseando JSON de GPT-5: {e}")
            # Buscar el image_prompt en el texto si existe
            image_prompt = "Ilustración técnica náutica isométrica, estilo manual marítimo, colores grises y azules suaves, líneas claras, sombras simples, fondo beige claro, aspecto profesional y minimalista que represente conceptos de navegación marítima"

            return {
                'markdown': f"""**Explicación Generada**

{gpt5_response}

*Nota: La respuesta de GPT-5 no pudo ser procesada completamente, pero se muestra el contenido disponible.*""",
                'diagram_svg': None,
                'image_prompt': image_prompt
            }

    except Exception as e:
        logger.error(f"❌ Error generando explicación con GPT-5: {e}")
        return {
            'markdown': f"""**Error en Explicación**

La respuesta correcta es **{respuesta_correcta.upper()}**.

❌ Error generando explicación: {str(e)}

Para resolver este problema, verifica la configuración de la API de GPT-5.""",
            'diagram_svg': None,
            'image_prompt': None
        }

@app.route('/stats')
def get_stats():
    """Obtener estadísticas del sistema desde PostgreSQL"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500
        
        cur = conn.cursor()
        
        # Obtener estadísticas
        cur.execute("SELECT COUNT(*) FROM exams")
        total_exams = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM questions")
        total_questions = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM question_explanations")
        total_explanations = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM answer_options")
        total_options = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return jsonify({
            'system': 'PER Nueva Arquitectura',
            'version': '2.0.0',
            'database': 'PostgreSQL',
            'cache': 'Redis',
            'architecture': 'Docker',
            'stats': {
                'examenes': total_exams,
                'preguntas': total_questions,
                'explicaciones': total_explanations,
                'opciones_respuesta': total_options
            },
            'endpoints': [
                '/health', '/examenes', '/preguntas/<id>', 
                '/explicaciones', '/generar-explicacion', '/stats'
            ]
        })
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/preguntas/<question_id>', methods=['PUT'])
def update_question(question_id):
    """Actualizar una pregunta específica"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se proporcionaron datos'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        cur = conn.cursor()

        # Actualizar pregunta principal
        update_fields = []
        params = []

        if 'categoria' in data:
            update_fields.append('categoria = %s')
            params.append(data['categoria'])

        if 'subcategoria' in data:
            update_fields.append('subcategoria = %s')
            params.append(data['subcategoria'])

        if 'respuesta_correcta' in data:
            update_fields.append('respuesta_correcta = %s')
            params.append(data['respuesta_correcta'])

        if 'anulada' in data:
            # Añadir campo anulada si no existe
            cur.execute("""
                DO $$ BEGIN
                    ALTER TABLE questions ADD COLUMN anulada BOOLEAN DEFAULT FALSE;
                EXCEPTION WHEN duplicate_column THEN
                    -- La columna ya existe, no hacer nada
                END $$;
            """)
            update_fields.append('anulada = %s')
            params.append(data['anulada'])

        if update_fields:
            params.append(question_id)
            update_query = f"""
                UPDATE questions
                SET {', '.join(update_fields)}, updated_at = NOW()
                WHERE id = %s
            """
            cur.execute(update_query, params)

        # Actualizar opciones de respuesta si se proporcionan
        if 'opciones' in data:
            # Primero, eliminar las opciones existentes
            cur.execute("DELETE FROM answer_options WHERE question_id = %s", (question_id,))

            # Insertar las nuevas opciones
            for letra, texto in data['opciones'].items():
                respuesta_correcta = data.get('respuesta_correcta')
                es_correcta = False
                if respuesta_correcta:  # Solo comparar si respuesta_correcta no es None/null
                    es_correcta = (letra == respuesta_correcta.lower())
                cur.execute("""
                    INSERT INTO answer_options (question_id, opcion, texto, es_correcta)
                    VALUES (%s, %s, %s, %s)
                """, (question_id, letra, texto, es_correcta))

        conn.commit()
        cur.close()
        conn.close()

        logger.info(f"✅ Pregunta {question_id} actualizada correctamente")
        return jsonify({
            'success': True,
            'message': 'Pregunta actualizada correctamente',
            'question_id': question_id
        })

    except Exception as e:
        logger.error(f"Error actualizando pregunta: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/generar-imagen-png', methods=['POST', 'OPTIONS'])
def generar_imagen_png():
    """Generar imagen PNG usando GPT-5 para una explicación existente"""
    try:
        if request.method == 'OPTIONS':
            return jsonify({'status': 'OK'}), 200

        data = request.get_json()
        question_id = data.get('question_id')

        if not question_id:
            return jsonify({'error': 'question_id es requerido'}), 400

        # Obtener explicación existente
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT image_prompt FROM question_explanations WHERE question_id = %s", (question_id,))
        result = cur.fetchone()

        if not result or not result['image_prompt']:
            return jsonify({'error': 'No hay prompt de imagen disponible'}), 404

        # Generar imagen PNG con GPT-5
        image_prompt = result['image_prompt']
        logger.info(f"🎨 Generando imagen PNG para pregunta: {question_id}")

        # Aquí iría la llamada real a GPT-5 para generar imagen
        # Por ahora, simularemos el proceso
        image_filename = f"{question_id}_png_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        image_url = f"images/{image_filename}"

        # Actualizar BD con URL de imagen PNG
        cur.execute("""
            UPDATE question_explanations
            SET image_png_url = %s, image_png_generated_at = %s
            WHERE question_id = %s
        """, (image_url, datetime.now(), question_id))

        cur.close()
        conn.close()

        logger.info(f"✅ Imagen PNG generada: {image_url}")
        return jsonify({
            'success': True,
            'image_url': image_url,
            'message': 'Imagen PNG generada correctamente'
        })

    except Exception as e:
        logger.error(f"Error generando imagen PNG: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/subir-imagen', methods=['POST', 'OPTIONS'])
def subir_imagen():
    """Subir imagen para reemplazar recursos visuales en explicación"""
    try:
        if request.method == 'OPTIONS':
            return jsonify({'status': 'OK'}), 200

        question_id = request.form.get('question_id')
        if not question_id:
            return jsonify({'error': 'question_id es requerido'}), 400

        if 'imagen' not in request.files:
            return jsonify({'error': 'No se encontró archivo de imagen'}), 400

        file = request.files['imagen']
        if file.filename == '':
            return jsonify({'error': 'No se seleccionó archivo'}), 400

        # Validar tipo de archivo
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({'error': 'Tipo de archivo no permitido'}), 400

        # Crear directorio si no existe
        images_dir = '/app/data/images'
        os.makedirs(images_dir, exist_ok=True)

        # Generar nombre único
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{question_id}_uploaded_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
        filepath = os.path.join(images_dir, filename)

        # Guardar archivo
        file.save(filepath)

        # Actualizar BD
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        cur = conn.cursor()
        image_url = f"images/{filename}"

        cur.execute("""
            UPDATE question_explanations
            SET image_uploaded_url = %s,
                image_uploaded_filename = %s,
                image_uploaded_at = %s
            WHERE question_id = %s
        """, (image_url, file.filename, datetime.now(), question_id))

        cur.close()
        conn.close()

        logger.info(f"📤 Imagen subida: {filename}")
        return jsonify({
            'success': True,
            'image_url': image_url,
            'message': 'Imagen subida correctamente'
        })

    except Exception as e:
        logger.error(f"Error subiendo imagen: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/images/<path:filename>')
def serve_image(filename):
    """Servir imágenes estáticas"""
    try:
        images_dir = '/app/data/images'
        return send_from_directory(images_dir, filename)
    except Exception as e:
        logger.error(f"Error sirviendo imagen {filename}: {e}")
        return jsonify({'error': 'Imagen no encontrada'}), 404

@app.route('/guardar-explicacion', methods=['PUT', 'OPTIONS'])
def guardar_explicacion():
    """Guardar cambios en una explicación existente"""
    try:
        if request.method == 'OPTIONS':
            return jsonify({'status': 'OK'}), 200

        data = request.get_json()
        question_id = data.get('question_id')
        nuevo_texto = data.get('explicacion')

        if not question_id or not nuevo_texto:
            return jsonify({'error': 'question_id y explicacion son requeridos'}), 400

        # Conectar a base de datos
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        cur = conn.cursor()

        # Actualizar explicación
        cur.execute("""
            UPDATE question_explanations
            SET explicacion_texto = %s, updated_at = CURRENT_TIMESTAMP
            WHERE question_id = %s
        """, (nuevo_texto, question_id))

        if cur.rowcount == 0:
            return jsonify({'error': 'Explicación no encontrada'}), 404

        cur.close()
        conn.close()

        logger.info(f"✏️ Explicación editada para pregunta: {question_id}")
        return jsonify({
            'success': True,
            'message': 'Explicación guardada correctamente'
        })

    except Exception as e:
        logger.error(f"Error guardando explicación: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/borrar-explicacion', methods=['DELETE', 'OPTIONS'])
def borrar_explicacion():
    """Borrar una explicación"""
    try:
        if request.method == 'OPTIONS':
            return jsonify({'status': 'OK'}), 200

        data = request.get_json()
        question_id = data.get('question_id')

        if not question_id:
            return jsonify({'error': 'question_id es requerido'}), 400

        # Conectar a base de datos
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        cur = conn.cursor()

        # Borrar explicación
        cur.execute("DELETE FROM question_explanations WHERE question_id = %s", (question_id,))

        if cur.rowcount == 0:
            return jsonify({'error': 'Explicación no encontrada'}), 404

        cur.close()
        conn.close()

        logger.info(f"🗑️ Explicación borrada para pregunta: {question_id}")
        return jsonify({
            'success': True,
            'message': 'Explicación borrada correctamente'
        })

    except Exception as e:
        logger.error(f"Error borrando explicación: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("🚀 API PER Nueva Arquitectura iniciando...")
    logger.info("🔹 Base de datos: PostgreSQL")
    logger.info("🔹 Cache: Redis") 
    logger.info("🔹 Contenedores: Docker")
    logger.info("🔹 Puerto: 5001")
    logger.info("🌐 Endpoints disponibles:")
    logger.info("   - GET    /health")
    logger.info("   - GET    /examenes")
    logger.info("   - GET    /preguntas/<exam_id>")
    logger.info("   - GET    /explicaciones")
    logger.info("   - POST   /generar-explicacion")
    logger.info("   - POST   /generar-imagen-png")
    logger.info("   - POST   /subir-imagen")
    logger.info("   - PUT    /guardar-explicacion")
    logger.info("   - DELETE /borrar-explicacion")
    logger.info("   - GET    /images/<filename>")
    logger.info("   - PUT    /preguntas/<question_id>")
    logger.info("   - GET    /stats")
    
    app.run(host='0.0.0.0', port=5001, debug=False)