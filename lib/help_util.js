const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HELP_COMMAND = 'node index.js --help';
const README_PATH = path.join(__dirname, '..', 'READMEHelp.md');

function getHelpText() {
  try {
    return execSync(HELP_COMMAND, { encoding: 'utf8' });
  } catch (error) {
    console.error('Error getting help text:', error);
    process.exit(1);
  }
}

function updateUsageSection(readmeContent, newUsage) {
  const startTag = '<!-- usage:start -->';
  const endTag = '<!-- usage:end -->';
  const usageBlockRegex = new RegExp(`${startTag}[\\s\\S]*?${endTag}`);

  const replacement = `${startTag}\n\n\`\`\`bash\n${newUsage}\n\n${endTag}`;

  if (usageBlockRegex.test(readmeContent)) {
    return readmeContent.replace(usageBlockRegex, replacement);
  } else {
    return `${readmeContent.trim()}${replacement}`;
  }
}

function main() {
  const helpText = getHelpText();
  const readmeContent = fs.existsSync(README_PATH)
    ? fs.readFileSync(README_PATH, 'utf8')
    : '';

  const updatedReadme = updateUsageSection(readmeContent, helpText);
  fs.writeFileSync(README_PATH, updatedReadme, 'utf8');

  console.log('READMEHelp.md usage section updated.');
}

main();