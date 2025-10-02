#!/usr/bin/env python3
"""
Script para aplicar correcciones automáticas a las opciones incompletas
IMPORTANTE: Crea backup antes de aplicar cambios
"""

import json
import subprocess
import sys
import os
from datetime import datetime


def run_bash_command(command, description=""):
    """Ejecutar comando bash y capturar resultado"""
    if description:
        print(f"  {description}...")

    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    return result.returncode == 0, result.stdout, result.stderr


def create_backup():
    """Crear backup usando el script existente"""
    print(f"\n{'='*80}")
    print(f"💾 CREANDO BACKUP DE SEGURIDAD")
    print(f"{'='*80}\n")

    success, stdout, stderr = run_bash_command(
        "./scripts/backup_before_test.sh",
        "Ejecutando backup_before_test.sh"
    )

    if success:
        print(stdout)
        return True
    else:
        print(f"❌ Error creando backup:")
        print(stderr)
        return False


def run_query(query):
    """Ejecutar query en PostgreSQL via docker exec"""
    cmd = [
        'docker', 'exec', 'per_postgres',
        'psql', '-U', 'per_user', '-d', 'per_exams',
        '-t', '-A',
        '-c', query
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0, result.stdout, result.stderr


def apply_correction(question_id, opcion, texto_completo):
    """
    Aplicar una corrección a la base de datos
    """
    # Escapar comillas simples
    texto_escaped = texto_completo.replace("'", "''")

    query = f"""
    UPDATE answer_options
    SET texto = '{texto_escaped}'
    WHERE question_id = '{question_id}'
      AND opcion = '{opcion.lower()}';
    """

    success, stdout, stderr = run_query(query)
    return success


def show_statistics(corrections_data):
    """Mostrar estadísticas de las correcciones"""
    total_preguntas = len(corrections_data)
    total_opciones = sum(len(item['correcciones']) for item in corrections_data)

    opciones_listas = sum(
        len([c for c in item['correcciones'].values() if c.get('completo')])
        for item in corrections_data
    )

    opciones_no_encontradas = total_opciones - opciones_listas

    print(f"\n{'='*80}")
    print(f"📊 ESTADÍSTICAS DE CORRECCIONES")
    print(f"{'='*80}\n")
    print(f"Preguntas a corregir: {total_preguntas}")
    print(f"Opciones incompletas totales: {total_opciones}")
    print(f"✅ Opciones con corrección encontrada: {opciones_listas} ({opciones_listas/total_opciones*100:.1f}%)")
    print(f"⚠️  Opciones sin corrección: {opciones_no_encontradas} ({opciones_no_encontradas/total_opciones*100:.1f}%)")

    return opciones_listas, opciones_no_encontradas


def apply_all_corrections(corrections_file='data/temporal/correcciones_propuestas.json', dry_run=False, auto_confirm=False):
    """
    Aplicar todas las correcciones automáticamente
    """
    # Cargar correcciones
    if not os.path.exists(corrections_file):
        print(f"❌ Error: No se encontró el archivo {corrections_file}")
        print(f"💡 Ejecuta primero: python3 scripts/autocompletar_opciones.py")
        return False

    with open(corrections_file, 'r', encoding='utf-8') as f:
        corrections_data = json.load(f)

    print(f"\n{'='*80}")
    print(f"🔧 APLICAR CORRECCIONES AUTOMÁTICAS A LA BASE DE DATOS")
    print(f"{'='*80}\n")

    # Mostrar estadísticas
    opciones_listas, opciones_no_encontradas = show_statistics(corrections_data)

    if opciones_no_encontradas > 0:
        print(f"\n⚠️  ADVERTENCIA: Hay {opciones_no_encontradas} opciones que no se encontraron en los PDFs.")
        print(f"   Estas NO se corregirán automáticamente y requerirán corrección manual.")

    print(f"\n{'='*80}")

    if dry_run:
        print(f"🔍 MODO DRY-RUN: Solo se mostrarán las correcciones sin aplicarlas")
    else:
        print(f"⚠️  MODO REAL: Las correcciones se aplicarán a la base de datos")

    print(f"{'='*80}\n")

    # Pedir confirmación
    if not dry_run:
        if auto_confirm:
            print(f"✅ Auto-confirmado: Se aplicarán {opciones_listas} correcciones")
        else:
            respuesta = input(f"¿Deseas continuar y aplicar {opciones_listas} correcciones? (s/n): ").lower().strip()
            if respuesta != 's':
                print("\n❌ Operación cancelada por el usuario")
                return False

        # Crear backup
        print()
        if not create_backup():
            print("\n❌ Error: No se pudo crear el backup. Abortando por seguridad.")
            return False

    # Aplicar correcciones
    print(f"\n{'='*80}")
    print(f"🚀 APLICANDO CORRECCIONES")
    print(f"{'='*80}\n")

    aplicadas = 0
    errores = 0
    saltadas = 0

    for idx, item in enumerate(corrections_data, 1):
        question_id = item['id']
        numero = item['numero']
        convocatoria = item['convocatoria']

        corrections_to_apply = {}
        for opcion, corr in item['correcciones'].items():
            if corr.get('completo'):
                corrections_to_apply[opcion] = corr['completo']

        if not corrections_to_apply:
            saltadas += 1
            continue

        opciones_str = ', '.join(corrections_to_apply.keys())
        print(f"{idx}/{len(corrections_data)}. Pregunta #{numero} | {convocatoria} | Opciones: {opciones_str}")

        if dry_run:
            for opcion, texto in corrections_to_apply.items():
                print(f"   [DRY-RUN] Opción {opcion}: {texto[:60]}...")
            aplicadas += len(corrections_to_apply)
        else:
            for opcion, texto in corrections_to_apply.items():
                if apply_correction(question_id, opcion, texto):
                    print(f"   ✅ Opción {opcion} actualizada")
                    aplicadas += 1
                else:
                    print(f"   ❌ Error actualizando opción {opcion}")
                    errores += 1

    # Resumen final
    print(f"\n{'='*80}")
    print(f"📊 RESUMEN FINAL")
    print(f"{'='*80}\n")

    if dry_run:
        print(f"🔍 MODO DRY-RUN:")
        print(f"   Correcciones que se aplicarían: {aplicadas}")
        print(f"   Preguntas saltadas (sin corrección): {saltadas}")
    else:
        print(f"✅ Correcciones aplicadas exitosamente: {aplicadas}")
        print(f"❌ Errores: {errores}")
        print(f"⏭️  Preguntas saltadas (sin corrección): {saltadas}")

        if errores > 0:
            print(f"\n⚠️  Hubo {errores} errores. Revisa los mensajes anteriores.")

        if opciones_no_encontradas > 0:
            print(f"\n💡 Recuerda: {opciones_no_encontradas} opciones requieren corrección manual")
            print(f"   Puedes editarlas desde: http://localhost:8095/admin-panel.html")

    print()
    return True


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description='Aplicar correcciones automáticas a opciones incompletas'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Solo mostrar las correcciones sin aplicarlas'
    )
    parser.add_argument(
        '--yes', '-y',
        action='store_true',
        help='Auto-confirmar sin pedir confirmación interactiva'
    )
    parser.add_argument(
        '--file',
        default='data/temporal/correcciones_propuestas.json',
        help='Archivo JSON con las correcciones (default: data/temporal/correcciones_propuestas.json)'
    )

    args = parser.parse_args()

    apply_all_corrections(args.file, dry_run=args.dry_run, auto_confirm=args.yes)