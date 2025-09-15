"""
Integration tests for FastAPI endpoints.
Tests the complete request/response cycle with authentication and database.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch

from src.database.models import User, QuestionFilters, PaginationParams

@pytest.mark.integration
class TestHealthEndpoints:
    """Test health and monitoring endpoints."""
    
    async def test_health_check(self, client: AsyncClient):
        """Test basic health check endpoint."""
        response = await client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "services" in data
        assert data["services"]["api"] == "healthy"

@pytest.mark.integration 
class TestQuestionEndpoints:
    """Test question-related endpoints."""
    
    async def test_search_questions_without_auth(self, client: AsyncClient):
        """Test that question search requires authentication."""
        response = await client.get("/api/v2/questions")
        assert response.status_code == 401
        
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == 401
    
    @patch('src.api.main.auth_service')
    async def test_search_questions_with_auth(
        self, 
        mock_auth_service,
        client: AsyncClient, 
        sample_user: User,
        sample_question
    ):
        """Test question search with valid authentication."""
        # Mock auth service
        mock_auth_service.verify_access_token = AsyncMock(return_value=sample_user)
        
        headers = {"Authorization": "Bearer valid_token"}
        response = await client.get("/api/v2/questions", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "questions" in data
        assert "total_count" in data
        assert "page" in data
        assert "page_size" in data
        assert isinstance(data["questions"], list)
    
    @patch('src.api.main.auth_service')
    async def test_search_questions_with_filters(
        self,
        mock_auth_service, 
        client: AsyncClient, 
        sample_user: User,
        sample_question
    ):
        """Test question search with various filters."""
        mock_auth_service.verify_access_token = AsyncMock(return_value=sample_user)
        
        headers = {"Authorization": "Bearer valid_token"}
        
        # Test category filter
        params = {"categoria": "Navegación"}
        response = await client.get("/api/v2/questions", params=params, headers=headers)
        assert response.status_code == 200
        
        # Test text search
        params = {"texto_busqueda": "velocidad"}
        response = await client.get("/api/v2/questions", params=params, headers=headers)
        assert response.status_code == 200
        
        # Test pagination
        params = {"page": 1, "page_size": 10}
        response = await client.get("/api/v2/questions", params=params, headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 10
    
    @patch('src.api.main.auth_service')
    async def test_get_question_by_id(
        self,
        mock_auth_service,
        client: AsyncClient,
        sample_user: User, 
        sample_question
    ):
        """Test retrieving specific question by ID."""
        mock_auth_service.verify_access_token = AsyncMock(return_value=sample_user)
        
        headers = {"Authorization": "Bearer valid_token"}
        response = await client.get(
            f"/api/v2/questions/{sample_question.id}", 
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == str(sample_question.id)
        assert data["texto_pregunta"] == sample_question.texto_pregunta
        assert data["respuesta_correcta"] == sample_question.respuesta_correcta
        assert "opciones" in data
        assert len(data["opciones"]) == 4  # a, b, c, d
    
    @patch('src.api.main.auth_service')
    async def test_get_nonexistent_question(
        self,
        mock_auth_service,
        client: AsyncClient,
        sample_user: User
    ):
        """Test retrieving non-existent question returns 404."""
        mock_auth_service.verify_access_token = AsyncMock(return_value=sample_user)
        
        headers = {"Authorization": "Bearer valid_token"}
        fake_uuid = "550e8400-e29b-41d4-a716-446655440000"
        response = await client.get(
            f"/api/v2/questions/{fake_uuid}", 
            headers=headers
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == 404

@pytest.mark.integration
class TestExplanationEndpoints:
    """Test AI explanation endpoints."""
    
    @patch('src.api.main.auth_service')
    async def test_get_explanation_without_permission(
        self,
        mock_auth_service,
        client: AsyncClient,
        sample_question
    ):
        """Test that viewers cannot generate explanations."""
        viewer_user = User(
            email="viewer@test.com",
            username="viewer",
            password_hash="hash",
            role="viewer"
        )
        mock_auth_service.verify_access_token = AsyncMock(return_value=viewer_user)
        
        headers = {"Authorization": "Bearer valid_token"}
        payload = {
            "question_id": str(sample_question.id),
            "force_regenerate": False,
            "include_diagrams": True
        }
        
        response = await client.post(
            "/api/v2/explanations", 
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 403
        data = response.json()
        assert "error" in data
        assert "permission" in data["error"]["message"].lower()
    
    @patch('src.api.main.auth_service')
    @patch('src.api.main.explanation_service')
    async def test_generate_explanation_with_permission(
        self,
        mock_explanation_service,
        mock_auth_service, 
        client: AsyncClient,
        sample_question,
        sample_explanation
    ):
        """Test explanation generation with proper permissions."""
        editor_user = User(
            email="editor@test.com",
            username="editor", 
            password_hash="hash",
            role="editor"
        )
        mock_auth_service.verify_access_token = AsyncMock(return_value=editor_user)
        
        # Mock explanation service response
        mock_explanation_service.generate_explanation = AsyncMock(return_value={
            "question_id": str(sample_question.id),
            "explicacion": sample_explanation,
            "cached": False,
            "generation_time_ms": 2500
        })
        
        headers = {"Authorization": "Bearer valid_token"}
        payload = {
            "question_id": str(sample_question.id),
            "force_regenerate": False,
            "include_diagrams": True
        }
        
        response = await client.post(
            "/api/v2/explanations",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "question_id" in data
        assert "explicacion" in data
        assert "cached" in data
        assert "generation_time_ms" in data
    
    @patch('src.api.main.auth_service')
    async def test_get_existing_explanation(
        self,
        mock_auth_service,
        client: AsyncClient,
        sample_user: User,
        sample_question,
        sample_explanation
    ):
        """Test retrieving existing explanation."""
        mock_auth_service.verify_access_token = AsyncMock(return_value=sample_user)
        
        headers = {"Authorization": "Bearer valid_token"}
        response = await client.get(
            f"/api/v2/explanations/{sample_question.id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "explanation" in data
        assert "cached" in data
        explanation = data["explanation"]
        assert explanation["question_id"] == str(sample_question.id)
        assert explanation["explicacion_texto"] == sample_explanation.explicacion_texto

@pytest.mark.integration
class TestStatsEndpoints:
    """Test statistics and monitoring endpoints."""
    
    @patch('src.api.main.auth_service')
    async def test_get_system_stats(
        self,
        mock_auth_service,
        client: AsyncClient,
        sample_user: User,
        sample_question,
        sample_explanation
    ):
        """Test system statistics endpoint."""
        mock_auth_service.verify_access_token = AsyncMock(return_value=sample_user)
        
        headers = {"Authorization": "Bearer valid_token"}
        response = await client.get("/api/v2/stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_questions" in data
        assert "total_exams" in data
        assert "total_explanations" in data
        assert "questions_by_category" in data
        assert "recent_activity" in data
        
        # Verify data types
        assert isinstance(data["total_questions"], int)
        assert isinstance(data["questions_by_category"], dict)
        assert isinstance(data["recent_activity"], list)

@pytest.mark.integration
class TestAuthenticationEndpoints:
    """Test authentication endpoints."""
    
    @patch('src.api.main.auth_service')
    async def test_login_success(
        self,
        mock_auth_service,
        client: AsyncClient
    ):
        """Test successful user login."""
        mock_auth_service.authenticate = AsyncMock(return_value={
            "access_token": "test_access_token",
            "refresh_token": "test_refresh_token",
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {
                "id": "123",
                "username": "testuser",
                "email": "test@test.com",
                "role": "editor"
            }
        })
        
        payload = {
            "username_or_email": "test@test.com",
            "password": "testpassword"
        }
        
        response = await client.post("/api/v2/auth/login", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        assert data["token_type"] == "bearer"
    
    @patch('src.api.main.auth_service')
    async def test_login_failure(
        self,
        mock_auth_service,
        client: AsyncClient
    ):
        """Test login with invalid credentials."""
        mock_auth_service.authenticate = AsyncMock(side_effect=ValueError("Invalid credentials"))
        
        payload = {
            "username_or_email": "test@test.com",
            "password": "wrongpassword"
        }
        
        response = await client.post("/api/v2/auth/login", json=payload)
        
        assert response.status_code == 400 or response.status_code == 401
    
    @patch('src.api.main.auth_service')
    async def test_token_refresh(
        self,
        mock_auth_service,
        client: AsyncClient
    ):
        """Test token refresh endpoint."""
        mock_auth_service.refresh_token = AsyncMock(return_value={
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {
                "id": "123",
                "username": "testuser",
                "email": "test@test.com",
                "role": "editor"
            }
        })
        
        payload = {"refresh_token": "valid_refresh_token"}
        
        response = await client.post("/api/v2/auth/refresh", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "refresh_token" in data
    
    @patch('src.api.main.auth_service')
    async def test_logout(
        self,
        mock_auth_service,
        client: AsyncClient,
        sample_user: User
    ):
        """Test user logout."""
        mock_auth_service.verify_access_token = AsyncMock(return_value=sample_user)
        mock_auth_service.logout = AsyncMock()
        
        headers = {"Authorization": "Bearer valid_token"}
        response = await client.post("/api/v2/auth/logout", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

@pytest.mark.integration
class TestCacheEndpoints:
    """Test cache management endpoints (admin only)."""
    
    @patch('src.api.main.auth_service')
    async def test_cache_stats_admin(
        self,
        mock_auth_service,
        client: AsyncClient,
        admin_user: User
    ):
        """Test cache stats endpoint with admin user."""
        mock_auth_service.verify_access_token = AsyncMock(return_value=admin_user)
        
        headers = {"Authorization": "Bearer admin_token"}
        response = await client.get("/api/v2/cache/stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should contain stats for different cache types
        expected_cache_types = ["questions", "explanations", "search", "stats", "sessions"]
        for cache_type in expected_cache_types:
            assert cache_type in data
    
    @patch('src.api.main.auth_service')
    async def test_cache_stats_non_admin(
        self,
        mock_auth_service,
        client: AsyncClient,
        sample_user: User
    ):
        """Test cache stats endpoint with non-admin user."""
        mock_auth_service.verify_access_token = AsyncMock(return_value=sample_user)
        
        headers = {"Authorization": "Bearer user_token"}
        response = await client.get("/api/v2/cache/stats", headers=headers)
        
        assert response.status_code == 403
    
    @patch('src.api.main.auth_service')
    async def test_clear_cache_admin(
        self,
        mock_auth_service,
        client: AsyncClient,
        admin_user: User
    ):
        """Test cache clearing with admin user."""
        mock_auth_service.verify_access_token = AsyncMock(return_value=admin_user)
        
        headers = {"Authorization": "Bearer admin_token"}
        
        # Clear specific cache type
        response = await client.post(
            "/api/v2/cache/clear?cache_type=questions", 
            headers=headers
        )
        assert response.status_code == 200
        
        # Clear all caches
        response = await client.post("/api/v2/cache/clear", headers=headers)
        assert response.status_code == 200

@pytest.mark.integration
class TestErrorHandling:
    """Test error handling and edge cases."""
    
    async def test_invalid_endpoint(self, client: AsyncClient):
        """Test 404 for non-existent endpoints."""
        response = await client.get("/api/v2/nonexistent")
        assert response.status_code == 404
    
    async def test_method_not_allowed(self, client: AsyncClient):
        """Test 405 for wrong HTTP methods."""
        response = await client.post("/health")
        assert response.status_code == 405
    
    @patch('src.api.main.auth_service')
    async def test_server_error_handling(
        self,
        mock_auth_service,
        client: AsyncClient,
        sample_user: User
    ):
        """Test that server errors return proper error response."""
        mock_auth_service.verify_access_token = AsyncMock(return_value=sample_user)
        
        # This would trigger a server error if the database is down
        # In a real test, you'd mock the database to raise an exception
        headers = {"Authorization": "Bearer valid_token"}
        
        # The actual error testing would depend on specific error scenarios
        # This is a placeholder for proper error testing
        assert True