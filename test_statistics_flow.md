# Test Plan: Sistema de Estadísticas Unificado

## Objetivo
Verificar que las respuestas NO se envían al seleccionar, solo al cambiar de pregunta o finalizar.

## Pruebas a Realizar

### Test 1: Test de Estudio - Cambio de Respuesta
1. ✅ Ir a http://localhost:8095/
2. ✅ Login con testuser/123
3. ✅ Ir a "Modo Estudio"
4. ✅ Seleccionar UTs y crear test aleatorio
5. ✅ En pregunta 1: Seleccionar opción A
6. ✅ Verificar en consola: NO debe haber llamada a /study-tests/.../answer
7. ✅ Seleccionar opción B (cambiar de opinión)
8. ✅ Verificar en consola: Aún NO debe haber llamada al backend
9. ✅ Click en "Siguiente"
10. ✅ Verificar en consola: AHORA SÍ debe enviarse con opción B

### Test 2: Test de Estudio - Última Pregunta
1. ✅ Navegar hasta la última pregunta
2. ✅ Seleccionar una opción
3. ✅ Click en "Finalizar Test"
4. ✅ Verificar en consola: Debe enviar la respuesta antes de submit

### Test 3: Examen Completo
1. ✅ Ir a "Examen Completo"
2. ✅ Seleccionar opción A en pregunta 1
3. ✅ Verificar consola: NO debe llamar a /api/question-attempt
4. ✅ Cambiar a opción B
5. ✅ Click en "Siguiente"
6. ✅ Verificar consola: AHORA SÍ debe llamar a /api/question-attempt

### Test 4: Verificar Estadísticas
1. ✅ Completar un test de estudio
2. ✅ Ir a http://localhost:8095/question-statistics-dashboard.html
3. ✅ Verificar que aparecen las estadísticas del test
4. ✅ Verificar que los datos son correctos (respuestas correctas/incorrectas)

## Qué Buscar en la Consola del Navegador

### Al SELECCIONAR una opción:
```javascript
// ❌ NO debe aparecer:
"📝 Recording study answer:"
// O
"POST /api/question-attempt"
```

### Al CAMBIAR de pregunta:
```javascript
// ✅ SÍ debe aparecer:
"📝 Recording study answer: {studyTestId: '...', questionId: '...', userAnswer: 'B', ...}"
"✅ Answer recorded"
// O para exámenes:
"POST /api/question-attempt 200 OK"
```

### Al FINALIZAR:
```javascript
// ✅ SÍ debe aparecer:
"📝 Recording study answer:" // Para la última pregunta
"✅ Answer recorded"
"Finalizando test de estudio..."
```

## Puntos Críticos a Verificar

1. **No envío inmediato**: Al hacer click en una opción, solo debe actualizarse la UI
2. **Envío al navegar**: Al hacer click en "Siguiente/Anterior", debe enviar la respuesta actual
3. **Envío al finalizar**: Al hacer click en "Finalizar", debe enviar la última respuesta
4. **Cambio de opinión**: Si cambias de A a B sin navegar, solo B debe enviarse
5. **Estadísticas correctas**: Los datos deben aparecer en el dashboard

## Resultado Esperado

✅ **PASS**: Si las respuestas solo se envían al cambiar de pregunta o finalizar
❌ **FAIL**: Si las respuestas se envían inmediatamente al hacer click

---

## Instrucciones para el Usuario

Por favor, ejecuta estas pruebas y reporta:
1. ¿Se envían las respuestas inmediatamente al hacer click? (debería ser NO)
2. ¿Se envían las respuestas al cambiar de pregunta? (debería ser SÍ)
3. ¿Se envían las respuestas al finalizar? (debería ser SÍ)
4. ¿Las estadísticas aparecen correctamente en el dashboard?
5. Cualquier error en la consola del navegador

