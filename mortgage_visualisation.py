"""
Mortgage Repayment Visualisation
Principal: €196,687
Rate: 2.85% annual
Term: 23 years
"""

import matplotlib.pyplot as plt
import numpy as np

# Mortgage parameters
principal = 196_687
annual_rate = 2.85 / 100
term_years = 23
payments_made = 0
start_year = 2025  # Year mortgage begins

# Calculate monthly values
monthly_rate = annual_rate / 12
total_payments = term_years * 12
remaining_payments = total_payments - payments_made

# Monthly payment calculation (standard amortization formula)
monthly_payment = principal * (monthly_rate * (1 + monthly_rate)**total_payments) / ((1 + monthly_rate)**total_payments - 1)

# Generate amortization schedule
balance = principal
balances = [balance]
principal_payments = []
interest_payments = []
cumulative_principal = [0]
cumulative_interest = [0]

for month in range(1, total_payments + 1):
    interest = balance * monthly_rate
    principal_paid = monthly_payment - interest
    balance -= principal_paid

    balances.append(max(0, balance))
    principal_payments.append(principal_paid)
    interest_payments.append(interest)
    cumulative_principal.append(cumulative_principal[-1] + principal_paid)
    cumulative_interest.append(cumulative_interest[-1] + interest)

# Calculate summary statistics
total_interest = sum(interest_payments)
total_cost = principal + total_interest

# Print summary
print("=" * 50)
print("MORTGAGE SUMMARY")
print("=" * 50)
print(f"Loan Amount:        €{principal:,.2f}")
print(f"Interest Rate:      {annual_rate*100:.2f}%")
print(f"Term:               {term_years} years ({total_payments} payments)")
print(f"Monthly Payment:    €{monthly_payment:,.2f}")
print(f"Total Interest:     €{total_interest:,.2f}")
print(f"Total Cost:         €{total_cost:,.2f}")
print("=" * 50)

# Create visualisations
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle(f'Mortgage Repayment Analysis\n€{principal:,} at {annual_rate*100:.2f}% over {term_years} years',
             fontsize=14, fontweight='bold')

months = np.arange(0, total_payments + 1)
payment_months = np.arange(1, total_payments + 1)
years = start_year + months / 12  # Actual calendar years
payment_years = start_year + payment_months / 12
end_year = start_year + term_years

# Plot 1: Balance over time
ax1 = axes[0, 0]
ax1.fill_between(years, balances, alpha=0.3, color='steelblue')
ax1.plot(years, balances, color='steelblue', linewidth=2)
ax1.set_xlabel('Year')
ax1.set_ylabel('Remaining Balance (€)')
ax1.set_title('Remaining Balance Over Time')
ax1.set_xlim(start_year, end_year)
ax1.set_ylim(0, principal * 1.05)
ax1.grid(True, alpha=0.3)
ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'€{x:,.0f}'))
ax1.xaxis.set_major_locator(plt.MultipleLocator(5))

# Add markers at key points
for year_offset in [5, 10, 15, 20]:
    if year_offset <= term_years:
        idx = year_offset * 12
        ax1.annotate(f'€{balances[idx]:,.0f}',
                    xy=(start_year + year_offset, balances[idx]),
                    xytext=(start_year + year_offset, balances[idx] + principal*0.08),
                    ha='center', fontsize=9,
                    arrowprops=dict(arrowstyle='->', color='gray', lw=0.5))

# Plot 2: Monthly payment breakdown (stacked area)
ax2 = axes[0, 1]
ax2.stackplot(payment_years, interest_payments, principal_payments,
              labels=['Interest', 'Principal'],
              colors=['#e74c3c', '#27ae60'], alpha=0.8)
ax2.axhline(y=monthly_payment, color='black', linestyle='--', linewidth=1, label=f'Monthly Payment: €{monthly_payment:,.2f}')
ax2.set_xlabel('Year')
ax2.set_ylabel('Payment Amount (€)')
ax2.set_title('Monthly Payment Breakdown')
ax2.set_xlim(start_year, end_year)
ax2.legend(loc='right')
ax2.grid(True, alpha=0.3)
ax2.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'€{x:,.0f}'))
ax2.xaxis.set_major_locator(plt.MultipleLocator(5))

# Plot 3: Cumulative payments over time
ax3 = axes[1, 0]
ax3.stackplot(years, cumulative_interest, cumulative_principal,
              labels=['Cumulative Interest', 'Cumulative Principal'],
              colors=['#e74c3c', '#27ae60'], alpha=0.8)
ax3.set_xlabel('Year')
ax3.set_ylabel('Cumulative Amount Paid (€)')
ax3.set_title('Cumulative Payments Over Time')
ax3.set_xlim(start_year, end_year)
ax3.legend(loc='upper left')
ax3.grid(True, alpha=0.3)
ax3.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'€{x:,.0f}'))
ax3.xaxis.set_major_locator(plt.MultipleLocator(5))

# Plot 4: Summary pie chart
ax4 = axes[1, 1]
sizes = [principal, total_interest]
labels = [f'Principal\n€{principal:,.0f}', f'Interest\n€{total_interest:,.0f}']
colors = ['#27ae60', '#e74c3c']
explode = (0, 0.05)

wedges, texts, autotexts = ax4.pie(sizes, explode=explode, labels=labels, colors=colors,
                                   autopct='%1.1f%%', startangle=90,
                                   textprops={'fontsize': 10})
ax4.set_title(f'Total Cost Breakdown\nTotal: €{total_cost:,.0f}')

plt.tight_layout()
plt.savefig('mortgage_visualisation.png', dpi=150, bbox_inches='tight')
plt.show()

print(f"\nVisualisation saved to 'mortgage_visualisation.png'")
