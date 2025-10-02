/**
 * ExamController Unit Tests
 *
 * Basic unit tests for the ExamController class.
 * These tests ensure core functionality works correctly.
 */

// Mock window.API_BASE
if (typeof window === 'undefined') {
    global.window = { API_BASE: '/api' };
}

// Load ExamController
const ExamController = typeof require !== 'undefined'
    ? require('../exam-controller.js')
    : window.ExamController;

// Simple test framework
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    describe(description, fn) {
        console.log(`\n📦 ${description}`);
        fn();
    }

    it(description, fn) {
        try {
            fn();
            this.passed++;
            console.log(`  ✅ ${description}`);
        } catch (error) {
            this.failed++;
            console.log(`  ❌ ${description}`);
            console.error(`     ${error.message}`);
        }
    }

    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${expected} but got ${actual}`);
                }
            },
            toEqual: (expected) => {
                const actualStr = JSON.stringify(actual);
                const expectedStr = JSON.stringify(expected);
                if (actualStr !== expectedStr) {
                    throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
                }
            },
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected truthy but got ${actual}`);
                }
            },
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected falsy but got ${actual}`);
                }
            },
            toBeNull: () => {
                if (actual !== null) {
                    throw new Error(`Expected null but got ${actual}`);
                }
            },
            toBeGreaterThan: (expected) => {
                if (actual <= expected) {
                    throw new Error(`Expected ${actual} to be greater than ${expected}`);
                }
            },
            toContain: (expected) => {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${actual} to contain ${expected}`);
                }
            }
        };
    }

    summary() {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`📊 Test Results:`);
        console.log(`   ✅ Passed: ${this.passed}`);
        console.log(`   ❌ Failed: ${this.failed}`);
        console.log(`   📈 Total: ${this.passed + this.failed}`);
        console.log(`${'='.repeat(50)}\n`);

        return this.failed === 0;
    }
}

// Create test runner
const test = new TestRunner();

// ==================== CONSTRUCTOR TESTS ====================

test.describe('ExamController Constructor', () => {
    test.it('should initialize with default values', () => {
        const controller = new ExamController();
        test.expect(controller.examType).toBe('full');
        test.expect(controller.currentQuestionIndex).toBe(0);
        test.expect(controller.timeRemaining).toBe(90 * 60);
    });

    test.it('should accept custom exam type', () => {
        const controller = new ExamController({ examType: 'study' });
        test.expect(controller.examType).toBe('study');
    });

    test.it('should handle API_BASE from window', () => {
        const controller = new ExamController();
        test.expect(controller.API_BASE).toBe('/api');
    });

    test.it('should accept auth token in options', () => {
        const controller = new ExamController({ authToken: 'test-token-123' });
        test.expect(controller.authToken).toBe('test-token-123');
    });
});

// ==================== TIMER TESTS ====================

test.describe('Timer Functionality', () => {
    test.it('should start timer and decrement time', (done) => {
        const controller = new ExamController();
        const initialTime = controller.timeRemaining;

        controller.startTimer();

        setTimeout(() => {
            controller.stopTimer();
            test.expect(controller.timeRemaining).toBeGreaterThan(0);
            test.expect(controller.timeRemaining).toBe(initialTime - 1);
            test.expect(controller.examStartTime).toBeTruthy();
        }, 1100);
    });

    test.it('should stop timer', () => {
        const controller = new ExamController();
        controller.startTimer();
        controller.stopTimer();
        test.expect(controller.timerInterval).toBeNull();
    });
});

// ==================== ANSWER HANDLING TESTS ====================

test.describe('Answer Handling', () => {
    test.it('should record answer', () => {
        const controller = new ExamController();
        controller.currentExam = {
            questions: [{ question_id: 1 }]
        };

        controller.selectAnswer('A');
        test.expect(controller.userAnswers[1]).toBe('A');
    });

    test.it('should check if question is answered', () => {
        const controller = new ExamController();
        controller.userAnswers = { 1: 'A', 2: 'B' };

        test.expect(controller.isQuestionAnswered(1)).toBeTruthy();
        test.expect(controller.isQuestionAnswered(3)).toBeFalsy();
    });

    test.it('should get answered count', () => {
        const controller = new ExamController();
        controller.userAnswers = { 1: 'A', 2: 'B', 3: 'C' };

        test.expect(controller.getAnsweredCount()).toBe(3);
    });

    test.it('should get unanswered questions', () => {
        const controller = new ExamController();
        controller.currentExam = {
            questions: [
                { question_id: 1 },
                { question_id: 2 },
                { question_id: 3 }
            ]
        };
        controller.userAnswers = { 1: 'A' };

        const unanswered = controller.getUnansweredQuestions();
        test.expect(unanswered.length).toBe(2);
    });
});

// ==================== NAVIGATION TESTS ====================

test.describe('Navigation', () => {
    test.it('should go to next question', () => {
        const controller = new ExamController();
        controller.currentExam = {
            questions: [
                { question_id: 1 },
                { question_id: 2 },
                { question_id: 3 }
            ]
        };

        test.expect(controller.currentQuestionIndex).toBe(0);
        controller.goToNextQuestion();
        test.expect(controller.currentQuestionIndex).toBe(1);
    });

    test.it('should not go beyond last question', () => {
        const controller = new ExamController();
        controller.currentExam = {
            questions: [
                { question_id: 1 },
                { question_id: 2 }
            ]
        };
        controller.currentQuestionIndex = 1;

        controller.goToNextQuestion();
        test.expect(controller.currentQuestionIndex).toBe(1);
    });

    test.it('should go to previous question', () => {
        const controller = new ExamController();
        controller.currentExam = {
            questions: [
                { question_id: 1 },
                { question_id: 2 }
            ]
        };
        controller.currentQuestionIndex = 1;

        controller.goToPreviousQuestion();
        test.expect(controller.currentQuestionIndex).toBe(0);
    });

    test.it('should not go before first question', () => {
        const controller = new ExamController();
        controller.currentExam = {
            questions: [{ question_id: 1 }]
        };

        controller.goToPreviousQuestion();
        test.expect(controller.currentQuestionIndex).toBe(0);
    });

    test.it('should go to specific question', () => {
        const controller = new ExamController();
        controller.currentExam = {
            questions: [
                { question_id: 1 },
                { question_id: 2 },
                { question_id: 3 }
            ]
        };

        controller.goToQuestion(2);
        test.expect(controller.currentQuestionIndex).toBe(2);
    });

    test.it('should get current question', () => {
        const controller = new ExamController();
        controller.currentExam = {
            questions: [
                { question_id: 1, text: 'Question 1' },
                { question_id: 2, text: 'Question 2' }
            ]
        };
        controller.currentQuestionIndex = 1;

        const current = controller.getCurrentQuestion();
        test.expect(current.question_id).toBe(2);
    });
});

// ==================== EXAM STATS TESTS ====================

test.describe('Exam Statistics', () => {
    test.it('should calculate exam stats', () => {
        const controller = new ExamController();
        controller.currentExam = {
            questions: [
                { question_id: 1 },
                { question_id: 2 },
                { question_id: 3 }
            ]
        };
        controller.userAnswers = { 1: 'A', 2: 'B' };
        controller.examStartTime = new Date(Date.now() - 60000); // 1 minute ago

        const stats = controller.getExamStats();
        test.expect(stats.totalQuestions).toBe(3);
        test.expect(stats.answeredCount).toBe(2);
        test.expect(stats.unansweredCount).toBe(1);
        test.expect(stats.completionPercentage).toBeGreaterThan(60);
    });

    test.it('should validate if exam can be submitted', () => {
        const controller = new ExamController();
        controller.currentExam = {
            questions: [
                { question_id: 1 },
                { question_id: 2 }
            ]
        };

        // Not all answered
        controller.userAnswers = { 1: 'A' };
        test.expect(controller.canSubmitExam()).toBeFalsy();

        // All answered
        controller.userAnswers = { 1: 'A', 2: 'B' };
        test.expect(controller.canSubmitExam()).toBeTruthy();
    });

    test.it('should get submit confirmation message', () => {
        const controller = new ExamController();
        controller.currentExam = {
            questions: [
                { question_id: 1 },
                { question_id: 2 }
            ]
        };

        // With unanswered questions
        controller.userAnswers = { 1: 'A' };
        const msg1 = controller.getSubmitConfirmationMessage();
        test.expect(msg1).toContain('sin responder');

        // All answered
        controller.userAnswers = { 1: 'A', 2: 'B' };
        const msg2 = controller.getSubmitConfirmationMessage();
        test.expect(msg2).toContain('seguro');
    });
});

// ==================== QUESTION TIMER TESTS ====================

test.describe('Question Timer', () => {
    test.it('should track time spent on questions', () => {
        const controller = new ExamController();
        controller.currentExam = {
            questions: [{ question_id: 1 }]
        };

        controller.startQuestionTimer();
        test.expect(controller.questionStartTimes[1]).toBeTruthy();

        setTimeout(() => {
            const timeSpent = controller.getQuestionTimeSpent(1);
            test.expect(timeSpent).toBeGreaterThan(0);
        }, 100);
    });
});

// ==================== RESET TESTS ====================

test.describe('Reset Functionality', () => {
    test.it('should reset exam state', () => {
        const controller = new ExamController();
        controller.currentExam = { questions: [] };
        controller.currentQuestionIndex = 5;
        controller.userAnswers = { 1: 'A' };
        controller.timeRemaining = 1000;
        controller.startTimer();

        controller.reset();

        test.expect(controller.currentExam).toBeNull();
        test.expect(controller.currentQuestionIndex).toBe(0);
        test.expect(controller.userAnswers).toEqual({});
        test.expect(controller.timeRemaining).toBe(90 * 60);
        test.expect(controller.timerInterval).toBeNull();
    });
});

// ==================== RUN TESTS ====================

console.log('\n' + '='.repeat(50));
console.log('🧪 Running ExamController Unit Tests');
console.log('='.repeat(50));

const success = test.summary();

// Exit with appropriate code for CI/CD
if (typeof process !== 'undefined') {
    process.exit(success ? 0 : 1);
}
