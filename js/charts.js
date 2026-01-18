/**
 * Charts Module
 * Chart initialization and update functions using Chart.js
 */

const MortgageCharts = {
    // Chart instances
    balanceChart: null,
    paymentChart: null,
    cumulativeChart: null,
    pieChart: null,

    // Color palette
    colors: {
        blue: '#3498db',
        blueBg: 'rgba(52, 152, 219, 0.1)',
        orange: '#e67e22',
        orangeBg: 'rgba(230, 126, 34, 0.8)',
        purple: '#8e44ad',
        purpleBg: 'rgba(142, 68, 173, 0.8)',
        darkGray: '#2c3e50'
    },

    // Rate period colors for multi-rate visualization
    rateColors: [
        { border: '#3498db', bg: 'rgba(52, 152, 219, 0.1)' },
        { border: '#e67e22', bg: 'rgba(230, 126, 34, 0.1)' },
        { border: '#8e44ad', bg: 'rgba(142, 68, 173, 0.1)' },
        { border: '#f39c12', bg: 'rgba(243, 156, 18, 0.1)' },
        { border: '#2c3e50', bg: 'rgba(44, 62, 80, 0.1)' }
    ],

    /**
     * Initialize all charts
     */
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
                        callback: value => '\u20AC' + (value / 1000).toFixed(0) + 'k'
                    }
                }
            }
        };

        // Balance Chart
        this.balanceChart = new Chart(document.getElementById('balanceChart'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...chartOptions,
                plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.dataset.label + ': \u20AC' + ctx.parsed.y.toLocaleString('en-IE', {maximumFractionDigits: 0})
                        }
                    }
                }
            }
        });

        // Payment Breakdown Chart
        this.paymentChart = new Chart(document.getElementById('paymentChart'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        stacked: true,
                        ticks: {
                            callback: value => '\u20AC' + value.toFixed(0)
                        }
                    },
                    x: {
                        ticks: { maxTicksLimit: 10 }
                    }
                }
            }
        });

        // Cumulative Chart
        this.cumulativeChart = new Chart(document.getElementById('cumulativeChart'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        stacked: true,
                        ticks: {
                            callback: value => '\u20AC' + (value / 1000).toFixed(0) + 'k'
                        }
                    }
                }
            }
        });

        // Pie Chart with percentage labels
        this.pieChart = new Chart(document.getElementById('pieChart'), {
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
                                return ctx.label + ': \u20AC' + ctx.parsed.toLocaleString('en-IE', {maximumFractionDigits: 0}) + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            },
            plugins: [{
                id: 'percentageLabels',
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

    /**
     * Update all charts with new data
     * @param {Object} params - Chart update parameters
     */
    update({
        standard,
        withOverpayments,
        startYear,
        termYears,
        principal,
        hasOverpayments,
        rateChanges = [],
        ratePeriods = []
    }) {
        const endYear = startYear + termYears;

        // Generate year labels
        const yearLabels = [];
        for (let y = startYear; y <= endYear; y++) {
            yearLabels.push(y.toString());
        }

        // Sample balance data at yearly intervals
        const standardYearlyBalances = [];
        const overpaymentYearlyBalances = [];
        for (let y = 0; y <= termYears; y++) {
            const monthIndex = y * 12;
            standardYearlyBalances.push(standard.balances[monthIndex] !== undefined ? standard.balances[monthIndex] : null);
            overpaymentYearlyBalances.push(withOverpayments.balances[monthIndex] !== undefined ? withOverpayments.balances[monthIndex] : null);
        }

        // Update Balance Chart
        this._updateBalanceChart({
            yearLabels,
            standardYearlyBalances,
            overpaymentYearlyBalances,
            hasOverpayments,
            rateChanges,
            ratePeriods,
            startYear
        });

        // Update Payment Breakdown Chart
        this._updatePaymentChart({
            data: hasOverpayments ? withOverpayments : standard,
            startYear
        });

        // Update Cumulative Chart
        this._updateCumulativeChart({
            data: hasOverpayments ? withOverpayments : standard,
            startYear
        });

        // Update Pie Chart
        this._updatePieChart({
            principal,
            totalInterest: hasOverpayments ? withOverpayments.totalInterest : standard.totalInterest
        });
    },

    _updateBalanceChart({ yearLabels, standardYearlyBalances, overpaymentYearlyBalances, hasOverpayments, rateChanges, ratePeriods, startYear }) {
        this.balanceChart.data.labels = yearLabels;
        this.balanceChart.data.datasets = [];

        // Build segment color function for rate periods
        const getSegmentColor = (ctx, colorIndex) => {
            if (rateChanges.length <= 1) return undefined;
            const yearIndex = ctx.p0DataIndex;
            const currentYear = startYear + yearIndex;

            for (let i = rateChanges.length - 1; i >= 0; i--) {
                if (currentYear >= rateChanges[i].year) {
                    return this.rateColors[i % this.rateColors.length][colorIndex];
                }
            }
            return this.rateColors[0][colorIndex];
        };

        if (rateChanges.length > 1 && ratePeriods.length > 0) {
            // Use segment styling for color-coded rate periods
            this.balanceChart.data.datasets.push({
                label: 'Balance',
                data: hasOverpayments ? overpaymentYearlyBalances : standardYearlyBalances,
                borderColor: this.colors.blue,
                backgroundColor: this.colors.blueBg,
                fill: true,
                tension: 0.1,
                segment: {
                    borderColor: ctx => getSegmentColor(ctx, 'border'),
                    backgroundColor: ctx => getSegmentColor(ctx, 'bg')
                }
            });

            // Add legend entries for each rate period
            ratePeriods.forEach((rp, idx) => {
                this.balanceChart.data.datasets.push({
                    label: `${rp.rate}% (${rp.startYear}-${rp.endYear})`,
                    data: [],
                    borderColor: this.rateColors[idx % this.rateColors.length].border,
                    backgroundColor: this.rateColors[idx % this.rateColors.length].bg,
                    fill: false
                });
            });
        } else {
            // Standard single-color display
            this.balanceChart.data.datasets.push({
                label: 'Standard',
                data: standardYearlyBalances,
                borderColor: this.colors.blue,
                backgroundColor: this.colors.blueBg,
                fill: true,
                tension: 0.1
            });

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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MortgageCharts;
}
