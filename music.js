// Music Recommendations: album grid loaded from albums.csv, sorted by average cover color.
(function () {
  const grid = document.getElementById('musicGrid');
  const slider = document.getElementById('gridSize');
  const sizeLabel = document.getElementById('gridSizeValue');
  const popup = document.getElementById('albumPopup');
  let albums = [];

  // Minimal CSV parser that handles quoted fields ("Black Country, New Road").
  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field.trim()); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field.trim()); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field || row.length) { row.push(field.trim()); rows.push(row); }
    const headers = rows.shift();
    return rows.filter(r => r[0]).map(r => {
      const o = {};
      headers.forEach((h, i) => { if (h) o[h] = r[i] || ''; });
      return o;
    });
  }

  function averageColor(img) {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 16; // downsample; plenty for an average
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 16, 16);
      const d = ctx.getImageData(0, 0, 16, 16).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      return { r: r / n, g: g / n, b: b / n };
    } catch (e) {
      return { r: 128, g: 128, b: 128 };
    }
  }

  function loadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function showPopup(a) {
    document.getElementById('albumPopupImage').src = a.image;
    document.getElementById('albumPopupImage').alt = a.title;
    document.getElementById('albumPopupTitle').textContent = a.artist + ' — ' + a.title;
    document.getElementById('albumPopupDesc').textContent = a.description;
    popup.showModal();
  }

  function render(size) {
    grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    sizeLabel.textContent = `${size} × ${size}`;
    const total = size * size;

    let picked = albums;
    if (albums.length > total) {
      picked = albums.slice().sort(() => Math.random() - 0.5).slice(0, total);
    }
    // Sort by green, then red, then blue to form a rough color gradient.
    picked = picked.slice().sort((a, b) =>
      (a.color.g - b.color.g) || (a.color.r - b.color.r) || (a.color.b - b.color.b));

    grid.replaceChildren();
    for (const a of picked) {
      const btn = document.createElement('button');
      btn.className = 'album-item';
      btn.setAttribute('aria-label', a.artist + ' — ' + a.title);
      const img = document.createElement('img');
      img.src = a.image;
      img.alt = '';
      img.loading = 'lazy';
      const overlay = document.createElement('div');
      overlay.className = 'album-overlay';
      const t = document.createElement('b');
      t.textContent = a.artist + ' — ' + a.title;
      overlay.append(t);
      if (a.description) {
        const s = document.createElement('small');
        s.textContent = a.description;
        overlay.append(s);
      }
      btn.append(img, overlay);
      btn.addEventListener('click', () => showPopup(a));
      grid.append(btn);
    }
    for (let i = picked.length; i < total; i++) {
      const e = document.createElement('div');
      e.className = 'empty-cell';
      grid.append(e);
    }
  }

  async function init() {
    try {
      const res = await fetch('albums.csv');
      albums = parseCSV(await res.text()).map(a => ({
        image: a.image.startsWith('images/') ? a.image : `images/albums/${a.image}`,
        title: a.title,
        artist: a.artist,
        description: a.description,
      }));
    } catch (e) {
      console.error('Could not load albums.csv', e);
      return;
    }
    await Promise.all(albums.map(async a => {
      const img = await loadImage(a.image);
      a.color = img ? averageColor(img) : { r: 128, g: 128, b: 128 };
    }));
    // Smaller default grid on phones so covers stay tappable.
    if (window.innerWidth < 600) slider.value = 4;
    render(+slider.value);
  }

  slider.addEventListener('input', () => render(+slider.value));
  popup.querySelector('.close').addEventListener('click', () => popup.close());
  popup.addEventListener('click', e => { if (e.target === popup) popup.close(); });

  init();
})();
