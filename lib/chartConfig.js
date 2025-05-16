/**
 * 차트 생성을 위한 기본 설정값
 */
export const CHART_CONFIG = {
    dimensions: {
        width: 800,
        barHeight: 30
    },
    defaultTheme: {
        chart: {
            issueColor: 'rgba(255, 99, 132, 0.8)',  // 예: 빨간색
            prColor: 'rgba(54, 162, 235, 0.8)',     // 예: 파란색
            textColor: '#ffffff',
            gridColor: '#444',
            backgroundColor: '#1e1e1e',
        }
    },
    fonts: {
        title: {
            size: 16,
            weight: 'bold'
        },
        subtitle: {
            size: 12
        },
        dataLabels: {
            weight: 'bold'
        }
    },
    padding: {
        subtitle: {
            top: 0,
            bottom: 10
        }
    }
}; 