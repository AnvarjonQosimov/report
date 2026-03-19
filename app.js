let transactions = JSON.parse(localStorage.getItem('finmap_uz_transactions')) || [];
let currentType = 'expense';

const defaultCategories = {
    expense: ['Oziq-ovqat', 'Transport', 'Uy-joy', 'Kafe', 'Ko\'ngilochar', 'Sog\'liqni saqlash', 'Kiyim-kechak', 'Aloqa', 'Boshqa'],
    income: ['Oylik maosh', 'Frilans', 'Sovg\'alar', 'Investitsiya', 'Savdo', 'Boshqa']
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

// Global init based on page
function initApp(pageType) {
    const dateInput = document.getElementById('date');
    if(dateInput) dateInput.valueAsDate = new Date();
    
    // Voice API Setup
    const voiceBtn = document.getElementById('btnVoice');
    if(voiceBtn) {
        voiceBtn.addEventListener('click', startVoiceRecognition);
    }
    
    const form = document.getElementById('transactionForm');
    if(form) {
        form.addEventListener('submit', handleAddTransaction);
    }

    // Toggle Mobile Menu
    const menuToggle = document.getElementById('menuToggle');
    if(menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }

    if(pageType === 'dashboard') {
        updateDashboard();
    } else if (pageType === 'daromad') {
        renderFilteredList('income');
    } else if (pageType === 'xarajat') {
        renderFilteredList('expense');
    }
}

// Voice setup
function startVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Kechirasiz, qurilmangiz ovozli orqali kiritishni qo'llab-quvvatlamaydi.");
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'uz-UZ';
    recognition.interimResults = false;
    
    const voiceBtn = document.getElementById('btnVoice');
    voiceBtn.innerHTML = '<i class="fa-solid fa-microphone-lines fa-fade"></i> Gapiring...';

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const descInput = document.getElementById('description');
        const amountInput = document.getElementById('amount');
        
        // Try extracting numbers ending in "ming" => *1000, "million" => *1000000 etc. or just raw digits
        const lowerData = transcript.toLowerCase();
        let amount = 0;
        
        // basic regex extract
        const digitMatch = lowerData.match(/\d+/g);
        if(digitMatch) {
            let numStr = digitMatch.join(''); // e.g. "10", "000" => 10000
            let val = parseInt(numStr, 10);
            if(lowerData.includes('ming')) val *= 1000;
            if(lowerData.includes('million')) val *= 1000000;
            amount = val;
        }

        if(amount > 0) amountInput.value = amount;
        descInput.value = transcript;
        voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Ovozli';
    };

    recognition.onerror = (e) => {
        console.error(e);
        voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Ovozli xato';
        setTimeout(() => { voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Ovozli kiritish'; }, 2000);
    };

    recognition.onend = () => {
        voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Ovozli kiritish';
    };

    recognition.start();
}

function openModal(defaultType) {
    if(defaultType) setTransactionType(defaultType);
    else setTransactionType('expense'); // Default to expense
    document.getElementById('transactionModal').classList.add('active');
}

function closeModal() {
    document.getElementById('transactionModal').classList.remove('active');
    document.getElementById('transactionForm').reset();
    document.getElementById('date').valueAsDate = new Date();
}

function setTransactionType(type) {
    currentType = type;
    const btnExp = document.getElementById('btnTypeExpense');
    const btnInc = document.getElementById('btnTypeIncome');
    if(btnExp) btnExp.classList.toggle('active', type === 'expense');
    if(btnInc) btnInc.classList.toggle('active', type === 'income');
    updateCategoriesUI();
}

function updateCategoriesUI() {
    const select = document.getElementById('category');
    if(!select) return;
    select.innerHTML = '';
    defaultCategories[currentType].forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

function handleAddTransaction(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;

    const transaction = {
        id: Date.now().toString(),
        type: currentType,
        amount: amount,
        category: category,
        date: date,
        description: description
    };

    transactions.push(transaction);
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    saveData();
    closeModal();
    window.location.reload(); // Refresh current page to update data
}

function deleteTransaction(id) {
    if(confirm('Ushbu amaliyotni o\'chirmoqchimisiz?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        window.location.reload();
    }
}

function saveData() {
    localStorage.setItem('finmap_uz_transactions', JSON.stringify(transactions));
}

// Sub-functions for rendering
function renderTableHtml(dataToRender) {
    if (dataToRender.length === 0) {
        return `<div class="empty-state">
            <i class="fa-solid fa-receipt"></i>
            <p>Hozircha amaliyotlar yo'q. Birinchi amaliyotni qo'shing!</p>
        </div>`;
    }
    let html = `<table>
        <thead>
            <tr>
                <th>Sana</th>
                <th>Kategoriya</th>
                <th>Izoh</th>
                <th>Summa</th>
                <th></th>
            </tr>
        </thead>
        <tbody>`;

    dataToRender.forEach(t => {
        const sign = t.type === 'income' ? '+' : '-';
        html += `
            <tr>
                <td>${formatDate(t.date)}</td>
                <td><span class="cat-badge">${t.category}</span></td>
                <td>${t.description || '-'}</td>
                <td class="amount ${t.type}">${sign} ${formatCurrency(t.amount)}</td>
                <td style="text-align: right;">
                    <button class="btn-delete" onclick="deleteTransaction('${t.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    html += `</tbody></table>`;
    return html;
}

function renderFilteredList(typeFilter) {
    const filtered = transactions.filter(t => t.type === typeFilter);
    const container = document.getElementById('transactionsContainer');
    if(container) {
        container.innerHTML = renderTableHtml(filtered);
    }
    
    // update total text
    const totalEl = document.getElementById('pageTotal');
    if(totalEl) {
        const sum = filtered.reduce((acc, curr) => acc + curr.amount, 0);
        totalEl.textContent = formatCurrency(sum);
    }
}

function updateDashboard() {
    let income = 0; let expense = 0;
    transactions.forEach(t => {
        if(t.type === 'income') income += t.amount;
        if(t.type === 'expense') expense += t.amount;
    });

    const balEl = document.getElementById('total-balance');
    const incEl = document.getElementById('total-income');
    const expEl = document.getElementById('total-expense');
    
    if(balEl) balEl.textContent = formatCurrency(income - expense);
    if(incEl) incEl.textContent = formatCurrency(income);
    if(expEl) expEl.textContent = formatCurrency(expense);

    const container = document.getElementById('transactionsContainer');
    if(container) {
        container.innerHTML = renderTableHtml(transactions.slice(0, 10)); // last 10
    }

    if(typeof Chart !== 'undefined') {
        updateCharts();
    }
}

// Chart Logic Default Setup
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Inter', sans-serif";

function updateCharts() {
    const mainCtx = document.getElementById('mainChart');
    const catCtx = document.getElementById('categoryChart');
    if(!mainCtx || !catCtx) return;

    // Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let datesMap = new Map();
    let catMap = new Map();

    for(let i=14; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        datesMap.set(dateStr, { income: 0, expense: 0 });
    }

    transactions.forEach(t => {
        const tDate = new Date(t.date);
        if(tDate >= thirtyDaysAgo) {
            const dStr = t.date;
            if(datesMap.has(dStr)) {
                let current = datesMap.get(dStr);
                if(t.type === 'income') current.income += t.amount;
                else current.expense += t.amount;
            }
        }
        if(t.type === 'expense') {
            const currentVal = catMap.get(t.category) || 0;
            catMap.set(t.category, currentVal + t.amount);
        }
    });

    const labelsMain = Array.from(datesMap.keys()).map(d => formatDate(d).slice(0, 6));
    const dataIncome = Array.from(datesMap.values()).map(v => v.income);
    const dataExpense = Array.from(datesMap.values()).map(v => v.expense);

    new Chart(mainCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labelsMain,
            datasets: [
                { label: 'Daromadlar', data: dataIncome, backgroundColor: 'rgba(16, 185, 129, 0.8)', borderRadius: 4 },
                { label: 'Xarajatlar', data: dataExpense, backgroundColor: 'rgba(239, 68, 68, 0.8)', borderRadius: 4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const labelsCat = Array.from(catMap.keys());
    const dataCat = Array.from(catMap.values());
    const colorPalette = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

    if(dataCat.length > 0) {
        new Chart(catCtx.getContext('2d'), {
            type: 'doughnut',
            data: { labels: labelsCat, datasets: [{ data: dataCat, backgroundColor: colorPalette, borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right' } } }
        });
    }
}

// Close Modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('transactionModal');
    if (event.target === modal) {
        closeModal();
    }
}
