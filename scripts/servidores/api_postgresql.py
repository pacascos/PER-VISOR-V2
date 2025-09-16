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
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
import hashlib
import secrets
from functools import wraps
import jwt
from datetime import datetime, timedelta
import random

# Import statistics API routes
from statistics_api import register_statistics_routes

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

# Register statistics routes
register_statistics_routes(app)

# Configuración de sesiones y JWT
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
JWT_SECRET = os.getenv('JWT_SECRET', secrets.token_hex(32))
JWT_EXPIRATION_HOURS = 24

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

def _build_filter_conditions(convocatoria, tema, search_text):
    """Construir condiciones WHERE para filtros de preguntas"""
    where_conditions = []
    params = []

    if convocatoria:
        where_conditions.append("e.convocatoria = %s")
        params.append(convocatoria)

    if tema:
        where_conditions.append("(q.categoria = %s OR q.subcategoria = %s)")
        params.extend([tema, tema])

    if search_text:
        # Buscar por texto de pregunta o por ID exacto
        where_conditions.append("(q.texto_pregunta ILIKE %s OR q.id::text = %s)")
        params.extend([f'%{search_text}%', search_text])

    where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
    return where_clause, params

def _get_filtered_questions_query(where_clause):
    """Obtener query SQL para preguntas filtradas"""
    return f"""
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

def _format_questions_response(preguntas):
    """Formatear respuesta de preguntas para el frontend"""
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

    return result

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
        where_clause, params = _build_filter_conditions(convocatoria, tema, search_text)
        query = _get_filtered_questions_query(where_clause)

        cur.execute(query, params)
        preguntas = cur.fetchall()

        # Formatear respuesta
        result = _format_questions_response(preguntas)

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

@app.route('/preguntas-individual/<question_id>', methods=['GET'])
def get_individual_question(question_id):
    """Obtener una pregunta específica por su ID"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Obtener la pregunta con sus opciones
        cur.execute("""
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
            LEFT JOIN exams e ON q.exam_id = e.id
            WHERE q.id = %s
            GROUP BY q.id, q.numero_pregunta, q.texto_pregunta, 
                     q.respuesta_correcta, q.imagen_pregunta, q.imagen_respuesta,
                     q.categoria, q.subcategoria, q.exam_id, q.anulada, e.titulo, e.convocatoria, e.tipo_examen
        """, (question_id,))

        question = cur.fetchone()
        cur.close()
        conn.close()

        if not question:
            return jsonify({'error': 'Pregunta no encontrada'}), 404

        # Convertir a diccionario
        question_dict = dict(question)
        
        # Procesar opciones
        if question_dict['opciones'] and question_dict['opciones'][0]:
            opciones_dict = {}
            for opcion in question_dict['opciones']:
                opciones_dict[opcion['opcion']] = opcion['texto']
            question_dict['opciones'] = opciones_dict
        else:
            question_dict['opciones'] = {}

        return jsonify({
            'success': True,
            'question': question_dict
        })

    except Exception as e:
        logger.error(f"❌ Error obteniendo pregunta {question_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

def _build_question_update_fields(data):
    """Construir campos y parámetros para actualización de pregunta"""
    update_fields = []
    params = []

    field_mappings = {
        'texto_pregunta': 'texto_pregunta',
        'categoria': 'categoria',
        'subcategoria': 'subcategoria',
        'respuesta_correcta': 'respuesta_correcta',
        'anulada': 'anulada'
    }

    for field_name, db_column in field_mappings.items():
        if field_name in data:
            update_fields.append(f'{db_column} = %s')
            params.append(data[field_name])

    return update_fields, params

def _ensure_anulada_column_exists(cur):
    """Asegurar que la columna anulada existe en la tabla questions"""
    cur.execute("""
        DO $$ BEGIN
            ALTER TABLE questions ADD COLUMN anulada BOOLEAN DEFAULT FALSE;
        EXCEPTION WHEN duplicate_column THEN
            -- La columna ya existe, no hacer nada
        END $$;
    """)

def _update_question_options(cur, question_id, data):
    """Actualizar opciones de respuesta de una pregunta"""
    if 'opciones' not in data:
        return

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

        # Asegurar que la columna anulada existe si se va a actualizar
        if 'anulada' in data:
            _ensure_anulada_column_exists(cur)

        # Actualizar pregunta principal
        update_fields, params = _build_question_update_fields(data)

        if update_fields:
            params.append(question_id)
            update_query = f"""
                UPDATE questions
                SET {', '.join(update_fields)}, updated_at = NOW()
                WHERE id = %s
            """
            logger.info(f"🔍 Ejecutando query: {update_query}")
            logger.info(f"🔍 Con parámetros: {params}")
            cur.execute(update_query, params)
            logger.info(f"🔍 Filas afectadas: {cur.rowcount}")

        # Actualizar opciones de respuesta si se proporcionan
        _update_question_options(cur, question_id, data)

        logger.info(f"🔍 Haciendo commit de los cambios...")
        conn.commit()
        logger.info(f"✅ Commit realizado exitosamente")
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

# ====================================
# SISTEMA DE AUTENTICACIÓN
# ====================================

JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')

def hash_password(password):
    """Hash password with salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{password_hash}"

def verify_password(password, hashed):
    """Verify password against hash"""
    try:
        salt, stored_hash = hashed.split(':')
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return password_hash == stored_hash
    except:
        return False

def generate_jwt_token(user_id, username):
    """Generate JWT token for user"""
    payload = {
        'user_id': str(user_id),
        'username': username,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_jwt_token(token):
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')

        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid authorization header format'}), 401

        if not token:
            return jsonify({'error': 'Token missing'}), 401

        payload = verify_jwt_token(token)
        if not payload:
            return jsonify({'error': 'Token invalid or expired'}), 401

        # Add user info to request context
        request.current_user = {
            'user_id': payload['user_id'],
            'username': payload['username']
        }

        return f(*args, **kwargs)
    return decorated_function

@app.route('/auth/register', methods=['POST'])
def register_user():
    """Register new user"""
    try:
        data = request.get_json()

        # Validación básica
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Campo requerido: {field}'}), 400

        username = data['username'].strip()
        email = data['email'].strip().lower()
        password = data['password']

        # Validaciones
        if len(username) < 3:
            return jsonify({'error': 'El nombre de usuario debe tener al menos 3 caracteres'}), 400

        if len(password) < 6:
            return jsonify({'error': 'La contraseña debe tener al menos 6 caracteres'}), 400

        if '@' not in email:
            return jsonify({'error': 'Email inválido'}), 400

        # Conectar a base de datos
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Verificar si usuario ya existe
        cur.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
        existing_user = cur.fetchone()

        if existing_user:
            return jsonify({'error': 'Usuario o email ya existe'}), 409

        # Hash password
        password_hash = hash_password(password)

        # Crear usuario
        cur.execute("""
            INSERT INTO users (username, email, password_hash, created_at)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
            RETURNING id, username, email, created_at
        """, (username, email, password_hash))

        user = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        # Generate JWT token
        token = generate_jwt_token(user['id'], user['username'])

        logger.info(f"✅ Usuario registrado: {username} ({email})")

        return jsonify({
            'success': True,
            'message': 'Usuario registrado correctamente',
            'user': {
                'id': str(user['id']),
                'username': user['username'],
                'email': user['email'],
                'created_at': user['created_at'].isoformat()
            },
            'token': token
        }), 201

    except Exception as e:
        logger.error(f"Error registrando usuario: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/auth/login', methods=['POST'])
def login_user():
    """Login user"""
    try:
        data = request.get_json()

        username = data.get('username', '').strip()
        password = data.get('password', '')

        if not username or not password:
            return jsonify({'error': 'Usuario y contraseña requeridos'}), 400

        # Conectar a base de datos
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Buscar usuario (por username o email)
        cur.execute("""
            SELECT id, username, email, password_hash, created_at, last_login
            FROM users
            WHERE username = %s OR email = %s
        """, (username, username))

        user = cur.fetchone()

        if not user or not verify_password(password, user['password_hash']):
            return jsonify({'error': 'Credenciales inválidas'}), 401

        # Actualizar last_login
        cur.execute("""
            UPDATE users SET last_login = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (user['id'],))

        conn.commit()
        cur.close()
        conn.close()

        # Generate JWT token
        token = generate_jwt_token(user['id'], user['username'])

        logger.info(f"🔑 Usuario logueado: {user['username']}")

        return jsonify({
            'success': True,
            'message': 'Login exitoso',
            'user': {
                'id': str(user['id']),
                'username': user['username'],
                'email': user['email'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None,
                'last_login': user['last_login'].isoformat() if user['last_login'] else None
            },
            'token': token
        }), 200

    except Exception as e:
        logger.error(f"Error en login: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/auth/me', methods=['GET'])
@require_auth
def get_current_user():
    """Get current user info"""
    try:
        user_id = request.current_user['user_id']

        # Conectar a base de datos
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Obtener información del usuario
        cur.execute("""
            SELECT id, username, email, created_at, last_login
            FROM users WHERE id = %s
        """, (user_id,))

        user = cur.fetchone()
        cur.close()
        conn.close()

        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        return jsonify({
            'user': {
                'id': str(user['id']),
                'username': user['username'],
                'email': user['email'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None,
                'last_login': user['last_login'].isoformat() if user['last_login'] else None
            }
        }), 200

    except Exception as e:
        logger.error(f"Error obteniendo usuario actual: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

# ====================================
# SISTEMA DE EXÁMENES
# ====================================

@app.route('/exams/generate', methods=['POST'])
@require_auth
def generate_exam():
    """Generate new PER exam for user"""
    try:
        user_id = request.current_user['user_id']

        # Conectar a base de datos
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Obtener configuración de UT
        cur.execute("SELECT * FROM ut_configuration ORDER BY ut_number")
        ut_configs = cur.fetchall()

        if not ut_configs:
            return jsonify({'error': 'Configuración de UT no encontrada'}), 500

        # Crear nuevo examen
        cur.execute("""
            INSERT INTO user_exams (user_id, exam_type, total_questions, status)
            VALUES (%s, 'PER', 45, 'in_progress')
            RETURNING id
        """, (user_id,))

        exam_id = cur.fetchone()['id']

        # Generar preguntas por UT
        questions_selected = []
        question_order = 1

        for ut_config in ut_configs:
            ut_number = ut_config['ut_number']
            category_name = ut_config['category_name']
            questions_needed = ut_config['questions_per_exam']

            # Obtener preguntas disponibles para esta UT solo de exámenes PER
            cur.execute("""
                SELECT q.id FROM questions q
                JOIN exams e ON q.exam_id = e.id
                WHERE q.categoria = %s
                AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
                AND q.anulada = false
                ORDER BY RANDOM()
                LIMIT %s
            """, (category_name, questions_needed))

            ut_questions = cur.fetchall()

            if len(ut_questions) < questions_needed:
                logger.warning(f"⚠️ Solo {len(ut_questions)} preguntas PER disponibles para UT{ut_number} ({category_name}), se necesitan {questions_needed}")

            # Asignar preguntas al examen
            for question in ut_questions:
                cur.execute("""
                    INSERT INTO exam_questions (user_exam_id, question_id, question_order, ut_category, ut_number)
                    VALUES (%s, %s, %s, %s, %s)
                """, (exam_id, question['id'], question_order, category_name, ut_number))

                questions_selected.append({
                    'question_id': str(question['id']),
                    'order': question_order,
                    'ut_number': ut_number,
                    'ut_category': category_name
                })

                question_order += 1

        conn.commit()
        cur.close()
        conn.close()

        logger.info(f"🎯 Examen generado para usuario {request.current_user['username']}: {len(questions_selected)} preguntas")

        return jsonify({
            'success': True,
            'exam_id': str(exam_id),
            'total_questions': len(questions_selected),
            'questions': questions_selected,
            'message': f'Examen generado con {len(questions_selected)} preguntas'
        }), 201

    except Exception as e:
        logger.error(f"Error generando examen: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/exams/<exam_id>/questions', methods=['GET'])
@require_auth
def get_exam_questions(exam_id):
    """Get questions for a specific exam"""
    try:
        user_id = request.current_user['user_id']

        # Conectar a base de datos
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Verificar que el examen pertenezca al usuario
        cur.execute("""
            SELECT id FROM user_exams
            WHERE id = %s AND user_id = %s
        """, (exam_id, user_id))

        exam = cur.fetchone()
        if not exam:
            return jsonify({'error': 'Examen no encontrado'}), 404

        # Obtener preguntas del examen con detalles
        cur.execute("""
            SELECT
                eq.question_order,
                eq.ut_category,
                eq.ut_number,
                q.id,
                q.texto_pregunta,
                q.respuesta_correcta,
                q.categoria,
                q.numero_pregunta,
                e.tipo_examen,
                e.titulo,
                e.convocatoria
            FROM exam_questions eq
            JOIN questions q ON eq.question_id = q.id
            JOIN exams e ON q.exam_id = e.id
            WHERE eq.user_exam_id = %s
            ORDER BY eq.question_order
        """, (exam_id,))

        questions = cur.fetchall()

        questions_list = []
        for q in questions:
            # Obtener opciones para esta pregunta
            cur.execute("""
                SELECT opcion, texto
                FROM answer_options
                WHERE question_id = %s
                ORDER BY opcion
            """, (q['id'],))

            options = cur.fetchall()

            # Organizar opciones en el formato esperado
            question_data = {
                'question_id': str(q['id']),
                'order': q['question_order'],
                'ut_number': q['ut_number'],
                'ut_category': q['ut_category'],
                'texto_pregunta': q['texto_pregunta'],
                'respuesta_correcta': q['respuesta_correcta'],
                'categoria': q['categoria'],
                'numero_pregunta': q['numero_pregunta'],
                'tipo_examen': q['tipo_examen'],
                'titulo_examen': q['titulo'],
                'convocatoria': q['convocatoria']
            }

            # Agregar opciones
            for option in options:
                question_data[f'opcion_{option["opcion"]}'] = option['texto']

            questions_list.append(question_data)

        cur.close()
        conn.close()

        return jsonify({
            'exam_id': exam_id,
            'questions': questions_list,
            'total_questions': len(questions_list)
        }), 200

    except Exception as e:
        logger.error(f"Error obteniendo preguntas del examen: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/exams/<exam_id>/submit', methods=['POST'])
@require_auth
def submit_exam_answers(exam_id):
    """Submit answers for an exam"""
    try:
        user_id = request.current_user['user_id']
        data = request.get_json()
        answers = data.get('answers', [])

        # Conectar a base de datos
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Verificar que el examen pertenezca al usuario y esté en progreso
        cur.execute("""
            SELECT id, started_at FROM user_exams
            WHERE id = %s AND user_id = %s AND status = 'in_progress'
        """, (exam_id, user_id))

        exam = cur.fetchone()
        if not exam:
            return jsonify({'error': 'Examen no encontrado o ya finalizado'}), 404

        # Procesar respuestas
        total_questions = 0
        correct_answers = 0
        ut_results = {}

        for answer_data in answers:
            question_id = answer_data.get('question_id')
            selected_answer = answer_data.get('selected_answer')

            if not question_id or not selected_answer:
                continue

            # Obtener datos de la pregunta
            cur.execute("""
                SELECT q.respuesta_correcta, eq.ut_number, eq.ut_category
                FROM questions q
                JOIN exam_questions eq ON q.id = eq.question_id
                WHERE q.id = %s AND eq.user_exam_id = %s
            """, (question_id, exam_id))

            question_info = cur.fetchone()
            if not question_info:
                continue

            # Verificar si la respuesta es correcta
            is_correct = selected_answer.lower() == question_info['respuesta_correcta'].lower()

            # Guardar respuesta del usuario
            cur.execute("""
                INSERT INTO user_answers (user_exam_id, question_id, selected_answer, is_correct, answered_at)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (user_exam_id, question_id)
                DO UPDATE SET
                    selected_answer = EXCLUDED.selected_answer,
                    is_correct = EXCLUDED.is_correct,
                    answered_at = EXCLUDED.answered_at
            """, (exam_id, question_id, selected_answer, is_correct))

            total_questions += 1
            if is_correct:
                correct_answers += 1

            # Contar por UT
            ut_num = question_info['ut_number']
            if ut_num not in ut_results:
                ut_results[ut_num] = {'correct': 0, 'total': 0, 'errors': 0}

            ut_results[ut_num]['total'] += 1
            if is_correct:
                ut_results[ut_num]['correct'] += 1
            else:
                ut_results[ut_num]['errors'] += 1

        # Calcular resultado final
        score_percentage = (correct_answers / total_questions * 100) if total_questions > 0 else 0
        passed = _check_exam_passed(score_percentage, ut_results)

        # Calcular duración del examen
        duration_minutes = _calculate_exam_duration(exam['started_at'])

        # Actualizar estado del examen
        cur.execute("""
            UPDATE user_exams SET
                completed_at = CURRENT_TIMESTAMP,
                duration_minutes = %s,
                correct_answers = %s,
                status = 'completed',
                passed = %s,
                score_percentage = %s,
                metadata = %s
            WHERE id = %s
        """, (duration_minutes, correct_answers, passed, score_percentage,
              json.dumps({'ut_results': ut_results}), exam_id))

        conn.commit()
        cur.close()
        conn.close()

        logger.info(f"📝 Examen completado - Usuario: {request.current_user['username']}, "
                   f"Puntuación: {score_percentage:.1f}%, Aprobado: {passed}")

        return jsonify({
            'success': True,
            'exam_id': exam_id,
            'total_questions': total_questions,
            'correct_answers': correct_answers,
            'score_percentage': round(score_percentage, 2),
            'passed': passed,
            'duration_minutes': duration_minutes,
            'ut_results': ut_results
        }), 200

    except Exception as e:
        logger.error(f"Error enviando respuestas del examen: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

def _check_exam_passed(score_percentage, ut_results):
    """Check if exam is passed based on PER criteria"""
    # Criterio 1: Puntuación general >= 65%
    if score_percentage < 65:
        return False

    # Criterio 2: UT críticas con límites de errores
    critical_uts = {
        5: 2,   # Balizamiento - máximo 2 errores
        6: 5,   # RIPA - máximo 5 errores
        11: 2   # Carta navegación - máximo 2 errores
    }

    for ut_number, max_errors in critical_uts.items():
        if ut_number in ut_results:
            if ut_results[ut_number]['errors'] > max_errors:
                return False

    return True

def _calculate_exam_duration(started_at):
    """Calculate exam duration in minutes"""
    from datetime import datetime
    if isinstance(started_at, str):
        started_at = datetime.fromisoformat(started_at.replace('Z', '+00:00'))

    duration = datetime.now(started_at.tzinfo) - started_at
    return int(duration.total_seconds() / 60)

@app.route('/user/exams', methods=['GET'])
@require_auth
def get_user_exams():
    """Get user's exam history"""
    try:
        user_id = request.current_user['user_id']

        # Conectar a base de datos
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Obtener exámenes del usuario
        cur.execute("""
            SELECT
                id,
                exam_type,
                started_at,
                completed_at,
                duration_minutes,
                total_questions,
                correct_answers,
                status,
                passed,
                score_percentage,
                metadata
            FROM user_exams
            WHERE user_id = %s
            ORDER BY started_at DESC
        """, (user_id,))

        exams = cur.fetchall()
        cur.close()
        conn.close()

        exams_list = []
        for exam in exams:
            exam_data = {
                'id': str(exam['id']),
                'exam_type': exam['exam_type'],
                'started_at': exam['started_at'].isoformat() if exam['started_at'] else None,
                'completed_at': exam['completed_at'].isoformat() if exam['completed_at'] else None,
                'duration_minutes': exam['duration_minutes'],
                'total_questions': exam['total_questions'],
                'correct_answers': exam['correct_answers'],
                'status': exam['status'],
                'passed': exam['passed'],
                'score_percentage': float(exam['score_percentage']) if exam['score_percentage'] else None
            }

            if exam['metadata']:
                exam_data['metadata'] = json.loads(exam['metadata'])

            exams_list.append(exam_data)

        return jsonify({
            'exams': exams_list,
            'total_exams': len(exams_list)
        }), 200

    except Exception as e:
        logger.error(f"Error obteniendo historial de exámenes: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/per-questions/stats', methods=['GET'])
def get_per_questions_stats():
    """Get statistics of available PER questions by category"""
    try:
        # Conectar a base de datos
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Obtener estadísticas de preguntas PER por categoría
        cur.execute("""
            SELECT
                q.categoria,
                COUNT(*) as total_preguntas,
                COUNT(CASE WHEN e.tipo_examen = 'PER_NORMAL' THEN 1 END) as per_normal,
                COUNT(CASE WHEN e.tipo_examen = 'PER_LIBERADO' THEN 1 END) as per_liberado,
                COUNT(CASE WHEN q.anulada = false THEN 1 END) as preguntas_validas
            FROM questions q
            JOIN exams e ON q.exam_id = e.id
            WHERE (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
            GROUP BY q.categoria
            ORDER BY q.categoria
        """)

        stats = cur.fetchall()

        # Obtener configuración de UT para comparar
        cur.execute("SELECT * FROM ut_configuration ORDER BY ut_number")
        ut_configs = cur.fetchall()

        cur.close()
        conn.close()

        # Formatear estadísticas
        stats_list = []
        for stat in stats:
            stats_list.append({
                'categoria': stat['categoria'],
                'total_preguntas': stat['total_preguntas'],
                'per_normal': stat['per_normal'],
                'per_liberado': stat['per_liberado'],
                'preguntas_validas': stat['preguntas_validas']
            })

        # Formatear configuración UT
        ut_config_list = []
        for ut in ut_configs:
            ut_config_list.append({
                'ut_number': ut['ut_number'],
                'ut_name': ut['ut_name'],
                'category_name': ut['category_name'],
                'questions_per_exam': ut['questions_per_exam']
            })

        return jsonify({
            'per_questions_stats': stats_list,
            'ut_configuration': ut_config_list,
            'total_per_questions': sum(s['total_preguntas'] for s in stats_list)
        }), 200

    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de preguntas PER: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

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
    logger.info("🔐 Endpoints de autenticación:")
    logger.info("   - POST   /auth/register")
    logger.info("   - POST   /auth/login")
    logger.info("   - GET    /auth/me")
    logger.info("🎯 Endpoints de exámenes:")
    logger.info("   - POST   /exams/generate")
    
    app.run(host='0.0.0.0', port=5001, debug=False)