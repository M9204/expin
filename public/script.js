console.log('script.js is loaded!');

let totalIncome = 0;
let totalExpenses = 0;

window.onload = function () {
  const dateInput = document.getElementById('date');
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  dateInput.value = formattedDate;
  document.getElementById('inputDate').classList.remove('hidden');

  loadData(); // Load data when the page is loaded
};

function setEntryType(type) {
  const title = document.getElementById('title').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const source = document.getElementById('source').value;
  const notes = document.getElementById('notes').value;
  const date = document.getElementById('date').value;

  if (isNaN(amount) || amount <= 0 || title.trim() === '') {
    alert("Please enter a valid title and amount.");
    return;
  }

  const entryData = {
    type: type,
    title: title,
    amount: amount,
    source: source,
    notes: notes,
    date: date
  };

  // Add the row to the table
  addRowToTable(type, title, amount, source, notes, date);

  // Save data to the server
  saveDataToServer(entryData);

  resetForm();  // Clear the input fields after submitting the entry
}

function addRowToTable(type, title, amount, source, notes, date) {
  const tableBody = document.getElementById('entriesTableBody');
  const row = document.createElement('tr');

  row.innerHTML = `
    <td><input type="checkbox"></td>
    <td>${date}</td>
    <td>${title}</td>
    <td class="${type === 'income' ? 'green' : 'red'}">$${amount.toFixed(2)}</td>
    <td>${source}</td>
    <td>
      <select class="status-dropdown">
        <option value="">update status</option>
        <option value="pending">Pending</option>
        <option value="done">Done</option>
      </select>
    </td>
    <td>${notes}</td>
  `;

  const statusDropdown = row.querySelector('.status-dropdown');
  statusDropdown.addEventListener('change', function () {
    const status = statusDropdown.value;
    updateRowBackgroundColor(row, status);
  });

  tableBody.appendChild(row);

  if (type === 'income') {
    totalIncome += amount;
    document.getElementById('totalIncome').textContent = `$${totalIncome.toFixed(2)}`;
  } else {
    totalExpenses += amount;
    document.getElementById('totalExpenses').textContent = `$${totalExpenses.toFixed(2)}`;
  }

  const netTotal = totalIncome - totalExpenses;
  document.getElementById('netTotal').textContent = `$${netTotal.toFixed(2)}`;
}

function updateRowBackgroundColor(row, status) {
  if (status === 'done') {
    row.style.backgroundColor = 'lightgreen';
  } else if (status === 'pending') {
    row.style.backgroundColor = 'lightyellow';
  } else {
    row.style.backgroundColor = ''; // Default background color
  }
}

function hideInputs() {
  document.getElementById('inputAmount').classList.add('hidden');
  document.getElementById('inputNotes').classList.add('hidden');
  document.getElementById('inputSource').classList.add('hidden');
}

function showInput(id) {
  document.getElementById(id).classList.remove('hidden');
}

document.getElementById('title').addEventListener('input', function () {
  if (this.value.trim() !== '') {
    showInput('inputAmount');
  }
});

document.getElementById('amount').addEventListener('input', function () {
  if (this.value > 0) {
    showInput('inputSource');
  }
});

document.getElementById('source').addEventListener('change', function () {
  showInput('inputNotes');
});

function deleteSelectedEntries() {
  const selectedRows = document.querySelectorAll('input[type="checkbox"]:checked');
  
  selectedRows.forEach(checkbox => {
    const row = checkbox.closest('tr');
    const amountCell = row.querySelector('td:nth-child(4)');
    const amount = parseFloat(amountCell.textContent.replace('$', ''));
    const type = amountCell.classList.contains('green') ? 'income' : 'expense';

    if (type === 'income') {
      totalIncome -= amount;
      document.getElementById('totalIncome').textContent = `$${totalIncome.toFixed(2)}`;
    } else {
      totalExpenses -= amount;
      document.getElementById('totalExpenses').textContent = `$${totalExpenses.toFixed(2)}`;
    }

    row.classList.add('deleted');
    setTimeout(() => row.remove(), 3000);
  });

  const netTotal = totalIncome - totalExpenses;
  document.getElementById('netTotal').textContent = `$${netTotal.toFixed(2)}`;
}

function deleteAllEntries() {
  const tableBody = document.getElementById('entriesTableBody');
  tableBody.innerHTML = '';

  totalIncome = 0;
  totalExpenses = 0;
  document.getElementById('totalIncome').textContent = `$${totalIncome.toFixed(2)}`;
  document.getElementById('totalExpenses').textContent = `$${totalExpenses.toFixed(2)}`;
  document.getElementById('netTotal').textContent = `$${(totalIncome - totalExpenses).toFixed(2)}`;
}

function exportToExcel() {
  const table = document.querySelector("table");
  const workbook = XLSX.utils.table_to_book(table, { sheet: "Sheet 1" });
  const excelFile = XLSX.write(workbook, { bookType: "xlsx", type: "binary" });

  const blob = new Blob([s2ab(excelFile)], { type: "application/octet-stream" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "expense_income_tracker.xlsx";

  link.click();
}

function s2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i) & 0xff;
  }
  return buf;
}

function resetForm() {
  document.getElementById('title').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('source').value = '';
  document.getElementById('notes').value = '';
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  hideInputs();
}

// Save data to server
function saveDataToServer(entryData) {
  fetch('/api/data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entryData),
  })
  .then(response => response.json())
  .then(data => {
    console.log('Data saved successfully:', data);
  })
  .catch(error => {
    console.error('Error saving data:', error);
  });
}

// Load data from server and display it in the table
function loadData() {
  fetch('/api/data')
    .then(response => response.json())
    .then(data => {
      data.forEach(entry => {
        addRowToTable(entry.type, entry.title, entry.amount, entry.source, entry.notes, entry.date);
      });
    })
    .catch(error => {
      console.error('Error loading data:', error);
    });
}
