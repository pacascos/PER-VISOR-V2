const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('🔍 Testing exam-unified.html directly...\n');

        // Go directly to exam-unified.html
        console.log('1️⃣ Loading exam-unified.html...');
        await page.goto('http://localhost:8095/exam-unified.html');

        // Wait a bit for JavaScript to load
        await page.waitForTimeout(2000);

        console.log('✅ Page loaded');

        // Check if feature flags are loaded
        const featureFlagsLoaded = await page.evaluate(() => {
            return typeof window.featureFlags !== 'undefined';
        });
        console.log(`Feature flags loaded: ${featureFlagsLoaded}`);

        // Wait for exam section (might be loading or hidden)
        await page.waitForTimeout(10000);

        // Check for answer options
        const answerCount = await page.locator('.answer-option').count();
        console.log(`\n📊 Answer options found: ${answerCount}`);

        if (answerCount > 0) {
            // Get first answer HTML
            const answerHTML = await page.locator('.answer-option').first().innerHTML();
            console.log('\n📝 First answer option HTML:');
            console.log(answerHTML);

            // Check for circles
            const letterCount = await page.locator('.answer-letter').count();
            console.log(`\n🔵 Answer letter circles: ${letterCount}`);

            // Check styles
            const letterStyles = await page.locator('.answer-letter').first().evaluate(el => {
                const styles = window.getComputedStyle(el);
                return {
                    backgroundColor: styles.backgroundColor,
                    borderRadius: styles.borderRadius,
                    width: styles.width,
                    height: styles.height
                };
            });
            console.log('\n🎨 Letter styles:');
            console.log(JSON.stringify(letterStyles, null, 2));
        } else {
            console.log('❌ No answer options found - exam might not have loaded');
        }

        console.log('\n⏸️  Browser will stay open for inspection (30s)...');
        await page.waitForTimeout(30000);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
    }
})();
