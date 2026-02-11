/**
 * Mortgage Calculations Module
 * Core amortization and payment calculation functions
 */

const MortgageCalculations = {
    /**
     * Calculate monthly payment for a loan
     * @param {number} principal - Loan amount
     * @param {number} monthlyRate - Monthly interest rate (annual rate / 12 / 100)
     * @param {number} numPayments - Total number of payments
     * @returns {number} Monthly payment amount
     */
    calcMonthlyPayment(principal, monthlyRate, numPayments) {
        if (monthlyRate === 0) return principal / numPayments;
        return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
               (Math.pow(1 + monthlyRate, numPayments) - 1);
    },

    /**
     * Calculate full amortization schedule
     * @param {Object} params - Calculation parameters
     * @param {number} params.principal - Loan amount
     * @param {number} params.defaultMonthlyRate - Default monthly interest rate
     * @param {number} params.totalPayments - Total number of payments
     * @param {number} params.startYear - Year mortgage begins
     * @param {number} params.monthlyOverpayment - Extra monthly payment (default 0)
     * @param {Array} params.lumpSumPayments - Array of {year, amount} objects
     * @param {Array} params.ratePeriods - Array of {startYear, endYear, rate} objects
     * @param {boolean} params.ercEnabled - Whether ERC calculation is active
     * @param {number} params.ercEndYear - Year the fixed rate period ends
     * @param {number} params.ercComparatorRate - Current bank comparator rate (annual, as decimal e.g. 0.02)
     * @param {number} params.ercAllowancePct - Penalty-free overpayment allowance (% of balance per year)
     * @returns {Object} Amortization results
     */
    calculateAmortization({
        principal,
        defaultMonthlyRate,
        totalPayments,
        startYear,
        monthlyOverpayment = 0,
        lumpSumPayments = [],
        ratePeriods = [],
        ercEnabled = false,
        ercEndYear = 0,
        ercComparatorRate = 0,
        ercAllowancePct = 10
    }) {
        // Calculate initial monthly payment using default rate
        let currentMonthlyPayment = this.calcMonthlyPayment(principal, defaultMonthlyRate, totalPayments);
        const initialMonthlyPayment = currentMonthlyPayment;

        let balance = principal;
        const balances = [balance];
        const principalPayments = [];
        const interestPayments = [];
        const cumulativePrincipal = [0];
        const cumulativeInterest = [0];
        const schedule = [];
        const rateChanges = [];

        let month = 0;
        let totalErcCharges = 0;

        // ERC tracking: yearly overpayment totals and allowance
        let ercYearlyOverpayment = 0;
        let ercCurrentTrackingYear = startYear;
        let ercYearStartBalance = principal;
        const fixedAnnualRate = defaultMonthlyRate * 12;

        // Sort lump sums and rate periods by year
        const sortedLumpSums = [...lumpSumPayments].sort((a, b) => a.year - b.year);
        const sortedRatePeriods = [...ratePeriods].sort((a, b) => a.startYear - b.startYear);

        let lastRate = null;

        // Safety limit: max 2x the expected payments
        const maxIterations = totalPayments * 2;

        while (balance > 0.01 && month < maxIterations) {
            month++;
            const currentYear = startYear + Math.floor((month - 1) / 12);
            const currentMonth = ((month - 1) % 12) + 1;

            // Find applicable rate for this year
            let monthlyRate = defaultMonthlyRate;
            for (let rp of sortedRatePeriods) {
                if (currentYear >= rp.startYear && currentYear <= rp.endYear) {
                    monthlyRate = rp.rate / 100 / 12;
                    break;
                }
            }

            // When rate changes, recalculate monthly payment based on remaining balance and term
            if (lastRate !== null && lastRate !== monthlyRate) {
                const remainingPayments = totalPayments - month + 1;
                if (remainingPayments > 0 && balance > 0) {
                    currentMonthlyPayment = this.calcMonthlyPayment(balance, monthlyRate, remainingPayments);
                }
            }

            // Track rate changes for chart coloring
            if (lastRate !== monthlyRate) {
                rateChanges.push({
                    month,
                    year: currentYear,
                    rate: monthlyRate * 12 * 100,
                    payment: currentMonthlyPayment
                });
                lastRate = monthlyRate;
            }

            // Check for lump sum payment this month
            let lumpSumThisMonth = 0;
            sortedLumpSums.forEach(ls => {
                const lsMonth = (ls.year - startYear) * 12 + 1;
                if (Math.floor(lsMonth) === month) {
                    lumpSumThisMonth += ls.amount;
                }
            });

            const interest = balance * monthlyRate;
            const basePrincipal = currentMonthlyPayment - interest;
            let totalPrincipalPaid = basePrincipal + monthlyOverpayment + lumpSumThisMonth;

            // Don't overpay beyond remaining balance
            if (totalPrincipalPaid > balance) {
                totalPrincipalPaid = balance;
            }

            const totalPaymentThisMonth = interest + totalPrincipalPaid;

            balance -= totalPrincipalPaid;
            if (balance < 0) balance = 0;

            // ERC calculation
            let ercCharge = 0;
            if (ercEnabled && currentYear < ercEndYear) {
                const extraThisMonth = monthlyOverpayment + lumpSumThisMonth;

                // Reset yearly tracking on year change
                if (currentYear !== ercCurrentTrackingYear) {
                    ercYearlyOverpayment = 0;
                    ercCurrentTrackingYear = currentYear;
                    ercYearStartBalance = balance + totalPrincipalPaid;
                }

                if (extraThisMonth > 0) {
                    ercYearlyOverpayment += extraThisMonth;
                    const yearlyAllowance = ercYearStartBalance * (ercAllowancePct / 100);
                    const excessAmount = ercYearlyOverpayment - yearlyAllowance;

                    if (excessAmount > 0) {
                        // Only charge on the portion of this month's extra that exceeds allowance
                        const chargeableThisMonth = Math.min(extraThisMonth, excessAmount);
                        const rateDiff = fixedAnnualRate - ercComparatorRate;

                        if (rateDiff > 0) {
                            // Remaining days: months left in fixed period × 30.44 (avg days/month)
                            const monthsLeft = (ercEndYear - currentYear) * 12 - (currentMonth - 1);
                            const daysLeft = Math.max(0, monthsLeft * 30.44);
                            ercCharge = chargeableThisMonth * rateDiff * daysLeft / 365;
                        }
                    }
                }
                totalErcCharges += ercCharge;
            }

            // Store schedule entry
            schedule.push({
                month,
                year: currentYear,
                monthNum: currentMonth,
                date: `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
                payment: currentMonthlyPayment,
                principal: basePrincipal,
                interest,
                extra: monthlyOverpayment,
                lumpSum: lumpSumThisMonth,
                ercCharge,
                totalPayment: totalPaymentThisMonth,
                balance
            });

            balances.push(balance);
            principalPayments.push(totalPrincipalPaid - lumpSumThisMonth);
            interestPayments.push(interest);
            cumulativePrincipal.push(cumulativePrincipal[cumulativePrincipal.length - 1] + totalPrincipalPaid);
            cumulativeInterest.push(cumulativeInterest[cumulativeInterest.length - 1] + interest);

            if (balance <= 0) break;
        }

        return {
            monthlyPayment: initialMonthlyPayment,
            balances,
            principalPayments,
            interestPayments,
            cumulativePrincipal,
            cumulativeInterest,
            totalInterest: cumulativeInterest[cumulativeInterest.length - 1],
            totalMonths: month,
            schedule,
            rateChanges,
            totalErcCharges
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MortgageCalculations;
}
