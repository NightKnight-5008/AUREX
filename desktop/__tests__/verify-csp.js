/**
 * CSP Verification Script
 * Manual verification of CSP configuration against requirements
 */
import { WindowManager } from '../lib/window-manager';
// Mock storage for testing
const mockStorage = {
    get: async () => null,
    set: async () => true,
    remove: async () => true
};
// Test CSP configuration
function verifyCsp() {
    console.log('='.repeat(80));
    console.log('CSP Configuration Verification');
    console.log('='.repeat(80));
    // Create WindowManager instances for dev and prod
    process.env.NODE_ENV = 'development';
    const devManager = new WindowManager(mockStorage);
    process.env.NODE_ENV = 'production';
    const prodManager = new WindowManager(mockStorage);
    // Access private methods via type assertion
    const devCsp = devManager.getDevCSP();
    const prodCsp = prodManager.getProdCSP();
    console.log('\n📋 Development CSP:');
    console.log(devCsp);
    console.log('\n✅ Verification:');
    verifyDevCsp(devCsp);
    console.log('\n📋 Production CSP:');
    console.log(prodCsp);
    console.log('\n✅ Verification:');
    verifyProdCsp(prodCsp);
    console.log('\n' + '='.repeat(80));
    console.log('✅ All CSP requirements verified successfully!');
    console.log('='.repeat(80));
}
function verifyDevCsp(csp) {
    const checks = [
        { name: 'Req 8.1: CSP header set', test: () => csp.length > 0 },
        { name: 'Req 8.2: script-src includes self, unsafe-inline, unsafe-eval', test: () => csp.includes("script-src 'self' 'unsafe-inline' 'unsafe-eval'") },
        { name: 'Req 8.3: style-src includes self and unsafe-inline', test: () => csp.includes("style-src 'self' 'unsafe-inline'") },
        { name: 'Req 8.4: img-src includes self, data:, https:', test: () => csp.includes("img-src 'self' data: https:") },
        { name: 'Req 8.5: font-src includes self and data:', test: () => csp.includes("font-src 'self' data:") },
        { name: 'Req 8.6: connect-src includes self, Supabase, AUREX API', test: () => csp.includes("connect-src 'self'") &&
                csp.includes("https://*.supabase.co") &&
                csp.includes("wss://*.supabase.co") &&
                csp.includes("https://api-production.creao.ai") },
        { name: 'Req 8.7: Blocks other resources (default-src)', test: () => csp.includes("default-src 'self'") },
        { name: 'Req 8.7: Blocks media (media-src)', test: () => csp.includes("media-src 'self'") },
        { name: 'Req 8.7: Blocks objects (object-src)', test: () => csp.includes("object-src 'none'") },
        { name: 'Req 8.7: Blocks frames (frame-src)', test: () => csp.includes("frame-src 'none'") },
        { name: 'Req 8.7: Restricts base URI (base-uri)', test: () => csp.includes("base-uri 'self'") },
        { name: 'Req 8.7: Restricts form actions (form-action)', test: () => csp.includes("form-action 'self'") }
    ];
    checks.forEach(check => {
        const result = check.test();
        console.log(`  ${result ? '✅' : '❌'} ${check.name}`);
        if (!result) {
            throw new Error(`Failed: ${check.name}`);
        }
    });
}
function verifyProdCsp(csp) {
    const checks = [
        { name: 'Req 8.1: CSP header set', test: () => csp.length > 0 },
        { name: 'Req 8.2: script-src only includes self (NO unsafe-inline/eval)', test: () => csp.includes("script-src 'self'") &&
                !csp.includes("'unsafe-inline'") &&
                !csp.includes("'unsafe-eval'") },
        { name: 'Req 8.3: style-src includes self and unsafe-inline', test: () => csp.includes("style-src 'self' 'unsafe-inline'") },
        { name: 'Req 8.4: img-src includes self, data:, https:', test: () => csp.includes("img-src 'self' data: https:") },
        { name: 'Req 8.5: font-src includes self and data:', test: () => csp.includes("font-src 'self' data:") },
        { name: 'Req 8.6: connect-src includes self, Supabase, AUREX API', test: () => csp.includes("connect-src 'self'") &&
                csp.includes("https://*.supabase.co") &&
                csp.includes("wss://*.supabase.co") &&
                csp.includes("https://api-production.creao.ai") },
        { name: 'Req 8.7: Blocks other resources (default-src)', test: () => csp.includes("default-src 'self'") },
        { name: 'Req 8.7: Blocks media (media-src)', test: () => csp.includes("media-src 'self'") },
        { name: 'Req 8.7: Blocks objects (object-src)', test: () => csp.includes("object-src 'none'") },
        { name: 'Req 8.7: Blocks frames (frame-src)', test: () => csp.includes("frame-src 'none'") },
        { name: 'Req 8.7: Restricts base URI (base-uri)', test: () => csp.includes("base-uri 'self'") },
        { name: 'Req 8.7: Restricts form actions (form-action)', test: () => csp.includes("form-action 'self'") }
    ];
    checks.forEach(check => {
        const result = check.test();
        console.log(`  ${result ? '✅' : '❌'} ${check.name}`);
        if (!result) {
            throw new Error(`Failed: ${check.name}`);
        }
    });
}
// Run verification
verifyCsp();
