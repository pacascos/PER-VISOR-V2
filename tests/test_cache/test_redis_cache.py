"""
Unit tests for Redis cache implementation.
Tests caching functionality, serialization, compression, and statistics.
"""

import pytest
import json
import gzip
from unittest.mock import AsyncMock, MagicMock, patch

from src.cache.redis_cache import RedisCache, CacheConfig, CacheManager

@pytest.mark.unit
class TestCacheConfig:
    """Test cache configuration validation."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = CacheConfig()
        
        assert config.redis_url == "redis://localhost:6379/0"
        assert config.key_prefix == "per_exam:"
        assert config.default_ttl == 3600
        assert config.compression_enabled is True
        assert config.compression_threshold == 1024
    
    def test_custom_config(self):
        """Test custom configuration values."""
        config = CacheConfig(
            redis_url="redis://custom:6380/1",
            key_prefix="custom:",
            default_ttl=7200,
            compression_enabled=False
        )
        
        assert config.redis_url == "redis://custom:6380/1"
        assert config.key_prefix == "custom:"
        assert config.default_ttl == 7200
        assert config.compression_enabled is False

@pytest.mark.unit
class TestRedisCache:
    """Test Redis cache operations."""
    
    @pytest.fixture
    def cache_config(self):
        """Create test cache configuration."""
        return CacheConfig(
            redis_url="redis://localhost:6379/15",  # Test DB
            key_prefix="test:",
            default_ttl=300
        )
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        redis_mock = AsyncMock()
        redis_mock.ping = AsyncMock(return_value=True)
        redis_mock.get = AsyncMock(return_value=None)
        redis_mock.setex = AsyncMock(return_value=True)
        redis_mock.delete = AsyncMock(return_value=1)
        redis_mock.keys = AsyncMock(return_value=[])
        redis_mock.exists = AsyncMock(return_value=False)
        redis_mock.ttl = AsyncMock(return_value=-1)
        redis_mock.expire = AsyncMock(return_value=True)
        redis_mock.incrby = AsyncMock(return_value=1)
        redis_mock.info = AsyncMock(return_value={
            'redis_version': '6.2.0',
            'used_memory_human': '1M',
            'connected_clients': 1
        })
        return redis_mock
    
    def test_make_key(self, cache_config):
        """Test cache key generation."""
        cache = RedisCache(cache_config)
        
        key = cache._make_key("test_key")
        assert key == "test:test_key"
    
    def test_serialize_json_data(self, cache_config):
        """Test serialization of JSON-compatible data."""
        cache = RedisCache(cache_config)
        
        data = {"key": "value", "number": 42, "list": [1, 2, 3]}
        serialized = cache._serialize(data)
        
        assert serialized.startswith(b'RAW:')
        deserialized = cache._deserialize(serialized)
        assert deserialized == data
    
    def test_serialize_with_compression(self, cache_config):
        """Test serialization with compression for large data."""
        cache_config.compression_enabled = True
        cache_config.compression_threshold = 100  # Low threshold for testing
        cache = RedisCache(cache_config)
        
        # Create data larger than threshold
        large_data = {"message": "x" * 200}
        serialized = cache._serialize(large_data)
        
        # Should be compressed if compression saves space
        if serialized.startswith(b'GZIP:'):
            assert len(serialized) < len(json.dumps(large_data).encode())
        
        deserialized = cache._deserialize(serialized)
        assert deserialized == large_data
    
    def test_serialize_complex_objects(self, cache_config):
        """Test serialization of complex Python objects using pickle."""
        cache = RedisCache(cache_config)
        
        from datetime import datetime
        complex_data = {
            "datetime": datetime(2024, 1, 1, 12, 0, 0),
            "set": {1, 2, 3}
        }
        
        serialized = cache._serialize(complex_data)
        deserialized = cache._deserialize(serialized)
        
        # For complex objects, we use pickle, so they should round-trip correctly
        assert isinstance(deserialized, dict)
    
    @pytest.mark.asyncio
    async def test_get_miss(self, cache_config, mock_redis):
        """Test cache miss (key not found)."""
        cache = RedisCache(cache_config)
        cache.redis = mock_redis
        mock_redis.get.return_value = None
        
        result = await cache.get("nonexistent_key")
        
        assert result is None
        assert cache.stats.misses == 1
        assert cache.stats.hits == 0
        mock_redis.get.assert_called_once_with("test:nonexistent_key")
    
    @pytest.mark.asyncio
    async def test_get_hit(self, cache_config, mock_redis):
        """Test cache hit (key found)."""
        cache = RedisCache(cache_config)
        cache.redis = mock_redis
        
        # Mock cached data
        test_data = {"cached": "value"}
        serialized_data = cache._serialize(test_data)
        mock_redis.get.return_value = serialized_data
        
        result = await cache.get("test_key")
        
        assert result == test_data
        assert cache.stats.hits == 1
        assert cache.stats.misses == 0
        mock_redis.get.assert_called_once_with("test:test_key")
    
    @pytest.mark.asyncio
    async def test_set_success(self, cache_config, mock_redis):
        """Test successful cache set operation."""
        cache = RedisCache(cache_config)
        cache.redis = mock_redis
        
        test_data = {"key": "value"}
        success = await cache.set("test_key", test_data, ttl=600)
        
        assert success is True
        assert cache.stats.sets == 1
        mock_redis.setex.assert_called_once()
        
        # Verify the call was made with correct parameters
        call_args = mock_redis.setex.call_args
        assert call_args[0][0] == "test:test_key"  # key
        assert call_args[0][1] == 600  # ttl
        # call_args[0][2] is the serialized data
    
    @pytest.mark.asyncio
    async def test_set_with_default_ttl(self, cache_config, mock_redis):
        """Test cache set with default TTL."""
        cache = RedisCache(cache_config)
        cache.redis = mock_redis
        
        await cache.set("test_key", "value")
        
        call_args = mock_redis.setex.call_args
        assert call_args[0][1] == cache_config.default_ttl
    
    @pytest.mark.asyncio
    async def test_delete_success(self, cache_config, mock_redis):
        """Test successful cache delete operation."""
        cache = RedisCache(cache_config)
        cache.redis = mock_redis
        mock_redis.delete.return_value = 1  # 1 key deleted
        
        result = await cache.delete("test_key")
        
        assert result is True
        assert cache.stats.deletes == 1
        mock_redis.delete.assert_called_once_with("test:test_key")
    
    @pytest.mark.asyncio
    async def test_delete_not_found(self, cache_config, mock_redis):
        """Test cache delete when key doesn't exist."""
        cache = RedisCache(cache_config)
        cache.redis = mock_redis
        mock_redis.delete.return_value = 0  # 0 keys deleted
        
        result = await cache.delete("nonexistent_key")
        
        assert result is False
        assert cache.stats.deletes == 1
    
    @pytest.mark.asyncio
    async def test_delete_pattern(self, cache_config, mock_redis):
        """Test deleting multiple keys by pattern."""
        cache = RedisCache(cache_config)
        cache.redis = mock_redis
        
        # Mock keys matching pattern
        mock_redis.keys.return_value = ["test:key1", "test:key2", "test:key3"]
        mock_redis.delete.return_value = 3
        
        count = await cache.delete_pattern("key*")
        
        assert count == 3
        assert cache.stats.deletes == 3
        mock_redis.keys.assert_called_once_with("test:key*")
        mock_redis.delete.assert_called_once_with("test:key1", "test:key2", "test:key3")
    
    @pytest.mark.asyncio
    async def test_exists(self, cache_config, mock_redis):
        """Test checking if key exists."""
        cache = RedisCache(cache_config)
        cache.redis = mock_redis
        mock_redis.exists.return_value = 1
        
        exists = await cache.exists("test_key")
        
        assert exists is True
        mock_redis.exists.assert_called_once_with("test:test_key")
    
    @pytest.mark.asyncio
    async def test_get_ttl(self, cache_config, mock_redis):
        """Test getting TTL for a key."""
        cache = RedisCache(cache_config)
        cache.redis = mock_redis
        mock_redis.ttl.return_value = 300  # 5 minutes remaining
        
        ttl = await cache.get_ttl("test_key")
        
        assert ttl == 300
        mock_redis.ttl.assert_called_once_with("test:test_key")
    
    @pytest.mark.asyncio
    async def test_extend_ttl(self, cache_config, mock_redis):
        """Test extending TTL for a key."""
        cache = RedisCache(cache_config)
        cache.redis = mock_redis
        mock_redis.expire.return_value = True
        
        result = await cache.extend_ttl("test_key", 600)
        
        assert result is True
        mock_redis.expire.assert_called_once_with("test:test_key", 600)
    
    @pytest.mark.asyncio
    async def test_increment(self, cache_config, mock_redis):
        """Test incrementing a numeric value."""
        cache = RedisCache(cache_config)
        cache.redis = mock_redis
        mock_redis.incrby.return_value = 5
        
        result = await cache.increment("counter", 3)
        
        assert result == 5
        mock_redis.incrby.assert_called_once_with("test:counter", 3)
    
    @pytest.mark.asyncio
    async def test_error_handling(self, cache_config, mock_redis):
        """Test error handling in cache operations."""
        cache = RedisCache(cache_config)
        cache.redis = mock_redis
        
        # Mock Redis error
        mock_redis.get.side_effect = Exception("Redis connection error")
        
        result = await cache.get("test_key")
        
        assert result is None  # Should return None on error
        assert cache.stats.errors == 1
    
    async def test_get_stats(self, cache_config):
        """Test getting cache statistics."""
        cache = RedisCache(cache_config)
        
        # Simulate some operations
        cache.stats.hits = 10
        cache.stats.misses = 3
        cache.stats.sets = 5
        
        stats = await cache.get_stats()
        
        assert stats.hits == 10
        assert stats.misses == 3
        assert stats.sets == 5
        assert stats.hit_rate == 10 / 13  # 10 hits out of 13 total requests
    
    async def test_clear_stats(self, cache_config):
        """Test clearing cache statistics."""
        cache = RedisCache(cache_config)
        
        # Set some stats
        cache.stats.hits = 10
        cache.stats.misses = 5
        
        await cache.clear_stats()
        
        assert cache.stats.hits == 0
        assert cache.stats.misses == 0
        assert cache.stats.hit_rate == 0.0
    
    @pytest.mark.asyncio
    async def test_info(self, cache_config, mock_redis):
        """Test getting Redis info."""
        cache = RedisCache(cache_config)
        cache.redis = mock_redis
        
        info = await cache.info()
        
        assert "redis_version" in info
        assert "used_memory_human" in info
        assert "our_stats" in info
        mock_redis.info.assert_called_once()

@pytest.mark.unit
class TestCacheManager:
    """Test cache manager functionality."""
    
    @pytest.fixture
    def cache_config(self):
        """Create test cache configuration."""
        return CacheConfig(
            redis_url="redis://localhost:6379/15",
            key_prefix="test_manager:",
            default_ttl=600
        )
    
    def test_cache_manager_initialization(self, cache_config):
        """Test cache manager creates different cache instances."""
        manager = CacheManager(cache_config)
        
        assert manager.questions is not None
        assert manager.explanations is not None
        assert manager.search is not None
        assert manager.stats is not None
        assert manager.sessions is not None
        
        # Verify different prefixes and TTLs
        assert manager.questions.config.key_prefix == "test_manager:questions:"
        assert manager.explanations.config.key_prefix == "test_manager:explanations:"
        assert manager.explanations.config.default_ttl == 86400  # 24 hours
        assert manager.search.config.default_ttl == 1800  # 30 minutes
    
    @pytest.mark.asyncio
    @patch('src.cache.redis_cache.redis.from_url')
    async def test_connect_all(self, mock_redis_from_url, cache_config):
        """Test connecting all cache instances."""
        mock_redis_from_url.return_value = AsyncMock()
        mock_redis_from_url.return_value.ping = AsyncMock(return_value=True)
        
        manager = CacheManager(cache_config)
        await manager.connect_all()
        
        # Verify all caches have Redis connections
        assert manager.questions.redis is not None
        assert manager.explanations.redis is not None
        assert manager.search.redis is not None
        assert manager.stats.redis is not None
        assert manager.sessions.redis is not None
    
    @pytest.mark.asyncio
    async def test_get_combined_stats(self, cache_config):
        """Test getting combined statistics from all caches."""
        manager = CacheManager(cache_config)
        
        # Mock individual cache stats
        for cache_name in ['questions', 'explanations', 'search', 'stats', 'sessions']:
            cache_instance = getattr(manager, cache_name)
            cache_instance.get_stats = AsyncMock(return_value=MagicMock(
                hits=10, misses=5, sets=8, deletes=2, errors=0
            ))
        
        combined_stats = await manager.get_combined_stats()
        
        assert "questions" in combined_stats
        assert "explanations" in combined_stats
        assert "search" in combined_stats
        assert "stats" in combined_stats
        assert "sessions" in combined_stats

@pytest.mark.unit
class TestCachingDecorator:
    """Test caching decorator functionality."""
    
    @pytest.mark.asyncio
    async def test_cached_decorator(self):
        """Test the @cached decorator."""
        from src.cache.redis_cache import cached
        
        # Mock cache
        mock_cache = AsyncMock()
        mock_cache.get = AsyncMock(return_value=None)  # Cache miss
        mock_cache.set = AsyncMock(return_value=True)
        
        @cached(cache=mock_cache, key_prefix="test", ttl=300)
        async def expensive_function(x, y):
            return x + y
        
        # First call - should execute function and cache result
        result1 = await expensive_function(1, 2)
        assert result1 == 3
        
        mock_cache.get.assert_called_once()
        mock_cache.set.assert_called_once()
        
        # Reset mocks and simulate cache hit
        mock_cache.reset_mock()
        mock_cache.get.return_value = 3  # Cache hit
        
        # Second call - should return cached result
        result2 = await expensive_function(1, 2)
        assert result2 == 3
        
        mock_cache.get.assert_called_once()
        mock_cache.set.assert_not_called()  # Should not set again
    
    @pytest.mark.asyncio
    async def test_cached_decorator_with_custom_key_generator(self):
        """Test cached decorator with custom key generator."""
        from src.cache.redis_cache import cached
        
        mock_cache = AsyncMock()
        mock_cache.get = AsyncMock(return_value=None)
        mock_cache.set = AsyncMock(return_value=True)
        
        def custom_key_gen(user_id, category):
            return f"user_{user_id}_cat_{category}"
        
        @cached(cache=mock_cache, key_prefix="custom", key_generator=custom_key_gen)
        async def get_user_questions(user_id, category):
            return f"questions for {user_id} in {category}"
        
        await get_user_questions("123", "navigation")
        
        # Verify cache key was generated correctly
        mock_cache.get.assert_called_once()
        cache_key = mock_cache.get.call_args[0][0]
        assert cache_key == "custom:user_123_cat_navigation"

@pytest.mark.integration
class TestRealRedisCache:
    """Integration tests with real Redis (requires Redis server)."""
    
    @pytest.fixture
    async def real_cache(self, cache_manager):
        """Use real cache from conftest fixture."""
        return cache_manager.questions
    
    @pytest.mark.asyncio
    async def test_real_cache_operations(self, real_cache):
        """Test operations with real Redis instance."""
        test_key = "integration_test_key"
        test_data = {"message": "Hello from Redis!", "number": 42}
        
        # Clean up any existing key
        await real_cache.delete(test_key)
        
        # Test set and get
        success = await real_cache.set(test_key, test_data, ttl=60)
        assert success is True
        
        retrieved_data = await real_cache.get(test_key)
        assert retrieved_data == test_data
        
        # Test exists
        exists = await real_cache.exists(test_key)
        assert exists is True
        
        # Test TTL
        ttl = await real_cache.get_ttl(test_key)
        assert 0 < ttl <= 60
        
        # Test delete
        deleted = await real_cache.delete(test_key)
        assert deleted is True
        
        # Verify deletion
        retrieved_after_delete = await real_cache.get(test_key)
        assert retrieved_after_delete is None
    
    @pytest.mark.asyncio
    async def test_real_cache_large_data_compression(self, real_cache):
        """Test compression with large data in real Redis."""
        test_key = "large_data_test"
        
        # Create large data that should trigger compression
        large_data = {
            "description": "x" * 2000,  # Larger than compression threshold
            "items": list(range(100)),
            "metadata": {"large": True}
        }
        
        # Store and retrieve
        await real_cache.set(test_key, large_data, ttl=60)
        retrieved = await real_cache.get(test_key)
        
        assert retrieved == large_data
        
        # Cleanup
        await real_cache.delete(test_key)