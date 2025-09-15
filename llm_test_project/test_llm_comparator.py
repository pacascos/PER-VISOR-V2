#!/usr/bin/env python3
"""
Proyecto de pruebas para comparar diferentes LLMs en explicaciones náuticas
"""
import json
import time
import asyncio
import aiohttp
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import os
from pathlib import Path

@dataclass
class PreguntaPrueba:
    """Pregunta para prueba de LLM"""
    id: str
    enunciado: str
    opciones: List[Dict[str, str]]
    respuesta_correcta: str
    tema: str
    dificultad: str  # basico, intermedio, avanzado

@dataclass
class ResultadoLLM:
    """Resultado de un LLM para una pregunta"""
    llm_name: str
    pregunta_id: str
    explicacion_generada: str
    tiempo_respuesta: float
    tokens_input: int
    tokens_output: int
    coste_estimado: float
    calidad_puntuacion: Optional[float] = None
    errores: Optional[str] = None

class LLMComparator:
    """Comparador de diferentes LLMs para explicaciones náuticas"""
    
    def __init__(self):
        self.resultados = []
        self.configuraciones_llm = {
            'gpt-3.5-turbo': {
                'url': 'https://api.openai.com/v1/chat/completions',
                'headers': {'Authorization': f'Bearer {os.getenv("OPENAI_API_KEY")}'},
                'coste_input': 0.0015,  # por 1k tokens
                'coste_output': 0.002
            },
            'gpt-4-turbo': {
                'url': 'https://api.openai.com/v1/chat/completions',
                'headers': {'Authorization': f'Bearer {os.getenv("OPENAI_API_KEY")}'},
                'coste_input': 0.01,
                'coste_output': 0.03
            },
            'claude-3-haiku': {
                'url': 'https://api.anthropic.com/v1/messages',
                'headers': {
                    'x-api-key': os.getenv("ANTHROPIC_API_KEY"),
                    'anthropic-version': '2023-06-01'
                },
                'coste_input': 0.00025,
                'coste_output': 0.00125
            },
            'claude-3.5-sonnet': {
                'url': 'https://api.anthropic.com/v1/messages',
                'headers': {
                    'x-api-key': os.getenv("ANTHROPIC_API_KEY"),
                    'anthropic-version': '2023-06-01'
                },
                'coste_input': 0.003,
                'coste_output': 0.015
            }
        }
    
    def generar_prompt_nautico(self, pregunta: PreguntaPrueba) -> str:
        """Genera prompt optimizado para explicaciones náuticas"""
        opciones_texto = "\\n".join([
            f"{op['letra']}) {op['texto']}" 
            for op in pregunta.opciones
        ])
        
        prompt = f"""ROLE: Eres un instructor náutico experto con 20 años de experiencia enseñando para títulos PER, PNB, Capitán de Yate.

TAREA: Explicar detalladamente esta pregunta de examen náutico, ayudando al estudiante a entender no solo la respuesta correcta, sino el razonamiento técnico detrás.

PREGUNTA:
{pregunta.enunciado}

OPCIONES:
{opciones_texto}

RESPUESTA CORRECTA: {pregunta.respuesta_correcta}

FORMATO REQUERIDO:
🔹 **Pregunta**
Resumen claro de qué pregunta la pregunta.

🔹 **Análisis de las opciones**
Para cada opción (A, B, C, D):
- Definición técnica del término/concepto
- Explicación de por qué es correcta o incorrecta
- Contexto náutico relevante

✅ **Conclusión**
Justificación clara de por qué la respuesta {pregunta.respuesta_correcta} es la correcta.

CRITERIOS:
- Usar terminología náutica precisa
- Explicaciones didácticas y claras
- Incluir ejemplos prácticos cuando sea posible
- Mencionar normativa aplicable si es relevante (RIPA, etc.)
- Nivel: {pregunta.dificultad}

IMPORTANTE: La explicación debe ser comprensible pero técnicamente rigurosa."""

        return prompt
    
    async def llamar_openai_api(self, modelo: str, prompt: str) -> Dict[str, Any]:
        """Llama a la API de OpenAI"""
        config = self.configuraciones_llm[modelo]
        
        payload = {
            "model": modelo,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 2000
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                config['url'], 
                headers=config['headers'], 
                json=payload
            ) as response:
                return await response.json()
    
    async def llamar_anthropic_api(self, modelo: str, prompt: str) -> Dict[str, Any]:
        """Llama a la API de Anthropic (Claude)"""
        config = self.configuraciones_llm[modelo]
        
        # Mapear nombre de modelo
        model_names = {
            'claude-3-haiku': 'claude-3-haiku-20240307',
            'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022'
        }
        
        payload = {
            "model": model_names[modelo],
            "max_tokens": 2000,
            "temperature": 0.3,
            "messages": [{"role": "user", "content": prompt}]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                config['url'], 
                headers=config['headers'], 
                json=payload
            ) as response:
                return await response.json()
    
    async def probar_llm(self, llm_name: str, pregunta: PreguntaPrueba) -> ResultadoLLM:
        """Prueba un LLM específico con una pregunta"""
        print(f"🔄 Probando {llm_name} con pregunta {pregunta.id}...")
        
        prompt = self.generar_prompt_nautico(pregunta)
        config = self.configuraciones_llm[llm_name]
        
        inicio = time.time()
        
        try:
            if 'gpt' in llm_name:
                respuesta = await self.llamar_openai_api(llm_name, prompt)
                explicacion = respuesta['choices'][0]['message']['content']
                tokens_input = respuesta['usage']['prompt_tokens']
                tokens_output = respuesta['usage']['completion_tokens']
                
            elif 'claude' in llm_name:
                respuesta = await self.llamar_anthropic_api(llm_name, prompt)
                explicacion = respuesta['content'][0]['text']
                tokens_input = respuesta['usage']['input_tokens']
                tokens_output = respuesta['usage']['output_tokens']
            
            tiempo_respuesta = time.time() - inicio
            
            # Calcular coste
            coste = (
                (tokens_input / 1000) * config['coste_input'] +
                (tokens_output / 1000) * config['coste_output']
            )
            
            return ResultadoLLM(
                llm_name=llm_name,
                pregunta_id=pregunta.id,
                explicacion_generada=explicacion,
                tiempo_respuesta=tiempo_respuesta,
                tokens_input=tokens_input,
                tokens_output=tokens_output,
                coste_estimado=coste
            )
            
        except Exception as e:
            return ResultadoLLM(
                llm_name=llm_name,
                pregunta_id=pregunta.id,
                explicacion_generada="",
                tiempo_respuesta=time.time() - inicio,
                tokens_input=0,
                tokens_output=0,
                coste_estimado=0,
                errores=str(e)
            )
    
    def seleccionar_preguntas_prueba(self, archivo_json: str, cantidad: int = 10) -> List[PreguntaPrueba]:
        """Selecciona preguntas representativas para la prueba"""
        with open(archivo_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        preguntas_prueba = []
        examenes = data.get('examenes', [])
        
        # Seleccionar preguntas variadas
        temas_incluidos = set()
        dificultades = ['basico', 'intermedio', 'avanzado']
        
        for i, examen in enumerate(examenes):
            if len(preguntas_prueba) >= cantidad:
                break
                
            for j, pregunta in enumerate(examen.get('preguntas', [])):
                if len(preguntas_prueba) >= cantidad:
                    break
                
                tema = pregunta.get('tema', 'Sin tema')
                
                # Diversificar por tema
                if tema not in temas_incluidos or len(temas_incluidos) < 3:
                    temas_incluidos.add(tema)
                    
                    # Asignar dificultad basada en complejidad del enunciado
                    enunciado = pregunta.get('enunciado', '')
                    if len(enunciado) < 100:
                        dificultad = 'basico'
                    elif len(enunciado) < 200:
                        dificultad = 'intermedio'
                    else:
                        dificultad = 'avanzado'
                    
                    pregunta_prueba = PreguntaPrueba(
                        id=f"{examen.get('convocatoria', 'unknown')}_{examen.get('titulacion', 'unknown')}_{j+1}",
                        enunciado=enunciado,
                        opciones=pregunta.get('opciones', []),
                        respuesta_correcta=pregunta.get('respuesta_correcta', 'A'),
                        tema=tema,
                        dificultad=dificultad
                    )
                    
                    preguntas_prueba.append(pregunta_prueba)
        
        return preguntas_prueba[:cantidad]
    
    async def ejecutar_comparacion_completa(self, preguntas: List[PreguntaPrueba], llms_a_probar: List[str]):
        """Ejecuta comparación completa de LLMs"""
        print(f"🚀 INICIANDO COMPARACIÓN DE {len(llms_a_probar)} LLMs")
        print(f"📝 {len(preguntas)} preguntas de prueba")
        print("=" * 50)
        
        for pregunta in preguntas:
            print(f"\\n📋 Pregunta: {pregunta.id}")
            print(f"🎯 Tema: {pregunta.tema} | Dificultad: {pregunta.dificultad}")
            
            for llm_name in llms_a_probar:
                resultado = await self.probar_llm(llm_name, pregunta)
                self.resultados.append(resultado)
                
                if resultado.errores:
                    print(f"❌ {llm_name}: Error - {resultado.errores}")
                else:
                    print(f"✅ {llm_name}: {resultado.tiempo_respuesta:.2f}s, ${resultado.coste_estimado:.4f}")
                
                # Pausa entre llamadas para evitar rate limits
                await asyncio.sleep(1)
    
    def generar_reporte_comparativo(self) -> Dict[str, Any]:
        """Genera reporte comparativo de resultados"""
        if not self.resultados:
            return {}
        
        # Agrupar por LLM
        resultados_por_llm = {}
        for resultado in self.resultados:
            if resultado.llm_name not in resultados_por_llm:
                resultados_por_llm[resultado.llm_name] = []
            resultados_por_llm[resultado.llm_name].append(resultado)
        
        # Calcular estadísticas
        estadisticas = {}
        for llm_name, resultados in resultados_por_llm.items():
            resultados_exitosos = [r for r in resultados if not r.errores]
            
            if resultados_exitosos:
                estadisticas[llm_name] = {
                    'total_preguntas': len(resultados),
                    'exitosas': len(resultados_exitosos),
                    'errores': len(resultados) - len(resultados_exitosos),
                    'tiempo_promedio': sum(r.tiempo_respuesta for r in resultados_exitosos) / len(resultados_exitosos),
                    'coste_promedio': sum(r.coste_estimado for r in resultados_exitosos) / len(resultados_exitosos),
                    'coste_total': sum(r.coste_estimado for r in resultados_exitosos),
                    'tokens_promedio_input': sum(r.tokens_input for r in resultados_exitosos) / len(resultados_exitosos),
                    'tokens_promedio_output': sum(r.tokens_output for r in resultados_exitosos) / len(resultados_exitosos)
                }
        
        return {
            'timestamp': datetime.now().isoformat(),
            'estadisticas_por_llm': estadisticas,
            'resultados_detallados': [asdict(r) for r in self.resultados]
        }
    
    def guardar_resultados(self, archivo: str = 'resultados_comparacion_llms.json'):
        """Guarda resultados en archivo JSON"""
        reporte = self.generar_reporte_comparativo()
        
        with open(archivo, 'w', encoding='utf-8') as f:
            json.dump(reporte, f, ensure_ascii=False, indent=2)
        
        print(f"💾 Resultados guardados en: {archivo}")

async def main():
    """Función principal"""
    print("🤖 COMPARADOR DE LLMs PARA EXPLICACIONES NÁUTICAS")
    print("=" * 50)
    
    # Verificar variables de entorno
    apis_disponibles = []
    if os.getenv('OPENAI_API_KEY'):
        apis_disponibles.extend(['gpt-3.5-turbo', 'gpt-4-turbo'])
    if os.getenv('ANTHROPIC_API_KEY'):
        apis_disponibles.extend(['claude-3-haiku', 'claude-3.5-sonnet'])
    
    if not apis_disponibles:
        print("❌ No se encontraron APIs configuradas.")
        print("💡 Configura las variables de entorno:")
        print("   export OPENAI_API_KEY='tu-key-aqui'")
        print("   export ANTHROPIC_API_KEY='tu-key-aqui'")
        return
    
    print(f"✅ APIs disponibles: {apis_disponibles}")
    
    # Crear comparador
    comparador = LLMComparator()
    
    # Seleccionar preguntas de prueba
    archivo_datos = '../src/web/data_unificado.json'
    if not os.path.exists(archivo_datos):
        print(f"❌ No se encontró {archivo_datos}")
        return
    
    preguntas = comparador.seleccionar_preguntas_prueba(archivo_datos, cantidad=5)
    print(f"📝 Seleccionadas {len(preguntas)} preguntas de prueba")
    
    # Ejecutar comparación
    await comparador.ejecutar_comparacion_completa(preguntas, apis_disponibles)
    
    # Generar y guardar reporte
    comparador.guardar_resultados()
    
    # Mostrar resumen
    reporte = comparador.generar_reporte_comparativo()
    print("\\n📊 RESUMEN DE RESULTADOS:")
    print("=" * 30)
    
    for llm_name, stats in reporte['estadisticas_por_llm'].items():
        print(f"\\n🤖 {llm_name}:")
        print(f"  ✅ Exitosas: {stats['exitosas']}/{stats['total_preguntas']}")
        print(f"  ⏱️ Tiempo promedio: {stats['tiempo_promedio']:.2f}s")
        print(f"  💰 Coste promedio: ${stats['coste_promedio']:.4f}")
        print(f"  💸 Coste total: ${stats['coste_total']:.4f}")

if __name__ == "__main__":
    # Crear directorio si no existe
    Path('llm_test_project').mkdir(exist_ok=True)
    asyncio.run(main())
