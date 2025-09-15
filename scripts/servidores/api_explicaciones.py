#!/usr/bin/env python3
"""
API Flask simple para generar explicaciones con GPT-5
Arquitectura: API separada en puerto 5000, visor web en puerto 8095
"""

import json
import os
import requests
import logging
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

# Configuración
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', 'your-api-key-here')
EXPLICACIONES_JSON_PATH = '../../data/json/explicaciones.json'
IMAGES_DIR = 'src/web/images'

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Funciones para manejar el archivo JSON de explicaciones
def load_explicaciones():
    """Cargar explicaciones desde el archivo JSON"""
    try:
        if os.path.exists(EXPLICACIONES_JSON_PATH):
            with open(EXPLICACIONES_JSON_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    except Exception as e:
        logger.error(f"Error cargando explicaciones: {e}")
        return {}

def save_explicaciones(explicaciones):
    """Guardar explicaciones en el archivo JSON"""
    try:
        # Asegurar que el directorio existe
        os.makedirs(os.path.dirname(EXPLICACIONES_JSON_PATH), exist_ok=True)
        
        with open(EXPLICACIONES_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(explicaciones, f, ensure_ascii=False, indent=2)
        logger.info(f"✅ Explicaciones guardadas en {EXPLICACIONES_JSON_PATH}")
    except Exception as e:
        logger.error(f"Error guardando explicaciones: {e}")

def generate_hash_pregunta(pregunta_data):
    """Generar hash único para la pregunta (mismo algoritmo que el JSON de preguntas)"""
    import hashlib
    
    # Normalizar enunciado
    enunciado_norm = " ".join(pregunta_data['enunciado'].lower().split())
    
    # Normalizar opciones (solo texto, ordenado)
    opciones_norm = []
    for opcion in pregunta_data['opciones']:
        texto_norm = " ".join(opcion.get('texto', '').lower().split())
        if texto_norm:  # Solo añadir si no está vacío
            opciones_norm.append(texto_norm)
    
    # Crear contenido para hash (mismo formato que duplicate_manager.py)
    contenido = f"{enunciado_norm}|{'|'.join(sorted(opciones_norm))}"
    
    # Generar hash SHA-256 truncado (mismo algoritmo)
    return hashlib.sha256(contenido.encode('utf-8')).hexdigest()[:16]

def generate_image_png_with_gpt5(image_prompt):
    """Generar imagen PNG usando GPT-5 con el prompt existente"""
    try:
        # Crear prompt específico para generar imagen PNG
        prompt = f"""Eres un generador de imágenes técnicas náuticas. Basándote en este prompt de imagen:

PROMPT ORIGINAL: {image_prompt}

Genera una imagen PNG (1024x1024px) que represente exactamente lo descrito en el prompt. La imagen debe ser:
- Estilo técnico náutico profesional
- Colores: grises, azules marinos, blancos
- Líneas claras y definidas
- Aspecto minimalista pero informativo
- Sin gradientes complejos
- Fondo blanco o transparente

FORMATO DE SALIDA (JSON estrictamente):
{{
  "image_png_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "description": "Descripción breve de la imagen generada"
}}

Genera la imagen como base64 PNG y devuélvela en el campo image_png_base64."""

        logger.info(f"🎨 Generando imagen PNG con GPT-5: {image_prompt[:100]}...")
        
        # Llamar a GPT-5
        gpt5_response = call_gpt5(prompt)
        
        if not gpt5_response:
            raise Exception("GPT-5 no respondió para generación de imagen")
        
        # Parsear JSON de GPT-5
        try:
            image_data = json.loads(gpt5_response)
            base64_image = image_data.get('image_png_base64', '')
            
            if not base64_image or not base64_image.startswith('data:image/png;base64,'):
                raise Exception("GPT-5 no generó imagen PNG válida")
            
            # Decodificar base64
            import base64
            image_bytes = base64.b64decode(base64_image.split(',')[1])
            
            logger.info("✅ Imagen PNG generada correctamente con GPT-5")
            return image_bytes
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Error parseando JSON de imagen: {e}")
            raise Exception("Respuesta de GPT-5 no es JSON válido para imagen")
            
    except Exception as e:
        logger.error(f"❌ Error generando imagen PNG: {e}")
        raise e

def save_image_png_to_server(image_data, hash_pregunta):
    """Guardar imagen PNG en el servidor y retornar URL relativa"""
    # Crear directorio si no existe
    os.makedirs(IMAGES_DIR, exist_ok=True)
    
    # Generar nombre de archivo único
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{hash_pregunta}_{timestamp}.png"
    filepath = os.path.join(IMAGES_DIR, filename)
    
    # Guardar imagen
    with open(filepath, 'wb') as f:
        f.write(image_data)
    
    logger.info(f"💾 Imagen PNG guardada: {filename}")
    
    # Retornar URL relativa
    return f"images/{filename}"

# Crear app Flask
app = Flask(__name__)

# Configurar CORS explícitamente
CORS(app, origins=['http://localhost:8095'], 
     methods=['GET', 'POST', 'OPTIONS'],
     allow_headers=['Content-Type'],
     supports_credentials=True)

def call_gpt5(prompt):
    """Llama a GPT-5 usando requests (como en el test exitoso)"""
    url = 'https://api.openai.com/v1/responses'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {OPENAI_API_KEY}'
    }
    
    request_body = {
        'model': 'gpt-5-2025-08-07',
        'input': prompt
    }
    
    logger.info("🚀 Llamando a GPT-5 desde API Flask")
    
    try:
        response = requests.post(url, headers=headers, json=request_body, timeout=300)
        
        if response.status_code == 200:
            data = response.json()
            # Extraer texto como en el test exitoso de Node.js
            text_content = data['output'][1]['content'][0]['text']
            logger.info("✅ GPT-5 respondió correctamente")
            logger.info("📤 RESPUESTA DE GPT-5:")
            logger.info("=" * 80)
            logger.info(text_content)
            logger.info("=" * 80)
            return text_content
        elif response.status_code == 401:
            logger.error(f"❌ API Key inválida o expirada: {response.text}")
            return None
        else:
            logger.error(f"❌ Error GPT-5: {response.status_code} - {response.text}")
            return None
            
    except requests.Timeout:
        logger.error(f"❌ Timeout llamando a GPT-5 (300 segundos): GPT-5 está tardando mucho en responder")
        return None
    except Exception as e:
        logger.error(f"❌ Excepción llamando a GPT-5: {e}")
        return None

def create_prompt(pregunta_data):
    """Crear prompt exactamente igual que en el test exitoso"""
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

@app.route('/generar-explicacion', methods=['POST', 'OPTIONS'])
def generar_explicacion():
    """Endpoint principal para generar explicaciones"""
    # Manejar preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
        
    try:
        pregunta_data = request.get_json()
        
        if not pregunta_data:
            return jsonify({'error': 'No se recibió data de pregunta'}), 400
        
        logger.info(f"📝 Pregunta recibida: {pregunta_data.get('enunciado', '')[:50]}...")
        
        # Crear prompt y llamar a GPT-5
        prompt = create_prompt(pregunta_data)
        logger.info("📋 PROMPT ENVIADO A GPT-5:")
        logger.info("=" * 80)
        logger.info(prompt)
        logger.info("=" * 80)
        gpt5_response = call_gpt5(prompt)
        
        if not gpt5_response:
            response = jsonify({'error': 'GPT-5 no está disponible. Verifica que la API key sea válida y esté activa.'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
            return response, 503
        
        # Parsear JSON de GPT-5
        try:
            explicacion_data = json.loads(gpt5_response)
        except json.JSONDecodeError as e:
            logger.error(f"❌ Error parseando JSON de GPT-5: {e}")
            logger.error(f"📝 Respuesta recibida: {gpt5_response}")
            return jsonify({'error': 'Respuesta de GPT-5 no es JSON válido'}), 500
        
        # Convertir al formato esperado por el visor (nuevo formato más simple)
        resultado = {
            'id': f"exp_{int(datetime.now().timestamp())}",
            'resumen_pregunta': 'Explicación generada por GPT-5',
            'opciones': [],  # Se llenará desde el markdown
            'conclusion': explicacion_data.get('markdown', 'Explicación no disponible'),
            'recursos_visuales': [],
            'nivel_dificultad': 'Intermedio',
            'fecha_creacion': datetime.now().isoformat(),
            'llm_utilizado': 'openai-gpt-5-flask-api',
            'image_prompt': explicacion_data.get('image_prompt', '')  # Campo para generador de imágenes
        }
        
        # Añadir diagrama SVG si existe
        if explicacion_data.get('diagram_svg') and explicacion_data['diagram_svg'] != 'null':
            svg_content = explicacion_data['diagram_svg'].strip()
            if svg_content and svg_content != 'null':
                resultado['recursos_visuales'].append({
                    'tipo': 'svg',
                    'descripcion': 'Diagrama explicativo generado por IA',
                    'svg_content': svg_content,
                    'texto_alternativo': 'Diagrama que ilustra la respuesta correcta'
                })
                logger.info("✅ SVG diagrama añadido a recursos visuales")
            else:
                logger.info("ℹ️ SVG no generado (null o vacío)")
        else:
            logger.info("ℹ️ No se generó diagrama SVG")
        
        # Usar el hash_pregunta que ya viene en los datos (generado en el proceso de duplicados)
        hash_pregunta = pregunta_data.get('hash_pregunta', '')
        if not hash_pregunta:
            # Fallback: generar hash si no viene en los datos
            hash_pregunta = generate_hash_pregunta(pregunta_data)
            logger.warning(f"⚠️ Hash no encontrado en datos, generado: {hash_pregunta}")
        
        resultado['hash_pregunta'] = hash_pregunta
        
        # Cargar explicaciones existentes
        explicaciones = load_explicaciones()
        
        # Guardar nueva explicación
        explicaciones[hash_pregunta] = resultado
        
        # Guardar en archivo JSON
        save_explicaciones(explicaciones)
        
        logger.info(f"✅ Explicación guardada con hash: {hash_pregunta}")
        logger.info("✅ Explicación generada y convertida exitosamente")
        response = jsonify(resultado)
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
        return response
        
    except Exception as e:
        logger.error(f"❌ Error en endpoint: {e}")
        response = jsonify({'error': f'Error interno: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
        return response, 500

@app.route('/explicaciones', methods=['GET'])
def get_explicaciones():
    """Obtener todas las explicaciones guardadas"""
    try:
        explicaciones_raw = load_explicaciones()

        # Convertir formato nuevo a formato esperado por frontend (manteniendo campos visuales)
        explicaciones_converted = {}
        for exp_id, exp_data in explicaciones_raw.items():
            # Crear explicación en formato markdown combinando resumen y conclusion
            explicacion_markdown = ""
            if exp_data.get('resumen_pregunta'):
                explicacion_markdown += f"# {exp_data['resumen_pregunta']}\n\n"
            if exp_data.get('conclusion'):
                explicacion_markdown += exp_data['conclusion']

            # Crear entrada convertida manteniendo TODOS los campos originales
            converted_entry = {
                # Campos para compatibilidad con frontend antiguo
                'explicacion': explicacion_markdown,
                'fecha': exp_data.get('fecha_creacion', ''),
                'modelo': exp_data.get('llm_utilizado', 'GPT-5'),
                'pregunta': exp_data.get('resumen_pregunta', ''),

                # MANTENER TODOS los campos del formato nuevo para funcionalidad visual
                **exp_data  # Esto incluye recursos_visuales, image_uploaded_url, etc.
            }
            explicaciones_converted[exp_id] = converted_entry

        response = jsonify(explicaciones_converted)
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
        return response
    except Exception as e:
        logger.error(f"Error obteniendo explicaciones: {e}")
        response = jsonify({'error': str(e)})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
        return response, 500

@app.route('/explicacion/<hash_pregunta>', methods=['GET'])
def get_explicacion(hash_pregunta):
    """Obtener una explicación específica por hash"""
    try:
        explicaciones = load_explicaciones()
        if hash_pregunta in explicaciones:
            response = jsonify(explicaciones[hash_pregunta])
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
            return response
        else:
            response = jsonify({'error': 'Explicación no encontrada'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
            return response, 404
    except Exception as e:
        logger.error(f"Error obteniendo explicación {hash_pregunta}: {e}")
        response = jsonify({'error': str(e)})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
        return response, 500

@app.route('/reemplazar-svg-con-imagen', methods=['POST', 'OPTIONS'])
def reemplazar_svg_con_imagen():
    """Reemplazar SVG con imagen PNG generada por GPT-5"""
    # Manejar preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    try:
        data = request.get_json()
        hash_pregunta = data.get('hash_pregunta')
        
        if not hash_pregunta:
            response = jsonify({'error': 'hash_pregunta es requerido'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 400
        
        # Cargar explicaciones
        explicaciones = load_explicaciones()
        
        if hash_pregunta not in explicaciones:
            response = jsonify({'error': 'Explicación no encontrada'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 404
        
        explicacion = explicaciones[hash_pregunta]
        image_prompt = explicacion.get('image_prompt')
        
        if not image_prompt:
            response = jsonify({'error': 'No hay prompt de imagen disponible'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 400
        
        logger.info(f"🎨 Generando imagen PNG para hash {hash_pregunta}")
        logger.info(f"📝 Prompt: {image_prompt[:100]}...")
        
        # Generar imagen PNG con GPT-5
        image_data = generate_image_png_with_gpt5(image_prompt)
        
        # Guardar imagen PNG en servidor
        image_url = save_image_png_to_server(image_data, hash_pregunta)
        
        # Actualizar explicación con nueva URL de imagen PNG
        explicacion['image_png_url'] = image_url
        explicacion['image_png_generated_at'] = datetime.now().isoformat()
        
        # Guardar explicaciones actualizadas
        save_explicaciones(explicaciones)
        
        logger.info(f"✅ Imagen PNG generada y guardada: {image_url}")
        
        response = jsonify({
            'success': True,
            'image_png_url': image_url,
            'message': 'Imagen PNG generada correctamente'
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    except Exception as e:
        logger.error(f"❌ Error generando imagen PNG: {e}")
        response = jsonify({
            'error': f'Error generando imagen PNG: {str(e)}'
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/subir-imagen', methods=['POST', 'OPTIONS'])
def subir_imagen():
    """Subir imagen para reemplazar SVG en explicación"""
    # Manejar preflight OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    try:
        # Obtener datos del formulario
        hash_pregunta = request.form.get('hash_pregunta')
        
        if not hash_pregunta:
            response = jsonify({'error': 'hash_pregunta es requerido'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 400
        
        # Verificar que hay archivo
        if 'imagen' not in request.files:
            response = jsonify({'error': 'No se encontró archivo de imagen'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 400
        
        file = request.files['imagen']
        
        if file.filename == '':
            response = jsonify({'error': 'No se seleccionó archivo'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 400
        
        # Verificar que la explicación existe
        explicaciones = load_explicaciones()
        if hash_pregunta not in explicaciones:
            response = jsonify({'error': 'Explicación no encontrada'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 404
        
        # Validar tipo de archivo
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            response = jsonify({'error': 'Tipo de archivo no permitido. Use: PNG, JPG, JPEG, GIF, WEBP'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 400
        
        # Crear directorio si no existe
        os.makedirs(IMAGES_DIR, exist_ok=True)
        
        # Generar nombre de archivo único
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{hash_pregunta}_{timestamp}.{file_extension}"
        filepath = os.path.join(IMAGES_DIR, filename)
        
        # Guardar archivo
        file.save(filepath)
        
        # Actualizar explicación con nueva URL de imagen
        explicacion = explicaciones[hash_pregunta]
        explicacion['image_uploaded_url'] = f"images/{filename}"
        explicacion['image_uploaded_at'] = datetime.now().isoformat()
        explicacion['image_uploaded_filename'] = file.filename
        
        # Guardar explicaciones actualizadas
        save_explicaciones(explicaciones)
        
        logger.info(f"✅ Imagen subida correctamente: {filename}")
        
        response = jsonify({
            'success': True,
            'image_url': f"images/{filename}",
            'message': 'Imagen subida correctamente'
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    except Exception as e:
        logger.error(f"❌ Error subiendo imagen: {e}")
        response = jsonify({
            'error': f'Error subiendo imagen: {str(e)}'
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/images/<filename>')
def serve_image(filename):
    """Servir imágenes estáticas"""
    try:
        filepath = os.path.join(IMAGES_DIR, filename)
        if os.path.exists(filepath):
            # Determinar tipo MIME basado en extensión
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                mimetype = 'image/png' if filename.lower().endswith('.png') else 'image/jpeg'
            else:
                mimetype = 'image/png'  # fallback
            
            response = send_file(filepath, mimetype=mimetype)
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response
        else:
            response = jsonify({'error': 'Imagen no encontrada'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 404
    except Exception as e:
        response = jsonify({'error': f'Error sirviendo imagen: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8095')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de salud"""
    return jsonify({'status': 'OK', 'service': 'API Explicaciones GPT-5'})

@app.route('/guardar-datos', methods=['POST'])
def guardar_datos():
    """Guardar datos de preguntas modificadas"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se recibieron datos'}), 400
        
        # Ruta al archivo de datos principal
        datos_json_path = '../../data/json/data_unificado_con_duplicados.json'
        
        # Crear backup antes de modificar
        backup_path = f"{datos_json_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        if os.path.exists(datos_json_path):
            import shutil
            shutil.copy2(datos_json_path, backup_path)
            logger.info(f"📋 Backup creado: {backup_path}")
        
        # Guardar los datos actualizados
        os.makedirs(os.path.dirname(datos_json_path), exist_ok=True)
        with open(datos_json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"✅ Datos guardados exitosamente en {datos_json_path}")
        return jsonify({'success': True, 'message': 'Datos guardados correctamente'})
        
    except Exception as e:
        logger.error(f"❌ Error guardando datos: {e}")
        return jsonify({'error': f'Error guardando datos: {str(e)}'}), 500

@app.route('/guardar-explicaciones', methods=['POST'])
def guardar_explicaciones():
    """Guardar explicaciones actualizadas"""
    try:
        explicaciones = request.get_json()
        if not explicaciones:
            return jsonify({'error': 'No se recibieron explicaciones'}), 400
        
        # Crear backup antes de modificar
        backup_path = f"{EXPLICACIONES_JSON_PATH}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        if os.path.exists(EXPLICACIONES_JSON_PATH):
            import shutil
            shutil.copy2(EXPLICACIONES_JSON_PATH, backup_path)
            logger.info(f"📋 Backup explicaciones creado: {backup_path}")
        
        # Guardar las explicaciones actualizadas
        save_explicaciones(explicaciones)
        
        logger.info(f"✅ Explicaciones guardadas exitosamente")
        return jsonify({'success': True, 'message': 'Explicaciones guardadas correctamente'})
        
    except Exception as e:
        logger.error(f"❌ Error guardando explicaciones: {e}")
        return jsonify({'error': f'Error guardando explicaciones: {str(e)}'}), 500

@app.route('/borrar-explicacion', methods=['POST'])
def borrar_explicacion():
    """Borrar una explicación específica"""
    try:
        data = request.get_json()
        if not data or 'hash' not in data:
            return jsonify({'error': 'No se recibió hash de explicación'}), 400
        
        hash_explicacion = data['hash']
        
        # Cargar explicaciones actuales
        explicaciones = load_explicaciones()
        
        # Crear backup antes de modificar
        backup_path = f"{EXPLICACIONES_JSON_PATH}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        if os.path.exists(EXPLICACIONES_JSON_PATH):
            import shutil
            shutil.copy2(EXPLICACIONES_JSON_PATH, backup_path)
            logger.info(f"📋 Backup explicaciones creado: {backup_path}")
        
        # Borrar la explicación
        if hash_explicacion in explicaciones:
            del explicaciones[hash_explicacion]
            save_explicaciones(explicaciones)
            logger.info(f"✅ Explicación {hash_explicacion} borrada exitosamente")
            return jsonify({'success': True, 'message': 'Explicación borrada correctamente'})
        else:
            logger.warning(f"⚠️ Explicación {hash_explicacion} no encontrada")
            return jsonify({'success': True, 'message': 'Explicación no encontrada (ya estaba borrada)'})
        
    except Exception as e:
        logger.error(f"❌ Error borrando explicación: {e}")
        return jsonify({'error': f'Error borrando explicación: {str(e)}'}), 500

@app.route('/limpiar-explicaciones', methods=['POST'])
def limpiar_explicaciones():
    """Limpiar todas las explicaciones"""
    try:
        # Crear backup antes de modificar
        backup_path = f"{EXPLICACIONES_JSON_PATH}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        if os.path.exists(EXPLICACIONES_JSON_PATH):
            import shutil
            shutil.copy2(EXPLICACIONES_JSON_PATH, backup_path)
            logger.info(f"📋 Backup explicaciones creado: {backup_path}")
        
        # Limpiar todas las explicaciones
        save_explicaciones({})
        
        logger.info(f"✅ Todas las explicaciones han sido limpiadas")
        return jsonify({'success': True, 'message': 'Todas las explicaciones han sido limpiadas'})
        
    except Exception as e:
        logger.error(f"❌ Error limpiando explicaciones: {e}")
        return jsonify({'error': f'Error limpiando explicaciones: {str(e)}'}), 500

@app.route('/api/examenes', methods=['GET'])
def get_examenes_postgresql():
    """Obtener exámenes desde PostgreSQL para los filtros del frontend"""
    try:
        import subprocess

        # Ejecutar consulta para obtener exámenes con preguntas
        query = """
        SELECT
            e.id,
            e.titulo,
            e.fecha,
            e.convocatoria,
            e.tipo_examen,
            COUNT(q.id) as num_preguntas
        FROM exams e
        LEFT JOIN questions q ON e.id = q.exam_id
        GROUP BY e.id, e.titulo, e.fecha, e.convocatoria, e.tipo_examen
        ORDER BY e.convocatoria DESC, e.tipo_examen, e.titulo;
        """

        cmd = [
            "docker", "exec", "per_postgres",
            "psql", "-U", "per_user", "-d", "per_exams",
            "-t", "-c", query
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"Error ejecutando consulta PostgreSQL: {result.stderr}")
            return jsonify({'error': 'Error accediendo a PostgreSQL'}), 500

        # Parsear resultados
        examenes = []
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 6:
                    examenes.append({
                        'id': parts[0],
                        'titulo': parts[1],
                        'fecha': parts[2],
                        'convocatoria': parts[3],
                        'tipo_examen': parts[4],
                        'num_preguntas': int(parts[5]) if parts[5].isdigit() else 0
                    })

        logger.info(f"✅ Obtenidos {len(examenes)} exámenes desde PostgreSQL")
        return jsonify({
            'examenes': examenes,
            'total': len(examenes),
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"❌ Error obteniendo exámenes: {e}")
        return jsonify({'error': f'Error obteniendo exámenes: {str(e)}'}), 500

if __name__ == '__main__':
    logger.info("🚀 API de Explicaciones iniciando en puerto 5001")
    logger.info("🌐 URL: http://localhost:5001")
    logger.info("🔗 Endpoints: POST /generar-explicacion, POST /guardar-datos")
    
    app.run(host='0.0.0.0', port=5001, debug=False)
