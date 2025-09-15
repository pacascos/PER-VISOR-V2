"""
Pytest configuration and fixtures for PER maritime exam system tests.
Provides comprehensive test setup with database, cache, and authentication mocks.
"""

import asyncio
import os
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
from datetime import datetime
from typing import AsyncGenerator

# FastAPI testing
from fastapi.testclient import TestClient
from httpx import AsyncClient

# Database testing
import asyncpg
from asyncpg.pool import Pool

# Import application components
from src.api.main import app
from src.database.models import User, Exam, Question, AnswerOption, QuestionExplanation
from src.database.repository import MasterRepository
from src.cache.redis_cache import RedisCache, CacheManager, CacheConfig
from src.api.services.auth_service import AuthService

# Test configuration
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql://localhost/per_exams_test")
TEST_REDIS_URL = os.getenv("TEST_REDIS_URL", "redis://localhost:6379/15")  # Use db 15 for tests

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session")
async def db_pool() -> AsyncGenerator[Pool, None]:
    """Create test database connection pool."""
    try:
        pool = await asyncpg.create_pool(
            TEST_DATABASE_URL,
            min_size=2,
            max_size=5,
            command_timeout=30
        )
        yield pool
    finally:
        await pool.close()

@pytest_asyncio.fixture
async def clean_db(db_pool: Pool):
    """Clean database before each test."""
    async with db_pool.acquire() as conn:
        # Clean up tables in reverse dependency order
        await conn.execute("TRUNCATE question_duplicates CASCADE")
        await conn.execute("TRUNCATE question_explanations CASCADE")
        await conn.execute("TRUNCATE answer_options CASCADE")
        await conn.execute("TRUNCATE questions CASCADE")
        await conn.execute("TRUNCATE exams CASCADE")
        await conn.execute("TRUNCATE user_sessions CASCADE")
        await conn.execute("TRUNCATE users CASCADE")

@pytest_asyncio.fixture
async def repository(db_pool: Pool, clean_db) -> MasterRepository:
    """Create repository instance with clean database."""
    return MasterRepository(db_pool)

@pytest_asyncio.fixture
async def cache_manager() -> AsyncGenerator[CacheManager, None]:
    """Create cache manager for testing."""
    config = CacheConfig(
        redis_url=TEST_REDIS_URL,
        key_prefix="test_per:",
        default_ttl=300
    )
    
    cache_manager = CacheManager(config)
    await cache_manager.connect_all()
    
    # Clear all test caches
    await cache_manager.clear_all()
    
    yield cache_manager
    
    # Cleanup
    await cache_manager.clear_all()
    await cache_manager.disconnect_all()

@pytest.fixture
def mock_cache_manager():
    """Mock cache manager for tests that don't need real Redis."""
    mock_cache = MagicMock()
    
    # Mock individual caches
    for cache_type in ['questions', 'explanations', 'search', 'stats', 'sessions']:
        cache_instance = MagicMock()
        cache_instance.get = AsyncMock(return_value=None)
        cache_instance.set = AsyncMock(return_value=True)
        cache_instance.delete = AsyncMock(return_value=True)
        cache_instance.delete_pattern = AsyncMock(return_value=0)
        setattr(mock_cache, cache_type, cache_instance)
    
    mock_cache.connect_all = AsyncMock()
    mock_cache.disconnect_all = AsyncMock()
    mock_cache.clear_all = AsyncMock()
    mock_cache.get_combined_stats = AsyncMock(return_value={})
    
    return mock_cache

@pytest_asyncio.fixture
async def sample_user(repository: MasterRepository) -> User:
    """Create sample user for testing."""
    user = User(
        email="test@example.com",
        username="testuser",
        password_hash="$2b$12$hashed_password",
        role="editor",
        is_active=True
    )
    
    # Insert into database
    async with repository.pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO users (id, email, username, password_hash, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, user.id, user.email, user.username, user.password_hash, user.role, user.is_active)
    
    return user

@pytest_asyncio.fixture
async def admin_user(repository: MasterRepository) -> User:
    """Create admin user for testing."""
    user = User(
        email="admin@example.com",
        username="admin",
        password_hash="$2b$12$hashed_password",
        role="admin",
        is_active=True
    )
    
    async with repository.pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO users (id, email, username, password_hash, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, user.id, user.email, user.username, user.password_hash, user.role, user.is_active)
    
    return user

@pytest_asyncio.fixture
async def sample_exam(repository: MasterRepository) -> Exam:
    """Create sample exam for testing."""
    exam = Exam(
        titulo="Examen PER Ejemplo",
        fecha=datetime(2024, 1, 15).date(),
        convocatoria="Enero 2024",
        tipo_examen="PER",
        tipo_convocatoria="Ordinaria"
    )
    
    # Insert into database
    async with repository.pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO exams (id, titulo, fecha, convocatoria, tipo_examen, tipo_convocatoria)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, exam.id, exam.titulo, exam.fecha, exam.convocatoria, exam.tipo_examen, exam.tipo_convocatoria)
    
    return exam

@pytest_asyncio.fixture
async def sample_question(repository: MasterRepository, sample_exam: Exam) -> Question:
    """Create sample question with answer options."""
    question = Question(
        exam_id=sample_exam.id,
        numero_pregunta=1,
        texto_pregunta="¿Cuál es la velocidad máxima permitida en puerto?",
        respuesta_correcta="b",
        categoria="Navegación",
        subcategoria="Normativa",
        hash_pregunta="sample_hash_123"
    )
    
    # Insert question
    async with repository.pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO questions (
                id, exam_id, numero_pregunta, texto_pregunta, respuesta_correcta,
                categoria, subcategoria, hash_pregunta
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """,
            question.id, question.exam_id, question.numero_pregunta,
            question.texto_pregunta, question.respuesta_correcta,
            question.categoria, question.subcategoria, question.hash_pregunta
        )
        
        # Insert answer options
        options = [
            AnswerOption(question_id=question.id, opcion="a", texto="10 nudos", es_correcta=False),
            AnswerOption(question_id=question.id, opcion="b", texto="3 nudos", es_correcta=True),
            AnswerOption(question_id=question.id, opcion="c", texto="5 nudos", es_correcta=False),
            AnswerOption(question_id=question.id, opcion="d", texto="Sin límite", es_correcta=False),
        ]
        
        for option in options:
            await conn.execute("""
                INSERT INTO answer_options (id, question_id, opcion, texto, es_correcta)
                VALUES ($1, $2, $3, $4, $5)
            """, option.id, option.question_id, option.opcion, option.texto, option.es_correcta)
    
    return question

@pytest_asyncio.fixture
async def sample_explanation(
    repository: MasterRepository, 
    sample_question: Question,
    sample_user: User
) -> QuestionExplanation:
    """Create sample explanation for testing."""
    explanation = QuestionExplanation(
        question_id=sample_question.id,
        explicacion_texto="La velocidad máxima en puerto es 3 nudos según el Reglamento General de Puertos.",
        modelo_usado="gpt-4",
        tokens_usados=150,
        tiempo_generacion_ms=2500,
        created_by=sample_user.id
    )
    
    async with repository.pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO question_explanations (
                id, question_id, explicacion_texto, modelo_usado,
                tokens_usados, tiempo_generacion_ms, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        """,
            explanation.id, explanation.question_id, explanation.explicacion_texto,
            explanation.modelo_usado, explanation.tokens_usados,
            explanation.tiempo_generacion_ms, explanation.created_by
        )
    
    return explanation

@pytest.fixture
def auth_service_mock() -> AuthService:
    """Mock authentication service."""
    mock = MagicMock(spec=AuthService)
    
    # Mock successful authentication
    mock.authenticate = AsyncMock(return_value={
        "access_token": "fake_access_token",
        "refresh_token": "fake_refresh_token",
        "token_type": "bearer",
        "expires_in": 3600,
        "user": {
            "id": str(uuid4()),
            "username": "testuser",
            "email": "test@example.com",
            "role": "editor",
            "is_active": True
        }
    })
    
    # Mock token verification
    mock.verify_access_token = AsyncMock(return_value=User(
        email="test@example.com",
        username="testuser",
        password_hash="hashed",
        role="editor"
    ))
    
    mock.refresh_token = AsyncMock(return_value={
        "access_token": "new_fake_access_token",
        "refresh_token": "new_fake_refresh_token",
        "token_type": "bearer",
        "expires_in": 3600,
        "user": {
            "id": str(uuid4()),
            "username": "testuser",
            "email": "test@example.com",
            "role": "editor",
            "is_active": True
        }
    })
    
    mock.logout = AsyncMock()
    mock.get_stats = AsyncMock(return_value={
        "successful_logins": 10,
        "failed_logins": 2,
        "active_sessions": 5
    })
    
    return mock

@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client for testing."""
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        yield client

@pytest.fixture
def sync_client() -> TestClient:
    """Create synchronous test client."""
    return TestClient(app)

@pytest.fixture
def auth_headers(sample_user: User) -> dict:
    """Generate authentication headers for testing."""
    return {
        "Authorization": "Bearer fake_jwt_token",
        "Content-Type": "application/json"
    }

@pytest.fixture
def mock_openai():
    """Mock OpenAI API responses."""
    with pytest.mock.patch('openai.ChatCompletion.acreate') as mock:
        mock.return_value = AsyncMock()
        mock.return_value.choices = [
            MagicMock(message=MagicMock(content='{"explicacion": "Test explanation"}'))
        ]
        mock.return_value.usage = MagicMock(total_tokens=100)
        yield mock

# Test data factories
class TestDataFactory:
    """Factory for creating test data objects."""
    
    @staticmethod
    def create_user(**kwargs) -> User:
        """Create test user with optional overrides."""
        defaults = {
            "email": "test@example.com",
            "username": "testuser",
            "password_hash": "$2b$12$hashed_password",
            "role": "viewer",
            "is_active": True
        }
        defaults.update(kwargs)
        return User(**defaults)
    
    @staticmethod
    def create_exam(**kwargs) -> Exam:
        """Create test exam with optional overrides."""
        defaults = {
            "titulo": "Examen de Prueba",
            "fecha": datetime(2024, 1, 1).date(),
            "convocatoria": "Test",
            "tipo_examen": "PER",
            "tipo_convocatoria": "Ordinaria"
        }
        defaults.update(kwargs)
        return Exam(**defaults)
    
    @staticmethod
    def create_question(exam_id, **kwargs) -> Question:
        """Create test question with optional overrides."""
        defaults = {
            "exam_id": exam_id,
            "numero_pregunta": 1,
            "texto_pregunta": "Pregunta de prueba",
            "respuesta_correcta": "a",
            "categoria": "Test Category",
            "hash_pregunta": f"hash_{uuid4().hex[:8]}"
        }
        defaults.update(kwargs)
        return Question(**defaults)

@pytest.fixture
def test_data_factory():
    """Test data factory fixture."""
    return TestDataFactory

# Performance testing utilities
@pytest.fixture
def performance_monitor():
    """Performance monitoring utility for tests."""
    import time
    
    class PerformanceMonitor:
        def __init__(self):
            self.start_time = None
            self.measurements = {}
        
        def start(self):
            self.start_time = time.time()
        
        def measure(self, operation_name: str):
            if self.start_time:
                duration = time.time() - self.start_time
                self.measurements[operation_name] = duration
                self.start_time = time.time()
        
        def get_measurement(self, operation_name: str) -> float:
            return self.measurements.get(operation_name, 0.0)
        
        def assert_performance(self, operation_name: str, max_duration: float):
            duration = self.get_measurement(operation_name)
            assert duration <= max_duration, f"{operation_name} took {duration:.3f}s, expected <= {max_duration}s"
    
    return PerformanceMonitor()

# Environment setup
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests (need database)"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests (no external dependencies)"
    )
    config.addinivalue_line(
        "markers", "performance: marks tests as performance tests"
    )
    config.addinivalue_line(
        "markers", "auth: marks tests as authentication-related"
    )
    config.addinivalue_line(
        "markers", "cache: marks tests as cache-related"
    )

def pytest_collection_modifyitems(config, items):
    """Automatically mark tests based on their location."""
    for item in items:
        # Mark integration tests
        if "integration" in str(item.fspath) or "test_integration" in item.name:
            item.add_marker(pytest.mark.integration)
        
        # Mark unit tests
        if "unit" in str(item.fspath) or "test_unit" in item.name:
            item.add_marker(pytest.mark.unit)
        
        # Mark performance tests
        if "performance" in str(item.fspath) or "test_performance" in item.name:
            item.add_marker(pytest.mark.performance)

# Database schema setup for tests
@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_database():
    """Set up test database schema."""
    # This would run the schema creation script
    # For now, we assume the test database exists and has the schema
    pass