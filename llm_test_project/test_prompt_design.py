#!/usr/bin/env python3
"""
Diseño y prueba de prompts para explicaciones náuticas
"""
import json
import sys
from pathlib import Path

def cargar_pregunta_ejemplo():
    """Carga una pregunta ejemplo para diseñar el prompt"""
    return {
        "id": "2024-04-PER-01",
        "enunciado": "¿Qué es una bita?",
        "opciones": [
            {"letra": "A", "texto": "Noray"},
            {"letra": "B", "texto": "Bita"},
            {"letra": "C", "texto": "Cornamusa"},
            {"letra": "D", "texto": "Boya"}
        ],
        "respuesta_correcta": "B",
        "tema": "Nomenclatura náutica",
        "dificultad": "basico"
    }

def generar_prompt_v1(pregunta):
    """Prompt básico"""
    opciones_texto = "\\n".join([f"{op['letra']}) {op['texto']}" for op in pregunta['opciones']])
    
    return f"""Explica esta pregunta de examen náutico:

PREGUNTA: {pregunta['enunciado']}

OPCIONES:
{opciones_texto}

RESPUESTA CORRECTA: {pregunta['respuesta_correcta']}

Proporciona una explicación clara de por qué la respuesta es correcta y por qué las otras opciones son incorrectas."""

def generar_prompt_v2(pregunta):
    """Prompt mejorado con estructura"""
    opciones_texto = "\\n".join([f"{op['letra']}) {op['texto']}" for op in pregunta['opciones']])
    
    return f"""ROLE: Instructor náutico experto.

TAREA: Explicar pregunta de examen PER/PNB de forma didáctica.

PREGUNTA:
{pregunta['enunciado']}

OPCIONES:
{opciones_texto}

RESPUESTA CORRECTA: {pregunta['respuesta_correcta']}

FORMATO REQUERIDO:
🔹 Análisis de cada opción
🔹 Justificación de la respuesta correcta
🔹 Contexto náutico relevante

Usa terminología técnica precisa pero explicaciones claras."""

def generar_prompt_v3_optimizado(pregunta):
    """Prompt optimizado final basado en el ejemplo proporcionado"""
    opciones_texto = "\\n".join([f"{op['letra']}) {op['texto']}" for op in pregunta['opciones']])
    
    return f"""ROLE: Eres un instructor náutico experto con 20 años de experiencia enseñando para títulos PER, PNB, Capitán de Yate.

TAREA: Explicar detalladamente esta pregunta de examen náutico, ayudando al estudiante a entender no solo la respuesta correcta, sino el razonamiento técnico detrás.

PREGUNTA:
{pregunta['enunciado']}

OPCIONES:
{opciones_texto}

RESPUESTA CORRECTA: {pregunta['respuesta_correcta']}

FORMATO REQUERIDO:
🔹 **Pregunta**
Resumen claro de qué pregunta la pregunta.

🔹 **Análisis de las opciones**
Para cada opción (A, B, C, D):
A) [Nombre de la opción]
- Definición técnica del término
- Explicación de por qué es correcta o incorrecta
- ❌/✅ Razón específica

B) [Nombre de la opción] (si es la correcta)
- Definición completa y precisa
- Por qué encaja exactamente con la pregunta
- ✅ Justificación técnica

[Continuar con C y D]

✅ **Conclusión**
Justificación clara de por qué la respuesta {pregunta['respuesta_correcta']} es la correcta, resumiendo los puntos clave.

CRITERIOS:
- Usar terminología náutica precisa
- Explicaciones didácticas y claras
- Incluir ejemplos prácticos cuando sea posible
- Mencionar normativa aplicable si es relevante (RIPA, etc.)
- Nivel de dificultad: {pregunta['dificultad']}

IMPORTANTE: La explicación debe ser comprensible pero técnicamente rigurosa, como si estuvieras preparando al estudiante para el examen real."""

def generar_explicacion_ejemplo_manual():
    """Genera la explicación ejemplo que proporcionaste como referencia"""
    return """Perfecto, vamos a analizar la pregunta y cada opción para entender por qué la respuesta correcta es B) Bita:

🔹 **Pregunta**

Se describe:
Una pieza sólida de metal o madera, fuertemente unida a la cubierta, normalmente formada por dos columnas de hierro fundidas sobre una misma base, usada para dar vueltas a las cadenas del ancla, amarras del buque o para hacer firme un cabo.

🔹 **Análisis de las opciones**

A) **Noray**
El noray es un poste de hierro o piedra que se coloca en los muelles o en tierra para amarrar los cabos de los buques.
- No se encuentra en la cubierta del barco, sino en el muelle.
❌ Incorrecto porque la definición habla de un elemento en la cubierta del buque, no en tierra.

B) **Bita** (Correcta)
La bita es exactamente la pieza descrita en la pregunta:
- Consta generalmente de dos cilindros de hierro sobre una misma base.
- Está fijada a la cubierta del buque.
- Se utiliza para tomar vueltas a las cadenas del ancla o cabos de amarre, manteniendo firme lo que se sujeta.
✅ Es la opción que encaja literalmente con la descripción dada.

C) **Cornamusa**
La cornamusa también sirve para hacer firme cabos, pero:
- Es mucho más pequeña que una bita.
- Tiene forma de "T" o "H" alargada.
- Se usa principalmente para cabos de menor diámetro (no para cadenas de ancla).
❌ Incorrecta porque la pregunta habla de cadenas de ancla y amarras principales, que requieren un elemento más robusto.

D) **Boya**
Una boya es un cuerpo flotante (de metal o plástico) fondeado en el agua que sirve para señalización, amarre, balizamiento, etc.
- No está unida a la cubierta ni cumple la función descrita.
❌ Incorrecta porque no es un elemento fijo de cubierta, sino un dispositivo flotante.

✅ **Conclusión**

La respuesta correcta es B) Bita, porque:
- Coincide exactamente con la definición: pieza sólida, de hierro fundido, dos columnas sobre la misma base, fijada en cubierta y usada para amarras y cadenas de ancla.
- El resto de opciones corresponden a elementos relacionados con el amarre, pero ubicados en otros lugares (noray en tierra, boya flotante) o de menor escala (cornamusa).

💡 **Recurso visual sugerido:** Imagen de una bita en cubierta mostrando sus dos columnas características y un cabo tomando vueltas."""

def comparar_prompts():
    """Compara diferentes versiones de prompts"""
    pregunta = cargar_pregunta_ejemplo()
    
    print("🔍 COMPARACIÓN DE PROMPTS PARA EXPLICACIONES NÁUTICAS")
    print("=" * 60)
    
    # Ejemplo manual de referencia
    print("\\n📖 EXPLICACIÓN EJEMPLO (REFERENCIA MANUAL):")
    print("-" * 40)
    print(generar_explicacion_ejemplo_manual())
    
    prompts = {
        "V1 - Básico": generar_prompt_v1(pregunta),
        "V2 - Estructurado": generar_prompt_v2(pregunta),
        "V3 - Optimizado": generar_prompt_v3_optimizado(pregunta)
    }
    
    for version, prompt in prompts.items():
        print(f"\\n🤖 PROMPT {version}:")
        print("-" * 40)
        print(prompt)
        print("\\n" + "="*60)
    
    return prompts

def seleccionar_preguntas_variadas(archivo_json: str, cantidad: int = 10):
    """Selecciona preguntas variadas para pruebas"""
    try:
        with open(archivo_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        preguntas_seleccionadas = []
        examenes = data.get('examenes', [])
        
        # Criterios de selección
        temas_incluidos = set()
        titulaciones_incluidas = set()
        
        for examen in examenes:
            if len(preguntas_seleccionadas) >= cantidad:
                break
                
            for i, pregunta in enumerate(examen.get('preguntas', [])):
                if len(preguntas_seleccionadas) >= cantidad:
                    break
                
                tema = pregunta.get('tema', 'Sin tema')
                titulacion = examen.get('titulacion', 'unknown')
                enunciado = pregunta.get('enunciado', '')
                
                # Diversificar selección
                incluir = False
                
                # Por tema (máximo 2 por tema)
                if temas_incluidos.count(tema) < 2:
                    incluir = True
                
                # Por titulación
                if titulacion not in titulaciones_incluidas:
                    incluir = True
                
                # Por complejidad (variar longitud de enunciado)
                if len(enunciado) > 150 and len([p for p in preguntas_seleccionadas if len(p['enunciado']) > 150]) < 3:
                    incluir = True
                
                if incluir:
                    temas_incluidos.add(tema)
                    titulaciones_incluidas.add(titulacion)
                    
                    pregunta_procesada = {
                        'id': f"{examen.get('convocatoria', 'unknown')}_{titulacion}_{i+1}",
                        'enunciado': enunciado,
                        'opciones': pregunta.get('opciones', []),
                        'respuesta_correcta': pregunta.get('respuesta_correcta', 'A'),
                        'tema': tema,
                        'titulacion': titulacion,
                        'convocatoria': examen.get('convocatoria', 'unknown'),
                        'dificultad': 'intermedio' if len(enunciado) > 150 else 'basico'
                    }
                    
                    preguntas_seleccionadas.append(pregunta_procesada)
        
        return preguntas_seleccionadas
    
    except Exception as e:
        print(f"❌ Error al cargar preguntas: {e}")
        return []

def main():
    """Función principal"""
    print("🎯 DISEÑADOR DE PROMPTS PARA EXPLICACIONES NÁUTICAS")
    print("=" * 50)
    
    # Comparar prompts con pregunta ejemplo
    prompts = comparar_prompts()
    
    # Intentar cargar preguntas reales para más ejemplos
    archivo_datos = '../src/web/data_unificado.json'
    if Path(archivo_datos).exists():
        print("\\n📚 SELECCIONANDO PREGUNTAS VARIADAS PARA PRUEBAS:")
        preguntas = seleccionar_preguntas_variadas(archivo_datos, cantidad=5)
        
        if preguntas:
            print(f"✅ Seleccionadas {len(preguntas)} preguntas variadas:")
            for i, p in enumerate(preguntas, 1):
                print(f"  {i}. {p['id']} - {p['tema']} ({p['dificultad']})")
                print(f"     Enunciado: {p['enunciado'][:60]}...")
            
            # Guardar preguntas de prueba
            with open('llm_test_project/preguntas_prueba.json', 'w', encoding='utf-8') as f:
                json.dump(preguntas, f, ensure_ascii=False, indent=2)
            print("\\n💾 Preguntas guardadas en: llm_test_project/preguntas_prueba.json")
        else:
            print("❌ No se pudieron seleccionar preguntas")
    else:
        print(f"⚠️ No se encontró {archivo_datos}")
    
    print("\\n✅ Diseño de prompts completado")
    print("💡 Próximo paso: Probar con APIs reales de LLM")

if __name__ == "__main__":
    # Crear directorio si no existe
    Path('llm_test_project').mkdir(exist_ok=True)
    main()
