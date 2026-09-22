// ============================================
// 1. MOBILE MENU TOGGLE
// On small screens the nav links are hidden until
// the hamburger button is clicked.
// ============================================
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

// Close the mobile menu automatically once a link is tapped,
// so the menu doesn't stay open after navigating.
navLinks.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ============================================
// 2. HERO ENTRANCE ANIMATION
// This runs once, right after the page loads — a single
// deliberate reveal rather than every section animating
// in as you scroll (which tends to look repetitive).
// ============================================
window.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.hero');
  // Small delay so the browser has painted the page first
  setTimeout(() => hero.classList.add('in-view'), 100);
});

// ============================================
// 3. ACTIVE NAV LINK ON SCROLL
// As you scroll past each section, its matching nav link
// is highlighted in the accent color. This uses the
// IntersectionObserver API, which watches elements and
// tells us when they enter/leave the visible part of the
// screen — much more efficient than checking scroll
// position manually.
// ============================================
const sections = document.querySelectorAll('main section[id]');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        const matchingLink = document.querySelector(`.nav-link[href="#${id}"]`);

        // Remove "active" from every link, then add it back
        // only to the one matching the section in view.
        document.querySelectorAll('.nav-link').forEach((link) => {
          link.classList.remove('active');
        });

        if (matchingLink) {
          matchingLink.classList.add('active');
        }
      }
    });
  },
  {
    // A section counts as "in view" once it crosses the
    // vertical middle of the screen.
    rootMargin: '-50% 0px -50% 0px',
  }
);

sections.forEach((section) => observer.observe(section));

// ============================================
// 4. SCROLL-IN ANIMATION FOR SECTIONS
// Each section (About, Skills, Projects, Achievements,
// Contact) fades and slides in the first time it enters
// the screen. Uses the same IntersectionObserver approach
// as the active-nav-link logic above, but only needs to
// fire once per section, so we unobserve after it reveals.
// ============================================
const revealObserver = new IntersectionObserver(
  (entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.15,
  }
);

document.querySelectorAll('main .section').forEach((section) => {
  revealObserver.observe(section);
});

// ============================================
// 5. 3D TILT — profile photo + project/achievement cards
// Tracks the mouse over each element and sets --rx / --ry
// (rotation) custom properties, which style.css reads in a
// transform: rotateX/rotateY. Skipped on touch screens (there's
// no hover to track) and for anyone who's asked their OS to
// reduce motion.
// ============================================
function initTilt() {
  const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!supportsHover || reduceMotion) return;

  function attachTilt(el, maxDeg) {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const ry = (px - 0.5) * maxDeg * 2;
      const rx = (0.5 - py) * maxDeg * 2;
      el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    });
    el.addEventListener('mouseleave', () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  }

  const photo = document.getElementById('photoTilt');
  if (photo) attachTilt(photo, 3.5);

  // Achievement cards are roughly square, so a fuller tilt reads well.
  document.querySelectorAll('.achievement-item.tilt-card').forEach((card) => attachTilt(card, 6));
  // Project rows are wide and flat — a smaller angle avoids an odd, skewed look.
  document.querySelectorAll('.project-row.tilt-card').forEach((card) => attachTilt(card, 3));
}

initTilt();

// ============================================
// 6. HERO CONSTELLATION NETWORK (three.js)
// A field of nodes connected to their nearest neighbours,
// drifting slowly and easing toward the mouse position.
// Wrapped in try/catch and a THREE-defined check so that if
// the library fails to load (slow network, ad-blocker), the
// rest of the page — including the tilt effects above — keeps
// working exactly as before; the hero just loses its background.
// ============================================
function initHeroNetwork() {
  const canvas = document.getElementById('heroCanvas');
  const hero = document.getElementById('hero');
  if (!canvas || !hero || typeof THREE === 'undefined') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = hero.clientWidth;
  let height = hero.clientHeight;
  if (!width || !height) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    return; // WebGL unavailable — canvas simply stays empty
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.z = 22;

  const group = new THREE.Group();
  scene.add(group);

  // Fewer nodes on small screens to keep it light on phones.
  const NODE_COUNT = width < 640 ? 32 : 64;
  const nodes = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    nodes.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 12
      )
    );
  }

  // Connect each node to its 2 nearest neighbours, within reach.
  const MAX_DIST = 7.5;
  const linePositions = [];
  for (let i = 0; i < nodes.length; i++) {
    const dists = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      dists.push([nodes[i].distanceTo(nodes[j]), j]);
    }
    dists.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < 2 && k < dists.length; k++) {
      const [d, j] = dists[k];
      if (d < MAX_DIST) {
        linePositions.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
      }
    }
  }

  const accentColor = new THREE.Color(0xa78bfa); // matches --accent in style.css

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.22 });
  group.add(new THREE.LineSegments(lineGeo, lineMat));

  const pointGeo = new THREE.BufferGeometry().setFromPoints(nodes);
  const pointMat = new THREE.PointsMaterial({
    color: accentColor,
    size: 0.35,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });
  group.add(new THREE.Points(pointGeo, pointMat));

  group.rotation.x = 0.15;

  let targetRotX = 0.15;
  let targetRotY = 0;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width - 0.5;
    const my = (e.clientY - rect.top) / rect.height - 0.5;
    targetRotY = mx * 0.5;
    targetRotX = 0.15 - my * 0.3;
  });

  function onResize() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  window.addEventListener('resize', onResize);

  let rafId = null;
  function animate() {
    group.rotation.y += (targetRotY - group.rotation.y) * 0.04;
    group.rotation.x += (targetRotX - group.rotation.x) * 0.04;
    if (!reduceMotion) group.rotation.y += 0.0009; // slow constant drift
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }
  animate();

  // Pause rendering while the hero is scrolled off-screen — saves
  // battery/CPU instead of animating an invisible canvas forever.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (rafId === null) animate();
        } else if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      },
      { threshold: 0 }
    );
    io.observe(hero);
  }
}

try {
  initHeroNetwork();
} catch (e) {
  // The rest of the page (nav, tilt, reveal animations) is unaffected.
}
