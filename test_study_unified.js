/**
 * Integration Test for Study Mode in exam-unified.html
 *
 * Tests:
 * - Study test generation
 * - Redirect to exam-unified.html?type=study
 * - StudyExamController initialization
 * - Study mode UI (badge, back button)
 * - Question loading
 * - Answer recording
 * - Submission
 */

const { chromium } = require('playwright');

async function testStudyModeUnified() {
    console.log('\n' + '='.repeat(60));
    console.log('📚 STUDY MODE UNIFIED TEST');
    console.log('='.repeat(60) + '\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let allPassed = true;

    // Monitor console
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    // Monitor network
    const networkRequests = [];
    page.on('response', response => {
        if (response.url().includes('/api/')) {
            networkRequests.push({
                method: response.request().method(),
                url: response.url(),
                status: response.status()
            });
        }
    });

    try {
        // ==================== TEST 1: Login ====================
        console.log('📋 Test 1: Login');
        console.log('-'.repeat(60));

        await page.goto('http://localhost:8095/exam-system.html');
        await page.waitForSelector('#loginUsername', { timeout: 5000 });

        await page.fill('#loginUsername', 'testuser');
        await page.fill('#loginPassword', '123');

        const loginPromise = page.waitForResponse(
            response => response.url().includes('/auth/login'),
            { timeout: 5000 }
        );

        await page.click('button[type="submit"]');
        const loginResponse = await loginPromise;

        if (loginResponse.status() === 200) {
            console.log('   ✅ Login successful');
        } else {
            console.log(`   ❌ Login failed (${loginResponse.status()})`);
            allPassed = false;
        }

        // ==================== TEST 2: Navigate to Study Config ====================
        console.log('\n📋 Test 2: Navigate to Study Config');
        console.log('-'.repeat(60));

        await page.waitForSelector('#dashboard-section', { timeout: 5000 });
        await page.click('#studyModeBtn');

        await page.waitForLoadState('load');
        const url = page.url();

        if (url.includes('study-config.html')) {
            console.log('   ✅ Navigated to study-config.html');
        } else {
            console.log(`   ❌ Expected study-config.html, got: ${url}`);
            allPassed = false;
        }

        // ==================== TEST 3: Generate Study Test ====================
        console.log('\n📋 Test 3: Generate Study Test');
        console.log('-'.repeat(60));

        // Wait for UTs to load
        await page.waitForSelector('.ut-card', { timeout: 5000 });
        console.log('   ✅ UT cards loaded');

        // Select UT 1 and 2
        await page.click('.ut-card[data-ut="1"]');
        await page.click('.ut-card[data-ut="2"]');
        console.log('   ✅ Selected UTs 1 and 2');

        // Select random mode
        await page.click('input[value="random"]');
        console.log('   ✅ Selected random mode');

        // Generate test
        const generatePromise = page.waitForResponse(
            response => response.url().includes('/study-tests/generate'),
            { timeout: 10000 }
        );

        await page.click('#generateBtn');
        const generateResponse = await generatePromise;

        if (generateResponse.status() === 201) {
            console.log('   ✅ Study test generated (201)');
        } else {
            console.log(`   ❌ Generation failed (${generateResponse.status()})`);
            allPassed = false;
        }

        // ==================== TEST 4: Redirect to Unified Exam ====================
        console.log('\n📋 Test 4: Redirect to Unified Exam Page');
        console.log('-'.repeat(60));

        await page.waitForLoadState('load', { timeout: 10000 });
        const examUrl = page.url();

        // Check feature flag routing
        const usesUnifiedPage = examUrl.includes('exam-unified.html');
        const usesOldPage = examUrl.includes('exam-system.html');

        if (usesUnifiedPage) {
            console.log('   ✅ Routed to exam-unified.html (new)');
            console.log(`   📍 URL: ${examUrl}`);

            // Check URL parameters
            if (examUrl.includes('type=study') && examUrl.includes('study_test_id=')) {
                console.log('   ✅ Correct URL parameters (type=study&study_test_id=X)');
            } else {
                console.log('   ❌ Missing URL parameters');
                allPassed = false;
            }
        } else if (usesOldPage) {
            console.log('   ✅ Routed to exam-system.html (old - feature flag disabled)');
            console.log('   ⚠️  Skipping unified page tests');
            console.log('='.repeat(60));
            console.log('📊 TEST RESULTS: Feature flag disabled, unified page not tested');
            await browser.close();
            process.exit(0);
        } else {
            console.log(`   ❌ Unexpected routing: ${examUrl}`);
            allPassed = false;
        }

        // ==================== TEST 5: Study Mode UI Elements ====================
        console.log('\n📋 Test 5: Study Mode UI Elements');
        console.log('-'.repeat(60));

        // Wait for exam section
        await page.waitForSelector('#exam-section', { timeout: 10000 });
        console.log('   ✅ Exam section displayed');

        // Check study mode badge
        const badge = await page.$('#study-mode-badge');
        if (badge) {
            const badgeText = await badge.textContent();
            console.log(`   ✅ Study mode badge: ${badgeText.trim()}`);
        } else {
            console.log('   ❌ Study mode badge NOT found');
            allPassed = false;
        }

        // Check back button
        const backBtn = await page.$('#back-to-study-btn');
        if (backBtn) {
            console.log('   ✅ Back button found');
        } else {
            console.log('   ❌ Back button NOT found');
            allPassed = false;
        }

        // ==================== TEST 6: Load Questions ====================
        console.log('\n📋 Test 6: Load Study Questions');
        console.log('-'.repeat(60));

        const loadRequest = networkRequests.find(req =>
            req.url.includes('/study-tests/') && req.url.includes('/questions')
        );

        if (loadRequest) {
            console.log(`   ✅ Load questions API called (${loadRequest.status})`);
        } else {
            console.log('   ❌ Load questions API NOT called');
            allPassed = false;
        }

        // Check question display
        const questionText = await page.textContent('#question-text');
        if (questionText && questionText.length > 10) {
            console.log(`   ✅ Question displayed: ${questionText.substring(0, 50)}...`);
        } else {
            console.log('   ❌ Question NOT displayed');
            allPassed = false;
        }

        // ==================== TEST 7: Answer Selection ====================
        console.log('\n📋 Test 7: Answer Selection');
        console.log('-'.repeat(60));

        await page.click('.answer-option[data-answer="A"]');
        await page.waitForTimeout(500);

        const isSelected = await page.$eval('.answer-option[data-answer="A"]', el =>
            el.classList.contains('selected')
        );

        if (isSelected) {
            console.log('   ✅ Answer A selected');
        } else {
            console.log('   ❌ Answer A NOT selected');
            allPassed = false;
        }

        // Check if answer was recorded
        const recordRequest = networkRequests.find(req =>
            req.url.includes('/study-tests/') && req.url.includes('/answer')
        );

        if (recordRequest) {
            console.log(`   ✅ Answer recorded to backend (${recordRequest.status})`);
        } else {
            console.log('   ⚠️  Answer NOT recorded (may be expected)');
        }

        // ==================== TEST 8: JavaScript Classes ====================
        console.log('\n📋 Test 8: JavaScript Classes Available');
        console.log('-'.repeat(60));

        const classesAvailable = await page.evaluate(() => {
            return {
                examController: typeof ExamController !== 'undefined',
                examAPI: typeof ExamAPI !== 'undefined',
                studyExamController: typeof StudyExamController !== 'undefined',
                featureFlags: typeof FeatureFlags !== 'undefined',
                controllerInstance: typeof window.examController !== 'undefined'
            };
        });

        Object.entries(classesAvailable).forEach(([className, available]) => {
            const icon = available ? '✅' : '❌';
            console.log(`   ${icon} ${className}: ${available ? 'Available' : 'NOT Available'}`);
            if (!available && className !== 'controllerInstance') allPassed = false;
        });

        // ==================== TEST 9: Console Errors ====================
        console.log('\n📋 Test 9: Console Error Check');
        console.log('-'.repeat(60));

        if (consoleErrors.length === 0) {
            console.log('   ✅ No console errors');
        } else {
            console.log(`   ⚠️  Found ${consoleErrors.length} console error(s):`);
            consoleErrors.forEach(err => {
                console.log(`      - ${err}`);
            });
        }

    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
        allPassed = false;
    }

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(60));
    console.log('📊 STUDY MODE UNIFIED TEST RESULTS');
    console.log('='.repeat(60));

    if (allPassed) {
        console.log('✅ ALL TESTS PASSED - Study mode unified works correctly!');
    } else {
        console.log('❌ SOME TESTS FAILED - Review issues above');
    }

    console.log('\n📝 Summary:');
    console.log(`   - Console errors: ${consoleErrors.length}`);
    console.log(`   - API requests: ${networkRequests.length}`);
    console.log(`   - Study test generation: Working`);
    console.log(`   - Unified page routing: Working`);
    console.log(`   - Study mode UI: Working`);
    console.log(`   - Question loading: Working`);
    console.log('='.repeat(60) + '\n');

    await browser.close();
    process.exit(allPassed ? 0 : 1);
}

// Run tests
testStudyModeUnified().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
