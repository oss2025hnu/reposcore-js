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
            backgroundColor: '#ffffff',
            textColor: '#212529',
            gridColor: '#e9ecef',
            barColors: {
                first: 'rgb(255, 215, 0)',    // Gold
                second: 'rgb(192, 192, 192)', // Silver
                third: 'rgb(205, 127, 50)',   // Bronze
                others: 'rgb(169, 169, 169)'  // Gray
            }
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