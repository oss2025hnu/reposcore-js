#!/usr/bin/env node

const { program } = require('commander');
const RepoAnalyzer = require('./lib/analyzer');
const generateCsv = require('./lib/generateCsv');

program
    .option('-a, --api-key <token>', 'Github Access Token (optional)')
    .option('-r, --repo <path>', 'Repository path (e.g., user/repo)')
    .option('-o, --output <dir>', 'Output directory', 'results')
    .option('-f, --format <type>', 'Output format (table, chart, both, csv)', 'both');

program.parse(process.argv);
const options = program.opts();

(async () => {
    try {

        // Initialize analyzer with repo path
        const analyzer = new RepoAnalyzer(options.repo, options.apiKey);
        await analyzer.validateToken();

        // Collect data
        console.log('Collecting data...');
        await analyzer.collectPRsAndIssues();

        // Calculate scores
        const scores = analyzer.calculateScores();



        // Generate outputs based on format
        if (options.format === 'table' || options.format === 'both') {
            analyzer.generateTable(scores);
        }
        if (options.format === 'chart' || options.format === 'both') {
            await analyzer.generateChart(scores);
            // console.log('Chart saved as participation_chart.png');
        }
        if (options.format === 'csv') {
            generateCsv(scores, options.output);
            console.log(`CSV 파일이 ${options.output}에 저장되었습니다.`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
})();