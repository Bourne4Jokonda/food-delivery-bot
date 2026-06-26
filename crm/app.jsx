const { useState, useEffect, useCallback } = React;

        const isInVK = false;
        const API_BASE = (window.VK_MINI_APP_CONFIG && window.VK_MINI_APP_CONFIG.API_URL) || (window.location.origin + '/api');

        if (isInVK) {
            window.VKBridge.send('VKWebAppInit');
        }

        const API = API_BASE;

        const STATUS_MAP = {
            new: 'РќРѕРІС‹Р№', confirmed: 'РџРѕРґС‚РІРµСЂР¶РґРµРЅ', preparing: 'Р“РѕС‚РѕРІРёС‚СЃСЏ',
            ready: 'Р“РѕС‚РѕРІ', delivering: 'Р’ РґРѕСЃС‚Р°РІРєРµ', delivered: 'Р”РѕСЃС‚Р°РІР»РµРЅ', cancelled: 'РћС‚РјРµРЅС‘РЅ'
        };
        const STATUS_FLOW_DELIVERY = ['new', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered'];
        const STATUS_FLOW_PICKUP = ['new', 'confirmed', 'preparing', 'ready', 'delivered'];
        const DELIVERY_ICON = { delivery: 'fa-truck', pickup: 'fa-store' };
        const PAYMENT_ICON = { card: 'fa-credit-card', cash: 'fa-money-bill-wave', online: 'fa-globe' };
        const PAYMENT_LABEL = { card: 'РљР°СЂС‚Р°', cash: 'РќР°Р»РёС‡РЅС‹Рµ', online: 'РћРЅР»Р°Р№РЅ' };
        const CAT_MAP = { 'РџРёС†С†Р°': 'cat-pizza', 'Р Р°РјРµРЅ': 'cat-ramen', 'РЎР°Р»Р°С‚С‹': 'cat-salads', 'Р‘СѓСЂРіРµСЂС‹': 'cat-burgers', 'РЎРЅСЌРєРё': 'cat-snacks', 'РќР°РїРёС‚РєРё': 'cat-drinks' };
        const CAT_ICON = { 'РџРёС†С†Р°': 'fa-pizza-slice', 'Р Р°РјРµРЅ': 'fa-bowl-food', 'РЎР°Р»Р°С‚С‹': 'fa-leaf', 'Р‘СѓСЂРіРµСЂС‹': 'fa-burger', 'РЎРЅСЌРєРё': 'fa-french-fries', 'РќР°РїРёС‚РєРё': 'fa-wine-glass' };
        const STATUS_LABEL_PICKUP = { delivered: 'Р’С‹РґР°С‚СЊ' };

        const App = () => {
            const [tab, setTab] = useState('orders');
            const [orders, setOrders] = useState([]);
            const [menu, setMenu] = useState([]);
            const [stats, setStats] = useState({ orders: 0, revenue: 0 });
            const [weekStats, setWeekStats] = useState({ orders: 0, revenue: 0 });
            const [orderDetail, setOrderDetail] = useState(null);
            const [menuModal, setMenuModal] = useState(null);
            const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category: 'РџРёС†С†Р°' });
            const [botStatus, setBotStatus] = useState({ running: false, pid: null, uptime: null });
            const [botLogs, setBotLogs] = useState([]);
            const [staff, setStaff] = useState([]);
            const [staffModal, setStaffModal] = useState(false);
            const [newStaff, setNewStaff] = useState({ vk_id: '', role: 'kitchen', name: '' });

            const load = useCallback(async () => {
                try {
                    const [o, m, s, w] = await Promise.all([
                        fetch(`${API}/orders`).then(r => r.json()),
                        fetch(`${API}/menu`).then(r => r.json()),
                        fetch(`${API}/stats`).then(r => r.json()),
                        fetch(`${API}/stats/week`).then(r => r.json())
                    ]);
                    setOrders(o); setMenu(m); setStats(s); setWeekStats(w);
                } catch (e) { console.error(e); }
            }, []);

            const loadBotStatus = useCallback(async () => {
                try {
                    const s = await fetch(`${API}/bot/status`).then(r => r.json());
                    setBotStatus(s);
                } catch (e) { console.error(e); }
            }, []);

            const loadBotLogs = useCallback(async () => {
                try {
                    const l = await fetch(`${API}/bot/logs?lines=30`).then(r => r.json());
                    setBotLogs(l.lines || []);
                } catch (e) { console.error(e); }
            }, []);

            const loadStaff = useCallback(async () => {
                try {
                    const s = await fetch(`${API}/staff`).then(r => r.json());
                    setStaff(s);
                } catch (e) { console.error(e); }
            }, []);

            useEffect(() => { load(); loadBotStatus(); loadStaff(); const t = setInterval(() => { load(); loadBotStatus(); loadStaff(); }, 10000); return () => clearInterval(t); }, [load, loadBotStatus, loadStaff]);
            useEffect(() => { if (tab === 'bot') { loadBotLogs(); const t = setInterval(loadBotLogs, 5000); return () => clearInterval(t); } }, [tab, loadBotLogs]);

            const updateStatus = async (id, status) => {
                await fetch(`${API}/orders/${id}/status`, {
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
                    const res = await fetch(`${API}/orders/${orderId}`);
                    const data = await res.json();
                    setOrderDetail(data);
                } catch (e) { console.error(e); }
            };

            const saveMenuItem = async () => {
                const body = { ...newItem, price: parseFloat(newItem.price) };
                if (menuModal === 'new') {
                    await fetch(`${API}/menu`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
                } else {
                    await fetch(`${API}/menu/${menuModal}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
                }
                setMenuModal(null);
                setNewItem({ name: '', description: '', price: '', category: 'РџРёС†С†Р°' });
                load();
            };

            const deleteMenuItem = async (id) => {
                if (!confirm('РЈРґР°Р»РёС‚СЊ Р±Р»СЋРґРѕ?')) return;
                await fetch(`${API}/menu/${id}`, { method: 'DELETE' });
                load();
            };

            const openEdit = (item) => {
                setNewItem({ name: item.name, description: item.description, price: item.price, category: item.category });
                setMenuModal(item.id);
            };

            const botAction = async (action) => {
                await fetch(`${API}/bot/${action}`, { method: 'POST' });
                setTimeout(loadBotStatus, 1000);
            };

            const addStaffMember = async () => {
                const body = { vk_id: parseInt(newStaff.vk_id), role: newStaff.role, name: newStaff.name };
                if (isNaN(body.vk_id)) return alert('Р’РІРµРґРёС‚Рµ С‡РёСЃР»РѕРІРѕР№ VK ID');
                await fetch(`${API}/staff`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
                setStaffModal(false);
                setNewStaff({ vk_id: '', role: 'kitchen', name: '' });
                loadStaff();
            };

            const removeStaffMember = async (id) => {
                if (!confirm('РЈР±СЂР°С‚СЊ СЃРѕС‚СЂСѓРґРЅРёРєР°? РћРЅ СЃС‚Р°РЅРµС‚ РєР»РёРµРЅС‚РѕРј.')) return;
                await fetch(`${API}/staff/${id}`, { method: 'DELETE' });
                loadStaff();
            };

            const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');

            return (
                <div className="app">
                    <div className="header glass">
                        <h1><i className="fa-solid fa-burger" style={{marginRight: 10}}></i>Р’РєСѓСЃРЅР°СЏ Р”РѕСЃС‚Р°РІРєР° вЂ” CRM</h1>
                        <button className="refresh" onClick={load}><i className="fa-solid fa-rotate"></i> РћР±РЅРѕРІРёС‚СЊ</button>
                    </div>

                    <div className="stats">
                        <div className="stat-card glass neo">
                            <div className="icon c1"><i className="fa-solid fa-receipt"></i></div>
                            <h3>Р—Р°РєР°Р·РѕРІ СЃРµРіРѕРґРЅСЏ</h3>
                            <div className="value c1">{stats.orders}</div>
                        </div>
                        <div className="stat-card glass neo">
                            <div className="icon c2"><i className="fa-solid fa-ruble-sign"></i></div>
                            <h3>Р’С‹СЂСѓС‡РєР° СЃРµРіРѕРґРЅСЏ</h3>
                            <div className="value c2">{stats.revenue}в‚Ѕ</div>
                        </div>
                        <div className="stat-card glass neo">
                            <div className="icon c3"><i className="fa-solid fa-calendar-week"></i></div>
                            <h3>Р—Р° РЅРµРґРµР»СЋ</h3>
                            <div className="value c3">{weekStats.orders} Р·Р°РєР°Р·РѕРІ</div>
                        </div>
                        <div className="stat-card glass neo">
                            <div className="icon c4"><i className="fa-solid fa-chart-line"></i></div>
                            <h3>Р’С‹СЂСѓС‡РєР° Р·Р° РЅРµРґРµР»СЋ</h3>
                            <div className="value c4">{weekStats.revenue}в‚Ѕ</div>
                        </div>
                    </div>

                    <div className="tabs">
                        <button className={`tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>
                            <i className="fa-solid fa-box"></i> Р—Р°РєР°Р·С‹ <span className="badge">{activeOrders.length}</span>
                        </button>
                        <button className={`tab ${tab === 'menu' ? 'active' : ''}`} onClick={() => setTab('menu')}>
                            <i className="fa-solid fa-utensils"></i> РњРµРЅСЋ <span className="badge">{menu.length}</span>
                        </button>
                        <button className={`tab ${tab === 'bot' ? 'active' : ''}`} onClick={() => setTab('bot')}>
                            <i className="fa-solid fa-robot"></i> Р‘РѕС‚ <span className="badge" style={{background: botStatus.running ? 'rgba(64,192,87,0.25)' : 'rgba(180,60,60,0.2)', color: botStatus.running ? '#40C057' : '#e88'}}>{botStatus.running ? 'ON' : 'OFF'}</span>
                        </button>
                        <button className={`tab ${tab === 'staff' ? 'active' : ''}`} onClick={() => setTab('staff')}>
                            <i className="fa-solid fa-users"></i> РЎРѕС‚СЂСѓРґРЅРёРєРё
                        </button>
                    </div>

                    {tab === 'orders' && (
                        <div className="panel glass">
                            <div className="panel-header">
                                <h2>Р—Р°РєР°Р·С‹</h2>
                            </div>
                            {orders.length === 0 ? (
                                <div className="empty"><i className="fa-solid fa-inbox" style={{fontSize: 32, marginBottom: 12, display: 'block'}}></i>РќРµС‚ Р·Р°РєР°Р·РѕРІ</div>
                            ) : (
                                orders.map(order => (
                                    <div key={order.id} className="order-item" onClick={() => openOrderDetail(order.id)}>
                                        <div style={{flex: 1}}>
                                            <div>
                                                <span className="order-id">#{order.id}</span>
                                                <span className={`order-badge badge-${order.status}`} style={{marginLeft: 8}}>{STATUS_MAP[order.status]}</span>
                                            </div>
                                            <div className="order-meta">
                                                <span><i className={`fa-solid ${DELIVERY_ICON[order.delivery_type]}`}></i> {order.delivery_type === 'delivery' ? 'Р”РѕСЃС‚Р°РІРєР°' : 'РЎР°РјРѕРІС‹РІРѕР·'}</span>
                                                {order.address && <span><i className="fa-solid fa-location-dot"></i> {order.address}</span>}
                                                {order.payment_method && <span><i className={`fa-solid ${PAYMENT_ICON[order.payment_method]}`}></i> {PAYMENT_LABEL[order.payment_method]}</span>}
                                                {order.created_at && <span><i className="fa-regular fa-clock"></i> {new Date(order.created_at).toLocaleString('ru-RU')}</span>}
                                            </div>
                                        </div>
                                        <div style={{textAlign: 'right'}}>
                                            <div className="order-price">{order.total_price}в‚Ѕ</div>
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
                                <h2><i className="fa-solid fa-utensils" style={{marginRight: 8}}></i>РњРµРЅСЋ</h2>
                                <button className="btn btn-success" onClick={() => { setNewItem({name:'',description:'',price:'',category:'РџРёС†С†Р°'}); setMenuModal('new'); }}>
                                    <i className="fa-solid fa-plus"></i> Р”РѕР±Р°РІРёС‚СЊ
                                </button>
                            </div>
                            <div className="menu-grid">
                                {menu.map(item => (
                                    <div key={item.id} className={`menu-card glass neo ${CAT_MAP[item.category] || ''}`}>
                                        <div className="card-top">
                                            <h4>{item.name}</h4>
                                            <span className="category-tag"><i className={`fa-solid ${CAT_ICON[item.category] || 'fa-utensils'}`} style={{marginRight: 4}}></i>{item.category}</span>
                                        </div>
                                        <div className="desc">{item.description}</div>
                                        <div className="price">{item.price}в‚Ѕ</div>
                                        <div className="card-actions">
                                            <button className="btn btn-primary" onClick={() => openEdit(item)}><i className="fa-solid fa-pen"></i> Р РµРґ.</button>
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
                                    <h2><i className="fa-solid fa-robot" style={{marginRight: 8}}></i>РЈРїСЂР°РІР»РµРЅРёРµ Р±РѕС‚РѕРј</h2>
                                </div>
                                <div style={{padding: 24}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20}}>
                                        <div style={{width: 12, height: 12, borderRadius: '50%', background: botStatus.running ? '#40C057' : '#e55', boxShadow: botStatus.running ? '0 0 12px rgba(64,192,87,0.5)' : '0 0 12px rgba(238,85,85,0.5)'}}></div>
                                        <span style={{fontSize: 18, fontWeight: 600}}>{botStatus.running ? 'Р‘РѕС‚ СЂР°Р±РѕС‚Р°РµС‚' : 'Р‘РѕС‚ РѕСЃС‚Р°РЅРѕРІР»РµРЅ'}</span>
                                    </div>
                                    {botStatus.running && (
                                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20}}>
                                            <div style={{background: 'rgba(64,192,87,0.08)', padding: 14, borderRadius: 12}}>
                                                <div style={{fontSize: 11, color: '#95D5B2', textTransform: 'uppercase', marginBottom: 4}}>PID</div>
                                                <div style={{fontSize: 18, fontWeight: 700}}>{botStatus.pid}</div>
                                            </div>
                                            <div style={{background: 'rgba(64,192,87,0.08)', padding: 14, borderRadius: 12}}>
                                                <div style={{fontSize: 11, color: '#95D5B2', textTransform: 'uppercase', marginBottom: 4}}>Р’СЂРµРјСЏ СЂР°Р±РѕС‚С‹</div>
                                                <div style={{fontSize: 18, fontWeight: 700}}>{botStatus.uptime || 'вЂ”'}</div>
                                            </div>
                                            <div style={{background: 'rgba(64,192,87,0.08)', padding: 14, borderRadius: 12}}>
                                                <div style={{fontSize: 11, color: '#95D5B2', textTransform: 'uppercase', marginBottom: 4}}>RAM</div>
                                                <div style={{fontSize: 18, fontWeight: 700}}>{botStatus.ram_mb ? botStatus.ram_mb + ' MB' : 'вЂ”'}</div>
                                            </div>
                                        </div>
                                    )}
                                    <div style={{display: 'flex', gap: 10}}>
                                        {!botStatus.running ? (
                                            <button className="btn btn-success" onClick={() => botAction('start')} style={{padding: '12px 28px', fontSize: 14}}>
                                                <i className="fa-solid fa-play"></i> Р—Р°РїСѓСЃС‚РёС‚СЊ
                                            </button>
                                        ) : (
                                            <>
                                                <button className="btn btn-danger" onClick={() => botAction('stop')} style={{padding: '12px 28px', fontSize: 14}}>
                                                    <i className="fa-solid fa-stop"></i> РћСЃС‚Р°РЅРѕРІРёС‚СЊ
                                                </button>
                                                <button className="btn btn-primary" onClick={() => botAction('restart')} style={{padding: '12px 28px', fontSize: 14}}>
                                                    <i className="fa-solid fa-rotate"></i> РџРµСЂРµР·Р°РїСѓСЃС‚РёС‚СЊ
                                                </button>
                                            </>
                                        )}
                                        <button className="btn btn-ghost" onClick={() => { loadBotStatus(); loadBotLogs(); }} style={{padding: '12px 28px', fontSize: 14}}>
                                            <i className="fa-solid fa-rotate"></i> РћР±РЅРѕРІРёС‚СЊ
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="panel glass">
                                <div className="panel-header">
                                    <h2><i className="fa-solid fa-terminal" style={{marginRight: 8}}></i>Р›РѕРіРё Р±РѕС‚Р°</h2>
                                </div>
                                <div style={{padding: 16, maxHeight: 400, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, color: '#95D5B2'}}>
                                    {botLogs.length === 0 ? (
                                        <div style={{textAlign: 'center', padding: 20, opacity: 0.5}}>РќРµС‚ Р»РѕРіРѕРІ</div>
                                    ) : (
                                        botLogs.map((line, i) => <div key={i} style={{padding: '2px 0', borderBottom: '1px solid rgba(119,200,148,0.05)'}}>{line}</div>)
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'staff' && (
                        <div>
                            <div className="panel glass">
                                <div className="panel-header">
                                    <h2><i className="fa-solid fa-users" style={{marginRight: 8}}></i>РЎРѕС‚СЂСѓРґРЅРёРєРё</h2>
                                    <button className="btn btn-success" onClick={() => setStaffModal(true)}>
                                        <i className="fa-solid fa-plus"></i> Р”РѕР±Р°РІРёС‚СЊ
                                    </button>
                                </div>
                                {staff.length === 0 ? (
                                    <div className="empty"><i className="fa-solid fa-user-slash" style={{fontSize: 32, marginBottom: 12, display: 'block'}}></i>РќРµС‚ СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ. Р”РѕР±Р°РІСЊС‚Рµ РєСѓС…РЅСЋ Рё РєСѓСЂСЊРµСЂР° РїРѕ VK ID.</div>
                                ) : (
                                    staff.map(s => (
                                        <div key={s.id} style={{padding: '16px 24px', borderBottom: '1px solid rgba(119,200,148,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <div>
                                                <div style={{fontWeight: 600, fontSize: 15}}>
                                                    {s.name || 'Р‘РµР· РёРјРµРЅРё'}
                                                    <span style={{marginLeft: 8, fontSize: 12, color: '#95D5B2', fontWeight: 400}}>VK ID: {s.vk_id}</span>
                                                </div>
                                                <div style={{marginTop: 4}}>
                                                    <span style={{padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                                        background: s.role === 'admin' ? 'rgba(64,192,87,0.2)' : s.role === 'kitchen' ? 'rgba(255,193,7,0.2)' : 'rgba(82,183,136,0.2)',
                                                        color: s.role === 'admin' ? '#40C057' : s.role === 'kitchen' ? '#FFC107' : '#52B788'
                                                    }}>
                                                        {s.role === 'admin' ? 'рџ‘‘ РђРґРјРёРЅ' : s.role === 'kitchen' ? 'рџ‘ЁвЂЌрџЌі РљСѓС…РЅСЏ' : 'рџљ— РљСѓСЂСЊРµСЂ'}
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
                            <div style={{marginTop: 16, padding: 16, background: 'rgba(119,200,148,0.06)', borderRadius: 12, fontSize: 13, color: '#95D5B2', lineHeight: 1.6}}>
                                <i className="fa-solid fa-info-circle" style={{marginRight: 6}}></i>
                                РЎРѕС‚СЂСѓРґРЅРёРєРё РїРѕР»СѓС‡Р°СЋС‚ СѓРІРµРґРѕРјР»РµРЅРёСЏ РІ Р»РёС‡РЅС‹Рµ СЃРѕРѕР±С‰РµРЅРёСЏ VK. Р§С‚РѕР±С‹ СѓР·РЅР°С‚СЊ VK ID вЂ” РїРѕРїСЂРѕСЃРёС‚Рµ СЃРѕС‚СЂСѓРґРЅРёРєР° РЅР°РїРёСЃР°С‚СЊ Р±РѕС‚Сѓ <code style={{background:'rgba(64,192,87,0.15)', padding:'2px 6px', borderRadius: 4}}>/start</code>, Р·Р°С‚РµРј РїРѕСЃРјРѕС‚СЂРёС‚Рµ Р»РѕРіРё Р±РѕС‚Р°.
                            </div>
                        </div>
                    )}

                    {orderDetail && (
                        <div className="modal-overlay" onClick={() => setOrderDetail(null)}>
                            <div className="modal glass neo" onClick={(e) => e.stopPropagation()}>
                                <h2><i className="fa-solid fa-box" style={{marginRight: 8}}></i>Р—Р°РєР°Р· #{orderDetail.id}</h2>
                                <div className="detail-grid">
                                    <div>
                                        <div className="order-detail-label">РЎС‚Р°С‚СѓСЃ</div>
                                        <div className="order-detail-value"><span className={`order-badge badge-${orderDetail.status}`}>{STATUS_MAP[orderDetail.status]}</span></div>
                                    </div>
                                    <div>
                                        <div className="order-detail-label">РџРѕР»СѓС‡РµРЅРёРµ</div>
                                        <div className="order-detail-value"><i className={`fa-solid ${DELIVERY_ICON[orderDetail.delivery_type]}`} style={{marginRight: 6}}></i>{orderDetail.delivery_type === 'delivery' ? 'Р”РѕСЃС‚Р°РІРєР°' : 'РЎР°РјРѕРІС‹РІРѕР·'}</div>
                                    </div>
                                    {orderDetail.address && (
                                        <div style={{gridColumn: '1/3'}}>
                                            <div className="order-detail-label">РђРґСЂРµСЃ</div>
                                            <div className="order-detail-value"><i className="fa-solid fa-location-dot" style={{marginRight: 6}}></i>{orderDetail.address}</div>
                                        </div>
                                    )}
                                    {orderDetail.payment_method && (
                                        <div>
                                            <div className="order-detail-label">РћРїР»Р°С‚Р°</div>
                                            <div className="order-detail-value"><i className={`fa-solid ${PAYMENT_ICON[orderDetail.payment_method]}`} style={{marginRight: 6}}></i>{PAYMENT_LABEL[orderDetail.payment_method]}</div>
                                        </div>
                                    )}
                                </div>
                                <div className="order-detail-label">РЎРѕСЃС‚Р°РІ Р·Р°РєР°Р·Р°</div>
                                <div className="order-detail-items">
                                    {orderDetail.items && orderDetail.items.map((item, idx) => (
                                        <div key={idx} className="order-detail-row">
                                            <span>{item.name}</span>
                                            <span className="order-detail-qty">Г—{item.quantity}</span>
                                            <span style={{fontWeight: 600}}>{item.price * item.quantity}в‚Ѕ</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="order-detail-total">
                                    <span>РС‚РѕРіРѕ</span>
                                    <span style={{color: '#40C057'}}>{orderDetail.total_price}в‚Ѕ</span>
                                </div>
                                <div className="btn-row">
                                    <button className="btn btn-ghost" onClick={() => setOrderDetail(null)}><i className="fa-solid fa-xmark"></i> Р—Р°РєСЂС‹С‚СЊ</button>
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
                                <h2><i className={`fa-solid ${menuModal === 'new' ? 'fa-plus' : 'fa-pen'}`} style={{marginRight: 8}}></i>{menuModal === 'new' ? 'РќРѕРІРѕРµ Р±Р»СЋРґРѕ' : 'Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ'}</h2>
                                <input placeholder="РќР°Р·РІР°РЅРёРµ" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                                <input placeholder="РћРїРёСЃР°РЅРёРµ" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                                <input placeholder="Р¦РµРЅР° (в‚Ѕ)" type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                                <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                                    {['РџРёС†С†Р°','Р Р°РјРµРЅ','РЎР°Р»Р°С‚С‹','Р‘СѓСЂРіРµСЂС‹','РЎРЅСЌРєРё','РќР°РїРёС‚РєРё'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <div className="btn-row">
                                    <button className="btn btn-ghost" onClick={() => setMenuModal(null)}><i className="fa-solid fa-xmark"></i> РћС‚РјРµРЅР°</button>
                                    <button className="btn btn-success" onClick={saveMenuItem}><i className="fa-solid fa-check"></i> РЎРѕС…СЂР°РЅРёС‚СЊ</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {staffModal && (
                        <div className="modal-overlay" onClick={() => setStaffModal(false)}>
                            <div className="modal glass neo" onClick={(e) => e.stopPropagation()}>
                                <h2><i className="fa-solid fa-user-plus" style={{marginRight: 8}}></i>Р”РѕР±Р°РІРёС‚СЊ СЃРѕС‚СЂСѓРґРЅРёРєР°</h2>
                                <input placeholder="VK ID (С‡РёСЃР»Рѕ)" type="number" value={newStaff.vk_id} onChange={e => setNewStaff({...newStaff, vk_id: e.target.value})} />
                                <input placeholder="РРјСЏ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
                                <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                                    <option value="admin">рџ‘‘ РђРґРјРёРЅ</option>
                                    <option value="kitchen">рџ‘ЁвЂЌрџЌі РљСѓС…РЅСЏ</option>
                                    <option value="courier">рџљ— РљСѓСЂСЊРµСЂ</option>
                                </select>
                                <div className="btn-row">
                                    <button className="btn btn-ghost" onClick={() => setStaffModal(false)}><i className="fa-solid fa-xmark"></i> РћС‚РјРµРЅР°</button>
                                    <button className="btn btn-success" onClick={addStaffMember}><i className="fa-solid fa-check"></i> Р”РѕР±Р°РІРёС‚СЊ</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        ReactDOM.render(<App />, document.getElementById('root'));
