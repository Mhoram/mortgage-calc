/**
 * Loan Calculator Application
 * Generic loan (car, personal, etc.) calculator logic
 */

const LoanApp = {
    elements: {},

    CURRENCIES: {
        EUR: { symbol: '\u20AC', locale: 'en-IE', name: 'Euro' },
        USD: { symbol: '$', locale: 'en-US', name: 'US Dollar' },
        GBP: { symbol: '\u00A3', locale: 'en-GB', name: 'British Pound' }
    },

    state: {
        standardSchedule: [],
        overpaymentSchedule: [],
        currency: 'EUR',
        initialized: false
    },

    monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

    init() {
        this.cacheElements();
        this.loadCurrency();
        LoanCharts.init();
        this.setupEventListeners();
        this.calculate();
        this.state.initialized = true;
    },

    cacheElements() {
        this.elements = {
            loanAmount: document.getElementById('loanAmount'),
            loanRate: document.getElementById('loanRate'),
            loanTerm: document.getElementById('loanTerm'),
            loanStartYear: document.getElementById('loanStartYear'),
            enableOverpayment: document.getElementById('loanEnableOverpayment'),
            overpayment: document.getElementById('loanOverpayment'),
            overpaymentGroup: document.getElementById('loanOverpaymentGroup'),
            tableView: document.getElementById('loanTableView'),
            tableFilter: document.getElementById('loanTableFilter'),
            amortizationBody: document.getElementById('loanAmortizationBody'),
            tableSummary: document.getElementById('loanTableSummary'),
            currencySymbols: document.querySelectorAll('#loanTab .currency-symbol')
        };
    },

    loadCurrency() {
        const saved = localStorage.getItem('mortgageCalcCurrency');
        this.state.currency = saved || MortgageApp.state.currency || 'EUR';
        this.updateCurrencySymbols();
    },

    updateCurrencySymbols() {
        const symbol = this.CURRENCIES[this.state.currency].symbol;
        this.elements.currencySymbols.forEach(el => {
            el.textContent = symbol;
        });
    },

    setCurrency(currency) {
        if (!this.CURRENCIES[currency]) return;
        this.state.currency = currency;
        this.updateCurrencySymbols();
        if (this.state.initialized) this.calculate();
    },

    convertCurrency(valueInEUR) {
        const rates = MortgageApp.state.exchangeRates;
        const rate = rates[this.state.currency] || 1;
        return valueInEUR * rate;
    },

    formatCurrency(value) {
        const converted = this.convertCurrency(value);
        const currency = this.CURRENCIES[this.state.currency];
        return currency.symbol + converted.toLocaleString(currency.locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },

    formatCurrencyDecimal(value) {
        const converted = this.convertCurrency(value);
        const currency = this.CURRENCIES[this.state.currency];
        return currency.symbol + converted.toLocaleString(currency.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    getCurrencySymbol() {
        return this.CURRENCIES[this.state.currency].symbol;
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    setupEventListeners() {
        const el = this.elements;
        const debouncedCalc = this.debounce(() => this.calculate(), 300);

        [el.loanAmount, el.loanRate, el.loanTerm, el.loanStartYear, el.overpayment].forEach(input => {
            input.addEventListener('input', debouncedCalc);
        });

        el.enableOverpayment.addEventListener('change', () => {
            el.overpaymentGroup.style.display = el.enableOverpayment.checked ? 'block' : 'none';
            this.calculate();
        });

        el.tableView.addEventListener('change', () => this.updateTable());
        el.tableFilter.addEventListener('change', () => this.updateTable());

        // Listen for currency changes on the shared currency selector
        const currencySelect = document.getElementById('currencySelect');
        if (currencySelect) {
            currencySelect.addEventListener('change', (e) => this.setCurrency(e.target.value));
        }
    },

    toggleAdvancedOptions() {
        const section = document.getElementById('loanAdvancedSection');
        const toggle = document.getElementById('loanAdvancedToggle');
        const isVisible = section.classList.toggle('visible');
        toggle.classList.toggle('expanded', isVisible);
        toggle.querySelector('.text').textContent = isVisible ? 'Hide advanced options' : 'Show advanced options';
    },

    // ==================== Input Validation ====================

    setValidation(inputEl, messageEl, type, message) {
        inputEl.classList.remove('input-error', 'input-warning');
        inputEl.classList.add(type === 'error' ? 'input-error' : 'input-warning');
        messageEl.className = `validation-message ${type}`;
        messageEl.textContent = message;
    },

    clearValidation(inputEl, messageEl) {
        inputEl.classList.remove('input-error', 'input-warning');
        messageEl.className = 'validation-message';
        messageEl.textContent = '';
    },

    validateInputs() {
        let hasErrors = false;
        const el = this.elements;

        // Loan Amount
        const amountMsg = document.getElementById('loanAmount-validation');
        const amountVal = parseFloat(el.loanAmount.value);
        if (el.loanAmount.value.trim() === '' || isNaN(amountVal)) {
            this.setValidation(el.loanAmount, amountMsg, 'error', 'Loan amount is required');
            hasErrors = true;
        } else if (amountVal < 100) {
            this.setValidation(el.loanAmount, amountMsg, 'error', 'Minimum amount is 100');
            hasErrors = true;
        } else if (amountVal > 50000000) {
            this.setValidation(el.loanAmount, amountMsg, 'error', 'Maximum amount is 50,000,000');
            hasErrors = true;
        } else {
            this.clearValidation(el.loanAmount, amountMsg);
        }

        // Interest Rate
        const rateMsg = document.getElementById('loanRate-validation');
        const rateVal = parseFloat(el.loanRate.value);
        if (el.loanRate.value.trim() === '' || isNaN(rateVal)) {
            this.setValidation(el.loanRate, rateMsg, 'error', 'Interest rate is required');
            hasErrors = true;
        } else if (rateVal < 0) {
            this.setValidation(el.loanRate, rateMsg, 'error', 'Rate cannot be negative');
            hasErrors = true;
        } else if (rateVal > 30) {
            this.setValidation(el.loanRate, rateMsg, 'error', 'Maximum rate is 30%');
            hasErrors = true;
        } else if (rateVal === 0) {
            this.setValidation(el.loanRate, rateMsg, 'warning', 'Interest-free loan');
        } else {
            this.clearValidation(el.loanRate, rateMsg);
        }

        // Term
        const termMsg = document.getElementById('loanTerm-validation');
        const termVal = parseInt(el.loanTerm.value);
        if (el.loanTerm.value.trim() === '' || isNaN(termVal)) {
            this.setValidation(el.loanTerm, termMsg, 'error', 'Loan term is required');
            hasErrors = true;
        } else if (termVal < 1) {
            this.setValidation(el.loanTerm, termMsg, 'error', 'Minimum term is 1 year');
            hasErrors = true;
        } else if (termVal > 30) {
            this.setValidation(el.loanTerm, termMsg, 'error', 'Maximum term is 30 years');
            hasErrors = true;
        } else {
            this.clearValidation(el.loanTerm, termMsg);
        }

        // Start Year
        const yearMsg = document.getElementById('loanStartYear-validation');
        const yearVal = parseInt(el.loanStartYear.value);
        if (el.loanStartYear.value.trim() === '' || isNaN(yearVal)) {
            this.setValidation(el.loanStartYear, yearMsg, 'error', 'Start year is required');
            hasErrors = true;
        } else if (yearVal < 1990 || yearVal > 2100) {
            this.setValidation(el.loanStartYear, yearMsg, 'error', 'Year must be between 1990 and 2100');
            hasErrors = true;
        } else {
            this.clearValidation(el.loanStartYear, yearMsg);
        }

        // Overpayment
        const overpaymentMsg = document.getElementById('loanOverpayment-validation');
        if (el.enableOverpayment.checked) {
            const overpayVal = parseFloat(el.overpayment.value);
            if (isNaN(overpayVal) || overpayVal < 0) {
                this.setValidation(el.overpayment, overpaymentMsg, 'error', 'Overpayment cannot be negative');
                hasErrors = true;
            } else {
                this.clearValidation(el.overpayment, overpaymentMsg);
            }
        } else {
            this.clearValidation(el.overpayment, overpaymentMsg);
        }

        return hasErrors;
    },

    // ==================== Main Calculation ====================

    calculate() {
        const hasErrors = this.validateInputs();
        if (hasErrors) return;

        const el = this.elements;
        const principal = parseFloat(el.loanAmount.value);
        const annualRate = parseFloat(el.loanRate.value) / 100;
        const termYears = parseInt(el.loanTerm.value);
        const startYear = parseInt(el.loanStartYear.value);
        const monthlyRate = annualRate / 12;
        const totalPayments = termYears * 12;

        const overpaymentEnabled = el.enableOverpayment.checked;
        const monthlyOverpayment = overpaymentEnabled ? (parseFloat(el.overpayment.value) || 0) : 0;

        const standard = MortgageCalculations.calculateAmortization({
            principal,
            defaultMonthlyRate: monthlyRate,
            totalPayments,
            startYear,
            monthlyOverpayment: 0,
            lumpSumPayments: [],
            ratePeriods: []
        });

        const withOverpayments = MortgageCalculations.calculateAmortization({
            principal,
            defaultMonthlyRate: monthlyRate,
            totalPayments,
            startYear,
            monthlyOverpayment,
            lumpSumPayments: [],
            ratePeriods: []
        });

        this.state.standardSchedule = standard.schedule;
        this.state.overpaymentSchedule = withOverpayments.schedule;

        this.updateSummary(standard, withOverpayments, principal, termYears, startYear, overpaymentEnabled, monthlyOverpayment);

        LoanCharts.update({
            standard,
            withOverpayments,
            startYear,
            termYears,
            principal,
            hasOverpayments: overpaymentEnabled
        });

        this.updateTable();
    },

    updateSummary(standard, withOverpayments, principal, termYears, startYear, overpaymentEnabled, monthlyOverpayment) {
        const hasOverpayments = overpaymentEnabled;

        document.getElementById('loanMonthlyPayment').textContent = this.formatCurrency(standard.monthlyPayment);
        const convertedOverpayment = this.convertCurrency(monthlyOverpayment);
        document.getElementById('loanMonthlyDetail').textContent = overpaymentEnabled && monthlyOverpayment > 0
            ? `+${this.getCurrencySymbol()}${convertedOverpayment.toFixed(0)} overpayment`
            : 'Standard payment';

        const displayInterest = hasOverpayments ? withOverpayments.totalInterest : standard.totalInterest;
        const displayTotalCost = principal + displayInterest;
        const displayMonths = hasOverpayments ? withOverpayments.totalMonths : standard.totalMonths;

        document.getElementById('loanTotalInterest').textContent = this.formatCurrency(displayInterest);
        document.getElementById('loanTotalCost').textContent = this.formatCurrency(displayTotalCost);

        const completionYear = startYear + displayMonths / 12;
        document.getElementById('loanCompletionYear').textContent = Math.ceil(completionYear);

        // Comparison panel
        document.getElementById('loanStandardTerm').textContent = `${termYears} years`;
        document.getElementById('loanStandardInterest').textContent = this.formatCurrency(standard.totalInterest);

        if (hasOverpayments) {
            const newTermYears = withOverpayments.totalMonths / 12;
            const yearsSaved = termYears - newTermYears;
            const interestSaved = standard.totalInterest - withOverpayments.totalInterest;

            document.getElementById('loanNewTerm').textContent = `${newTermYears.toFixed(1)} years`;
            document.getElementById('loanTimeSaved').textContent = yearsSaved > 0 ? `${yearsSaved.toFixed(1)} years saved` : '';
            document.getElementById('loanInterestSaved').textContent = this.formatCurrency(interestSaved);
            document.getElementById('loanCompletionDetail').textContent = `${(termYears - newTermYears).toFixed(1)} years early`;
        } else {
            document.getElementById('loanNewTerm').textContent = '-';
            document.getElementById('loanTimeSaved').textContent = '';
            document.getElementById('loanInterestSaved').textContent = '-';
            document.getElementById('loanCompletionDetail').textContent = 'Loan paid off';
        }
    },

    // ==================== Table Management ====================

    updateTable() {
        const viewType = this.elements.tableView.value;
        const filterType = this.elements.tableFilter.value;
        const schedule = viewType === 'standard' ? this.state.standardSchedule : this.state.overpaymentSchedule;

        if (!schedule || schedule.length === 0) {
            this.elements.amortizationBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No data available</td></tr>';
            this.elements.tableSummary.innerHTML = '';
            return;
        }

        let html = '';
        if (filterType === 'yearly') {
            html = this.buildYearlyTableRows(schedule);
        } else {
            html = this.buildMonthlyTableRows(schedule);
        }

        this.elements.amortizationBody.innerHTML = html;

        let totalPayments = 0, totalPrincipal = 0, totalInterest = 0, totalExtra = 0;
        schedule.forEach(row => {
            totalPayments += row.totalPayment;
            totalPrincipal += row.principal;
            totalInterest += row.interest;
            totalExtra += row.extra;
        });

        this.elements.tableSummary.innerHTML = `
            <div class="table-summary-item">Total Payments: <span>${this.formatCurrency(totalPayments)}</span></div>
            <div class="table-summary-item">Total Principal: <span>${this.formatCurrency(totalPrincipal + totalExtra)}</span></div>
            <div class="table-summary-item">Total Interest: <span>${this.formatCurrency(totalInterest)}</span></div>
            ${totalExtra > 0 ? `<div class="table-summary-item">Total Overpayments: <span style="color:#e67e22">${this.formatCurrency(totalExtra)}</span></div>` : ''}
            <div class="table-summary-item">Payments: <span>${schedule.length} months</span></div>
        `;
    },

    buildYearlyTableRows(schedule) {
        const yearlyData = {};
        schedule.forEach(row => {
            if (!yearlyData[row.year]) {
                yearlyData[row.year] = { year: row.year, payments: 0, principal: 0, interest: 0, extra: 0, endBalance: 0, months: 0 };
            }
            yearlyData[row.year].payments += row.totalPayment;
            yearlyData[row.year].principal += row.principal;
            yearlyData[row.year].interest += row.interest;
            yearlyData[row.year].extra += row.extra;
            yearlyData[row.year].endBalance = row.balance;
            yearlyData[row.year].months++;
        });

        return Object.values(yearlyData).map(year => `
            <tr>
                <td>${year.months}</td>
                <td><strong>${year.year}</strong></td>
                <td>${this.formatCurrencyDecimal(year.payments)}</td>
                <td>${this.formatCurrencyDecimal(year.principal)}</td>
                <td>${this.formatCurrencyDecimal(year.interest)}</td>
                <td class="extra">${year.extra > 0 ? this.formatCurrencyDecimal(year.extra) : '-'}</td>
                <td>${this.formatCurrencyDecimal(year.endBalance)}</td>
            </tr>
        `).join('');
    },

    buildMonthlyTableRows(schedule) {
        return schedule.map(row => {
            const isYearStart = row.monthNum === 1;
            return `<tr class="${isYearStart ? 'year-start' : ''}">
                <td>${row.month}</td>
                <td>${this.monthNames[row.monthNum - 1]} ${row.year}</td>
                <td>${this.formatCurrencyDecimal(row.totalPayment)}</td>
                <td>${this.formatCurrencyDecimal(row.principal)}</td>
                <td>${this.formatCurrencyDecimal(row.interest)}</td>
                <td class="extra">${row.extra > 0 ? this.formatCurrencyDecimal(row.extra) : '-'}</td>
                <td>${this.formatCurrencyDecimal(row.balance)}</td>
            </tr>`;
        }).join('');
    }
};
