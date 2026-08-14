const r1 = /\\\\\(/g;
console.log('r1 matches \\( ?', r1.test('\\('));
console.log('r1 matches \\\\( ?', r1.test('\\\\('));

const r2 = /\\\\\[/g;
console.log('r2 matches \\[ ?', r2.test('\\['));
console.log('r2 matches \\\\[ ?', r2.test('\\\\['));
