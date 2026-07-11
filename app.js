// ==========================================
// GLOBAL DEĞİŞKENLER VE YAPILANDIRMA
// ==========================================

// Veri Yapısı - O(1) karmaşıklık için Object kullanımı
let paletDatabase = {}; // { "123456789": "TTA101", ... }
let scannedPalets = {}; // { "123456789": timestamp, ... }
let extraPalets = []; // Listede olmayan paletler
let scanHistory = []; // Tarama geçmişi

// Kamera ve Tarayıcı
let html5QrcodeScanner = null;
let isScanning = false;
let isScanningEnabled = false; // Okuma aktif mi?
let lastScannedBarcode = null;
let lastScannedTime = 0;
const DEBOUNCE_TIME = 2000; // 2 saniye

// Ses Dosyaları (Web Audio API ile oluşturulacak)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// DOM Elementleri
let elements = {};

// ==========================================
// SAYFA YÜKLENDİĞİNDE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    attachEventListeners();
    updateStats();
});

// ==========================================
// DOM ELEMENTLERINI BAŞLATMA
// ==========================================
function initializeElements() {
    elements = {
        // Upload
        uploadSection: document.getElementById('uploadSection'),
        fileInput: document.getElementById('fileInput'),
        uploadBtn: document.getElementById('uploadBtn'),
        
        // Scanner
        scannerSection: document.getElementById('scannerSection'),
        startCameraBtn: document.getElementById('startCameraBtn'),
        stopCameraBtn: document.getElementById('stopCameraBtn'),
        changeFileBtn: document.getElementById('changeFileBtn'),
        scanControl: document.getElementById('scanControl'),
        scanBtn: document.getElementById('scanBtn'),
        reader: document.getElementById('reader'),
        
        // Stats
        totalCount: document.getElementById('totalCount'),
        scannedCount: document.getElementById('scannedCount'),
        remainingCount: document.getElementById('remainingCount'),
        extraCount: document.getElementById('extraCount'),
        
        // Last Scan Info
        lastScanInfo: document.getElementById('lastScanInfo'),
        lastBarcode: document.getElementById('lastBarcode'),
        lastLocation: document.getElementById('lastLocation'),
        
        // History
        historyList: document.getElementById('historyList'),
        
        // Report
        reportSection: document.getElementById('reportSection'),
        showReportBtn: document.getElementById('showReportBtn'),
        reportModal: document.getElementById('reportModal'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        reportContent: document.getElementById('reportContent'),
        
        // Toast
        toastContainer: document.getElementById('toastContainer')
    };
}

// ==========================================
// EVENT LISTENER'LARI BAĞLAMA
// ==========================================
function attachEventListeners() {
    // Excel yükleme
    elements.uploadBtn.addEventListener('click', () => {
        elements.fileInput.click();
    });
    
    elements.fileInput.addEventListener('change', handleFileUpload);
    
    // Kamera kontrolleri
    elements.startCameraBtn.addEventListener('click', startCamera);
    elements.stopCameraBtn.addEventListener('click', stopCamera);
    elements.changeFileBtn.addEventListener('click', changeFile);
    
    // Okuma kontrol butonu - Basılı tut
    elements.scanBtn.addEventListener('mousedown', startScanning);
    elements.scanBtn.addEventListener('mouseup', stopScanning);
    elements.scanBtn.addEventListener('mouseleave', stopScanning);
    elements.scanBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startScanning();
    });
    elements.scanBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopScanning();
    });
    elements.scanBtn.addEventListener('touchcancel', stopScanning);
    
    // Rapor
    elements.showReportBtn.addEventListener('click', showReport);
    elements.closeModalBtn.addEventListener('click', closeReport);
    
    // Modal dışına tıklama
    elements.reportModal.addEventListener('click', (e) => {
        if (e.target === elements.reportModal) {
            closeReport();
        }
    });
}

// ==========================================
// EXCEL DOSYASI YÜKLEME VE İŞLEME
// ==========================================
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showToast('📂 Dosya yükleniyor...', 'info');
    
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // Veri yapısını oluştur
        paletDatabase = {};
        let validCount = 0;
        
        jsonData.forEach(row => {
            const hu = row['Highest Level HU'];
            const bin = row['Storage Bin'];
            
            if (hu && bin) {
                // 9 haneli kontrolü
                const huStr = String(hu).trim();
                if (huStr.length === 9 && /^\d+$/.test(huStr)) {
                    paletDatabase[huStr] = String(bin).trim();
                    validCount++;
                }
            }
        });
        
        if (validCount === 0) {
            showToast('❌ Dosyada geçerli veri bulunamadı!', 'error');
            playSound('error');
            vibrate([200, 100, 200]);
            return;
        }
        
        // Başarılı yükleme
        scannedPalets = {};
        extraPalets = [];
        scanHistory = [];
        
        showToast(`✅ ${validCount} palet yüklendi!`, 'success');
        playSound('success');
        vibrate([100]);
        
        // UI değişiklikleri
        elements.uploadSection.style.display = 'none';
        elements.scannerSection.style.display = 'block';
        elements.reportSection.style.display = 'block';
        
        updateStats();
        updateHistoryList();
        
    } catch (error) {
        console.error('Dosya okuma hatası:', error);
        showToast('❌ Dosya okunamadı!', 'error');
        playSound('error');
        vibrate([200, 100, 200]);
    }
}

// ==========================================
// KAMERA BAŞLATMA
// ==========================================
function startCamera() {
    if (isScanning) return;
    
    const config = {
        fps: 30, // Yüksek FPS
        qrbox: { width: 280, height: 140 },
        aspectRatio: 1.777778,
        formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128],
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
        }
    };
    
    html5QrcodeScanner = new Html5Qrcode("reader");
    
    html5QrcodeScanner.start(
        { facingMode: "environment" }, // Arka kamera
        config,
        onScanSuccess,
        onScanFailure
    ).then(() => {
        isScanning = true;
        elements.startCameraBtn.style.display = 'none';
        elements.stopCameraBtn.style.display = 'inline-flex';
        elements.scanControl.style.display = 'block';
        showToast('📷 Kamera başlatıldı - Okuma için butona basılı tutun', 'success');
        playSound('success');
    }).catch((err) => {
        console.error('Kamera başlatma hatası:', err);
        showToast('❌ Kamera erişim hatası!', 'error');
        playSound('error');
        vibrate([200, 100, 200]);
    });
}

// ==========================================
// KAMERA DURDURMA
// ==========================================
function stopCamera() {
    if (!isScanning || !html5QrcodeScanner) return;
    
    html5QrcodeScanner.stop().then(() => {
        isScanning = false;
        isScanningEnabled = false;
        elements.startCameraBtn.style.display = 'inline-flex';
        elements.stopCameraBtn.style.display = 'none';
        elements.scanControl.style.display = 'none';
        elements.scanBtn.classList.remove('scanning');
        showToast('⏹️ Kamera durduruldu', 'info');
    }).catch((err) => {
        console.error('Kamera durdurma hatası:', err);
    });
}

// ==========================================
// OKUMA KONTROLÜ - Basılı Tut
// ==========================================
function startScanning() {
    if (!isScanning) return;
    
    isScanningEnabled = true;
    elements.scanBtn.classList.add('scanning');
    vibrate([50]); // Hafif geri bildirim
}

function stopScanning() {
    isScanningEnabled = false;
    elements.scanBtn.classList.remove('scanning');
}

// ==========================================
// BARKOD TARAMA BAŞARILI
// ==========================================
function onScanSuccess(decodedText, decodedResult) {
    // Okuma aktif değilse işlem yapma
    if (!isScanningEnabled) {
        return;
    }
    
    // Debounce kontrolü
    const currentTime = Date.now();
    if (decodedText === lastScannedBarcode && (currentTime - lastScannedTime) < DEBOUNCE_TIME) {
        return; // Aynı barkod, 2 saniye geçmedi
    }
    
    // 9 haneli kontrol
    const barcode = decodedText.trim();
    if (barcode.length !== 9 || !/^\d+$/.test(barcode)) {
        return; // Geçersiz format, sessizce atla
    }
    
    // Güncelle
    lastScannedBarcode = barcode;
    lastScannedTime = currentTime;
    
    // İş mantığı
    processScan(barcode);
}

// ==========================================
// BARKOD TARAMA HATALI (Sessiz)
// ==========================================
function onScanFailure(error) {
    // Sessiz, sürekli okuma devam eder
}

// ==========================================
// TARAMA İŞ MANTIĞI
// ==========================================
function processScan(barcode) {
    const timestamp = new Date();
    
    // 1. Listede var mı?
    if (paletDatabase.hasOwnProperty(barcode)) {
        const location = paletDatabase[barcode];
        
        // 2. Daha önce okutulmuş mu?
        if (scannedPalets.hasOwnProperty(barcode)) {
            // MÜKERRER OKUMA
            handleDuplicateScan(barcode, location, timestamp);
        } else {
            // BAŞARILI OKUMA
            handleSuccessfulScan(barcode, location, timestamp);
        }
    } else {
        // FAZLA PALET
        handleExtraPalet(barcode, timestamp);
    }
    
    // Geçmişi ve istatistikleri güncelle
    updateStats();
    updateHistoryList();
}

// ==========================================
// BAŞARILI OKUMA
// ==========================================
function handleSuccessfulScan(barcode, location, timestamp) {
    scannedPalets[barcode] = timestamp.getTime();
    
    // Geçmişe ekle
    scanHistory.unshift({
        barcode,
        location,
        status: 'success',
        timestamp
    });
    
    // UI Güncelleme
    elements.lastScanInfo.style.display = 'block';
    elements.lastBarcode.textContent = barcode;
    elements.lastLocation.textContent = location;
    
    // Geri bildirimler
    showToast(`✅ ${barcode} - ${location}`, 'success');
    playSound('success');
    vibrate([100]); // Kısa titreşim
}

// ==========================================
// MÜKERRER OKUMA
// ==========================================
function handleDuplicateScan(barcode, location, timestamp) {
    // Geçmişe ekle
    scanHistory.unshift({
        barcode,
        location,
        status: 'duplicate',
        timestamp
    });
    
    // Geri bildirimler
    showToast(`⚠️ ${barcode} - Zaten Okundu!`, 'warning');
    playSound('warning');
    vibrate([100, 100, 100]); // Çift titreşim
}

// ==========================================
// FAZLA PALET
// ==========================================
function handleExtraPalet(barcode, timestamp) {
    extraPalets.push(barcode);
    
    // Geçmişe ekle
    scanHistory.unshift({
        barcode,
        location: 'Listede Yok',
        status: 'error',
        timestamp
    });
    
    // Geri bildirimler
    showToast(`❌ ${barcode} - Fazla Palet!`, 'error');
    playSound('error');
    vibrate([200, 100, 200]); // Uzun titreşim
}

// ==========================================
// İSTATİSTİKLERİ GÜNCELLEME
// ==========================================
function updateStats() {
    const total = Object.keys(paletDatabase).length;
    const scanned = Object.keys(scannedPalets).length;
    const remaining = total - scanned;
    const extra = extraPalets.length;
    
    elements.totalCount.textContent = total;
    elements.scannedCount.textContent = scanned;
    elements.remainingCount.textContent = remaining;
    elements.extraCount.textContent = extra;
}

// ==========================================
// GEÇMİŞ LİSTESİNİ GÜNCELLEME
// ==========================================
function updateHistoryList() {
    if (scanHistory.length === 0) {
        elements.historyList.innerHTML = '<p class="empty-message">Henüz okutma yapılmadı</p>';
        return;
    }
    
    // Son 20 kayıt
    const recentHistory = scanHistory.slice(0, 20);
    
    elements.historyList.innerHTML = recentHistory.map(item => {
        const timeStr = formatTime(item.timestamp);
        const statusText = getStatusText(item.status);
        const statusClass = item.status;
        
        return `
            <div class="history-item ${statusClass}">
                <div class="history-item-header">
                    <span class="history-barcode">${item.barcode}</span>
                    <span class="history-time">${timeStr}</span>
                </div>
                <div class="history-location">📍 ${item.location}</div>
                <span class="history-status ${statusClass}">${statusText}</span>
            </div>
        `;
    }).join('');
}

// ==========================================
// YARDIMCI FONKSİYONLAR
// ==========================================

function getStatusText(status) {
    const statusMap = {
        'success': '✅ Başarılı',
        'duplicate': '⚠️ Mükerrer',
        'error': '❌ Fazla Palet'
    };
    return statusMap[status] || status;
}

function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// ==========================================
// TOAST BİLDİRİMLERİ
// ==========================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-message">${message}</div>`;
    
    elements.toastContainer.appendChild(toast);
    
    // 3 saniye sonra kaldır
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            elements.toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

// ==========================================
// SES ÜRETİMİ (Web Audio API)
// ==========================================
function playSound(type) {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Ses türüne göre ayarlar
    switch(type) {
        case 'success':
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
            break;
            
        case 'warning':
            oscillator.frequency.value = 600;
            oscillator.type = 'square';
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            
            // İkinci bip
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                osc2.frequency.value = 600;
                osc2.type = 'square';
                gain2.gain.setValueAtTime(0.2, audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                osc2.start(audioContext.currentTime);
                osc2.stop(audioContext.currentTime + 0.1);
            }, 150);
            break;
            
        case 'error':
            oscillator.frequency.value = 300;
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
            
        default:
            oscillator.frequency.value = 500;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
    }
}

// ==========================================
// TİTREŞİM (Vibration API)
// ==========================================
function vibrate(pattern) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

// ==========================================
// DOSYA DEĞİŞTİRME
// ==========================================
function changeFile() {
    if (isScanning) {
        stopCamera();
    }
    
    // Verileri sıfırla
    paletDatabase = {};
    scannedPalets = {};
    extraPalets = [];
    scanHistory = [];
    
    // UI'yi sıfırla
    elements.scannerSection.style.display = 'none';
    elements.reportSection.style.display = 'none';
    elements.uploadSection.style.display = 'block';
    elements.fileInput.value = '';
    elements.lastScanInfo.style.display = 'none';
    elements.scanControl.style.display = 'none';
    isScanningEnabled = false;
    
    updateStats();
    updateHistoryList();
    
    showToast('🔄 Yeni dosya yükleyebilirsiniz', 'info');
}

// ==========================================
// RAPOR GÖSTERME
// ==========================================
function showReport() {
    const total = Object.keys(paletDatabase).length;
    const scanned = Object.keys(scannedPalets).length;
    const remaining = total - scanned;
    const extra = extraPalets.length;
    
    // Okunmayan paletler
    const unscannedPalets = Object.keys(paletDatabase).filter(
        barcode => !scannedPalets.hasOwnProperty(barcode)
    );
    
    // Okutulan paletler (timestamp ile birlikte)
    const scannedPaletsArray = Object.keys(scannedPalets).map(barcode => ({
        barcode,
        location: paletDatabase[barcode],
        timestamp: scannedPalets[barcode]
    })).sort((a, b) => b.timestamp - a.timestamp); // En son okutulanlar önce
    
    // Mükerrer okutulan paletler (geçmişten bul)
    const duplicateMap = {};
    scanHistory.forEach(item => {
        if (item.status === 'duplicate') {
            if (!duplicateMap[item.barcode]) {
                duplicateMap[item.barcode] = { barcode: item.barcode, location: item.location, count: 1 };
            } else {
                duplicateMap[item.barcode].count++;
            }
        }
    });
    const duplicatePalets = Object.values(duplicateMap);
    
    let reportHTML = `
        <div style="margin-bottom: 20px;">
            <h3 style="margin-bottom: 10px;">📊 Genel Özet</h3>
            <p><strong>Toplam Palet:</strong> ${total}</p>
            <p><strong>Okunan:</strong> ${scanned}</p>
            <p><strong>Kalan:</strong> ${remaining}</p>
            <p><strong>Fazla Palet:</strong> ${extra}</p>
            <p><strong>Mükerrer Okuma:</strong> ${duplicatePalets.length}</p>
        </div>
    `;
    
    // Okutulan Paletler
    if (scannedPaletsArray.length > 0) {
        reportHTML += `
            <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 10px; color: var(--success-color);">✅ Okutulan Paletler (${scannedPaletsArray.length})</h3>
                <div style="max-height: 200px; overflow-y: auto; background: var(--bg-color); padding: 10px; border-radius: 8px;">
        `;
        
        scannedPaletsArray.slice(0, 50).forEach(item => {
            const time = new Date(item.timestamp).toLocaleTimeString('tr-TR');
            reportHTML += `<p style="margin: 5px 0;">✓ ${item.barcode} - ${item.location} <span style="color: var(--text-secondary); font-size: 12px;">(${time})</span></p>`;
        });
        
        if (scannedPaletsArray.length > 50) {
            reportHTML += `<p style="color: var(--text-secondary); margin-top: 10px;">... ve ${scannedPaletsArray.length - 50} palet daha</p>`;
        }
        
        reportHTML += `</div></div>`;
    }
    
    // Mükerrer Okutulan Paletler
    if (duplicatePalets.length > 0) {
        reportHTML += `
            <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 10px; color: var(--warning-color);">⚠️ Mükerrer Okutulan Paletler (${duplicatePalets.length})</h3>
                <div style="max-height: 200px; overflow-y: auto; background: var(--bg-color); padding: 10px; border-radius: 8px;">
        `;
        
        duplicatePalets.forEach(item => {
            reportHTML += `<p style="margin: 5px 0;">⚠ ${item.barcode} - ${item.location} <span style="color: var(--warning-color); font-weight: bold;">(${item.count + 1}x okutuldu)</span></p>`;
        });
        
        reportHTML += `</div></div>`;
    }
    
    // Okunmayan Paletler
    if (unscannedPalets.length > 0) {
        reportHTML += `
            <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 10px; color: var(--warning-color);">⏳ Okunmayan Paletler (${unscannedPalets.length})</h3>
                <div style="max-height: 200px; overflow-y: auto; background: var(--bg-color); padding: 10px; border-radius: 8px;">
        `;
        
        unscannedPalets.slice(0, 50).forEach(barcode => {
            reportHTML += `<p style="margin: 5px 0;">○ ${barcode} - ${paletDatabase[barcode]}</p>`;
        });
        
        if (unscannedPalets.length > 50) {
            reportHTML += `<p style="color: var(--text-secondary); margin-top: 10px;">... ve ${unscannedPalets.length - 50} palet daha</p>`;
        }
        
        reportHTML += `</div></div>`;
    }
    
    // Fazla Paletler
    if (extraPalets.length > 0) {
        reportHTML += `
            <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 10px; color: var(--error-color);">❌ Fazla Paletler (${extraPalets.length})</h3>
                <div style="max-height: 200px; overflow-y: auto; background: var(--bg-color); padding: 10px; border-radius: 8px;">
        `;
        
        extraPalets.forEach(barcode => {
            reportHTML += `<p style="margin: 5px 0;">✕ ${barcode}</p>`;
        });
        
        reportHTML += `</div></div>`;
    }
    
    elements.reportContent.innerHTML = reportHTML;
    elements.reportModal.classList.add('active');
}

// ==========================================
// RAPOR KAPATMA
// ==========================================
function closeReport() {
    elements.reportModal.classList.remove('active');
}

// ==========================================
// EKRAN KAPATILMASINI ÖNLEME
// ==========================================
let wakeLock = null;

async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('✅ Wake Lock aktif - Ekran açık kalacak');
        } catch (err) {
            console.log('Wake Lock hatası:', err);
        }
    }
}

// Kamera başlatıldığında wake lock'u etkinleştir
elements.startCameraBtn.addEventListener('click', requestWakeLock);

// Sayfa görünürlüğü değiştiğinde wake lock'u yeniden başlat
document.addEventListener('visibilitychange', () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
    }
});
