import { execSync } from 'child_process';
import path from 'path';

/**
 * Simple runner script for the reference check test
 */
async function runReferenceCheckTest() {
  console.log('🚀 Running Reference Check Test...');
  console.log('=' .repeat(50));
  
  try {
    const scriptPath = path.join(__dirname, 'test-admin-sync-check-by-reference.ts');
    
    // Run the test script using ts-node
    execSync(`npx ts-node ${scriptPath}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runReferenceCheckTest();
}

export { runReferenceCheckTest };