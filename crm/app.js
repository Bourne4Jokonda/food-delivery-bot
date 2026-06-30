const {
  useState,
  useEffect,
  useCallback
} = React;
const isInVK = !!(window.VKBridge && window.VKBridge.send);
const API_BASE = window.VK_MINI_APP_CONFIG && window.VK_MINI_APP_CONFIG.API_URL || window.location.origin + '/api';
if (isInVK) {
  window.VKBridge.send('VKWebAppInit');
}
const API = API_BASE;
let _authCallback = null;
const apiFetch = (url, opts = {}) => {
  const key = localStorage.getItem('crm_api_key') || '';
  const h = {
    'X-API-Key': key,
    ...(opts.headers || {})
  };
  return fetch(url, {
    ...opts,
    headers: h
  }).then(r => {
    if (r.status === 401 && _authCallback) {
      localStorage.removeItem('crm_api_key');
      _authCallback(false);
    }
    return r;
  });
};
const STATUS_MAP = {
  new: 'Новый',
  confirmed: 'Подтвержден',
  preparing: 'Готовится',
  ready: 'Готов',
  delivering: 'В доставке',
  delivered: 'Доставлен',
  cancelled: 'Отменён'
};
const STATUS_FLOW_DELIVERY = ['new', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered'];
const STATUS_FLOW_PICKUP = ['new', 'confirmed', 'preparing', 'ready', 'delivered'];
const DELIVERY_ICON = {
  delivery: 'fa-truck',
  pickup: 'fa-store'
};
const PAYMENT_ICON = {
  card: 'fa-credit-card',
  cash: 'fa-money-bill-wave'
};
const PAYMENT_LABEL = {
  card: 'Карта',
  cash: 'Наличные'
};
const CAT_MAP = {
  'Пицца': 'cat-pizza',
  'Рамен': 'cat-ramen',
  'Салаты': 'cat-salads',
  'Бургеры': 'cat-burgers',
  'Снэки': 'cat-snacks',
  'Напитки': 'cat-drinks'
};
const CAT_ICON = {
  'Пицца': 'fa-pizza-slice',
  'Рамен': 'fa-bowl-food',
  'Салаты': 'fa-leaf',
  'Бургеры': 'fa-burger',
  'Снэки': 'fa-french-fries',
  'Напитки': 'fa-wine-glass'
};
const STATUS_LABEL_PICKUP = {
  delivered: 'Выдать'
};
const App = () => {
  const [authed, setAuthed] = useState(!!localStorage.getItem('crm_api_key'));
  _authCallback = setAuthed;
  const [loginKey, setLoginKey] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [stats, setStats] = useState({
    orders: 0,
    revenue: 0
  });
  const [weekStats, setWeekStats] = useState({
    orders: 0,
    revenue: 0
  });
  const [orderDetail, setOrderDetail] = useState(null);
  const [menuModal, setMenuModal] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Пицца'
  });
  const [botStatus, setBotStatus] = useState({
    running: false,
    pid: null,
    uptime: null
  });
  const [botLogs, setBotLogs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [staffModal, setStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    vk_id: '',
    role: 'kitchen',
    name: ''
  });
  const [zones, setZones] = useState([]);
  const [zoneModal, setZoneModal] = useState(null);
  const [newZone, setNewZone] = useState({
    name: '',
    cost: '',
    free_from: '',
    enabled: true,
    sort_order: 0,
    keywords: ''
  });
  const doLogin = async () => {
    setLoginError('');
    try {
      const r = await fetch(`${API}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: loginKey
        })
      });
      if (r.ok) {
        localStorage.setItem('crm_api_key', loginKey);
        setAuthed(true);
      } else {
        setLoginError('Неверный ключ');
      }
    } catch (e) {
      setLoginError('Ошибка соединения');
    }
  };
  const doLogout = () => {
    localStorage.removeItem('crm_api_key');
    setAuthed(false);
    setLoginKey('');
  };
  const load = useCallback(async () => {
    try {
      const [o, m, s, w] = await Promise.all([apiFetch(`${API}/orders`).then(r => r.ok ? r.json() : []), apiFetch(`${API}/menu`).then(r => r.ok ? r.json() : []), apiFetch(`${API}/stats`).then(r => r.ok ? r.json() : {
        orders: 0,
        revenue: 0
      }), apiFetch(`${API}/stats/week`).then(r => r.ok ? r.json() : {
        orders: 0,
        revenue: 0
      })]);
      setOrders(Array.isArray(o) ? o : []);
      setMenu(Array.isArray(m) ? m : []);
      setStats(s);
      setWeekStats(w);
    } catch (e) {
      console.error(e);
    }
  }, []);
  const loadBotStatus = useCallback(async () => {
    try {
      const r = await apiFetch(`${API}/bot/status`);
      const s = r.ok ? await r.json() : {
        running: false,
        pid: null,
        uptime: null
      };
      setBotStatus(s);
    } catch (e) {
      console.error(e);
    }
  }, []);
  const loadBotLogs = useCallback(async () => {
    try {
      const r = await apiFetch(`${API}/bot/logs?lines=30`);
      const l = r.ok ? await r.json() : {
        lines: []
      };
      setBotLogs(l.lines || []);
    } catch (e) {
      console.error(e);
    }
  }, []);
  const loadStaff = useCallback(async () => {
    try {
      const r = await apiFetch(`${API}/staff`);
      const s = r.ok ? await r.json() : [];
      setStaff(Array.isArray(s) ? s : []);
    } catch (e) {
      console.error(e);
    }
  }, []);
  const loadZones = useCallback(async () => {
    try {
      const r = await apiFetch(`${API}/delivery-zones`);
      const z = r.ok ? await r.json() : [];
      setZones(Array.isArray(z) ? z : []);
    } catch (e) {
      console.error(e);
    }
  }, []);
  useEffect(() => {
    load();
    loadBotStatus();
    loadStaff();
    loadZones();
    const t = setInterval(() => {
      load();
      loadBotStatus();
      loadStaff();
      loadZones();
    }, 10000);
    return () => clearInterval(t);
  }, [load, loadBotStatus, loadStaff, loadZones]);
  useEffect(() => {
    if (tab === 'bot') {
      loadBotLogs();
      const t = setInterval(loadBotLogs, 5000);
      return () => clearInterval(t);
    }
  }, [tab, loadBotLogs]);
  const updateStatus = async (id, status) => {
    await apiFetch(`${API}/orders/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status
      })
    });
    load();
  };
  const nextStatus = (current, deliveryType) => {
    const flow = deliveryType === 'pickup' ? STATUS_FLOW_PICKUP : STATUS_FLOW_DELIVERY;
    const idx = flow.indexOf(current);
    return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
  };
  const openOrderDetail = async orderId => {
    try {
      const res = await apiFetch(`${API}/orders/${orderId}`);
      const data = await res.json();
      setOrderDetail(data);
    } catch (e) {
      console.error(e);
    }
  };
  const saveMenuItem = async () => {
    const body = {
      ...newItem,
      price: parseFloat(newItem.price)
    };
    if (menuModal === 'new') {
      await apiFetch(`${API}/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    } else {
      await apiFetch(`${API}/menu/${menuModal}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    }
    setMenuModal(null);
    setNewItem({
      name: '',
      description: '',
      price: '',
      category: 'Пицца'
    });
    load();
  };
  const deleteMenuItem = async id => {
    if (!confirm('Удалить блюдо?')) return;
    await apiFetch(`${API}/menu/${id}`, {
      method: 'DELETE'
    });
    load();
  };
  const openEdit = item => {
    setNewItem({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category
    });
    setMenuModal(item.id);
  };
  const botAction = async action => {
    await apiFetch(`${API}/bot/${action}`, {
      method: 'POST'
    });
    setTimeout(loadBotStatus, 1000);
  };
  const addStaffMember = async () => {
    const body = {
      vk_id: parseInt(newStaff.vk_id),
      role: newStaff.role,
      name: newStaff.name
    };
    if (isNaN(body.vk_id)) return alert('Введите числовой VK ID');
    await apiFetch(`${API}/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    setStaffModal(false);
    setNewStaff({
      vk_id: '',
      role: 'kitchen',
      name: ''
    });
    loadStaff();
  };
  const removeStaffMember = async id => {
    if (!confirm('Убрать сотрудника? Он станет клиентом.')) return;
    await apiFetch(`${API}/staff/${id}`, {
      method: 'DELETE'
    });
    loadStaff();
  };
  const saveZone = async () => {
    const body = {
      name: newZone.name,
      cost: parseFloat(newZone.cost) || 0,
      free_from: newZone.free_from ? parseFloat(newZone.free_from) : null,
      enabled: newZone.enabled,
      sort_order: parseInt(newZone.sort_order) || 0,
      keywords: newZone.keywords
    };
    if (!body.name) return alert('Введите название зоны');
    if (zoneModal === 'new') {
      await apiFetch(`${API}/delivery-zones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    } else {
      await apiFetch(`${API}/delivery-zones/${zoneModal}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    }
    setZoneModal(null);
    setNewZone({
      name: '',
      cost: '',
      free_from: '',
      enabled: true,
      sort_order: 0,
      keywords: ''
    });
    loadZones();
  };
  const deleteZone = async id => {
    if (!confirm('Удалить зону доставки?')) return;
    await apiFetch(`${API}/delivery-zones/${id}`, {
      method: 'DELETE'
    });
    loadZones();
  };
  const openEditZone = zone => {
    setNewZone({
      name: zone.name,
      cost: zone.cost,
      free_from: zone.free_from || '',
      enabled: zone.enabled,
      sort_order: zone.sort_order,
      keywords: zone.keywords || ''
    });
    setZoneModal(zone.id);
  };
  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  if (!authed) {
    return /*#__PURE__*/React.createElement("div", {
      className: "app",
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "glass neo",
      style: {
        padding: 40,
        width: 380,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 48,
        marginBottom: 16
      }
    }, "🍕"), /*#__PURE__*/React.createElement("h2", {
      style: {
        marginBottom: 8,
        color: '#e0f0e5'
      }
    }, "Вкусная Доставка — CRM"), /*#__PURE__*/React.createElement("p", {
      style: {
        color: '#8cc8a0',
        marginBottom: 24,
        fontSize: 14
      }
    }, "Введите API-ключ для доступа"), /*#__PURE__*/React.createElement("input", {
      type: "password",
      placeholder: "API ключ",
      value: loginKey,
      onChange: e => setLoginKey(e.target.value),
      onKeyDown: e => {
        if (e.key === 'Enter') doLogin();
      },
      style: {
        width: '100%',
        padding: '12px 14px',
        background: 'rgba(15,26,20,0.8)',
        border: '1px solid rgba(100,180,120,0.25)',
        borderRadius: 10,
        color: '#e0f0e5',
        fontSize: 14,
        marginBottom: 12,
        outline: 'none',
        textAlign: 'center'
      }
    }), loginError && /*#__PURE__*/React.createElement("div", {
      style: {
        color: '#f87171',
        fontSize: 13,
        marginBottom: 12
      }
    }, loginError), /*#__PURE__*/React.createElement("button", {
      className: "btn btn-success",
      onClick: doLogin,
      style: {
        width: '100%',
        padding: '12px 0',
        fontSize: 14
      }
    }, "Войти")));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement("div", {
    className: "header glass"
  }, /*#__PURE__*/React.createElement("h1", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-burger",
    style: {
      marginRight: 10
    }
  }), "Вкусная Доставка — CRM"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    className: "refresh",
    onClick: load
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-rotate"
  }), " Обновить"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: doLogout,
    style: {
      marginLeft: 8
    }
  }, "🚪 Выйти"))), /*#__PURE__*/React.createElement("div", {
    className: "stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-card glass neo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "icon c1"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-receipt"
  })), /*#__PURE__*/React.createElement("h3", null, "Заказов сегодня"), /*#__PURE__*/React.createElement("div", {
    className: "value c1"
  }, stats.orders)), /*#__PURE__*/React.createElement("div", {
    className: "stat-card glass neo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "icon c2"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-ruble-sign"
  })), /*#__PURE__*/React.createElement("h3", null, "Выручка сегодня"), /*#__PURE__*/React.createElement("div", {
    className: "value c2"
  }, stats.revenue, "₽")), /*#__PURE__*/React.createElement("div", {
    className: "stat-card glass neo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "icon c3"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-calendar-week"
  })), /*#__PURE__*/React.createElement("h3", null, "За неделю"), /*#__PURE__*/React.createElement("div", {
    className: "value c3"
  }, weekStats.orders, " заказов")), /*#__PURE__*/React.createElement("div", {
    className: "stat-card glass neo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "icon c4"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-chart-line"
  })), /*#__PURE__*/React.createElement("h3", null, "Выручка за неделю"), /*#__PURE__*/React.createElement("div", {
    className: "value c4"
  }, weekStats.revenue, "₽"))), /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: `tab ${tab === 'orders' ? 'active' : ''}`,
    onClick: () => setTab('orders')
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-box"
  }), " Заказы ", /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, activeOrders.length)), /*#__PURE__*/React.createElement("button", {
    className: `tab ${tab === 'menu' ? 'active' : ''}`,
    onClick: () => setTab('menu')
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-utensils"
  }), " Меню ", /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, menu.length)), /*#__PURE__*/React.createElement("button", {
    className: `tab ${tab === 'bot' ? 'active' : ''}`,
    onClick: () => setTab('bot')
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-robot"
  }), " Бот ", /*#__PURE__*/React.createElement("span", {
    className: "badge",
    style: {
      background: botStatus.running ? 'rgba(64,192,87,0.3)' : 'rgba(220,60,60,0.25)',
      color: botStatus.running ? '#5cdb7e' : '#f87171'
    }
  }, botStatus.running ? 'ON' : 'OFF')), /*#__PURE__*/React.createElement("button", {
    className: `tab ${tab === 'staff' ? 'active' : ''}`,
    onClick: () => setTab('staff')
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-users"
  }), " Сотрудники"), /*#__PURE__*/React.createElement("button", {
    className: `tab ${tab === 'zones' ? 'active' : ''}`,
    onClick: () => setTab('zones')
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-map-location-dot"
  }), " Зоны")), tab === 'orders' && /*#__PURE__*/React.createElement("div", {
    className: "panel glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-header"
  }, /*#__PURE__*/React.createElement("h2", null, "Заказы")), orders.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-inbox",
    style: {
      fontSize: 32,
      marginBottom: 12,
      display: 'block'
    }
  }), "Нет заказов") : orders.map(order => /*#__PURE__*/React.createElement("div", {
    key: order.id,
    className: "order-item",
    onClick: () => openOrderDetail(order.id)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "order-id"
  }, "#", order.id), /*#__PURE__*/React.createElement("span", {
    className: `order-badge badge-${order.status}`,
    style: {
      marginLeft: 8
    }
  }, STATUS_MAP[order.status])), /*#__PURE__*/React.createElement("div", {
    className: "order-meta"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${DELIVERY_ICON[order.delivery_type]}`
  }), " ", order.delivery_type === 'delivery' ? 'Доставка' : 'Самовывоз'), order.address && /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-location-dot"
  }), " ", order.address), order.payment_method && /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${PAYMENT_ICON[order.payment_method]}`
  }), " ", PAYMENT_LABEL[order.payment_method]), order.created_at && /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-regular fa-clock"
  }), " ", new Date(order.created_at).toLocaleString('ru-RU')))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "order-price"
  }, order.total_price, "₽"), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, order.status !== 'delivered' && order.status !== 'cancelled' && nextStatus(order.status, order.delivery_type) && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success",
    onClick: e => {
      e.stopPropagation();
      updateStatus(order.id, nextStatus(order.status, order.delivery_type));
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-arrow-right"
  }), order.delivery_type === 'pickup' && STATUS_LABEL_PICKUP[nextStatus(order.status, order.delivery_type)] || STATUS_MAP[nextStatus(order.status, order.delivery_type)]), order.status !== 'delivered' && order.status !== 'cancelled' && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-danger",
    onClick: e => {
      e.stopPropagation();
      updateStatus(order.id, 'cancelled');
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-xmark"
  }))))))), tab === 'menu' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "panel-header glass",
    style: {
      marginBottom: 16,
      borderRadius: 16
    }
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-utensils",
    style: {
      marginRight: 8
    }
  }), "Меню"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success",
    onClick: () => {
      setNewItem({
        name: '',
        description: '',
        price: '',
        category: 'Пицца'
      });
      setMenuModal('new');
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " Добавить")), /*#__PURE__*/React.createElement("div", {
    className: "menu-grid"
  }, menu.map(item => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    className: `menu-card glass neo ${CAT_MAP[item.category] || ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-top"
  }, /*#__PURE__*/React.createElement("h4", null, item.name), /*#__PURE__*/React.createElement("span", {
    className: "category-tag"
  }, /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${CAT_ICON[item.category] || 'fa-utensils'}`,
    style: {
      marginRight: 4
    }
  }), item.category)), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, item.description), /*#__PURE__*/React.createElement("div", {
    className: "price"
  }, item.price, "₽"), /*#__PURE__*/React.createElement("div", {
    className: "card-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => openEdit(item)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-pen"
  }), " Ред."), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-danger",
    onClick: () => deleteMenuItem(item.id)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-trash"
  }))))))), tab === 'bot' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "panel glass",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-header"
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-robot",
    style: {
      marginRight: 8
    }
  }), "Управление ботом")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 12,
      height: 12,
      borderRadius: '50%',
      background: botStatus.running ? '#5cdb7e' : '#f87171',
      boxShadow: botStatus.running ? '0 0 12px rgba(64,192,87,0.5)' : '0 0 12px rgba(220,60,60,0.5)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600
    }
  }, botStatus.running ? 'Бот работает' : 'Бот остановлен')), botStatus.running && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 16,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'rgba(64,192,87,0.08)',
      padding: 14,
      borderRadius: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8cc8a0',
      textTransform: 'uppercase',
      marginBottom: 4
    }
  }, "PID"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700
    }
  }, botStatus.pid)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'rgba(64,192,87,0.08)',
      padding: 14,
      borderRadius: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8cc8a0',
      textTransform: 'uppercase',
      marginBottom: 4
    }
  }, "Время работы"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700
    }
  }, botStatus.uptime || '—')), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'rgba(64,192,87,0.08)',
      padding: 14,
      borderRadius: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#8cc8a0',
      textTransform: 'uppercase',
      marginBottom: 4
    }
  }, "RAM"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700
    }
  }, botStatus.ram_mb ? botStatus.ram_mb + ' MB' : '—'))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, !botStatus.running ? /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success",
    onClick: () => botAction('start'),
    style: {
      padding: '12px 28px',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-play"
  }), " Запустить") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-danger",
    onClick: () => botAction('stop'),
    style: {
      padding: '12px 28px',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-stop"
  }), " Остановить"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => botAction('restart'),
    style: {
      padding: '12px 28px',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-rotate"
  }), " Перезапустить")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => {
      loadBotStatus();
      loadBotLogs();
    },
    style: {
      padding: '12px 28px',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-rotate"
  }), " Обновить")))), /*#__PURE__*/React.createElement("div", {
    className: "panel glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-header"
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-terminal",
    style: {
      marginRight: 8
    }
  }), "Логи бота")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      maxHeight: 400,
      overflowY: 'auto',
      fontFamily: 'monospace',
      fontSize: 12,
      lineHeight: 1.6,
      color: '#8cc8a0'
    }
  }, botLogs.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: 20,
      opacity: 0.5
    }
  }, "Нет логов") : botLogs.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: '2px 0',
      borderBottom: '1px solid rgba(100,180,120,0.08)'
    }
  }, line))))), tab === 'staff' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "panel glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-header"
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-users",
    style: {
      marginRight: 8
    }
  }), "Сотрудники"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success",
    onClick: () => setStaffModal(true)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " Добавить")), staff.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-user-slash",
    style: {
      fontSize: 32,
      marginBottom: 12,
      display: 'block'
    }
  }), "Нет сотрудников. Добавьте кухню и курьера по VK ID.") : staff.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: {
      padding: '16px 24px',
      borderBottom: '1px solid rgba(100,180,120,0.08)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, s.name || 'Без имени', /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 8,
      fontSize: 12,
      color: '#8cc8a0',
      fontWeight: 400
    }
  }, "VK ID: ", s.vk_id)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '3px 10px',
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 600,
      background: s.role === 'admin' ? 'rgba(64,192,87,0.2)' : s.role === 'kitchen' ? 'rgba(255,193,7,0.2)' : 'rgba(82,183,136,0.2)',
      color: s.role === 'admin' ? '#5cdb7e' : s.role === 'kitchen' ? '#FFD060' : '#60c0e8'
    }
  }, s.role === 'admin' ? '👑 Админ' : s.role === 'kitchen' ? '👨‍🍳 Кухня' : '🚗 Курьер'))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-danger",
    onClick: () => removeStaffMember(s.id)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-trash"
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      padding: 16,
      background: 'rgba(30,60,42,0.5)',
      borderRadius: 12,
      fontSize: 13,
      color: '#8cc8a0',
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-info-circle",
    style: {
      marginRight: 6
    }
  }), "Сотрудники получают уведомления в личные сообщения VK. Чтобы узнать VK ID — попросите сотрудника написать боту ", /*#__PURE__*/React.createElement("code", {
    style: {
      background: 'rgba(64,192,87,0.2)',
      padding: '2px 6px',
      borderRadius: 4
    }
  }, "/start"), ", затем посмотрите логи бота.")), tab === 'zones' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "panel glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-header"
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-map-location-dot",
    style: {
      marginRight: 8
    }
  }), "Зоны доставки"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success",
    onClick: () => {
      setNewZone({
        name: '',
        cost: '',
        free_from: '',
        enabled: true,
        sort_order: 0,
        keywords: ''
      });
      setZoneModal('new');
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " Добавить")), zones.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-map",
    style: {
      fontSize: 32,
      marginBottom: 12,
      display: 'block'
    }
  }), "Нет зон доставки") : zones.map(zone => /*#__PURE__*/React.createElement("div", {
    key: zone.id,
    className: "zone-item"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zone-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zone-info"
  }, /*#__PURE__*/React.createElement("div", {
    className: "zone-name"
  }, zone.name, /*#__PURE__*/React.createElement("span", {
    className: `zone-tag ${zone.enabled ? 'on' : 'off'}`
  }, zone.enabled ? 'Вкл' : 'Выкл')), /*#__PURE__*/React.createElement("div", {
    className: "zone-meta"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-ruble-sign",
    style: {
      marginRight: 4
    }
  }), zone.cost, "₽"), zone.free_from && /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-gift",
    style: {
      marginRight: 4
    }
  }), "Бесплатно от ", zone.free_from, "₽"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-arrow-down-short-wide",
    style: {
      marginRight: 4
    }
  }), "Порядок: ", zone.sort_order)), zone.keywords && /*#__PURE__*/React.createElement("div", {
    className: "zone-keywords"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-key",
    style: {
      marginRight: 4
    }
  }), zone.keywords)), /*#__PURE__*/React.createElement("div", {
    className: "zone-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => openEditZone(zone)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-pen"
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-danger",
    onClick: () => deleteZone(zone.id)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-trash"
  }))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      padding: 16,
      background: 'rgba(30,60,42,0.5)',
      borderRadius: 12,
      fontSize: 13,
      color: '#8cc8a0',
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-info-circle",
    style: {
      marginRight: 6
    }
  }), "Ключевые слова через запятую — бот определяет зону по адресу заказа. Бот читает зоны из базы данных при каждом заказе.")), orderDetail && /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: () => setOrderDetail(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal glass neo",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-box",
    style: {
      marginRight: 8
    }
  }), "Заказ #", orderDetail.id), /*#__PURE__*/React.createElement("div", {
    className: "detail-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "order-detail-label"
  }, "Статус"), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-value"
  }, /*#__PURE__*/React.createElement("span", {
    className: `order-badge badge-${orderDetail.status}`
  }, STATUS_MAP[orderDetail.status]))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "order-detail-label"
  }, "Получение"), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-value"
  }, /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${DELIVERY_ICON[orderDetail.delivery_type]}`,
    style: {
      marginRight: 6
    }
  }), orderDetail.delivery_type === 'delivery' ? 'Доставка' : 'Самовывоз')), orderDetail.address && /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1/3'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "order-detail-label"
  }, "Адрес"), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-value"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-location-dot",
    style: {
      marginRight: 6
    }
  }), orderDetail.address)), orderDetail.payment_method && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "order-detail-label"
  }, "Оплата"), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-value"
  }, /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${PAYMENT_ICON[orderDetail.payment_method]}`,
    style: {
      marginRight: 6
    }
  }), PAYMENT_LABEL[orderDetail.payment_method]))), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-label"
  }, "Состав заказа"), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-items"
  }, orderDetail.items && orderDetail.items.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "order-detail-row"
  }, /*#__PURE__*/React.createElement("span", null, item.name), /*#__PURE__*/React.createElement("span", {
    className: "order-detail-qty"
  }, "×", item.quantity), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, item.price * item.quantity, "₽")))), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-total"
  }, /*#__PURE__*/React.createElement("span", null, "Итого"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#5cdb7e'
    }
  }, orderDetail.total_price, "₽")), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setOrderDetail(null)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-xmark"
  }), " Закрыть"), orderDetail.status !== 'delivered' && orderDetail.status !== 'cancelled' && nextStatus(orderDetail.status, orderDetail.delivery_type) && /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success",
    onClick: () => {
      updateStatus(orderDetail.id, nextStatus(orderDetail.status, orderDetail.delivery_type));
      setOrderDetail(null);
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-arrow-right"
  }), orderDetail.delivery_type === 'pickup' && STATUS_LABEL_PICKUP[nextStatus(orderDetail.status, orderDetail.delivery_type)] || STATUS_MAP[nextStatus(orderDetail.status, orderDetail.delivery_type)])))), menuModal !== null && /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: () => setMenuModal(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal glass neo",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${menuModal === 'new' ? 'fa-plus' : 'fa-pen'}`,
    style: {
      marginRight: 8
    }
  }), menuModal === 'new' ? 'Новое блюдо' : 'Редактировать'), /*#__PURE__*/React.createElement("input", {
    placeholder: "Название",
    value: newItem.name,
    onChange: e => setNewItem({
      ...newItem,
      name: e.target.value
    })
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Описание",
    value: newItem.description,
    onChange: e => setNewItem({
      ...newItem,
      description: e.target.value
    })
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Цена (₽)",
    type: "number",
    value: newItem.price,
    onChange: e => setNewItem({
      ...newItem,
      price: e.target.value
    })
  }), /*#__PURE__*/React.createElement("select", {
    value: newItem.category,
    onChange: e => setNewItem({
      ...newItem,
      category: e.target.value
    })
  }, ['Пицца', 'Рамен', 'Салаты', 'Бургеры', 'Снэки', 'Напитки'].map(c => /*#__PURE__*/React.createElement("option", {
    key: c,
    value: c
  }, c))), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setMenuModal(null)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-xmark"
  }), " Отмена"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success",
    onClick: saveMenuItem
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-check"
  }), " Сохранить")))), staffModal && /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: () => setStaffModal(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal glass neo",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-user-plus",
    style: {
      marginRight: 8
    }
  }), "Добавить сотрудника"), /*#__PURE__*/React.createElement("input", {
    placeholder: "VK ID (число)",
    type: "number",
    value: newStaff.vk_id,
    onChange: e => setNewStaff({
      ...newStaff,
      vk_id: e.target.value
    })
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Имя (необязательно)",
    value: newStaff.name,
    onChange: e => setNewStaff({
      ...newStaff,
      name: e.target.value
    })
  }), /*#__PURE__*/React.createElement("select", {
    value: newStaff.role,
    onChange: e => setNewStaff({
      ...newStaff,
      role: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: "admin"
  }, "👑 Админ"), /*#__PURE__*/React.createElement("option", {
    value: "kitchen"
  }, "👨‍🍳 Кухня"), /*#__PURE__*/React.createElement("option", {
    value: "courier"
  }, "🚗 Курьер")), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setStaffModal(false)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-xmark"
  }), " Отмена"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success",
    onClick: addStaffMember
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-check"
  }), " Добавить")))), zoneModal !== null && /*#__PURE__*/React.createElement("div", {
    className: "modal-overlay",
    onClick: () => setZoneModal(null)
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal glass neo",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${zoneModal === 'new' ? 'fa-plus' : 'fa-pen'}`,
    style: {
      marginRight: 8
    }
  }), zoneModal === 'new' ? 'Новая зона' : 'Редактировать зону'), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: '#8cc8a0',
      marginBottom: 4,
      display: 'block'
    }
  }, "Название"), /*#__PURE__*/React.createElement("input", {
    placeholder: "Например: Город Родники",
    value: newZone.name,
    onChange: e => setNewZone({
      ...newZone,
      name: e.target.value
    })
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: '#8cc8a0',
      marginBottom: 4,
      display: 'block'
    }
  }, "Стоимость доставки (₽)"), /*#__PURE__*/React.createElement("input", {
    placeholder: "200",
    type: "number",
    value: newZone.cost,
    onChange: e => setNewZone({
      ...newZone,
      cost: e.target.value
    })
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: '#8cc8a0',
      marginBottom: 4,
      display: 'block'
    }
  }, "Бесплатно от (₽)"), /*#__PURE__*/React.createElement("input", {
    placeholder: "Оставьте пустым, если не нужно",
    type: "number",
    value: newZone.free_from,
    onChange: e => setNewZone({
      ...newZone,
      free_from: e.target.value
    })
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: '#8cc8a0',
      marginBottom: 4,
      display: 'block'
    }
  }, "Порядок сортировки"), /*#__PURE__*/React.createElement("input", {
    placeholder: "0 — первая зона",
    type: "number",
    value: newZone.sort_order,
    onChange: e => setNewZone({
      ...newZone,
      sort_order: e.target.value
    })
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: '#8cc8a0',
      marginBottom: 4,
      display: 'block'
    }
  }, "Ключевые слова (через запятую)"), /*#__PURE__*/React.createElement("input", {
    placeholder: "родники,ул.,улица,пер.",
    value: newZone.keywords,
    onChange: e => setNewZone({
      ...newZone,
      keywords: e.target.value
    })
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 0',
      fontSize: 14,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: newZone.enabled,
    onChange: e => setNewZone({
      ...newZone,
      enabled: e.target.checked
    }),
    style: {
      width: 18,
      height: 18
    }
  }), "Зона активна"), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setZoneModal(null)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-xmark"
  }), " Отмена"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success",
    onClick: saveZone
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-check"
  }), " Сохранить")))));
};
ReactDOM.render(/*#__PURE__*/React.createElement(App, null), document.getElementById('root'));
