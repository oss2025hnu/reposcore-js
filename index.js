#!/usr/bin/env node

const { program } = require('commander');
const RepoAnalyzer = require('./lib/analyzer');


program
    .option('-a, --api-key <token>', 'Github Access Token (optional)')
    .option('-t, --text', 'Save table as text file')
    .option('-r, --repo <path>', 'Repository path (e.g., user/repo)')
    .option('-o, --output <dir>', 'Output directory', 'results')
    .option('-f, --format <type>', 'Output format (table, chart, both)', 'both');

program.parse(process.argv);
const options = program.opts();

(async () => {
    try {

        if (!options.repo) {
            console.error('Error :  -r (--repo) 옵션을 필수로 사용하여야 합니다. 예) node index.js -r oss2025hnu/reposcore-js');
            program.help();
            process.exit(1);
        }

        // Initialize analyzer with repo path
        const analyzer = new RepoAnalyzer(options.repo, options.apiKey);
        await analyzer.validateToken();

        // Collect data
        console.log('Collecting data...');
        await analyzer.collectPRsAndIssues();

        // Calculate scores
        const scores = analyzer.calculateScores();

        // Calculate AverageScore
        await analyzer.calculateAverageScore(scores);

        // Generate outputs based on format
        if (options.format === 'table' || options.format === 'both') {
            analyzer.generateTable(scores, options.text);
        }
        if (options.format === 'chart' || options.format === 'both') {
            await analyzer.generateChart(scores);
            // console.log('Chart saved as participation_chart.png');
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
})();