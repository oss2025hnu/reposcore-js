const { Octokit } = require('@octokit/rest');
const Table = require('cli-table3');

class RepoAnalyzer {
    constructor(repoPath) {
        this.repoPath = repoPath;
        this.participants = new Map();
        this.octokit = new Octokit(); // Still included but unused in stubs
    }

    async collectCommits() {
        console.log('Collecting commits...');
        // Stub data for demonstration
        this.participants.set('alice', { commits: 5, issues: 0, comments: 0 });
        this.participants.set('bob', { commits: 3, issues: 0, comments: 0 });
    }

    async collectIssues() {
        console.log('Collecting issues...');
        // Deterministic stub data, building on commit data
        this.participants.forEach((data, name) => {
            data.issues = 2;    // Fixed: 2 issues per participant
            data.comments = 3;  // Fixed: 3 comments per participant
        });
        // Add a new participant with fixed values
        if (!this.participants.has('charlie')) {
            this.participants.set('charlie', { commits: 1, issues: 2, comments: 3 });
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
    }
}

module.exports = RepoAnalyzer;
