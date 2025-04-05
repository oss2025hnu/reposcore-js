#!/usr/bin/env node

const { program } = require('commander');
const RepoAnalyzer = require('./lib/analyzer');

program
    .option('-r, --repo <path>', 'Repository path (e.g., user/repo)')
    .option('-o, --output <dir>', 'Output directory', 'results')
    .option('-f, --format <type>', 'Output format (table, chart, both)', 'both');

program.parse(process.argv);
const options = program.opts();

(async () => {
    try {
        // Initialize analyzer with repo path
        const analyzer = new RepoAnalyzer(options.repo);

        // Collect data
        console.log('Collecting data...');
        await analyzer.collectPRs();
        await analyzer.collectIssues();

        // Calculate scores
        const scores = analyzer.calculateScores();

        // Generate outputs based on format
        if (options.format === 'table' || options.format === 'both') {
            analyzer.generateTable(scores);
        }
        if (options.format === 'chart' || options.format === 'both') {
            await analyzer.generateChart(scores);
            console.log('Chart saved as participation_chart.png');
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
})();