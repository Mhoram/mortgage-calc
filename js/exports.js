/**
 * Exports Module
 * PDF and CSV export functionality
 */

const MortgageExports = {
    // Colors for PDF exports
    colors: {
        primary: [52, 152, 219],      // Blue
        secondary: [230, 126, 34],     // Orange
        darkGray: [44, 62, 80],
        lightGray: [236, 240, 241],
        white: [255, 255, 255],
        lightBlue: [235, 245, 251]
    },

    /**
     * Export a single chart as PNG
     * @param {string} chartId - Canvas element ID
     * @param {string} filename - Output filename (without extension)
     */
    exportChartAsPNG(chartId, filename) {
        const canvas = document.getElementById(chartId);
        const link = document.createElement('a');
        link.download = filename + '.png';
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    },

    /**
     * Export all charts as a multi-page PDF
     * @param {Object} summaryData - Current mortgage summary data
     */
    exportAllChartsPDF(summaryData) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4');

        const charts = [
            { id: 'balanceChart', title: 'Remaining Balance Over Time' },
            { id: 'paymentChart', title: 'Monthly Payment Breakdown' },
            { id: 'cumulativeChart', title: 'Cumulative Payments Over Time' },
            { id: 'pieChart', title: 'Total Cost Breakdown' }
        ];

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const totalPages = charts.length + 1;

        charts.forEach((chart, index) => {
            if (index > 0) pdf.addPage();

            this._addPageBranding(pdf, pageWidth, pageHeight, margin, index + 1, totalPages);

            const canvas = document.getElementById(chart.id);
            const imgData = canvas.toDataURL('image/png', 1.0);

            // Add title
            pdf.setTextColor(...this.colors.primary);
            pdf.setFontSize(18);
            pdf.setFont(undefined, 'bold');
            pdf.text(chart.title, pageWidth / 2, 22, { align: 'center' });

            // Calculate image dimensions
            const imgWidth = pageWidth - (margin * 2);
            const imgHeight = (canvas.height / canvas.width) * imgWidth;

            pdf.addImage(imgData, 'PNG', margin, 28, imgWidth, Math.min(imgHeight, pageHeight - 50));
        });

        // Add summary page
        pdf.addPage();
        this._addPageBranding(pdf, pageWidth, pageHeight, margin, totalPages, totalPages);
        this._addSummaryPage(pdf, pageWidth, margin, summaryData);

        pdf.save('mortgage-charts.pdf');
    },

    /**
     * Export amortization schedule as CSV
     * @param {Array} schedule - Amortization schedule data
     * @param {string} viewType - 'standard' or 'with-overpayments'
     */
    exportScheduleCSV(schedule, viewType) {
        if (!schedule || schedule.length === 0) {
            alert('No schedule data to export');
            return;
        }

        const headers = ['Month', 'Year', 'Date', 'Payment', 'Principal', 'Interest', 'Extra', 'Lump Sum', 'Total Payment', 'Balance'];
        let csv = headers.join(',') + '\n';

        schedule.forEach(row => {
            csv += [
                row.month,
                row.year,
                row.date,
                row.payment.toFixed(2),
                row.principal.toFixed(2),
                row.interest.toFixed(2),
                row.extra.toFixed(2),
                row.lumpSum.toFixed(2),
                row.totalPayment.toFixed(2),
                row.balance.toFixed(2)
            ].join(',') + '\n';
        });

        // Calculate totals
        const totals = schedule.reduce((acc, row) => {
            acc.payment += row.payment;
            acc.principal += row.principal;
            acc.interest += row.interest;
            acc.extra += row.extra;
            acc.lumpSum += row.lumpSum;
            acc.totalPayment += row.totalPayment;
            return acc;
        }, { payment: 0, principal: 0, interest: 0, extra: 0, lumpSum: 0, totalPayment: 0 });

        csv += '\n';
        csv += [
            'TOTAL', '', '',
            totals.payment.toFixed(2),
            totals.principal.toFixed(2),
            totals.interest.toFixed(2),
            totals.extra.toFixed(2),
            totals.lumpSum.toFixed(2),
            totals.totalPayment.toFixed(2),
            ''
        ].join(',') + '\n';

        // Trigger download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'amortization-schedule.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    },

    /**
     * Export amortization schedule as PDF
     * @param {Array} schedule - Amortization schedule data
     * @param {Object} mortgageInfo - Basic mortgage info (principal, rate, term)
     * @param {string} viewType - 'standard' or 'with-overpayments'
     */
    exportSchedulePDF(schedule, mortgageInfo, viewType) {
        if (!schedule || schedule.length === 0) {
            alert('No schedule data to export');
            return;
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('portrait', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;

        let pageNum = 1;

        // Helper to add header/footer
        const addPageBranding = () => {
            // Header bar
            pdf.setFillColor(...this.colors.primary);
            pdf.rect(0, 0, pageWidth, 15, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'bold');
            pdf.text('Mortgage Repayment Calculator', margin, 10);

            pdf.setFontSize(9);
            pdf.setFont(undefined, 'normal');
            const date = new Date().toLocaleDateString('en-IE');
            pdf.text(date, pageWidth - margin, 10, { align: 'right' });

            // Footer
            pdf.setFillColor(...this.colors.lightGray);
            pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');

            pdf.setTextColor(...this.colors.darkGray);
            pdf.setFontSize(8);
            pdf.text('Generated by Mortgage Calculator', margin, pageHeight - 5);
            pdf.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
        };

        addPageBranding();

        // Title
        pdf.setTextColor(...this.colors.primary);
        pdf.setFontSize(18);
        pdf.setFont(undefined, 'bold');
        pdf.text('Amortization Schedule', pageWidth / 2, 25, { align: 'center' });

        // Mortgage info bar
        pdf.setFillColor(...this.colors.lightBlue);
        pdf.roundedRect(margin, 30, pageWidth - margin * 2, 12, 2, 2, 'F');

        pdf.setTextColor(...this.colors.darkGray);
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        const infoText = `Principal: \u20AC${parseFloat(mortgageInfo.principal).toLocaleString()}  |  Rate: ${mortgageInfo.rate}%  |  Term: ${mortgageInfo.term} years  |  Schedule: ${viewType === 'standard' ? 'Standard' : 'With Overpayments'}`;
        pdf.text(infoText, pageWidth / 2, 38, { align: 'center' });

        // Table setup
        const headers = ['#', 'Date', 'Payment', 'Principal', 'Interest', 'Extra', 'Balance'];
        const colWidths = [15, 25, 28, 28, 28, 22, 34];
        const tableWidth = colWidths.reduce((a, b) => a + b, 0);
        const tableX = (pageWidth - tableWidth) / 2;

        let y = 50;
        const headerHeight = 8;
        const rowHeight = 6;

        // Draw table header
        const drawTableHeader = () => {
            pdf.setFillColor(...this.colors.primary);
            pdf.rect(tableX, y, tableWidth, headerHeight, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(8);
            pdf.setFont(undefined, 'bold');

            let x = tableX;
            headers.forEach((header, i) => {
                pdf.text(header, x + colWidths[i] / 2, y + 5.5, { align: 'center' });
                x += colWidths[i];
            });

            y += headerHeight;
        };

        drawTableHeader();

        // Draw rows
        pdf.setFont(undefined, 'normal');
        schedule.forEach((row, index) => {
            if (y > pageHeight - 25) {
                pdf.addPage();
                pageNum++;
                addPageBranding();
                y = 22;
                drawTableHeader();
            }

            // Alternating row colors
            if (index % 2 === 0) {
                pdf.setFillColor(...this.colors.lightGray);
                pdf.rect(tableX, y, tableWidth, rowHeight, 'F');
            }

            // Highlight rows with lump sums
            if (row.lumpSum > 0) {
                pdf.setFillColor(232, 245, 233);
                pdf.rect(tableX, y, tableWidth, rowHeight, 'F');
            }

            pdf.setTextColor(...this.colors.darkGray);
            pdf.setFontSize(7);

            let x = tableX;
            const rowData = [
                row.month.toString(),
                row.date,
                '\u20AC' + row.payment.toFixed(0),
                '\u20AC' + row.principal.toFixed(0),
                '\u20AC' + row.interest.toFixed(0),
                '\u20AC' + (row.extra + row.lumpSum).toFixed(0),
                '\u20AC' + row.balance.toFixed(0)
            ];

            rowData.forEach((cell, i) => {
                pdf.text(cell, x + colWidths[i] / 2, y + 4, { align: 'center' });
                x += colWidths[i];
            });

            y += rowHeight;
        });

        // Totals row
        y += 2;
        if (y > pageHeight - 30) {
            pdf.addPage();
            pageNum++;
            addPageBranding();
            y = 25;
        }

        const totals = schedule.reduce((acc, row) => {
            acc.principal += row.principal;
            acc.interest += row.interest;
            acc.extra += row.extra + row.lumpSum;
            acc.totalPayment += row.totalPayment;
            return acc;
        }, { principal: 0, interest: 0, extra: 0, totalPayment: 0 });

        // Totals bar
        pdf.setFillColor(...this.colors.secondary);
        pdf.roundedRect(tableX, y, tableWidth, 10, 2, 2, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        const totalsText = `Total Paid: \u20AC${totals.totalPayment.toFixed(0)}  |  Principal: \u20AC${totals.principal.toFixed(0)}  |  Interest: \u20AC${totals.interest.toFixed(0)}  |  Extra: \u20AC${totals.extra.toFixed(0)}`;
        pdf.text(totalsText, pageWidth / 2, y + 6.5, { align: 'center' });

        pdf.save('amortization-schedule.pdf');
    },

    // Private helper methods
    _addPageBranding(pdf, pageWidth, pageHeight, margin, pageNum, totalPages) {
        // Header bar
        pdf.setFillColor(...this.colors.primary);
        pdf.rect(0, 0, pageWidth, 12, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text('Mortgage Repayment Calculator', margin, 8);

        const date = new Date().toLocaleDateString('en-IE');
        pdf.setFont(undefined, 'normal');
        pdf.text(date, pageWidth - margin, 8, { align: 'right' });

        // Footer
        pdf.setFillColor(...this.colors.lightGray);
        pdf.rect(0, pageHeight - 10, pageWidth, 10, 'F');

        pdf.setTextColor(...this.colors.darkGray);
        pdf.setFontSize(8);
        pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
        pdf.text('Generated by Mortgage Calculator', margin, pageHeight - 4);
    },

    _addSummaryPage(pdf, pageWidth, margin, summaryData) {
        // Summary title
        pdf.setTextColor(...this.colors.primary);
        pdf.setFontSize(22);
        pdf.setFont(undefined, 'bold');
        pdf.text('Mortgage Summary', pageWidth / 2, 25, { align: 'center' });

        const cardY = 40;
        const cardWidth = (pageWidth - margin * 3) / 2;
        const cardHeight = 35;

        const summaryCards = [
            { label: 'Loan Amount', value: `\u20AC${parseFloat(summaryData.principal).toLocaleString()}`, x: margin, y: cardY },
            { label: 'Interest Rate', value: `${summaryData.rate}%`, x: margin + cardWidth + margin, y: cardY },
            { label: 'Loan Term', value: `${summaryData.term} years`, x: margin, y: cardY + cardHeight + 10 },
            { label: 'Monthly Payment', value: summaryData.monthlyPayment, x: margin + cardWidth + margin, y: cardY + cardHeight + 10 },
            { label: 'Total Interest', value: summaryData.totalInterest, x: margin, y: cardY + (cardHeight + 10) * 2 },
            { label: 'Total Cost', value: summaryData.totalCost, x: margin + cardWidth + margin, y: cardY + (cardHeight + 10) * 2 }
        ];

        summaryCards.forEach((item, idx) => {
            const isHighlight = idx >= 4;
            pdf.setFillColor(...(isHighlight ? this.colors.secondary : this.colors.lightGray));
            pdf.roundedRect(item.x, item.y, cardWidth, cardHeight, 3, 3, 'F');

            // Label
            pdf.setTextColor(isHighlight ? 255 : this.colors.darkGray[0], isHighlight ? 255 : this.colors.darkGray[1], isHighlight ? 255 : this.colors.darkGray[2]);
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            pdf.text(item.label, item.x + 8, item.y + 12);

            // Value
            pdf.setFontSize(18);
            pdf.setFont(undefined, 'bold');
            pdf.text(item.value, item.x + 8, item.y + 26);
        });
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MortgageExports;
}
