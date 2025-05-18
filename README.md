# Yoklama İstatistikleri Uygulaması

https://s-balli.github.io/yoklama/

Bu uygulama, Burdur Mehmet Akif Ersoy Üniversitesi yoklama sisteminde bir derse ait yoklama verilerini Excel dosyasından okuyup; istatistikleri hesaplayan, filtreleme, arama ve çeşitli grafiklerle görselleştiren basit bir HTML/JavaScript uygulamasıdır.

## Özellikler

* **Excel Dosyası Desteği**: `.xlsx` veya `.xls` formatındaki "Yoklama İcmal Dökümü" dosyasını yükleyin.
* **Öğrenci Listesi**: Ad, numara, gelme/devamsızlık, devam oranı ve durum bilgileri.
* **Arama & Filtre**:

  * Öğrenci adı veya numarasına göre arama.
  * Durum bazlı filtre (Geçti, Riskli, Kaldı, Tümü).
* **Dinamik Eşikler**:

  * "Geçti" ve "Risk" eşiğini kaydırıcılarla (slider) ayarla, tüm hesaplamalar anında güncellensin.
* **Özet İstatistikler**:

  * Hesaba katılan ve katılmayan hafta sayısı. Hiç yoklama alınmamış haftalar hesaba katılmaz.
  * Geçen öğrenci sayısı, riskli ve kalan sayıları.
  * Ortalama, en yüksek ve en düşük devam oranları.
* **Grafikler** (Chart.js ile)

  1. **Pasta Grafiği**: Durum dağılımı (Geçti, Riskli, Kaldı). Legend metinleri büyük.
  2. **Çubuk Grafiği**: "Katılım oranına göre öğrenci sayısı" başlığıyla.
  3. **Çizgi Grafiği**: "Haftalara göre katılım oranları" başlığıyla, tüm haftalar (aktif ve inaktif) dahil.
* **Ek Listeler**: En iyi 5 ve en düşük 5 öğrencinin devam oranlarına göre listelenmesi.
* **Sıralama**: Tablo başlıklarındaki ok simgesi tıklandığında Oran sütununa göre artan/azalan sıralama.

## Kullanım

1. Bu dizini klonlayın:

   ```bash
   git clone https://github.com/kullanici/yoklama-istatistikleri.git
   cd yoklama-istatistikleri
   ```

2. `index.html` dosyasını bir web sunucuda veya doğrudan tarayıcınızda açın.

3. Açılan sayfada "Sistemden aldığınız excel dosyasını (Yoklama icmal dökümü) yükleyin (.xlsx / .xls)." metni altında dosyanızı seçin.

4. Eşik değerlerini slider’larla ayarlayın, arama ve filtreleme yapın.

5. Güncellenen tablo ve grafiklerle analizlerinizi yapın.

## Gereksinimler

* Modern bir web tarayıcısı (Chrome, Firefox, Edge).
* İnternet bağlantısı, Chart.js ve XLSX.js CDN’lerinden kütüphaneleri yüklemek için.

## Geliştirme

* Yeni özellikler eklemek için `index.html` dosyasını düzenleyin.
* Chart.js yapılandırmalarını `updateCharts()` fonksiyonunda.
* Excel veri işleme adımlarını `processData()` fonksiyonunda bulun.

---

**Yoklama İstatistikleri Uygulaması** ile verilerinizi pratik bir şekilde analiz edin!
