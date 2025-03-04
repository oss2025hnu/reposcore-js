const { Octokit } = require('@octokit/rest');
const Table = require('cli-table3');

class RepoAnalyzer {
    constructor(repoPath) {
        this.repoPath = repoPath;
        this.participants = new Map();
        this.octokit = new Octokit(); // Add GitHub token in practice for authentication
    }

    async collectCommits() {
        // Placeholder: Use gitlog or similar for local repo analysis
        console.log('Collecting commits...');
        // Example stub data (replace with real implementation)
        this.participants.set('alice', { commits: 5, issues: 0, comments: 0 });
        this.participants.set('bob', { commits: 3, issues: 0, comments: 0 });
    }

    async collectIssues() {
        // Example GitHub API call
        const [owner, repo] = this.repoPath.split('/');
        try {
            const issues = await this.octokit.issues.listForRepo({ owner, repo });
            // Process issues (placeholder)
            console.log('Collecting issues...');
            // Update participant data (stub example)
            this.participants.forEach((data, name) => {
                data.issues = Math.floor(Math.random() * 3); // Random stub
                data.comments = Math.floor(Math.random() * 5); // Random stub
            });
        } catch (error) {
            throw new Error(`Failed to fetch issues: ${error.message}`);
        }
    }

    calculateScores() {
        const scores = {};
        for (const [participant, data] of this.participants) {
            scores[participant] = (data.commits || 0) * 0.4 +
                                 (data.issues || 0) * 0.3 +
                                 (data.comments || 0) * 0.3;
        }
        return scores;
    }

    generateTable(scores) {
        const table = new Table({ head: ['Participant', 'Score'] });
        Object.entries(scores).forEach(([name, score]) => table.push([name, score.toFixed(2)]));
        console.log(table.toString());
    }

    async generateChart(scores) {
        // Placeholder: Requires a charting library and canvas setup for CLI
        console.log('Chart generation placeholder');
        // Note: For actual charts, you'd need node-canvas and chart.js, saving to PNG
    }
}

module.exports = RepoAnalyzer;
