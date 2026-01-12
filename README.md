# Mortgage Calculator

An interactive web-based mortgage repayment calculator that visualises your mortgage payments over time and shows the impact of overpayments and lump sum payments.

## Features

- **Interactive Charts** - Four dynamic visualisations powered by Chart.js:
  - Remaining balance over time
  - Monthly payment breakdown (principal vs interest)
  - Cumulative payments over time
  - Total cost breakdown (pie chart)

- **Overpayment Analysis** - See how regular monthly overpayments reduce your mortgage term and total interest paid

- **Lump Sum Payments** - Add multiple one-time payments at specific years and see their impact

- **Amortization Table** - Full monthly breakdown with:
  - Toggle between standard and overpayment schedules
  - View all months or yearly summaries
  - Highlighted rows for January and lump sum months

- **Real-time Updates** - All charts and calculations update instantly as you change inputs

## Quick Start

1. Download or clone the repository
2. Open `mortgage_calculator.html` in any modern web browser
3. Enter your mortgage details and explore the visualisations

No server or installation required - it runs entirely in your browser.

## Files

| File | Description |
|------|-------------|
| `mortgage_calculator.html` | Main interactive web application |
| `guide.html` | Usage guide and documentation |
| `mortgage_visualisation.py` | Python script for generating static charts |
| `mortgage_visualisation.png` | Sample output from Python script |

## Usage Guide

See [guide.html](guide.html) for detailed instructions on using all features of the calculator.

## Python Script

The repository also includes a Python script (`mortgage_visualisation.py`) for generating static mortgage visualisation charts using matplotlib.

### Requirements
```bash
pip install matplotlib numpy
```

### Usage
Edit the parameters at the top of the script and run:
```bash
python mortgage_visualisation.py
```

## Browser Compatibility

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - feel free to use and modify for your own purposes.
