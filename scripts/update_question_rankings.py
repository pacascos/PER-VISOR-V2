#!/usr/bin/env python3
"""
Script para actualizar rankings de preguntas más falladas
Se ejecuta periódicamente para mantener los rankings actualizados
"""

import os
import sys
import psycopg2
import psycopg2.extras
from datetime import datetime

# Configuración de base de datos
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    # Formato: postgresql://user:password@host:port/database
    conn_params = DATABASE_URL.replace('postgresql://', '').split('@')
    user_pass = conn_params[0].split(':')
    host_port_db = conn_params[1].split('/')
    host_port = host_port_db[0].split(':')
    
    DB_CONFIG = {
        'host': host_port[0],
        'port': host_port[1] if len(host_port) > 1 else '5432',
        'database': host_port_db[1],
        'user': user_pass[0],
        'password': user_pass[1]
    }
else:
    DB_CONFIG = {
        'host': os.getenv('DATABASE_HOST', 'localhost'),
        'port': os.getenv('DATABASE_PORT', '5432'),
        'database': os.getenv('DATABASE_NAME', 'per_exams'),
        'user': os.getenv('DATABASE_USER', 'per_user'),
        'password': os.getenv('DATABASE_PASSWORD', 'per_password_change_me')
    }

def get_db_connection():
    """Obtener conexión a la base de datos"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"❌ Error conectando a la base de datos: {e}")
        return None

def update_rankings():
    """Actualizar rankings de preguntas más falladas"""
    conn = get_db_connection()
    if not conn:
        return False

    try:
        cur = conn.cursor()
        
        print("🔄 Actualizando rankings de preguntas más falladas...")
        
        # Ejecutar función de actualización de rankings
        cur.execute("SELECT update_failure_rankings()")
        
        # Verificar cuántos rankings se actualizaron
        cur.execute("SELECT COUNT(*) FROM question_failure_rankings")
        count = cur.fetchone()[0]
        
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"✅ Rankings actualizados exitosamente: {count} registros")
        return True
        
    except Exception as e:
        print(f"❌ Error actualizando rankings: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return False

def get_ranking_summary():
    """Obtener resumen de los rankings actuales"""
    conn = get_db_connection()
    if not conn:
        return None

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Obtener resumen por categoría
        cur.execute("""
            SELECT 
                category,
                COUNT(*) as total_questions,
                AVG(failure_rate) as avg_failure_rate,
                MAX(failure_rate) as max_failure_rate
            FROM question_failure_rankings
            GROUP BY category
            ORDER BY avg_failure_rate DESC
        """)
        
        summary = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return summary
        
    except Exception as e:
        print(f"❌ Error obteniendo resumen: {e}")
        if conn:
            conn.close()
        return None

def main():
    """Función principal"""
    print("🚀 Iniciando actualización de rankings de preguntas...")
    print(f"📅 Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Actualizar rankings
    success = update_rankings()
    
    if success:
        # Mostrar resumen
        summary = get_ranking_summary()
        if summary:
            print("\n📊 Resumen de rankings por categoría:")
            print("-" * 60)
            for row in summary:
                print(f"📋 {row['category']}:")
                print(f"   • Preguntas: {row['total_questions']}")
                print(f"   • Tasa de fallo promedio: {row['avg_failure_rate']:.1f}%")
                print(f"   • Tasa de fallo máxima: {row['max_failure_rate']:.1f}%")
                print()
        
        print("✅ Actualización completada exitosamente")
        return 0
    else:
        print("❌ Error en la actualización")
        return 1

if __name__ == '__main__':
    sys.exit(main())
