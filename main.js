let students = [], totalWeeks = 0, activeWeeks = [], inactiveWeeks = [], weeklyRatesFull = [], courseName = '';
let passThreshold = 70, riskThreshold = 50, sortKey = 'rateNum', sortOrder = 'desc';
let pieChart, barChart, lineChart;
let studentModalChart = null;

// DOM yüklendikten sonra event listenerları ekle
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('file-input').addEventListener('change', handleFile, false);

    // Modal close handler
    document.getElementById('modal-close').onclick = function() {
        document.getElementById('student-modal').style.display = 'none';
        if (studentModalChart) { studentModalChart.destroy(); studentModalChart = null; }
    };

    window.onclick = function(event) {
        if (event.target === document.getElementById('student-modal')) {
            document.getElementById('student-modal').style.display = 'none';
            if (studentModalChart) { studentModalChart.destroy(); studentModalChart = null; }
        }
    };
});

function handleFile(e) {
    document.getElementById('file-error').textContent = '';
    document.getElementById('file-loading').style.display = 'block';
    const file = e.target.files[0];
    if (!file) {
        document.getElementById('file-loading').style.display = 'none';
        return;
    }

    // Dosya uzantısı ve MIME türü kontrolü
    const allowedExt = /\.(xlsx|xls)$/i;
    if (!allowedExt.test(file.name)) {
        document.getElementById('file-error').textContent = 'Yalnızca .xlsx veya .xls dosyaları yükleyebilirsiniz.';
        e.target.value = '';
        document.getElementById('file-loading').style.display = 'none';
        return;
    }
    if (file.type && !['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(file.type)) {
        document.getElementById('file-error').textContent = 'Geçersiz dosya türü. Lütfen bir Excel dosyası seçin.';
        e.target.value = '';
        document.getElementById('file-loading').style.display = 'none';
        return;
    }
    const reader = new FileReader();
    reader.onload = function(ev) {
        let wb, rows;
        try {
            const data = new Uint8Array(ev.target.result);
            wb = XLSX.read(data, { type: 'array' });
            if (!wb.SheetNames || !wb.SheetNames.length) throw new Error();
            const sheet = wb.Sheets[wb.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        } catch (err) {
            document.getElementById('file-error').textContent = 'Dosya okunamadı veya geçersiz Excel dosyası.';
            document.getElementById('file-loading').style.display = 'none';
            return;
        }
        // İçerik kontrolü: başlık satırı ve temel sütunlar
        const h = rows.findIndex(r => r && r.some(c => c && c.toString().trim() === 'Öğrenci No'));
        if (h < 0 || !rows[h] || !rows[h].some(c => c && c.toString().trim() === 'Adı Soyadı')) {
            document.getElementById('file-error').textContent = 'Yüklenen dosya beklenen formatta değil. "Öğrenci No" ve "Adı Soyadı" başlıkları bulunamadı.';
            document.getElementById('file-loading').style.display = 'none';
            return;
        }
        if (rows[1] && rows[1][2]) courseName = rows[1][2].toString().trim();
        processData(rows);
        document.getElementById('file-loading').style.display = 'none';
    };
    reader.onerror = function() {
        document.getElementById('file-error').textContent = 'Dosya okunurken hata oluştu.';
        document.getElementById('file-loading').style.display = 'none';
    };
    reader.readAsArrayBuffer(file);
}

function processData(data) {
    const h = data.findIndex(r => r.some(c => c && c.toString().trim() === 'Öğrenci No'));
    if (h < 0) {
        document.getElementById('stats').innerHTML = '<p class="error">Başlık satırı bulunamadı.</p>';
        return;
    }
    const cols = (data[h + 1] || []).map((c, i) => c ? i : -1).filter(i => i >= 0);
    const spp = 3;
    totalWeeks = Math.ceil(cols.length / spp);
    activeWeeks = []; inactiveWeeks = []; weeklyRatesFull = [];
    for (let w = 0; w < totalWeeks; w++) {
        const ccols = cols.slice(w * spp, w * spp + spp);
        let p = 0, s = 0;
        for (let i = h + 2; i < data.length; i++) ccols.forEach(ci => {
            if (data[i][ci] != null) { s++; if (data[i][ci].toString().trim() === '+') p++; }
        });
        if (p > 0) activeWeeks.push(ccols);
        else inactiveWeeks.push(w + 1);
        weeklyRatesFull.push(s ? (p / s * 100).toFixed(1) : '0.0');
    }
    // Haftalara göre öğrenci devamsızlıklarını da kaydet
    students = [];
    for (let i = h + 2; i < data.length; i++) {
        const r = data[i]; if (!r || !r[2]) continue;
        const no = r[1]?.toString().trim() || '';
        const nm = r[2].toString().trim();
        let pCount = 0;
        let weekDetails = [];
        activeWeeks.forEach((cc, widx) => {
            let weekPresent = 0, weekTotal = 0;
            cc.forEach(ci => {
                weekTotal++;
                if (r[ci]?.toString().trim() === '+') { pCount++; weekPresent++; }
            });
            weekDetails.push({ week: widx + 1, present: weekPresent, total: cc.length });
        });
        const tot = activeWeeks.length * spp;
        const rateNum = tot ? pCount / tot * 100 : 0;
        students.push({
            no, name: nm, present: pCount, absent: tot - pCount, rateNum, rate: rateNum.toFixed(1), status: '',
            weekDetails // haftalara göre detay
        });
    }
    buildUI();
}

function buildUI() {
    if (pieChart) { pieChart.destroy(); pieChart = null; }
    if (barChart) { barChart.destroy(); barChart = null; }
    if (lineChart) { lineChart.destroy(); lineChart = null; }

    document.getElementById('stats').innerHTML = `
        <h2>Ders: ${courseName}</h2>
        <div class="controls">
          <label class="slider-label">Geçti Eşiği: <span id="passVal">${passThreshold}</span>%<input type="range" id="passThreshold" min="0" max="100" step="0.1" value="${passThreshold}"></label>
          <label class="slider-label">Risk Eşiği: <span id="riskVal">${riskThreshold}</span>%<input type="range" id="riskThreshold" min="0" max="${passThreshold}" step="0.1" value="${riskThreshold}"></label>
        </div>
        <div class="controls">
          <input id="search" placeholder="Öğrenci adı veya numarası..." />
          <select id="filter">
            <option value="All">Tümü</option>
            <option value="Geçti">Geçenler</option>
            <option value="Riskli">Riskliler</option>
            <option value="Kaldı">Kalanlar</option>
          </select>
        </div>
        <div id="summary"></div>
        <p>Toplam Öğrenci: ${students.length}</p>
        <table id="student-table">
          <thead>
            <tr>
              <th class="sortable" id="th-no">No</th>
              <th class="sortable" id="th-name">Ad Soyad</th>
              <th class="sortable" id="th-present">Devamlı Ders Sayısı</th>
              <th class="sortable" id="th-absent">Devamsız Ders Sayısı</th>
              <th class="sortable" id="th-rate">Oran (%)</th>
              <th class="sortable" id="th-status">Durum</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        <div class="section"><h3>Grafikler</h3><div class="chart-container">
          <canvas id="pie-chart"></canvas>
          <canvas id="bar-chart"></canvas>
          <canvas id="line-chart"></canvas>
        </div></div>
      `;

    document.getElementById('passThreshold').addEventListener('input', e => {
        passThreshold = +e.target.value;
        document.getElementById('passVal').textContent = passThreshold;
        riskThreshold = Math.min(riskThreshold, passThreshold);
        document.getElementById('riskThreshold').max = passThreshold;
        document.getElementById('riskThreshold').value = riskThreshold;
        document.getElementById('riskVal').textContent = riskThreshold;
        recalc();
    });
    document.getElementById('riskThreshold').addEventListener('input', e => {
        riskThreshold = +e.target.value;
        document.getElementById('riskVal').textContent = riskThreshold;
        recalc();
    });
    document.getElementById('search').addEventListener('input', updateTable);
    document.getElementById('filter').addEventListener('change', updateTable);

    document.getElementById('th-no').addEventListener('click', () => { toggleSort('no'); });
    document.getElementById('th-name').addEventListener('click', () => { toggleSort('name'); });
    document.getElementById('th-present').addEventListener('click', () => { toggleSort('present'); });
    document.getElementById('th-absent').addEventListener('click', () => { toggleSort('absent'); });
    document.getElementById('th-rate').addEventListener('click', () => { toggleSort('rateNum'); });
    document.getElementById('th-status').addEventListener('click', () => { toggleSort('status'); });

    // Tabloya tıklama ile öğrenci detay modalı açma
    setTimeout(() => {
        const tbody = document.querySelector('#student-table tbody');
        tbody.onclick = function(e) {
          let tr = e.target.closest('tr');
          if (!tr) return;
          const idx = Array.from(tbody.children).indexOf(tr);
          // Filtre ve arama uygulanmışsa, tablo sırasına göre bul
          const s = document.getElementById('search').value.toLowerCase();
          const f = document.getElementById('filter').value;
          let data = students.slice();
          if (sortOrder) data.sort((a, b) => sortOrder === 'asc' ? a.rateNum - b.rateNum : b.rateNum - a.rateNum);
          data = data.filter(sg => {
            if (f !== 'All' && sg.status !== f) return false;
            if (s && !(sg.name.toLowerCase().includes(s) || sg.no.toLowerCase().includes(s))) return false;
            return true;
          });
          if (data[idx]) showStudentModal(data[idx]);
        };
      }, 0);

      recalc();
}

function toggleSort(key) {
    if (sortKey === key) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        sortKey = key;
        sortOrder = key === 'name' || key === 'status' ? 'asc' : 'desc';
    }
    updateTable();
    updateSortIndicators();
}

function updateSortIndicators() {
    // Remove all sort indicators
    ['th-no','th-name','th-present','th-absent','th-rate','th-status'].forEach(id => {
        const th = document.getElementById(id);
        if (th) th.innerHTML = th.textContent.replace(/[\u25B2\u25BC]/g, '');
    });
    // Add indicator to current
    const th = document.getElementById('th-' + (
        sortKey === 'no' ? 'no' :
        sortKey === 'name' ? 'name' :
        sortKey === 'present' ? 'present' :
        sortKey === 'absent' ? 'absent' :
        sortKey === 'rateNum' ? 'rate' :
        sortKey === 'status' ? 'status' : ''
      ));
      if (th) {
        const arrow = sortOrder === 'asc' ? ' ▲' : ' ▼';
        th.innerHTML = th.textContent + arrow;
      }
}

function showStudentModal(student) {
    const modal = document.getElementById('student-modal');
    const modalBody = document.getElementById('modal-body');
    // Haftalara göre devamsızlık oranı
    const weekLabels = student.weekDetails.map((w, i) => `Hafta ${i+1}`);
    const weekRates = student.weekDetails.map(w => w.total ? (w.present / w.total * 100).toFixed(1) : 0);
    // Detay tablosu
    let tableRows = '';
    student.weekDetails.forEach((w, i) => {
        tableRows += `<tr>
          <td>Hafta ${i+1}</td>
          <td>${w.present}/${w.total}</td>
          <td>${w.total ? (w.present / w.total * 100).toFixed(1) : '0.0'}%</td>
        </tr>`;
    });
    modalBody.innerHTML = `
        <h2>${student.name} (${student.no})</h2>
        <p>Toplam Devam: ${student.present} | Toplam Devamsız: ${student.absent} | Oran: ${student.rate}% | Durum: <b>${student.status}</b></p>
        <div>
          <canvas id="student-week-chart" class="modal-chart"></canvas>
        </div>
        <div class="modal-details">
          <h3>Haftalara Göre Devam Durumu</h3>
          <table>
            <thead><tr><th>Hafta</th><th>Devamlı Ders</th><th>Oran (%)</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div style="font-size:0.95em; color:#555; margin-top:0.5em;">
            <b>Açıklama:</b> Her hafta için öğrencinin devam ettiği ders sayısı ve oranı gösterilmektedir.
          </div>
        </div>
      `;
      modal.style.display = 'flex';
      // Grafik
      setTimeout(() => {
        const ctx = document.getElementById('student-week-chart').getContext('2d');
        if (studentModalChart) { studentModalChart.destroy(); }
        studentModalChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: weekLabels,
            datasets: [{
              label: 'Haftalık Devam Oranı (%)',
              data: weekRates,
              fill: true,
              borderColor: '#16a085',
              backgroundColor: 'rgba(22,160,133,0.15)',
              tension: 0.2,
              pointRadius: 4,
              pointBackgroundColor: '#16a085'
            }]
          },
          options: {
            plugins: {
              title: { display: true, text: 'Öğrencinin Haftalara Göre Devam Oranları', font: { size: 18 } },
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return ` ${context.parsed.y}%`;
                  }
                }
              }
            },
            scales: {
              x: { title: { display: true, text: 'Hafta', font: { size: 14 } } },
              y: { beginAtZero: true, max: 100, title: { display: true, text: 'Devam Oranı (%)', font: { size: 14 } } }
            }
          }
        });
      }, 100);
}

function recalc() {
    students.forEach(s => {
        s.status = s.rateNum >= passThreshold ? 'Geçti' : (s.rateNum >= riskThreshold ? 'Riskli' : 'Kaldı');
    });
    updateSummary(); updateTable(); updateCharts();
}

function updateSummary() {
    const passed = students.filter(s => s.status === 'Geçti').length;
    const risky = students.filter(s => s.status === 'Riskli').length;
    const failed = students.filter(s => s.status === 'Kaldı').length;
    const rates = students.map(s => s.rateNum);
    const avg = (rates.reduce((a, b) => a + b, 0) / rates.length || 0).toFixed(1);
    const mx = (rates.length ? Math.max(...rates) : 0).toFixed(1);
    const mn = (rates.length ? Math.min(...rates) : 0).toFixed(1);
    document.getElementById('summary').innerHTML = `
        <p>Hesaba Katılan Hafta Sayısı: ${activeWeeks.length} | Katılmayan Hafta: ${inactiveWeeks.join(', ')} <small>* Hiç yoklama alınmayan haftalar hesaba katılmamıştır</small></p>
        <p>Geçen öğrenci sayısı: ${passed} | Riskli: ${risky} | Kalan: ${failed}</p>
        <p>Ortalama Oran: ${avg}% | En Yüksek: ${mx}% | En Düşük: ${mn}%</p>
      `;
}

function updateTable() {
    const s = document.getElementById('search').value.toLowerCase();
    const f = document.getElementById('filter').value;
    const tbody = document.querySelector('#student-table tbody');
    tbody.innerHTML = '';
    let data = students.slice();
    // Sıralama
    data.sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        // Numeric sort for numbers, string sort for strings
        if (sortKey === 'present' || sortKey === 'absent' || sortKey === 'rateNum') {
          va = Number(va); vb = Number(vb);
          return sortOrder === 'asc' ? va - vb : vb - va;
        } else if (sortKey === 'no') {
          // Numeric if possible, else string
          if (!isNaN(Number(va)) && !isNaN(Number(vb))) {
            return sortOrder === 'asc' ? Number(va) - Number(vb) : Number(vb) - Number(va);
          }
          return sortOrder === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        } else {
          return sortOrder === 'asc'
            ? String(va).localeCompare(String(vb), 'tr', { sensitivity: 'base' })
            : String(vb).localeCompare(String(va), 'tr', { sensitivity: 'base' });
        }
    });
    data.forEach(sg => {
        if (f !== 'All' && sg.status !== f) return;
        if (s && !(sg.name.toLowerCase().includes(s) || sg.no.toLowerCase().includes(s))) return;
        const tr = document.createElement('tr');
        ['no','name','present','absent','rate','status'].forEach(k => {
          const td = document.createElement('td');
          td.textContent = sg[k];
          if (k === 'status') {
            if (sg.status === 'Geçti') td.style.color = 'blue';
            else if (sg.status === 'Kaldı') td.style.color = 'orange';
            else if (sg.status === 'Riskli') td.style.color = 'red';
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    updateSortIndicators();
}

function updateCharts() {
    // Pasta grafik: renkler ve başlık
    const pieData = [
        students.filter(s => s.status === 'Geçti').length,
        students.filter(s => s.status === 'Riskli').length,
        students.filter(s => s.status === 'Kaldı').length
    ];
    const pieColors = ['#3498db', '#e67e22', '#e74c3c'];
    if (pieChart) {
        pieChart.data.datasets[0].data = pieData;
        pieChart.data.datasets[0].backgroundColor = pieColors;
        pieChart.options.plugins.legend.labels.font.size = 18;
        pieChart.options.plugins.title.text = 'Öğrenci Durum Dağılımı';
        pieChart.update();
    } else {
        pieChart = new Chart(document.getElementById('pie-chart').getContext('2d'), {
          type: 'pie',
          data: {
            labels: ['Geçti', 'Riskli', 'Kaldı'],
            datasets: [{
              data: pieData,
              backgroundColor: pieColors
            }]
          },
          options: {
            plugins: {
              legend: { labels: { font: { size: 18 } } },
              title: { display: true, text: 'Öğrenci Durum Dağılımı', font: { size: 20 } },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.parsed || 0;
                    const total = pieData.reduce((a, b) => a + b, 0);
                    const percent = total ? ((value / total) * 100).toFixed(1) : 0;
                    return `${label}: ${value} öğrenci (%${percent})`;
                  }
                }
              }
            }
          }
        });
    }

    // Bar grafik: renkler ve başlık
    const bucket = Array(10).fill(0);
    students.forEach(s => { const idx = Math.min(9, Math.floor(s.rateNum / 10)); bucket[idx]++; });
    const barColors = [
        '#e74c3c', '#e67e22', '#f1c40f', '#f39c12', '#f7ca18',
        '#2ecc71', '#27ae60', '#3498db', '#2980b9', '#9b59b6'
    ];
    if (barChart) {
        barChart.data.datasets[0].data = bucket;
        barChart.data.datasets[0].backgroundColor = barColors;
        barChart.options.plugins.title.text = 'Katılım Oranına Göre Öğrenci Sayısı';
        barChart.update();
    } else {
        barChart = new Chart(document.getElementById('bar-chart').getContext('2d'), {
          type: 'bar',
          data: {
            labels: [
              '0-10%', '10-20%', '20-30%', '30-40%', '40-50%',
              '50-60%', '60-70%', '70-80%', '80-90%', '90-100%'
            ],
            datasets: [{
              label: 'Öğrenci Sayısı',
              data: bucket,
              backgroundColor: barColors
            }]
          },
          options: {
            plugins: {
              legend: { display: false },
              title: { display: true, text: 'Katılım Oranına Göre Öğrenci Sayısı', font: { size: 20 } },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return ` ${context.parsed.y} öğrenci`;
                  }
                }
              }
            },
            scales: {
              x: { title: { display: true, text: 'Katılım Oran Aralığı (%)', font: { size: 16 } } },
              y: { beginAtZero: true, title: { display: true, text: 'Öğrenci Sayısı', font: { size: 16 } } }
            }
          }
        });
    }

    // Çizgi grafik: renk ve başlık
    const lineData = weeklyRatesFull.map(v => parseFloat(v));
    if (lineChart) {
        lineChart.data.datasets[0].data = lineData;
        lineChart.options.plugins.title.text = 'Haftalara Göre Genel Katılım Oranları';
        lineChart.data.datasets[0].borderColor = '#2980b9';
        lineChart.data.datasets[0].backgroundColor = 'rgba(41,128,185,0.15)';
        lineChart.update();
    } else {
        lineChart = new Chart(document.getElementById('line-chart').getContext('2d'), {
          type: 'line',
          data: {
            labels: weeklyRatesFull.map((_, i) => `Hafta ${i + 1}`),
            datasets: [{
              label: 'Genel Katılım Oranı (%)',
              data: lineData,
              fill: true,
              borderColor: '#2980b9',
              backgroundColor: 'rgba(41,128,185,0.15)',
              tension: 0.2,
              pointRadius: 4,
              pointBackgroundColor: '#2980b9'
            }]
          },
          options: {
            plugins: {
              title: { display: true, text: 'Haftalara Göre Genel Katılım Oranları', font: { size: 20 } },
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return ` ${context.parsed.y}%`;
                  }
                }
              }
            },
            scales: {
              x: { title: { display: true, text: 'Hafta', font: { size: 16 } } },
              y: { beginAtZero: true, max: 100, title: { display: true, text: 'Katılım Oranı (%)', font: { size: 16 } } }
            }
          }
        });
    }
}