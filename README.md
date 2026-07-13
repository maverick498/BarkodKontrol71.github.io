# 📦 Depo Kontrol - Sevkiyat Barkod Okuma PWA

Depo sevkiyat kontrolü için kesintisiz barkod okuma odaklı, yüksek hızlı mobil Progressive Web App (PWA) uygulaması.

## 🚀 Özellikler

### Temel Özellikler
- ✅ **Excel Dosya Yükleme**: .xlsx ve .csv formatlarında Excel dosyası yükleme desteği
- 📷 **Kesintisiz Barkod Tarama**: Code 128 formatında 9 haneli barkod okuma
- 🔊 **Ses Geri Bildirimleri**: Web Audio API ile farklı durum sesleri
- 📳 **Titreşim Desteği**: Haptic feedback ile kullanıcı deneyimi
- 📊 **Canlı İstatistikler**: Anlık güncellenen sayaçlar
- 📋 **Tarama Geçmişi**: Son 20 okutmanın listesi
- 💾 **Çevrimdışı Çalışma**: Service Worker ile offline destek
- 📱 **PWA Desteği**: Ana ekrana ekleme özelliği

### Teknik Özellikler
- 🎯 **O(1) Karmaşıklık**: Dictionary yapısı ile hızlı veri erişimi
- ⚡ **Yüksek FPS**: 30 FPS ile optimize edilmiş tarama
- 🔄 **Debounce Kontrolü**: 2 saniye içinde aynı barkod tekrarını engelleme
- 🌐 **Modern Web API'leri**: Wake Lock, Vibration, Web Audio
- 📱 **Responsive Tasarım**: Tüm mobil cihazlara uyumlu

## 📋 Gereksinimler

- Modern bir web tarayıcı (Chrome, Edge, Safari)
- Kamera erişim izni
- HTTPS bağlantısı (GitHub Pages otomatik sağlar)

## 🛠️ Kurulum

### 1. Dosyaları İndirin
Tüm proje dosyalarını bir klasöre kaydedin:
```
depo-kontrol/
├── index.html
├── style.css
├── app.js
├── sw.js
├── manifest.json
├── icon-192.png (oluşturmanız gerekiyor)
└── icon-512.png (oluşturmanız gerekiyor)
```

### 2. İkon Dosyaları Oluşturun
PWA için 192x192 ve 512x512 boyutlarında PNG ikonlar oluşturun. Online araçlar:
- [Favicon.io](https://favicon.io/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

### 3. GitHub Pages'e Yükleyin

#### GitHub Repository Oluşturun
```bash
git init
git add .
git commit -m "İlk commit: Depo Kontrol PWA"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/depo-kontrol.git
git push -u origin main
```

#### GitHub Pages Ayarları
1. GitHub repository'nize gidin
2. **Settings** > **Pages**
3. **Source**: `main` branch seçin
4. **Save** butonuna tıklayın
5. Birkaç dakika sonra `https://KULLANICI_ADINIZ.github.io/depo-kontrol/` adresinde yayınlanacak

## 📱 Kullanım

### 1. Excel Dosyası Hazırlama
Excel dosyanızda şu sütunlar bulunmalıdır:
- **Highest Level HU**: 9 haneli palet barkod numarası
- **Storage Bin**: Paletin lokasyonu (örn: TTA101)

Örnek:
```
Highest Level HU | Storage Bin
123456789        | TTA101
987654321        | TTA102
```

### 2. Uygulama Akışı
1. **📂 Excel Dosyası Yükle** butonuna tıklayın
2. Excel dosyanızı seçin (liste anında yüklenir)
3. **📷 Kamerayı Başlat** butonuna tıklayın
4. Barkodları okutmaya başlayın (kesintisiz)
5. **📊 Özet Rapor Göster** ile detayları inceleyin

### 3. Geri Bildirimler
- **✅ Başarılı Okuma**: Yeşil, kısa ses, hafif titreşim
- **⚠️ Mükerrer Okuma**: Sarı, çift bip, çift titreşim
- **❌ Fazla Palet**: Kırmızı, alarm sesi, uzun titreşim

### 4. Ana Ekrana Ekleme
#### Android Chrome
1. Uygulamayı açın
2. Sağ üst menü (⋮) > **Ana ekrana ekle**
3. Adı onaylayın ve **Ekle** butonuna tıklayın

#### iOS Safari
1. Uygulamayı açın
2. Paylaş butonu (□↑) > **Ana Ekrana Ekle**
3. Adı onaylayın ve **Ekle** butonuna tıklayın

## 🎨 Özelleştirme

### Renkleri Değiştirme
`style.css` dosyasındaki `:root` değişkenlerini düzenleyin:
```css
:root {
    --primary-color: #1976d2;
    --success-color: #4caf50;
    --warning-color: #ff9800;
    --error-color: #f44336;
}
```

### Debounce Süresini Değiştirme
`app.js` dosyasında:
```javascript
const DEBOUNCE_TIME = 2000; // milisaniye (2000 = 2 saniye)
```

### Tarama Hızını Artırma
`app.js` > `startCamera()` fonksiyonunda:
```javascript
const config = {
    fps: 30, // Daha yüksek değer için 60'a çıkarabilirsiniz
    // ...
};
```

## 🔧 Sorun Giderme

### Kamera Açılmıyor
- Tarayıcı kamera iznini kontrol edin
- HTTPS bağlantısı kullandığınızdan emin olun
- Farklı bir tarayıcı deneyin

### Barkod Okunmuyor
- Code 128 formatında 9 haneli barkod kullanın
- Barkodu kameranın net göreceği şekilde tutun
- Işık koşullarını iyileştirin

### PWA Yüklenmiyor
- Manifest.json yolunun doğru olduğundan emin olun
- İkon dosyalarının mevcut olduğunu kontrol edin
- Service Worker'ın başarıyla kayıt olduğunu kontrol edin

### Ses Çalışmıyor
- Cihaz sesinin açık olduğundan emin olun
- Tarayıcı ses izni verin
- Web Audio API desteğini kontrol edin

## 📊 Performans İpuçları

1. **Yüksek Yenileme Hızlı Cihazlar**: Modern Android cihazlar (120Hz+) için otomatik optimize edilmiştir
2. **Bellek Yönetimi**: 10.000+ palet için bile O(1) karmaşıklık
3. **Ekran Açık Kalma**: Wake Lock API ile tarama sırasında ekran kapanmaz
4. **Çevrimdışı Kullanım**: İlk yüklemeden sonra internet bağlantısı gerekmez

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/yeniOzellik`)
3. Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik eklendi'`)
4. Branch'inizi push edin (`git push origin feature/yeniOzellik`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

Sorularınız için GitHub Issues kullanabilirsiniz.

---

**Not**: İlk kullanımda kamera ve mikrofon izinleri isteyecektir. Uygulamanın tam fonksiyonel çalışması için bu izinleri vermeniz gerekmektedir.
