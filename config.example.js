// Mortgage Calculator Configuration
// Edit these values to change the default settings

const CONFIG = {
    // Mortgage defaults
    principal: 300000,          // Loan amount in euros
    annualRate: 3.1,           // Annual interest rate (%)
    termYears: 30,              // Loan term in years
    startYear: 2026,            // Year mortgage begins

    // Overpayment defaults
    enableOverpayment: false,   // Start with overpayments enabled
    monthlyOverpayment: 100,    // Default extra monthly payment

    // Default lump sums (optional)
    // Add entries like: { year: 2030, amount: 10000 }
    lumpSums: [],

    // Interest rate periods (optional)
    // Define different rates for different time periods
    // Add entries like: { startYear: 2026, endYear: 2030, rate: 3.0 }
    // If empty, the default annual rate above will be used throughout
    ratePeriods: []
};
