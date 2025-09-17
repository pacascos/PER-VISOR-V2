# 🤖 Configuración de OpenAI

## Modelos Disponibles

### Modelos Disponibles
- **gpt-5-2025-08-07**: Modelo GPT-5 usado en este proyecto (recomendado)
- **gpt-4o**: Modelo más reciente de GPT-4
- **gpt-4o-mini**: Versión más rápida y económica de GPT-4o
- **gpt-4**: Modelo estable y confiable
- **gpt-3.5-turbo**: Modelo más económico para uso básico

### Configuración en el archivo .env

```bash
# Modelo principal (recomendado: gpt-5-2025-08-07)
OPENAI_MODEL=gpt-5-2025-08-07

# Tu clave API de OpenAI
OPENAI_API_KEY=sk-proj-tu_clave_aqui

# Configuración de generación
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.3
```

## Obtener API Key

1. Ve a [OpenAI Platform](https://platform.openai.com/account/api-keys)
2. Inicia sesión o crea una cuenta
3. Haz clic en "Create new secret key"
4. Copia la clave y pégala en tu archivo `.env`

## Configuración de Parámetros

### OPENAI_MAX_TOKENS
- **Rango**: 1-4096 (dependiendo del modelo)
- **Recomendado**: 2000
- **Descripción**: Número máximo de tokens en la respuesta

### OPENAI_TEMPERATURE
- **Rango**: 0.0-2.0
- **Recomendado**: 0.3
- **Descripción**: 
  - 0.0: Respuestas más determinísticas
  - 0.3: Balance entre creatividad y consistencia
  - 1.0: Más creativo y variado

## Verificación de Configuración

```bash
# Verificar que la API key funciona
docker exec per_api python3 -c "
import openai
import os
openai.api_key = os.getenv('OPENAI_API_KEY')
try:
    models = openai.models.list()
    print('✅ API key válida')
    print(f'Modelo configurado: {os.getenv(\"OPENAI_MODEL\")}')
except Exception as e:
    print(f'❌ Error: {e}')
"
```

## Solución de Problemas

### Error 401: Invalid API Key
- Verifica que la API key esté correctamente copiada
- Asegúrate de que no haya espacios en blanco
- Verifica que la clave tenga el formato correcto (sk-proj-...)

### Error 429: Rate Limit Exceeded
- Reduce la frecuencia de las peticiones
- Considera usar un modelo más económico (gpt-3.5-turbo)
- Verifica tu límite de uso en OpenAI Platform

### Error 500: Internal Server Error
- Verifica que el modelo esté disponible
- Revisa los logs del contenedor: `docker-compose logs api`
- Verifica la conectividad a internet

## Costos Aproximados

| Modelo | Costo por 1K tokens | Uso recomendado |
|--------|---------------------|-----------------|
| gpt-4o | $0.005 | Producción |
| gpt-4o-mini | $0.00015 | Desarrollo |
| gpt-4 | $0.03 | Alta calidad |
| gpt-3.5-turbo | $0.001 | Uso básico |

*Precios aproximados, consulta OpenAI para precios actualizados*
