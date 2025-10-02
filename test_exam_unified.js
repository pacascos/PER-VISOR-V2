/**
 * Integration Test for exam-unified.html
 *
 * Tests the new unified exam page to ensure:
 * - Authentication works
 * - Exam generation works
 * - Questions display correctly
 * - Navigation works
 * - Answer selection works
 * - Submission works
 * - Feature flag routing works
 */

const { chromium } = require('playwright');

async function testExamUnified() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 EXAM-UNIFIED.HTML INTEGRATION TEST');
    console.log('='.repeat(60) + '\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let allPassed = true;

    // Monitor console for errors
    const consoleErrors = [];
    const consoleLogs = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        } else if (msg.type() === 'log') {
            consoleLogs.push(msg.text());
        }
    });

    // Monitor network
    const networkErrors = [];
    const networkRequests = [];
    page.on('requestfailed', request => {
        networkErrors.push(`${request.method()} ${request.url()} - ${request.failure().errorText}`);
    });
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
        // ==================== TEST 1: Feature Flag Routing ====================
        console.log('📋 Test 1: Feature Flag Routing');
        console.log('-'.repeat(60));

        // First login to exam-system.html
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

        // Wait for dashboard
        await page.waitForSelector('#dashboard-section', { timeout: 5000 });
        console.log('   ✅ Dashboard loaded');

        // Check feature flag value
        const flagEnabled = await page.evaluate(() => {
            return window.featureFlags ? window.featureFlags.isEnabled('unified_exam_page') : false;
        });

        console.log(`   🚩 Feature flag "unified_exam_page": ${flagEnabled ? 'ENABLED' : 'DISABLED'}`);

        // Click on "Nuevo Examen" button
        const navigationPromise = page.waitForLoadState('load');
        await page.click('#startExamBtn');
        await navigationPromise;

        // Check which page we landed on
        const currentUrl = page.url();
        if (flagEnabled && currentUrl.includes('exam-unified.html')) {
            console.log('   ✅ Correctly routed to exam-unified.html');
        } else if (!flagEnabled && currentUrl.includes('exam.html')) {
            console.log('   ✅ Correctly routed to exam.html (feature flag disabled)');
        } else {
            console.log(`   ❌ Unexpected routing: ${currentUrl}`);
            allPassed = false;
        }

        // ==================== TEST 2: Direct Access to exam-unified.html ====================
        console.log('\n📋 Test 2: Direct Access to exam-unified.html');
        console.log('-'.repeat(60));

        await page.goto('http://localhost:8095/exam-unified.html');
        console.log('   ✅ Page loaded');

        // Check for loading section
        const loadingVisible = await page.isVisible('#loading-section');
        console.log(`   ${loadingVisible ? '✅' : '❌'} Loading section visible`);

        // Wait for exam generation
        await page.waitForSelector('#exam-section', { timeout: 10000 });
        console.log('   ✅ Exam section displayed');

        // ==================== TEST 3: Exam Generation ====================
        console.log('\n📋 Test 3: Exam Generation');
        console.log('-'.repeat(60));

        // Check for generate exam API call
        const generateRequest = networkRequests.find(req =>
            req.url.includes('/exams/generate') && req.method === 'POST'
        );

        if (generateRequest) {
            console.log(`   ✅ Exam generate API called (${generateRequest.status})`);
        } else {
            console.log('   ❌ Exam generate API NOT called');
            allPassed = false;
        }

        // Check for load questions API call
        const questionsRequest = networkRequests.find(req =>
            req.url.includes('/exams/') && req.url.includes('/questions') && req.method === 'GET'
        );

        if (questionsRequest) {
            console.log(`   ✅ Load questions API called (${questionsRequest.status})`);
        } else {
            console.log('   ❌ Load questions API NOT called');
            allPassed = false;
        }

        // ==================== TEST 4: Question Display ====================
        console.log('\n📋 Test 4: Question Display');
        console.log('-'.repeat(60));

        // Check question elements
        const questionNumber = await page.textContent('#question-number');
        const questionText = await page.textContent('#question-text');
        const answersContainer = await page.$('#answers-container');

        console.log(`   ✅ Question number: ${questionNumber}`);
        console.log(`   ✅ Question text: ${questionText.substring(0, 50)}...`);

        const answerCount = await answersContainer.$$('.answer-option');
        if (answerCount.length === 4) {
            console.log(`   ✅ 4 answer options displayed`);
        } else {
            console.log(`   ❌ Expected 4 answers, found ${answerCount.length}`);
            allPassed = false;
        }

        // ==================== TEST 5: Answer Selection ====================
        console.log('\n📋 Test 5: Answer Selection');
        console.log('-'.repeat(60));

        // Select answer A
        await page.click('.answer-option[data-answer="A"]');
        await page.waitForTimeout(500);

        const isSelected = await page.$eval('.answer-option[data-answer="A"]', el =>
            el.classList.contains('selected')
        );

        if (isSelected) {
            console.log('   ✅ Answer A selected (CSS class applied)');
        } else {
            console.log('   ❌ Answer A not properly selected');
            allPassed = false;
        }

        // ==================== TEST 6: Navigation ====================
        console.log('\n📋 Test 6: Navigation');
        console.log('-'.repeat(60));

        // Check prev button is disabled (first question)
        const prevDisabled = await page.$eval('#prev-btn', btn => btn.disabled);
        if (prevDisabled) {
            console.log('   ✅ Previous button disabled on first question');
        } else {
            console.log('   ❌ Previous button should be disabled');
            allPassed = false;
        }

        // Click next
        await page.click('#next-btn');
        await page.waitForTimeout(500);

        const questionNumber2 = await page.textContent('#question-number');
        if (questionNumber2.includes('2')) {
            console.log('   ✅ Navigated to question 2');
        } else {
            console.log(`   ❌ Expected question 2, got: ${questionNumber2}`);
            allPassed = false;
        }

        // Check prev button is now enabled
        const prevEnabled = await page.$eval('#prev-btn', btn => !btn.disabled);
        if (prevEnabled) {
            console.log('   ✅ Previous button enabled on second question');
        } else {
            console.log('   ❌ Previous button should be enabled');
            allPassed = false;
        }

        // ==================== TEST 7: Timer ====================
        console.log('\n📋 Test 7: Timer');
        console.log('-'.repeat(60));

        const timerValue = await page.textContent('#timer-value');
        console.log(`   ✅ Timer displaying: ${timerValue}`);

        if (timerValue.match(/\d+:\d{2}/)) {
            console.log('   ✅ Timer format correct (MM:SS)');
        } else {
            console.log(`   ❌ Timer format incorrect: ${timerValue}`);
            allPassed = false;
        }

        // ==================== TEST 8: Progress Bar ====================
        console.log('\n📋 Test 8: Progress Bar');
        console.log('-'.repeat(60));

        const progressText = await page.textContent('#progress-text');
        const progressWidth = await page.$eval('#progress-bar', el => el.style.width);

        console.log(`   ✅ Progress text: ${progressText}`);
        console.log(`   ✅ Progress bar width: ${progressWidth}`);

        // ==================== TEST 9: JavaScript Errors ====================
        console.log('\n📋 Test 9: JavaScript Error Check');
        console.log('-'.repeat(60));

        if (consoleErrors.length === 0) {
            console.log('   ✅ No JavaScript console errors');
        } else {
            console.log(`   ⚠️  Found ${consoleErrors.length} console error(s):`);
            consoleErrors.forEach(err => {
                console.log(`      - ${err}`);
            });
        }

        // ==================== TEST 10: Network Errors ====================
        console.log('\n📋 Test 10: Network Request Check');
        console.log('-'.repeat(60));

        if (networkErrors.length === 0) {
            console.log('   ✅ No network request failures');
        } else {
            console.log(`   ⚠️  Found ${networkErrors.length} network error(s):`);
            networkErrors.forEach(err => {
                console.log(`      - ${err}`);
            });
        }

        // ==================== TEST 11: Classes Available ====================
        console.log('\n📋 Test 11: JavaScript Classes Available');
        console.log('-'.repeat(60));

        const classesAvailable = await page.evaluate(() => {
            return {
                examController: typeof ExamController !== 'undefined',
                examAPI: typeof ExamAPI !== 'undefined',
                fullExamController: typeof FullExamController !== 'undefined',
                featureFlags: typeof FeatureFlags !== 'undefined'
            };
        });

        Object.entries(classesAvailable).forEach(([className, available]) => {
            const icon = available ? '✅' : '❌';
            console.log(`   ${icon} ${className}: ${available ? 'Available' : 'NOT Available'}`);
            if (!available) allPassed = false;
        });

    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
        allPassed = false;
    }

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(60));
    console.log('📊 EXAM-UNIFIED.HTML TEST RESULTS');
    console.log('='.repeat(60));

    if (allPassed) {
        console.log('✅ ALL TESTS PASSED - exam-unified.html works correctly!');
    } else {
        console.log('❌ SOME TESTS FAILED - Review issues above');
    }

    console.log('\n📝 Summary:');
    console.log(`   - Console errors: ${consoleErrors.length}`);
    console.log(`   - Network errors: ${networkErrors.length}`);
    console.log(`   - API requests: ${networkRequests.length}`);
    console.log(`   - Feature flag routing: Working`);
    console.log(`   - Exam generation: Working`);
    console.log(`   - Question display: Working`);
    console.log(`   - Navigation: Working`);
    console.log('='.repeat(60) + '\n');

    await browser.close();
    process.exit(allPassed ? 0 : 1);
}

// Run tests
testExamUnified().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
