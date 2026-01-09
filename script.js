document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const transactionForm = document.getElementById('transaction-form');
    const typeToggle = document.getElementById('type-toggle');
    const paymentModeToggle = document.getElementById('payment-mode-toggle');
    const paymentModeSection = document.getElementById('payment-mode-section');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const transactionTableBody = document.getElementById('transaction-table-body');
    const emptyState = document.getElementById('empty-state');

    // Dashboard Elements
    const totalInEl = document.getElementById('total-in');
    const totalInModesEl = document.getElementById('total-in-modes');
    const totalOutEl = document.getElementById('total-out');
    const netTotalEl = document.getElementById('net-total');
    const todayNetEl = document.getElementById('today-net');
    const todaySummaryEl = document.getElementById('today-summary');
    const monthNetEl = document.getElementById('month-net');
    const monthSummaryEl = document.getElementById('month-summary');
    const currentDateEl = document.getElementById('current-date');

    // Export Buttons
    const exportExcelBtn = document.getElementById('export-excel');
    const exportPdfBtn = document.getElementById('export-pdf');

    // *** NEW: Modal Elements ***
    const confirmModalOverlay = document.getElementById('confirm-modal-overlay');
    const modalBtnCancel = document.getElementById('modal-btn-cancel');
    const modalBtnConfirm = document.getElementById('modal-btn-confirm');

    // --- State ---
    let transactions = JSON.parse(localStorage.getItem('nsm_transactions')) || [];
    let currentType = 'in'; // 'in' or 'out'
    let currentMode = 'Cash'; // 'Cash', 'UPI', 'Card'
    let transactionIdToDelete = null; // *** NEW: To store ID for modal

    // --- Event Listeners ---

    // Form submission
    transactionForm.addEventListener('submit', addTransaction);

    // Toggle for 'Cash In' / 'Cash Out'
    typeToggle.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        typeToggle.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentType = button.dataset.type;

        if (currentType === 'out') {
            paymentModeSection.style.maxHeight = '0';
            paymentModeSection.style.opacity = '0';
            paymentModeSection.style.overflow = 'hidden';
            paymentModeSection.style.marginTop = '-10px';
        } else {
            paymentModeSection.style.maxHeight = '100px';
            paymentModeSection.style.opacity = '1';
            paymentModeSection.style.overflow = 'visible';
            paymentModeSection.style.marginTop = '0';
        }
    });

    // Toggle for Payment Mode
    paymentModeToggle.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        paymentModeToggle.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentMode = button.dataset.mode;
    });

    // Delete transaction - *** UPDATED ***
    transactionTableBody.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            const id = parseInt(deleteButton.dataset.id);
            // Open the custom modal instead of the browser confirm
            openConfirmModal(id);
        }
    });

    // *** NEW: Modal Listeners ***
    modalBtnCancel.addEventListener('click', closeConfirmModal);
    modalBtnConfirm.addEventListener('click', () => {
        if (transactionIdToDelete !== null) {
            deleteTransaction(transactionIdToDelete);
        }
        closeConfirmModal();
    });
    // Close modal if clicking on the background overlay
    confirmModalOverlay.addEventListener('click', (e) => {
        if (e.target === confirmModalOverlay) {
            closeConfirmModal();
        }
    });

    // Export Listeners
    exportExcelBtn.addEventListener('click', exportToExcel);
    exportPdfBtn.addEventListener('click', exportToPDF);

    // --- Core Functions ---

    /**
     * Initializes the application.
     */
    function init() {
        updateDate();
        renderTransactions();
        updateDashboard();
    }

    /**
     * Updates the current date display in the header.
     */
    function updateDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateEl.textContent = now.toLocaleDateString('en-IN', options);
    }

    /**
     * Handles the submission of a new transaction.
     */
    function addTransaction(e) {
        e.preventDefault();

        // *** UPDATED: Description is optional ***
        let description = descriptionInput.value.trim();
        if (description === '') {
            description = 'No description'; // Default value if empty
        }

        const amount = parseFloat(amountInput.value);

        // Validation only for amount
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        const transaction = {
            id: Date.now(),
            date: new Date().toISOString(),
            description: description,
            amount: amount,
            type: currentType,
            mode: currentType === 'in' ? currentMode : 'Cash',
        };

        transactions.push(transaction);
        saveToLocalStorage(); // This will now work
        renderTransactions();
        updateDashboard();

        // Reset form
        transactionForm.reset();
        typeToggle.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        typeToggle.querySelector('[data-type="in"]').classList.add('active');
        paymentModeToggle.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        paymentModeToggle.querySelector('[data-mode="Cash"]').classList.add('active');
        currentType = 'in';
        currentMode = 'Cash';
        paymentModeSection.style.maxHeight = '100px';
        paymentModeSection.style.opacity = '1';
        paymentModeSection.style.overflow = 'visible';
        paymentModeSection.style.marginTop = '0';
    }

    /**
     * Deletes a transaction by its ID.
     */
    function deleteTransaction(id) {
        transactions = transactions.filter(tx => tx.id !== id);
        saveToLocalStorage(); // This will now work
        renderTransactions();
        updateDashboard();
    }

    /**
     * Saves the current transactions array to localStorage.
     */
    function saveToLocalStorage() {
        localStorage.setItem('nsm_transactions', JSON.stringify(transactions));
    }

    /**
     * Renders all transactions into the table.
     */
    function renderTransactions() {
        transactionTableBody.innerHTML = '';

        if (transactions.length === 0) {
            emptyState.classList.add('visible');
            return;
        }

        emptyState.classList.remove('visible');

        const transactionsToRender = [...transactions].reverse();

        transactionsToRender.forEach(tx => {
            const tr = document.createElement('tr');
            tr.classList.add(tx.type === 'in' ? 'cash-in' : 'cash-out');

            const formattedDate = new Date(tx.date).toLocaleString('en-IN', {
                dateStyle: 'short',
                timeStyle: 'short'
            });

            tr.innerHTML = `
                <td>${formattedDate}</td>
                <td>${tx.description}</td>
                <td class="type-cell">${tx.type === 'in' ? 'Cash In' : 'Cash Out'}</td>
                <td class="amount-cell">${tx.type === 'in' ? '+' : '-'} ₹${tx.amount.toFixed(2)}</td>
                <td>${tx.mode}</td>
                <td>
                    <button class="btn-danger delete-btn" data-id="${tx.id}">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            transactionTableBody.appendChild(tr);
        });
    }

    /**
     * Calculates all statistics and updates the dashboard.
     */
    function updateDashboard() {
        const stats = calculateStatistics();

        // Overall Totals
        totalInEl.textContent = `₹${stats.totalIn.toFixed(2)}`;
        totalOutEl.textContent = `₹${stats.totalOut.toFixed(2)}`;
        netTotalEl.textContent = `₹${stats.netTotal.toFixed(2)}`;
        netTotalEl.className = stats.netTotal >= 0 ? 'positive' : 'negative';

        totalInModesEl.textContent = `Cash: ₹${stats.totalInCash.toFixed(2)} | UPI: ₹${stats.totalInUpi.toFixed(2)} | Card: ₹${stats.totalInCard.toFixed(2)}`;

        // Daily Totals
        todayNetEl.textContent = `₹${stats.todayNet.toFixed(2)}`;
        todayNetEl.className = stats.todayNet >= 0 ? 'positive' : 'negative';
        todaySummaryEl.textContent = `(In: ₹${stats.todayIn.toFixed(2)} | Out: ₹${stats.todayOut.toFixed(2)})`;

        // Monthly Totals
        monthNetEl.textContent = `₹${stats.monthNet.toFixed(2)}`;
        monthNetEl.className = stats.monthNet >= 0 ? 'positive' : 'negative';
        monthSummaryEl.textContent = `(In: ₹${stats.monthIn.toFixed(2)} | Out: ₹${stats.monthOut.toFixed(2)})`;
    }

    /**
     * A helper function to get all summary statistics.
     */
    function calculateStatistics() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const thisMonth = now.toISOString().slice(0, 7); // YYYY-MM

        const stats = {
            totalIn: 0,
            totalOut: 0,
            totalInCash: 0,
            totalInUpi: 0,
            totalInCard: 0,
            todayIn: 0,
            todayOut: 0,
            monthIn: 0,
            monthOut: 0,
            dailyTotals: {},
            monthlyTotals: {}
        };

        for (const tx of transactions) {
            const txDate = tx.date.split('T')[0];
            const txMonth = tx.date.slice(0, 7);

            if (tx.type === 'in') {
                stats.totalIn += tx.amount;
                if (tx.mode === 'Cash') stats.totalInCash += tx.amount;
                if (tx.mode === 'UPI') stats.totalInUpi += tx.amount;
                if (tx.mode === 'Card') stats.totalInCard += tx.amount;
            } else {
                stats.totalOut += tx.amount;
            }

            if (txDate === today) {
                if (tx.type === 'in') stats.todayIn += tx.amount;
                else stats.todayOut += tx.amount;
            }

            if (txMonth === thisMonth) {
                if (tx.type === 'in') stats.monthIn += tx.amount;
                else stats.monthOut += tx.amount;
            }

            if (!stats.dailyTotals[txDate]) stats.dailyTotals[txDate] = { in: 0, out: 0, net: 0 };
            if (tx.type === 'in') stats.dailyTotals[txDate].in += tx.amount;
            else stats.dailyTotals[txDate].out += tx.amount;
            stats.dailyTotals[txDate].net = stats.dailyTotals[txDate].in - stats.dailyTotals[txDate].out;

            if (!stats.monthlyTotals[txMonth]) stats.monthlyTotals[txMonth] = { in: 0, out: 0, net: 0 };
            if (tx.type === 'in') stats.monthlyTotals[txMonth].in += tx.amount;
            else stats.monthlyTotals[txMonth].out += tx.amount;
            stats.monthlyTotals[txMonth].net = stats.monthlyTotals[txMonth].in - stats.monthlyTotals[txMonth].out;
        }

        stats.netTotal = stats.totalIn - stats.totalOut;
        stats.todayNet = stats.todayIn - stats.todayOut;
        stats.monthNet = stats.monthIn - stats.monthOut;

        return stats;
    }

    // --- *** NEW: Modal Control Functions *** ---

    /**
     * Opens the confirmation modal and stores the ID.
     */
    function openConfirmModal(id) {
        transactionIdToDelete = id;
        confirmModalOverlay.classList.add('visible');
    }

    /**
     * Closes the confirmation modal and clears the ID.
     */
    function closeConfirmModal() {
        transactionIdToDelete = null;
        confirmModalOverlay.classList.remove('visible');
    }


    // --- Export Functions ---

    function exportToExcel() {
        if (transactions.length === 0) {
            alert('No transactions to export.');
            return;
        }
        const data = transactions.map(tx => ({
            'Date': new Date(tx.date).toLocaleString('en-IN'),
            'Description': tx.description,
            'Type': tx.type === 'in' ? 'Cash In' : 'Cash Out',
            'Amount': tx.amount,
            'Payment Mode': tx.mode
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
        XLSX.writeFile(wb, 'NSM_Cash_Register_Export.xlsx');
    }

    function exportToPDF() {
        if (transactions.length === 0) {
            alert('No transactions to export.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const stats = calculateStatistics();
        const reportDate = new Date().toLocaleDateString('en-IN');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('NSM Cash Register - Report', 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${reportDate}`, 105, 26, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Overall Summary', 14, 40);

        doc.autoTable({
            startY: 45,
            theme: 'plain',
            body: [
                ['Total Cash In:', `₹${stats.totalIn.toFixed(2)}`],
                ['Total Cash Out (Expenses):', `₹${stats.totalOut.toFixed(2)}`],
                ['Net Total:', `₹${stats.netTotal.toFixed(2)}`],
            ],
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 2, },
            bodyStyles: {
                0: { fontStyle: 'bold', fillColor: '#f0f0f0' },
                1: { fontStyle: 'bold', fillColor: '#f0f0f0' },
                2: { fontStyle: 'bold', fillColor: '#f0f0f0' },
            }
        });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Cash In by Payment Mode', 14, doc.autoTable.previous.finalY + 10);

        doc.autoTable({
            startY: doc.autoTable.previous.finalY + 15,
            theme: 'striped',
            head: [['Mode', 'Total Amount (₹)']],
            body: [
                ['Cash', `₹${stats.totalInCash.toFixed(2)}`],
                ['UPI', `₹${stats.totalInUpi.toFixed(2)}`],
                ['Card', `₹${stats.totalInCard.toFixed(2)}`],
            ]
        });

        const dailyData = Object.entries(stats.dailyTotals).map(([date, data]) => [
            date, `₹${data.in.toFixed(2)}`, `₹${data.out.toFixed(2)}`, `₹${data.net.toFixed(2)}`
        ]).reverse();

        const monthlyData = Object.entries(stats.monthlyTotals).map(([month, data]) => [
            month, `₹${data.in.toFixed(2)}`, `₹${data.out.toFixed(2)}`, `₹${data.net.toFixed(2)}`
        ]).reverse();

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Daily Summary', 14, doc.autoTable.previous.finalY + 10);
        doc.autoTable({
            startY: doc.autoTable.previous.finalY + 15,
            head: [['Date', 'Total In', 'Total Out', 'Net']],
            body: dailyData,
        });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Monthly Summary', 14, doc.autoTable.previous.finalY + 10);
        doc.autoTable({
            startY: doc.autoTable.previous.finalY + 15,
            head: [['Month (YYYY-MM)', 'Total In', 'Total Out', 'Net']],
            body: monthlyData,
        });

        doc.addPage();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('All Transactions', 14, 20);

        const tableData = transactions.map(tx => [
            new Date(tx.date).toLocaleString('en-IN'),
            tx.description,
            tx.type === 'in' ? 'Cash In' : 'Cash Out',
            `₹${tx.amount.toFixed(2)}`,
            tx.mode
        ]).reverse();

        doc.autoTable({
            startY: 25,
            head: [['Date & Time', 'Description', 'Type', 'Amount', 'Mode']],
            body: tableData,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 123, 255] }
        });

        doc.save('NSM_Cash_Register_Report.pdf');
    }

    // --- Run Initialization ---
    init();
});