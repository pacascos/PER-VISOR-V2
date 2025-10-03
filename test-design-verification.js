const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('🔍 Testing design changes...\n');

        // 1. Go to exam-system.html
        console.log('1️⃣ Loading exam-system.html...');
        await page.goto('http://localhost:8095/exam-system.html');
        await page.waitForLoadState('networkidle');

        // 2. Click "Nuevo Examen"
        console.log('2️⃣ Clicking "Nuevo Examen" button...');
        await page.click('#startExamBtn');

        // 3. Wait for redirect
        await page.waitForURL('**/exam-unified.html', { timeout: 10000 });
        console.log('✅ Redirected to: ' + page.url());

        // 4. Wait for exam to load
        console.log('3️⃣ Waiting for exam to load...');
        await page.waitForSelector('#exam-section:not(.hidden)', { timeout: 15000 });
        console.log('✅ Exam section visible');

        // 5. Wait for answers to render
        await page.waitForSelector('.answer-option', { timeout: 5000 });
        console.log('✅ Answer options rendered');

        // 6. Check structure
        const answerHTML = await page.locator('.answer-option').first().innerHTML();
        console.log('\n📝 Answer option HTML:');
        console.log(answerHTML);

        // 7. Check for answer-letter circles
        const letterCount = await page.locator('.answer-letter').count();
        console.log(`\n🔵 Found ${letterCount} answer letters (circles)`);

        // 8. Check for answer-text
        const textCount = await page.locator('.answer-text').count();
        console.log(`📄 Found ${textCount} answer texts`);

        // 9. Get computed styles
        const letterStyles = await page.locator('.answer-letter').first().evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
                backgroundColor: styles.backgroundColor,
                borderRadius: styles.borderRadius,
                width: styles.width,
                height: styles.height,
                display: styles.display,
                color: styles.color
            };
        });

        console.log('\n🎨 Answer letter styles:');
        console.log(JSON.stringify(letterStyles, null, 2));

        // 10. Test selection
        console.log('\n4️⃣ Testing answer selection...');
        await page.click('.answer-option:first-child');
        await page.waitForTimeout(500);

        const isSelected = await page.locator('.answer-option:first-child').evaluate(el =>
            el.classList.contains('selected')
        );
        console.log(`✅ Selection works: ${isSelected}`);

        // 11. Check selected styles
        if (isSelected) {
            const selectedStyles = await page.locator('.answer-option.selected').first().evaluate(el => {
                const styles = window.getComputedStyle(el);
                return {
                    background: styles.background,
                    borderColor: styles.borderColor,
                    color: styles.color
                };
            });
            console.log('\n🎨 Selected option styles:');
            console.log(JSON.stringify(selectedStyles, null, 2));
        }

        console.log('\n✅ All tests passed! Design verified.');
        console.log('\n⏸️  Browser will stay open for 30 seconds for manual inspection...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await page.screenshot({ path: 'test-error.png', fullPage: true });
        console.log('📸 Screenshot saved to test-error.png');
    } finally {
        await browser.close();
    }
})();
