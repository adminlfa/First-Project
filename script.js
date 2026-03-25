// Data model
const OWNERS = ['Ifhel', 'Bryan', 'Jenny', 'Charley'];

// Core metrics with aggregation types (default)
const DEFAULT_METRICS = [
  { id: 'emails_added', name: 'Emails Added', owner: 'Ifhel', type: 'sum' },
  { id: 'catalyst_members', name: 'Catalyst Members Added', owner: 'Ifhel', type: 'sum' },
  { id: 'catalyst_newsletters', name: 'Catalyst Newsletters Sent', owner: 'Ifhel', type: 'sum' },
  { id: 'lfa_newsletters', name: 'LFA Newsletters Sent', owner: 'Ifhel', type: 'sum' },
  { id: 'video_views', name: 'Video Views', owner: 'Ifhel', type: 'sum' },
  { id: 'qualified_leads', name: 'Qualified Leads Added', owner: 'Bryan', type: 'sum' },
  { id: 'conversion_rate', name: 'Conversion Rate %', owner: 'Bryan', type: 'average' },
  { id: 'podcast_downloads', name: 'Podcast Downloads', owner: 'Bryan', type: 'sum' },
  { id: 'new_sales', name: 'New Sales Made', owner: 'Jenny', type: 'sum' },
  { id: 'revenue', name: 'Revenue Collected', owner: 'Charley', type: 'currency' }
];

let metrics = [...DEFAULT_METRICS];
let rows = []; // [{date: 'YYYY-MM-DD', values: {metricId: number}}]

// LocalStorage persistence
function saveMetricsToStorage() {
  localStorage.setItem('lfa_kpi_metrics', JSON.stringify(metrics));
}

function loadMetricsFromStorage() {
  const stored = localStorage.getItem('lfa_kpi_metrics');
  if (stored) {
    try {
      metrics = JSON.parse(stored);
    } catch (e) {
      console.error('Error loading metrics from storage:', e);
      metrics = [...DEFAULT_METRICS];
    }
  }
}

// Get or create row by date
function getOrCreateRow(dateStr) {
  let row = rows.find(r => r.date === dateStr);
  if (!row) {
    row = { date: dateStr, values: {} };
    rows.push(row);
    sortRowsByDate();
  }
  return row;
}

// Sort rows by date (newest first)
function sortRowsByDate() {
  rows.sort((a, b) => b.date.localeCompare(a.date));
}

// Set cell value (creates row if needed, updates if exists)
function setCellValue(metricId, dateStr, value) {
  const row = getOrCreateRow(dateStr);
  
  // Handle 'NA' value
  if (value === 'NA' || value === 'na') {
    row.values[metricId] = 'NA';
  } else if (value === '' || value === null) {
    row.values[metricId] = undefined;
  } else {
    const numVal = parseFloat(value);
    row.values[metricId] = isNaN(numVal) ? undefined : numVal;
  }
  
  sortRowsByDate();
  rebuildTable();
}

// Delete entire row by date
function deleteRowByDate(dateStr) {
  const index = rows.findIndex(r => r.date === dateStr);
  if (index > -1) {
    rows.splice(index, 1);
    rebuildTable();
    clearEntryForm();
  }
}

// Calculate totals
function calculateTotals() {
  const totals = {};
  metrics.forEach(m => {
    if (m.type === 'average') {
      totals[m.id] = { sum: 0, count: 0 };
    } else {
      totals[m.id] = 0;
    }
  });

  rows.forEach(r => {
    metrics.forEach(m => {
      const v = r.values[m.id];
      // Skip 'NA' values and undefined values
      if (v === 'NA' || v === undefined) return;
      
      if (typeof v === 'number') {
        if (m.type === 'average') {
          totals[m.id].sum += v;
          totals[m.id].count += 1;
        } else {
          totals[m.id] += v;
        }
      }
    });
  });

  // Convert averages
  metrics.forEach(m => {
    if (m.type === 'average' && totals[m.id].count > 0) {
      totals[m.id] = totals[m.id].sum / totals[m.id].count;
    } else if (m.type === 'average') {
      totals[m.id] = 0;
    }
  });

  return totals;
}

// Format cell value for display
function formatCellValue(metricId, value) {
  if (value === 'NA') return '—';
  if (value === undefined || value === '' || value === null) return '';
  
  const metric = metrics.find(m => m.id === metricId);
  const num = parseFloat(value);
  
  if (metric && metric.type === 'currency') {
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  if (metric && metric.type === 'average') {
    return num.toFixed(2);
  }
  
  if (metric && metric.name.includes('Conversion Rate')) {
    return num.toFixed(2) + '%';
  }
  
  return String(num);
}

// Rebuild table (read-only display)
function rebuildTable() {
  const table = document.getElementById('running-table');
  const tableBody = document.getElementById('table-body');
  const totalsRow = document.getElementById('totals-row');

  // Clear existing rows
  const thead = table.querySelector('thead');
  thead.innerHTML = '';
  tableBody.innerHTML = '';
  totalsRow.innerHTML = '';

  // Build header rows: first owner grouping, second metric names
  const ownerRow = document.createElement('tr');
  const metricHeaderRow = document.createElement('tr');

  // date placeholder cell for both rows
  const emptyCell1 = document.createElement('th');
  emptyCell1.textContent = '';
  emptyCell1.style.minWidth = '100px';
  ownerRow.appendChild(emptyCell1.cloneNode(true));
  metricHeaderRow.appendChild(emptyCell1);

  // compute contiguous owner spans
  let ownerSpans = [];
  let currentOwner = null;
  let spanCount = 0;
  metrics.forEach(m => {
    if (m.owner !== currentOwner) {
      if (currentOwner !== null) {
        ownerSpans.push({ owner: currentOwner, count: spanCount });
      }
      currentOwner = m.owner;
      spanCount = 1;
    } else {
      spanCount++;
    }
  });
  if (currentOwner !== null) {
    ownerSpans.push({ owner: currentOwner, count: spanCount });
  }

  ownerSpans.forEach(s => {
    const th = document.createElement('th');
    th.textContent = s.owner;
    th.colSpan = s.count;
    th.style.textAlign = 'center';
    ownerRow.appendChild(th);
  });

  metrics.forEach(m => {
    const th = document.createElement('th');
    th.textContent = m.name;
    th.style.minWidth = '120px';
    metricHeaderRow.appendChild(th);
  });

  thead.appendChild(ownerRow);
  thead.appendChild(metricHeaderRow);

  // Build body rows
  rows.forEach(r => {
    const tr = document.createElement('tr');
    
    // Date cell (clickable)
    const dateTd = document.createElement('td');
    dateTd.textContent = r.date;
    dateTd.style.cursor = 'pointer';
    dateTd.style.textDecoration = 'underline';
    dateTd.style.color = 'var(--accent)';
    dateTd.style.fontWeight = '600';
    dateTd.addEventListener('click', () => {
      loadRowIntoForm(r.date);
    });
    tr.appendChild(dateTd);

    // Data cells (read-only text)
    metrics.forEach(m => {
      const td = document.createElement('td');
      const value = r.values[m.id];
      td.textContent = formatCellValue(m.id, value);
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });

  // Build totals row
  const totals = calculateTotals();
  const tdLabel = document.createElement('td');
  tdLabel.textContent = 'Total';
  tdLabel.style.fontWeight = '700';
  totalsRow.appendChild(tdLabel);

  metrics.forEach(m => {
    const td = document.createElement('td');
    const val = totals[m.id];
    td.textContent = formatCellValue(m.id, val);
    td.style.fontWeight = '700';
    totalsRow.appendChild(td);
  });
}

// Update entry metric dropdown based on owner
function updateMetricDropdown(owner) {
  const sel = document.getElementById('entry-metric');
  sel.innerHTML = '<option value="">Select metric…</option>';
  const ownerMetrics = metrics.filter(m => m.owner === owner);
  ownerMetrics.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    sel.appendChild(opt);
  });
}

// Add custom metric (insert next to owner's existing metrics)
function addCustomMetric(name, owner) {
  if (!name || !owner) {
    alert('Please enter metric name and owner');
    return;
  }
  const id = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
  const newMetric = { id, name, owner, type: 'sum' };
  
  // Find the last metric for this owner
  let insertIndex = metrics.length;
  for (let i = metrics.length - 1; i >= 0; i--) {
    if (metrics[i].owner === owner) {
      insertIndex = i + 1;
      break;
    }
  }
  
  // Insert the new metric at the correct position
  metrics.splice(insertIndex, 0, newMetric);
  
  saveMetricsToStorage();
  updateMetricDropdown(document.getElementById('entry-owner').value);
  renderMetricsList();
  rebuildTable();
}

// Delete metric with confirmation
function deleteMetric(metricId) {
  const metric = metrics.find(m => m.id === metricId);
  if (!metric) return;
  
  const confirmed = confirm(
    `Delete "${metric.name}"?\n\nThis will remove this column and all its data from the Weekly KPI table.`
  );
  
  if (confirmed) {
    metrics = metrics.filter(m => m.id !== metricId);
    
    // Remove metric data from all rows
    rows.forEach(r => {
      delete r.values[metricId];
    });
    
    saveMetricsToStorage();
    updateMetricDropdown(document.getElementById('entry-owner').value);
    renderMetricsList();
    rebuildTable();
  }
}

// Edit metric (rename or change owner)
function editMetric(metricId, newName, newOwner) {
  const metric = metrics.find(m => m.id === metricId);
  if (!metric) return;
  
  // Update name and owner
  metric.name = newName;
  metric.owner = newOwner;
  
  // Remove from current position and re-insert in correct position for new owner
  metrics = metrics.filter(m => m.id !== metricId);
  
  // Find insertion point for new owner
  let insertIndex = metrics.length;
  for (let i = metrics.length - 1; i >= 0; i--) {
    if (metrics[i].owner === newOwner) {
      insertIndex = i + 1;
      break;
    }
  }
  
  metrics.splice(insertIndex, 0, metric);
  
  saveMetricsToStorage();
  updateMetricDropdown(document.getElementById('entry-owner').value);
  renderMetricsList();
  rebuildTable();
}

// Render metrics list grouped by owner
function renderMetricsList() {
  const container = document.getElementById('metrics-list');
  container.innerHTML = '';
  
  if (metrics.length === 0) {
    container.innerHTML = '<p style="color: var(--muted);">No metrics configured.</p>';
    return;
  }
  
  OWNERS.forEach(owner => {
    const ownerMetrics = metrics.filter(m => m.owner === owner);
    
    ownerMetrics.forEach(metric => {
      const item = document.createElement('div');
      item.className = 'metric-item';
      
      const info = document.createElement('div');
      info.className = 'metric-info';
      info.innerHTML = `
        <div class="metric-name">${escapeHtml(metric.name)}</div>
        <div class="metric-owner">${metric.owner}</div>
      `;
      
      const actions = document.createElement('div');
      actions.className = 'metric-actions';
      
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-sm btn-edit';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => startEditMetric(metric.id, metric.name, metric.owner));
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-sm btn-delete-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deleteMetric(metric.id));
      
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      
      item.appendChild(info);
      item.appendChild(actions);
      container.appendChild(item);
    });
  });
}

// Helper function to escape HTML special characters
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Start editing a metric (show inline form)
function startEditMetric(metricId, metricName, metricOwner) {
  // Find the metric item and replace with edit form
  const items = document.querySelectorAll('.metric-item');
  let targetItem = null;
  
  // Find the item that contains the metric info with matching name
  items.forEach(item => {
    const nameEl = item.querySelector('.metric-name');
    if (nameEl && nameEl.textContent === metricName) {
      targetItem = item;
    }
  });
  
  if (!targetItem) return;
  
  const form = document.createElement('div');
  form.className = 'edit-metric-form';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = `edit-name-${metricId}`;
  nameInput.value = metricName;
  nameInput.placeholder = 'Metric name';
  
  const ownerSelect = document.createElement('select');
  ownerSelect.id = `edit-owner-${metricId}`;
  OWNERS.forEach(owner => {
    const option = document.createElement('option');
    option.value = owner;
    option.textContent = owner;
    if (owner === metricOwner) option.selected = true;
    ownerSelect.appendChild(option);
  });
  
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-save-sm';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', () => confirmEdit(metricId));
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-cancel-sm';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', renderMetricsList);
  
  form.appendChild(nameInput);
  form.appendChild(ownerSelect);
  form.appendChild(saveBtn);
  form.appendChild(cancelBtn);
  
  targetItem.replaceWith(form);
}

// Confirm and save metric edit
function confirmEdit(metricId) {
  const newName = document.getElementById(`edit-name-${metricId}`).value.trim();
  const newOwner = document.getElementById(`edit-owner-${metricId}`).value;
  
  if (!newName) {
    alert('Please enter a metric name');
    return;
  }
  
  editMetric(metricId, newName, newOwner);
}

// Load row data into entry form
function loadRowIntoForm(dateStr) {
  const row = rows.find(r => r.date === dateStr);
  if (!row) return;

  // Set date
  document.getElementById('entry-date').value = dateStr;
  
  // Find first metric with data
  const firstMetricWithData = metrics.find(m => row.values[m.id] !== undefined);
  
  if (firstMetricWithData) {
    document.getElementById('entry-owner').value = firstMetricWithData.owner;
    updateMetricDropdown(firstMetricWithData.owner);
    document.getElementById('entry-metric').value = firstMetricWithData.id;
    const value = row.values[firstMetricWithData.id];
    document.getElementById('entry-value').value = value === 'NA' ? 'NA' : (value || '');
  } else {
    document.getElementById('entry-owner').value = 'Ifhel';
    updateMetricDropdown('Ifhel');
    document.getElementById('entry-metric').value = '';
    document.getElementById('entry-value').value = '';
  }
  
  // Scroll to form
  document.querySelector('.entry-section').scrollIntoView({ behavior: 'smooth' });
}

// Clear entry form
function clearEntryForm() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('entry-date').value = today;
  document.getElementById('entry-owner').value = 'Ifhel';
  updateMetricDropdown('Ifhel');
  document.getElementById('entry-metric').value = '';
  document.getElementById('entry-value').value = '';
}

// Download CSV
function downloadCSV() {
  const totals = calculateTotals();
  const rows_data = [];

  // Header row
  const headers = ['Date'];
  metrics.forEach(m => headers.push(m.name));
  rows_data.push(headers);

  // Data rows
  rows.forEach(r => {
    const cols = [r.date];
    metrics.forEach(m => {
      const v = r.values[m.id];
      if (v !== undefined && v !== null) {
        cols.push(String(v));
      } else {
        cols.push('');
      }
    });
    rows_data.push(cols);
  });

  // Totals row
  const totalsRow = ['Total'];
  metrics.forEach(m => {
    const val = totals[m.id];
    if (m.type === 'average') {
      totalsRow.push(val.toFixed(2));
    } else if (m.type === 'currency') {
      totalsRow.push(val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else {
      totalsRow.push(String(val || 0));
    }
  });
  rows_data.push(totalsRow);

  // Create CSV
  const csv = rows_data.map(row =>
    row.map(cell => {
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LFA-KPI-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // Load metrics from storage (or use defaults)
  loadMetricsFromStorage();
  
  // Set today's date by default
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('entry-date').value = today;

  // Initial renders
  rebuildTable();
  renderMetricsList();
  updateMetricDropdown('Ifhel');

  // Owner dropdown listener
  document.getElementById('entry-owner').addEventListener('change', e => {
    updateMetricDropdown(e.target.value);
  });

  // Add Entry button
  document.getElementById('add-entry-btn').addEventListener('click', () => {
    const metricId = document.getElementById('entry-metric').value;
    const date = document.getElementById('entry-date').value;
    const value = document.getElementById('entry-value').value.trim();

    if (!metricId) {
      alert('Please select a metric');
      return;
    }
    if (!date) {
      alert('Please select a date');
      return;
    }
    if (value === '') {
      alert('Please enter a value or NA');
      return;
    }

    // Validate that value is either 'NA' or a number
    if (value.toUpperCase() !== 'NA' && isNaN(parseFloat(value))) {
      alert('Please enter a valid number or NA');
      return;
    }

    setCellValue(metricId, date, value);
    document.getElementById('entry-value').value = '';
  });

  // Delete Entry button
  document.getElementById('delete-entry-btn').addEventListener('click', () => {
    const date = document.getElementById('entry-date').value;
    if (!date) {
      alert('Please select a date');
      return;
    }
    
    const row = rows.find(r => r.date === date);
    if (!row) {
      alert('No entry found for this date');
      return;
    }
    
    if (confirm(`Delete all data for ${date}?`)) {
      deleteRowByDate(date);
    }
  });

  // Clear Form button
  document.getElementById('clear-form-btn').addEventListener('click', clearEntryForm);

  // Add Metric button
  document.getElementById('add-metric-btn').addEventListener('click', () => {
    const name = document.getElementById('new-metric-name').value;
    const owner = document.getElementById('new-metric-owner').value;
    addCustomMetric(name, owner);
    document.getElementById('new-metric-name').value = '';
  });

  // Download CSV button
  document.getElementById('download-btn').addEventListener('click', downloadCSV);
});
