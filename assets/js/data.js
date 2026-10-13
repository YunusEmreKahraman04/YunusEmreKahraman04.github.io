/* Portfolio content — edit here to update the site in both languages. */
window.CONTENT = {
  profile: {
    name: 'Yunus Emre Kahraman',
    email: 'yemrekah04@gmail.com',
    linkedin: 'https://www.linkedin.com/in/yunus-emre-kahraman-a1b19425a',
    github: 'https://github.com/YunusEmreKahraman04'
  },

  skills: [
    { id: 'backend', icon: 'server', items: ['Java', 'Spring Boot (OpenFeign)', 'Python', 'FastAPI', 'SQLAlchemy', { en: 'Microservices', tr: 'Mikroservisler' }, 'SQL', 'PostgreSQL', 'Redis/RQ', 'Alembic', 'C++', 'Bash'] },
    { id: 'web', icon: 'layout', items: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'PWA', 'Leaflet / Google Maps', 'Flutter', 'Firebase'] },
    { id: 'data', icon: 'cpu', items: ['Pandas', 'NumPy', 'OR-Tools', 'OSRM', 'Streamlit', { en: 'Computer Vision (YOLOv8)', tr: 'Bilgisayarlı Görü (YOLOv8)' }, 'NLP'] },
    { id: 'devops', icon: 'box', items: ['Docker', 'Docker Compose', 'nginx', 'GitHub Actions', 'Linux', 'SSH', 'Git'] }
  ],

  en: {
    meta: {
      title: 'Yunus Emre Kahraman — Software Engineer',
      description: 'Software Engineer building scalable enterprise systems, microservices and route optimization algorithms.'
    },
    nav: { about: 'About', experience: 'Experience', projects: 'Projects', skills: 'Skills', education: 'Education', contact: 'Contact' },
    ui: {
      search: 'Search',
      menu: 'Menu',
      theme: 'Toggle theme',
      lang: 'Language',
      copy: 'Copy email',
      copied: 'Email copied to clipboard',
      present: 'Present',
      backTop: 'Back to top',
      palettePh: 'Type a command or search…',
      paletteEmpty: 'No results found.',
      groupNav: 'Navigate',
      groupActions: 'Actions',
      groupLinks: 'Links',
      goTo: 'Go to',
      switchLang: 'Türkçe’ye geç',
      toggleTheme: 'Toggle light / dark theme',
      copyEmail: 'Copy email address',
      sendEmail: 'Send an email',
      move: 'move',
      select: 'select',
      close: 'close',
      konya: 'Konya, TR',
      loading: 'Optimizing routes',
      accent: 'Accent color',
      accents: { aurora: 'Aurora', sunset: 'Sunset', ocean: 'Ocean', lime: 'Neon' }
    },
    hero: {
      status: 'Currently building at Anadolu Birlik Holding',
      hello: "Hi, I'm",
      rolePrefix: 'I work on',
      roles: ['route optimization', 'backend microservices', 'data pipelines', 'edge AI'],
      tagline: 'Software engineer building scalable enterprise systems, microservices and routing algorithms that move real fleets on real roads.',
      ctaProjects: 'Explore my work',
      ctaContact: 'Get in touch',
      scroll: 'Scroll',
      hud: { title: 'Live VRP solver', stops: 'stops', vehicles: 'vehicles', km: 'km total', hint: 'Click the map to add a stop', reset: 'Shuffle' }
    },
    about: {
      label: 'About',
      title: 'Engineering systems that scale, routes that save.',
      body: [
        'Result-oriented Computer Engineer and Software Engineer with hands-on experience in building scalable enterprise applications, microservices architecture, and advanced routing algorithms.',
        'Proven track record in developing end-to-end software solutions, optimizing data pipelines, and implementing high-performance systems — today focused on route optimization for enterprise logistics at Anadolu Birlik Holding.'
      ],
      stats: { tech: 'Technologies', companies: 'Companies', certs: 'Certifications', cgpa: 'CGPA' },
      terminal: [
        { cmd: 'whoami', out: 'yunus-emre-kahraman' },
        { cmd: 'cat role.txt', out: 'Software Engineer @ Anadolu Birlik Holding' },
        { cmd: 'ls ~/focus', out: 'route-optimization/  microservices/  data-pipelines/  edge-ai/' },
        { cmd: 'echo $LOCATION', out: 'Konya, Turkey' }
      ]
    },
    experience: {
      label: 'Experience',
      title: 'Where I’ve shipped.',
      items: [
        {
          company: 'Anadolu Birlik Holding',
          role: 'Software Engineer',
          location: 'Konya, Turkey',
          period: 'Mar 2026 — Present',
          current: true,
          points: [
            'Building TRP, the company’s route optimization platform for field sales, in a 2-person team owning architecture and development: outlets are assigned to reps and weekdays with clustering, regional distribution and OR-Tools sequencing on real road distances from a self-hosted OSRM.',
            'Delivered a mobile-first PWA for field reps (stop tracking, offline support, live location) and manager dashboards for plan vs. actual, skip analysis and territory violation alerts.',
            'Designed a bidirectional sync service with the corporate system (Pansis): queue-based idempotent ingestion, exponential-backoff retries, a dead-letter queue and nightly change detection.',
            'Building backend services and declarative clients with Spring Boot (OpenFeign) within a microservices architecture.',
            'Running production on Linux with Docker Compose, nginx, SSL, rate limiting, CI/CD (GitHub Actions) and monitoring.'
          ],
          project: 'See the TRP project',
          tags: ['VRP', 'OR-Tools', 'OSRM', 'FastAPI', 'React PWA', 'Spring Boot', 'Redis/RQ', 'Docker', 'nginx']
        },
        {
          company: 'Yandex',
          role: 'Search Engine Quality Improvement Specialist',
          location: 'Remote',
          period: 'Oct 2024 — Jan 2025',
          points: [
            'Analyzed search engine results to enhance ranking accuracy and algorithm relevance.',
            'Evaluated data quality to improve user experience, demonstrating strong analytical skills.'
          ],
          tags: ['Search Quality', 'Ranking', 'Data Quality']
        }
      ]
    },
    projects: {
      label: 'Projects',
      title: 'Selected work.',
      items: [
        {
          visual: 'route',
          featured: true,
          badge: 'Anadolu Birlik Holding · Enterprise logistics',
          title: 'TRP – Route Optimization Platform',
          role: 'Full-Stack Developer · 2-person team, architecture & development',
          summary: 'A web platform for field sales teams that plans weekly visit routes, guides reps through them in the field, and lets the office monitor execution.',
          roles: ['Admin', 'Dealer', 'Sales manager', 'Field rep'],
          blocks: [
            { icon: 'map', span: 2, title: 'Route optimization engine', text: 'Assigns sales outlets to reps and weekdays using clustering, regional distribution and OR-Tools sequencing on real road distances — served by a self-hosted OSRM instance running on the Turkey road network.' },
            { icon: 'phone', title: 'Field rep PWA', text: 'Mobile-first PWA with step-by-step stop tracking, offline support and live location.' },
            { icon: 'chart', title: 'Manager dashboards', text: 'Planning, reporting and performance screens: plan vs. actual, skip analysis and territory violation alerts.' },
            { icon: 'users', title: 'Role-based access', text: 'Multi-level organizational hierarchy for admin, dealer, sales manager and field rep.' },
            { icon: 'database', title: 'Data pipeline', text: 'Excel/CSV bulk import, background job processing (Redis/RQ) and schema migrations (Alembic).' },
            {
              icon: 'sync', span: 2, title: 'Bidirectional sync with Pansis',
              text: 'Sync service between the platform and the corporate system (Pansis):',
              sub: [
                'Queue-based ingestion with idempotent message handling, retries with exponential backoff, and a dead-letter queue for records that cannot be processed.',
                'Nightly change detection with automated outbound delivery.'
              ],
              pipeline: { steps: ['Pansis', 'Queue', 'Worker', 'PostgreSQL'], dlq: 'dead-letter queue' }
            },
            { icon: 'cloud', title: 'Production', text: 'Deployed with Docker Compose: nginx reverse proxy, SSL, rate limiting, CI/CD (GitHub Actions) and monitoring.' }
          ],
          tags: ['Python', 'FastAPI', 'SQLAlchemy', 'PostgreSQL', 'Redis/RQ', 'OR-Tools', 'OSRM', 'React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Leaflet / Google Maps', 'Docker', 'nginx', 'GitHub Actions']
        },
        {
          visual: 'vision',
          badge: 'Embedded AI',
          title: 'EdgeVision',
          subtitle: 'Embedded AI object detection system',
          points: ['Engineered a custom YOLOv8 model deployed on Raspberry Pi / Hailo edge devices.'],
          tags: ['YOLOv8', 'Computer Vision', 'Raspberry Pi', 'Hailo', 'Python']
        }
      ],
      more: { title: 'More on GitHub', body: 'Experiments, coursework and side projects live on my GitHub profile.', cta: 'Visit profile' }
    },
    skills: {
      label: 'Skills',
      title: 'The toolbox.',
      groups: { backend: 'Backend & Architecture', web: 'Web & Mobile', data: 'Data, AI & Optimization', devops: 'DevOps & Infrastructure' }
    },
    education: {
      label: 'Education',
      title: 'Foundations.',
      school: 'Konya Food & Agriculture University',
      degree: 'BSc Computer Engineering',
      note: '100% English',
      date: 'Graduation · June 2026',
      cgpaLabel: 'CGPA',
      courseworkLabel: 'Coursework',
      coursework: ['Data Structures', 'Algorithms', 'Cybersecurity', 'Database Management', 'Machine Learning'],
      certsTitle: 'Certifications',
      certs: [
        { title: 'AI Training', issuer: 'Samsung Innovation Campus', year: '2025' },
        { title: 'Data Analysis School', issuer: 'Council of Higher Education (YÖK)' },
        { title: 'Data Science Professional Certificate & Generative AI', issuer: 'IBM' }
      ]
    },
    contact: {
      label: 'Contact',
      line1: 'Let’s build something',
      line2: 'that moves.',
      body: 'Open to engineering roles, collaborations and interesting optimization problems. My inbox is always open.'
    },
    footer: {
      built: 'Designed & built by Yunus Emre Kahraman.',
      hint: 'Press <kbd class="kbd-key"></kbd> to open the command palette'
    }
  },

  tr: {
    meta: {
      title: 'Yunus Emre Kahraman — Yazılım Mühendisi',
      description: 'Ölçeklenebilir kurumsal sistemler, mikroservisler ve rota optimizasyon algoritmaları geliştiren yazılım mühendisi.'
    },
    nav: { about: 'Hakkımda', experience: 'Deneyim', projects: 'Projeler', skills: 'Yetenekler', education: 'Eğitim', contact: 'İletişim' },
    ui: {
      search: 'Ara',
      menu: 'Menü',
      theme: 'Temayı değiştir',
      lang: 'Dil',
      copy: 'E-postayı kopyala',
      copied: 'E-posta panoya kopyalandı',
      present: 'Günümüz',
      backTop: 'Başa dön',
      palettePh: 'Bir komut yazın veya arayın…',
      paletteEmpty: 'Sonuç bulunamadı.',
      groupNav: 'Gezinme',
      groupActions: 'İşlemler',
      groupLinks: 'Bağlantılar',
      goTo: 'Git',
      switchLang: 'Switch to English',
      toggleTheme: 'Açık / koyu temayı değiştir',
      copyEmail: 'E-posta adresini kopyala',
      sendEmail: 'E-posta gönder',
      move: 'gezin',
      select: 'seç',
      close: 'kapat',
      konya: 'Konya, TR',
      loading: 'Rotalar optimize ediliyor',
      accent: 'Vurgu rengi',
      accents: { aurora: 'Aurora', sunset: 'Gün batımı', ocean: 'Okyanus', lime: 'Neon' }
    },
    hero: {
      status: 'Şu an Anadolu Birlik Holding’de geliştiriyor',
      hello: 'Merhaba, ben',
      rolePrefix: 'Odak alanım:',
      roles: ['rota optimizasyonu', 'backend mikroservisler', 'veri hatları', 'edge AI'],
      tagline: 'Ölçeklenebilir kurumsal sistemler, mikroservisler ve gerçek yollarda gerçek filoları hareket ettiren rota algoritmaları geliştiren bir yazılım mühendisiyim.',
      ctaProjects: 'Çalışmalarımı keşfet',
      ctaContact: 'İletişime geç',
      scroll: 'Kaydır',
      hud: { title: 'Canlı VRP çözücü', stops: 'durak', vehicles: 'araç', km: 'km toplam', hint: 'Durak eklemek için haritaya tıkla', reset: 'Karıştır' }
    },
    about: {
      label: 'Hakkımda',
      title: 'Ölçeklenen sistemler, tasarruf ettiren rotalar.',
      body: [
        'Ölçeklenebilir kurumsal uygulamalar, mikroservis mimarisi ve gelişmiş rotalama algoritmaları geliştirme konusunda uygulamalı deneyime sahip, sonuç odaklı bir Bilgisayar ve Yazılım Mühendisiyim.',
        'Uçtan uca yazılım çözümleri geliştirme, veri hatlarını optimize etme ve yüksek performanslı sistemler kurma konusunda kanıtlanmış bir geçmişim var — bugün Anadolu Birlik Holding’de kurumsal lojistik için rota optimizasyonuna odaklanıyorum.'
      ],
      stats: { tech: 'Teknoloji', companies: 'Şirket', certs: 'Sertifika', cgpa: 'GNO' },
      terminal: [
        { cmd: 'whoami', out: 'yunus-emre-kahraman' },
        { cmd: 'cat rol.txt', out: 'Yazılım Mühendisi @ Anadolu Birlik Holding' },
        { cmd: 'ls ~/odak', out: 'rota-optimizasyonu/  mikroservisler/  veri-hatlari/  edge-ai/' },
        { cmd: 'echo $KONUM', out: 'Konya, Türkiye' }
      ]
    },
    experience: {
      label: 'Deneyim',
      title: 'Değer ürettiğim yerler.',
      items: [
        {
          company: 'Anadolu Birlik Holding',
          role: 'Yazılım Mühendisi',
          location: 'Konya, Türkiye',
          period: 'Mart 2026 — Günümüz',
          current: true,
          points: [
            'Saha satış ekipleri için şirketin rut optimizasyon platformu TRP’yi 2 kişilik ekipte mimari ve geliştirme sorumluluğuyla geliştiriyorum: satış noktaları; kümeleme, bölgesel dağıtım ve kendi sunucumuzdaki OSRM’den gelen gerçek yol mesafeleriyle OR-Tools sıralaması kullanılarak plasiyerlere ve günlere dağıtılıyor.',
            'Plasiyerler için mobil uyumlu bir PWA (sıralı durak takibi, çevrimdışı çalışma, canlı konum) ve yöneticiler için plan/gerçekleşen karşılaştırması, atlama analizi ve bölge ihlali uyarıları sunan paneller geliştirdim.',
            'Kurumsal sistemle (Pansis) iki yönlü senkronizasyon servisi tasarladım: kuyruk tabanlı veri alımı, tekrar gelen mesajların ayıklanması, üstel beklemeli yeniden deneme, ölü mektup kuyruğu ve gece çalışan değişiklik tespiti.',
            'Mikroservis mimarisi içinde Spring Boot (OpenFeign) ile backend servisleri ve deklaratif istemciler geliştiriyorum.',
            'Sistemi Linux üzerinde Docker Compose, nginx, SSL, hız sınırlama, CI/CD (GitHub Actions) ve izleme ile canlıda işletiyorum.'
          ],
          project: 'TRP projesine göz at',
          tags: ['VRP', 'OR-Tools', 'OSRM', 'FastAPI', 'React PWA', 'Spring Boot', 'Redis/RQ', 'Docker', 'nginx']
        },
        {
          company: 'Yandex',
          role: 'Arama Motoru Kalite İyileştirme Uzmanı',
          location: 'Uzaktan',
          period: 'Eki 2024 — Oca 2025',
          points: [
            'Sıralama doğruluğunu ve algoritma alaka düzeyini artırmak için arama motoru sonuçlarını analiz ettim.',
            'Kullanıcı deneyimini iyileştirmek için veri kalitesini değerlendirdim ve güçlü analitik becerilerimi ortaya koydum.'
          ],
          tags: ['Arama Kalitesi', 'Sıralama', 'Veri Kalitesi']
        }
      ]
    },
    projects: {
      label: 'Projeler',
      title: 'Öne çıkan işler.',
      items: [
        {
          visual: 'route',
          featured: true,
          badge: 'Anadolu Birlik Holding · Kurumsal lojistik',
          title: 'TRP – Rut Optimizasyon Platformu',
          role: 'Full-Stack Geliştirici · 2 kişilik ekip, mimari ve geliştirme',
          summary: 'Saha satış ekiplerinin haftalık ziyaret rotalarını planlayan, sahada yürütülmesini sağlayan ve ofisten izlenmesini sağlayan web platformu.',
          roles: ['Admin', 'Bayi', 'Satış şefi', 'Plasiyer'],
          blocks: [
            { icon: 'map', span: 2, title: 'Rota optimizasyon motoru', text: 'Satış noktalarını plasiyerlere ve günlere dağıtıyor. Kümeleme, bölgesel dağıtım ve OR-Tools ile gerçek yol mesafesine göre sıralama kullanılıyor; yol mesafeleri Türkiye yol ağı üzerinde kendi sunucumuzda çalışan OSRM’den geliyor.' },
            { icon: 'phone', title: 'Plasiyer PWA’sı', text: 'Mobil uyumlu PWA: sıralı durak takibi, çevrimdışı çalışma, canlı konum.' },
            { icon: 'chart', title: 'Yönetici panelleri', text: 'Planlama, raporlama ve performans ekranları: plan ile gerçekleşenin karşılaştırması, atlama analizi, bölge ihlali uyarıları.' },
            { icon: 'users', title: 'Rol tabanlı yetkilendirme', text: 'Admin, bayi, satış şefi/yöneticisi ve plasiyer için çok seviyeli organizasyon hiyerarşisi.' },
            { icon: 'database', title: 'Veri hattı', text: 'Excel/CSV ile toplu veri aktarımı, arka planda çalışan iş kuyrukları (Redis/RQ) ve veritabanı şema migration’ları (Alembic).' },
            {
              icon: 'sync', span: 2, title: 'Pansis ile iki yönlü senkronizasyon',
              text: 'Kurumsal sistemle (Pansis) iki yönlü senkronizasyon servisi:',
              sub: [
                'Kuyruk tabanlı veri alımı; tekrar gelen mesajlar ayıklanıyor, hatalı kayıtlar üstel beklemeyle yeniden deneniyor, işlenemeyenler ölü mektup kuyruğuna düşüyor.',
                'Gece çalışan değişiklik tespiti ve otomatik veri gönderimi.'
              ],
              pipeline: { steps: ['Pansis', 'Kuyruk', 'İşleyici', 'PostgreSQL'], dlq: 'ölü mektup kuyruğu' }
            },
            { icon: 'cloud', title: 'Canlı ortam', text: 'Docker Compose ile canlıya alındı: nginx reverse proxy, SSL, hız sınırlama, CI/CD (GitHub Actions) ve izleme.' }
          ],
          tags: ['Python', 'FastAPI', 'SQLAlchemy', 'PostgreSQL', 'Redis/RQ', 'OR-Tools', 'OSRM', 'React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Leaflet / Google Maps', 'Docker', 'nginx', 'GitHub Actions']
        },
        {
          visual: 'vision',
          badge: 'Gömülü Yapay Zekâ',
          title: 'EdgeVision',
          subtitle: 'Gömülü yapay zekâ nesne tespit sistemi',
          points: ['Raspberry Pi / Hailo uç cihazlarında çalışan özel bir YOLOv8 modeli geliştirdim.'],
          tags: ['YOLOv8', 'Bilgisayarlı Görü', 'Raspberry Pi', 'Hailo', 'Python']
        }
      ],
      more: { title: 'Daha fazlası GitHub’da', body: 'Deneyler, ders projeleri ve yan projeler GitHub profilimde.', cta: 'Profili ziyaret et' }
    },
    skills: {
      label: 'Yetenekler',
      title: 'Alet çantam.',
      groups: { backend: 'Backend & Mimari', web: 'Web & Mobil', data: 'Veri, Yapay Zekâ & Optimizasyon', devops: 'DevOps & Altyapı' }
    },
    education: {
      label: 'Eğitim',
      title: 'Temeller.',
      school: 'Konya Gıda ve Tarım Üniversitesi',
      degree: 'Bilgisayar Mühendisliği Lisans',
      note: '%100 İngilizce',
      date: 'Mezuniyet · Haziran 2026',
      cgpaLabel: 'GNO',
      courseworkLabel: 'Dersler',
      coursework: ['Veri Yapıları', 'Algoritmalar', 'Siber Güvenlik', 'Veritabanı Yönetimi', 'Makine Öğrenmesi'],
      certsTitle: 'Sertifikalar',
      certs: [
        { title: 'Yapay Zekâ Eğitimi', issuer: 'Samsung Innovation Campus', year: '2025' },
        { title: 'Veri Analizi Okulu', issuer: 'Yükseköğretim Kurulu (YÖK)' },
        { title: 'Veri Bilimi Profesyonel Sertifikası & Üretken Yapay Zekâ', issuer: 'IBM' }
      ]
    },
    contact: {
      label: 'İletişim',
      line1: 'Birlikte yol alan',
      line2: 'bir şey kuralım.',
      body: 'Mühendislik pozisyonlarına, iş birliklerine ve ilginç optimizasyon problemlerine açığım. Gelen kutum her zaman açık.'
    },
    footer: {
      built: 'Yunus Emre Kahraman tarafından tasarlandı ve geliştirildi.',
      hint: 'Komut paletini açmak için <kbd class="kbd-key"></kbd> tuşlarına basın'
    }
  }
};
