"""
Unit tests for database repository classes.
Tests data access layer with proper database transactions.
"""

import pytest
from uuid import uuid4
from datetime import datetime, date

from src.database.repository import (
    ExamRepository, QuestionRepository, ExplanationRepository, StatsRepository
)
from src.database.models import (
    Exam, Question, AnswerOption, QuestionExplanation,
    QuestionFilters, PaginationParams
)

@pytest.mark.integration
class TestExamRepository:
    """Test exam repository operations."""
    
    async def test_create_exam(self, repository):
        """Test creating a new exam."""
        exam = Exam(
            titulo="Test Exam Creation",
            fecha=date(2024, 6, 15),
            convocatoria="Test Convocatoria",
            tipo_examen="PER",
            tipo_convocatoria="Extraordinaria"
        )
        
        created_exam = await repository.exams.create_exam(exam)
        
        assert created_exam.id == exam.id
        assert created_exam.titulo == exam.titulo
        assert created_exam.fecha == exam.fecha
        assert created_exam.convocatoria == exam.convocatoria
    
    async def test_get_exam_by_id(self, repository, sample_exam):
        """Test retrieving exam by ID."""
        retrieved_exam = await repository.exams.get_exam_by_id(sample_exam.id)
        
        assert retrieved_exam is not None
        assert retrieved_exam.id == sample_exam.id
        assert retrieved_exam.titulo == sample_exam.titulo
        assert retrieved_exam.fecha == sample_exam.fecha
    
    async def test_get_nonexistent_exam(self, repository):
        """Test retrieving non-existent exam returns None."""
        fake_id = uuid4()
        exam = await repository.exams.get_exam_by_id(fake_id)
        
        assert exam is None
    
    async def test_list_exams(self, repository, sample_exam):
        """Test listing exams with pagination."""
        # Create additional exam for testing
        extra_exam = Exam(
            titulo="Second Test Exam",
            fecha=date(2024, 7, 15),
            convocatoria="July 2024",
            tipo_examen="PER"
        )
        await repository.exams.create_exam(extra_exam)
        
        # Test listing
        exams = await repository.exams.list_exams(limit=10, offset=0)
        
        assert len(exams) >= 2
        assert any(exam.id == sample_exam.id for exam in exams)
        assert any(exam.id == extra_exam.id for exam in exams)
        
        # Test with limit
        exams_limited = await repository.exams.list_exams(limit=1, offset=0)
        assert len(exams_limited) == 1

@pytest.mark.integration
class TestQuestionRepository:
    """Test question repository operations."""
    
    async def test_create_question_with_options(self, repository, sample_exam):
        """Test creating question with answer options."""
        question = Question(
            exam_id=sample_exam.id,
            numero_pregunta=99,
            texto_pregunta="Test question creation",
            respuesta_correcta="c",
            categoria="Test Category",
            subcategoria="Test Subcategory",
            hash_pregunta="test_hash_unique"
        )
        
        options = [
            AnswerOption(opcion="a", texto="Option A", es_correcta=False),
            AnswerOption(opcion="b", texto="Option B", es_correcta=False),
            AnswerOption(opcion="c", texto="Option C", es_correcta=True),
            AnswerOption(opcion="d", texto="Option D", es_correcta=False),
        ]
        
        # Set question_id for all options
        for option in options:
            option.question_id = question.id
        
        created_question = await repository.questions.create_question(question, options)
        
        assert created_question.id == question.id
        assert created_question.texto_pregunta == question.texto_pregunta
        assert created_question.respuesta_correcta == question.respuesta_correcta
        assert len(created_question.opciones) == 4
        
        # Verify correct answer is marked
        correct_option = next(
            opt for opt in created_question.opciones if opt.opcion == "c"
        )
        assert correct_option.es_correcta is True
    
    async def test_get_question_by_id_with_relations(self, repository, sample_question, sample_explanation):
        """Test getting question with all related data."""
        question = await repository.questions.get_question_by_id(sample_question.id)
        
        assert question is not None
        assert question.id == sample_question.id
        assert question.texto_pregunta == sample_question.texto_pregunta
        
        # Check exam relation
        assert question.exam is not None
        assert question.exam.id == sample_question.exam_id
        
        # Check answer options
        assert question.opciones is not None
        assert len(question.opciones) == 4
        
        # Check explanation
        assert question.explicacion is not None
        assert question.explicacion.question_id == sample_question.id
    
    async def test_search_questions_basic(self, repository, sample_question):
        """Test basic question search without filters."""
        filters = QuestionFilters()
        pagination = PaginationParams(page=1, page_size=10)
        
        result = await repository.questions.search_questions(filters, pagination)
        
        assert result.total_count >= 1
        assert len(result.questions) >= 1
        assert result.page == 1
        assert result.page_size == 10
        assert result.total_pages >= 1
        
        # Find our test question
        test_question = next(
            (q for q in result.questions if q.id == sample_question.id),
            None
        )
        assert test_question is not None
    
    async def test_search_questions_with_category_filter(self, repository, sample_question):
        """Test question search with category filter."""
        filters = QuestionFilters(categoria=sample_question.categoria)
        pagination = PaginationParams(page=1, page_size=10)
        
        result = await repository.questions.search_questions(filters, pagination)
        
        assert result.total_count >= 1
        for question in result.questions:
            assert question.categoria == sample_question.categoria
    
    async def test_search_questions_with_text_search(self, repository, sample_question):
        """Test question search with full-text search."""
        # Search for a word that should be in our sample question
        search_word = "velocidad"  # From sample question text
        filters = QuestionFilters(texto_busqueda=search_word)
        pagination = PaginationParams(page=1, page_size=10)
        
        result = await repository.questions.search_questions(filters, pagination)
        
        # Should find at least our sample question
        assert result.total_count >= 1
        
        # Verify search results contain the search term
        found_sample = False
        for question in result.questions:
            if question.id == sample_question.id:
                found_sample = True
                assert search_word.lower() in question.texto_pregunta.lower()
        
        assert found_sample
    
    async def test_search_questions_with_exam_filter(self, repository, sample_question, sample_exam):
        """Test question search filtered by exam."""
        filters = QuestionFilters(exam_id=sample_exam.id)
        pagination = PaginationParams(page=1, page_size=10)
        
        result = await repository.questions.search_questions(filters, pagination)
        
        assert result.total_count >= 1
        for question in result.questions:
            assert question.exam_id == sample_exam.id
    
    async def test_search_questions_with_explanation_filter(self, repository, sample_question, sample_explanation):
        """Test filtering questions with/without explanations."""
        # Test filtering for questions WITH explanations
        filters = QuestionFilters(tiene_explicacion=True)
        pagination = PaginationParams(page=1, page_size=10)
        
        result = await repository.questions.search_questions(filters, pagination)
        
        # Should find our question with explanation
        found_question = next(
            (q for q in result.questions if q.id == sample_question.id),
            None
        )
        assert found_question is not None
        
        # Test filtering for questions WITHOUT explanations
        filters = QuestionFilters(tiene_explicacion=False)
        result = await repository.questions.search_questions(filters, pagination)
        
        # Our sample question should NOT appear here
        found_question = next(
            (q for q in result.questions if q.id == sample_question.id),
            None
        )
        assert found_question is None
    
    async def test_search_questions_pagination(self, repository, sample_exam):
        """Test question search pagination."""
        # Create multiple questions for pagination testing
        questions = []
        for i in range(5):
            question = Question(
                exam_id=sample_exam.id,
                numero_pregunta=100 + i,
                texto_pregunta=f"Test pagination question {i}",
                respuesta_correcta="a",
                categoria="Pagination Test",
                hash_pregunta=f"pagination_hash_{i}"
            )
            
            options = [
                AnswerOption(question_id=question.id, opcion="a", texto="Option A", es_correcta=True),
                AnswerOption(question_id=question.id, opcion="b", texto="Option B", es_correcta=False),
                AnswerOption(question_id=question.id, opcion="c", texto="Option C", es_correcta=False),
                AnswerOption(question_id=question.id, opcion="d", texto="Option D", es_correcta=False),
            ]
            
            created_question = await repository.questions.create_question(question, options)
            questions.append(created_question)
        
        # Test first page
        filters = QuestionFilters(categoria="Pagination Test")
        pagination = PaginationParams(page=1, page_size=3)
        
        result = await repository.questions.search_questions(filters, pagination)
        
        assert result.total_count == 5
        assert len(result.questions) == 3
        assert result.page == 1
        assert result.page_size == 3
        assert result.total_pages == 2
        assert result.has_next is True
        assert result.has_previous is False
        
        # Test second page
        pagination = PaginationParams(page=2, page_size=3)
        result = await repository.questions.search_questions(filters, pagination)
        
        assert len(result.questions) == 2  # Remaining questions
        assert result.page == 2
        assert result.has_next is False
        assert result.has_previous is True

@pytest.mark.integration
class TestExplanationRepository:
    """Test explanation repository operations."""
    
    async def test_save_explanation(self, repository, sample_question, sample_user):
        """Test saving a new explanation."""
        explanation = QuestionExplanation(
            question_id=sample_question.id,
            explicacion_texto="This is a test explanation",
            modelo_usado="gpt-4",
            tokens_usados=100,
            tiempo_generacion_ms=1500,
            created_by=sample_user.id
        )
        
        saved_explanation = await repository.explanations.save_explanation(explanation)
        
        assert saved_explanation.id == explanation.id
        assert saved_explanation.question_id == explanation.question_id
        assert saved_explanation.explicacion_texto == explanation.explicacion_texto
        assert saved_explanation.tokens_usados == explanation.tokens_usados
    
    async def test_get_explanation(self, repository, sample_explanation):
        """Test retrieving explanation by question ID."""
        explanation = await repository.explanations.get_explanation(
            sample_explanation.question_id
        )
        
        assert explanation is not None
        assert explanation.id == sample_explanation.id
        assert explanation.question_id == sample_explanation.question_id
        assert explanation.explicacion_texto == sample_explanation.explicacion_texto
    
    async def test_get_nonexistent_explanation(self, repository):
        """Test retrieving non-existent explanation returns None."""
        fake_question_id = uuid4()
        explanation = await repository.explanations.get_explanation(fake_question_id)
        
        assert explanation is None
    
    async def test_update_explanation(self, repository, sample_explanation):
        """Test updating an existing explanation."""
        # Modify the explanation
        sample_explanation.explicacion_texto = "Updated explanation text"
        sample_explanation.tokens_usados = 200
        
        updated_explanation = await repository.explanations.save_explanation(sample_explanation)
        
        assert updated_explanation.explicacion_texto == "Updated explanation text"
        assert updated_explanation.tokens_usados == 200
        
        # Verify update persisted
        retrieved = await repository.explanations.get_explanation(sample_explanation.question_id)
        assert retrieved.explicacion_texto == "Updated explanation text"

@pytest.mark.integration
class TestStatsRepository:
    """Test statistics repository operations."""
    
    async def test_get_system_stats(self, repository, sample_question, sample_explanation):
        """Test retrieving system statistics."""
        stats = await repository.stats.get_system_stats()
        
        assert stats.total_questions >= 1
        assert stats.total_exams >= 1
        assert stats.total_explanations >= 1
        assert stats.total_duplicates >= 0
        
        # Check category breakdown
        assert isinstance(stats.questions_by_category, dict)
        assert len(stats.questions_by_category) > 0
        
        # Check exam type breakdown
        assert isinstance(stats.questions_by_exam_type, dict)
        
        # Check recent activity
        assert isinstance(stats.recent_activity, list)
        assert len(stats.recent_activity) >= 0

@pytest.mark.integration
class TestRepositoryErrorHandling:
    """Test repository error handling and edge cases."""
    
    async def test_create_duplicate_question_same_exam(self, repository, sample_exam):
        """Test that creating duplicate question in same exam is handled."""
        question1 = Question(
            exam_id=sample_exam.id,
            numero_pregunta=999,
            texto_pregunta="Duplicate test question",
            respuesta_correcta="a",
            categoria="Test",
            hash_pregunta="duplicate_test_hash"
        )
        
        options = [
            AnswerOption(question_id=question1.id, opcion="a", texto="A", es_correcta=True),
            AnswerOption(question_id=question1.id, opcion="b", texto="B", es_correcta=False),
            AnswerOption(question_id=question1.id, opcion="c", texto="C", es_correcta=False),
            AnswerOption(question_id=question1.id, opcion="d", texto="D", es_correcta=False),
        ]
        
        # First creation should succeed
        await repository.questions.create_question(question1, options)
        
        # Second creation with same exam_id and numero_pregunta should fail
        question2 = Question(
            exam_id=sample_exam.id,
            numero_pregunta=999,  # Same as question1
            texto_pregunta="Different text",
            respuesta_correcta="b",
            categoria="Test",
            hash_pregunta="different_hash"
        )
        
        options2 = [
            AnswerOption(question_id=question2.id, opcion="a", texto="A2", es_correcta=False),
            AnswerOption(question_id=question2.id, opcion="b", texto="B2", es_correcta=True),
            AnswerOption(question_id=question2.id, opcion="c", texto="C2", es_correcta=False),
            AnswerOption(question_id=question2.id, opcion="d", texto="D2", es_correcta=False),
        ]
        
        with pytest.raises(Exception):  # Should raise unique constraint violation
            await repository.questions.create_question(question2, options2)
    
    async def test_invalid_pagination_parameters(self, repository):
        """Test search with invalid pagination parameters."""
        filters = QuestionFilters()
        
        # Test with page 0 (should be handled gracefully)
        pagination = PaginationParams(page=0, page_size=10)
        result = await repository.questions.search_questions(filters, pagination)
        
        # Should still return results (implementation dependent)
        assert isinstance(result.questions, list)
        assert result.total_count >= 0
    
    async def test_very_large_page_size(self, repository):
        """Test search with very large page size."""
        filters = QuestionFilters()
        pagination = PaginationParams(page=1, page_size=10000)
        
        result = await repository.questions.search_questions(filters, pagination)
        
        # Should be limited by actual data or reasonable limits
        assert isinstance(result.questions, list)
        assert len(result.questions) <= result.total_count
    
    async def test_empty_search_results(self, repository):
        """Test search that returns no results."""
        filters = QuestionFilters(categoria="NonexistentCategory12345")
        pagination = PaginationParams(page=1, page_size=10)
        
        result = await repository.questions.search_questions(filters, pagination)
        
        assert result.total_count == 0
        assert len(result.questions) == 0
        assert result.page == 1
        assert result.total_pages == 0
        assert result.has_next is False
        assert result.has_previous is False