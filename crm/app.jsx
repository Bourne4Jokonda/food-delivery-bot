const { useState, useEffect, useCallback } = React;

        const isInVK = !!(window.VKBridge && window.VKBridge.send);
        const API_BASE = (window.VK_MINI_APP_CONFIG && window.VK_MINI_APP_CONFIG.API_URL) || (window.location.origin + '/api');

        if (isInVK) {
            window.VKBridge.send('VKWebAppInit');
        }

        const API = API_BASE;

        let _authCallback = null;
        const apiFetch = (url, opts = {}) => {
            const key = localStorage.getItem('crm_api_key') || '';
            const h = { 'X-API-Key': key, ...(opts.headers || {}) };
            return fetch(url, { ...opts, headers: h }).then(r => {
                if (r.status === 401 && _authCallback) {
                    localStorage.removeItem('crm_api_key');
                    _authCallback(false);
                }
                return r;
            });
        };

        const STATUS_MAP = {
            new: 'Новый', confirmed: 'Подтвержден', preparing: 'Готовится',
            ready: 'Готов', delivering: 'В доставке', delivered: 'Доставлен', cancelled: 'Отменён'
        };
        const STATUS_FLOW_DELIVERY = ['new', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered'];
        const STATUS_FLOW_PICKUP = ['new', 'confirmed', 'preparing', 'ready', 'delivered'];
        const DELIVERY_ICON = { delivery: 'fa-truck', pickup: 'fa-store' };
        const PAYMENT_ICON = { card: 'fa-credit-card', cash: 'fa-money-bill-wave' };
        const PAYMENT_LABEL = { card: 'Карта', cash: 'Наличные' };
        const CAT_MAP = { 'Пицца': 'cat-pizza', 'Рамен': 'cat-ramen', 'Салаты': 'cat-salads', 'Бургеры': 'cat-burgers', 'Снэки': 'cat-snacks', 'Напитки': 'cat-drinks' };
        const CAT_ICON = { 'Пицца': 'fa-pizza-slice', 'Рамен': 'fa-bowl-food', 'Салаты': 'fa-leaf', 'Бургеры': 'fa-burger', 'Снэки': 'fa-french-fries', 'Напитки': 'fa-wine-glass' };
        const STATUS_LABEL_PICKUP = { delivered: 'Выдать' };

        const App = () => {
            const [authed, setAuthed] = useState(!!localStorage.getItem('crm_api_key'));
            _authCallback = setAuthed;
            const [loginKey, setLoginKey] = useState('');
            const [loginError, setLoginError] = useState('');
            const [tab, setTab] = useState('orders');
            const [orders, setOrders] = useState([]);
            const [menu, setMenu] = useState([]);
            const [stats, setStats] = useState({ orders: 0, revenue: 0 });
            const [weekStats, setWeekStats] = useState({ orders: 0, revenue: 0 });
            const [orderDetail, setOrderDetail] = useState(null);
            const [menuModal, setMenuModal] = useState(null);
            const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category: 'Пицца' });
            const [botStatus, setBotStatus] = useState({ running: false, pid: null, uptime: null });
            const [botLogs, setBotLogs] = useState([]);
            const [staff, setStaff] = useState([]);
            const [staffModal, setStaffModal] = useState(false);
            const [newStaff, setNewStaff] = useState({ vk_id: '', role: 'kitchen', name: '' });
            const [zones, setZones] = useState([]);
            const [zoneModal, setZoneModal] = useState(null);
            const [newZone, setNewZone] = useState({ name: '', cost: '', free_from: '', enabled: true, sort_order: 0, keywords: '' });
            const [categories, setCategories] = useState([]);
            const [catModal, setCatModal] = useState(null);
            const [newCat, setNewCat] = useState({ name: '', icon: 'fa-utensils', sort_order: 0 });

            const doLogin = async () => {
                setLoginError('');
                try {
                    const r = await fetch(`${API}/auth/verify`, {
                        method: 'POST', headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({ key: loginKey })
                    });
                    if (r.ok) {
                        localStorage.setItem('crm_api_key', loginKey);
                        setAuthed(true);
                    } else {
                        setLoginError('Неверный ключ');
                    }
                } catch (e) { setLoginError('Ошибка соединения'); }
            };

            const doLogout = () => {
                localStorage.removeItem('crm_api_key');
                setAuthed(false);
                setLoginKey('');
            };

            const load = useCallback(async () => {
                try {
                    const [o, m, s, w] = await Promise.all([
                        apiFetch(`${API}/orders`).then(r => r.ok ? r.json() : []),
                        apiFetch(`${API}/menu`).then(r => r.ok ? r.json() : []),
                        apiFetch(`${API}/stats`).then(r => r.ok ? r.json() : {orders:0,revenue:0}),
                        apiFetch(`${API}/stats/week`).then(r => r.ok ? r.json() : {orders:0,revenue:0})
                    ]);
                    setOrders(Array.isArray(o) ? o : []); setMenu(Array.isArray(m) ? m : []); setStats(s); setWeekStats(w);
                } catch (e) { console.error(e); }
            }, []);

            const loadBotStatus = useCallback(async () => {
                try {
                    const r = await apiFetch(`${API}/bot/status`);
                    const s = r.ok ? await r.json() : {running:false,pid:null,uptime:null};
                    setBotStatus(s);
                } catch (e) { console.error(e); }
            }, []);

            const loadBotLogs = useCallback(async () => {
                try {
                    const r = await apiFetch(`${API}/bot/logs?lines=30`);
                    const l = r.ok ? await r.json() : {lines:[]};
                    setBotLogs(l.lines || []);
                } catch (e) { console.error(e); }
            }, []);

            const loadStaff = useCallback(async () => {
                try {
                    const r = await apiFetch(`${API}/staff`);
                    const s = r.ok ? await r.json() : [];
                    setStaff(Array.isArray(s) ? s : []);
                } catch (e) { console.error(e); }
            }, []);

            const loadZones = useCallback(async () => {
                try {
                    const r = await apiFetch(`${API}/delivery-zones`);
                    const z = r.ok ? await r.json() : [];
                    setZones(Array.isArray(z) ? z : []);
                } catch (e) { console.error(e); }
            }, []);

            const loadCategories = useCallback(async () => {
                try {
                    const r = await apiFetch(`${API}/categories`);
                    const c = r.ok ? await r.json() : [];
                    setCategories(Array.isArray(c) ? c : []);
                } catch (e) { console.error(e); }
            }, []);

            useEffect(() => { load(); loadBotStatus(); loadStaff(); loadZones(); loadCategories(); const t = setInterval(() => { load(); loadBotStatus(); loadStaff(); loadZones(); loadCategories(); }, 10000); return () => clearInterval(t); }, [load, loadBotStatus, loadStaff, loadZones, loadCategories]);
            useEffect(() => { if (tab === 'bot') { loadBotLogs(); const t = setInterval(loadBotLogs, 5000); return () => clearInterval(t); } }, [tab, loadBotLogs]);

            const updateStatus = async (id, status) => {
                await apiFetch(`${API}/orders/${id}/status`, {
                    method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status})
                });
                load();
            };

            const nextStatus = (current, deliveryType) => {
                const flow = deliveryType === 'pickup' ? STATUS_FLOW_PICKUP : STATUS_FLOW_DELIVERY;
                const idx = flow.indexOf(current);
                return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
            };

            const openOrderDetail = async (orderId) => {
                try {
                    const res = await apiFetch(`${API}/orders/${orderId}`);
                    const data = await res.json();
                    setOrderDetail(data);
                } catch (e) { console.error(e); }
            };

            const saveMenuItem = async () => {
                const body = { ...newItem, price: parseFloat(newItem.price) };
                if (menuModal === 'new') {
                    await apiFetch(`${API}/menu`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
                } else {
                    await apiFetch(`${API}/menu/${menuModal}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
                }
                setMenuModal(null);
                setNewItem({ name: '', description: '', price: '', category: 'Пицца' });
                load();
            };

            const deleteMenuItem = async (id) => {
                if (!confirm('Удалить блюдо?')) return;
                await apiFetch(`${API}/menu/${id}`, { method: 'DELETE' });
                load();
            };

            const openEdit = (item) => {
                setNewItem({ name: item.name, description: item.description, price: item.price, category: item.category });
                setMenuModal(item.id);
            };

            const botAction = async (action) => {
                await apiFetch(`${API}/bot/${action}`, { method: 'POST' });
                setTimeout(loadBotStatus, 1000);
            };

            const addStaffMember = async () => {
                const body = { vk_id: parseInt(newStaff.vk_id), role: newStaff.role, name: newStaff.name };
                if (isNaN(body.vk_id)) return alert('Введите числовой VK ID');
                await apiFetch(`${API}/staff`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
                setStaffModal(false);
                setNewStaff({ vk_id: '', role: 'kitchen', name: '' });
                loadStaff();
            };

            const removeStaffMember = async (id) => {
                if (!confirm('Убрать сотрудника? Он станет клиентом.')) return;
                await apiFetch(`${API}/staff/${id}`, { method: 'DELETE' });
                loadStaff();
            };

            const saveZone = async () => {
                const body = {
                    name: newZone.name,
                    cost: parseFloat(newZone.cost) || 0,
                    free_from: newZone.free_from ? parseFloat(newZone.free_from) : null,
                    enabled: newZone.enabled,
                    sort_order: parseInt(newZone.sort_order) || 0,
                    keywords: newZone.keywords,
                };
                if (!body.name) return alert('Введите название зоны');
                if (zoneModal === 'new') {
                    await apiFetch(`${API}/delivery-zones`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
                } else {
                    await apiFetch(`${API}/delivery-zones/${zoneModal}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
                }
                setZoneModal(null);
                setNewZone({ name: '', cost: '', free_from: '', enabled: true, sort_order: 0, keywords: '' });
                loadZones();
            };

            const deleteZone = async (id) => {
                if (!confirm('Удалить зону доставки?')) return;
                await apiFetch(`${API}/delivery-zones/${id}`, { method: 'DELETE' });
                loadZones();
            };

            const openEditZone = (zone) => {
                setNewZone({ name: zone.name, cost: zone.cost, free_from: zone.free_from || '', enabled: zone.enabled, sort_order: zone.sort_order, keywords: zone.keywords || '' });
                setZoneModal(zone.id);
            };

            const saveCategory = async () => {
                if (!newCat.name) return alert('Введите название категории');
                const body = { name: newCat.name, icon: newCat.icon, sort_order: parseInt(newCat.sort_order) || 0 };
                if (catModal === 'new') {
                    await apiFetch(`${API}/categories`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
                } else {
                    await apiFetch(`${API}/categories/${catModal}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
                }
                setCatModal(null);
                setNewCat({ name: '', icon: 'fa-utensils', sort_order: 0 });
                loadCategories();
            };

            const deleteCategory = async (id) => {
                if (!confirm('Удалить категорию?')) return;
                await apiFetch(`${API}/categories/${id}`, { method: 'DELETE' });
                loadCategories();
            };

            const openEditCategory = (cat) => {
                setNewCat({ name: cat.name, icon: cat.icon, sort_order: cat.sort_order });
                setCatModal(cat.id);
            };

            const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');

            if (!authed) {
                return (
                    <div className="app" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>
                        <div className="glass neo" style={{padding:40,width:380,textAlign:'center'}}>
                            <div style={{fontSize:48,marginBottom:16}}>🍕</div>
                            <h2 style={{marginBottom:8,color:'#e0f0e5'}}>Вкусная Доставка — CRM</h2>
                            <p style={{color:'#8cc8a0',marginBottom:24,fontSize:14}}>Введите API-ключ для доступа</p>
                            <input type="password" placeholder="API ключ" value={loginKey}
                                onChange={e => setLoginKey(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') doLogin(); }}
                                style={{width:'100%',padding:'12px 14px',background:'rgba(15,26,20,0.8)',border:'1px solid rgba(100,180,120,0.25)',borderRadius:10,color:'#e0f0e5',fontSize:14,marginBottom:12,outline:'none',textAlign:'center'}} />
                            {loginError && <div style={{color:'#f87171',fontSize:13,marginBottom:12}}>{loginError}</div>}
                            <button className="btn btn-success" onClick={doLogin} style={{width:'100%',padding:'12px 0',fontSize:14}}>Войти</button>
                        </div>
                    </div>
                );
            }

            return (
                <div className="app">
                    <div className="header glass">
                        <h1><i className="fa-solid fa-burger" style={{marginRight: 10}}></i>Вкусная Доставка — CRM</h1>
                        <div>
                            <button className="refresh" onClick={load}><i className="fa-solid fa-rotate"></i> Обновить</button>
                            <button className="btn btn-ghost" onClick={doLogout} style={{marginLeft: 8}}>🚪 Выйти</button>
                        </div>
                    </div>

                    <div className="stats">
                        <div className="stat-card glass neo">
                            <div className="icon c1"><i className="fa-solid fa-receipt"></i></div>
                            <h3>Заказов сегодня</h3>
                            <div className="value c1">{stats.orders}</div>
                        </div>
                        <div className="stat-card glass neo">
                            <div className="icon c2"><i className="fa-solid fa-ruble-sign"></i></div>
                            <h3>Выручка сегодня</h3>
                            <div className="value c2">{stats.revenue}₽</div>
                        </div>
                        <div className="stat-card glass neo">
                            <div className="icon c3"><i className="fa-solid fa-calendar-week"></i></div>
                            <h3>За неделю</h3>
                            <div className="value c3">{weekStats.orders} заказов</div>
                        </div>
                        <div className="stat-card glass neo">
                            <div className="icon c4"><i className="fa-solid fa-chart-line"></i></div>
                            <h3>Выручка за неделю</h3>
                            <div className="value c4">{weekStats.revenue}₽</div>
                        </div>
                    </div>

                    <div className="tabs">
                        <button className={`tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
                            <i className="fa-solid fa-box"></i> Заказы <span className="badge">{activeOrders.length}</span>
                        </button>
                        <button className={`tab ${tab === 'menu' ? 'active' : ''}`} onClick={() => setTab('menu')}>
                            <i className="fa-solid fa-utensils"></i> Меню <span className="badge">{menu.length}</span>
                        </button>
                        <button className={`tab ${tab === 'bot' ? 'active' : ''}`} onClick={() => setTab('bot')}>
                            <i className="fa-solid fa-robot"></i> Бот <span className="badge" style={{background: botStatus.running ? 'rgba(64,192,87,0.3)' : 'rgba(220,60,60,0.25)', color: botStatus.running ? '#5cdb7e' : '#f87171'}}>{botStatus.running ? 'ON' : 'OFF'}</span>
                        </button>
                        <button className={`tab ${tab === 'staff' ? 'active' : ''}`} onClick={() => setTab('staff')}>
                            <i className="fa-solid fa-users"></i> Сотрудники
                        </button>
                        <button className={`tab ${tab === 'zones' ? 'active' : ''}`} onClick={() => setTab('zones')}>
                            <i className="fa-solid fa-map-location-dot"></i> Зоны
                        </button>
                        <button className={`tab ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>
                            <i className="fa-solid fa-tags"></i> Категории
                        </button>
                    </div>

                    {tab === 'orders' && (
                        <div className="panel glass">
                            <div className="panel-header">
                                <h2>Заказы</h2>
                            </div>
                            {orders.length === 0 ? (
                                <div className="empty"><i className="fa-solid fa-inbox" style={{fontSize: 32, marginBottom: 12, display: 'block'}}></i>Нет заказов</div>
                            ) : (
                                orders.map(order => (
                                    <div key={order.id} className="order-item" onClick={() => openOrderDetail(order.id)}>
                                        <div style={{flex: 1}}>
                                            <div>
                                                <span className="order-id">#{order.id}</span>
                                                <span className={`order-badge badge-${order.status}`} style={{marginLeft: 8}}>{STATUS_MAP[order.status]}</span>
                                            </div>
                                            <div className="order-meta">
                                                <span><i className={`fa-solid ${DELIVERY_ICON[order.delivery_type]}`}></i> {order.delivery_type === 'delivery' ? 'Доставка' : 'Самовывоз'}</span>
                                                {order.address && <span><i className="fa-solid fa-location-dot"></i> {order.address}</span>}
                                                {order.payment_method && <span><i className={`fa-solid ${PAYMENT_ICON[order.payment_method]}`}></i> {PAYMENT_LABEL[order.payment_method]}</span>}
                                                {order.created_at && <span><i className="fa-regular fa-clock"></i> {new Date(order.created_at).toLocaleString('ru-RU')}</span>}
                                            </div>
                                        </div>
                                        <div style={{textAlign: 'right'}}>
                                            <div className="order-price">{order.total_price}₽</div>
                                            <div className="actions">
                                                {order.status !== 'delivered' && order.status !== 'cancelled' && nextStatus(order.status, order.delivery_type) && (
                                                    <button className="btn btn-success" onClick={(e) => { e.stopPropagation(); updateStatus(order.id, nextStatus(order.status, order.delivery_type)); }}>
                                                        <i className="fa-solid fa-arrow-right"></i>
                                                        {order.delivery_type === 'pickup' && STATUS_LABEL_PICKUP[nextStatus(order.status, order.delivery_type)] || STATUS_MAP[nextStatus(order.status, order.delivery_type)]}
                                                    </button>
                                                )}
                                                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                                    <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); updateStatus(order.id, 'cancelled'); }}>
                                                        <i className="fa-solid fa-xmark"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {tab === 'menu' && (
                        <div>
                            <div className="panel-header glass" style={{marginBottom: 16, borderRadius: 16}}>
                                <h2><i className="fa-solid fa-utensils" style={{marginRight: 8}}></i>Меню</h2>
                                <button className="btn btn-success" onClick={() => { setNewItem({name:'',description:'',price:'',category:'Пицца'}); setMenuModal('new'); }}>
                                    <i className="fa-solid fa-plus"></i> Добавить
                                </button>
                            </div>
                            <div className="menu-grid">
                                {menu.map(item => (
                                    <div key={item.id} className="menu-card glass neo">
                                        <div className="card-top">
                                            <h4>{item.name}</h4>
                                            <span className="category-tag"><i className={`fa-solid ${categories.find(c => c.name === item.category)?.icon || 'fa-utensils'}`} style={{marginRight: 4}}></i>{item.category}</span>
                                        </div>
                                        <div className="desc">{item.description}</div>
                                        <div className="price">{item.price}₽</div>
                                        <div className="card-actions">
                                            <button className="btn btn-primary" onClick={() => openEdit(item)}><i className="fa-solid fa-pen"></i> Ред.</button>
                                            <button className="btn btn-danger" onClick={() => deleteMenuItem(item.id)}><i className="fa-solid fa-trash"></i></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'bot' && (
                        <div>
                            <div className="panel glass" style={{marginBottom: 16}}>
                                <div className="panel-header">
                                    <h2><i className="fa-solid fa-robot" style={{marginRight: 8}}></i>Управление ботом</h2>
                                </div>
                                <div style={{padding: 24}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20}}>
                                        <div style={{width: 12, height: 12, borderRadius: '50%', background: botStatus.running ? '#5cdb7e' : '#f87171', boxShadow: botStatus.running ? '0 0 12px rgba(64,192,87,0.5)' : '0 0 12px rgba(220,60,60,0.5)'}}></div>
                                        <span style={{fontSize: 18, fontWeight: 600}}>{botStatus.running ? 'Бот работает' : 'Бот остановлен'}</span>
                                    </div>
                                    {botStatus.running && (
                                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20}}>
                                            <div style={{background: 'rgba(64,192,87,0.08)', padding: 14, borderRadius: 12}}>
                                                <div style={{fontSize: 11, color: '#8cc8a0', textTransform: 'uppercase', marginBottom: 4}}>PID</div>
                                                <div style={{fontSize: 18, fontWeight: 700}}>{botStatus.pid}</div>
                                            </div>
                                            <div style={{background: 'rgba(64,192,87,0.08)', padding: 14, borderRadius: 12}}>
                                                <div style={{fontSize: 11, color: '#8cc8a0', textTransform: 'uppercase', marginBottom: 4}}>Время работы</div>
                                                <div style={{fontSize: 18, fontWeight: 700}}>{botStatus.uptime || '—'}</div>
                                            </div>
                                            <div style={{background: 'rgba(64,192,87,0.08)', padding: 14, borderRadius: 12}}>
                                                <div style={{fontSize: 11, color: '#8cc8a0', textTransform: 'uppercase', marginBottom: 4}}>RAM</div>
                                                <div style={{fontSize: 18, fontWeight: 700}}>{botStatus.ram_mb ? botStatus.ram_mb + ' MB' : '—'}</div>
                                            </div>
                                        </div>
                                    )}
                                    <div style={{display: 'flex', gap: 10}}>
                                        {!botStatus.running ? (
                                            <button className="btn btn-success" onClick={() => botAction('start')} style={{padding: '12px 28px', fontSize: 14}}>
                                                <i className="fa-solid fa-play"></i> Запустить
                                            </button>
                                        ) : (
                                            <>
                                                <button className="btn btn-danger" onClick={() => botAction('stop')} style={{padding: '12px 28px', fontSize: 14}}>
                                                    <i className="fa-solid fa-stop"></i> Остановить
                                                </button>
                                                <button className="btn btn-primary" onClick={() => botAction('restart')} style={{padding: '12px 28px', fontSize: 14}}>
                                                    <i className="fa-solid fa-rotate"></i> Перезапустить
                                                </button>
                                            </>
                                        )}
                                        <button className="btn btn-ghost" onClick={() => { loadBotStatus(); loadBotLogs(); }} style={{padding: '12px 28px', fontSize: 14}}>
                                            <i className="fa-solid fa-rotate"></i> Обновить
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="panel glass">
                                <div className="panel-header">
                                    <h2><i className="fa-solid fa-terminal" style={{marginRight: 8}}></i>Логи бота</h2>
                                </div>
                                <div style={{padding: 16, maxHeight: 400, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, color: '#8cc8a0'}}>
                                    {botLogs.length === 0 ? (
                                        <div style={{textAlign: 'center', padding: 20, opacity: 0.5}}>Нет логов</div>
                                    ) : (
                                        botLogs.map((line, i) => <div key={i} style={{padding: '2px 0', borderBottom: '1px solid rgba(100,180,120,0.08)'}}>{line}</div>)
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'staff' && (
                        <div>
                            <div className="panel glass">
                                <div className="panel-header">
                                    <h2><i className="fa-solid fa-users" style={{marginRight: 8}}></i>Сотрудники</h2>
                                    <button className="btn btn-success" onClick={() => setStaffModal(true)}>
                                        <i className="fa-solid fa-plus"></i> Добавить
                                    </button>
                                </div>
                                {staff.length === 0 ? (
                                    <div className="empty"><i className="fa-solid fa-user-slash" style={{fontSize: 32, marginBottom: 12, display: 'block'}}></i>Нет сотрудников. Добавьте кухню и курьера по VK ID.</div>
                                ) : (
                                    staff.map(s => (
                                        <div key={s.id} style={{padding: '16px 24px', borderBottom: '1px solid rgba(100,180,120,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <div>
                                                <div style={{fontWeight: 600, fontSize: 15}}>
                                                    {s.name || 'Без имени'}
                                                    <span style={{marginLeft: 8, fontSize: 12, color: '#8cc8a0', fontWeight: 400}}>VK ID: {s.vk_id}</span>
                                                </div>
                                                <div style={{marginTop: 4}}>
                                                    <span style={{padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                                        background: s.role === 'admin' ? 'rgba(64,192,87,0.2)' : s.role === 'kitchen' ? 'rgba(255,193,7,0.2)' : 'rgba(82,183,136,0.2)',
                                                        color: s.role === 'admin' ? '#5cdb7e' : s.role === 'kitchen' ? '#FFD060' : '#60c0e8'
                                                    }}>
                                                        {s.role === 'admin' ? '👑 Админ' : s.role === 'kitchen' ? '👨‍🍳 Кухня' : '🚗 Курьер'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button className="btn btn-danger" onClick={() => removeStaffMember(s.id)}>
                                                <i className="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div style={{marginTop: 16, padding: 16, background: 'rgba(30,60,42,0.5)', borderRadius: 12, fontSize: 13, color: '#8cc8a0', lineHeight: 1.6}}>
                                <i className="fa-solid fa-info-circle" style={{marginRight: 6}}></i>
                                Сотрудники получают уведомления в личные сообщения VK. Чтобы узнать VK ID — попросите сотрудника написать боту <code style={{background:'rgba(64,192,87,0.2)', padding:'2px 6px', borderRadius: 4}}>/start</code>, затем посмотрите логи бота.
                            </div>
                        </div>
                    )}

                    {tab === 'zones' && (
                        <div>
                            <div className="panel glass">
                                <div className="panel-header">
                                    <h2><i className="fa-solid fa-map-location-dot" style={{marginRight: 8}}></i>Зоны доставки</h2>
                                    <button className="btn btn-success" onClick={() => { setNewZone({name:'',cost:'',free_from:'',enabled:true,sort_order:0,keywords:''}); setZoneModal('new'); }}>
                                        <i className="fa-solid fa-plus"></i> Добавить
                                    </button>
                                </div>
                                {zones.length === 0 ? (
                                    <div className="empty"><i className="fa-solid fa-map" style={{fontSize: 32, marginBottom: 12, display: 'block'}}></i>Нет зон доставки</div>
                                ) : (
                                    zones.map(zone => (
                                        <div key={zone.id} className="zone-item">
                                            <div className="zone-top">
                                                <div className="zone-info">
                                                    <div className="zone-name">
                                                        {zone.name}
                                                        <span className={`zone-tag ${zone.enabled ? 'on' : 'off'}`}>{zone.enabled ? 'Вкл' : 'Выкл'}</span>
                                                    </div>
                                                    <div className="zone-meta">
                                                        <span><i className="fa-solid fa-ruble-sign" style={{marginRight: 4}}></i>{zone.cost}₽</span>
                                                        {zone.free_from && <span><i className="fa-solid fa-gift" style={{marginRight: 4}}></i>Бесплатно от {zone.free_from}₽</span>}
                                                        <span><i className="fa-solid fa-arrow-down-short-wide" style={{marginRight: 4}}></i>Порядок: {zone.sort_order}</span>
                                                    </div>
                                                    {zone.keywords && (
                                                        <div className="zone-keywords">
                                                            <i className="fa-solid fa-key" style={{marginRight: 4}}></i>{zone.keywords}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="zone-actions">
                                                    <button className="btn btn-primary" onClick={() => openEditZone(zone)}><i className="fa-solid fa-pen"></i></button>
                                                    <button className="btn btn-danger" onClick={() => deleteZone(zone.id)}><i className="fa-solid fa-trash"></i></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div style={{marginTop: 16, padding: 16, background: 'rgba(30,60,42,0.5)', borderRadius: 12, fontSize: 13, color: '#8cc8a0', lineHeight: 1.6}}>
                                <i className="fa-solid fa-info-circle" style={{marginRight: 6}}></i>
                                Ключевые слова через запятую — бот определяет зону по адресу заказа. Бот читает зоны из базы данных при каждом заказе.
                            </div>
                        </div>
                    )}

                    {tab === 'categories' && (
                        <div>
                            <div className="panel glass">
                                <div className="panel-header">
                                    <h2><i className="fa-solid fa-tags" style={{marginRight: 8}}></i>Категории меню</h2>
                                    <button className="btn btn-success" onClick={() => { setNewCat({name:'',icon:'fa-utensils',sort_order:0}); setCatModal('new'); }}>
                                        <i className="fa-solid fa-plus"></i> Добавить
                                    </button>
                                </div>
                                {categories.length === 0 ? (
                                    <div className="empty"><i className="fa-solid fa-tag" style={{fontSize: 32, marginBottom: 12, display: 'block'}}></i>Нет категорий</div>
                                ) : (
                                    categories.map(cat => (
                                        <div key={cat.id} className="zone-item">
                                            <div className="zone-top">
                                                <div className="zone-info">
                                                    <div className="zone-name">
                                                        <i className={`fa-solid ${cat.icon}`} style={{marginRight: 8}}></i>{cat.name}
                                                    </div>
                                                    <div className="zone-meta">
                                                        <span>Порядок: {cat.sort_order}</span>
                                                    </div>
                                                </div>
                                                <div className="zone-actions">
                                                    <button className="btn btn-primary" onClick={() => openEditCategory(cat)}><i className="fa-solid fa-pen"></i></button>
                                                    <button className="btn btn-danger" onClick={() => deleteCategory(cat.id)}><i className="fa-solid fa-trash"></i></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div style={{marginTop: 16, padding: 16, background: 'rgba(30,60,42,0.5)', borderRadius: 12, fontSize: 13, color: '#8cc8a0', lineHeight: 1.6}}>
                                <i className="fa-solid fa-info-circle" style={{marginRight: 6}}></i>
                                Категории используются в меню и в боте. Иконки — классы FontAwesome (fa-pizza-slice, fa-bowl-food, fa-leaf и т.д.).
                            </div>
                        </div>
                    )}

                    {orderDetail && (
                        <div className="modal-overlay" onClick={() => setOrderDetail(null)}>
                            <div className="modal glass neo" onClick={(e) => e.stopPropagation()}>
                                <h2><i className="fa-solid fa-box" style={{marginRight: 8}}></i>Заказ #{orderDetail.id}</h2>
                                <div className="detail-grid">
                                    <div>
                                        <div className="order-detail-label">Статус</div>
                                        <div className="order-detail-value"><span className={`order-badge badge-${orderDetail.status}`}>{STATUS_MAP[orderDetail.status]}</span></div>
                                    </div>
                                    <div>
                                        <div className="order-detail-label">Получение</div>
                                        <div className="order-detail-value"><i className={`fa-solid ${DELIVERY_ICON[orderDetail.delivery_type]}`} style={{marginRight: 6}}></i>{orderDetail.delivery_type === 'delivery' ? 'Доставка' : 'Самовывоз'}</div>
                                    </div>
                                    {orderDetail.address && (
                                        <div style={{gridColumn: '1/3'}}>
                                            <div className="order-detail-label">Адрес</div>
                                            <div className="order-detail-value"><i className="fa-solid fa-location-dot" style={{marginRight: 6}}></i>{orderDetail.address}</div>
                                        </div>
                                    )}
                                    {orderDetail.payment_method && (
                                        <div>
                                            <div className="order-detail-label">Оплата</div>
                                            <div className="order-detail-value"><i className={`fa-solid ${PAYMENT_ICON[orderDetail.payment_method]}`} style={{marginRight: 6}}></i>{PAYMENT_LABEL[orderDetail.payment_method]}</div>
                                        </div>
                                    )}
                                </div>
                                <div className="order-detail-label">Состав заказа</div>
                                <div className="order-detail-items">
                                    {orderDetail.items && orderDetail.items.map((item, idx) => (
                                        <div key={idx} className="order-detail-row">
                                            <span>{item.name}</span>
                                            <span className="order-detail-qty">×{item.quantity}</span>
                                            <span style={{fontWeight: 600}}>{item.price * item.quantity}₽</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="order-detail-total">
                                    <span>Итого</span>
                                    <span style={{color: '#5cdb7e'}}>{orderDetail.total_price}₽</span>
                                </div>
                                <div className="btn-row">
                                    <button className="btn btn-ghost" onClick={() => setOrderDetail(null)}><i className="fa-solid fa-xmark"></i> Закрыть</button>
                                    {orderDetail.status !== 'delivered' && orderDetail.status !== 'cancelled' && nextStatus(orderDetail.status, orderDetail.delivery_type) && (
                                        <button className="btn btn-success" onClick={() => { updateStatus(orderDetail.id, nextStatus(orderDetail.status, orderDetail.delivery_type)); setOrderDetail(null); }}>
                                            <i className="fa-solid fa-arrow-right"></i>
                                            {orderDetail.delivery_type === 'pickup' && STATUS_LABEL_PICKUP[nextStatus(orderDetail.status, orderDetail.delivery_type)] || STATUS_MAP[nextStatus(orderDetail.status, orderDetail.delivery_type)]}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {menuModal !== null && (
                        <div className="modal-overlay" onClick={() => setMenuModal(null)}>
                            <div className="modal glass neo" onClick={(e) => e.stopPropagation()}>
                                <h2><i className={`fa-solid ${menuModal === 'new' ? 'fa-plus' : 'fa-pen'}`} style={{marginRight: 8}}></i>{menuModal === 'new' ? 'Новое блюдо' : 'Редактировать'}</h2>
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Название</label>
                                <input placeholder="Рамен классический" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Описание</label>
                                <input placeholder="Традиционный японский рамен" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Цена (₽)</label>
                                <input placeholder="380" type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Категория</label>
                                <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                <div className="btn-row">
                                    <button className="btn btn-ghost" onClick={() => setMenuModal(null)}><i className="fa-solid fa-xmark"></i> Отмена</button>
                                    <button className="btn btn-success" onClick={saveMenuItem}><i className="fa-solid fa-check"></i> Сохранить</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {staffModal && (
                        <div className="modal-overlay" onClick={() => setStaffModal(false)}>
                            <div className="modal glass neo" onClick={(e) => e.stopPropagation()}>
                                <h2><i className="fa-solid fa-user-plus" style={{marginRight: 8}}></i>Добавить сотрудника</h2>
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>VK ID</label>
                                <input placeholder="Числовой ID из VK" type="number" value={newStaff.vk_id} onChange={e => setNewStaff({...newStaff, vk_id: e.target.value})} />
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Имя (необязательно)</label>
                                <input placeholder="Иван" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Роль</label>
                                <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                                    <option value="admin">👑 Админ</option>
                                    <option value="kitchen">👨‍🍳 Кухня</option>
                                    <option value="courier">🚗 Курьер</option>
                                </select>
                                <div className="btn-row">
                                    <button className="btn btn-ghost" onClick={() => setStaffModal(false)}><i className="fa-solid fa-xmark"></i> Отмена</button>
                                    <button className="btn btn-success" onClick={addStaffMember}><i className="fa-solid fa-check"></i> Добавить</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {zoneModal !== null && (
                        <div className="modal-overlay" onClick={() => setZoneModal(null)}>
                            <div className="modal glass neo" onClick={(e) => e.stopPropagation()}>
                                <h2><i className={`fa-solid ${zoneModal === 'new' ? 'fa-plus' : 'fa-pen'}`} style={{marginRight: 8}}></i>{zoneModal === 'new' ? 'Новая зона' : 'Редактировать зону'}</h2>
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Название</label>
                                <input placeholder="Например: Город Родники" value={newZone.name} onChange={e => setNewZone({...newZone, name: e.target.value})} />
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Стоимость доставки (₽)</label>
                                <input placeholder="200" type="number" value={newZone.cost} onChange={e => setNewZone({...newZone, cost: e.target.value})} />
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Бесплатно от (₽)</label>
                                <input placeholder="Оставьте пустым, если не нужно" type="number" value={newZone.free_from} onChange={e => setNewZone({...newZone, free_from: e.target.value})} />
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Порядок сортировки</label>
                                <input placeholder="0 — первая зона" type="number" value={newZone.sort_order} onChange={e => setNewZone({...newZone, sort_order: e.target.value})} />
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Ключевые слова (через запятую)</label>
                                <textarea placeholder="родники,ул.,улица,пер." value={newZone.keywords} onChange={e => setNewZone({...newZone, keywords: e.target.value})} rows={4} style={{width:'100%',padding:'12px 14px',background:'rgba(15,26,20,0.8)',border:'1px solid rgba(100,180,120,0.25)',borderRadius:10,color:'#e0f0e5',fontSize:14,marginBottom:12,fontFamily:'inherit',outline:'none',resize:'vertical'}} />
                                <label style={{display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', fontSize: 14, cursor: 'pointer'}}>
                                    <input type="checkbox" checked={newZone.enabled} onChange={e => setNewZone({...newZone, enabled: e.target.checked})} style={{width: 18, height: 18}} />
                                    Зона активна
                                </label>
                                <div className="btn-row">
                                    <button className="btn btn-ghost" onClick={() => setZoneModal(null)}><i className="fa-solid fa-xmark"></i> Отмена</button>
                                    <button className="btn btn-success" onClick={saveZone}><i className="fa-solid fa-check"></i> Сохранить</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {catModal !== null && (
                        <div className="modal-overlay" onClick={() => setCatModal(null)}>
                            <div className="modal glass neo" onClick={(e) => e.stopPropagation()}>
                                <h2><i className={`fa-solid ${catModal === 'new' ? 'fa-plus' : 'fa-pen'}`} style={{marginRight: 8}}></i>{catModal === 'new' ? 'Новая категория' : 'Редактировать категорию'}</h2>
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Название</label>
                                <input placeholder="Пицца" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} />
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Иконка (FontAwesome)</label>
                                <input placeholder="fa-pizza-slice" value={newCat.icon} onChange={e => setNewCat({...newCat, icon: e.target.value})} />
                                <label style={{fontSize: 12, color: '#8cc8a0', marginBottom: 4, display: 'block'}}>Порядок сортировки</label>
                                <input placeholder="0" type="number" value={newCat.sort_order} onChange={e => setNewCat({...newCat, sort_order: e.target.value})} />
                                <div className="btn-row">
                                    <button className="btn btn-ghost" onClick={() => setCatModal(null)}><i className="fa-solid fa-xmark"></i> Отмена</button>
                                    <button className="btn btn-success" onClick={saveCategory}><i className="fa-solid fa-check"></i> Сохранить</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        ReactDOM.render(<App />, document.getElementById('root'));