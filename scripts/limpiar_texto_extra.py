#!/usr/bin/env python3
"""
Script para limpiar opciones con texto extra capturado
Detecta y elimina texto basura como títulos de sección, pies de página, etc.
"""

import json
import os
import re
from datetime import datetime

def clean_extra_text(text):
    """
    Limpia el texto extra capturado de una opción.

    Estrategias:
    1. Detectar patrones comunes de basura
    2. Cortar antes del texto extra
    3. Validar que quede texto coherente
    """
    if not text or len(text.strip()) == 0:
        return None

    original_text = text
    text = text.strip()

    # Patrones de texto basura a eliminar (en orden de prioridad)
    basura_patterns = [
        # Títulos de secciones completas
        r'\s+SUBDIRECCIÓN GENERAL.*$',
        r'\s+ÁREA FUNCIONAL.*$',
        r'\s+NAUTICA DE RECREO.*$',
        r'\s+NÁUTICA DE RECREO.*$',
        r'\s+INSPECCIÓN MARITIMA.*$',
        r'\s+INSPECCIÓN MARÍTIMA.*$',

        # Nombres de categorías (después de un punto)
        r'\.\s+Elementos de amarre y fondeo.*$',
        r'\.\s+Elementos de fondeo.*$',
        r'\.\s+Emergencias en la mar.*$',
        r'\.\s+Carta de navegación.*$',
        r'\.\s+Reglamento.*$',
        r'\.\s+Seguridad.*$',
        r'\.\s+Meteorología.*$',
        r'\.\s+Nomenclatura náutica.*$',
        r'\.\s+Nomenclatura.*$',
        r'\.\s+Balizamiento.*$',
        r'\.\s+Maniobra y navegación.*$',
        r'\.\s+Legislación.*$',
        r'\.\s+Propulsión.*$',
        r'\.\s+Motor.*$',
    ]

    cleaned_text = text

    for pattern in basura_patterns:
        match = re.search(pattern, cleaned_text, re.IGNORECASE)
        if match:
            # Cortar antes del texto basura
            cleaned_text = cleaned_text[:match.start()].strip()

            # Asegurarse de que termina en punto
            if not cleaned_text.endswith('.'):
                cleaned_text += '.'

            print(f"   🧹 Limpiado: '{original_text[:80]}...' -> '{cleaned_text[:60]}...'")
            return cleaned_text

    # Si no se detectó ningún patrón pero hay múltiples puntos,
    # puede ser que haya texto extra no catalogado
    parts = text.split('.')
    if len(parts) > 2:  # Más de un punto (además del final)
        # Verificar si la penúltima parte parece un título
        if len(parts) >= 2:
            penultima_parte = parts[-2].strip()
            if penultima_parte and len(penultima_parte) > 0:
                # Si es corta y empieza con mayúscula, probablemente es un título
                if penultima_parte[0].isupper() and len(penultima_parte) < 50:
                    # Reconstruir hasta antes de la penúltima parte
                    cleaned_text = '.'.join(parts[:-2]) + '.'
                    print(f"   🧹 Limpiado (título detectado): '{original_text[:60]}...'")
                    return cleaned_text

    # Si no se detectó nada, devolver None (no necesita limpieza)
    return None


def main():
    print(f"\n{'='*80}")
    print(f"🧹 LIMPIEZA DE OPCIONES CON TEXTO EXTRA")
    print(f"{'='*80}\n")

    # Cargar el reporte de análisis
    report_path = 'data/temporal/reporte_preguntas_incompletas.json'

    if not os.path.exists(report_path):
        print(f"❌ Error: No se encontró el reporte de análisis: {report_path}")
        print(f"   Por favor, ejecuta primero: python3 scripts/analisis_docker.py")
        return

    with open(report_path, 'r', encoding='utf-8') as f:
        report = json.load(f)

    opciones_texto_extra = report.get('detalle_opciones_texto_extra', [])

    if not opciones_texto_extra:
        print("✅ No se encontraron opciones con texto extra")
        return

    print(f"📊 Total de preguntas con texto extra: {len(opciones_texto_extra)}\n")

    # Procesar cada pregunta
    correcciones = []

    for idx, pregunta in enumerate(opciones_texto_extra, 1):
        print(f"\n{'='*80}")
        print(f"Procesando {idx}/{len(opciones_texto_extra)}: Pregunta #{pregunta['numero']} | {pregunta['convocatoria']}")
        print(f"ID: {pregunta['id']}")
        print(f"Opciones con basura: {', '.join(pregunta['opciones_problema'])}")
        print(f"{'='*80}")

        correccion_pregunta = {
            'id': pregunta['id'],
            'numero': pregunta['numero'],
            'convocatoria': pregunta['convocatoria'],
            'enunciado': pregunta['enunciado'],
            'correcciones': {}
        }

        # Procesar cada opción con problema
        for opcion_letra in pregunta['opciones_problema']:
            opcion_key = f"opcion_{opcion_letra.lower()}"
            texto_con_basura = pregunta.get(opcion_key, '')

            print(f"\n   Opción {opcion_letra}:")
            print(f"   Original: {texto_con_basura}")

            texto_limpio = clean_extra_text(texto_con_basura)

            if texto_limpio and texto_limpio != texto_con_basura:
                correccion_pregunta['correcciones'][opcion_letra] = {
                    'con_basura': texto_con_basura,
                    'limpio': texto_limpio
                }
                print(f"   ✅ Limpio: {texto_limpio}")
            else:
                print(f"   ⚠️  No se pudo limpiar automáticamente")

        if correccion_pregunta['correcciones']:
            correcciones.append(correccion_pregunta)

    # Guardar correcciones
    output_file = 'data/temporal/correcciones_texto_extra.json'
    os.makedirs('data/temporal', exist_ok=True)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(correcciones, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*80}")
    print(f"📊 RESUMEN")
    print(f"{'='*80}\n")
    print(f"✅ Preguntas procesadas: {len(opciones_texto_extra)}")
    print(f"✅ Preguntas con correcciones: {len(correcciones)}")

    total_opciones_corregidas = sum(len(c['correcciones']) for c in correcciones)
    print(f"✅ Total de opciones limpiadas: {total_opciones_corregidas}")
    print(f"\n💾 Correcciones guardadas en: {output_file}")

    # Calcular tasa de éxito
    total_opciones_con_basura = sum(len(p['opciones_problema']) for p in opciones_texto_extra)
    tasa_exito = (total_opciones_corregidas / total_opciones_con_basura * 100) if total_opciones_con_basura > 0 else 0

    print(f"\n📈 Tasa de éxito: {tasa_exito:.1f}% ({total_opciones_corregidas}/{total_opciones_con_basura})")

    if total_opciones_corregidas < total_opciones_con_basura:
        pendientes = total_opciones_con_basura - total_opciones_corregidas
        print(f"\n⚠️  Opciones que requieren corrección manual: {pendientes}")

if __name__ == '__main__':
    main()