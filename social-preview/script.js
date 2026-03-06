(() => {
  try {
    console.log('Social preview script loaded');
  let lang = 'EN';
  const btn = document.getElementById('langToggle');
  const setLang = (L) => {
    lang = L;
    btn.textContent = (lang === 'EN') ? 'ES' : 'EN';
    document.querySelectorAll('[data-en][data-es]').forEach(el => {
      const txt = (lang === 'EN') ? el.getAttribute('data-en') : el.getAttribute('data-es');
      // Write directly to the element (works for span.cap)
      el.textContent = txt;
    });
  };
  if (btn) {
    btn.addEventListener('click', () => setLang(lang === 'EN' ? 'ES' : 'EN'));
  }
  // Initialize captions
  setLang('EN');

  // Touch support: tap to toggle overlay (skip slider tiles)
  document.querySelectorAll('.tile').forEach(tile => {
    tile.addEventListener('click', (e) => {
      if (e.target.closest('a,button')) return;
      if (tile.classList.contains('slider')) return; // slider tiles have separate click behavior
      tile.classList.toggle('show');
    });
  });
  // Before/After slider logic: adjust width based on range value
  document.querySelectorAll('.tile.slider .ba').forEach(ba => {
    const before = ba.querySelector('.before');
    const range = ba.querySelector('input[type=range]');
    const update = () => {
      const v = Number(range.value); // 0..100
      // Invert: slider left (0) = before, slider right (100) = after
      before.style.width = (100 - v) + '%';
      console.log('Slider value:', v, 'before width:', before.style.width);
    };
    range.addEventListener('input', update); // Reverting to 'input' for real-time feedback
    update(); // Initial run
    
    // Click to toggle between before (0) and after (100)
    ba.addEventListener('click', (e) => {
      if (e.target === range) return; // don't interfere with slider drag
      const current = Number(range.value);
      const newValue = current === 0 ? 100 : 0;
      range.value = newValue;
      update();
    });
  });
  
  // --- NEW REEL TEMPLATE LOGIC ---
  const reelTemplates = {
    "Reel: From \"fine\" to favorite clip": {
        placeholder: {
            version: "v3.7.6",
            elements: [
                { type: "Before", time: "0:00-0:02", text: "BEFORE: Uninspired" },
                { type: "Transition", time: "0:02-0:04", text: "" },
                { type: "Montage", time: "0:04-0:07", text: "The Glow-Up: Adding Layered Light & Texture" },
                { type: "After", time: "0:07-0:10", text: "AFTER: Timeless Elegance" },
                { type: "CTA", time: "0:10-End", text: "Schedule your 2-Hour Spark today! ($199)" }
            ]
        },
        realistic: {
            version: "v3.7.6",
            elements: [
                { type: "Before", time: "0:00-0:02", text: "BEFORE: Uninspired" },
                { type: "Transition", time: "0:02-0:04", text: "" },
                { type: "Montage", time: "0:04-0:07", text: "The Glow-Up: Adding Layered Light & Texture" },
                { type: "After", time: "0:07-0:10", text: "AFTER: Timeless Elegance" },
                { type: "CTA", time: "0:10-End", text: "Schedule your 2-Hour Spark today! ($199)" }
            ]
        }
    },
    "Reel: From \"fine\" to favorite item": {
        placeholder: {
            version: "v3.7.6",
            elements: [
                { type: "Before", time: "0:00-0:02", text: "BEFORE: Clutter" },
                { type: "Transition", time: "0:02-0:05", text: "Finding the Perfect Piece" },
                { type: "After", time: "0:05-End", text: "AFTER: Curated Gem. $100/hr billing applies." }
            ]
        },
        realistic: {
            version: "v3.7.6",
            elements: [
                { type: "Before", time: "0:00-0:02", text: "BEFORE: Clutter" },
                { type: "Transition", time: "0:02-0:05", text: "Finding the Perfect Piece" },
                { type: "After", time: "0:05-End", text: "AFTER: Curated Gem. $100/hr billing applies." }
            ]
        }
    }
  };

  // Determine which reel plan to display notes for
  const reelSection = document.querySelector('.reel-notes');
  if (reelSection) {
    let reelKey = "Reel: From \"fine\" to favorite clip"; // Default for placeholder site
    
    // Check if we are on the 'real.html' page or the placeholder page
    if (window.location.href.includes('real.html')) {
      reelKey = "Reel: From \"fine\" to favorite item"; // Use the other reel plan for the realistic site mock
    }
    
    const currentTemplate = reelTemplates[reelKey];
    const notesList = reelSection.querySelector('ul');
    const titleH3 = reelSection.querySelector('h3');
    
    if (currentTemplate && notesList && titleH3) {
        titleH3.textContent = `${reelKey} (${currentTemplate.placeholder.version})`;
        notesList.innerHTML = ''; // Clear default notes

        const dataToUse = window.location.href.includes('real.html') ? currentTemplate.realistic : currentTemplate.placeholder;

        dataToUse.elements.forEach(el => {
            const li = document.createElement('li');
            if (el.type === 'CTA') {
                li.innerHTML = `<strong>CTA:</strong> ${el.text}`;
            } else if (el.type === 'Transition') {
                li.innerHTML = `<strong>Transition:</strong> ${el.text || '(Quick transition)'}`;
            }
             else {
                li.textContent = `${el.type}: ${el.text}`;
            }
            notesList.appendChild(li);
        });
    }
  }
  // --- END NEW REEL TEMPLATE LOGIC ---
} catch (err) {
  console.error('Social preview error:', err);
}
})();