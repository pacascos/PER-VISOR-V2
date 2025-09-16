#!/usr/bin/env python3
"""
Statistics and Gamification API endpoints for PER Exam System
Extends the main API with comprehensive statistics, achievements, and progress tracking
"""

import json
import os
import logging
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from functools import wraps
import jwt

# Create blueprint for statistics routes
statistics_bp = Blueprint('statistics', __name__, url_prefix='/api/statistics')

# Configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'your-jwt-secret-change-in-production')

def token_required(f):
    """Decorator to require JWT token for protected routes"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Check for token in header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Token format invalid'}), 401

        if not token:
            return jsonify({'error': 'Token missing'}), 401

        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            current_user_id = data['user_id']
            kwargs['current_user_id'] = current_user_id
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token invalid'}), 401

        return f(*args, **kwargs)

    return decorated

def get_db_connection():
    """Get database connection using environment variables"""
    DATABASE_URL = os.getenv('DATABASE_URL')
    if DATABASE_URL:
        # Parse DATABASE_URL postgresql://user:password@host:port/database
        import re
        match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', DATABASE_URL)
        if match:
            config = {
                'host': match.group(3),
                'port': int(match.group(4)),
                'database': match.group(5),
                'user': match.group(1),
                'password': match.group(2)
            }
        else:
            raise ValueError("Invalid DATABASE_URL format")
    else:
        config = {
            'host': os.getenv('DATABASE_HOST', 'localhost'),
            'port': int(os.getenv('DATABASE_PORT', 5432)),
            'database': os.getenv('DATABASE_NAME', 'per_exams'),
            'user': os.getenv('DATABASE_USER', 'per_user'),
            'password': os.getenv('DATABASE_PASSWORD', 'per_password_change_me')
        }

    try:
        return psycopg2.connect(**config)
    except Exception as e:
        logging.error(f"Database connection failed: {e}")
        return None

# Statistics Routes

@statistics_bp.route('/user/<user_id>', methods=['GET'])
@token_required
def get_user_statistics(user_id, current_user_id):
    """Get comprehensive user statistics"""

    # Verify user can access this data
    if user_id != current_user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Get user basic stats
        cur.execute("""
            SELECT
                u.username,
                u.email,
                us.level,
                us.total_xp,
                us.exams_completed,
                us.total_questions_answered,
                us.correct_answers,
                us.study_time_minutes,
                us.daily_streak_count,
                us.longest_streak,
                us.created_at,
                us.last_exam_date,
                ROUND((us.correct_answers::float / NULLIF(us.total_questions_answered, 0)) * 100, 2) as overall_percentage
            FROM users u
            LEFT JOIN user_statistics us ON u.id = us.user_id
            WHERE u.id = %s
        """, (user_id,))

        user_stats = cur.fetchone()

        if not user_stats:
            return jsonify({'error': 'User not found'}), 404

        # Calculate XP to next level
        current_level = user_stats['level'] or 1
        xp_for_next_level = (current_level * 500) + (current_level - 1) * 100
        current_xp = user_stats['total_xp'] or 0
        xp_to_next = max(0, xp_for_next_level - current_xp)

        # Get topic-wise performance
        cur.execute("""
            SELECT
                category,
                SUM(correct_answers) as correct,
                SUM(total_questions) as total,
                ROUND(AVG(percentage), 2) as avg_percentage,
                COUNT(*) as exam_count
            FROM exam_topic_performance etp
            JOIN exams e ON etp.exam_id = e.id
            WHERE e.user_id = %s
            GROUP BY category
            ORDER BY category
        """, (user_id,))

        topic_performance = cur.fetchall()

        # Get recent exam history
        cur.execute("""
            SELECT
                score,
                time_taken_minutes,
                completed_at,
                question_count
            FROM exams
            WHERE user_id = %s AND status = 'completed'
            ORDER BY completed_at DESC
            LIMIT 10
        """, (user_id,))

        recent_exams = cur.fetchall()

        # Get weak and strong topics
        weak_topics = [t['category'] for t in topic_performance if t['avg_percentage'] < 70]
        strong_topics = [t['category'] for t in topic_performance if t['avg_percentage'] >= 85]

        cur.close()
        conn.close()

        return jsonify({
            'user_info': {
                'username': user_stats['username'],
                'email': user_stats['email'],
                'member_since': user_stats['created_at'].isoformat() if user_stats['created_at'] else None
            },
            'level_info': {
                'level': current_level,
                'xp': current_xp,
                'xp_to_next': xp_to_next,
                'xp_for_next_level': xp_for_next_level
            },
            'performance': {
                'overall_score': user_stats['overall_percentage'] or 0,
                'exams_completed': user_stats['exams_completed'] or 0,
                'total_questions': user_stats['total_questions_answered'] or 0,
                'correct_answers': user_stats['correct_answers'] or 0,
                'study_time_hours': round((user_stats['study_time_minutes'] or 0) / 60, 1),
                'daily_streak': user_stats['daily_streak_count'] or 0,
                'longest_streak': user_stats['longest_streak'] or 0,
                'last_exam_date': user_stats['last_exam_date'].isoformat() if user_stats['last_exam_date'] else None
            },
            'topic_performance': [dict(row) for row in topic_performance],
            'recent_exams': [dict(row) for row in recent_exams],
            'insights': {
                'weak_topics': weak_topics,
                'strong_topics': strong_topics,
                'needs_practice': len(weak_topics) > 0,
                'exam_frequency': calculate_exam_frequency(recent_exams)
            }
        })

    except Exception as e:
        logging.error(f"Error getting user statistics: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@statistics_bp.route('/achievements/<user_id>', methods=['GET'])
@token_required
def get_user_achievements(user_id, current_user_id):
    """Get user achievements and progress"""

    if user_id != current_user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Get unlocked achievements
        cur.execute("""
            SELECT
                achievement_id,
                unlocked_at,
                xp_earned
            FROM user_achievements
            WHERE user_id = %s
            ORDER BY unlocked_at DESC
        """, (user_id,))

        unlocked_achievements = cur.fetchall()

        # Get achievement progress for locked achievements
        cur.execute("""
            SELECT
                achievement_id,
                progress_data
            FROM achievement_progress
            WHERE user_id = %s
        """, (user_id,))

        achievement_progress = cur.fetchall()

        cur.close()
        conn.close()

        return jsonify({
            'unlocked': [dict(row) for row in unlocked_achievements],
            'progress': [dict(row) for row in achievement_progress],
            'total_achievements': len(ACHIEVEMENT_DEFINITIONS),
            'unlocked_count': len(unlocked_achievements),
            'completion_rate': round((len(unlocked_achievements) / len(ACHIEVEMENT_DEFINITIONS)) * 100, 1)
        })

    except Exception as e:
        logging.error(f"Error getting achievements: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@statistics_bp.route('/exam-completed', methods=['POST'])
@token_required
def record_exam_completion(current_user_id):
    """Record exam completion and update statistics"""

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    required_fields = ['score', 'time_minutes', 'topic_results']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Create exam record
        cur.execute("""
            INSERT INTO exams (user_id, score, time_taken_minutes, question_count, status, completed_at)
            VALUES (%s, %s, %s, %s, 'completed', %s)
            RETURNING id
        """, (current_user_id, data['score'], data['time_minutes'],
              len(data['topic_results']), datetime.now()))

        exam_id = cur.fetchone()['id']

        # Record topic performance
        for topic, results in data['topic_results'].items():
            cur.execute("""
                INSERT INTO exam_topic_performance
                (exam_id, category, correct_answers, total_questions, percentage)
                VALUES (%s, %s, %s, %s, %s)
            """, (exam_id, topic, results['correct'], results['total'],
                  (results['correct'] / results['total']) * 100 if results['total'] > 0 else 0))

        # Update user statistics
        total_correct = sum(r['correct'] for r in data['topic_results'].values())
        total_questions = sum(r['total'] for r in data['topic_results'].values())

        cur.execute("""
            INSERT INTO user_statistics (
                user_id, exams_completed, total_questions_answered,
                correct_answers, study_time_minutes, last_exam_date
            )
            VALUES (%s, 1, %s, %s, %s, %s)
            ON CONFLICT (user_id)
            DO UPDATE SET
                exams_completed = user_statistics.exams_completed + 1,
                total_questions_answered = user_statistics.total_questions_answered + %s,
                correct_answers = user_statistics.correct_answers + %s,
                study_time_minutes = user_statistics.study_time_minutes + %s,
                last_exam_date = %s
        """, (current_user_id, total_questions, total_correct, data['time_minutes'], datetime.now(),
              total_questions, total_correct, data['time_minutes'], datetime.now()))

        # Update daily streak
        update_daily_streak(cur, current_user_id)

        # Check and award achievements
        new_achievements = check_and_award_achievements(cur, current_user_id, data)

        # Calculate XP earned
        base_xp = data['score'] * 2  # 2 XP per percentage point
        bonus_xp = sum(a['xp'] for a in new_achievements)
        total_xp = base_xp + bonus_xp

        # Update user XP and level
        update_user_xp_and_level(cur, current_user_id, total_xp)

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'exam_id': exam_id,
            'xp_earned': total_xp,
            'new_achievements': new_achievements,
            'message': f'¡Examen completado! Ganaste {total_xp} XP'
        })

    except Exception as e:
        logging.error(f"Error recording exam completion: {e}")
        conn.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@statistics_bp.route('/progress/<user_id>', methods=['GET'])
@token_required
def get_user_progress(user_id, current_user_id):
    """Get detailed user progress across all topics"""

    if user_id != current_user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Get progress over time
        cur.execute("""
            SELECT
                DATE(completed_at) as exam_date,
                AVG(score) as avg_score,
                COUNT(*) as exam_count
            FROM exams
            WHERE user_id = %s AND status = 'completed'
            GROUP BY DATE(completed_at)
            ORDER BY exam_date ASC
        """, (user_id,))

        daily_progress = cur.fetchall()

        # Get topic trends
        cur.execute("""
            WITH ranked_exams AS (
                SELECT
                    e.id,
                    e.completed_at,
                    etp.category,
                    etp.percentage,
                    ROW_NUMBER() OVER (PARTITION BY etp.category ORDER BY e.completed_at DESC) as rn
                FROM exams e
                JOIN exam_topic_performance etp ON e.id = etp.exam_id
                WHERE e.user_id = %s AND e.status = 'completed'
            )
            SELECT
                category,
                percentage as latest_percentage,
                LAG(percentage, 1) OVER (PARTITION BY category ORDER BY completed_at) as previous_percentage
            FROM ranked_exams
            WHERE rn <= 2
            ORDER BY category, completed_at DESC
        """, (user_id,))

        topic_trends = cur.fetchall()

        cur.close()
        conn.close()

        # Process topic trends
        topic_progress = {}
        for row in topic_trends:
            category = row['category']
            if category not in topic_progress:
                topic_progress[category] = {
                    'current': row['latest_percentage'],
                    'trend': 'stable'
                }

            if row['previous_percentage']:
                if row['latest_percentage'] > row['previous_percentage'] + 5:
                    topic_progress[category]['trend'] = 'up'
                elif row['latest_percentage'] < row['previous_percentage'] - 5:
                    topic_progress[category]['trend'] = 'down'

        return jsonify({
            'daily_progress': [dict(row) for row in daily_progress],
            'topic_progress': topic_progress,
            'progress_summary': {
                'total_study_days': len(daily_progress),
                'avg_daily_score': round(sum(row['avg_score'] for row in daily_progress) / len(daily_progress), 2) if daily_progress else 0,
                'improving_topics': len([t for t in topic_progress.values() if t['trend'] == 'up']),
                'declining_topics': len([t for t in topic_progress.values() if t['trend'] == 'down'])
            }
        })

    except Exception as e:
        logging.error(f"Error getting user progress: {e}")
        return jsonify({'error': 'Internal server error'}), 500

# Helper Functions

def calculate_exam_frequency(recent_exams):
    """Calculate how frequently user takes exams"""
    if len(recent_exams) < 2:
        return 'insufficient_data'

    # Calculate average days between exams
    dates = [exam['completed_at'] for exam in recent_exams]
    date_diffs = []

    for i in range(1, len(dates)):
        diff = (dates[i-1] - dates[i]).days
        date_diffs.append(abs(diff))

    avg_days = sum(date_diffs) / len(date_diffs)

    if avg_days <= 2:
        return 'very_frequent'
    elif avg_days <= 5:
        return 'frequent'
    elif avg_days <= 10:
        return 'moderate'
    else:
        return 'infrequent'

def update_daily_streak(cur, user_id):
    """Update user's daily study streak"""

    # Get current streak info
    cur.execute("""
        SELECT daily_streak_count, last_study_date
        FROM user_statistics
        WHERE user_id = %s
    """, (user_id,))

    result = cur.fetchone()
    if not result:
        return

    current_streak = result['daily_streak_count'] or 0
    last_study_date = result['last_study_date']
    today = datetime.now().date()

    if last_study_date:
        days_since_study = (today - last_study_date).days

        if days_since_study == 1:
            # Consecutive day - increment streak
            new_streak = current_streak + 1
        elif days_since_study == 0:
            # Same day - keep current streak
            new_streak = current_streak
        else:
            # Gap in studying - reset streak
            new_streak = 1
    else:
        # First study session
        new_streak = 1

    # Update streak and longest streak
    cur.execute("""
        UPDATE user_statistics
        SET
            daily_streak_count = %s,
            longest_streak = GREATEST(longest_streak, %s),
            last_study_date = %s
        WHERE user_id = %s
    """, (new_streak, new_streak, today, user_id))

def check_and_award_achievements(cur, user_id, exam_data):
    """Check and award achievements based on exam performance"""

    new_achievements = []

    # Get current user stats for achievement checking
    cur.execute("""
        SELECT * FROM user_statistics WHERE user_id = %s
    """, (user_id,))

    user_stats = cur.fetchone()
    if not user_stats:
        return new_achievements

    # Check various achievement conditions
    achievements_to_check = [
        ('first_exam', user_stats['exams_completed'] == 1),
        ('exam_master', user_stats['exams_completed'] >= 10),
        ('perfectionist', exam_data['score'] == 100),
        ('week_streak', user_stats['daily_streak_count'] >= 7),
        ('month_streak', user_stats['daily_streak_count'] >= 30),
        ('speed_demon', exam_data['time_minutes'] <= 30),
        ('night_owl', datetime.now().hour >= 0 and datetime.now().hour <= 6)
    ]

    for achievement_id, condition in achievements_to_check:
        if condition:
            # Check if already unlocked
            cur.execute("""
                SELECT id FROM user_achievements
                WHERE user_id = %s AND achievement_id = %s
            """, (user_id, achievement_id))

            if not cur.fetchone():
                # Award achievement
                achievement_def = ACHIEVEMENT_DEFINITIONS.get(achievement_id, {})
                xp_reward = achievement_def.get('xp', 100)

                cur.execute("""
                    INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, xp_earned)
                    VALUES (%s, %s, %s, %s)
                """, (user_id, achievement_id, datetime.now(), xp_reward))

                new_achievements.append({
                    'id': achievement_id,
                    'title': achievement_def.get('title', 'Achievement'),
                    'xp': xp_reward
                })

    return new_achievements

def update_user_xp_and_level(cur, user_id, xp_gained):
    """Update user XP and calculate new level"""

    cur.execute("""
        UPDATE user_statistics
        SET total_xp = total_xp + %s
        WHERE user_id = %s
        RETURNING total_xp
    """, (xp_gained, user_id))

    result = cur.fetchone()
    if result:
        total_xp = result['total_xp']

        # Calculate new level (500 XP for level 1, then +100 XP per level)
        new_level = 1
        xp_needed = 500

        while total_xp >= xp_needed:
            total_xp -= xp_needed
            new_level += 1
            xp_needed = 500 + (new_level - 1) * 100

        # Update level
        cur.execute("""
            UPDATE user_statistics
            SET level = %s
            WHERE user_id = %s
        """, (new_level, user_id))

# Achievement definitions
ACHIEVEMENT_DEFINITIONS = {
    'first_exam': {
        'title': 'Primer Paso',
        'description': 'Completa tu primer examen',
        'xp': 50,
        'icon': 'fas fa-baby'
    },
    'exam_master': {
        'title': 'Maestro de Exámenes',
        'description': 'Completa 10 exámenes',
        'xp': 500,
        'icon': 'fas fa-graduation-cap'
    },
    'perfectionist': {
        'title': 'Perfeccionista',
        'description': 'Obtén 100% en un examen',
        'xp': 200,
        'icon': 'fas fa-star'
    },
    'week_streak': {
        'title': 'Semana Constante',
        'description': 'Estudia 7 días seguidos',
        'xp': 150,
        'icon': 'fas fa-fire'
    },
    'month_streak': {
        'title': 'Mes Dedicado',
        'description': 'Estudia 30 días seguidos',
        'xp': 1000,
        'icon': 'fas fa-calendar-check'
    },
    'navigation_expert': {
        'title': 'Experto en Navegación',
        'description': 'Domina UT3 con 90% de acierto',
        'xp': 300,
        'icon': 'fas fa-compass'
    },
    'weather_master': {
        'title': 'Maestro del Tiempo',
        'description': 'Domina UT7 con 90% de acierto',
        'xp': 300,
        'icon': 'fas fa-cloud-sun'
    },
    'night_owl': {
        'title': 'Búho Nocturno',
        'description': 'Completa un examen después de medianoche',
        'xp': 100,
        'icon': 'fas fa-moon'
    },
    'speed_demon': {
        'title': 'Demonio de la Velocidad',
        'description': 'Completa un examen en menos de 30 minutos',
        'xp': 150,
        'icon': 'fas fa-tachometer-alt'
    }
}

def register_statistics_routes(app):
    """Register statistics routes with the main Flask app"""
    app.register_blueprint(statistics_bp)
    logging.info("✅ Statistics API routes registered")