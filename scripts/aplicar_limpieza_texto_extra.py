#!/usr/bin/env python3
"""
Script para aplicar las correcciones de texto extra a la base de datos
Lee el archivo de correcciones y actualiza las opciones en PostgreSQL
"""

import json
import os
import subprocess
import sys
from datetime import datetime

def run_bash_command(command, description=""):
    """Ejecutar comando bash y capturar output"""
    if description:
        print(f"🔧 {description}")

    result = subprocess.run(
        command,
        shell=True,
        capture_output=True,
        text=True
    )

    return result.returncode == 0, result.stdout, result.stderr


def run_query(query):
    """Ejecutar query en PostgreSQL via docker exec"""
    cmd = f"""docker exec per_postgres psql -U per_user -d per_exams -c "{query}" """

    success, stdout, stderr = run_bash_command(cmd, "")

    if not success:
        print(f"❌ Error ejecutando query: {stderr}")
        return False

    return True


def create_backup():
    """Crear backup usando el script existente"""
    print(f"\n{'='*80}")
    print(f"💾 CREANDO BACKUP DE SEGURIDAD")
    print(f"{'='*80}\n")

    success, stdout, stderr = run_bash_command(
        "./scripts/backup_before_test.sh",
        "Ejecutando backup_before_test.sh"
    )

    if not success:
        print(f"❌ Error creando backup: {stderr}")
        return False

    print(stdout)
    print(f"✅ Backup completado")
    return True


def apply_correction(question_id, opcion, texto_limpio):
    """Aplicar una corrección a la base de datos"""
    # Escapar comillas simples en el texto
    texto_escaped = texto_limpio.replace("'", "''")

    query = f"""UPDATE answer_options SET texto = '{texto_escaped}' WHERE question_id = '{question_id}' AND opcion = '{opcion.lower()}';"""

    success = run_query(query)
    return success


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Aplicar correcciones de texto extra a la base de datos')
    parser.add_argument('--dry-run', action='store_true',
                       help='Solo mostrar las correcciones sin aplicarlas')
    parser.add_argument('--yes', '-y', action='store_true',
                       help='Auto-confirmar sin pedir confirmación interactiva')
    parser.add_argument('--file', default='data/temporal/correcciones_texto_extra.json',
                       help='Archivo JSON con las correcciones')

    args = parser.parse_args()

    print(f"\n{'='*80}")
    print(f"🧹 APLICAR LIMPIEZA DE TEXTO EXTRA")
    print(f"{'='*80}\n")

    # Cargar correcciones
    if not os.path.exists(args.file):
        print(f"❌ Error: No se encontró el archivo de correcciones: {args.file}")
        print(f"   Por favor, ejecuta primero: python3 scripts/limpiar_texto_extra.py")
        return 1

    with open(args.file, 'r', encoding='utf-8') as f:
        correcciones = json.load(f)

    if not correcciones:
        print("✅ No hay correcciones que aplicar")
        return 0

    # Contar opciones
    total_opciones = sum(len(c['correcciones']) for c in correcciones)

    print(f"📊 Estadísticas:")
    print(f"   - Preguntas a corregir: {len(correcciones)}")
    print(f"   - Opciones a limpiar: {total_opciones}\n")

    if args.dry_run:
        print(f"{'='*80}")
        print(f"🔍 MODO DRY-RUN - Mostrando cambios sin aplicar")
        print(f"{'='*80}\n")

        for idx, pregunta in enumerate(correcciones[:10], 1):
            print(f"{idx}. Pregunta #{pregunta['numero']} | {pregunta['convocatoria']}")
            print(f"   ID: {pregunta['id']}")

            for opcion, datos in pregunta['correcciones'].items():
                print(f"   Opción {opcion}:")
                print(f"      CON BASURA: {datos['con_basura'][:80]}")
                print(f"      LIMPIO: {datos['limpio'][:80]}")
            print()

        if len(correcciones) > 10:
            print(f"... y {len(correcciones) - 10} preguntas más\n")

        print(f"✅ Dry-run completado. Usa sin --dry-run para aplicar los cambios.")
        return 0

    # Confirmación
    if not args.yes:
        print(f"⚠️  Estás a punto de modificar {total_opciones} opciones en {len(correcciones)} preguntas")
        print(f"   Se creará un backup automático antes de aplicar los cambios")
        respuesta = input(f"\n¿Deseas continuar? (s/N): ").lower().strip()

        if respuesta not in ['s', 'si', 'sí', 'yes', 'y']:
            print(f"❌ Operación cancelada por el usuario")
            return 1
    else:
        print(f"✅ Auto-confirmado: Se aplicarán {total_opciones} correcciones")

    # Crear backup
    if not create_backup():
        print(f"❌ No se pudo crear el backup. Operación cancelada por seguridad.")
        return 1

    # Aplicar correcciones
    print(f"\n{'='*80}")
    print(f"🔧 APLICANDO CORRECCIONES")
    print(f"{'='*80}\n")

    exitosas = 0
    fallidas = 0

    for idx, pregunta in enumerate(correcciones, 1):
        print(f"[{idx}/{len(correcciones)}] Pregunta #{pregunta['numero']} | {pregunta['convocatoria']}")

        for opcion, datos in pregunta['correcciones'].items():
            print(f"   Limpiando opción {opcion}...", end=" ")

            if apply_correction(pregunta['id'], opcion, datos['limpio']):
                print(f"✅")
                exitosas += 1
            else:
                print(f"❌")
                fallidas += 1

    # Resumen
    print(f"\n{'='*80}")
    print(f"📊 RESUMEN DE APLICACIÓN")
    print(f"{'='*80}\n")
    print(f"✅ Correcciones exitosas: {exitosas}")
    print(f"❌ Correcciones fallidas: {fallidas}")
    print(f"📊 Total procesadas: {exitosas + fallidas}")

    if fallidas > 0:
        print(f"\n⚠️  Hubo {fallidas} correcciones fallidas")
        return 1

    print(f"\n✅ Todas las correcciones se aplicaron exitosamente")
    return 0


if __name__ == '__main__':
    sys.exit(main())