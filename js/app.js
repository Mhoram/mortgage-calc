/**
 * Mortgage Calculator Application
 * Main application logic, initialization, and event handling
 */

const MortgageApp = {
    // DOM Elements
    elements: {},

    // Currency configuration
    CURRENCIES: {
        EUR: { symbol: '\u20AC', locale: 'en-IE', name: 'Euro' },
        USD: { symbol: '$', locale: 'en-US', name: 'US Dollar' },
        GBP: { symbol: '\u00A3', locale: 'en-GB', name: 'British Pound' }
    },

    // Application State
    state: {
        lumpSums: [],
        ratePeriods: [],
        standardSchedule: [],
        overpaymentSchedule: [],
        currency: 'EUR',
        exchangeRates: { EUR: 1, USD: 1, GBP: 1 },
        ratesLoaded: false
    },

    // Default configuration (fallback if config.js not loaded)
    DEFAULT_CONFIG: {
        principal: 300000,
        annualRate: 3.1,
        termYears: 30,
        startYear: 2026,
        enableOverpayment: false,
        monthlyOverpayment: 100,
        lumpSums: [],
        ratePeriods: []
    },

    // Month names for table display
    monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

    /**
     * Initialize the application
     */
    init() {
        this.cacheElements();
        this.loadConfigValues();
        this.loadCurrency();
        MortgageCharts.init();
        this.setupEventListeners();
        this.fetchExchangeRates();
        this.calculate();
    },

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            principal: document.getElementById('principal'),
            rate: document.getElementById('rate'),
            term: document.getElementById('term'),
            startYear: document.getElementById('startYear'),
            enableOverpayment: document.getElementById('enableOverpayment'),
            overpayment: document.getElementById('overpayment'),
            overpaymentGroup: document.getElementById('overpaymentGroup'),
            lumpSumList: document.getElementById('lumpSumList'),
            addLumpSumBtn: document.getElementById('addLumpSum'),
            ratePeriodList: document.getElementById('ratePeriodList'),
            addRatePeriodBtn: document.getElementById('addRatePeriod'),
            tableView: document.getElementById('tableView'),
            tableFilter: document.getElementById('tableFilter'),
            amortizationBody: document.getElementById('amortizationBody'),
            tableSummary: document.getElementById('tableSummary'),
            currencySelect: document.getElementById('currencySelect'),
            currencySymbols: document.querySelectorAll('.currency-symbol')
        };
    },

    /**
     * Get config value with fallback
     */
    getConfig(key) {
        if (typeof CONFIG !== 'undefined' && CONFIG[key] !== undefined) {
            return CONFIG[key];
        }
        return this.DEFAULT_CONFIG[key];
    },

    /**
     * Load configuration values into form inputs
     */
    loadConfigValues() {
        const el = this.elements;

        el.principal.value = this.getConfig('principal');
        el.rate.value = this.getConfig('annualRate');
        el.term.value = this.getConfig('termYears');
        el.startYear.value = this.getConfig('startYear');
        el.overpayment.value = this.getConfig('monthlyOverpayment');

        const enableOverpayment = this.getConfig('enableOverpayment');
        el.enableOverpayment.checked = enableOverpayment;
        el.overpaymentGroup.style.display = enableOverpayment ? 'block' : 'none';

        // Load default lump sums
        const configLumpSums = this.getConfig('lumpSums');
        if (configLumpSums && configLumpSums.length > 0) {
            configLumpSums.forEach(ls => {
                this.state.lumpSums.push({
                    id: Date.now() + Math.random(),
                    year: ls.year,
                    amount: ls.amount
                });
            });
            this.renderLumpSums();
        }

        // Load default rate periods
        const configRatePeriods = this.getConfig('ratePeriods');
        if (configRatePeriods && configRatePeriods.length > 0) {
            configRatePeriods.forEach(rp => {
                this.state.ratePeriods.push({
                    id: Date.now() + Math.random(),
                    startYear: rp.startYear,
                    endYear: rp.endYear,
                    rate: rp.rate
                });
            });
            this.renderRatePeriods();
        }
    },

    /**
     * Load currency from config/localStorage
     */
    loadCurrency() {
        const savedCurrency = localStorage.getItem('mortgageCalcCurrency');
        const configCurrency = this.getConfig('currency');
        this.state.currency = savedCurrency || configCurrency || 'EUR';

        if (this.elements.currencySelect) {
            this.elements.currencySelect.value = this.state.currency;
        }
        this.updateCurrencySymbols();
    },

    /**
     * Fetch exchange rates from Frankfurter API
     */
    async fetchExchangeRates() {
        const selector = this.elements.currencySelect;
        if (selector) selector.classList.add('currency-loading');

        try {
            const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP');
            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            this.state.exchangeRates = {
                EUR: 1,
                USD: data.rates.USD,
                GBP: data.rates.GBP
            };
            this.state.ratesLoaded = true;
        } catch (error) {
            console.warn('Failed to fetch exchange rates, using fallback rates:', error);
            // Fallback rates (approximate)
            this.state.exchangeRates = { EUR: 1, USD: 1.08, GBP: 0.86 };
        } finally {
            if (selector) selector.classList.remove('currency-loading');
            // Refresh display with new rates
            this.calculate();
        }
    },

    /**
     * Set the current currency and update display
     */
    setCurrency(currency) {
        if (!this.CURRENCIES[currency]) return;

        this.state.currency = currency;
        localStorage.setItem('mortgageCalcCurrency', currency);
        this.updateCurrencySymbols();
        this.calculate();
    },

    /**
     * Update all currency symbol displays
     */
    updateCurrencySymbols() {
        const symbol = this.CURRENCIES[this.state.currency].symbol;
        this.elements.currencySymbols.forEach(el => {
            el.textContent = symbol;
        });
    },

    /**
     * Convert EUR value to current currency
     */
    convertCurrency(valueInEUR) {
        const rate = this.state.exchangeRates[this.state.currency] || 1;
        return valueInEUR * rate;
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const el = this.elements;
        const debouncedCalc = this.debounce(() => this.calculate(), 300);

        // Input changes
        [el.principal, el.rate, el.term, el.startYear, el.overpayment].forEach(input => {
            input.addEventListener('input', debouncedCalc);
        });

        // Overpayment toggle
        el.enableOverpayment.addEventListener('change', () => {
            el.overpaymentGroup.style.display = el.enableOverpayment.checked ? 'block' : 'none';
            this.calculate();
        });

        // Lump sum and rate period buttons
        el.addLumpSumBtn.addEventListener('click', () => this.addLumpSum());
        el.addRatePeriodBtn.addEventListener('click', () => this.addRatePeriod());

        // Table controls
        el.tableView.addEventListener('change', () => this.updateTable());
        el.tableFilter.addEventListener('change', () => this.updateTable());

        // Currency selector
        if (el.currencySelect) {
            el.currencySelect.addEventListener('change', (e) => this.setCurrency(e.target.value));
        }
    },

    /**
     * Debounce utility function
     */
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

    /**
     * Toggle advanced options visibility
     */
    toggleAdvancedOptions() {
        const section = document.getElementById('advancedSection');
        const toggle = document.getElementById('advancedToggle');
        const isVisible = section.classList.toggle('visible');
        toggle.classList.toggle('expanded', isVisible);
        toggle.querySelector('.text').textContent = isVisible ? 'Hide advanced options' : 'Show advanced options';
    },

    // ==================== Lump Sum Management ====================

    addLumpSum() {
        const startYear = parseInt(this.elements.startYear.value) || this.getConfig('startYear');
        const id = Date.now();

        this.state.lumpSums.push({ id, year: startYear + 5, amount: 10000 });
        this.renderLumpSums();
        this.calculate();
    },

    removeLumpSum(id) {
        this.state.lumpSums = this.state.lumpSums.filter(ls => ls.id !== id);
        this.renderLumpSums();
        this.calculate();
    },

    updateLumpSum(id, field, value) {
        const ls = this.state.lumpSums.find(l => l.id === id);
        if (ls) {
            ls[field] = parseFloat(value);
            this.calculate();
        }
    },

    renderLumpSums() {
        this.elements.lumpSumList.innerHTML = this.state.lumpSums.map(ls => `
            <div class="lump-sum-item" data-lumpsum-id="${ls.id}">
                <input type="number" value="${ls.year}" min="2000" max="2100"
                       onchange="MortgageApp.updateLumpSum(${ls.id}, 'year', this.value)">
                <input type="number" value="${ls.amount}" min="100" step="100" placeholder="Amount"
                       onchange="MortgageApp.updateLumpSum(${ls.id}, 'amount', this.value)">
                <button class="btn-remove" onclick="MortgageApp.removeLumpSum(${ls.id})">&times;</button>
                <div class="dynamic-item-validation" role="alert" aria-live="polite"></div>
            </div>
        `).join('');
    },

    // ==================== Rate Period Management ====================

    addRatePeriod() {
        const startYear = parseInt(this.elements.startYear.value) || this.getConfig('startYear');
        const term = parseInt(this.elements.term.value) || this.getConfig('termYears');
        const defaultRate = parseFloat(this.elements.rate.value) || this.getConfig('annualRate');
        const id = Date.now();

        this.state.ratePeriods.push({ id, startYear, endYear: startYear + term, rate: defaultRate });
        this.renderRatePeriods();
        this.calculate();
    },

    removeRatePeriod(id) {
        this.state.ratePeriods = this.state.ratePeriods.filter(rp => rp.id !== id);
        this.renderRatePeriods();
        this.calculate();
    },

    updateRatePeriod(id, field, value) {
        const rp = this.state.ratePeriods.find(r => r.id === id);
        if (rp) {
            rp[field] = parseFloat(value);
            this.calculate();
        }
    },

    renderRatePeriods() {
        this.elements.ratePeriodList.innerHTML = this.state.ratePeriods.map(rp => `
            <div class="rate-period-item" data-rateperiod-id="${rp.id}">
                <input type="number" value="${rp.startYear}" min="2000" max="2100"
                       onchange="MortgageApp.updateRatePeriod(${rp.id}, 'startYear', this.value)">
                <input type="number" value="${rp.endYear}" min="2000" max="2100"
                       onchange="MortgageApp.updateRatePeriod(${rp.id}, 'endYear', this.value)">
                <input type="number" value="${rp.rate}" min="0" max="30" step="0.01"
                       onchange="MortgageApp.updateRatePeriod(${rp.id}, 'rate', this.value)">
                <button class="btn-remove" onclick="MortgageApp.removeRatePeriod(${rp.id})">&times;</button>
                <div class="dynamic-item-validation" role="alert" aria-live="polite"></div>
            </div>
        `).join('');
    },

    // ==================== Input Validation ====================

    /**
     * Set validation state on an input and its message container
     * @param {HTMLElement} inputEl - The input element
     * @param {HTMLElement} messageEl - The validation message container
     * @param {'error'|'warning'} type - Validation type
     * @param {string} message - Message to display
     */
    setValidation(inputEl, messageEl, type, message) {
        inputEl.classList.remove('input-error', 'input-warning');
        inputEl.classList.add(type === 'error' ? 'input-error' : 'input-warning');
        messageEl.className = `validation-message ${type}`;
        messageEl.textContent = message;
    },

    /**
     * Clear validation state from an input and its message container
     */
    clearValidation(inputEl, messageEl) {
        inputEl.classList.remove('input-error', 'input-warning');
        messageEl.className = 'validation-message';
        messageEl.textContent = '';
    },

    /**
     * Validate all main form inputs
     * @returns {boolean} true if there are blocking errors
     */
    validateInputs() {
        let hasErrors = false;
        const el = this.elements;

        // --- Principal ---
        const principalMsg = document.getElementById('principal-validation');
        const principalVal = parseFloat(el.principal.value);
        if (el.principal.value.trim() === '' || isNaN(principalVal)) {
            this.setValidation(el.principal, principalMsg, 'error', 'Principal amount is required');
            hasErrors = true;
        } else if (principalVal < 1000) {
            this.setValidation(el.principal, principalMsg, 'error', 'Minimum principal is 1,000');
            hasErrors = true;
        } else if (principalVal > 50000000) {
            this.setValidation(el.principal, principalMsg, 'error', 'Maximum principal is 50,000,000');
            hasErrors = true;
        } else if (principalVal > 10000000) {
            this.setValidation(el.principal, principalMsg, 'warning', 'Very large loan amount');
        } else {
            this.clearValidation(el.principal, principalMsg);
        }

        // --- Interest Rate ---
        const rateMsg = document.getElementById('rate-validation');
        const rateVal = parseFloat(el.rate.value);
        if (el.rate.value.trim() === '' || isNaN(rateVal)) {
            this.setValidation(el.rate, rateMsg, 'error', 'Interest rate is required');
            hasErrors = true;
        } else if (rateVal < 0) {
            this.setValidation(el.rate, rateMsg, 'error', 'Rate cannot be negative');
            hasErrors = true;
        } else if (rateVal > 30) {
            this.setValidation(el.rate, rateMsg, 'error', 'Maximum rate is 30%');
            hasErrors = true;
        } else if (rateVal === 0) {
            this.setValidation(el.rate, rateMsg, 'warning', 'Interest-free loan');
        } else if (rateVal > 15) {
            this.setValidation(el.rate, rateMsg, 'warning', 'Unusually high interest rate');
        } else {
            this.clearValidation(el.rate, rateMsg);
        }

        // --- Term ---
        const termMsg = document.getElementById('term-validation');
        const termVal = parseInt(el.term.value);
        if (el.term.value.trim() === '' || isNaN(termVal)) {
            this.setValidation(el.term, termMsg, 'error', 'Loan term is required');
            hasErrors = true;
        } else if (termVal < 1) {
            this.setValidation(el.term, termMsg, 'error', 'Minimum term is 1 year');
            hasErrors = true;
        } else if (termVal > 50) {
            this.setValidation(el.term, termMsg, 'error', 'Maximum term is 50 years');
            hasErrors = true;
        } else if (termVal > 40) {
            this.setValidation(el.term, termMsg, 'warning', 'Unusually long loan term');
        } else {
            this.clearValidation(el.term, termMsg);
        }

        // --- Start Year ---
        const yearMsg = document.getElementById('startYear-validation');
        const yearVal = parseInt(el.startYear.value);
        if (el.startYear.value.trim() === '' || isNaN(yearVal)) {
            this.setValidation(el.startYear, yearMsg, 'error', 'Start year is required');
            hasErrors = true;
        } else if (yearVal < 1990 || yearVal > 2100) {
            this.setValidation(el.startYear, yearMsg, 'error', 'Year must be between 1990 and 2100');
            hasErrors = true;
        } else {
            this.clearValidation(el.startYear, yearMsg);
        }

        // --- Overpayment (only if enabled) ---
        const overpaymentMsg = document.getElementById('overpayment-validation');
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

    /**
     * Validate dynamic items (lump sums and rate periods)
     * Called after rendering to add validation messages to items
     */
    validateDynamicItems() {
        const startYear = parseInt(this.elements.startYear.value) || this.getConfig('startYear');
        const termYears = parseInt(this.elements.term.value) || this.getConfig('termYears');
        const endYear = startYear + termYears;

        // Validate lump sums
        this.state.lumpSums.forEach(ls => {
            const container = document.querySelector(`[data-lumpsum-id="${ls.id}"]`);
            if (!container) return;
            const msgEl = container.querySelector('.dynamic-item-validation');
            if (!msgEl) return;
            const inputs = container.querySelectorAll('input');

            inputs.forEach(i => i.classList.remove('input-error', 'input-warning'));
            msgEl.className = 'dynamic-item-validation';
            msgEl.textContent = '';

            if (ls.year < startYear || ls.year > endYear) {
                inputs[0].classList.add('input-error');
                msgEl.className = 'dynamic-item-validation error';
                msgEl.textContent = `Year must be between ${startYear} and ${endYear}`;
            }
            if (isNaN(ls.amount) || ls.amount <= 0) {
                inputs[1].classList.add('input-error');
                msgEl.className = 'dynamic-item-validation error';
                msgEl.textContent = msgEl.textContent ? msgEl.textContent + '; Amount must be greater than 0' : 'Amount must be greater than 0';
            }
        });

        // Validate rate periods
        this.state.ratePeriods.forEach(rp => {
            const container = document.querySelector(`[data-rateperiod-id="${rp.id}"]`);
            if (!container) return;
            const msgEl = container.querySelector('.dynamic-item-validation');
            if (!msgEl) return;
            const inputs = container.querySelectorAll('input');

            inputs.forEach(i => i.classList.remove('input-error', 'input-warning'));
            msgEl.className = 'dynamic-item-validation';
            msgEl.textContent = '';

            const messages = [];
            if (rp.startYear >= rp.endYear) {
                inputs[0].classList.add('input-error');
                inputs[1].classList.add('input-error');
                messages.push('Start year must be before end year');
            }
            if (isNaN(rp.rate) || rp.rate < 0 || rp.rate > 30) {
                inputs[2].classList.add('input-error');
                messages.push('Rate must be between 0% and 30%');
            }
            if (messages.length) {
                msgEl.className = 'dynamic-item-validation error';
                msgEl.textContent = messages.join('; ');
            }
        });
    },

    // ==================== Main Calculation ====================

    calculate() {
        const hasErrors = this.validateInputs();
        this.validateDynamicItems();
        if (hasErrors) return;

        const el = this.elements;
        const principal = parseFloat(el.principal.value) || this.getConfig('principal');
        const annualRate = (parseFloat(el.rate.value) || this.getConfig('annualRate')) / 100;
        const termYears = parseInt(el.term.value) || this.getConfig('termYears');
        const startYear = parseInt(el.startYear.value) || this.getConfig('startYear');
        const monthlyRate = annualRate / 12;
        const totalPayments = termYears * 12;

        const overpaymentEnabled = el.enableOverpayment.checked;
        const monthlyOverpayment = overpaymentEnabled ? (parseFloat(el.overpayment.value) || 0) : 0;

        // Calculate standard amortization
        const standard = MortgageCalculations.calculateAmortization({
            principal,
            defaultMonthlyRate: monthlyRate,
            totalPayments,
            startYear,
            monthlyOverpayment: 0,
            lumpSumPayments: [],
            ratePeriods: this.state.ratePeriods
        });

        // Calculate with overpayments and lump sums
        const withOverpayments = MortgageCalculations.calculateAmortization({
            principal,
            defaultMonthlyRate: monthlyRate,
            totalPayments,
            startYear,
            monthlyOverpayment,
            lumpSumPayments: this.state.lumpSums,
            ratePeriods: this.state.ratePeriods
        });

        // Store schedules for table
        this.state.standardSchedule = standard.schedule;
        this.state.overpaymentSchedule = withOverpayments.schedule;

        // Update UI
        this.updateSummary(standard, withOverpayments, principal, termYears, startYear, overpaymentEnabled, monthlyOverpayment);

        // Update charts
        const hasOverpayments = overpaymentEnabled || this.state.lumpSums.length > 0;
        MortgageCharts.update({
            standard,
            withOverpayments,
            startYear,
            termYears,
            principal,
            hasOverpayments,
            rateChanges: withOverpayments.rateChanges,
            ratePeriods: this.state.ratePeriods
        });

        // Update table
        this.updateTable();
    },

    updateSummary(standard, withOverpayments, principal, termYears, startYear, overpaymentEnabled, monthlyOverpayment) {
        const hasOverpayments = overpaymentEnabled || this.state.lumpSums.length > 0;

        // Summary cards
        document.getElementById('monthlyPayment').textContent = this.formatCurrency(standard.monthlyPayment);
        const convertedOverpayment = this.convertCurrency(monthlyOverpayment);
        document.getElementById('monthlyDetail').textContent = overpaymentEnabled && monthlyOverpayment > 0
            ? `+${this.getCurrencySymbol()}${convertedOverpayment.toFixed(0)} overpayment`
            : 'Standard payment';

        const displayInterest = hasOverpayments ? withOverpayments.totalInterest : standard.totalInterest;
        const displayTotalCost = principal + displayInterest;
        const displayMonths = hasOverpayments ? withOverpayments.totalMonths : standard.totalMonths;

        document.getElementById('totalInterest').textContent = this.formatCurrency(displayInterest);
        document.getElementById('totalCost').textContent = this.formatCurrency(displayTotalCost);

        const completionYear = startYear + displayMonths / 12;
        document.getElementById('completionYear').textContent = Math.ceil(completionYear);

        // Comparison panel
        document.getElementById('standardTerm').textContent = `${termYears} years`;
        document.getElementById('standardInterest').textContent = this.formatCurrency(standard.totalInterest);

        if (hasOverpayments) {
            const newTermYears = withOverpayments.totalMonths / 12;
            const yearsSaved = termYears - newTermYears;
            const interestSaved = standard.totalInterest - withOverpayments.totalInterest;

            document.getElementById('newTerm').textContent = `${newTermYears.toFixed(1)} years`;
            document.getElementById('timeSaved').textContent = yearsSaved > 0 ? `${yearsSaved.toFixed(1)} years saved` : '';
            document.getElementById('interestSaved').textContent = this.formatCurrency(interestSaved);
            document.getElementById('completionDetail').textContent = `${(termYears - newTermYears).toFixed(1)} years early`;
        } else {
            document.getElementById('newTerm').textContent = '-';
            document.getElementById('timeSaved').textContent = '';
            document.getElementById('interestSaved').textContent = '-';
            document.getElementById('completionDetail').textContent = 'Mortgage paid off';
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
        let totalPayments = 0, totalPrincipal = 0, totalInterest = 0, totalExtra = 0, totalLumpSum = 0;

        if (filterType === 'yearly') {
            html = this.buildYearlyTableRows(schedule);
        } else {
            html = this.buildMonthlyTableRows(schedule);
        }

        this.elements.amortizationBody.innerHTML = html;

        // Calculate totals for summary
        schedule.forEach(row => {
            totalPayments += row.totalPayment;
            totalPrincipal += row.principal;
            totalInterest += row.interest;
            totalExtra += row.extra;
            totalLumpSum += row.lumpSum;
        });

        const totalExtraPayments = totalExtra + totalLumpSum;
        this.elements.tableSummary.innerHTML = `
            <div class="table-summary-item">Total Payments: <span>${this.formatCurrency(totalPayments)}</span></div>
            <div class="table-summary-item">Total Principal: <span>${this.formatCurrency(totalPrincipal + totalExtra + totalLumpSum)}</span></div>
            <div class="table-summary-item">Total Interest: <span>${this.formatCurrency(totalInterest)}</span></div>
            ${totalExtraPayments > 0 ? `<div class="table-summary-item">Total Extra/Lump Sum: <span style="color:#e67e22">${this.formatCurrency(totalExtraPayments)}</span></div>` : ''}
            <div class="table-summary-item">Payments: <span>${schedule.length} months</span></div>
        `;
    },

    buildYearlyTableRows(schedule) {
        const yearlyData = {};
        schedule.forEach(row => {
            if (!yearlyData[row.year]) {
                yearlyData[row.year] = {
                    year: row.year, payments: 0, principal: 0, interest: 0,
                    extra: 0, lumpSum: 0, endBalance: 0, months: 0
                };
            }
            yearlyData[row.year].payments += row.totalPayment;
            yearlyData[row.year].principal += row.principal;
            yearlyData[row.year].interest += row.interest;
            yearlyData[row.year].extra += row.extra;
            yearlyData[row.year].lumpSum += row.lumpSum;
            yearlyData[row.year].endBalance = row.balance;
            yearlyData[row.year].months++;
        });

        return Object.values(yearlyData).map(year => {
            const hasLumpSum = year.lumpSum > 0;
            return `<tr class="${hasLumpSum ? 'has-lump-sum' : ''}">
                <td>${year.months}</td>
                <td><strong>${year.year}</strong></td>
                <td>${this.formatCurrencyDecimal(year.payments)}</td>
                <td>${this.formatCurrencyDecimal(year.principal)}</td>
                <td>${this.formatCurrencyDecimal(year.interest)}</td>
                <td class="extra">${year.extra > 0 || year.lumpSum > 0 ? this.formatCurrencyDecimal(year.extra + year.lumpSum) : '-'}</td>
                <td>${this.formatCurrencyDecimal(year.endBalance)}</td>
            </tr>`;
        }).join('');
    },

    buildMonthlyTableRows(schedule) {
        return schedule.map(row => {
            const isYearStart = row.monthNum === 1;
            const hasLumpSum = row.lumpSum > 0;
            const extraAmount = row.extra + row.lumpSum;

            return `<tr class="${isYearStart ? 'year-start' : ''} ${hasLumpSum ? 'has-lump-sum' : ''}">
                <td>${row.month}</td>
                <td>${this.monthNames[row.monthNum - 1]} ${row.year}</td>
                <td>${this.formatCurrencyDecimal(row.totalPayment)}</td>
                <td>${this.formatCurrencyDecimal(row.principal)}</td>
                <td>${this.formatCurrencyDecimal(row.interest)}</td>
                <td class="${row.lumpSum > 0 ? 'lump-sum' : 'extra'}">${extraAmount > 0 ? this.formatCurrencyDecimal(extraAmount) : '-'}</td>
                <td>${this.formatCurrencyDecimal(row.balance)}</td>
            </tr>`;
        }).join('');
    },

    // ==================== Formatting Utilities ====================

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

    /**
     * Get current currency symbol
     */
    getCurrencySymbol() {
        return this.CURRENCIES[this.state.currency].symbol;
    },

    // ==================== Export Functions ====================

    exportChartAsPNG(chartId, filename) {
        MortgageExports.exportChartAsPNG(chartId, filename);
    },

    exportAllChartsPDF() {
        MortgageExports.exportAllChartsPDF({
            principal: this.elements.principal.value,
            rate: this.elements.rate.value,
            term: this.elements.term.value,
            monthlyPayment: document.getElementById('monthlyPayment').textContent,
            totalInterest: document.getElementById('totalInterest').textContent,
            totalCost: document.getElementById('totalCost').textContent
        });
    },

    exportScheduleCSV() {
        const viewType = this.elements.tableView.value;
        const schedule = viewType === 'standard' ? this.state.standardSchedule : this.state.overpaymentSchedule;
        MortgageExports.exportScheduleCSV(schedule, viewType);
    },

    exportSchedulePDF() {
        const viewType = this.elements.tableView.value;
        const schedule = viewType === 'standard' ? this.state.standardSchedule : this.state.overpaymentSchedule;
        MortgageExports.exportSchedulePDF(schedule, {
            principal: this.elements.principal.value,
            rate: this.elements.rate.value,
            term: this.elements.term.value
        }, viewType);
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => MortgageApp.init());

// Global function exports for inline handlers
window.toggleAdvancedOptions = () => MortgageApp.toggleAdvancedOptions();
window.exportChartAsPNG = (chartId, filename) => MortgageApp.exportChartAsPNG(chartId, filename);
window.exportAllChartsPDF = () => MortgageApp.exportAllChartsPDF();
window.exportScheduleCSV = () => MortgageApp.exportScheduleCSV();
window.exportSchedulePDF = () => MortgageApp.exportSchedulePDF();
