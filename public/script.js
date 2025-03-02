let totalIncome = 0;
let totalExpenses = 0;

window.onload = function () {
  const dateInput = document.getElementById('date');
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  dateInput.value = formattedDate;
  document.getElementById('inputDate').classList.remove('hidden');
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

  addRowToTable(type, title, amount, source, notes, date);
  resetForm();  // Clear the input fields after submitting the entry
}

function addRowToTable(type, title, amount, source, notes, date) {
  const tableBody = document.getElementById('entriesTableBody');
  const row = document.createElement('tr');
  
  // Create a new row with the corrected column positions for source and status
  row.innerHTML = `
    <td><input type="checkbox"></td>
    <td>${date}</td>
    <td>${title}</td>
    <td class="${type === 'income' ? 'green' : 'red'}">$${amount.toFixed(2)}</td>
    <td>${source}</td>  <!-- Source column -->
    <td>
      <select class="status-dropdown">
        <option value="">update staus</option>
        <option value="pending">Pending</option>
        <option value="done">Done</option>
      </select>
    </td> <!-- Status column -->
    <td>${notes}</td>
  `;
  
  // Add event listener to update status
  const statusDropdown = row.querySelector('.status-dropdown');
  statusDropdown.addEventListener('change', function () {
    const status = statusDropdown.value;
    updateRowBackgroundColor(row, status);
  });

  tableBody.appendChild(row);

  // Update totals
  if (type === 'income') {
    totalIncome += amount;
    document.getElementById('totalIncome').textContent = `$${totalIncome.toFixed(2)}`;
  } else {
    totalExpenses += amount;
    document.getElementById('totalExpenses').textContent = `$${totalExpenses.toFixed(2)}`;
  }

  // Update net total
  const netTotal = totalIncome - totalExpenses;
  document.getElementById('netTotal').textContent = `$${netTotal.toFixed(2)}`;
}

// Update row background color based on status
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

// Delete all entries
function deleteAllEntries() {
  const tableBody = document.getElementById('entriesTableBody');
  tableBody.innerHTML = ''; // Clear all rows
  
  // Reset the totals
  totalIncome = 0;
  totalExpenses = 0;
  document.getElementById('totalIncome').textContent = `$${totalIncome.toFixed(2)}`;
  document.getElementById('totalExpenses').textContent = `$${totalExpenses.toFixed(2)}`;
  document.getElementById('netTotal').textContent = `$${(totalIncome - totalExpenses).toFixed(2)}`;
}

// Export to Excel function
function exportToExcel() {
  const table = document.querySelector("table"); // Get the table
  const workbook = XLSX.utils.table_to_book(table, { sheet: "Sheet 1" }); // Convert the table to a workbook
  const excelFile = XLSX.write(workbook, { bookType: "xlsx", type: "binary" }); // Generate binary content for the Excel file

  // Create a Blob object with the binary content and set the MIME type for Excel files
  const blob = new Blob([s2ab(excelFile)], { type: "application/octet-stream" });
  
  // Create a link element to download the file
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "expense_income_tracker.xlsx"; // File name for download
  
  // Trigger the download by simulating a click event
  link.click();
}

// Helper function to convert the binary string to an array buffer
function s2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i) & 0xff;
  }
  return buf;
}

// Clear the form fields
function resetForm() {
  document.getElementById('title').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('source').value = '';
  document.getElementById('notes').value = '';
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
  hideInputs();  // Hide inputs when the form is reset
}
