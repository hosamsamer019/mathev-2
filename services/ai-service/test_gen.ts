import { GeneratorService } from './src/services/generator.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const res = await GeneratorService.generateMCQ('Equations', 'Easy', 1);
    console.log('Success:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error in GeneratorService:', err);
  }
}

test();
