const fetch = require('node-fetch');

async function testAPI() {
    try {
        console.log('🧪 Probando endpoint de actualización directamente...');
        
        // Primero obtener una pregunta para editar
        const response = await fetch('http://localhost:5001/preguntas-filtradas');
        const data = await response.json();
        
        if (data.preguntas && data.preguntas.length > 0) {
            const question = data.preguntas[0];
            console.log('📝 Pregunta encontrada:', question.id);
            console.log('📄 Texto original:', question.texto_pregunta.substring(0, 100) + '...');
            
            // Actualizar la pregunta
            const updateData = {
                texto_pregunta: question.texto_pregunta + ' [PRUEBA API DIRECTA]',
                categoria: question.categoria,
                respuesta_correcta: question.respuesta_correcta,
                anulada: question.anulada || false,
                opciones: question.opciones
            };
            
            console.log('💾 Enviando actualización...');
            const updateResponse = await fetch(`http://localhost:5001/preguntas/${question.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });
            
            const updateResult = await updateResponse.json();
            console.log('📊 Resultado:', updateResult);
            
            if (updateResult.success) {
                console.log('✅ API funciona correctamente');
                
                // Verificar que se guardó
                const verifyResponse = await fetch('http://localhost:5001/preguntas-filtradas');
                const verifyData = await verifyResponse.json();
                const updatedQuestion = verifyData.preguntas.find(q => q.id === question.id);
                
                if (updatedQuestion && updatedQuestion.texto_pregunta.includes('[PRUEBA API DIRECTA]')) {
                    console.log('✅ Verificación exitosa: El texto se guardó correctamente');
                } else {
                    console.log('⚠️ Problema: El texto no se guardó en la base de datos');
                }
            } else {
                console.log('❌ Error en la API:', updateResult.error);
            }
            
        } else {
            console.log('⚠️ No se encontraron preguntas');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAPI();

