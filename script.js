/* =========================
   Chernobyl Explorer v3
   — Multi‑Room Adventure —
   * New features *
   • 4 themed rooms with unique, animated backgrounds
   • Doorways in all four directions (← → ↑ ↓)
   • Fade transition between rooms
   • Parallax skyline on surface rooms
   • Radiation zones that drain HP over time
   • Medkits and keycards as pickups (heal / unlock)
   • Smarter mutant AI (line‑of‑sight pursuit)
   ========================= */

   const canvas = document.getElementById("gameCanvas");
   const ctx    = canvas.getContext("2d");
   const W = canvas.width;
   const H = canvas.height;
   
   /* ---------- UTILITIES ---------- */
   const rand = (min, max) => Math.random() * (max - min) + min;
   function rectIntersect(a, b) {
     return a.x < b.x + (b.w ?? b.size) &&
            a.x + (a.w ?? a.size) > b.x &&
            a.y < b.y + (b.h ?? b.size) &&
            a.y + (a.h ?? a.size) > b.y;
   }
   
   /* ---------- PLAYER ---------- */
   const player = {
     x: 50,
     y: H / 2,
     size: 24,
     color: "lime",
     speed: 4,
     room: 0,
     hp: 100,
     hpMax: 100,
     keys: 0
   };
   
   /* ---------- ROOMS ---------- */
   // helper to make a gradient bg
   actionBg = (c1, c2, vertical = true) => ({
     draw() {
       const g = ctx.createLinearGradient(0, 0, vertical ? 0 : W, vertical ? H : 0);
       g.addColorStop(0, c1);
       g.addColorStop(1, c2);
       ctx.fillStyle = g;
       ctx.fillRect(0, 0, W, H);
     }
   });
   
   // surface parallax bg (simple skyline)
   function drawSkyline(col1, col2, skylineColor, offset) {
     // sky gradient
     const g = ctx.createLinearGradient(0, 0, 0, H);
     g.addColorStop(0, col1);
     g.addColorStop(1, col2);
     ctx.fillStyle = g;
     ctx.fillRect(0, 0, W, H);
     // buildings
     ctx.fillStyle = skylineColor;
     for (let i = 0; i < 20; i++) {
       const w = rand(20, 40);
       const h = rand(60, 140);
       const x = ((i * 60) - offset * 0.3) % (W + 60) - 30;
       ctx.fillRect(x, H - h, w, h);
     }
   }
   
   const rooms = [
     /* 0 — Pripyat Street */
     {
       name: "Pripyat Street",
       bg: { draw(offset) { drawSkyline("#06131b", "#1b2631", "#0a0a0a", offset); } },
       doors: [
         { x: W - 50, y: H / 2 - 30, w: 40, h: 60, target: 1, dest: { x: 30, y: H / 2 }, lock: false }
       ],
       walls: [ { x: 230, y: 260, w: 140, h: 24, color: "#444" } ],
       hazards: [ { x: 120, y: 120, w: 80, h: 80, dmg: 0.05 } ],
       items: [ { x: 300, y: 320, w: 20, h: 20, type: "medkit" } ],
       enemies: [ { x: 420, y: 100, size: 28, speed: 1.5, damage: 10, color: "red", hp: 60, hpMax: 60 } ],
       spawn: { x: 50, y: H / 2 }
     },
     /* 1 — Amusement Park */
     {
       name: "Pripyat Park",
       bg: actionBg("#152425", "#204040"),
       doors: [
         { x: -10, y: H / 2 - 30, w: 40, h: 60, target: 0, dest: { x: W - 70, y: H / 2 }, lock: false },
         { x: W - 50, y: 40, w: 40, h: 60, target: 2, dest: { x: 50, y: 50 }, lock: "key" }
       ],
       walls: [ { x: 200, y: 180, w: 100, h: 20, color: "#555" } ],
       hazards: [],
       items: [ { x: 260, y: 80, w: 18, h: 18, type: "key" } ],
       enemies: [
         { x: 380, y: 260, size: 26, speed: 1.7, damage: 12, color: "red", hp: 70, hpMax: 70 },
         { x: 140, y: 60,  size: 26, speed: 1.3, damage: 12, color: "red", hp: 70, hpMax: 70 }
       ],
       spawn: { x: 70, y: H / 2 }
     },
     /* 2 — Reactor Exterior */
     {
       name: "Reactor Exterior",
       bg: actionBg("#461010", "#220000"),
       doors: [
         { x: -10, y: 40, w: 40, h: 60, target: 1, dest: { x: W - 70, y: 40 }, lock: false },
         { x: W / 2 - 20, y: H - 50, w: 40, h: 50, target: 3, dest: { x: W / 2 - 12, y: 40 }, lock: false }
       ],
       walls: [ { x: 260, y: 0,   w: 80, h: 140, color: "#333" } ],
       hazards: [ { x: 150, y: 210, w: 160, h: 100, dmg: 0.08 } ],
       items: [],
       enemies: [ { x: 100, y: 260, size: 32, speed: 2, damage: 14, color: "crimson", hp: 90, hpMax: 90 } ],
       spawn: { x: 60, y: 60 }
     },
     /* 3 — Reactor Core */
     {
       name: "Reactor Core",
       bg: { draw() { ctx.fillStyle = "#320303"; ctx.fillRect(0,0,W,H); ctx.fillStyle="#460000"; ctx.fillRect(20,20,W-40,H-40);} },
       doors: [
         { x: W / 2 - 20, y: -10, w: 40, h: 40, target: 2, dest: { x: W / 2 - 20, y: H - 60 }, lock: false }
       ],
       walls: [ { x: 200, y: 0,   w: 20, h: 200, color: "#555" }, { x: 380, y: 200, w: 20, h: 200, color: "#555" } ],
       hazards: [ { x: 0, y: 0, w: W, h: H, dmg: 0.12 } ],  // whole room is irradiated
       items: [ { x: W / 2 - 10, y: H / 2 - 10, w: 20, h: 20, type: "medkit" } ],
       enemies: [ { x: 270, y: 180, size: 34, speed: 2.2, damage: 18, color: "crimson", hp: 140, hpMax: 140 } ],
       spawn: { x: W / 2, y: H - 80 }
     }
   ];
   
   /* ---------- GAME STATE ---------- */
   let gameOver = false;
   let transitionAlpha = 0; // 1 = opaque, 0 = clear
   let backgroundOffset = 0; // for parallax
   
   /* ---------- INPUT ---------- */
   const keys = {};
   window.addEventListener("keydown",  e => keys[e.key] = true);
   window.addEventListener("keyup",    e => keys[e.key] = false);
   
   /* ---------- MAIN LOOP ---------- */
   requestAnimationFrame(loop);
   function loop(time) {
     if (!gameOver) {
       update();
       render();
     }
     requestAnimationFrame(loop);
   }
   
   /* ---------- UPDATE ---------- */
   function update() {
     const room = rooms[player.room];
     backgroundOffset += 0.2; // skyline drift
   
     // move
     const prev = { x: player.x, y: player.y };
     if (keys.ArrowUp)    player.y -= player.speed;
     if (keys.ArrowDown)  player.y += player.speed;
     if (keys.ArrowLeft)  player.x -= player.speed;
     if (keys.ArrowRight) player.x += player.speed;
   
     // clamp to canvas
     player.x = Math.max(0, Math.min(W - player.size, player.x));
     player.y = Math.max(0, Math.min(H - player.size, player.y));
   
     // wall collision
     room.walls.forEach(w => {
       if (rectIntersect(player, w)) {
         player.x = prev.x; player.y = prev.y; // simple rollback
       }
     });
   
     // door interaction
     room.doors.forEach(d => {
       if (rectIntersect(player, d)) {
         if (d.lock === "key" && player.keys === 0) return; // need key
         if (d.lock === "key") player.keys--;  // consume key
         changeRoom(d.target, d.dest);
       }
     });
   
     // hazards (radiation)
     room.hazards.forEach(h => {
       if (rectIntersect(player, h)) {
         player.hp -= h.dmg;
         if (player.hp <= 0) triggerGameOver();
       }
     });
   
     // item pickup
     room.items = room.items.filter(it => {
       if (rectIntersect(player, it)) {
         if (it.type === "medkit") player.hp = Math.min(player.hpMax, player.hp + 40);
         if (it.type === "key") player.keys++;
         return false; // remove
       }
       return true;
     });
   
     // enemy AI
     room.enemies.forEach(e => {
       if (e.hp <= 0) return;
       const dx = player.x - e.x;
       const dy = player.y - e.y;
       const dist = Math.hypot(dx, dy) || 1;
       if (dist < 300) { // pursue if close enough
         e.x += (dx / dist) * e.speed;
         e.y += (dy / dist) * e.speed;
       }
       // clamp
       e.x = Math.max(0, Math.min(W - e.size, e.x));
       e.y = Math.max(0, Math.min(H - e.size, e.y));
   
       // collision with player
       if (rectIntersect(player, e)) {
         player.hp -= e.damage;
         player.x -= Math.sign(dx) * 10;
         player.y -= Math.sign(dy) * 10;
         if (player.hp <= 0) triggerGameOver();
       }
     });
   
     // smooth transition fade
     if (transitionAlpha > 0) transitionAlpha -= 0.05;
   }
   
   /* ---------- RENDER ---------- */
   function render() {
     const room = rooms[player.room];
   
     // background
     room.bg.draw(backgroundOffset);
   
     // hazards (draw subtle overlay)
     room.hazards.forEach(h => {
       ctx.fillStyle = "rgba(0,255,0,0.1)";
       ctx.fillRect(h.x, h.y, h.w, h.h);
     });
   
     // doors
     room.doors.forEach(d => {
       ctx.fillStyle = d.lock === "key" ? "purple" : "gold";
       ctx.fillRect(d.x, d.y, d.w, d.h);
     });
   
     // walls
     room.walls.forEach(w => {
       ctx.fillStyle = w.color;
       ctx.fillRect(w.x, w.y, w.w, w.h);
     });
   
     // items
     room.items.forEach(it => {
       ctx.fillStyle = it.type === "medkit" ? "#0f0" : "#ff0";
       ctx.fillRect(it.x, it.y, it.w, it.h);
     });
   
     // enemies
     room.enemies.forEach(e => {
       if (e.hp <= 0) return;
       ctx.fillStyle = e.color;
       ctx.fillRect(e.x, e.y, e.size, e.size);
       // HP bar
       ctx.fillStyle = "black";
       ctx.fillRect(e.x, e.y - 6, e.size, 4);
       ctx.fillStyle = "red";
       ctx.fillRect(e.x, e.y - 6, e.size * (e.hp / e.hpMax), 4);
     });
   
     // player
     ctx.fillStyle = player.color;
     ctx.fillRect(player.x, player.y, player.size, player.size);
   
     // HUD
     ctx.fillStyle = "#eee";
     ctx.font = "16px Consolas";
     ctx.fillText(room.name, 10, 20);
     ctx.fillText(`HP: ${player.hp.toFixed(0)}`, 10, 40);
     ctx.fillText(`Keys: ${player.keys}`, 10, 60);
   
     // room transition fade
     if (transitionAlpha > 0) {
       ctx.fillStyle = `rgba(0,0,0,${transitionAlpha})`;
       ctx.fillRect(0, 0, W, H);
     }
   
     // game over overlay
     if (gameOver) {
       ctx.fillStyle = "rgba(0,0,0,0.8)";
       ctx.fillRect(0,0,W,H);
       ctx.fillStyle = "red";
       ctx.font = "48px Impact";
       ctx.textAlign = "center";
       ctx.fillText("GAME OVER", W/2, H/2);
       ctx.textAlign = "left";
     }
   }
   
   /* ---------- HELPERS ---------- */
   function changeRoom(index, dest) {
     transitionAlpha = 1; // start fade
     setTimeout(()=>{
       player.room = index;
       player.x = dest.x;
       player.y = dest.y;
     }, 50); // brief delay so fade covers switch
   }
   
   function triggerGameOver() {
     player.hp = 0;
     gameOver = true;
   }
   