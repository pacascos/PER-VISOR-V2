#!/bin/bash

# Script to apply the statistics schema to the PER database
# This script safely applies the gamification and statistics schema

echo "🚢 PER Sistema - Aplicando Schema de Estadísticas"
echo "================================================="

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: PostgreSQL client (psql) not found"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Configuration from environment or defaults
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5432}
DB_NAME=${DATABASE_NAME:-per_exams}
DB_USER=${DATABASE_USER:-per_user}

# Check if DATABASE_URL is available (Docker environment)
if [ ! -z "$DATABASE_URL" ]; then
    echo "🔍 Using DATABASE_URL for connection"
    CONNECTION_STRING="$DATABASE_URL"
else
    echo "🔍 Using individual environment variables"
    echo "   Host: $DB_HOST"
    echo "   Port: $DB_PORT"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"

    # Prompt for password if not set
    if [ -z "$DATABASE_PASSWORD" ]; then
        echo -n "Enter database password for user $DB_USER: "
        read -s DATABASE_PASSWORD
        echo
    fi

    CONNECTION_STRING="postgresql://$DB_USER:$DATABASE_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
fi

# Test database connection
echo "🔍 Testing database connection..."
if [ ! -z "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1
else
    PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1
fi

if [ $? -ne 0 ]; then
    echo "❌ Error: Could not connect to database"
    echo "Please check your connection settings and try again"
    exit 1
fi

echo "✅ Database connection successful"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
SCHEMA_FILE="$SCRIPT_DIR/statistics_schema.sql"

# Check if schema file exists
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "❌ Error: Schema file not found: $SCHEMA_FILE"
    exit 1
fi

echo "📁 Schema file: $SCHEMA_FILE"

# Show what will be applied
echo ""
echo "📊 This will create the following tables and features:"
echo "   • user_statistics - User levels, XP, and overall performance"
echo "   • exams - Individual exam records with detailed results"
echo "   • exam_topic_performance - Performance by topic (UT) per exam"
echo "   • question_attempts - Detailed question-by-question tracking"
echo "   • user_achievements - Gamification achievements system"
echo "   • achievement_progress - Progress toward locked achievements"
echo "   • study_sessions - Study session tracking"
echo "   • user_weak_topics - AI-powered weak area analysis"
echo "   • user_preferences - Personalized user preferences"
echo ""
echo "🎯 Features enabled:"
echo "   • Gamification with levels and XP"
echo "   • Achievement system with 20+ badges"
echo "   • Progress tracking and analytics"
echo "   • Weak topic identification"
echo "   • Study recommendations"
echo ""

# Confirm before applying
echo -n "Do you want to apply this schema? (y/N): "
read -r CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "❌ Schema application cancelled"
    exit 0
fi

echo ""
echo "🚀 Applying statistics schema..."

# Create backup first
BACKUP_FILE="backup_before_statistics_$(date +%Y%m%d_%H%M%S).sql"
echo "💾 Creating backup: $BACKUP_FILE"

if [ ! -z "$DATABASE_URL" ]; then
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
else
    PGPASSWORD="$DATABASE_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully"
else
    echo "❌ Warning: Backup creation failed, continuing anyway..."
fi

# Apply the schema
echo "📝 Applying schema changes..."

if [ ! -z "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -f "$SCHEMA_FILE"
else
    PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE"
fi

SCHEMA_RESULT=$?

if [ $SCHEMA_RESULT -eq 0 ]; then
    echo ""
    echo "✅ Statistics schema applied successfully!"
    echo ""
    echo "🎉 Gamification system is now active!"
    echo ""
    echo "📊 Next steps:"
    echo "   1. Restart your Flask API server"
    echo "   2. Complete a test exam to generate statistics"
    echo "   3. Visit the statistics dashboard to see your progress"
    echo ""
    echo "🔗 URLs to test:"
    echo "   • Exam System: http://localhost:8095/exam-system.html"
    echo "   • Statistics Dashboard: http://localhost:8095/statistics-dashboard.html"
    echo "   • API Health: http://localhost:5001/health"
    echo ""
    echo "📈 The system will now track:"
    echo "   • User levels and XP progression"
    echo "   • Detailed performance analytics"
    echo "   • Achievement unlocking"
    echo "   • Study recommendations"
    echo "   • Progress trends and insights"
    echo ""
    echo "🎯 Happy studying! 🚢"
else
    echo ""
    echo "❌ Error applying schema (exit code: $SCHEMA_RESULT)"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   • Check the error messages above"
    echo "   • Verify database permissions"
    echo "   • Ensure PostgreSQL version compatibility"
    echo "   • Check if tables already exist"
    echo ""
    echo "📞 If you need help, check the logs above for specific error messages"

    if [ -f "$BACKUP_FILE" ]; then
        echo ""
        echo "💾 Your backup is available at: $BACKUP_FILE"
        echo "   You can restore it with:"
        echo "   psql [connection] < $BACKUP_FILE"
    fi

    exit 1
fi

# Clean up backup file if requested
echo ""
echo -n "Keep the backup file $BACKUP_FILE? (Y/n): "
read -r KEEP_BACKUP

if [[ $KEEP_BACKUP =~ ^[Nn]$ ]]; then
    rm -f "$BACKUP_FILE"
    echo "🗑️ Backup file deleted"
else
    echo "💾 Backup kept at: $BACKUP_FILE"
fi

echo ""
echo "🏁 Schema application complete!"