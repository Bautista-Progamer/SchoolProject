// ========== FRUITIFY WEB DASHBOARD ==========
// Tab-based navigation with smooth transitions

const STORAGE_KEY = 'fruitify_records';
let currentRecords = [];
let currentBatch = null;
let selectedRecord = null;
let qrCodeObj = null;

// ========== AUTH ==========
function logout() {
    sessionStorage.removeItem('fruitify_logged_in');
    window.location.href = 'login.html';
}

// ========== TAB NAVIGATION ==========
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const targetTab = this.dataset.tab;
        switchTab(targetTab);
    });
});

function switchTab(tabName) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('active');
        if (t.dataset.tab === tabName) {
            t.classList.add('active');
        }
    });

    // Switch panels with smooth transition
    const currentPanel = document.querySelector('.tab-panel.active');
    const newPanel = document.getElementById('tab-' + tabName);

    if (currentPanel && currentPanel !== newPanel) {
        currentPanel.style.animation = 'panelSlideOut 0.3s ease forwards';

        setTimeout(() => {
            currentPanel.classList.remove('active');
            currentPanel.style.animation = '';

            newPanel.classList.add('active');
            newPanel.style.animation = 'panelSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';

            // Refresh data for specific tabs
            if (tabName === 'inventory') renderInventory();
            if (tabName === 'export') updateExportCount();
        }, 300);
    } else if (!currentPanel) {
        newPanel.classList.add('active');
    }
}

// Add slide animations
const slideStyle = document.createElement('style');
slideStyle.textContent = `
    @keyframes panelSlideOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(-30px); }
    }
    @keyframes panelSlideIn {
        from { opacity: 0; transform: translateX(30px); }
        to { opacity: 1; transform: translateX(0); }
    }
`;
document.head.appendChild(slideStyle);

// ========== RECORD MANAGEMENT ==========
function loadRecords() {
    const stored = localStorage.getItem(STORAGE_KEY);
    currentRecords = stored ? JSON.parse(stored) : [];
}

function saveRecords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentRecords));
    updateStorageInfo();
}

function generateBatchNumber() {
    const date = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const hex = Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0');
    return 'FRUIT-' + date + '-' + hex;
}

function saveWebRecord() {
    const fruitName = document.getElementById('wFruitName').value.trim();
    const harvestDate = document.getElementById('wHarvestDate').value;

    if (!fruitName || !harvestDate) {
        alert('Fruit Name and Harvest Date are required!');
        return;
    }

    const batchNumber = generateBatchNumber();

    const record = {
        batchNumber: batchNumber,
        fruitName: fruitName,
        farmName: document.getElementById('wFarmName').value.trim(),
        supplierName: document.getElementById('wSupplierName').value.trim(),
        farmLocation: document.getElementById('wLocation').value.trim(),
        harvestDate: harvestDate,
        deliveryDate: document.getElementById('wDeliveryDate').value,
        quantity: parseInt(document.getElementById('wQuantity').value) || 0,
        qualityGrade: document.getElementById('wQualityGrade').value,
        certification: document.getElementById('wCertification').value.trim(),
        notes: document.getElementById('wNotes').value.trim(),
        createdAt: new Date().toISOString()
    };

    currentRecords.push(record);
    saveRecords();

    currentBatch = batchNumber;
    document.getElementById('wBatchNumber').textContent = batchNumber;
    document.getElementById('wBatchNumber').style.color = '#2e7d32';
    document.getElementById('wBtnGenQR').disabled = false;

    // Animate save button
    const saveBtn = document.getElementById('wBtnSave');
    saveBtn.innerHTML = '<span>✓</span> Saved';
    saveBtn.disabled = true;
    saveBtn.style.background = '#2e7d32';

    lockWebForm();

    // Show success toast
    showToast('Record saved! Batch: ' + batchNumber, 'success');
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 14px 24px;
        border-radius: 12px;
        color: white;
        font-weight: 600;
        z-index: 300;
        animation: toastSlide 0.4s ease;
        background: ${type === 'success' ? '#2e7d32' : '#e53e3e'};
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add toast animations
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes toastSlide {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes toastSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100px); opacity: 0; }
    }
`;
document.head.appendChild(toastStyle);

function lockWebForm() {
    document.querySelectorAll('#tab-add input, #tab-add select, #tab-add textarea')
        .forEach(el => el.disabled = true);
}

function clearWebForm() {
    document.querySelectorAll('#tab-add input, #tab-add select, #tab-add textarea')
        .forEach(el => {
            el.value = '';
            el.disabled = false;
        });
    document.getElementById('wBatchNumber').textContent = 'Will be generated after saving';
    document.getElementById('wBatchNumber').style.color = '';
    document.getElementById('wBtnGenQR').disabled = true;

    const saveBtn = document.getElementById('wBtnSave');
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span>💾</span> Save Data';
    saveBtn.style.background = '';

    document.getElementById('wQRSection').classList.add('hidden');
    currentBatch = null;
}

// ========== QR CODE GENERATION ==========
function generateWebQR() {
    const record = currentRecords.find(r => r.batchNumber === currentBatch);
    if (!record) return;

    const qrData = 'FRUITIFY|' + record.batchNumber + '|' + record.fruitName + '|' + record.harvestDate;

    document.getElementById('wQRSection').classList.remove('hidden');
    document.getElementById('wQRCode').innerHTML = '';

    qrCodeObj = new QRCode(document.getElementById('wQRCode'), {
        text: qrData,
        width: 280,
        height: 280,
        colorDark: '#1a1a2e',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });
}

function downloadWebQR() {
    const canvas = document.querySelector('#wQRCode canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'fruitify-qr-' + currentBatch + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function printWebQR() {
    const canvas = document.querySelector('#wQRCode canvas');
    if (!canvas) return;

    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head><title>Print QR Code</title></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
            <img src="${canvas.toDataURL()}" style="max-width:400px;">
        </body>
        </html>
    `);
    win.document.close();
    win.print();
}

// ========== QR CODE SCANNING ==========
function handleQRUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('qrCanvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                displayScanResult(code.data);
            } else {
                showToast('No QR code found. Try a clearer image.', 'error');
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function displayScanResult(data) {
    const resultDiv = document.getElementById('wScanResult');
    const contentDiv = document.getElementById('wScanContent');

    if (!data.startsWith('FRUITIFY|')) {
        contentDiv.innerHTML = '<div class="scan-error">❌ Invalid QR Code Format</div>\n<div class="scan-hint">This doesn\'t appear to be a Fruitify QR code.</div>\n<pre>' + escapeHtml(data) + '</pre>';
        resultDiv.classList.remove('hidden');
        resultDiv.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const parts = data.split('|');
    const batchNumber = parts[1];
    const fruitName = parts[2] || 'Unknown';
    const harvestDate = parts[3] || 'Unknown';
    const record = currentRecords.find(r => r.batchNumber === batchNumber);

    if (record) {
        // Full record found in web database
        let output = '<div class="scan-success">✅ Record Found</div>\n\n';
        output += '<div class="detail-grid">';
        output += '<div class="detail-item"><span class="detail-label-web">Batch Number</span><span class="detail-value-web">' + record.batchNumber + '</span></div>';
        output += '<div class="detail-item"><span class="detail-label-web">Fruit Name</span><span class="detail-value-web">' + record.fruitName + '</span></div>';
        output += '<div class="detail-item"><span class="detail-label-web">Farm Name</span><span class="detail-value-web">' + (record.farmName || 'N/A') + '</span></div>';
        output += '<div class="detail-item"><span class="detail-label-web">Supplier</span><span class="detail-value-web">' + (record.supplierName || 'N/A') + '</span></div>';
        output += '<div class="detail-item"><span class="detail-label-web">Location</span><span class="detail-value-web">' + (record.farmLocation || 'N/A') + '</span></div>';
        output += '<div class="detail-item"><span class="detail-label-web">Harvest Date</span><span class="detail-value-web">' + record.harvestDate + '</span></div>';
        output += '<div class="detail-item"><span class="detail-label-web">Delivery Date</span><span class="detail-value-web">' + (record.deliveryDate || 'N/A') + '</span></div>';
        output += '<div class="detail-item"><span class="detail-label-web">Quantity</span><span class="detail-value-web">' + (record.quantity || 0) + '</span></div>';
        output += '<div class="detail-item"><span class="detail-label-web">Quality Grade</span><span class="detail-value-web">' + (record.qualityGrade || 'N/A') + '</span></div>';
        output += '<div class="detail-item"><span class="detail-label-web">Certification</span><span class="detail-value-web">' + (record.certification || 'N/A') + '</span></div>';
        output += '<div class="detail-item full"><span class="detail-label-web">Notes</span><span class="detail-value-web">' + (record.notes || 'None') + '</span></div>';
        output += '</div>';
        contentDiv.innerHTML = output;
    } else {
        // QR is valid but record not in web database
        let output = '<div class="scan-warning">⚠️ Record Not Found in Web Dashboard</div>\n\n';
        output += '<div class="scan-info-box">';
        output += '<p><strong>QR Code Data:</strong></p>';
        output += '<div class="detail-grid">';
        output += '<div class="detail-item"><span class="detail-label-web">Batch Number</span><span class="detail-value-web">' + batchNumber + '</span></div>';
        output += '<div class="detail-item"><span class="detail-label-web">Fruit Name</span><span class="detail-value-web">' + fruitName + '</span></div>';
        output += '<div class="detail-item"><span class="detail-label-web">Harvest Date</span><span class="detail-value-web">' + harvestDate + '</span></div>';
        output += '</div>';
        output += '</div>\n\n';
        output += '<div class="scan-help-box">';
        output += '<p><strong>💡 How to see full details:</strong></p>';
        output += '<ol>';
        output += '<li>Open the <strong>Fruitify Android App</strong></li>';
        output += '<li>Go to <strong>Export Data</strong> and save the CSV/JSON file</li>';
        output += '<li>Come back to this web dashboard</li>';
        output += '<li>Go to the <strong>Export</strong> tab and click <strong>Import from Mobile App</strong></li>';
        output += '<li>Upload the exported file</li>';
        output += '<li>Now scan the QR code again — full details will appear!</li>';
        output += '</ol>';
        output += '</div>';
        contentDiv.innerHTML = output;
    }

    resultDiv.classList.remove('hidden');
    resultDiv.scrollIntoView({ behavior: 'smooth' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== INVENTORY ==========
function renderInventory() {
    const list = document.getElementById('wInventoryList');
    const search = document.getElementById('wSearch').value.toLowerCase();

    let filtered = currentRecords;
    if (search) {
        filtered = currentRecords.filter(r =>
            r.fruitName.toLowerCase().includes(search) ||
            r.batchNumber.toLowerCase().includes(search) ||
            (r.supplierName && r.supplierName.toLowerCase().includes(search)) ||
            (r.farmName && r.farmName.toLowerCase().includes(search))
        );
    }

    document.getElementById('wRecordCount').textContent = filtered.length + ' records';

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>No records found</p>
                <small>${search ? 'Try a different search term' : 'Add fruit records from the Add Fruit tab'}</small>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map((r, index) => `
        <div class="record-card" onclick="showWebDetail('${r.batchNumber}')" style="animation: cardAppear 0.3s ${index * 0.05}s ease both;">
            <div class="batch">${r.batchNumber}</div>
            <div class="fruit">${r.fruitName}</div>
            <div class="meta">
                <span>📅 ${r.harvestDate}</span>
                <span>📦 ${r.quantity || 0} units</span>
                <span>⭐ Grade ${r.qualityGrade || 'N/A'}</span>
            </div>
        </div>
    `).join('');
}

// Add card appear animation
const cardStyle = document.createElement('style');
cardStyle.textContent = `
    @keyframes cardAppear {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(cardStyle);

function filterWebInventory() {
    renderInventory();
}

// ========== RECORD DETAIL MODAL ==========
function showWebDetail(batchNumber) {
    selectedRecord = currentRecords.find(r => r.batchNumber === batchNumber);
    if (!selectedRecord) return;

    const content = document.getElementById('wDetailContent');
    const r = selectedRecord;

    content.innerHTML = `
        <div class="detail-row"><span class="detail-label">Batch Number:</span><span class="detail-value">${r.batchNumber}</span></div>
        <div class="detail-row"><span class="detail-label">Fruit Name:</span><span class="detail-value">${r.fruitName}</span></div>
        <div class="detail-row"><span class="detail-label">Farm Name:</span><span class="detail-value">${r.farmName || 'N/A'}</span></div>
        <div class="detail-row"><span class="detail-label">Supplier:</span><span class="detail-value">${r.supplierName || 'N/A'}</span></div>
        <div class="detail-row"><span class="detail-label">Location:</span><span class="detail-value">${r.farmLocation || 'N/A'}</span></div>
        <div class="detail-row"><span class="detail-label">Harvest Date:</span><span class="detail-value">${r.harvestDate}</span></div>
        <div class="detail-row"><span class="detail-label">Delivery Date:</span><span class="detail-value">${r.deliveryDate || 'N/A'}</span></div>
        <div class="detail-row"><span class="detail-label">Quantity:</span><span class="detail-value">${r.quantity || 0}</span></div>
        <div class="detail-row"><span class="detail-label">Quality Grade:</span><span class="detail-value">${r.qualityGrade || 'N/A'}</span></div>
        <div class="detail-row"><span class="detail-label">Certification:</span><span class="detail-value">${r.certification || 'N/A'}</span></div>
        <div class="detail-row"><span class="detail-label">Notes:</span><span class="detail-value">${r.notes || 'None'}</span></div>
        <div class="detail-row"><span class="detail-label">Created:</span><span class="detail-value">${new Date(r.createdAt).toLocaleString()}</span></div>
    `;

    document.getElementById('wDetailModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeWebDetail() {
    document.getElementById('wDetailModal').classList.add('hidden');
    document.body.style.overflow = '';
    selectedRecord = null;
}

function deleteWebRecord() {
    if (!selectedRecord) return;

    if (!confirm('Are you sure you want to delete this record?')) return;

    currentRecords = currentRecords.filter(r => r.batchNumber !== selectedRecord.batchNumber);
    saveRecords();
    closeWebDetail();
    renderInventory();
    showToast('Record deleted', 'success');
}

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeWebDetail();
    }
});

// ========== EXPORT ==========
function updateExportCount() {
    document.getElementById('wExportCount').textContent = currentRecords.length;
    document.getElementById('wStoredRecords').textContent = currentRecords.length;
}

function escapeCSV(value) {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function exportWebCSV() {
    if (currentRecords.length === 0) {
        showToast('No records to export', 'error');
        return;
    }

    let csv = 'Batch Number,Fruit Name,Farm Name,Supplier Name,Location,Harvest Date,Delivery Date,Quantity,Quality Grade,Certification,Notes,Created At\n';

    currentRecords.forEach(r => {
        csv += escapeCSV(r.batchNumber) + ',' +
               escapeCSV(r.fruitName) + ',' +
               escapeCSV(r.farmName) + ',' +
               escapeCSV(r.supplierName) + ',' +
               escapeCSV(r.farmLocation) + ',' +
               escapeCSV(r.harvestDate) + ',' +
               escapeCSV(r.deliveryDate) + ',' +
               r.quantity + ',' +
               escapeCSV(r.qualityGrade) + ',' +
               escapeCSV(r.certification) + ',' +
               escapeCSV(r.notes) + ',' +
               escapeCSV(r.createdAt) + '\n';
    });

    downloadFile(csv, 'Fruitify_Export_' + new Date().toISOString().slice(0,10) + '.csv', 'text/csv');
    showToast('CSV exported successfully', 'success');
}

function exportWebJSON() {
    if (currentRecords.length === 0) {
        showToast('No records to export', 'error');
        return;
    }

    const data = {
        app: 'Fruitify',
        version: '1.0',
        exportDate: new Date().toISOString(),
        recordCount: currentRecords.length,
        records: currentRecords
    };

    downloadFile(JSON.stringify(data, null, 2), 'Fruitify_Export_' + new Date().toISOString().slice(0,10) + '.json', 'application/json');
    showToast('JSON exported successfully', 'success');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// ========== IMPORT FROM APP ==========
function handleWebImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Update file name display
    document.getElementById('wFileName').textContent = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;

        if (file.name.endsWith('.json')) {
            try {
                const data = JSON.parse(content);
                if (data.records && Array.isArray(data.records)) {
                    importRecords(data.records);
                } else {
                    showToast('Invalid JSON format', 'error');
                }
            } catch (err) {
                showToast('Error parsing JSON: ' + err.message, 'error');
            }
        } else if (file.name.endsWith('.csv')) {
            parseCSVImport(content);
        }
    };
    reader.readAsText(file);
}

function parseCSVImport(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        showToast('CSV file is empty', 'error');
        return;
    }

    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < 5) continue;

        records.push({
            batchNumber: values[0] || generateBatchNumber(),
            fruitName: values[1] || 'Unknown',
            farmName: values[2] || '',
            supplierName: values[3] || '',
            farmLocation: values[4] || '',
            harvestDate: values[5] || '',
            deliveryDate: values[6] || '',
            quantity: parseInt(values[7]) || 0,
            qualityGrade: values[8] || '',
            certification: values[9] || '',
            notes: values[10] || '',
            createdAt: values[11] || new Date().toISOString()
        });
    }

    importRecords(records);
}

function importRecords(newRecords) {
    let added = 0;
    newRecords.forEach(r => {
        if (!currentRecords.find(existing => existing.batchNumber === r.batchNumber)) {
            currentRecords.push(r);
            added++;
        }
    });

    saveRecords();
    showToast('Imported ' + added + ' new records!', 'success');
    updateExportCount();
}

// ========== STORAGE INFO ==========
function updateStorageInfo() {
    const storageText = document.getElementById('storageText');
    const storageWarning = document.getElementById('storageWarning');
    const storedRecords = document.getElementById('wStoredRecords');
    const storageUsed = document.getElementById('wStorageUsed');

    if (!storageText) return;

    const recordCount = currentRecords.length;
    const dataSize = new Blob([JSON.stringify(currentRecords)]).size;
    const sizeKB = (dataSize / 1024).toFixed(2);

    storageText.textContent = `${recordCount} records stored locally (${sizeKB} KB)`;

    if (dataSize > 4 * 1024 * 1024) {
        storageWarning.classList.remove('hidden');
    } else {
        storageWarning.classList.add('hidden');
    }

    if (storedRecords) storedRecords.textContent = recordCount;
    if (storageUsed) storageUsed.textContent = sizeKB + ' KB';
}

// ========== INIT ==========
loadRecords();
updateStorageInfo();
