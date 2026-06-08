import { readFileSync } from 'node:fs';

const routeFiles = [
  'src/app/api/auth/oauth/[provider]/callback/route.ts',
  'src/app/api/auth/oauth/[provider]/redirect/route.ts',
];

const forbiddenPatterns = [
  /NextResponse\.redirect\([\s\S]*?request\.url[\s\S]*?\)/m,
  /NextResponse\.redirect\([\s\S]*?request\.nextUrl\.origin[\s\S]*?\)/m,
  /NextResponse\.redirect\([\s\S]*?headers\(\)[\s\S]*?host[\s\S]*?\)/m,
  /NextResponse\.redirect\([\s\S]*?process\.env\.HOSTNAME[\s\S]*?\)/m,
  /NextResponse\.redirect\([\s\S]*?0\.0\.0\.0[\s\S]*?\)/m,
];

const failures = [];

for (const routeFile of routeFiles) {
  const source = readFileSync(routeFile, 'utf8');

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      failures.push(`${routeFile} matches forbidden redirect base pattern: ${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error('OAuth public redirect check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('OAuth public redirect check passed.');
