#!/usr/bin/env python3
"""
Script para crear usuarios de prueba con contraseñas conocidas
"""

import subprocess
import hashlib
import secrets

def execute_sql_query(query):
    """Execute SQL query through Docker"""
    cmd = [
        "docker", "exec", "per_postgres",
        "psql", "-U", "per_user", "-d", "per_exams",
        "-c", query
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0, result.stdout, result.stderr

def hash_password(password):
    """Hash password with salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{password_hash}"

def create_test_user(username, email, password, role="viewer"):
    """Create a test user with known password"""
    
    # Check if user already exists
    check_query = f"SELECT id FROM users WHERE username = '{username}';"
    success, stdout, stderr = execute_sql_query(check_query)
    
    if success and username in stdout:
        print(f"⚠️  Usuario '{username}' ya existe")
        return False
    
    # Hash the password
    password_hash = hash_password(password)
    
    # Create user
    insert_query = f"""
    INSERT INTO users (username, email, password_hash, role, is_active, created_at)
    VALUES ('{username}', '{email}', '{password_hash}', '{role}', true, NOW());
    """
    
    success, stdout, stderr = execute_sql_query(insert_query)
    
    if success:
        print(f"✅ Usuario '{username}' creado exitosamente")
        print(f"   Email: {email}")
        print(f"   Contraseña: {password}")
        print(f"   Rol: {role}")
        return True
    else:
        print(f"❌ Error creando usuario '{username}': {stderr}")
        return False

def main():
    """Create test users with known credentials"""
    
    print("=" * 60)
    print("CREACIÓN DE USUARIOS DE PRUEBA")
    print("=" * 60)
    
    # Test users to create
    test_users = [
        {
            "username": "admin_test",
            "email": "admin_test@per-exams.es",
            "password": "admin123",
            "role": "admin"
        },
        {
            "username": "test_user",
            "email": "test_user@per-exams.es", 
            "password": "test123",
            "role": "viewer"
        },
        {
            "username": "editor_test",
            "email": "editor_test@per-exams.es",
            "password": "editor123",
            "role": "editor"
        }
    ]
    
    created_count = 0
    
    for user in test_users:
        print(f"\n📝 Creando usuario: {user['username']}")
        if create_test_user(user['username'], user['email'], user['password'], user['role']):
            created_count += 1
    
    print(f"\n{'='*60}")
    print(f"RESUMEN: {created_count}/{len(test_users)} usuarios creados")
    print(f"{'='*60}")
    
    print("\n🔐 CREDENCIALES DE PRUEBA:")
    print("=" * 30)
    for user in test_users:
        print(f"Usuario: {user['username']}")
        print(f"Contraseña: {user['password']}")
        print(f"Rol: {user['role']}")
        print("-" * 30)

if __name__ == "__main__":
    main()
