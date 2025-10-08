"""
Study Mode Question Selection Logic
Implements three selection strategies: random, failed-priority, new-priority
"""

import logging
import random
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)

# UT Distribution according to BOE 2025
UT_DISTRIBUTION = {
    1: {'name': 'Nomenclatura', 'questions': 4, 'min_correct': None},
    2: {'name': 'Amarre y Fondeo', 'questions': 2, 'min_correct': None},
    3: {'name': 'Seguridad', 'questions': 4, 'min_correct': None},
    4: {'name': 'Legislación', 'questions': 2, 'min_correct': None},
    5: {'name': 'Balizamiento', 'questions': 5, 'min_correct': 3},
    6: {'name': 'RIPA', 'questions': 10, 'min_correct': 5},
    7: {'name': 'Maniobra', 'questions': 2, 'min_correct': None},
    8: {'name': 'Emergencias', 'questions': 3, 'min_correct': None},
    9: {'name': 'Meteorología', 'questions': 4, 'min_correct': None},
    10: {'name': 'Teoría de navegación', 'questions': 5, 'min_correct': None},
    11: {'name': 'Carta de navegación', 'questions': 4, 'min_correct': 2}
}


def get_ut_category_name(cur, ut_number: int) -> str:
    """Get category name from ut_configuration table"""
    cur.execute("""
        SELECT category_name FROM ut_configuration
        WHERE ut_number = %s
    """, (ut_number,))
    result = cur.fetchone()
    return result['category_name'] if result else f"UT{ut_number}"


def calculate_questions_per_ut(selected_uts: List[int]) -> Dict[int, int]:
    """
    Calculate how many questions to select from each UT based on proportional distribution

    Args:
        selected_uts: List of UT numbers selected by user (e.g., [1, 2, 5, 6])

    Returns:
        Dictionary with UT number as key and number of questions as value
    """
    if not selected_uts:
        return {}

    # If all UTs selected, use official distribution
    if len(selected_uts) == 11:
        return {ut: UT_DISTRIBUTION[ut]['questions'] for ut in selected_uts}

    # For partial selection, distribute proportionally maintaining ~45 questions
    total_official_questions = sum(UT_DISTRIBUTION[ut]['questions'] for ut in selected_uts)

    questions_per_ut = {}
    for ut in selected_uts:
        # Keep proportional distribution
        questions_per_ut[ut] = UT_DISTRIBUTION[ut]['questions']

    return questions_per_ut


def select_questions_random(cur, user_id: str, selected_uts: List[int]) -> Tuple[List[Dict], int]:
    """
    Random selection: Select questions randomly from each UT

    Args:
        cur: Database cursor
        user_id: User UUID
        selected_uts: List of selected UT numbers

    Returns:
        Tuple of (list of selected questions, total count)
    """
    questions_per_ut = calculate_questions_per_ut(selected_uts)
    selected_questions = []

    for ut_number, num_questions in questions_per_ut.items():
        category_name = get_ut_category_name(cur, ut_number)

        logger.info(f"🎲 [RANDOM] UT{ut_number} ({category_name}): Seleccionando {num_questions} preguntas aleatorias")

        # Select random questions from this UT (excluding duplicates by hash)
        # First, randomly pick one question per hash, then randomly select from those
        cur.execute("""
            WITH unique_questions AS (
                SELECT DISTINCT ON (q.hash_pregunta)
                    q.id, q.texto_pregunta, q.categoria, q.respuesta_correcta, q.hash_pregunta
                FROM questions q
                JOIN exams e ON q.exam_id = e.id
                WHERE q.categoria = %s
                AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
                AND q.anulada = false
                ORDER BY q.hash_pregunta, q.id
            )
            SELECT id, texto_pregunta, categoria, respuesta_correcta
            FROM unique_questions
            ORDER BY RANDOM()
            LIMIT %s
        """, (category_name, num_questions))

        ut_questions = cur.fetchall()

        for q in ut_questions:
            selected_questions.append({
                'question_id': str(q['id']),
                'ut_number': ut_number,
                'ut_category': category_name,
                'texto_pregunta': q['texto_pregunta'],
                'selection_reason': 'random'
            })

        logger.info(f"✅ [RANDOM] UT{ut_number}: {len(ut_questions)} preguntas seleccionadas")

    return selected_questions, len(selected_questions)


def select_questions_failed(cur, user_id: str, selected_uts: List[int]) -> Tuple[List[Dict], int]:
    """
    Failed-priority selection: Prioritize questions the user has answered incorrectly
    Falls back to random if not enough failed questions available

    Args:
        cur: Database cursor
        user_id: User UUID
        selected_uts: List of selected UT numbers

    Returns:
        Tuple of (list of selected questions, total count)
    """
    questions_per_ut = calculate_questions_per_ut(selected_uts)
    selected_questions = []

    for ut_number, num_questions in questions_per_ut.items():
        category_name = get_ut_category_name(cur, ut_number)

        logger.info(f"❌ [FAILED] UT{ut_number} ({category_name}): Priorizando {num_questions} preguntas falladas")

        # First, get questions user has answered incorrectly (excluding duplicates by hash)
        cur.execute("""
            WITH failed_by_hash AS (
                SELECT q.hash_pregunta, COUNT(*) as failed_count
                FROM questions q
                JOIN user_answers ua ON q.id = ua.question_id
                JOIN user_exams ue ON ua.user_exam_id = ue.id
                WHERE q.categoria = %s
                AND ue.user_id = %s
                AND ua.is_correct = false
                AND q.anulada = false
                GROUP BY q.hash_pregunta
            ),
            unique_questions AS (
                SELECT DISTINCT ON (q.hash_pregunta)
                    q.id, q.texto_pregunta, q.categoria, q.respuesta_correcta, q.hash_pregunta
                FROM questions q
                WHERE q.categoria = %s
                AND q.anulada = false
                ORDER BY q.hash_pregunta, q.id
            )
            SELECT uq.id, uq.texto_pregunta, uq.categoria, uq.respuesta_correcta, fbh.failed_count
            FROM unique_questions uq
            JOIN failed_by_hash fbh ON uq.hash_pregunta = fbh.hash_pregunta
            ORDER BY fbh.failed_count DESC, RANDOM()
            LIMIT %s
        """, (category_name, user_id, category_name, num_questions))

        failed_questions = cur.fetchall()
        logger.info(f"📊 [FAILED] UT{ut_number}: {len(failed_questions)} preguntas falladas encontradas")

        # Add failed questions
        for q in failed_questions:
            selected_questions.append({
                'question_id': str(q['id']),
                'ut_number': ut_number,
                'ut_category': category_name,
                'texto_pregunta': q['texto_pregunta'],
                'selection_reason': 'failed',
                'failed_count': q['failed_count']
            })

        # If not enough failed questions, fill with random ones
        remaining = num_questions - len(failed_questions)
        if remaining > 0:
            logger.info(f"🎲 [FAILED] UT{ut_number}: Completando con {remaining} preguntas aleatorias")

            # Get random questions excluding already selected
            already_selected_ids = [q['question_id'] for q in selected_questions]

            cur.execute("""
                WITH unique_questions AS (
                    SELECT DISTINCT ON (q.hash_pregunta)
                        q.id, q.texto_pregunta, q.categoria, q.respuesta_correcta, q.hash_pregunta
                    FROM questions q
                    JOIN exams e ON q.exam_id = e.id
                    WHERE q.categoria = %s
                    AND q.id NOT IN (SELECT UNNEST(%s::uuid[]))
                    AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
                    AND q.anulada = false
                    ORDER BY q.hash_pregunta, q.id
                )
                SELECT id, texto_pregunta, categoria, respuesta_correcta
                FROM unique_questions
                ORDER BY RANDOM()
                LIMIT %s
            """, (category_name, already_selected_ids if already_selected_ids else [None], remaining))

            random_questions = cur.fetchall()

            for q in random_questions:
                selected_questions.append({
                    'question_id': str(q['id']),
                    'ut_number': ut_number,
                    'ut_category': category_name,
                    'texto_pregunta': q['texto_pregunta'],
                    'selection_reason': 'random_fill'
                })

            logger.info(f"✅ [FAILED] UT{ut_number}: {remaining} preguntas aleatorias añadidas")

    return selected_questions, len(selected_questions)


def select_questions_new(cur, user_id: str, selected_uts: List[int]) -> Tuple[List[Dict], int]:
    """
    New-priority selection: Prioritize questions the user has never answered
    Falls back to random if not enough new questions available

    Args:
        cur: Database cursor
        user_id: User UUID
        selected_uts: List of selected UT numbers

    Returns:
        Tuple of (list of selected questions, total count)
    """
    questions_per_ut = calculate_questions_per_ut(selected_uts)
    selected_questions = []

    for ut_number, num_questions in questions_per_ut.items():
        category_name = get_ut_category_name(cur, ut_number)

        logger.info(f"✨ [NEW] UT{ut_number} ({category_name}): Priorizando {num_questions} preguntas nuevas")

        # Get questions user has never answered (excluding duplicates by hash)
        cur.execute("""
            WITH unique_questions AS (
                SELECT DISTINCT ON (q.hash_pregunta)
                    q.id, q.texto_pregunta, q.categoria, q.respuesta_correcta, q.hash_pregunta
                FROM questions q
                WHERE q.categoria = %s
                AND q.id NOT IN (
                    SELECT DISTINCT ua.question_id
                    FROM user_answers ua
                    JOIN user_exams ue ON ua.user_exam_id = ue.id
                    WHERE ue.user_id = %s
                )
                AND q.anulada = false
                ORDER BY q.hash_pregunta, q.id
            )
            SELECT id, texto_pregunta, categoria, respuesta_correcta
            FROM unique_questions
            ORDER BY RANDOM()
            LIMIT %s
        """, (category_name, user_id, num_questions))

        new_questions = cur.fetchall()
        logger.info(f"📊 [NEW] UT{ut_number}: {len(new_questions)} preguntas nuevas encontradas")

        # Add new questions
        for q in new_questions:
            selected_questions.append({
                'question_id': str(q['id']),
                'ut_number': ut_number,
                'ut_category': category_name,
                'texto_pregunta': q['texto_pregunta'],
                'selection_reason': 'new'
            })

        # If not enough new questions, fill with random ones
        remaining = num_questions - len(new_questions)
        if remaining > 0:
            logger.info(f"🎲 [NEW] UT{ut_number}: Completando con {remaining} preguntas aleatorias")

            # Get random questions excluding already selected
            already_selected_ids = [q['question_id'] for q in selected_questions]

            cur.execute("""
                WITH unique_questions AS (
                    SELECT DISTINCT ON (q.hash_pregunta)
                        q.id, q.texto_pregunta, q.categoria, q.respuesta_correcta, q.hash_pregunta
                    FROM questions q
                    JOIN exams e ON q.exam_id = e.id
                    WHERE q.categoria = %s
                    AND q.id NOT IN (SELECT UNNEST(%s::uuid[]))
                    AND (e.tipo_examen = 'PER_NORMAL' OR e.tipo_examen = 'PER_LIBERADO')
                    AND q.anulada = false
                    ORDER BY q.hash_pregunta, q.id
                )
                SELECT id, texto_pregunta, categoria, respuesta_correcta
                FROM unique_questions
                ORDER BY RANDOM()
                LIMIT %s
            """, (category_name, already_selected_ids if already_selected_ids else [None], remaining))

            random_questions = cur.fetchall()

            for q in random_questions:
                selected_questions.append({
                    'question_id': str(q['id']),
                    'ut_number': ut_number,
                    'ut_category': category_name,
                    'texto_pregunta': q['texto_pregunta'],
                    'selection_reason': 'random_fill'
                })

            logger.info(f"✅ [NEW] UT{ut_number}: {remaining} preguntas aleatorias añadidas")

    return selected_questions, len(selected_questions)


def select_study_questions(cur, user_id: str, selected_uts: List[int], selection_mode: str) -> Tuple[List[Dict], int]:
    """
    Main entry point for question selection

    Args:
        cur: Database cursor
        user_id: User UUID
        selected_uts: List of selected UT numbers (e.g., [1, 2, 5, 6])
        selection_mode: 'random', 'failed', or 'new'

    Returns:
        Tuple of (list of selected questions with metadata, total count)
    """
    logger.info(f"🎯 Seleccionando preguntas - Modo: {selection_mode}, UTs: {selected_uts}")

    if selection_mode == 'random':
        return select_questions_random(cur, user_id, selected_uts)
    elif selection_mode == 'failed':
        return select_questions_failed(cur, user_id, selected_uts)
    elif selection_mode == 'new':
        return select_questions_new(cur, user_id, selected_uts)
    else:
        raise ValueError(f"Invalid selection_mode: {selection_mode}. Must be 'random', 'failed', or 'new'")
