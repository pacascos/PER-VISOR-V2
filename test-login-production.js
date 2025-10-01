#!/usr/bin/env node
/**
 * Script para probar el login en bancotest.com
 */

const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Probando login en bancotest.com...');
  
  const browser = await chromium.launch({ 
    headless: false, 
    devtools: true,
    slowMo: 1000 
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. Navegar a bancotest.com
    console.log('🌐 Navegando a bancotest.com...');
    await page.goto('https://bancotest.com');
    await page.waitForLoadState('networkidle');
    console.log('✅ Página principal cargada');
    
    // 2. Verificar que la página carga correctamente
    const title = await page.title();
    console.log(`📄 Título de la página: ${title}`);
    
    // 3. Tomar captura de la página principal
    await page.screenshot({ 
      path: 'login-test-homepage.png',
      fullPage: true 
    });
    console.log('📸 Captura de página principal guardada');
    
    // 4. Buscar el formulario de login
    console.log('🔍 Buscando formulario de login...');
    
    // Intentar encontrar el formulario de login
    const usernameField = await page.$('#username');
    const passwordField = await page.$('#password');
    const loginButton = await page.$('#loginButton');
    
    if (usernameField && passwordField && loginButton) {
      console.log('✅ Formulario de login encontrado');
      
      // 5. Rellenar el formulario
      console.log('📝 Rellenando formulario de login...');
      await page.fill('#username', 'testuser');
      await page.fill('#password', '123');
      
      // 6. Tomar captura antes del login
      await page.screenshot({ 
        path: 'login-test-before.png',
        fullPage: true 
      });
      console.log('📸 Captura antes del login guardada');
      
      // 7. Hacer clic en login
      console.log('🔐 Intentando hacer login...');
      await page.click('#loginButton');
      
      // 8. Esperar a que se procese el login
      await page.waitForTimeout(3000);
      
      // 9. Verificar si el login fue exitoso
      console.log('🔍 Verificando resultado del login...');
      
      // Buscar indicadores de login exitoso
      const userMenu = await page.$('.user-menu');
      const logoutButton = await page.$('#logoutButton');
      const adminLink = await page.$('a[href*="admin-panel"]');
      
      if (userMenu || logoutButton) {
        console.log('✅ Login exitoso - Usuario autenticado');
        
        // 10. Verificar si es admin
        if (adminLink) {
          console.log('✅ Usuario tiene acceso de administrador');
          
          // Hacer clic en el panel de admin
          console.log('🔧 Accediendo al panel de administración...');
          await adminLink.click();
          await page.waitForLoadState('networkidle');
          
          // Verificar que el panel de admin carga
          const adminPanel = await page.$('#adminPanel');
          if (adminPanel) {
            console.log('✅ Panel de administración cargado correctamente');
          }
        } else {
          console.log('⚠️ Usuario no tiene acceso de administrador');
        }
        
      } else {
        console.log('❌ Login fallido - Usuario no autenticado');
        
        // Buscar mensajes de error
        const errorMessage = await page.$('.error-message');
        if (errorMessage) {
          const errorText = await errorMessage.textContent();
          console.log(`❌ Mensaje de error: ${errorText}`);
        }
      }
      
      // 11. Tomar captura final
      await page.screenshot({ 
        path: 'login-test-after.png',
        fullPage: true 
      });
      console.log('📸 Captura después del login guardada');
      
    } else {
      console.log('❌ Formulario de login no encontrado');
      console.log('🔍 Elementos encontrados:');
      console.log(`   - Username field: ${usernameField ? '✅' : '❌'}`);
      console.log(`   - Password field: ${passwordField ? '✅' : '❌'}`);
      console.log(`   - Login button: ${loginButton ? '✅' : '❌'}`);
      
      // Buscar otros posibles selectores
      console.log('🔍 Buscando otros selectores de login...');
      const alternativeSelectors = [
        'input[type="text"]',
        'input[type="password"]',
        'input[name="username"]',
        'input[name="password"]',
        'button[type="submit"]',
        '.login-form',
        '#login',
        '.auth-form'
      ];
      
      for (const selector of alternativeSelectors) {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ Encontrado: ${selector}`);
        }
      }
    }
    
    // 12. Verificar estado de la API
    console.log('🔍 Verificando estado de la API...');
    try {
      const apiResponse = await page.request.get('https://bancotest.com/api/health');
      console.log(`📡 API Status: ${apiResponse.status()}`);
      
      if (apiResponse.status() === 200) {
        const apiData = await apiResponse.json();
        console.log('✅ API funcionando correctamente');
        console.log(`📊 API Response: ${JSON.stringify(apiData)}`);
      } else {
        console.log('❌ API no responde correctamente');
      }
    } catch (error) {
      console.log('❌ Error al verificar API:', error.message);
    }
    
    console.log('✅ Prueba de login completada');
    console.log('📸 Capturas guardadas:');
    console.log('   - login-test-homepage.png');
    console.log('   - login-test-before.png');
    console.log('   - login-test-after.png');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    
    // Tomar captura de error
    await page.screenshot({ 
      path: 'login-test-error.png',
      fullPage: true 
    });
    console.log('📸 Captura de error guardada');
    
  } finally {
    // Mantener el navegador abierto para inspección manual
    console.log('🔍 Navegador mantenido abierto para inspección manual');
    console.log('💡 Presiona Ctrl+C para cerrar');
    
    // Esperar hasta que el usuario cierre manualmente
    await new Promise(() => {});
  }
})().catch(console.error);
