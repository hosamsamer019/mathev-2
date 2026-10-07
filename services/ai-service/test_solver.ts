import { SolverService } from './src/services/solver.service.js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'services/ai-service/.env') });

async function runTests() {
  console.log('Testing SolverService with test problems...\n');

  // Test 1: Quadratic
  console.log('--- Test 1: 2x² + 5x - 3 = 0 ---');
  const res1 = await SolverService.solve('حل المعادلة: 2x² + 5x - 3 = 0', 'ثانوي');
  console.log('Solution 1:', res1.solution);

  // Test 2: Simple equation
  console.log('\n--- Test 2: 2x + 6 = 0 ---');
  const res2 = await SolverService.solve('حل المعادلة: 2x + 6 = 0', 'متوسط');
  console.log('Solution 2:', res2.solution);

  // Test 3: Fraction
  console.log('\n--- Test 3: x/2 + 3 = 5 ---');
  const res3 = await SolverService.solve('حل المعادلة: x/2 + 3 = 5', 'متوسط');
  console.log('Solution 3:', res3.solution);

  // Test 4: Square root
  console.log('\n--- Test 4: x² = 16 ---');
  const res4 = await SolverService.solve('حل المعادلة: x² = 16', 'متوسط');
  console.log('Solution 4:', res4.solution);

  // Test 5: Existing normal solver case
  console.log('\n--- Test 5: 2x + 5 = 15 ---');
  const res5 = await SolverService.solve('حل المعادلة: 2x + 5 = 15', 'متوسط');
  console.log('Solution 5:', res5.solution);
}

runTests().catch(console.error);
