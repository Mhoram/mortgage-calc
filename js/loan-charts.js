/**
 * Loan Charts Module
 * Chart initialization and update functions for the Loan Calculator tab
 */

const LoanCharts = {
    balanceChart: null,
    paymentChart: null,
    cumulativeChart: null,
    pieChart: null,

    colors: {
        blue: '#3498db',
        blueBg: 'rgba(52, 152, 219, 0.1)',
        orange: '#e67e22',
        orangeBg: 'rgba(230, 126, 34, 0.8)',
        purple: '#8e44ad',
        purpleBg: 'rgba(142, 68, 173, 0.8)',
    },

    init() {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12, padding: 10 }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: value => LoanApp.getCurrencySymbol() + (LoanApp.convertCurrency(value) / 1000).toFixed(0) + 'k'
                    }
                }
            }
        };

        this.balanceChart = new Chart(document.getElementById('loanBalanceChart'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...chartOptions,
                plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.dataset.label + ': ' + LoanApp.formatCurrency(ctx.parsed.y)
                        }
                    }
                }
            }
        });

        this.paymentChart = new Chart(document.getElementById('loanPaymentChart'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        stacked: true,
                        ticks: {
                            callback: value => LoanApp.getCurrencySymbol() + LoanApp.convertCurrency(value).toFixed(0)
                        }
                    },
                    x: {
                        ticks: { maxTicksLimit: 10 }
                    }
                }
            }
        });

        this.cumulativeChart = new Chart(document.getElementById('loanCumulativeChart'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        stacked: true,
                        ticks: {
                            callback: value => LoanApp.getCurrencySymbol() + (LoanApp.convertCurrency(value) / 1000).toFixed(1) + 'k'
                        }
                    }
                }
            }
        });

        this.pieChart = new Chart(document.getElementById('loanPieChart'), {
            type: 'pie',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((ctx.parsed / total) * 100).toFixed(1);
                                return ctx.label + ': ' + LoanApp.formatCurrency(ctx.parsed) + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'loanPercentageLabels',
                afterDraw: (chart) => {
                    const ctx = chart.ctx;
                    const dataset = chart.data.datasets[0];
                    if (!dataset || !dataset.data || dataset.data.length === 0) return;

                    const total = dataset.data.reduce((a, b) => a + b, 0);
                    const meta = chart.getDatasetMeta(0);

                    meta.data.forEach((arc, index) => {
                        const percentage = ((dataset.data[index] / total) * 100).toFixed(1);
                        const centerPoint = arc.tooltipPosition();

                        ctx.save();
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(percentage + '%', centerPoint.x, centerPoint.y);
                        ctx.restore();
                    });
                }
            }]
        });
    },

    update({ standard, withOverpayments, startYear, termYears, principal, hasOverpayments }) {
        const endYear = startYear + termYears;

        const yearLabels = [];
        for (let y = startYear; y <= endYear; y++) {
            yearLabels.push(y.toString());
        }

        const standardYearlyBalances = [];
        const overpaymentYearlyBalances = [];
        for (let y = 0; y <= termYears; y++) {
            const monthIndex = y * 12;
            standardYearlyBalances.push(standard.balances[monthIndex] !== undefined ? standard.balances[monthIndex] : null);
            overpaymentYearlyBalances.push(withOverpayments.balances[monthIndex] !== undefined ? withOverpayments.balances[monthIndex] : null);
        }

        this._updateBalanceChart({ yearLabels, standardYearlyBalances, overpaymentYearlyBalances, hasOverpayments });
        this._updatePaymentChart({ data: hasOverpayments ? withOverpayments : standard, startYear });
        this._updateCumulativeChart({ data: hasOverpayments ? withOverpayments : standard, startYear });
        this._updatePieChart({ principal, totalInterest: hasOverpayments ? withOverpayments.totalInterest : standard.totalInterest });
    },

    _updateBalanceChart({ yearLabels, standardYearlyBalances, overpaymentYearlyBalances, hasOverpayments }) {
        this.balanceChart.data.labels = yearLabels;
        this.balanceChart.data.datasets = [
            {
                label: 'Standard',
                data: standardYearlyBalances,
                borderColor: this.colors.blue,
                backgroundColor: this.colors.blueBg,
                fill: true,
                tension: 0.1
            }
        ];

        if (hasOverpayments) {
            this.balanceChart.data.datasets.push({
                label: 'With Overpayments',
                data: overpaymentYearlyBalances,
                borderColor: this.colors.orange,
                backgroundColor: 'rgba(230, 126, 34, 0.1)',
                fill: true,
                tension: 0.1
            });
        }
        this.balanceChart.update();
    },

    _updatePaymentChart({ data, startYear }) {
        const paymentYearLabels = [];
        const principalYearly = [];
        const interestYearly = [];

        for (let y = 0; y < Math.ceil(data.principalPayments.length / 12); y++) {
            paymentYearLabels.push((startYear + y).toString());
            let pSum = 0, iSum = 0, count = 0;
            for (let m = 0; m < 12; m++) {
                const idx = y * 12 + m;
                if (idx < data.principalPayments.length) {
                    pSum += data.principalPayments[idx];
                    iSum += data.interestPayments[idx];
                    count++;
                }
            }
            principalYearly.push(count > 0 ? pSum / count : 0);
            interestYearly.push(count > 0 ? iSum / count : 0);
        }

        this.paymentChart.data.labels = paymentYearLabels;
        this.paymentChart.data.datasets = [
            {
                label: 'Interest',
                data: interestYearly,
                backgroundColor: this.colors.purpleBg,
                borderColor: this.colors.purple,
                fill: true
            },
            {
                label: 'Principal',
                data: principalYearly,
                backgroundColor: this.colors.orangeBg,
                borderColor: this.colors.orange,
                fill: true
            }
        ];
        this.paymentChart.update();
    },

    _updateCumulativeChart({ data, startYear }) {
        const cumulativeYearLabels = [];
        const cumulativePrincipalYearly = [];
        const cumulativeInterestYearly = [];

        for (let y = 0; y <= Math.ceil(data.cumulativePrincipal.length / 12); y++) {
            const idx = Math.min(y * 12, data.cumulativePrincipal.length - 1);
            cumulativeYearLabels.push((startYear + y).toString());
            cumulativePrincipalYearly.push(data.cumulativePrincipal[idx]);
            cumulativeInterestYearly.push(data.cumulativeInterest[idx]);
        }

        this.cumulativeChart.data.labels = cumulativeYearLabels;
        this.cumulativeChart.data.datasets = [
            {
                label: 'Cumulative Interest',
                data: cumulativeInterestYearly,
                backgroundColor: this.colors.purpleBg,
                borderColor: this.colors.purple,
                fill: true
            },
            {
                label: 'Cumulative Principal',
                data: cumulativePrincipalYearly,
                backgroundColor: this.colors.orangeBg,
                borderColor: this.colors.orange,
                fill: true
            }
        ];
        this.cumulativeChart.update();
    },

    _updatePieChart({ principal, totalInterest }) {
        this.pieChart.data.labels = ['Principal', 'Interest'];
        this.pieChart.data.datasets = [{
            data: [principal, totalInterest],
            backgroundColor: [this.colors.orange, this.colors.purple],
            borderWidth: 2,
            borderColor: '#fff'
        }];
        this.pieChart.update();
    }
};
