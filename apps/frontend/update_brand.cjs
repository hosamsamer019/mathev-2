const fs = require('fs');
const path = require('path');

const files = [
  'src/app/components/auth/AdminLoginPage.tsx',
  'src/app/components/auth/ForgotPasswordPage.tsx',
  'src/app/components/auth/LoginPage.tsx',
  'src/app/components/auth/RegisterPage.tsx',
  'src/app/components/auth/ResetPasswordPage.tsx',
  'src/app/components/landing/LandingPage.tsx',
  'src/app/components/shared/SharedLayout.tsx'
];

files.forEach(file => {
  const fullPath = path.join('d:\\Mathe\\Mathteachersmartplatform-main\\apps\\frontend', file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // Replace logos
  content = content.replace(/<div className="w-10 h-10 bg-gradient-to-br[^>]*>[\s\S]*?<\/div>/g, '<img src="/logo.jpeg" alt="AL-SADEN Logo" className="w-10 h-10 rounded-xl object-contain bg-white" />');
  
  content = content.replace(/<div className="w-12 h-12 bg-gradient-to-br[^>]*>[\s\S]*?<\/div>/g, '<img src="/logo.jpeg" alt="AL-SADEN Logo" className="inline-block w-16 h-16 bg-white rounded-2xl mb-4 shadow-2xl object-contain" />');
  
  content = content.replace(/<div className="w-16 h-16 bg-gradient-to-br[^>]*>[\s\S]*?<\/div>/g, '<img src="/logo.jpeg" alt="AL-SADEN Logo" className="inline-block w-16 h-16 bg-white rounded-2xl mb-4 shadow-2xl object-contain" />');

  content = content.replace(/<div className="w-10 h-10 bg-white\/20 rounded-xl flex items-center justify-center flex-shrink-0">\s*<span className="text-white font-bold text-lg">م<\/span>\s*<\/div>/g, '<img src="/logo.jpeg" alt="AL-SADEN Logo" className="w-10 h-10 bg-white rounded-xl object-contain flex-shrink-0" />');

  // Replace names
  content = content.replace(/Math Teacher Smart Platform/g, 'AL-SADEN');
  content = content.replace(/Smart Math Platform/g, 'AL-SADEN');
  content = content.replace(/منصة معلم الرياضيات/g, 'AL-SADEN');

  // Only replace colors in public pages
  if (file !== 'src/app/components/shared/SharedLayout.tsx') {
    content = content.replace(/indigo/g, 'brand');
    content = content.replace(/purple/g, 'brand-accent');
    content = content.replace(/violet/g, 'brand-accent');
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${file}`);
});
