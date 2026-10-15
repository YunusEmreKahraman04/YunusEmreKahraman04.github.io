/* All copy for the three chapters, in Turkish and English. */
window.CONTENT = {
  profile: {
    name: 'Yunus Emre Kahraman',
    email: 'yemrekah04@gmail.com',
    linkedin: 'https://www.linkedin.com/in/yunus-emre-kahraman-a1b19425a',
    github: 'https://github.com/YunusEmreKahraman04',
    coords: '37.87°N · 32.48°E',
    jobStart: '2026-03'
  },

  skills: [
    { id: 'backend', items: ['Java', 'Spring Boot (OpenFeign)', 'Python', 'FastAPI', 'SQLAlchemy', { en: 'Microservices', tr: 'Mikroservisler' }, 'SQL', 'PostgreSQL', 'Redis/RQ', 'Alembic', 'C++', 'Bash'] },
    { id: 'web', items: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'PWA', 'Leaflet / Google Maps', 'Flutter', 'Firebase'] },
    { id: 'data', items: ['Pandas', 'NumPy', 'OR-Tools', 'OSRM', 'Streamlit', { en: 'Computer Vision (YOLOv8)', tr: 'Bilgisayarlı Görü (YOLOv8)' }, 'NLP'] },
    { id: 'devops', items: ['Docker', 'Docker Compose', 'nginx', 'GitHub Actions', 'Linux', 'SSH', 'Git'] }
  ],

  /* ===================================================================== EN */
  en: {
    meta: {
      city: 'Yunus Emre Kahraman — 01 City',
      work: 'Yunus Emre Kahraman — 02 Work',
      system: 'Yunus Emre Kahraman — 03 System'
    },
    chapters: ['City', 'Work', 'System'],
    lang: 'Language',

    city: {
      kicker: 'Computer Engineer — Konya, Turkey',
      tagline: 'I build the systems that decide where fleets go next — route optimization, backend microservices and the pipelines that feed them.',
      scroll: 'Scroll to fly',
      loading: 'Building the city',
      stop: 'Stop',
      about: {
        label: 'About',
        title: 'Engineering systems that scale, routes that save.',
        body: [
          'Result-oriented Computer Engineer and Software Engineer with hands-on experience in building scalable enterprise applications, microservices architecture, and advanced routing algorithms.',
          'Today I build TRP, the route optimization platform at Anadolu Birlik Holding — from the VRP engine to the field app and the production stack.'
        ]
      },
      facts: {
        label: 'In numbers',
        items: ['technologies in my stack', 'companies', 'certifications', 'CGPA / 4.00']
      },
      focus: {
        label: 'What I work on',
        title: 'Four things I keep shipping.',
        items: [
          { t: 'Route optimization', d: 'VRP · OR-Tools · OSRM on the Turkey road network' },
          { t: 'Backend & microservices', d: 'FastAPI · Spring Boot (OpenFeign) · PostgreSQL' },
          { t: 'Data pipelines', d: 'Queues, retries, Redis/RQ, Alembic migrations' },
          { t: 'Edge AI', d: 'Custom YOLOv8 on Raspberry Pi / Hailo' }
        ],
        chase: 'Camera: following a field rep in real time'
      },
      next: { label: 'Next chapter', title: 'Work', sub: 'Experience, TRP and EdgeVision — magazine edition.' }
    },

    work: {
      cover: { l1: 'Selected', l2: 'Work', dek: 'Two companies, one platform in production, one model on the edge. Everything below shipped.', meta: 'Chapter 02 — 2024—2026 — Konya' },
      marquee: ['Route optimization', 'FastAPI', 'OR-Tools', 'OSRM', 'React PWA', 'PostgreSQL', 'Redis/RQ', 'Docker', 'YOLOv8'],
      expTitle: 'Experience',
      present: 'Present',
      months: 'mo',
      experience: [
        {
          company: 'Anadolu Birlik Holding', role: 'Software Engineer', location: 'Konya, Turkey', period: 'Mar 2026 — Present', start: '2026-03',
          points: [
            'Building TRP, the company’s route optimization platform for field sales, in a 2-person team owning architecture and development.',
            'Outlets are assigned to reps and weekdays with clustering, regional distribution and OR-Tools sequencing on real road distances from a self-hosted OSRM.',
            'Delivered a mobile-first PWA for field reps and manager dashboards for plan vs. actual, skip analysis and territory violation alerts.',
            'Designed a bidirectional sync service with the corporate system (Pansis): idempotent queue ingestion, exponential-backoff retries, a dead-letter queue and nightly change detection.',
            'Building backend services and declarative clients with Spring Boot (OpenFeign) within a microservices architecture.',
            'Running production on Linux with Docker Compose, nginx, SSL, rate limiting, CI/CD (GitHub Actions) and monitoring.'
          ]
        },
        {
          company: 'Yandex', role: 'Search Engine Quality Improvement Specialist', location: 'Remote', period: 'Oct 2024 — Jan 2025', start: '2024-10', end: '2025-01',
          points: [
            'Analyzed search engine results to enhance ranking accuracy and algorithm relevance.',
            'Evaluated data quality to improve user experience, demonstrating strong analytical skills.'
          ]
        }
      ],
      trp: {
        kicker: 'Feature — Anadolu Birlik Holding — Enterprise logistics',
        name: 'TRP',
        title: 'Route Optimization Platform',
        role: 'Full-Stack Developer · 2-person team, architecture & development',
        summary: 'A web platform for field sales teams that plans weekly visit routes, guides reps through them in the field, and lets the office monitor execution.',
        quote: 'Real roads, real fleets, real Monday mornings.',
        mapCaption: 'Fig. 1 — Four reps, one depot, routes sequenced on the street graph.',
        galleryTitle: 'The platform, in seven parts',
        blocks: [
          { t: 'Route optimization engine', d: 'Assigns sales outlets to reps and weekdays using clustering, regional distribution and OR-Tools sequencing on real road distances — served by a self-hosted OSRM instance running on the Turkey road network.' },
          { t: 'Field rep PWA', d: 'Mobile-first PWA with step-by-step stop tracking, offline support and live location.' },
          { t: 'Manager dashboards', d: 'Planning, reporting and performance screens: plan vs. actual, skip analysis and territory violation alerts.' },
          { t: 'Role-based access', d: 'Multi-level organizational hierarchy for admin, dealer, sales manager and field rep.' },
          { t: 'Bidirectional sync with Pansis', d: 'Queue-based ingestion with idempotent message handling, retries with exponential backoff and a dead-letter queue; nightly change detection with automated outbound delivery.' },
          { t: 'Data pipeline', d: 'Excel/CSV bulk import, background job processing (Redis/RQ) and schema migrations (Alembic).' },
          { t: 'Production', d: 'Deployed with Docker Compose: nginx reverse proxy, SSL, rate limiting, CI/CD (GitHub Actions) and monitoring.' }
        ],
        tech: ['Python', 'FastAPI', 'SQLAlchemy', 'PostgreSQL', 'Redis/RQ', 'OR-Tools', 'OSRM', 'React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Leaflet / Google Maps', 'Docker', 'nginx', 'GitHub Actions']
      },
      edge: {
        kicker: 'Side project — Embedded AI',
        name: 'EdgeVision',
        title: 'Embedded AI object detection system',
        body: 'Engineered a custom YOLOv8 model deployed on Raspberry Pi / Hailo edge devices.',
        tech: ['YOLOv8', 'Computer Vision', 'Raspberry Pi', 'Hailo', 'Python']
      },
      more: 'More on GitHub',
      stamp: { ring: 'IN PRODUCTION ✱ ANADOLU BIRLIK HOLDING ✱ ', mid: 'LIVE' },
      next: { label: 'Next chapter', title: 'System', sub: 'Skills, education and a terminal you can actually type into.' }
    },

    system: {
      boot: ['BOOT YEK.SYS v3', 'mounting /skills …… ok', 'mounting /education …… ok', 'mounting /certs …… ok', 'opening comms …… ok', 'ALL SYSTEMS NOMINAL'],
      skip: 'Press any key to skip',
      id: { label: 'ID.CARD', role: 'Computer Engineer', statusKey: 'Status', status: 'Online', station: 'Station', uptime: 'Current post', local: 'Local time', coords: 'Coordinates' },
      skills: { label: 'SKILLS.MATRIX', all: 'All', legend: { trp: 'TRP', abh: 'Anadolu Birlik services', edge: 'EdgeVision', cv: 'CV / coursework' }, legendT: 'Where it was used', short: { backend: 'BACKEND', web: 'WEB', data: 'DATA', devops: 'DEVOPS' }, groups: { backend: 'Backend & Architecture', web: 'Web & Mobile', data: 'Data, AI & Optimization', devops: 'DevOps & Infrastructure' }, modules: 'modules' },
      radar: { label: 'SCAN', caption: 'Stack coverage by domain' },
      edu: {
        label: 'EDU.RECORD', school: 'Konya Food & Agriculture University', degree: 'BSc Computer Engineering', note: '100% English',
        grad: 'Graduation · June 2026', gpa: 'CGPA', coursework: ['Data Structures', 'Algorithms', 'Cybersecurity', 'Database Management', 'Machine Learning']
      },
      certs: {
        label: 'CERT.LOG', verified: 'Logged',
        items: [
          { title: 'AI Training', issuer: 'Samsung Innovation Campus', year: '2025' },
          { title: 'Data Analysis School', issuer: 'Council of Higher Education (YÖK)', year: '—' },
          { title: 'Data Science Professional Certificate & Generative AI', issuer: 'IBM', year: '—' }
        ]
      },
      comms: {
        label: 'COMMS.TERMINAL',
        intro: 'Type "help" to list commands.',
        placeholder: 'type a command…',
        help: [
          'help        list commands',
          'whoami      who is this',
          'skills      print the stack',
          'edu         education record',
          'email       show e-mail',
          'copy        copy e-mail to clipboard',
          'github      open GitHub',
          'linkedin    open LinkedIn',
          'lang tr|en  switch language',
          'city|work   jump to chapter 01 / 02',
          'snake       play a round (arrows / WASD, Esc to quit)',
          'clear       clear the screen'
        ],
        whoami: 'Yunus Emre Kahraman — Computer Engineer @ Anadolu Birlik Holding. Route optimization, backend, data pipelines, edge AI.',
        copied: 'e-mail copied to clipboard',
        opening: 'opening',
        unknown: 'command not found',
        sudo: 'nice try.',
        snakeOver: 'GAME OVER — score', konami: '★ OVERDRIVE UNLOCKED ★ you found the cheat code.'
      },
      back: { label: 'End of transmission', title: 'Back to the city' }
    },

    /* the single-page operation: rail labels, chapter titles, the event that unlocks each card */
    op: {
      rail: { city: ['Depot', 'About', 'Numbers', 'Focus'], work: ['Target', 'Briefing', 'In the van', 'HQ', 'Ranks', 'Sync', 'Loading dock', 'Street cam', 'Bunker'], system: ['Command', 'Armory', 'Academy', 'Badges', 'Radio', 'Exfil'] },
      ch: { work: { n: '02', t: 'Field Operation', k: 'Chapter 02 — 2024—2026 — Konya' }, system: { n: '03', t: 'Command Center', k: 'Chapter 03 — skills, training, comms' } },
      event: 'EVENT',
      waiting: 'awaiting event…',
      ev: {
        w0: 'Target locked · Anadolu Birlik Holding HQ',
        brief: 'Briefing · {s} stops split into {r} sectors · OR-Tools sequencing',
        cab: 'Cab PLS-A · {k}/{n} orders taken · next stop {m}',
        hq: 'ALERT · PLS-C skipped a stop · territory violation',
        roles: 'Access layers scanned · 4 levels',
        sync: 'Pansis sync · packet #{n} failed → retry 1s · 2s · 4s → dead-letter',
        dock: 'Loading dock · {n} rows imported · RQ workers busy',
        edge: 'CAM-07 · YOLOv8 on Hailo · {n} objects in frame',
        prod: 'Bunker · {n} containers healthy · CI/CD green',
        s0: 'Identity confirmed · operator YEK',
        skills: 'Lockers open · {n} modules',
        edu: 'Academy uplink · live feed',
        certs: 'Badges verified · {n}/{n}',
        term: 'Radio open · awaiting command',
        out: 'Operation complete · all units back'
      },
      roles: ['Admin', 'Dealer', 'Sales manager', 'Field rep'],
      dash: { title: 'PLAN vs ACTUAL', skip: 'SKIP ALERT', ok: 'ON PLAN', zone: 'territory' },
      phone: { title: 'TRP · Field', offline: 'offline ready', next: 'next stop', done: 'order taken', taking: 'taking order' },
      exp: 'Service record',
      stack: 'Stack in production',
      out: { t: 'Operation complete.', d: 'Everything you flew over is real work that shipped. Want to talk?', top: 'Back to orbit' },
      cam: { demo: 'detections drawn on this scene — a demo, not real footage' },
      lockerHint: 'Pick a locker'
    }
  },

  /* ===================================================================== TR */
  tr: {
    meta: {
      city: 'Yunus Emre Kahraman — 01 Şehir',
      work: 'Yunus Emre Kahraman — 02 İşler',
      system: 'Yunus Emre Kahraman — 03 Sistem'
    },
    chapters: ['Şehir', 'İşler', 'Sistem'],
    lang: 'Dil',

    city: {
      kicker: 'Bilgisayar Mühendisi — Konya, Türkiye',
      tagline: 'Filoların bir sonraki adımda nereye gideceğine karar veren sistemler kuruyorum — rota optimizasyonu, backend mikroservisler ve onları besleyen veri hatları.',
      scroll: 'Uçmak için kaydır',
      loading: 'Şehir inşa ediliyor',
      stop: 'Durak',
      about: {
        label: 'Hakkımda',
        title: 'Ölçeklenen sistemler, tasarruf ettiren rotalar.',
        body: [
          'Ölçeklenebilir kurumsal uygulamalar, mikroservis mimarisi ve gelişmiş rotalama algoritmaları geliştirme konusunda uygulamalı deneyime sahip, sonuç odaklı bir Bilgisayar ve Yazılım Mühendisiyim.',
          'Bugün Anadolu Birlik Holding’de rut optimizasyon platformu TRP’yi geliştiriyorum — VRP motorundan saha uygulamasına ve canlı ortama kadar.'
        ]
      },
      facts: {
        label: 'Rakamlarla',
        items: ['teknoloji yığınımda', 'şirket', 'sertifika', 'GNO / 4.00']
      },
      focus: {
        label: 'Neler üzerinde çalışıyorum',
        title: 'Durmadan ürettiğim dört şey.',
        items: [
          { t: 'Rota optimizasyonu', d: 'VRP · OR-Tools · Türkiye yol ağında OSRM' },
          { t: 'Backend & mikroservisler', d: 'FastAPI · Spring Boot (OpenFeign) · PostgreSQL' },
          { t: 'Veri hatları', d: 'Kuyruklar, yeniden denemeler, Redis/RQ, Alembic' },
          { t: 'Edge AI', d: 'Raspberry Pi / Hailo üzerinde özel YOLOv8' }
        ],
        chase: 'Kamera: bir plasiyeri canlı takip ediyor'
      },
      next: { label: 'Sonraki bölüm', title: 'İşler', sub: 'Deneyim, TRP ve EdgeVision — dergi baskısı.' }
    },

    work: {
      cover: { l1: 'Seçilmiş', l2: 'İşler', dek: 'İki şirket, canlıda çalışan bir platform, uçta çalışan bir model. Aşağıdaki her şey yayına çıktı.', meta: 'Bölüm 02 — 2024—2026 — Konya' },
      marquee: ['Rota optimizasyonu', 'FastAPI', 'OR-Tools', 'OSRM', 'React PWA', 'PostgreSQL', 'Redis/RQ', 'Docker', 'YOLOv8'],
      expTitle: 'Deneyim',
      present: 'Günümüz',
      months: 'ay',
      experience: [
        {
          company: 'Anadolu Birlik Holding', role: 'Yazılım Mühendisi', location: 'Konya, Türkiye', period: 'Mart 2026 — Günümüz', start: '2026-03',
          points: [
            'Saha satış ekipleri için şirketin rut optimizasyon platformu TRP’yi 2 kişilik ekipte mimari ve geliştirme sorumluluğuyla geliştiriyorum.',
            'Satış noktaları; kümeleme, bölgesel dağıtım ve kendi sunucumuzdaki OSRM’den gelen gerçek yol mesafeleriyle OR-Tools sıralaması kullanılarak plasiyerlere ve günlere dağıtılıyor.',
            'Plasiyerler için mobil uyumlu bir PWA ve yöneticiler için plan/gerçekleşen karşılaştırması, atlama analizi ve bölge ihlali uyarıları sunan paneller geliştirdim.',
            'Kurumsal sistemle (Pansis) iki yönlü senkronizasyon servisi tasarladım: kuyruk tabanlı veri alımı, tekrar gelen mesajların ayıklanması, üstel beklemeli yeniden deneme, ölü mektup kuyruğu ve gece çalışan değişiklik tespiti.',
            'Mikroservis mimarisi içinde Spring Boot (OpenFeign) ile backend servisleri ve deklaratif istemciler geliştiriyorum.',
            'Sistemi Linux üzerinde Docker Compose, nginx, SSL, hız sınırlama, CI/CD (GitHub Actions) ve izleme ile canlıda işletiyorum.'
          ]
        },
        {
          company: 'Yandex', role: 'Arama Motoru Kalite İyileştirme Uzmanı', location: 'Uzaktan', period: 'Eki 2024 — Oca 2025', start: '2024-10', end: '2025-01',
          points: [
            'Sıralama doğruluğunu ve algoritma alaka düzeyini artırmak için arama motoru sonuçlarını analiz ettim.',
            'Kullanıcı deneyimini iyileştirmek için veri kalitesini değerlendirdim ve güçlü analitik becerilerimi ortaya koydum.'
          ]
        }
      ],
      trp: {
        kicker: 'Kapak konusu — Anadolu Birlik Holding — Kurumsal lojistik',
        name: 'TRP',
        title: 'Rut Optimizasyon Platformu',
        role: 'Full-Stack Geliştirici · 2 kişilik ekip, mimari ve geliştirme',
        summary: 'Saha satış ekiplerinin haftalık ziyaret rotalarını planlayan, sahada yürütülmesini sağlayan ve ofisten izlenmesini sağlayan web platformu.',
        quote: 'Gerçek yollar, gerçek filolar, gerçek pazartesi sabahları.',
        mapCaption: 'Şekil 1 — Dört plasiyer, bir depo, sokak ağı üzerinde sıralanmış rotalar.',
        galleryTitle: 'Yedi parçada platform',
        blocks: [
          { t: 'Rota optimizasyon motoru', d: 'Satış noktalarını plasiyerlere ve günlere dağıtıyor. Kümeleme, bölgesel dağıtım ve OR-Tools ile gerçek yol mesafesine göre sıralama kullanılıyor; yol mesafeleri Türkiye yol ağı üzerinde kendi sunucumuzda çalışan OSRM’den geliyor.' },
          { t: 'Plasiyer PWA’sı', d: 'Mobil uyumlu PWA: sıralı durak takibi, çevrimdışı çalışma, canlı konum.' },
          { t: 'Yönetici panelleri', d: 'Planlama, raporlama ve performans ekranları: plan ile gerçekleşenin karşılaştırması, atlama analizi, bölge ihlali uyarıları.' },
          { t: 'Rol tabanlı yetkilendirme', d: 'Admin, bayi, satış şefi/yöneticisi ve plasiyer için çok seviyeli organizasyon hiyerarşisi.' },
          { t: 'Pansis ile iki yönlü senkronizasyon', d: 'Kuyruk tabanlı veri alımı; tekrar gelen mesajlar ayıklanıyor, hatalı kayıtlar üstel beklemeyle yeniden deneniyor, işlenemeyenler ölü mektup kuyruğuna düşüyor. Gece çalışan değişiklik tespiti ve otomatik veri gönderimi.' },
          { t: 'Veri hattı', d: 'Excel/CSV ile toplu veri aktarımı, arka planda çalışan iş kuyrukları (Redis/RQ) ve veritabanı şema migration’ları (Alembic).' },
          { t: 'Canlı ortam', d: 'Docker Compose ile canlıya alındı: nginx reverse proxy, SSL, hız sınırlama, CI/CD (GitHub Actions) ve izleme.' }
        ],
        tech: ['Python', 'FastAPI', 'SQLAlchemy', 'PostgreSQL', 'Redis/RQ', 'OR-Tools', 'OSRM', 'React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Leaflet / Google Maps', 'Docker', 'nginx', 'GitHub Actions']
      },
      edge: {
        kicker: 'Yan proje — Gömülü yapay zekâ',
        name: 'EdgeVision',
        title: 'Gömülü yapay zekâ nesne tespit sistemi',
        body: 'Raspberry Pi / Hailo uç cihazlarında çalışan özel bir YOLOv8 modeli geliştirdim.',
        tech: ['YOLOv8', 'Bilgisayarlı Görü', 'Raspberry Pi', 'Hailo', 'Python']
      },
      more: 'Daha fazlası GitHub’da',
      stamp: { ring: 'CANLIDA ✱ ANADOLU BİRLİK HOLDİNG ✱ ', mid: 'YAYINDA' },
      next: { label: 'Sonraki bölüm', title: 'Sistem', sub: 'Yetenekler, eğitim ve gerçekten komut yazabileceğin bir terminal.' }
    },

    system: {
      boot: ['BOOT YEK.SYS v3', '/yetenekler bağlanıyor …… tamam', '/egitim bağlanıyor …… tamam', '/sertifikalar bağlanıyor …… tamam', 'iletişim kanalı açılıyor …… tamam', 'TÜM SİSTEMLER HAZIR'],
      skip: 'Geçmek için bir tuşa bas',
      id: { label: 'KİMLİK', role: 'Bilgisayar Mühendisi', statusKey: 'Durum', status: 'Çevrimiçi', station: 'İstasyon', uptime: 'Mevcut görev', local: 'Yerel saat', coords: 'Koordinat' },
      skills: { label: 'YETENEK.MATRİSİ', all: 'Tümü', legend: { trp: 'TRP', abh: 'Anadolu Birlik servisleri', edge: 'EdgeVision', cv: 'CV / eğitim' }, legendT: 'Nerede kullanıldı', short: { backend: 'BACKEND', web: 'WEB', data: 'VERİ', devops: 'DEVOPS' }, groups: { backend: 'Backend & Mimari', web: 'Web & Mobil', data: 'Veri, Yapay Zekâ & Optimizasyon', devops: 'DevOps & Altyapı' }, modules: 'modül' },
      radar: { label: 'TARAMA', caption: 'Alana göre yığın kapsamı' },
      edu: {
        label: 'EĞİTİM.KAYDI', school: 'Konya Gıda ve Tarım Üniversitesi', degree: 'Bilgisayar Mühendisliği Lisans', note: '%100 İngilizce',
        grad: 'Mezuniyet · Haziran 2026', gpa: 'GNO', coursework: ['Veri Yapıları', 'Algoritmalar', 'Siber Güvenlik', 'Veritabanı Yönetimi', 'Makine Öğrenmesi']
      },
      certs: {
        label: 'SERTİFİKA.GÜNLÜĞÜ', verified: 'Kayıtlı',
        items: [
          { title: 'Yapay Zekâ Eğitimi', issuer: 'Samsung Innovation Campus', year: '2025' },
          { title: 'Veri Analizi Okulu', issuer: 'Yükseköğretim Kurulu (YÖK)', year: '—' },
          { title: 'Veri Bilimi Profesyonel Sertifikası & Üretken Yapay Zekâ', issuer: 'IBM', year: '—' }
        ]
      },
      comms: {
        label: 'İLETİŞİM.TERMİNALİ',
        intro: 'Komutları görmek için "help" yaz.',
        placeholder: 'bir komut yaz…',
        help: [
          'help        komutları listele',
          'whoami      bu kim',
          'skills      yığını yazdır',
          'edu         eğitim kaydı',
          'email       e-postayı göster',
          'copy        e-postayı panoya kopyala',
          'github      GitHub’ı aç',
          'linkedin    LinkedIn’i aç',
          'lang tr|en  dili değiştir',
          'city|work   01 / 02. bölüme git',
          'snake       bir el oyna (oklar / WASD, Esc ile çık)',
          'clear       ekranı temizle'
        ],
        whoami: 'Yunus Emre Kahraman — Bilgisayar Mühendisi @ Anadolu Birlik Holding. Rota optimizasyonu, backend, veri hatları, edge AI.',
        copied: 'e-posta panoya kopyalandı',
        opening: 'açılıyor',
        unknown: 'komut bulunamadı',
        sudo: 'iyi denemeydi.',
        snakeOver: 'OYUN BİTTİ — skor', konami: '★ OVERDRIVE AÇILDI ★ hile kodunu buldun.'
      },
      back: { label: 'Yayın sonu', title: 'Şehre geri dön' }
    },

    op: {
      rail: { city: ['Depo', 'Hakkımda', 'Rakamlar', 'Odak'], work: ['Hedef', 'Brifing', 'Araç içi', 'Merkez', 'Rütbeler', 'Senkron', 'Rampa', 'Sokak kamerası', 'Sığınak'], system: ['Komuta', 'Cephanelik', 'Akademi', 'Rozetler', 'Telsiz', 'Tahliye'] },
      ch: { work: { n: '02', t: 'Saha Operasyonu', k: 'Bölüm 02 — 2024—2026 — Konya' }, system: { n: '03', t: 'Komuta Merkezi', k: 'Bölüm 03 — yetenekler, eğitim, iletişim' } },
      event: 'OLAY',
      waiting: 'olay bekleniyor…',
      ev: {
        w0: 'Hedef kilitlendi · Anadolu Birlik Holding merkez',
        brief: 'Brifing · {s} durak {r} sektöre bölündü · OR-Tools sıralıyor',
        cab: 'PLS-A kabini · {k}/{n} sipariş alındı · sıradaki durak {m}',
        hq: 'ALARM · PLS-C durak atladı · bölge ihlali',
        roles: 'Erişim katmanları tarandı · 4 seviye',
        sync: 'Pansis senkronu · paket #{n} düştü → yeniden deneme 1s · 2s · 4s → ölü mektup',
        dock: 'Rampa · {n} satır içe aktarıldı · RQ işçileri çalışıyor',
        edge: 'CAM-07 · Hailo üzerinde YOLOv8 · karede {n} nesne',
        prod: 'Sığınak · {n} konteyner sağlıklı · CI/CD yeşil',
        s0: 'Kimlik doğrulandı · operatör YEK',
        skills: 'Dolaplar açıldı · {n} modül',
        edu: 'Akademi bağlantısı · canlı yayın',
        certs: 'Rozetler doğrulandı · {n}/{n}',
        term: 'Telsiz açık · komut bekleniyor',
        out: 'Operasyon tamamlandı · tüm birlikler döndü'
      },
      roles: ['Admin', 'Bayi', 'Satış müdürü', 'Plasiyer'],
      dash: { title: 'PLAN vs GERÇEKLEŞEN', skip: 'ATLAMA ALARMI', ok: 'PLANDA', zone: 'bölge' },
      phone: { title: 'TRP · Saha', offline: 'çevrimdışı hazır', next: 'sıradaki durak', done: 'sipariş alındı', taking: 'sipariş alınıyor' },
      exp: 'Görev kaydı',
      stack: 'Canlıdaki yığın',
      out: { t: 'Operasyon tamamlandı.', d: 'Üzerinden uçtuğun her şey yayına çıkmış gerçek işler. Konuşalım mı?', top: 'Yörüngeye dön' },
      cam: { demo: 'tespitler bu sahnenin üzerine çiziliyor — demo, gerçek görüntü değil' },
      lockerHint: 'Bir dolap seç'
    }
  }
};
