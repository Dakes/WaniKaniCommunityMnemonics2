// Create a simple script to prepend the full header
const fs = require('fs');
const path = require('path');

const metaJson = require('./meta.json');
const packageJson = require('./package.json');
const targetFile = path.resolve(__dirname, 'dist/WKCM2.user.js');

// Function to create userscript header from meta.json
function createUserscriptHeader(meta) {
  let header = '// ==UserScript==\n';
  
  // Add name, namespace, version
  header += `// @name         ${meta.name}\n`;
  header += `// @namespace    ${meta.namespace}\n`;
  header += `// @version      ${meta.version}\n`;
  
  // Add description if available
  if (meta.description) {
    header += `// @description  ${meta.description}\n`;
  }
  
  // Add author if available
  if (meta.author) {
    header += `// @author       ${meta.author}\n`;
  }
  
  // Add copyright if available
  if (meta.copyright) {
    header += `// @copyright    ${meta.copyright}\n`;
  }
  
  // Add license as a simple identifier
  if (meta.license) {
    header += `// @license      ${meta.license}\n`;
  }
  
  // Add homepage if available
  if (meta.homepage) {
    header += `// @homepage     ${meta.homepage}\n`;
  }
  
  // Add downloadURL if available
  if (meta.downloadURL) {
    header += `// @downloadURL  ${meta.downloadURL}\n`;
  }
  
  // Add matches
  if (meta.match && Array.isArray(meta.match)) {
    meta.match.forEach(match => {
      header += `// @match        ${match}\n`;
    });
  }
  
  // Add requires
  if (meta.require && Array.isArray(meta.require)) {
    meta.require.forEach(req => {
      header += `// @require      ${req}\n`;
    });
  }
  
  // Add grants
  if (meta.grant && Array.isArray(meta.grant)) {
    meta.grant.forEach(grant => {
      header += `// @grant        ${grant}\n`;
    });
  }
  
  // Add resources
  if (meta.resource) {
    for (const [key, value] of Object.entries(meta.resource)) {
      header += `// @resource     ${key} ${value}\n`;
    }
  }
  
  header += '// ==/UserScript==\n\n';
  return header;
}

try {
  // Read the current file content
  let fileContent = fs.readFileSync(targetFile, 'utf8');
  
  // Strip any existing header (in case there's a partial or malformed header)
  const headerEndIndex = fileContent.indexOf('// ==/UserScript==');
  if (headerEndIndex !== -1) {
    fileContent = fileContent.substring(headerEndIndex + '// ==/UserScript=='.length);
  }

  // If any stray license or other metadata tags exist in the content, remove them
  if (fileContent.includes('// @license') || fileContent.includes('// @')) {
    const lines = fileContent.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      return !(trimmed.startsWith('// @') && 
              (trimmed.includes('@license') || 
               trimmed.includes('@grant') || 
               trimmed.includes('@resource') ||
               trimmed.includes('@require') ||
               trimmed.includes('@name') ||
               trimmed.includes('@version')));
    });
    fileContent = filteredLines.join('\n');
  }
  
  // Create the userscript header
  const header = createUserscriptHeader({
    ...metaJson,
    name: 'WaniKani Community Mnemonics 2',
    version: packageJson.version,
    description: packageJson.description,
    author: packageJson.author,
    license: packageJson.license
  });
  
  // Prepend the header and CSS script to the file content
  const cssLine = 'GM_addStyle(GM_getResourceText("css"));\n';
  
  // Add the full GPL license as a regular comment
  const fullLicense = `
/*
Copyright (C) 2022  Dakes (Daniel Ostertag) https://github.com/Dakes

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
`;
  
  // Remove the Microsoft license from the TypeScript helpers
  let cleanedContent = fileContent;
  const microsoftLicenseStart = '/******************************************************************************';
  const microsoftLicenseEnd = '***************************************************************************** */';
  
  if (cleanedContent.includes(microsoftLicenseStart) && cleanedContent.includes(microsoftLicenseEnd)) {
    const startIndex = cleanedContent.indexOf(microsoftLicenseStart);
    const endIndex = cleanedContent.indexOf(microsoftLicenseEnd) + microsoftLicenseEnd.length;
    cleanedContent = cleanedContent.substring(0, startIndex) + cleanedContent.substring(endIndex);
  }
  
  const newContent = header + cssLine + fullLicense + cleanedContent;
  
  // Write the result back to the file
  fs.writeFileSync(targetFile, newContent);
  
  console.log('Successfully added userscript header to:', targetFile);
} catch (error) {
  console.error('Error adding userscript header:', error);
}
