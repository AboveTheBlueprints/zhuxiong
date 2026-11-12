// 猪兄（第五个，第 18 天 12:15 照 ~/碰/猪兄/猪兄.py v5 搬过来；12:43 加 v6：连着两步挡着就喊让开、结尾同一句并成一行）。规矩写在 猪兄.py 开头和 预期.md，页面上不写。
// 网页和 node 都用这一份；node 里拿来跟 python 逐串对。
(function () {
  const W = 11;
  const DIRS = { '上': [0, -1], '下': [0, 1], '左': [-1, 0], '右': [1, 0], '左上': [-1, -1], '右上': [1, -1], '左下': [-1, 1], '右下': [1, 1], '停': [0, 0] };
  const DIRKEYS = ['上', '下', '左', '右', '左上', '右上', '左下', '右下', '停'];
  const NAMES = { '手': ['老周', '老马', '小冯', '指导员', '小吴', '老包'], '火': ['老韩', '二愣', '小孙', '大刘', '副指导员', '老田'] };
  const SHORT = { '老周': '周', '老马': '马', '小冯': '冯', '指导员': '指', '小吴': '吴', '老包': '包', '老韩': '韩', '二愣': '愣', '小孙': '孙', '大刘': '刘', '副指导员': '副', '老田': '田' };
  const RANGE = { '手': 5, '火': 3 };
  const RING = 4, NMEN = 10, SHRINK = 6, NEAR = 2;

  function sgn(x) { return (x > 0) - (x < 0); }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function cheb(ax, ay, bx, by) { return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); }

  class Man {
    constructor(kind, k, x, y) { this.kind = kind; this.name = NAMES[kind][k]; this.x = x; this.y = y; this.aim = false; this.down = 0; this.stuck = null; this.told = null; this.gaveup = null; }
    label(f) {
      const t = (this.kind === '手' ? '拿手枪的' : '拿火枪的') + this.name;
      if (!f) return t;
      const dx = this.x - f.px, dy = this.y - f.py;
      const d = dy < 0 ? '上' : dy > 0 ? '下' : '';
      const h = dx < 0 ? '左' : dx > 0 ? '右' : '';
      let where = (h && d) ? h + d : (h || d);
      if (!(h && d)) where = where ? where + '边' : '';
      return `${t}（你${where}${Math.max(Math.abs(dx), Math.abs(dy))}格）`;
    }
  }

  class Field {
    constructor(seed) {
      // 跟 python 一样：seed * 2654435761 截成 32 位
      const r = mulberry32(Number((BigInt(seed) * 2654435761n) & 0xFFFFFFFFn));
      this.px = 5; this.py = 5;
      const ring = [];
      for (let x = 0; x < W; x++) for (let y = 0; y < W; y++) if (cheb(x, y, 5, 5) === RING) ring.push([x, y]);
      for (let i = ring.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = ring[i]; ring[i] = ring[j]; ring[j] = tmp; }
      const spots = [];
      for (const c of ring) {
        if (spots.length >= NMEN) break;
        if (spots.every(([a, b]) => cheb(c[0], c[1], a, b) >= 2)) spots.push(c);
      }
      const h = Math.floor(NMEN / 2);
      this.men = spots.map(([x, y], i) => new Man(i < h ? '手' : '火', i % h, x, y));
      this.log = []; this.t = 0; this.dead = null; this.out = false; this.ring = RING; this.shotline = [];
    }
    at(x, y, men) { for (const m of (men || this.men)) if (m.x === x && m.y === y) return m; return null; }
    shot(m, px, py, pos) {
      const [mx, my] = pos || [m.x, m.y];
      const dx = px - mx, dy = py - my;
      if (dx === 0 && dy === 0) return [false, null];
      if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) return [false, null];
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist > RANGE[m.kind]) return [false, null];
      const sx = sgn(dx), sy = sgn(dy);
      const others = this.men.filter(o => o !== m);
      for (let s = 1; s < dist; s++) if (this.at(mx + sx * s, my + sy * s, others)) return [false, null];
      let x = px + sx, y = py + sy;
      while (x >= 0 && x < W && y >= 0 && y < W) { const o = this.at(x, y, others); if (o) return [false, o]; x += sx; y += sy; }
      return [true, null];
    }
    step(mv) {
      this.t += 1;
      const [dx, dy] = DIRS[mv];
      const nx = this.px + dx, ny = this.py + dy;
      const note = [];
      const hit = this.at(nx, ny);
      if (hit && (dx || dy)) {
        const bx = hit.x + dx, by = hit.y + dy;
        if (bx >= 0 && bx < W && by >= 0 && by < W && !this.at(bx, by)) {
          hit.x = bx; hit.y = by; this.px = nx; this.py = ny;
          note.push(`你一头撞在${hit.label(this)}身上，把他撞出去一格，你冲到了他原来站的地方。他躺下了。`);
        } else {
          note.push(`你一头撞在${hit.label(this)}身上，他后头没地方，没撞开，你还在原地。他躺下了。`);
        }
        hit.down = 2; hit.aim = false;
        this.log.push([this.t, (this.px === nx && this.py === ny) ? `撞翻了${hit.label(this)}` : `撞了${hit.label(this)}，没撞开`]);
      } else { this.px = nx; this.py = ny; }
      if (this.px === 0 || this.px === W - 1 || this.py === 0 || this.py === W - 1) { this.out = true; note.push('你钻进了甘蔗地。'); return note; }
      for (const m of this.men) {
        if (m.down) continue;
        const [ok, behind] = this.shot(m, this.px, this.py);
        if ((m.aim || (m.kind === '火' && cheb(m.x, m.y, this.px, this.py) <= NEAR)) && ok) {
          this.dead = m;
          const ddx = sgn(this.px - m.x), ddy = sgn(this.py - m.y);
          const n = cheb(this.px, this.py, m.x, m.y);
          this.shotline = []; for (let k = 1; k < n; k++) this.shotline.push([m.x + ddx * k, m.y + ddy * k]);
          if (m.aim) note.push(`${m.label(this)}开了枪（图上 × 是那一枪走的路）。`);
          else note.push(`你这一步走进了${m.label(this)}的枪口，离他这么近，火枪不用举就放了（图上 × 是那一枪走的路）。`);
          this.log.push([this.t, `${m.label(this)}开枪`]);
          return note;
        }
        if (!ok && behind) {
          note.push(`${m.label(this)}枪口冲着你，没开：你那头站着${behind.label(this)}。`);
          this.log.push([this.t, `${m.label(this)}没开，你身后是${behind.name}`]);
          // v6：同一个人连着两步挡着他，他就喊那人让开；那人下一步挪开
          if (m.stuck && m.stuck[0] === behind && m.stuck[1] === this.t - 1) {
            if (!behind.down && behind.told === null && m.gaveup !== behind) {
              behind.told = m;
              note.push(`${m.label()}冲${behind.name}喊：让开！`);
              this.log.push([this.t, `${m.name}喊${behind.name}让开`]);
            }
          }
          if (m.gaveup !== null && m.gaveup !== behind) m.gaveup = null;
          m.stuck = [behind, this.t];
        } else { m.stuck = null; m.gaveup = null; }
      }
      if (this.t % SHRINK === 0 && this.ring > 2) {
        this.ring -= 1;
        for (const m of this.men) {
          if (cheb(m.x, m.y, 5, 5) > this.ring) {
            if (Math.abs(m.x - 5) > this.ring) m.x -= sgn(m.x - 5);
            if (Math.abs(m.y - 5) > this.ring) m.y -= sgn(m.y - 5);
          }
        }
        note.push('人往里收了一圈。');
      }
      const old = this.men.map(m => m.x + ',' + m.y);
      const moves = [];
      const lt = (a, b) => { for (let i = 0; i < a.length; i++) { if (a[i] < b[i]) return true; if (a[i] > b[i]) return false; } return false; };
      for (const m of this.men) {
        if (m.told !== null && !m.down) {
          const boss = m.told; m.told = null;
          let best = [m.x, m.y], bk = null;
          for (const ddx of [-1, 0, 1]) for (const ddy of [-1, 0, 1]) {
            const x = m.x + ddx, y = m.y + ddy;
            if ((ddx === 0 && ddy === 0) || !(x >= 0 && x < W && y >= 0 && y < W)) continue;
            if (cheb(x, y, this.px, this.py) <= 1) continue;
            if (cheb(x, y, 5, 5) !== this.ring) continue;
            if (old.includes(x + ',' + y)) continue;
            const mx = m.x, my = m.y; m.x = x; m.y = y;
            const still = this.shot(boss, this.px, this.py)[1] === m;
            m.x = mx; m.y = my;
            const [ok] = this.shot(m, this.px, this.py, [x, y]);
            const k = [still ? 1 : 0, ok ? 0 : 1, cheb(x, y, this.px, this.py)];
            if (bk === null || lt(k, bk)) { bk = k; best = [x, y]; }
          }
          if (best[0] === m.x && best[1] === m.y) { note.push(`${m.name}挤在那儿，没处让。`); boss.gaveup = m; }
          moves.push(best); continue;
        }
        m.told = null;
        if (m.down) {
          m.down -= 1;
          if (m.down === 0) note.push(`${m.label(this)}爬起来了。`);
          moves.push([m.x, m.y]); continue;
        }
        let best = [m.x, m.y], bk = null;
        for (const ddx of [-1, 0, 1]) for (const ddy of [-1, 0, 1]) {
          const x = m.x + ddx, y = m.y + ddy;
          if (!(x >= 0 && x < W && y >= 0 && y < W)) continue;
          if (cheb(x, y, this.px, this.py) <= 1) continue;
          if (cheb(x, y, 5, 5) !== this.ring) continue;
          if (!(x === m.x && y === m.y) && old.includes(x + ',' + y)) continue;
          const [ok] = this.shot(m, this.px, this.py, [x, y]);
          const d = cheb(x, y, this.px, this.py);
          const k = [ok ? 0 : 1, d, (ddx || ddy) ? 1 : 0];
          if (bk === null || k[0] < bk[0] || (k[0] === bk[0] && (k[1] < bk[1] || (k[1] === bk[1] && k[2] < bk[2])))) { bk = k; best = [x, y]; }
        }
        moves.push(best);
      }
      const seen = new Set(); const moved = new Set();
      this.men.forEach((m, i) => {
        let mv2 = moves[i];
        if (seen.has(mv2[0] + ',' + mv2[1])) mv2 = [m.x, m.y];
        seen.add(mv2[0] + ',' + mv2[1]);
        if (mv2[0] !== m.x || mv2[1] !== m.y) moved.add(m.name);
        m.x = mv2[0]; m.y = mv2[1];
      });
      for (const m of this.men) {
        if (m.down) { m.aim = false; continue; }
        const [ok] = this.shot(m, this.px, this.py);
        if (ok && m.aim && moved.has(m.name)) note.push(`${m.label(this)}挪了一步，枪口还跟着你。`);
        if (ok && !m.aim) {
          if (m.kind === '火') note.push(`${m.label(this)}挪到了对着你的线上，端起了枪。`);
          else note.push(`${m.label(this)}举起了枪。`);
        }
        m.aim = ok;
      }
      return note;
    }
    cell(x, y) {
      // 网页画格子用：返回 {t: 字, k: 种类}
      if (x === this.px && y === this.py) return { t: this.dead ? '死' : '猪', k: this.dead ? 'dead' : 'pig' };
      if (this.shotline.some(([a, b]) => a === x && b === y)) return { t: '×', k: 'line' };
      const m = this.at(x, y);
      if (m) return { t: SHORT[m.name], k: (m.kind === '手' ? 'shou' : 'huo') + (m.down ? ' down' : '') + (m.aim ? ' aim' : '') + (m.told ? ' told' : ''), man: m };
      if (x === 0 || x === W - 1 || y === 0 || y === W - 1) return { t: '蔗', k: 'cane' };
      return { t: '・', k: 'empty' };
    }
    show() {
      // 跟 python 那版一字不差，拿来对
      const rows = [];
      for (let y = 0; y < W; y++) {
        let s = '';
        for (let x = 0; x < W; x++) {
          const m = this.at(x, y);
          if (x === this.px && y === this.py) s += this.dead ? '死' : '猪';
          else if (this.shotline.some(([a, b]) => a === x && b === y)) s += '×';
          else if (m) s += m.down ? '躺' : (m.aim ? (m.kind === '手' ? '枪' : '铳') : m.kind);
          else if (x === 0 || x === W - 1 || y === 0 || y === W - 1) s += '蔗';
          else s += '・';
        }
        rows.push(s);
      }
      return rows.join('\n');
    }
  }

  function runs(log) {
    // v6：同一句连着几步并成一行；返回 [从, 到, 句]
    const rs = [];
    for (const [t, s] of log) {
      const last = rs[rs.length - 1];
      if (last && last[2] === s && last[1] === t - 1) { last[1] = t; continue; }
      if (last && last[2] === s && last[1] === t) continue;
      const r = rs.find(r => r[2] === s && r[1] === t - 1);
      if (r) r[1] = t; else rs.push([t, t, s]);
    }
    return rs;
  }
  function runText(r) { return r[0] === r[1] ? `第 ${r[0]} 步，${r[2]}` : `第 ${r[0]}–${r[1]} 步，${r[2]}（连着 ${r[1] - r[0] + 1} 步）`; }

  function textRun(seed, acts) {
    // 跟 python main() 打印的一字不差（拿来对）
    const out = [];
    const f = new Field(seed);
    out.push('猪场外头的空地。四边是甘蔗地（蔗）。手、火是拿手枪、拿火枪的人，手枪举起来写成"枪"，火枪举起来写成"铳"，躺着的写成"躺"。');
    out.push('能走：上 下 左 右 左上 右上 左下 右下 停');
    out.push(f.show());
    for (const a of acts) {
      if (!(a in DIRS)) { out.push(`（不认得"${a}"）`); return out.join('\n'); }
      if (f.dead || f.out) break;
      const note = f.step(a);
      out.push(`\n—— 第 ${f.t} 步：${a}`);
      for (const n of note) out.push(n);
      out.push(f.show());
    }
    if (f.dead || f.out) {
      out.push('\n==== 完了 ====');
      out.push(f.out ? '你跑了。' : '你被打死了。');
      if (f.log.length) { out.push('这一路上：'); for (const r of runs(f.log)) out.push('  ' + runText(r)); }
      const saved = f.log.filter(([t, s]) => s.includes('没开'));
      out.push(`有 ${saved.length} 回，枪口对着你，因为你那头站着他们自己人，没开。`);
    }
    return out.join('\n');
  }

  const api = { Field, DIRS, DIRKEYS, W, textRun, SHORT, runs, runText };
  if (typeof module !== 'undefined') module.exports = api; else window.ZHU = api;
})();
