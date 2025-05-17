const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to execute shell commands
const exec = (cmd) => {
  try {
    console.log(`Running: ${cmd}`);
    const result = execSync(cmd, { encoding: 'utf8', stdio: 'inherit' });
    return result;
  } catch (error) {
    console.error(`Error executing command: ${cmd}`);
    console.error(error);
    process.exit(1);
  }
};

// Build the client
console.log('Building client...');
exec('cd src/client && npx vite build');

// Check if client build directory exists
const distDir = path.join(__dirname, 'src', 'client', 'dist');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(distDir)) {
  console.error(`Dist directory not found: ${distDir}`);
  process.exit(1);
}

if (!fs.existsSync(assetsDir)) {
  console.log(`Creating assets directory: ${assetsDir}`);
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Check for CSS files
const files = fs.readdirSync(assetsDir);
const cssFiles = files.filter(file => file.endsWith('.css'));
console.log('CSS files found:', cssFiles);

if (cssFiles.length === 0) {
  console.log('No CSS files found, creating fallback CSS...');
  const fallbackCss = `
  :root {
    --primary-color: #3498db;
    --primary-dark: #2980b9;
    --secondary-color: #e74c3c;
    --secondary-dark: #c0392b;
    --text-color: #333;
    --light-text: #f8f8f8;
    --bg-color: #f4f4f4;
    --card-bg: #fff;
    --border-color: #ddd;
    --success-color: #2ecc71;
    --warning-color: #f39c12;
    --error-color: #e74c3c;
  }
  
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: var(--text-color);
    background-color: var(--bg-color);
    margin: 0;
    padding: 0;
  }
  
  * {
    box-sizing: border-box;
  }
  
  .auth-page, .character-select-page, .character-create-page {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100vh;
    background: linear-gradient(135deg, #2c3e50 0%, #1a2a38 100%);
    padding: 1rem;
  }
  
  .app-layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  .app-header {
    background-color: #2c3e50;
    color: #fff;
    padding: 0 1rem;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  `;
  
  fs.writeFileSync(path.join(assetsDir, 'index.css'), fallbackCss);
  console.log('Created fallback CSS file.');
} else if (cssFiles.length > 1) {
  console.log('Multiple CSS files found, merging into index.css...');
  
  // Concatenate all CSS files
  const combinedCss = cssFiles.map(file => {
    return fs.readFileSync(path.join(assetsDir, file), 'utf8');
  }).join('\n');
  
  // Write to index.css
  fs.writeFileSync(path.join(assetsDir, 'index.css'), combinedCss);
  
  // Remove other CSS files
  cssFiles.filter(file => file !== 'index.css').forEach(file => {
    fs.unlinkSync(path.join(assetsDir, file));
  });
  
  console.log('CSS files merged.');
}

console.log('Build completed successfully!'); 