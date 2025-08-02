/**
 * Script to find potentially unused components and files
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const srcDir = path.join(__dirname, '../src')

// Files to exclude from unused check
const excludePatterns = [
  'main.tsx',
  'App.tsx',
  'vite-env.d.ts',
  'index.css',
  '.d.ts',
  'test.',
  'spec.',
]

function getAllTsxFiles(dir, files = []) {
  const items = fs.readdirSync(dir)
  
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory()) {
      getAllTsxFiles(fullPath, files)
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      files.push(fullPath)
    }
  }
  
  return files
}

function getFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

function extractImports(content) {
  const imports = []
  const importRegex = /import\s+(?:{[^}]*}|\w+|(?:{[^}]*})\s*,\s*\w+)\s+from\s+['"]([^'"]+)['"]/g
  let match
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1])
  }
  
  return imports
}

function findUnusedFiles() {
  console.log('🔍 Scanning for potentially unused files...\n')
  
  const allFiles = getAllTsxFiles(srcDir)
  const allContent = allFiles.map(file => getFileContent(file)).join('\n')
  
  const unused = []
  
  for (const file of allFiles) {
    const relativePath = path.relative(srcDir, file)
    const fileName = path.basename(file, path.extname(file))
    
    // Skip excluded files
    if (excludePatterns.some(pattern => relativePath.includes(pattern))) {
      continue
    }
    
    // Check if file is imported anywhere
    const importPatterns = [
      `'${relativePath.replace(/\\/g, '/')}'`,
      `"${relativePath.replace(/\\/g, '/')}"`,
      `'${relativePath.replace(/\\/g, '/').replace(/\.(tsx?|jsx?)$/, '')}'`,
      `"${relativePath.replace(/\\/g, '/').replace(/\.(tsx?|jsx?)$/, '')}"`,
      `/${fileName}'`,
      `/${fileName}"`,
      `{${fileName}}`,
    ]
    
    const isImported = importPatterns.some(pattern => 
      allContent.includes(pattern)
    )
    
    if (!isImported) {
      unused.push(relativePath)
    }
  }
  
  return unused
}

function analyzeComponentUsage() {
  console.log('📊 Analyzing component usage...\n')
  
  const allFiles = getAllTsxFiles(srcDir)
  const componentUsage = new Map()
  
  // Find component exports
  for (const file of allFiles) {
    const content = getFileContent(file)
    const relativePath = path.relative(srcDir, file)
    
    // Find exported components
    const exportRegex = /export\s+(?:const|function|class)\s+(\w+)/g
    let match
    
    while ((match = exportRegex.exec(content)) !== null) {
      const componentName = match[1]
      componentUsage.set(componentName, {
        file: relativePath,
        usageCount: 0,
        usedIn: []
      })
    }
  }
  
  // Count usages
  for (const file of allFiles) {
    const content = getFileContent(file)
    const relativePath = path.relative(srcDir, file)
    
    for (const [componentName, info] of componentUsage) {
      if (info.file === relativePath) continue // Skip self-reference
      
      const usageRegex = new RegExp(`\\b${componentName}\\b`, 'g')
      const matches = content.match(usageRegex)
      
      if (matches) {
        info.usageCount += matches.length
        info.usedIn.push(relativePath)
      }
    }
  }
  
  return componentUsage
}

// Run analysis
const unusedFiles = findUnusedFiles()
const componentUsage = analyzeComponentUsage()

// Report unused files
if (unusedFiles.length > 0) {
  console.log('🚨 Potentially unused files:')
  unusedFiles.forEach(file => console.log(`   ${file}`))
  console.log()
} else {
  console.log('✅ No obviously unused files found\n')
}

// Report low-usage components
const lowUsageComponents = Array.from(componentUsage.entries())
  .filter(([_, info]) => info.usageCount === 0)
  .sort((a, b) => a[1].usageCount - b[1].usageCount)

if (lowUsageComponents.length > 0) {
  console.log('🚨 Potentially unused components:')
  lowUsageComponents.forEach(([name, info]) => {
    console.log(`   ${name} in ${info.file} (used ${info.usageCount} times)`)
  })
  console.log()
} else {
  console.log('✅ All components appear to be used\n')
}

// Summary
console.log('📈 Summary:')
console.log(`   Total files scanned: ${getAllTsxFiles(srcDir).length}`)
console.log(`   Potentially unused files: ${unusedFiles.length}`)
console.log(`   Potentially unused components: ${lowUsageComponents.length}`)
console.log(`   Total components found: ${componentUsage.size}`)

if (unusedFiles.length > 0 || lowUsageComponents.length > 0) {
  console.log('\n⚠️  Manual verification recommended before deleting files!')
}