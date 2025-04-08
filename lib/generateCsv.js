const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

function generateCsv(scores, outputDir) {
  const outputPath = path.resolve(outputDir);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const csvWriter = createObjectCsvWriter({
    path: path.join(outputPath, 'scores.csv'),
    header: [
      { id: 'name', title: 'Name' },
      { id: 'score', title: 'Score' },
    ],
  });

  const records = Object.entries(scores).map(([name, score]) => ({ name, score }));

  csvWriter.writeRecords(records)
    .then(() => console.log('CSV file successfully created.'))
    .catch((err) => console.error('Error writing CSV file:', err));
}

module.exports = generateCsv;