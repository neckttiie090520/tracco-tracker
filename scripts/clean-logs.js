/**
 * Script to remove console.log statements for production
 * Run this before production deployment
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const srcDir = path.join(__dirname, '../src')

// File extensions to process
const extensions = ['.ts', '.tsx', '.js', '.jsx']

// Console methods to remove (keep console.error and console.warn for debugging)
const consoleMethods = ['console.log', 'console.debug', 'console.info']

function cleanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  let cleaned = content
  let removedCount = 0

  // Remove console statements (but keep ones in comments)
  consoleMethods.forEach(method => {
    const regex = new RegExp(`^\\s*${method.replace('.', '\\.')}\\([^)]*\\);?\\s*$`, 'gm')
    const matches = content.match(regex)
    if (matches) {
      removedCount += matches.length
      cleaned = cleaned.replace(regex, '')
    }
  })

  // Remove empty lines that might be left behind
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n')

  if (removedCount > 0) {
    fs.writeFileSync(filePath, cleaned)
    console.log(`✅ ${path.relative(srcDir, filePath)}: Removed ${removedCount} console statements`)
  }

  return removedCount
}

function processDirectory(dir) {
  let totalRemoved = 0
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      totalRemoved += processDirectory(filePath)
    } else if (extensions.some(ext => file.endsWith(ext))) {
      totalRemoved += cleanFile(filePath)
    }
  })

  return totalRemoved
}

console.log('🧹 Cleaning console.log statements...')
const totalRemoved = processDirectory(srcDir)
console.log(`\n🎉 Done! Removed ${totalRemoved} console statements total`)

if (totalRemoved > 0) {
  console.log('\n⚠️  Remember to test the application after cleaning!')
}