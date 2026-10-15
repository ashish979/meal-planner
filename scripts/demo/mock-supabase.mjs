// Minimal in-memory PostgREST-compatible mock of the Supabase tables this app uses.
// Lets the UI run with fictional demo data and no Supabase project / credentials.
//   node scripts/demo/mock-supabase.mjs        (listens on :54321)
// Then run the app with:
//   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=demo pnpm dev
import http from 'node:http'
import { randomUUID } from 'node:crypto'

const PORT = process.env.PORT || 54321
const now = new Date().toISOString()
const id = () => randomUUID()
const iso = (d) => d.toISOString().split('T')[0]

const art = (emoji, c1, c2) =>
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="200" y="185" font-size="120" text-anchor="middle">${emoji}</text></svg>`)

const ing = {}
const ingredients = [
  ['Wheat Flour','Flour'],['Basmati Rice','Grains'],['Potato','Vegetables'],['Tomato','Vegetables'],['Onion','Vegetables'],
  ['Spinach','Vegetables'],['Cauliflower','Vegetables'],['Chickpeas','Pulses'],['Yellow Lentils','Pulses'],['Kidney Beans','Pulses'],
  ['Paneer','Dairy'],['Yogurt','Dairy'],['Butter','Dairy'],['Eggs','Protein'],['Chicken','Protein'],['Cumin','Spices'],['Turmeric','Spices'],['Garam Masala','Spices'],
].map(([name, category]) => (ing[name] = { id: id(), name, category, created_at: now, updated_at: now }))

const mi = {}
const mk = (name, description, ings, is_veg, emoji, c1, c2, prep, notes) =>
  (mi[name] = { id: id(), name, description, ingredients: ings.map((n) => ing[n].id), is_veg, image: art(emoji, c1, c2),
    prep_time_minutes: prep, prep_notes: notes, created_at: now, updated_at: now })
mk('Chapati','Soft whole wheat flatbread',['Wheat Flour'],true,'🫓','#fde68a','#f59e0b',20)
mk('Steamed Rice','Plain basmati rice',['Basmati Rice'],true,'🍚','#e0f2fe','#7dd3fc',15)
mk('Dal Tadka','Yellow lentils with cumin tempering',['Yellow Lentils','Cumin','Turmeric','Onion'],true,'🍲','#fcd34d','#d97706',25,'Soak lentils for 30 minutes')
mk('Rajma','Kidney bean curry',['Kidney Beans','Onion','Tomato'],true,'🫘','#fecaca','#b91c1c',40,'Soak kidney beans overnight')
mk('Paneer Butter Masala','Cottage cheese in creamy tomato gravy',['Paneer','Butter','Tomato'],true,'🧀','#fed7aa','#ea580c',35,'Take paneer out of the fridge an hour ahead')
mk('Aloo Gobi','Potato and cauliflower dry curry',['Potato','Cauliflower','Turmeric'],true,'🥔','#fef08a','#ca8a04',25)
mk('Chole','Spicy chickpea curry',['Chickpeas','Onion','Garam Masala'],true,'🥘','#fdba74','#9a3412',35,'Soak chickpeas overnight')
mk('Raita','Yogurt with cucumber',['Yogurt'],true,'🥣','#f0fdf4','#86efac',5)
mk('Poha','Flattened rice with peanuts and vegetables',['Potato','Onion'],true,'🍛','#fef9c3','#facc15',15)
mk('Paratha','Layered flatbread',['Wheat Flour','Butter'],true,'🥞','#fde68a','#b45309',25)
mk('Scrambled Eggs','Fluffy scrambled eggs',['Eggs'],false,'🍳','#fef3c7','#fbbf24',10)
mk('Chicken Curry','Chicken in onion-tomato gravy',['Chicken','Onion','Tomato'],false,'🍗','#fecdd3','#be123c',40,'Marinate chicken in yogurt overnight')
mk('Palak Paneer','Spinach with cottage cheese',['Spinach','Paneer'],true,'🥬','#bbf7d0','#16a34a',30)

const meals = {}
const meal = (name, description, items, meal_type, is_veg) =>
  (meals[name] = { id: id(), name, description, meal_items: items.map((n) => mi[n].id), meal_type, is_veg, created_at: now, updated_at: now })
meal('Poha Breakfast','Light and quick start',['Poha','Raita'],'breakfast',true)
meal('Egg Paratha','Protein-packed breakfast',['Scrambled Eggs','Paratha'],'breakfast',false)
meal('Chapati with Dal','Classic weekday lunch',['Chapati','Dal Tadka'],'lunch',true)
meal('Rajma Chawal','Comfort food',['Rajma','Steamed Rice'],'lunch',true)
meal('Chole Paratha','Weekend special',['Chole','Paratha'],'lunch',true)
meal('Paneer Thali','Chapati, paneer and raita',['Chapati','Paneer Butter Masala','Raita'],'dinner',true)
meal('Chicken Dinner','Chicken curry with chapati',['Chicken Curry','Chapati'],'dinner',false)
meal('Palak Paneer & Rice','Green and hearty',['Palak Paneer','Steamed Rice'],'dinner',true)
meal('Aloo Gobi Combo','Simple dry curry meal',['Aloo Gobi','Chapati','Raita'],'dinner',true)

const calendar_days = []
const B = ['Poha Breakfast','Egg Paratha'], L = ['Chapati with Dal','Rajma Chawal','Chole Paratha'], D = ['Paneer Thali','Chicken Dinner','Palak Paneer & Rice','Aloo Gobi Combo']
for (let k = -10; k < 14; k++) {
  const d = new Date(); d.setDate(d.getDate() + k)
  if (k % 5 === 3) continue // leave a few gaps
  calendar_days.push({ id: id(), date: iso(d), breakfast: k % 4 === 2 ? null : meals[B[Math.abs(k) % 2]].id,
    lunch: meals[L[Math.abs(k) % 3]].id, dinner: k % 6 === 1 ? null : meals[D[Math.abs(k) % 4]].id, created_at: now, updated_at: now })
}

const tables = { ingredients, meal_items: Object.values(mi), meals: Object.values(meals), calendar_days }
const embed = { breakfast_meal: 'breakfast', lunch_meal: 'lunch', dinner_meal: 'dinner' }

const send = (res, status, body, extra = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*', ...extra })
  res.end(body === undefined ? '' : JSON.stringify(body))
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204)
  const u = new URL(req.url, 'http://x')
  const m = u.pathname.match(/^\/rest\/v1\/(\w+)/)
  if (!m || !tables[m[1]]) return send(res, 404, { message: 'not found' })
  const name = m[1], rows = tables[name]
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', () => {
    const body = raw ? JSON.parse(raw) : null
    const accept = req.headers.accept || ''
    const single = accept.includes('vnd.pgrst.object')
    const matches = (r) => {
      for (const [k, v] of u.searchParams) {
        if (['select', 'order', 'on_conflict', 'columns'].includes(k)) continue
        const [op, ...rest] = v.split('.'); const val = rest.join('.')
        if (op === 'eq' && String(r[k]) !== val) return false
        if (op === 'gte' && !(String(r[k]) >= val)) return false
        if (op === 'lte' && !(String(r[k]) <= val)) return false
      }
      return true
    }
    const finish = (out) => {
      if (single) {
        if (out.length !== 1) return send(res, 406, { code: 'PGRST116', details: `${out.length} rows`, message: 'JSON object requested, multiple (or no) rows returned' })
        return send(res, req.method === 'POST' ? 201 : 200, out[0])
      }
      send(res, req.method === 'POST' ? 201 : 200, out)
    }
    const decorate = (r) => {
      const sel = u.searchParams.get('select') || ''
      if (name !== 'calendar_days' || !sel.includes('_meal:')) return r
      const o = { ...r }
      for (const [alias, col] of Object.entries(embed)) o[alias] = tables.meals.find((x) => x.id === r[col]) || null
      return o
    }
    if (req.method === 'GET') {
      let out = rows.filter(matches)
      const order = u.searchParams.getAll('order')
      for (const o of order.reverse()) { const [c, dir] = o.split('.'); out.sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (dir === 'desc' ? -1 : 1)) }
      return finish(out.map(decorate))
    }
    if (req.method === 'POST') {
      const upsert = (req.headers.prefer || '').includes('resolution=merge-duplicates')
      const out = []
      for (const item of [].concat(body)) {
        const existing = upsert && name === 'calendar_days' ? rows.find((r) => r.date === item.date) : null
        if (existing) { Object.assign(existing, item, { updated_at: new Date().toISOString() }); out.push(existing) }
        else { const r = { id: id(), created_at: now, updated_at: now, ...item }; rows.push(r); out.push(r) }
      }
      return finish(out)
    }
    if (req.method === 'PATCH') { const out = rows.filter(matches); out.forEach((r) => Object.assign(r, body, { updated_at: new Date().toISOString() })); return finish(out) }
    if (req.method === 'DELETE') { const gone = rows.filter(matches); gone.forEach((r) => rows.splice(rows.indexOf(r), 1)); return send(res, 204) }
    send(res, 405, {})
  })
}).listen(PORT, () => console.log(`mock supabase on :${PORT}`))
