let allPlaces = [];
let places = [];
let target, ref1, ref2;

let seedFromURL;
let dayFromURL;
let today;

let guessedPlaces = [];
let gameOver = false;

const CHEAT_HASH = "b9077f501b57796cc74b10b223dc7a7c22d24737a27e4414aac90477c0e481c0";

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function tryCheat(revealedInput) {
  return sha256Hex(revealedInput.trim()).then(hash => hash === CHEAT_HASH);
}

// Calculates the distance between two points using the Haversine formula
const calcDistanceInKm = (a, b) => {
	if (a === b) return 0;
    const toRad = deg => deg * Math.PI / 180;
    const earthRadius = 6371;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const latA = toRad(a.latitude);
    const latB = toRad(b.latitude);
    const aVal = Math.sin(dLat/2)**2 + Math.cos(latA)*Math.cos(latB)*Math.sin(dLon/2)**2;
    return 2 * earthRadius * Math.asin(Math.sqrt(aVal));
  };

const formatDistance = (distance, decimalPlaces) => {
	if (distance < 1) return `${Math.round(distance * 1000)} m`;
    faktor = Math.pow(10, decimalPlaces)
    return `${Math.round((distance + Number.EPSILON) * faktor) / faktor} km`;
};

function calcAngleBetweenThreePoints(a, x, b) {
  // Convert to Cartesian coordinates (approximate)
  const ax = [a.longitude - x.longitude, a.latitude - x.latitude];
  const bx = [b.longitude - x.longitude, b.latitude - x.latitude];

  // Dot product and magnitudes
  const dot = ax[0] * bx[0] + ax[1] * bx[1];
  const magA = Math.hypot(ax[0], ax[1]);
  const magB = Math.hypot(bx[0], bx[1]);

  if (magA === 0 || magB === 0) return 0; // No defined angle

  const cosAngle = dot / (magA * magB);
  let angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))); // In radians

  return angle * 180 / Math.PI; // In degrees
}

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getSeedFromDate() {
  const d = dayFromURL ? new Date(dayFromURL) : new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function getSeedFromURL() {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get("game");
  const ret = parseInt(seedParam, 10);
  return isNaN(ret) ? null : ret;
}

function getDayFromURL() {
  const params = new URLSearchParams(window.location.search);
  const day = params.get("day");
  const date = new Date(day);
  return (day && !isNaN(date)) ? day : null;
}

function getNextRandSelectable(rand) {
	var ret = allPlaces[Math.floor(rand() * allPlaces.length)];
	while (ret.selectable == false) ret = allPlaces[Math.floor(rand() * allPlaces.length)];
	return ret;
}

function startGame() {
  document.getElementById("share-button").style.display = "none";
  if (gameMapInstance) {
    gameMapInstance.remove();
    gameMapInstance = null;
  }
  const subheading = document.getElementById("subheading");

  seedFromURL = getSeedFromURL();
  dayFromURL = getDayFromURL();
  today = new Date().toLocaleDateString("sv-SE").split("T")[0];

  // If params are invalid use Tagesrätsel as fallback and remove URL params
  if (dayFromURL == null && seedFromURL == null && window.location.search.length > 0)
  	window.location.href = window.location.pathname

  if (dayFromURL !== null && dayFromURL >= today) {
    dayFromURL = null;
  }

  let seed;

  // Random puzzle
  if (seedFromURL !== null) {
    seed = seedFromURL;
    subheading.textContent = `Zufallsrätsel (Nr: ${seed})`;

  // Daily puzzle
  } else {
    const d = dayFromURL ? new Date(dayFromURL) : new Date();
    const dateStr = d.toLocaleDateString("de-DE");
    seed = getSeedFromDate();
    seed = Math.floor(seededRandom(seed) * 10000);
    subheading.textContent = `Tagesrätsel vom ${dateStr}`;
  }

  // Select archive date in dropdown if available
  const archiveDropdown = document.getElementById("archive-date");
  if (dayFromURL && [...archiveDropdown.options].some(opt => opt.value === dayFromURL)) {
    archiveDropdown.value = dayFromURL;
  } else {
    archiveDropdown.selectedIndex = 0;
  }

  const rand = (() => {
    let i = 0;
    return () => {
      return seededRandom(seed + i++)
    };
  })();

  target = getNextRandSelectable(rand);
  ref1 = getNextRandSelectable(rand);
  ref2 = getNextRandSelectable(rand);

  var retryCounter = 0; // To be safe, if no suitable places can be found under the given conditions
  while (
    ref1 === target ||
    ref2 === target ||
    ref1 === ref2 ||
    (retryCounter <= 300 &&
      (
        calcDistanceInKm(ref1, target) <= 10 ||
        calcDistanceInKm(ref2, target) <= 10 ||
        calcAngleBetweenThreePoints(ref1, target, ref2) <= 20
      )
    )
  ) {
    ref1 = getNextRandSelectable(rand);
    ref2 = getNextRandSelectable(rand);
    retryCounter++;
  }

  guessedPlaces = [];
  gameOver = false;

  // Check for today's cookie if playing today's game
  if (seedFromURL == null && dayFromURL == null) {
    const cookie = getCookie("geoguesser_" + today + "_" + window.DATA_FILE.split('/').pop());
    if (cookie) {
      try {
        const obj = JSON.parse(cookie);
        if (obj && obj.date === today && Array.isArray(obj.guessedPlaces)) {
          guessedPlaces = obj.guessedPlaces.map(name =>
            places.find(p => p.name === name && p.hidden !== true)
          ).filter(Boolean);
          gameOver = true;
        }
      } catch(e) {}
    }
  }

  if (!gameOver) {
    document.getElementById("guess").style.display = "inline";
    document.getElementById("guess-button").style.display = "inline";
    document.getElementById("feedback").textContent = "";
  }
  drawMap();
}

const NS = "http://www.w3.org/2000/svg";
const MAP_SIZE = 500;
const MAP_CENTER = [250, 250];
const LABEL_FONT_SIZE = 12;
const LABEL_LINE_HEIGHT = 14;
const LABEL_CHAR_WIDTH = 7;
const LABEL_PADDING = 6;
const LABEL_GAP = 4;

function createEl(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function boxesOverlap(a, b) {
  return a.left < b.left + b.width && a.left + a.width > b.left &&
    a.top < b.top + b.height && a.top + a.height > b.top;
}

function lineSegmentIntersectsRect(x1, y1, x2, y2, left, top, width, height) {
  const pad = 3;
  const L = left - pad, R = left + width + pad, T = top - pad, B = top + height + pad;
  const segs = [
    [L, T, R, T], [R, T, R, B], [R, B, L, B], [L, B, L, T]
  ];
  for (const [ax, ay, bx, by] of segs) {
    const den = (bx - ax) * (y2 - y1) - (by - ay) * (x2 - x1);
    if (Math.abs(den) < 1e-10) continue;
    const t = ((ax - x1) * (by - ay) - (ay - y1) * (bx - ax)) / den;
    const u = ((x1 - ax) * (y2 - y1) - (y1 - ay) * (x2 - x1)) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  if (x1 >= L && x1 <= R && y1 >= T && y1 <= B) return true;
  if (x2 >= L && x2 <= R && y2 >= T && y2 <= B) return true;
  return false;
}

function placeLabelNoOverlap(pointX, pointY, width, height, used, viewW, viewH, lineSegments) {
  const pad = 8;
  const tries = [
    { x: pointX + 12, y: pointY - height - 4 },
    { x: pointX - width - 12, y: pointY - height - 4 },
    { x: pointX + 12, y: pointY + 8 },
    { x: pointX - width - 12, y: pointY + 8 },
    { x: pointX - width - 12, y: pointY - height / 2 },
    { x: pointX + 12, y: pointY - height / 2 },
    { x: pointX - width / 2, y: pointY - height - 16 },
    { x: pointX - width / 2, y: pointY + 16 }
  ];
  const segments = lineSegments || [];
  const firstTry = tries[0];
  for (let i = 0; i < tries.length; i++) {
    const pos = tries[i];
    const box = { left: pos.x, top: pos.y, width, height };
    const hitsLine = segments.some(s => lineSegmentIntersectsRect(s.x1, s.y1, s.x2, s.y2, pos.x, pos.y, width, height));
    if (pos.x >= -pad && pos.x + width <= viewW + pad && pos.y >= -pad && pos.y + height <= viewH + pad &&
      !used.some(u => boxesOverlap(box, u)) && !hitsLine) {
      used.push(box);
      return { ...pos, useLeader: i > 0 };
    }
  }
  const fallbackY = pointY - height;
  const box = { left: pointX + 10, top: fallbackY, width, height };
  used.push(box);
  return { x: pointX + 10, y: fallbackY, useLeader: false };
}

let gameMapInstance = null;

function drawMap() {
  const wrapper = document.getElementById("game-map-wrapper");
  const svg = document.getElementById("map");
  const overlayText = document.getElementById("map-overlay-text");
  if (!svg || svg.tagName !== "svg") return;

  const placesToBeDrawn = [ref1, ref2, ...guessedPlaces];
  if (gameOver) placesToBeDrawn.push(target);

  const gameMapEl = wrapper ? document.getElementById("game-map") : null;
  const useMapUnderlay = typeof L !== "undefined" && wrapper && gameMapEl && gameOver;
  if (gameMapEl) gameMapEl.style.display = gameOver ? "block" : "none";

  let points = [];
  let w = MAP_SIZE;
  let h = MAP_SIZE;

  if (useMapUnderlay) {
    const allForBounds = [target, ref1, ref2, ...guessedPlaces];
    const bounds = L.latLngBounds(allForBounds.map(p => [p.latitude, p.longitude])).pad(0.15);
    gameMapInstance = L.map("game-map", {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false
    }).fitBounds(bounds);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      opacity: 0.7
    }).addTo(gameMapInstance);
    gameMapInstance.invalidateSize();
    w = gameMapEl.offsetWidth || MAP_SIZE;
    h = gameMapEl.offsetHeight || MAP_SIZE;
    points = placesToBeDrawn.map(p => ({
      place: p,
      x: gameMapInstance.latLngToContainerPoint([p.latitude, p.longitude]).x,
      y: gameMapInstance.latLngToContainerPoint([p.latitude, p.longitude]).y,
      dist: calcDistanceInKm(target, p)
    }));
  } else {
    const offsetsFromTarget = placesToBeDrawn.map(p => ({
      place: p,
      dx: (p.longitude - target.longitude) * 85,
      dy: (p.latitude - target.latitude) * 111,
      dist: calcDistanceInKm(target, p)
    }));
    const maxDist = Math.max(...offsetsFromTarget.map(v => Math.hypot(v.dx, v.dy)));
    const scale = 200 / (maxDist || 1);
    points = offsetsFromTarget.map(v => ({
      place: v.place,
      x: MAP_CENTER[0] + v.dx * scale,
      y: MAP_CENTER[1] - v.dy * scale,
      dist: v.dist
    }));
  }

  let targetPx, targetPy;
  if (useMapUnderlay && gameMapInstance) {
    const tp = gameMapInstance.latLngToContainerPoint([target.latitude, target.longitude]);
    targetPx = tp.x;
    targetPy = tp.y;
  } else {
    targetPx = MAP_CENTER[0];
    targetPy = MAP_CENTER[1];
  }

  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

  const getColor = (place) => {
    if (place.name === ref1.name) return "blue";
    if (place.name === ref2.name) return "green";
    if (place.name === target.name && gameOver) return "red";
    return "orange";
  };

  const lineSegments = points
    .filter(p => p.place.name !== target.name)
    .map(p => ({ x1: targetPx, y1: targetPy, x2: p.x, y2: p.y }));

  const DIST_LABEL_W = 58;
  const DIST_LABEL_H = 18;

  function placeDistanceLabel(mx, my, lineSegs, used) {
    const defaultX = mx + 5;
    const defaultY = my - 5;
    const box = { left: defaultX, top: defaultY - 14, width: DIST_LABEL_W, height: DIST_LABEL_H };
    const hitsLine = lineSegs.some(s => lineSegmentIntersectsRect(s.x1, s.y1, s.x2, s.y2, box.left, box.top, box.width, box.height));
    const hitsOther = used.some(u => boxesOverlap(box, u));
    if (!hitsLine && !hitsOther) {
      used.push(box);
      return { x: defaultX, y: defaultY, moved: false };
    }
    const tries = [
      [mx + 8, my - 18], [mx - DIST_LABEL_W - 5, my - 18], [mx + 8, my + 6], [mx - DIST_LABEL_W - 5, my + 6],
      [mx - DIST_LABEL_W / 2, my - 22], [mx - DIST_LABEL_W / 2, my + 8]
    ];
    for (const [xx, yy] of tries) {
      const b = { left: xx, top: yy - 14, width: DIST_LABEL_W, height: DIST_LABEL_H };
      const hitL = lineSegs.some(s => lineSegmentIntersectsRect(s.x1, s.y1, s.x2, s.y2, b.left, b.top, b.width, b.height));
      const hitU = used.some(u => boxesOverlap(b, u));
      if (!hitL && !hitU) {
        used.push(b);
        return { x: xx, y: yy, moved: true };
      }
    }
    used.push(box);
    return { x: defaultX, y: defaultY, moved: false };
  }

  const distLabelUsed = [];
  const distLabelData = [];
  points.forEach((p) => {
    if (p.place.name === target.name) return;
    const mx = (p.x + targetPx) / 2;
    const my = (p.y + targetPy) / 2;
    const pos = placeDistanceLabel(mx, my, lineSegments, distLabelUsed);
    distLabelData.push({ p, mx, my, pos, text: formatDistance(p.dist, 1) });
  });

  const labelUsed = distLabelUsed.slice();
  const labelData = [];
  points.forEach((p) => {
    const nameLines = p.place.name.split("/").map(s => s.trim());
    const lineLen = Math.max(...nameLines.map(s => s.length), 1);
    const lw = lineLen * LABEL_CHAR_WIDTH + LABEL_PADDING * 2;
    const lh = nameLines.length * LABEL_LINE_HEIGHT + LABEL_PADDING * 2;
    const pos = placeLabelNoOverlap(p.x, p.y, lw, lh, labelUsed, w, h, lineSegments);
    labelData.push({ p, pos, nameLines, lw, lh });
  });

  const pointsWithoutTarget = points.filter(p => p.place.name !== target.name);
  lineSegments.forEach((seg, i) => {
    const line = createEl("line", {
      x1: String(seg.x1),
      y1: String(seg.y1),
      x2: String(seg.x2),
      y2: String(seg.y2),
      stroke: getColor(pointsWithoutTarget[i].place),
      "stroke-width": "2"
    });
    svg.appendChild(line);
  });

  // Distance labels (animate only when moved)
  distLabelData.forEach(({ mx, my, pos, text }) => {
    if (pos.moved) {
      const g = createEl("g", {
        transform: `translate(${mx},${my})`,
        style: "transition: transform 0.3s ease-out;"
      });
      const t = createEl("text", {
        x: "0",
        y: "0",
        "font-size": "12",
        "font-family": "sans-serif",
        "font-weight": "bold",
        fill: "black"
      });
      t.textContent = text;
      g.appendChild(t);
      svg.appendChild(g);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => g.setAttribute("transform", `translate(${pos.x},${pos.y})`));
      });
    } else {
      const t = createEl("text", {
        x: String(pos.x),
        y: String(pos.y),
        "font-size": "12",
        "font-family": "sans-serif",
        "font-weight": "bold",
        fill: "black"
      });
      t.textContent = text;
      svg.appendChild(t);
    }
  });

  // Circles
  points.forEach((p) => {
    const circle = createEl("circle", {
      cx: String(p.x),
      cy: String(p.y),
      r: "6",
      fill: getColor(p.place),
      stroke: "#333",
      "stroke-width": "1"
    });
    svg.appendChild(circle);
  });

  // Place labels (animate only when useLeader)
  labelData.forEach(({ p, pos, nameLines, lw, lh }) => {
    const tx = pos.x + LABEL_PADDING;
    const ty = pos.y + LABEL_PADDING + LABEL_LINE_HEIGHT - 2;

    if (pos.useLeader) {
      const cx = pos.x + lw / 2;
      const cy = pos.y + lh / 2;
      const candidates = [
        [pos.x, cy],
        [pos.x + lw, cy],
        [cx, pos.y],
        [cx, pos.y + lh]
      ];
      let best = candidates[0];
      let bestD = Math.hypot(p.x - best[0], p.y - best[1]);
      for (const c of candidates) {
        const d = Math.hypot(p.x - c[0], p.y - c[1]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      const leader = createEl("line", {
        x1: String(p.x),
        y1: String(p.y),
        x2: String(best[0]),
        y2: String(best[1]),
        stroke: "black",
        "stroke-width": "1",
        "stroke-dasharray": "4,3"
      });
      svg.appendChild(leader);
    }

    const g = createEl("g");
    if (pos.useLeader) {
      g.setAttribute("transform", `translate(${p.x},${p.y})`);
      g.setAttribute("style", "transition: transform 0.35s ease-out;");
      nameLines.forEach((line, idx) => {
        const t = createEl("text", {
          x: String(tx - pos.x),
          y: String(ty - pos.y + idx * LABEL_LINE_HEIGHT),
          "font-size": String(LABEL_FONT_SIZE),
          "font-family": "sans-serif",
          "font-weight": "bold",
          fill: "black"
        });
        t.textContent = line;
        g.appendChild(t);
      });
      svg.appendChild(g);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => g.setAttribute("transform", `translate(${pos.x},${pos.y})`));
      });
    } else {
      g.setAttribute("transform", `translate(${pos.x},${pos.y})`);
      nameLines.forEach((line, idx) => {
        const t = createEl("text", {
          x: String(LABEL_PADDING),
          y: String(LABEL_PADDING + LABEL_LINE_HEIGHT - 2 + idx * LABEL_LINE_HEIGHT),
          "font-size": String(LABEL_FONT_SIZE),
          "font-family": "sans-serif",
          "font-weight": "bold",
          fill: "black"
        });
        t.textContent = line;
        g.appendChild(t);
      });
      svg.appendChild(g);
    }
  });

  // Hint and game-over text in overlay div (readable on map)
  if (overlayText) {
    overlayText.innerHTML = "";
    if (guessedPlaces.length >= 2 && !gameOver && "SUGG2_STR" in window && window.SUGG2_STR != null) {
      overlayText.textContent = window.SUGG2_STR.replace("{}", target.population != null ? target.population.toLocaleString() : String(target.elevation || ""));
      overlayText.style.display = "block";
    } else if (gameOver) {
      const hasWon = guessedPlaces.length && target.name === guessedPlaces[guessedPlaces.length - 1].name;
      overlayText.innerHTML = hasWon
        ? `🎉 Richtig in ${guessedPlaces.length} Versuch${guessedPlaces.length === 1 ? "" : "en"}!`
        : `❌ Game Over! Gesucht war: ${target.name}`;
      overlayText.style.color = hasWon ? "green" : "red";
      overlayText.style.fontWeight = "bold";
      overlayText.style.fontSize = "1.1rem";
      overlayText.style.display = "block";
      document.getElementById("guess").style.display = "none";
      document.getElementById("guess-button").style.display = "none";
      document.getElementById("share-button").style.display = "inline";
    } else {
      overlayText.style.display = "none";
    }
  }
}

async function guess() {
  if (gameOver) return;

  let userInput = document.getElementById("guess").value.trim().toLowerCase();
  document.getElementById("guess").value = "";
  
  if (await tryCheat(userInput)) {
    userInput = target.name.toLowerCase();
  }

  if (!userInput) return;

  // Search place
  const guessedPlace = places.find(p =>
    p.name.toLowerCase() === userInput ||
    p.alternatives.some(alt => alt.toLowerCase() === userInput)
  );

  if (!guessedPlace) {
      if ('NOTFOUND_STR' in window && window.NOTFOUND_STR !== null)
          document.getElementById("feedback").textContent = window.NOTFOUND_STR;
      else
          document.getElementById("feedback").textContent = "Ort nicht gefunden.";
    return;
  }

  // Already guessed?
  if (guessedPlaces.some(o => o.name === guessedPlace.name)) {
      if ('ALREADYGUESSED_STR' in window && window.ALREADYGUESSED_STR !== null)
          document.getElementById("feedback").textContent = window.ALREADYGUESSED_STR;
      else
        document.getElementById("feedback").textContent = "Diesen Ort hast du schon geraten.";
    return;
  }

  guessedPlaces.push(guessedPlace);

  // Guessed correctly?
  if (guessedPlace.name === target.name) {
    document.getElementById("feedback").textContent = `🎉 Richtig! Der Ort war ${target.name}.`;
    gameOver = true;
    // Set cookie for today's game
    if (seedFromURL == null && dayFromURL == null) {
      setCookie("geoguesser_" + today + "_" + window.DATA_FILE.split('/').pop(), JSON.stringify({
        date: today,
        guessedPlaces: guessedPlaces.map(p => p.name)
      }), 2);
    }
    drawMap();
    return;
  }

  document.getElementById("feedback").textContent = `${guessedPlace.name} ist falsch (${formatDistance(calcDistanceInKm(guessedPlace,target),1)}).`;
  if (guessedPlaces.length >= 6) {
    gameOver = true;
    // Set cookie for today's game
    if (seedFromURL == null && dayFromURL == null) {
      setCookie("geoguesser_" + today + "_" + window.DATA_FILE.split('/').pop(), JSON.stringify({
        date: today,
        guessedPlaces: guessedPlaces.map(p => p.name)
      }), 2);
    }
  }

  drawMap();
}

document.getElementById("guess").addEventListener("keydown", function (e) {
  const autosuggestList = document.getElementById("autosuggest-list");
  if (e.key === "Enter" && autosuggestList.children.length <= 1) {
    // Only guess if 0 or 1 suggestions are displayed
    guess();
  }
});

document.getElementById("daily-mode").addEventListener("click", () => {
  // Here we make the site refresh, to make sure everyone has the latest database version
  window.location.href = `${window.location.pathname}`;
});

document.getElementById("random-mode").addEventListener("click", () => {
  let gameId = Math.floor(Math.random() * 1000000);
  if (history.pushState) {
    var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?game=${gameId}`;
    window.history.pushState({path:newurl},'',newurl);
    startGame();
  } else {
    window.location.href = `${window.location.pathname}?game=${gameId}`;
  }
});

document.getElementById("archive-date").addEventListener("change", (e) => {
  const val = e.target.value;
  if (val) {
	  if (history.pushState) {
		var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?day=${val}`;
		window.history.pushState({path:newurl},'',newurl);
		startGame();
	  } else {
		window.location.href = `${window.location.pathname}?day=${val}`;
	  }
  }
});

document.getElementById("share-button").addEventListener("click", () => {
  if (!navigator.share) {
    alert("Teilen wird auf diesem Gerät nicht unterstützt.");
    return;
  }

  const rows = guessedPlaces.map((p, i) => {
    const d = calcDistanceInKm(target, p);
    let dist;
    if (d==0) {
      dist = "📍";
    } else {
      dist = formatDistance(d,0);
    }
    return `Versuch ${i + 1}: ${dist}`;
  });

  const d = dayFromURL ? new Date(dayFromURL) : new Date();
  const dateStr = d.toLocaleDateString("de-DE");
  const game_name = 'SHARE_NAME_STR' in window && window.SHARE_NAME_STR !== null ? `${window.SHARE_NAME_STR}-` : "";
  const identifier = seedFromURL !== null ? `Nr. ${seedFromURL}` : `vom ${dateStr}`;
  const url = window.location.href;
  const text = `🌍 ${game_name}Raten ${identifier}\n` + rows.join("\n") + `\n-\n${url}`;
  navigator.share({
    text: text
  });
});

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days*24*60*60*1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}`;
}

function getCookie(name) {
  const cookies = document.cookie.split(';').map(c => c.trim());
  for (const c of cookies) {
    if (c.startsWith(name + '=')) {
      return decodeURIComponent(c.substring(name.length + 1));
    }
  }
  return null;
}

fetch(window.DATA_FILE)
  .then(res => res.json())
  .then(data => {
    allPlaces = data;
    places = allPlaces.filter(o => !('hidden' in o) || o.hidden === false);
    const select = document.getElementById("archive-date");
	var startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    for (let d = new Date(startDate); d <= yesterday; d.setDate(d.getDate() + 1)) {
      const iso = d.toLocaleDateString("sv-SE").split("T")[0];
      const option = document.createElement("option");
      option.value = iso;
      option.textContent = iso.split("-").reverse().join(".");
      select.appendChild(option);
    }
    startGame();
  });