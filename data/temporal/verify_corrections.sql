-- Verificar pregunta corregida
SELECT 
  q.numero_pregunta,
  q.texto_pregunta,
  ao.opcion,
  ao.texto
FROM questions q
JOIN answer_options ao ON q.id = ao.question_id
WHERE q.id = '75f66ea3-10a7-4ddb-a705-772adacf9223'
  AND ao.opcion = 'd';
