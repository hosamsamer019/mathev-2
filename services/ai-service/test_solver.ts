import { SolverService } from './src/services/solver.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function testSolver() {
  try {
    const res = await SolverService.solve('حل المعادلة: 2x + 5 = 15', 'متوسط');
    console.log('Success:', res.solution);
  } catch (err) {
    console.error('Error in SolverService:', err);
  }
}

testSolver();
