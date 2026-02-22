// ─── Mobile menu toggle ────────────────────────────────────────────────────────
function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    navLinks.classList.toggle('active');
}

// ─── Scroll animations ─────────────────────────────────────────────────────────
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ─── Smooth scroll ─────────────────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
});

// ─── Blog Data ─────────────────────────────────────────────────────────────────
// Para agregar o editar noticias, modifica el array "noticias" directamente.
// Campos de cada noticia:
//   id           (number)       - identificador único
//   titulo       (string)       - título de la noticia
//   extracto     (string)       - resumen corto
//   imagen       (string)       - emoji o URL de imagen
//   tipo         (string)       - "Noticia" | "Clase" | "Concurso" | "Evento" | ...
//   destacada    (bool)         - true para mostrarla en el carrusel superior
//   fecha_inicio (string)       - "YYYY-MM-DD"
//   fecha_fin    (string|null)  - "YYYY-MM-DD" o null si no tiene fecha de fin

let BLOG_DATA;

async function fetchBlogData(){
    try{
        const res = await fetch("blog.json");
        BLOG_DATA = await res.json()
    }catch(err){
        console.error(err)
    }
}

// ─── Helpers de fecha ──────────────────────────────────────────────────────────

function formatDate(iso) {
    if (!iso) return null;
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const [year, month, day] = iso.split('-');
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

function buildDateLabel(noticia) {
    const inicio = formatDate(noticia.fecha_inicio);
    const fin    = formatDate(noticia.fecha_fin);
    if (!fin)           return `Desde ${inicio}`;
    if (inicio === fin) return inicio;
    const [yi, mi, di] = noticia.fecha_inicio.split('-');
    const [yf, mf, df] = noticia.fecha_fin.split('-');
    if (mi === mf && yi === yf) {
        const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        return `${parseInt(di)} – ${parseInt(df)} ${months[parseInt(mi)-1]} ${yi}`;
    }
    return `${inicio} – ${fin}`;
}

// ─── Blog Renderer ─────────────────────────────────────────────────────────────

const TIPO_COLORS = {
    'Noticia':  { bg: 'var(--primary)',   text: '#0a0a0a' },
    'Clase':    { bg: '#00c896',          text: '#0a0a0a' },
    'Concurso': { bg: '#ffd700',          text: '#0a0a0a' },
    'Evento':   { bg: 'var(--secondary)', text: '#ffffff' },
    'default':  { bg: 'var(--accent)',    text: '#0a0a0a' }
};

function renderCard(noticia) {
    if(noticia.imagen == null) noticia.imagen = "./resources/page/noImage.png"
    const color   = TIPO_COLORS[noticia.tipo] || TIPO_COLORS['default'];
    const dateStr = buildDateLabel(noticia);
    const badge   = noticia.destacada
        ? `<span class="blog-badge-destacada">⭐ Destacada</span>`
        : '';
    return `
        <div class="blog-card${noticia.destacada ? ' blog-card--destacada' : ''}">
            <div class="blog-image">
                <img src=${noticia.imagen}>
            </div>
            <div class="blog-content">
                <div class="blog-meta">
                    <span class="blog-tipo" style="background:${color.bg}; color:${color.text};">${noticia.tipo}</span>
                    ${badge}
                </div>
                <div class="blog-date">${dateStr}</div>
                <h3 class="blog-title">${noticia.titulo}</h3>
                <p class="blog-excerpt">${noticia.extracto}</p>
            </div>
        </div>
    `;
}

function renderFilters(noticias, activeFilter, onFilter) {
    const filtersEl = document.getElementById('blogFilters');
    const tipos     = ['Todos', ...new Set(noticias.map(n => n.tipo))];
    filtersEl.innerHTML = tipos.map(tipo => `
        <button class="blog-filter-btn${activeFilter === tipo ? ' active' : ''}" data-tipo="${tipo}">${tipo}</button>
    `).join('');
    filtersEl.querySelectorAll('.blog-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => onFilter(btn.dataset.tipo));
    });
}

function renderBlog(noticias, filter = 'Todos') {
    const grid = document.getElementById('blogGrid');
    const filtered = filter === 'Todos'
        ? [...noticias]
        : noticias.filter(n => n.tipo === filter);
    filtered.sort((a, b) => (b.destacada ? 1 : 0) - (a.destacada ? 1 : 0));
    if (filtered.length === 0) {
        grid.innerHTML = `<p class="blog-loading">No hay noticias en esta categoría.</p>`;
        return;
    }
    grid.innerHTML = filtered.map(renderCard).join('');
}

// ─── Carrusel de destacadas ────────────────────────────────────────────────────

function initCarousel(noticias) {
    const destacadas = noticias.filter(n => n.destacada);
    if (destacadas.length === 0) return;

    const section    = document.getElementById('carouselSection');
    const track      = document.getElementById('carouselTrack');
    const dotsEl     = document.getElementById('carouselDots');
    const progressEl = document.getElementById('carouselProgress');
    const btnPrev    = document.getElementById('carouselPrev');
    const btnNext    = document.getElementById('carouselNext');

    section.style.display = 'block';

    let current = 0;
    let timer   = null;
    const total = destacadas.length;

    // Render slides
    track.innerHTML = destacadas.map(n => {
        if(n.imagen == null) n.imagen = "./resources/page/noImage.png"
        const color   = TIPO_COLORS[n.tipo] || TIPO_COLORS['default'];
        const dateStr = buildDateLabel(n);
        return `
            <div class="carousel-slide">
                <div class="carousel-slide__image"><img src=${n.imagen}></div>
                <div class="carousel-slide__body">
                    <div class="carousel-slide__meta">
                        <span class="carousel-slide__tipo" style="background:${color.bg}; color:${color.text};">${n.tipo}</span>
                        <span class="carousel-slide__badge">⭐ Destacada</span>
                    </div>
                    <div class="carousel-slide__date">${dateStr}</div>
                    <h2 class="carousel-slide__title">${n.titulo}</h2>
                    <p class="carousel-slide__excerpt">${n.extracto}</p>
                </div>
            </div>
        `;
    }).join('');

    // Render dots
    dotsEl.innerHTML = destacadas.map((_, i) =>
        `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Ir a slide ${i + 1}"></button>`
    ).join('');
    const dots = dotsEl.querySelectorAll('.carousel-dot');

    function goTo(index) {
        current = (index + total) % total;
        track.style.transform = `translateX(-${current * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle('active', i === current));
        // Reiniciar barra de progreso
        progressEl.innerHTML = '';
        const bar = document.createElement('div');
        bar.className = 'carousel-progress-bar';
        progressEl.appendChild(bar);
        restartTimer();
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    btnNext.addEventListener('click', next);
    btnPrev.addEventListener('click', prev);
    dots.forEach(dot => dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index))));

    function restartTimer() {
        clearInterval(timer);
        if (total > 1) timer = setInterval(next, 15000);
    }

    // Swipe táctil
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend',   e => {
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    });

    goTo(0);
}

// ─── Init ──────────────────────────────────────────────────────────────────────

async function loadBlog() {
    await fetchBlogData();
    const noticias = BLOG_DATA.blog.noticias;
    let currentFilter = 'Todos';
    const onFilter = (tipo) => {
        currentFilter = tipo;
        renderFilters(noticias, currentFilter, onFilter);
        renderBlog(noticias, currentFilter);
    };
    renderFilters(noticias, currentFilter, onFilter);
    renderBlog(noticias, currentFilter);
    initCarousel(noticias);
}

document.addEventListener('DOMContentLoaded', loadBlog);
