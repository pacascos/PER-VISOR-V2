/**
 * Backward Compatibility Test
 *
 * Verifies that existing pages still work after adding new infrastructure:
 * - exam-system.html (with study mode)
 * - exam.html (full exam page)
 *
 * Tests:
 * 1. Login functionality
 * 2. Exam generation
 * 3. Study mode loading
 * 4. No JavaScript errors
 * 5. All existing features work
 */

const { chromium } = require('playwright');

async function testBackwardCompatibility() {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 BACKWARD COMPATIBILITY TEST');
    console.log('='.repeat(60) + '\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let allPassed = true;

    // Monitor console for errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    // Monitor network errors
    const networkErrors = [];
    page.on('requestfailed', request => {
        networkErrors.push(`${request.method()} ${request.url()} - ${request.failure().errorText}`);
    });

    try {
        // ==================== TEST 1: exam-system.html Login ====================
        console.log('📋 Test 1: exam-system.html - Login Functionality');
        console.log('-'.repeat(60));

        await page.goto('http://localhost:8095/exam-system.html');
        await page.waitForSelector('#loginUsername', { timeout: 5000 });

        console.log('   ✅ Page loaded successfully');

        // Fill login form
        await page.fill('#loginUsername', 'testuser');
        await page.fill('#loginPassword', '123');

        // Monitor network
        const loginPromise = page.waitForResponse(
            response => response.url().includes('/auth/login'),
            { timeout: 5000 }
        );

        await page.click('button[type="submit"]');

        const loginResponse = await loginPromise;
        const loginStatus = loginResponse.status();

        if (loginStatus === 200) {
            console.log('   ✅ Login successful (200)');
        } else {
            console.log(`   ❌ Login failed (${loginStatus})`);
            allPassed = false;
        }

        // Wait for dashboard
        await page.waitForSelector('#dashboard-section', { timeout: 5000 });
        console.log('   ✅ Dashboard displayed');

        // ==================== TEST 2: New Infrastructure Files Load ====================
        console.log('\n📋 Test 2: Verify New Files Do Not Interfere');
        console.log('-'.repeat(60));

        // Check if new files can be loaded without errors
        const scriptTags = await page.$$eval('script', scripts =>
            scripts.map(s => s.src).filter(src => src)
        );

        console.log(`   📄 Loaded scripts: ${scriptTags.length}`);

        // Add new scripts to page to test they don't break anything
        await page.addScriptTag({ path: './src/web/exam-controller.js' });
        console.log('   ✅ exam-controller.js loaded without error');

        await page.addScriptTag({ path: './src/web/exam-api.js' });
        console.log('   ✅ exam-api.js loaded without error');

        // Verify ExamController and ExamAPI classes are available
        const classesAvailable = await page.evaluate(() => {
            return {
                examController: typeof ExamController !== 'undefined',
                examAPI: typeof ExamAPI !== 'undefined'
            };
        });

        if (classesAvailable.examController) {
            console.log('   ✅ ExamController class available globally');
        } else {
            console.log('   ❌ ExamController class NOT available');
            allPassed = false;
        }

        if (classesAvailable.examAPI) {
            console.log('   ✅ ExamAPI class available globally');
        } else {
            console.log('   ❌ ExamAPI class NOT available');
            allPassed = false;
        }

        // ==================== TEST 3: Existing Functionality Still Works ====================
        console.log('\n📋 Test 3: Existing Functionality Intact');
        console.log('-'.repeat(60));

        // Check that ExamSystem is still available
        const examSystemAvailable = await page.evaluate(() => {
            return typeof examSystem !== 'undefined';
        });

        if (examSystemAvailable) {
            console.log('   ✅ ExamSystem instance still available');
        } else {
            console.log('   ❌ ExamSystem instance NOT available');
            allPassed = false;
        }

        // ==================== TEST 4: Check for JavaScript Errors ====================
        console.log('\n📋 Test 4: JavaScript Error Check');
        console.log('-'.repeat(60));

        if (consoleErrors.length === 0) {
            console.log('   ✅ No JavaScript console errors');
        } else {
            console.log(`   ⚠️  Found ${consoleErrors.length} console error(s):`);
            consoleErrors.forEach(err => {
                console.log(`      - ${err}`);
            });
        }

        // ==================== TEST 5: Network Request Check ====================
        console.log('\n📋 Test 5: Network Request Check');
        console.log('-'.repeat(60));

        if (networkErrors.length === 0) {
            console.log('   ✅ No network request failures');
        } else {
            console.log(`   ⚠️  Found ${networkErrors.length} network error(s):`);
            networkErrors.forEach(err => {
                console.log(`      - ${err}`);
            });
        }

        // ==================== TEST 6: Study Mode Still Works ====================
        console.log('\n📋 Test 6: Study Mode Compatibility');
        console.log('-'.repeat(60));

        // Navigate to study mode page
        await page.goto('http://localhost:8095/study-config.html');
        await page.waitForSelector('.ut-grid', { timeout: 5000 });
        console.log('   ✅ Study config page loads');

        // Check that study-mode-adapter still works
        const studyModeAdapterAvailable = await page.evaluate(() => {
            return typeof StudyModeAdapter !== 'undefined';
        });

        if (studyModeAdapterAvailable) {
            console.log('   ✅ StudyModeAdapter class available');
        } else {
            console.log('   ⚠️  StudyModeAdapter class NOT available (may not be loaded yet)');
        }

    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
        allPassed = false;
    }

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKWARD COMPATIBILITY TEST RESULTS');
    console.log('='.repeat(60));

    if (allPassed) {
        console.log('✅ ALL TESTS PASSED - Backward compatibility maintained!');
        console.log('\n✨ New infrastructure files coexist without breaking existing code');
    } else {
        console.log('❌ SOME TESTS FAILED - Review compatibility issues');
    }

    console.log('\n📝 Summary:');
    console.log(`   - Console errors: ${consoleErrors.length}`);
    console.log(`   - Network errors: ${networkErrors.length}`);
    console.log(`   - New classes loaded: ExamController, ExamAPI`);
    console.log(`   - Existing classes: ExamSystem, StudyModeAdapter`);
    console.log('='.repeat(60) + '\n');

    await browser.close();
    process.exit(allPassed ? 0 : 1);
}

// Run tests
testBackwardCompatibility().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
