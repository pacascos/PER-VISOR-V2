# PER Maritime Exam System - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 7+
- Python 3.11+

### 1. Clone and Setup
```bash
git clone <repository-url>
cd PER_Cloude
cp .env.example .env
# Edit .env with your configuration
```

### 2. Docker Deployment (Recommended)
```bash
# Build and start all services
docker-compose up --build -d

# Initialize database
docker-compose exec api python src/database/migrate_json_to_db.py

# Check status
docker-compose ps
docker-compose logs -f api
```

### 3. Access the Application
- **Web Interface**: http://localhost:8095
- **API Documentation**: http://localhost:5001/docs
- **Health Check**: http://localhost:5001/health

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Nginx (Web)   │    │  FastAPI (API)   │    │ PostgreSQL (DB) │
│   Port: 8095    │────│   Port: 5001     │────│   Port: 5432    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                       ┌──────────────────┐
                       │   Redis (Cache)  │
                       │   Port: 6379     │
                       └──────────────────┘
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Database
DATABASE_URL=postgresql://per_user:password@postgres:5432/per_exams

# Redis
REDIS_URL=redis://redis:6379/0

# OpenAI API
OPENAI_API_KEY=sk-your-key-here

# Authentication
JWT_SECRET=your-super-secret-key-here

# Performance
API_WORKERS=4
REDIS_MAX_MEMORY=256mb
```

## 📊 Performance Optimizations Implemented

### Database Layer
- **PostgreSQL with connection pooling** (5-20 connections)
- **Full-text search** with Spanish language support
- **Materialized views** for complex queries
- **Composite indexes** on frequently queried columns
- **Async operations** throughout

### Caching Strategy
- **Redis multi-tier caching**:
  - Questions: 2h TTL
  - Explanations: 24h TTL
  - Search results: 30min TTL
- **Compression** for large cached objects
- **Cache statistics** and monitoring

### API Performance
- **FastAPI with async/await** patterns
- **Connection pooling** for database and Redis
- **Request/response compression** (gzip)
- **Rate limiting** (100 req/min per user)
- **Structured logging** with correlation IDs

### Expected Performance Gains
| Operation | Before (JSON) | After (Optimized) | Improvement |
|-----------|---------------|-------------------|-------------|
| Question Search | 2-3s | 50-100ms | **20-60x faster** |
| Load Questions | 5s | 100ms | **50x faster** |
| Generate Explanation | 10-30s | 2s (cached) | **5-15x faster** |
| Startup Time | 8s | 500ms | **16x faster** |

## 🔐 Security Features

### Authentication & Authorization
- **JWT-based authentication** with refresh tokens
- **Role-based access control** (admin/editor/viewer)
- **Permission-based API endpoints**
- **Session management** with Redis

### API Security
- **Rate limiting** per user and IP
- **CORS configuration** for allowed origins
- **Request validation** with Pydantic
- **Security headers** (HSTS, CSP, etc.)

### Infrastructure Security
- **Non-root Docker containers**
- **Secret management** via environment variables
- **Security scanning** in CI/CD pipeline
- **Automated dependency updates**

## 🧪 Testing

### Run Tests
```bash
# Unit tests
pytest tests -m "unit" -v

# Integration tests (requires DB)
pytest tests -m "integration" -v

# Performance tests
pytest tests -m "performance" -v

# Full test suite with coverage
pytest tests --cov=src --cov-report=html
```

### Test Coverage Target: 80%

## 🚀 CI/CD Pipeline

### GitHub Actions Workflows
- **Continuous Integration**: Tests, linting, security scans
- **Security Analysis**: CodeQL, dependency scanning, secret detection
- **Docker Build**: Multi-arch images (amd64, arm64)
- **Automated Deployment**: Staging and production

### Security Scanning
- **Bandit**: Python security issues
- **Safety**: Dependency vulnerabilities
- **GitLeaks**: Secret detection
- **Trivy**: Docker image scanning

## 📈 Monitoring

### Built-in Metrics
- **Health checks** for all services
- **Cache performance** statistics
- **Database connection** monitoring
- **API response times** tracking

### Optional Monitoring Stack
```bash
# Start with monitoring services
docker-compose --profile monitoring up -d

# Access Grafana: http://localhost:3000 (admin/admin)
# Access Prometheus: http://localhost:9090
```

## 🗄️ Database Migration

### From JSON to PostgreSQL
```bash
# 1. Ensure PostgreSQL is running
docker-compose up -d postgres

# 2. Run migration script
docker-compose exec api python src/database/migrate_json_to_db.py \
  --database-url $DATABASE_URL \
  --json-file data/json/data_unificado_con_duplicados.json \
  --batch-size 100

# 3. Verify migration
docker-compose exec api python -c "
from src.database.repository import MasterRepository
import asyncio
import asyncpg

async def check():
    pool = await asyncpg.create_pool('$DATABASE_URL')
    repo = MasterRepository(pool)
    stats = await repo.stats.get_system_stats()
    print(f'Questions: {stats.total_questions}')
    print(f'Exams: {stats.total_exams}')
    await pool.close()

asyncio.run(check())
"
```

## 🔄 Deployment Strategies

### Development
```bash
# Start in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# With hot reload
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 5001
```

### Production
```bash
# Production deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale API instances
docker-compose up -d --scale api=3

# Health check
curl http://localhost:5001/health
```

### Zero-Downtime Updates
```bash
# Rolling update
docker-compose pull
docker-compose up -d --no-deps api
docker-compose exec api python health_check.py
```

## 🛠️ Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U per_user -d per_exams -c "SELECT 1;"
```

#### Redis Connection Failed
```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
```

#### OpenAI API Errors
```bash
# Check API key is set
docker-compose exec api env | grep OPENAI

# Test API connection
docker-compose exec api python -c "
import openai
openai.api_key = '$OPENAI_API_KEY'
print(openai.Model.list())
"
```

#### Memory Issues
```bash
# Check container memory usage
docker stats

# Increase limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G
```

### Logs and Debugging
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api

# Follow logs in real-time
docker-compose logs -f --tail=100 api

# Check container status
docker-compose ps
docker-compose top
```

## 📋 Maintenance

### Regular Tasks

#### Database Backups
```bash
# Manual backup
docker-compose exec postgres pg_dump -U per_user per_exams > backup_$(date +%Y%m%d).sql

# Automated backup (runs daily at 2 AM)
docker-compose --profile backup up -d
```

#### Cache Maintenance
```bash
# Clear all caches
curl -X POST http://localhost:5001/api/v2/cache/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check cache statistics
curl http://localhost:5001/api/v2/cache/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### Log Rotation
```bash
# Docker logs are configured with rotation
# Manual cleanup if needed
docker system prune -f
docker volume prune -f
```

## 🔧 Scaling

### Horizontal Scaling
```bash
# Scale API instances
docker-compose up -d --scale api=5

# Add load balancer
# Update nginx.conf with additional upstream servers
```

### Database Scaling
- **Read Replicas**: Configure PostgreSQL streaming replication
- **Connection Pooling**: Use PgBouncer for connection management
- **Partitioning**: Partition large tables by date/category

### Cache Scaling
- **Redis Cluster**: For high availability
- **Redis Sentinel**: For automatic failover
- **Multi-tier Caching**: Add application-level caching

## 📞 Support

### Health Endpoints
- `GET /health` - Basic health check
- `GET /api/v2/stats` - System statistics
- `GET /api/v2/cache/stats` - Cache performance

### API Documentation
- **Interactive docs**: http://localhost:5001/docs
- **ReDoc**: http://localhost:5001/redoc
- **OpenAPI schema**: http://localhost:5001/openapi.json

### Performance Monitoring
- Monitor response times via `/api/v2/stats`
- Check cache hit rates in cache statistics
- Database query performance in logs

## 🎯 Next Steps

1. **Configure SSL/TLS** for production deployment
2. **Set up monitoring alerts** for critical metrics
3. **Implement backup strategy** with offsite storage
4. **Configure log aggregation** (ELK stack, Grafana Loki)
5. **Add API versioning** for backward compatibility
6. **Implement feature flags** for gradual rollouts

---

**🎉 Your PER maritime exam system is now optimized for high performance, scalability, and production deployment!**