# Resumen de Cambios: Sistema Unificado de Estadísticas

**Fecha:** 2025-10-07  
**Objetivo:** Unificar el sistema de tracking de estadísticas y corregir el envío de respuestas

---

## 🎯 Problemas Identificados

### 1. **Sistema Inconsistente de Tracking**
- **Exámenes completos antiguos** (`exam-system.js`): Usaban `questionStatsTracker` ✅
- **Exámenes completos nuevos** (`full-exam-controller.js`): NO usaban tracker ❌
- **Tests de estudio** (`study-exam-controller.js`): Enviaban directamente al backend ❌

**Resultado**: Inconsistencia en cómo se registraban las estadísticas.

### 2. **Tabla Incorrecta en el Backend**
- El código insertaba en `question_attempts` (sin `user_id`) ❌
- Debería insertar en `question_attempt_details` (con `user_id`) ✅

### 3. **Envío Inmediato de Respuestas**
- Las respuestas se enviaban al hacer click en una opción ❌
- Impedía que el usuario cambiara de opinión
- Generaba múltiples requests innecesarios

---

## ✅ Soluciones Implementadas

### **1. Backend: Tabla Correcta**

#### **Archivo:** `scripts/servidores/api_postgresql.py`

**Línea 2830 - ANTES:**
```python
INSERT INTO question_attempts (
    exam_id, question_id, user_answer, correct_answer,
    is_correct, time_spent_seconds, category, attempt_order
) VALUES (...)
```

**Línea 2830 - AHORA:**
```python
INSERT INTO question_attempt_details (
    user_id, exam_id, question_id, user_answer, correct_answer,
    is_correct, time_spent_seconds, category, attempt_order, session_type
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'practice')
```

**Beneficio:**
- ✅ Ahora incluye `user_id`
- ✅ Permite estadísticas por usuario
- ✅ Funciona con selección inteligente de preguntas "falladas" y "nuevas"

---

### **2. Frontend: Sistema Unificado de Tracking**

#### **Archivo:** `src/web/study-exam-controller.js`

**A. Inicio de tracking al mostrar pregunta:**
```javascript
displayCurrentQuestion() {
    const question = this.getCurrentQuestion();
    if (!question) return;

    // ✅ NUEVO: Start tracking statistics
    if (window.questionStatsTracker) {
        window.questionStatsTracker.startQuestionTracking(question.question_id, {
            categoria: question.ut_category || question.categoria,
            respuesta_correcta: question.correct_answer || question.respuesta_correcta
        });
    }
    
    // ... resto del código
}
```

**B. Envío SOLO al cambiar de pregunta:**
```javascript
async goToQuestion(index) {
    // ✅ NUEVO: Save current question's answer before changing
    const currentQuestion = this.getCurrentQuestion();
    if (currentQuestion && this.userAnswers[currentQuestion.question_id]) {
        await this.recordAnswer(currentQuestion.question_id, this.userAnswers[currentQuestion.question_id]);
    }

    // Call parent method to change question
    super.goToQuestion(index);
}
```

**C. Envío al finalizar el examen:**
```javascript
async submitExam() {
    try {
        this.stopTimer();
        
        // ✅ NUEVO: Save current question's answer before submitting
        const currentQuestion = this.getCurrentQuestion();
        if (currentQuestion && this.userAnswers[currentQuestion.question_id]) {
            await this.recordAnswer(currentQuestion.question_id, this.userAnswers[currentQuestion.question_id]);
        }

        // End tracking for all questions
        if (window.questionStatsTracker) {
            this.currentExam.questions.forEach(question => {
                window.questionStatsTracker.endQuestionTracking(question.question_id);
            });
        }
        
        // Submit test...
    }
}
```

**D. ELIMINADO envío inmediato:**
```javascript
// ❌ ANTES (INCORRECTO):
option.addEventListener('click', async (e) => {
    const answer = option.dataset.answer;
    this.selectAnswer(answer);
    
    await this.recordAnswer(question.question_id, answer); // ❌ Enviaba inmediatamente
});

// ✅ AHORA (CORRECTO):
option.addEventListener('click', (e) => {
    const answer = option.dataset.answer;
    this.selectAnswer(answer); // Solo guarda localmente
    
    // Update UI immediately
    answersContainer.querySelectorAll('.answer-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    option.classList.add('selected');

    // NOTE: Answer is NOT sent to backend yet
    // It will be sent when user navigates to another question or submits
});
```

---

#### **Archivo:** `src/web/full-exam-controller.js`

**A. Inicio de tracking:**
```javascript
displayCurrentQuestion() {
    const question = this.getCurrentQuestion();
    if (!question) return;

    // ✅ NUEVO: Start tracking statistics
    if (window.questionStatsTracker) {
        window.questionStatsTracker.startQuestionTracking(question.question_id, {
            categoria: question.ut_category || question.categoria,
            respuesta_correcta: question.correct_answer || question.respuesta_correcta
        });
        this.questionStartTimes[question.question_id] = Date.now();
    }
    
    // ... resto del código
}
```

**B. Método de tracking:**
```javascript
// ✅ NUEVO: Método dedicado para tracking
recordAnswerWithTracker(questionId, userAnswer) {
    const question = this.currentExam.questions.find(q => q.question_id === questionId);
    if (!question || !window.questionStatsTracker || !this.questionStartTimes[questionId]) {
        return;
    }

    const timeSpent = Date.now() - this.questionStartTimes[questionId];
    const correctAnswer = question.correct_answer || question.respuesta_correcta;
    const isCorrect = userAnswer.toUpperCase() === correctAnswer.toUpperCase();
    
    window.questionStatsTracker.recordAnswerAttempt(
        questionId,
        userAnswer,
        isCorrect,
        timeSpent
    );
}
```

**C. Envío al cambiar de pregunta:**
```javascript
goToQuestion(index) {
    // ✅ NUEVO: Record current question's answer before changing
    const currentQuestion = this.getCurrentQuestion();
    if (currentQuestion && this.userAnswers[currentQuestion.question_id]) {
        this.recordAnswerWithTracker(currentQuestion.question_id, this.userAnswers[currentQuestion.question_id]);
    }

    // Call parent method to change question
    super.goToQuestion(index);
}
```

**D. Envío al finalizar:**
```javascript
async submitExam() {
    try {
        this.stopTimer();
        
        // ✅ NUEVO: Record current question's answer before submitting
        const currentQuestion = this.getCurrentQuestion();
        if (currentQuestion && this.userAnswers[currentQuestion.question_id]) {
            this.recordAnswerWithTracker(currentQuestion.question_id, this.userAnswers[currentQuestion.question_id]);
        }

        // End tracking for all questions
        if (window.questionStatsTracker) {
            this.currentExam.questions.forEach(question => {
                window.questionStatsTracker.endQuestionTracking(question.question_id);
            });
        }
        
        // Submit exam...
    }
}
```

---

### **3. Endpoint de Estadísticas Unificado**

#### **Archivo:** `scripts/servidores/api_postgresql.py`

**Línea 1773 - Estadísticas combinadas:**
```python
# ✅ NUEVO: Combina user_exams Y study_tests
cur.execute("""
    SELECT
        COUNT(*) as exams_completed,
        SUM(total_questions) as total_questions,
        SUM(correct_answers) as total_correct,
        AVG(score_percentage) as avg_score,
        SUM(duration_minutes) as total_time_minutes
    FROM (
        SELECT total_questions, correct_answers, score_percentage, duration_minutes
        FROM user_exams
        WHERE user_id = %s AND status = 'completed'
        UNION ALL
        SELECT total_questions, correct_answers, score_percentage, duration_minutes
        FROM study_tests
        WHERE user_id = %s AND status = 'completed'
    ) AS all_exams
""", (user_id, user_id))
```

**Beneficio:**
- ✅ Las estadísticas incluyen AMBOS tipos de exámenes
- ✅ El dashboard muestra datos completos
- ✅ El historial combina exámenes y tests de estudio

---

## 🔄 Flujo Correcto Ahora

### **Escenario 1: Usuario selecciona una respuesta**
1. Click en opción → `selectAnswer(answer)` → Guarda en `this.userAnswers` (local)
2. UI se actualiza (marca la opción)
3. ❌ **NO se envía al backend**

### **Escenario 2: Usuario cambia de pregunta**
1. Click en "Siguiente" o "Anterior" → `goToQuestion(newIndex)`
2. ✅ **Antes de cambiar**: Envía la respuesta actual al backend
3. Cambia a la nueva pregunta
4. Inicia tracking de la nueva pregunta

### **Escenario 3: Usuario cambia de opinión**
1. Selecciona A → Guarda localmente
2. Selecciona B → **Sobrescribe** localmente (no se ha enviado nada)
3. Click en "Siguiente"
4. ✅ **Solo se envía B** (la última seleccionada)

### **Escenario 4: Usuario finaliza el examen**
1. Click en "Finalizar"
2. ✅ **Antes de finalizar**: Guarda la respuesta de la última pregunta
3. Finaliza tracking de todas las preguntas
4. Envía todas las respuestas al backend

---

## 📊 Datos en la Base de Datos

### **Tabla `question_attempt_details`**
```sql
SELECT COUNT(*) as total, 
       COUNT(DISTINCT user_id) as users, 
       COUNT(DISTINCT question_id) as questions 
FROM question_attempt_details;

-- Resultado:
-- total: 210 (intentos)
-- users: 1 (testuser)
-- questions: 176 (preguntas únicas)
```

### **Tablas de Estadísticas**
- `question_global_stats`: Estadísticas globales de cada pregunta
- `question_user_stats`: Estadísticas por usuario y pregunta
- `question_category_stats`: Estadísticas por categoría UT

---

## 🧪 Test Automatizado

### **Archivo:** `tests/test-statistics-tracking.js`

**Tests implementados:**
1. ✅ **TEST 1**: Seleccionar opción A → NO debe enviar request
2. ✅ **TEST 2**: Cambiar a opción B → NO debe enviar request
3. ✅ **TEST 3**: Click en "Siguiente" → SÍ debe enviar request con opción B
4. ✅ **TEST 4**: Seleccionar opción C en segunda pregunta → NO debe enviar
5. ✅ **TEST 5**: Cambiar a D y navegar a anterior → SÍ debe enviar D

**Ejecución:**
```bash
node tests/test-statistics-tracking.js
```

**Capturas generadas:**
- `stats-1-logged-in.png`
- `stats-2-study-config.png`
- `stats-3-test-generated.png`
- `stats-4-question-loaded.png`
- `stats-5-option-A-selected.png`
- `stats-6-option-B-selected.png`
- `stats-7-after-next.png`
- `stats-8-option-C-selected.png`
- `stats-9-after-previous.png`
- `stats-final.png`

---

## ✅ Beneficios

1. **Consistencia**: Todos los tipos de exámenes usan el mismo sistema
2. **UX mejorada**: El usuario puede cambiar de opinión sin problemas
3. **Eficiencia**: No se envían múltiples requests innecesarios
4. **Precisión**: Se registra la última opción seleccionada
5. **Estadísticas completas**: Los tests de estudio ahora aparecen en el dashboard
6. **Selección inteligente**: "Falladas" y "Nuevas" funcionan para tests de estudio

---

## 📝 Archivos Modificados

### Backend:
- `scripts/servidores/api_postgresql.py`:
  - Línea 1773: Query combinado para estadísticas
  - Línea 2830: INSERT en `question_attempt_details` con `user_id`

### Frontend:
- `src/web/study-exam-controller.js`:
  - `displayCurrentQuestion()`: Inicia tracking
  - `goToQuestion()`: Envía respuesta antes de cambiar
  - `submitExam()`: Envía última respuesta antes de finalizar
  - Eliminado envío inmediato en click de opción

- `src/web/full-exam-controller.js`:
  - `displayCurrentQuestion()`: Inicia tracking
  - `recordAnswerWithTracker()`: Método dedicado para tracking
  - `goToQuestion()`: Envía respuesta antes de cambiar
  - `submitExam()`: Envía última respuesta antes de finalizar

### Tests:
- `tests/test-statistics-tracking.js`: Test automatizado completo

---

## 🎯 Resultado Final

✅ **Sistema unificado de tracking**  
✅ **Respuestas no se envían al seleccionar**  
✅ **Respuestas se envían al cambiar de pregunta**  
✅ **Estadísticas completas en el dashboard**  
✅ **Test automatizado que valida el comportamiento**

---

**Fecha de implementación:** 2025-10-07  
**Implementado por:** Claude AI



