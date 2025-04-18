import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 현재 디렉토리 경로 설정
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THEMES_FILE_PATH = path.join(__dirname, '..', 'themes.json');

// 기본값으로 사용할 테마 객체
const DEFAULT_THEME = {
    colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529'
    },
    table: {
        head: ['yellow'],
        border: ['gray']
    },
    chart: {
        backgroundColor: '#ffffff',
        textColor: '#212529',
        gridColor: '#e9ecef',
        barColors: [
            'rgb(0, 0, 0)',          // 0~9: 검은색
            'rgb(60, 60, 60)',       // 10~19: 어두운 회색
            'rgb(120, 120, 120)',    // 20~29: 중간 회색
            'rgb(180, 180, 180)',    // 30~39: 밝은 회색
            'rgb(144, 238, 144)',    // 40~49: 연두색
            'rgb(100, 200, 100)',    // 50~59: 진한 연두
            'rgb(30, 144, 255)',     // 60~69: 청색
            'rgb(65, 105, 225)',     // 70~79: 진한 청색
            'rgb(138, 43, 226)',     // 80~89: 보라색
            'rgb(186, 85, 211)',     // 90~99: 연보라색
            'rgb(255, 0, 0)'         // 100: 빨간색
        ]
    }
};

// 다크 테마 기본값
const DARK_THEME = {
    colors: {
        primary: '#0d6efd',
        secondary: '#6c757d',
        background: '#212529',
        text: '#f8f9fa'
    },
    table: {
        head: ['cyan'],
        border: ['gray']
    },
    chart: {
        backgroundColor: '#212529',
        textColor: '#f8f9fa',
        gridColor: '#495057',
        barColors: {
            first: 'rgb(255, 215, 0)',    // Gold
            second: 'rgb(192, 192, 192)', // Silver
            third: 'rgb(205, 127, 50)',   // Bronze
            others: 'rgb(169, 169, 169)'  // Gray
        }
    }
};

class ThemeManager {
    constructor() {
        // 맵 대신 일반 객체 사용
        this.themes = {
            'default': DEFAULT_THEME,
            'dark': DARK_THEME
        };
        this.currentTheme = 'default';
    }

    // 테마 파일에서 저장된 테마 로드
    async loadThemes() {
        try {
            const data = await fs.readFile(THEMES_FILE_PATH, 'utf8');
            const savedThemes = JSON.parse(data);
            // 기본 테마와 저장된 테마 병합
            this.themes = { ...this.themes, ...savedThemes };
            const customThemeCount = Object.keys(savedThemes).length;
            if (customThemeCount > 0) {
                console.log(`테마 파일에서 ${customThemeCount}개의 커스텀 테마를 로드했습니다.`);
            }
        } catch (err) {
            // 파일이 없는 경우 무시
            if (err.code !== 'ENOENT') {
                console.error('테마 파일 로드 중 오류:', err.message);
            }
        }
    }

    // 테마 파일에 테마 저장
    async saveThemes() {
        try {
            // 기본 테마는 제외하고 커스텀 테마만 저장
            const customThemes = { ...this.themes };
            delete customThemes['default'];
            delete customThemes['dark'];
            
            await fs.writeFile(THEMES_FILE_PATH, JSON.stringify(customThemes, null, 2), 'utf8');
        } catch (err) {
            console.error('테마 파일 저장 중 오류:', err.message);
        }
    }

    addTheme(name, theme) {
        // 기본 테마 구조 가져오기
        const defaultTheme = this.themes['default'];
        
        // 새 테마에 누락된 속성은 기본 테마에서 가져와 병합
        const mergedTheme = {
            colors: {
                ...defaultTheme.colors,
                ...(theme.colors || {})
            },
            table: {
                ...defaultTheme.table,
                ...(theme.table || {})
            },
            chart: {
                ...defaultTheme.chart,
                ...(theme.chart || {}),
                barColors: {
                    ...defaultTheme.chart.barColors,
                    ...(theme.chart?.barColors || {})
                }
            }
        };
        
        this.themes[name] = mergedTheme;
        this.saveThemes();
        return mergedTheme;
    }

    setTheme(name) {
        if (this.themes[name]) {
            this.currentTheme = name;
            return true;
        }
        return false;
    }

    getCurrentTheme() {
        return this.themes[this.currentTheme] || this.themes['default'];
    }

    getAvailableThemes() {
        return Object.keys(this.themes);
    }

    applyTableTheme(table) {
        const theme = this.getCurrentTheme();
        if (theme && theme.table) {
            table.style = {
                head: theme.table.head,
                border: theme.table.border
            };
        }
    }

    applyChartTheme(chart) {
        const theme = this.getCurrentTheme();
        if (theme && theme.chart) {
            chart.options = {
                ...chart.options,
                backgroundColor: theme.chart.backgroundColor,
                textColor: theme.chart.textColor,
                gridColor: theme.chart.gridColor,
                barColors: theme.chart.barColors
            };
        }
    }

    applyTextTheme(text) {
        try {
            const theme = this.getCurrentTheme();
            if (theme && theme.colors && theme.colors.text) {
                return chalk.hex(theme.colors.text)(text);
            }
        } catch (err) {
            console.error('Error applying text theme:', err);
        }
        return text;
    }
}

export default ThemeManager; 