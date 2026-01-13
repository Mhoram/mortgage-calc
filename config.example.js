// Mortgage Calculator Configuration
// Edit these values to change the default settings

const CONFIG = {
    // Mortgage defaults
    principal: 300000,          // Loan amount in euros
    annualRate: 3.2,           // Annual interest rate (%)
    termYears: 30,              // Loan term in years
    startYear: 2025,            // Year mortgage begins

    // Overpayment defaults
    enableOverpayment: false,   // Start with overpayments enabled
    monthlyOverpayment: 100,    // Default extra monthly payment

    // Default lump sums (optional)
    // Add entries like: { year: 2030, amount: 10000 }
    lumpSums: []
};
