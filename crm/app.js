const {
  useState,
  useEffect,
  useCallback
} = React;
const isInVK = false;
const API_BASE = window.VK_MINI_APP_CONFIG && window.VK_MINI_APP_CONFIG.API_URL || window.location.origin + '/api';
if (isInVK) {
  window.VKBridge.send('VKWebAppInit');
}
const API = API_BASE;
const STATUS_MAP = {
  new: '╨Э╨╛╨▓╤Л╨╣',
  confirmed: '╨Я╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜',
  preparing: '╨У╨╛╤В╨╛╨▓╨╕╤В╤Б╤П',
  ready: '╨У╨╛╤В╨╛╨▓',
  delivering: '╨Т ╨┤╨╛╤Б╤В╨░╨▓╨║╨╡',
  delivered: '╨Ф╨╛╤Б╤В╨░╨▓╨╗╨╡╨╜',
  cancelled: '╨Ю╤В╨╝╨╡╨╜╤С╨╜'
};
const STATUS_FLOW_DELIVERY = ['new', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered'];
const STATUS_FLOW_PICKUP = ['new', 'confirmed', 'preparing', 'ready', 'delivered'];
const DELIVERY_ICON = {
  delivery: 'fa-truck',
  pickup: 'fa-store'
};
const PAYMENT_ICON = {
  card: 'fa-credit-card',
  cash: 'fa-money-bill-wave',
  online: 'fa-globe'
};
const PAYMENT_LABEL = {
  card: '╨Ъ╨░╤А╤В╨░',
  cash: '╨Э╨░╨╗╨╕╤З╨╜╤Л╨╡',
  online: '╨Ю╨╜╨╗╨░╨╣╨╜'
};
const CAT_MAP = {
  '╨Я╨╕╤Ж╤Ж╨░': 'cat-pizza',
  '╨а╨░╨╝╨╡╨╜': 'cat-ramen',
  '╨б╨░╨╗╨░╤В╤Л': 'cat-salads',
  '╨С╤Г╤А╨│╨╡╤А╤Л': 'cat-burgers',
  '╨б╨╜╤Н╨║╨╕': 'cat-snacks',
  '╨Э╨░╨┐╨╕╤В╨║╨╕': 'cat-drinks'
};
const CAT_ICON = {
  '╨Я╨╕╤Ж╤Ж╨░': 'fa-pizza-slice',
  '╨а╨░╨╝╨╡╨╜': 'fa-bowl-food',
  '╨б╨░╨╗╨░╤В╤Л': 'fa-leaf',
  '╨С╤Г╤А╨│╨╡╤А╤Л': 'fa-burger',
  '╨б╨╜╤Н╨║╨╕': 'fa-french-fries',
  '╨Э╨░╨┐╨╕╤В╨║╨╕': 'fa-wine-glass'
};
const STATUS_LABEL_PICKUP = {
  delivered: '╨Т╤Л╨┤╨░╤В╤М'
};
const App = () => {
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
    category: '╨Я╨╕╤Ж╤Ж╨░'
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
  const load = useCallback(async () => {
    try {
      const [o, m, s, w] = await Promise.all([fetch(`${API}/orders`).then(r => r.json()), fetch(`${API}/menu`).then(r => r.json()), fetch(`${API}/stats`).then(r => r.json()), fetch(`${API}/stats/week`).then(r => r.json())]);
      setOrders(o);
      setMenu(m);
      setStats(s);
      setWeekStats(w);
    } catch (e) {
      console.error(e);
    }
  }, []);
  const loadBotStatus = useCallback(async () => {
    try {
      const s = await fetch(`${API}/bot/status`).then(r => r.json());
      setBotStatus(s);
    } catch (e) {
      console.error(e);
    }
  }, []);
  const loadBotLogs = useCallback(async () => {
    try {
      const l = await fetch(`${API}/bot/logs?lines=30`).then(r => r.json());
      setBotLogs(l.lines || []);
    } catch (e) {
      console.error(e);
    }
  }, []);
  const loadStaff = useCallback(async () => {
    try {
      const s = await fetch(`${API}/staff`).then(r => r.json());
      setStaff(s);
    } catch (e) {
      console.error(e);
    }
  }, []);
  useEffect(() => {
    load();
    loadBotStatus();
    loadStaff();
    const t = setInterval(() => {
      load();
      loadBotStatus();
      loadStaff();
    }, 10000);
    return () => clearInterval(t);
  }, [load, loadBotStatus, loadStaff]);
  useEffect(() => {
    if (tab === 'bot') {
      loadBotLogs();
      const t = setInterval(loadBotLogs, 5000);
      return () => clearInterval(t);
    }
  }, [tab, loadBotLogs]);
  const updateStatus = async (id, status) => {
    await fetch(`${API}/orders/${id}/status`, {
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
      const res = await fetch(`${API}/orders/${orderId}`);
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
      await fetch(`${API}/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    } else {
      await fetch(`${API}/menu/${menuModal}`, {
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
      category: '╨Я╨╕╤Ж╤Ж╨░'
    });
    load();
  };
  const deleteMenuItem = async id => {
    if (!confirm('╨г╨┤╨░╨╗╨╕╤В╤М ╨▒╨╗╤О╨┤╨╛?')) return;
    await fetch(`${API}/menu/${id}`, {
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
    await fetch(`${API}/bot/${action}`, {
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
    if (isNaN(body.vk_id)) return alert('╨Т╨▓╨╡╨┤╨╕╤В╨╡ ╤З╨╕╤Б╨╗╨╛╨▓╨╛╨╣ VK ID');
    await fetch(`${API}/staff`, {
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
    if (!confirm('╨г╨▒╤А╨░╤В╤М ╤Б╨╛╤В╤А╤Г╨┤╨╜╨╕╨║╨░? ╨Ю╨╜ ╤Б╤В╨░╨╜╨╡╤В ╨║╨╗╨╕╨╡╨╜╤В╨╛╨╝.')) return;
    await fetch(`${API}/staff/${id}`, {
      method: 'DELETE'
    });
    loadStaff();
  };
  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement("div", {
    className: "header glass"
  }, /*#__PURE__*/React.createElement("h1", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-burger",
    style: {
      marginRight: 10
    }
  }), "╨Т╨║╤Г╤Б╨╜╨░╤П ╨Ф╨╛╤Б╤В╨░╨▓╨║╨░ тАФ CRM"), /*#__PURE__*/React.createElement("button", {
    className: "refresh",
    onClick: load
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-rotate"
  }), " ╨Ю╨▒╨╜╨╛╨▓╨╕╤В╤М")), /*#__PURE__*/React.createElement("div", {
    className: "stats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stat-card glass neo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "icon c1"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-receipt"
  })), /*#__PURE__*/React.createElement("h3", null, "╨Ч╨░╨║╨░╨╖╨╛╨▓ ╤Б╨╡╨│╨╛╨┤╨╜╤П"), /*#__PURE__*/React.createElement("div", {
    className: "value c1"
  }, stats.orders)), /*#__PURE__*/React.createElement("div", {
    className: "stat-card glass neo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "icon c2"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-ruble-sign"
  })), /*#__PURE__*/React.createElement("h3", null, "╨Т╤Л╤А╤Г╤З╨║╨░ ╤Б╨╡╨│╨╛╨┤╨╜╤П"), /*#__PURE__*/React.createElement("div", {
    className: "value c2"
  }, stats.revenue, "тВ╜")), /*#__PURE__*/React.createElement("div", {
    className: "stat-card glass neo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "icon c3"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-calendar-week"
  })), /*#__PURE__*/React.createElement("h3", null, "╨Ч╨░ ╨╜╨╡╨┤╨╡╨╗╤О"), /*#__PURE__*/React.createElement("div", {
    className: "value c3"
  }, weekStats.orders, " ╨╖╨░╨║╨░╨╖╨╛╨▓")), /*#__PURE__*/React.createElement("div", {
    className: "stat-card glass neo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "icon c4"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-chart-line"
  })), /*#__PURE__*/React.createElement("h3", null, "╨Т╤Л╤А╤Г╤З╨║╨░ ╨╖╨░ ╨╜╨╡╨┤╨╡╨╗╤О"), /*#__PURE__*/React.createElement("div", {
    className: "value c4"
  }, weekStats.revenue, "тВ╜"))), /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, /*#__PURE__*/React.createElement("button", {
    className: `tab ${tab === 'orders' ? 'active' : ''}`,
    onClick: () => setTab('orders')
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-box"
  }), " ╨Ч╨░╨║╨░╨╖╤Л ", /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, activeOrders.length)), /*#__PURE__*/React.createElement("button", {
    className: `tab ${tab === 'menu' ? 'active' : ''}`,
    onClick: () => setTab('menu')
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-utensils"
  }), " ╨Ь╨╡╨╜╤О ", /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, menu.length)), /*#__PURE__*/React.createElement("button", {
    className: `tab ${tab === 'bot' ? 'active' : ''}`,
    onClick: () => setTab('bot')
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-robot"
  }), " ╨С╨╛╤В ", /*#__PURE__*/React.createElement("span", {
    className: "badge",
    style: {
      background: botStatus.running ? 'rgba(64,192,87,0.25)' : 'rgba(180,60,60,0.2)',
      color: botStatus.running ? '#40C057' : '#e88'
    }
  }, botStatus.running ? 'ON' : 'OFF')), /*#__PURE__*/React.createElement("button", {
    className: `tab ${tab === 'staff' ? 'active' : ''}`,
    onClick: () => setTab('staff')
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-users"
  }), " ╨б╨╛╤В╤А╤Г╨┤╨╜╨╕╨║╨╕")), tab === 'orders' && /*#__PURE__*/React.createElement("div", {
    className: "panel glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-header"
  }, /*#__PURE__*/React.createElement("h2", null, "╨Ч╨░╨║╨░╨╖╤Л")), orders.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-inbox",
    style: {
      fontSize: 32,
      marginBottom: 12,
      display: 'block'
    }
  }), "╨Э╨╡╤В ╨╖╨░╨║╨░╨╖╨╛╨▓") : orders.map(order => /*#__PURE__*/React.createElement("div", {
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
  }), " ", order.delivery_type === 'delivery' ? '╨Ф╨╛╤Б╤В╨░╨▓╨║╨░' : '╨б╨░╨╝╨╛╨▓╤Л╨▓╨╛╨╖'), order.address && /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
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
  }, order.total_price, "тВ╜"), /*#__PURE__*/React.createElement("div", {
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
  }), "╨Ь╨╡╨╜╤О"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success",
    onClick: () => {
      setNewItem({
        name: '',
        description: '',
        price: '',
        category: '╨Я╨╕╤Ж╤Ж╨░'
      });
      setMenuModal('new');
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " ╨Ф╨╛╨▒╨░╨▓╨╕╤В╤М")), /*#__PURE__*/React.createElement("div", {
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
  }, item.price, "тВ╜"), /*#__PURE__*/React.createElement("div", {
    className: "card-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => openEdit(item)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-pen"
  }), " ╨а╨╡╨┤."), /*#__PURE__*/React.createElement("button", {
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
  }), "╨г╨┐╤А╨░╨▓╨╗╨╡╨╜╨╕╨╡ ╨▒╨╛╤В╨╛╨╝")), /*#__PURE__*/React.createElement("div", {
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
      background: botStatus.running ? '#40C057' : '#e55',
      boxShadow: botStatus.running ? '0 0 12px rgba(64,192,87,0.5)' : '0 0 12px rgba(238,85,85,0.5)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600
    }
  }, botStatus.running ? '╨С╨╛╤В ╤А╨░╨▒╨╛╤В╨░╨╡╤В' : '╨С╨╛╤В ╨╛╤Б╤В╨░╨╜╨╛╨▓╨╗╨╡╨╜')), botStatus.running && /*#__PURE__*/React.createElement("div", {
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
      color: '#95D5B2',
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
      color: '#95D5B2',
      textTransform: 'uppercase',
      marginBottom: 4
    }
  }, "╨Т╤А╨╡╨╝╤П ╤А╨░╨▒╨╛╤В╤Л"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700
    }
  }, botStatus.uptime || 'тАФ')), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'rgba(64,192,87,0.08)',
      padding: 14,
      borderRadius: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: '#95D5B2',
      textTransform: 'uppercase',
      marginBottom: 4
    }
  }, "RAM"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700
    }
  }, botStatus.ram_mb ? botStatus.ram_mb + ' MB' : 'тАФ'))), /*#__PURE__*/React.createElement("div", {
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
  }), " ╨Ч╨░╨┐╤Г╤Б╤В╨╕╤В╤М") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-danger",
    onClick: () => botAction('stop'),
    style: {
      padding: '12px 28px',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-stop"
  }), " ╨Ю╤Б╤В╨░╨╜╨╛╨▓╨╕╤В╤М"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => botAction('restart'),
    style: {
      padding: '12px 28px',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-rotate"
  }), " ╨Я╨╡╤А╨╡╨╖╨░╨┐╤Г╤Б╤В╨╕╤В╤М")), /*#__PURE__*/React.createElement("button", {
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
  }), " ╨Ю╨▒╨╜╨╛╨▓╨╕╤В╤М")))), /*#__PURE__*/React.createElement("div", {
    className: "panel glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-header"
  }, /*#__PURE__*/React.createElement("h2", null, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-terminal",
    style: {
      marginRight: 8
    }
  }), "╨Ы╨╛╨│╨╕ ╨▒╨╛╤В╨░")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      maxHeight: 400,
      overflowY: 'auto',
      fontFamily: 'monospace',
      fontSize: 12,
      lineHeight: 1.6,
      color: '#95D5B2'
    }
  }, botLogs.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: 20,
      opacity: 0.5
    }
  }, "╨Э╨╡╤В ╨╗╨╛╨│╨╛╨▓") : botLogs.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: '2px 0',
      borderBottom: '1px solid rgba(119,200,148,0.05)'
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
  }), "╨б╨╛╤В╤А╤Г╨┤╨╜╨╕╨║╨╕"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success",
    onClick: () => setStaffModal(true)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-plus"
  }), " ╨Ф╨╛╨▒╨░╨▓╨╕╤В╤М")), staff.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "empty"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-user-slash",
    style: {
      fontSize: 32,
      marginBottom: 12,
      display: 'block'
    }
  }), "╨Э╨╡╤В ╤Б╨╛╤В╤А╤Г╨┤╨╜╨╕╨║╨╛╨▓. ╨Ф╨╛╨▒╨░╨▓╤М╤В╨╡ ╨║╤Г╤Е╨╜╤О ╨╕ ╨║╤Г╤А╤М╨╡╤А╨░ ╨┐╨╛ VK ID.") : staff.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    style: {
      padding: '16px 24px',
      borderBottom: '1px solid rgba(119,200,148,0.05)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, s.name || '╨С╨╡╨╖ ╨╕╨╝╨╡╨╜╨╕', /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 8,
      fontSize: 12,
      color: '#95D5B2',
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
      color: s.role === 'admin' ? '#40C057' : s.role === 'kitchen' ? '#FFC107' : '#52B788'
    }
  }, s.role === 'admin' ? 'ЁЯСС ╨Р╨┤╨╝╨╕╨╜' : s.role === 'kitchen' ? 'ЁЯСитАНЁЯН│ ╨Ъ╤Г╤Е╨╜╤П' : 'ЁЯЪЧ ╨Ъ╤Г╤А╤М╨╡╤А'))), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-danger",
    onClick: () => removeStaffMember(s.id)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-trash"
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      padding: 16,
      background: 'rgba(119,200,148,0.06)',
      borderRadius: 12,
      fontSize: 13,
      color: '#95D5B2',
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-info-circle",
    style: {
      marginRight: 6
    }
  }), "╨б╨╛╤В╤А╤Г╨┤╨╜╨╕╨║╨╕ ╨┐╨╛╨╗╤Г╤З╨░╤О╤В ╤Г╨▓╨╡╨┤╨╛╨╝╨╗╨╡╨╜╨╕╤П ╨▓ ╨╗╨╕╤З╨╜╤Л╨╡ ╤Б╨╛╨╛╨▒╤Й╨╡╨╜╨╕╤П VK. ╨з╤В╨╛╨▒╤Л ╤Г╨╖╨╜╨░╤В╤М VK ID тАФ ╨┐╨╛╨┐╤А╨╛╤Б╨╕╤В╨╡ ╤Б╨╛╤В╤А╤Г╨┤╨╜╨╕╨║╨░ ╨╜╨░╨┐╨╕╤Б╨░╤В╤М ╨▒╨╛╤В╤Г ", /*#__PURE__*/React.createElement("code", {
    style: {
      background: 'rgba(64,192,87,0.15)',
      padding: '2px 6px',
      borderRadius: 4
    }
  }, "/start"), ", ╨╖╨░╤В╨╡╨╝ ╨┐╨╛╤Б╨╝╨╛╤В╤А╨╕╤В╨╡ ╨╗╨╛╨│╨╕ ╨▒╨╛╤В╨░.")), orderDetail && /*#__PURE__*/React.createElement("div", {
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
  }), "╨Ч╨░╨║╨░╨╖ #", orderDetail.id), /*#__PURE__*/React.createElement("div", {
    className: "detail-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "order-detail-label"
  }, "╨б╤В╨░╤В╤Г╤Б"), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-value"
  }, /*#__PURE__*/React.createElement("span", {
    className: `order-badge badge-${orderDetail.status}`
  }, STATUS_MAP[orderDetail.status]))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "order-detail-label"
  }, "╨Я╨╛╨╗╤Г╤З╨╡╨╜╨╕╨╡"), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-value"
  }, /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${DELIVERY_ICON[orderDetail.delivery_type]}`,
    style: {
      marginRight: 6
    }
  }), orderDetail.delivery_type === 'delivery' ? '╨Ф╨╛╤Б╤В╨░╨▓╨║╨░' : '╨б╨░╨╝╨╛╨▓╤Л╨▓╨╛╨╖')), orderDetail.address && /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: '1/3'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "order-detail-label"
  }, "╨Р╨┤╤А╨╡╤Б"), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-value"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-location-dot",
    style: {
      marginRight: 6
    }
  }), orderDetail.address)), orderDetail.payment_method && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "order-detail-label"
  }, "╨Ю╨┐╨╗╨░╤В╨░"), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-value"
  }, /*#__PURE__*/React.createElement("i", {
    className: `fa-solid ${PAYMENT_ICON[orderDetail.payment_method]}`,
    style: {
      marginRight: 6
    }
  }), PAYMENT_LABEL[orderDetail.payment_method]))), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-label"
  }, "╨б╨╛╤Б╤В╨░╨▓ ╨╖╨░╨║╨░╨╖╨░"), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-items"
  }, orderDetail.items && orderDetail.items.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "order-detail-row"
  }, /*#__PURE__*/React.createElement("span", null, item.name), /*#__PURE__*/React.createElement("span", {
    className: "order-detail-qty"
  }, "├Ч", item.quantity), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, item.price * item.quantity, "тВ╜")))), /*#__PURE__*/React.createElement("div", {
    className: "order-detail-total"
  }, /*#__PURE__*/React.createElement("span", null, "╨Ш╤В╨╛╨│╨╛"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: '#40C057'
    }
  }, orderDetail.total_price, "тВ╜")), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setOrderDetail(null)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-xmark"
  }), " ╨Ч╨░╨║╤А╤Л╤В╤М"), orderDetail.status !== 'delivered' && orderDetail.status !== 'cancelled' && nextStatus(orderDetail.status, orderDetail.delivery_type) && /*#__PURE__*/React.createElement("button", {
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
  }), menuModal === 'new' ? '╨Э╨╛╨▓╨╛╨╡ ╨▒╨╗╤О╨┤╨╛' : '╨а╨╡╨┤╨░╨║╤В╨╕╤А╨╛╨▓╨░╤В╤М'), /*#__PURE__*/React.createElement("input", {
    placeholder: "╨Э╨░╨╖╨▓╨░╨╜╨╕╨╡",
    value: newItem.name,
    onChange: e => setNewItem({
      ...newItem,
      name: e.target.value
    })
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "╨Ю╨┐╨╕╤Б╨░╨╜╨╕╨╡",
    value: newItem.description,
    onChange: e => setNewItem({
      ...newItem,
      description: e.target.value
    })
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "╨ж╨╡╨╜╨░ (тВ╜)",
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
  }, ['╨Я╨╕╤Ж╤Ж╨░', '╨а╨░╨╝╨╡╨╜', '╨б╨░╨╗╨░╤В╤Л', '╨С╤Г╤А╨│╨╡╤А╤Л', '╨б╨╜╤Н╨║╨╕', '╨Э╨░╨┐╨╕╤В╨║╨╕'].map(c => /*#__PURE__*/React.createElement("option", {
    key: c,
    value: c
  }, c))), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setMenuModal(null)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-xmark"
  }), " ╨Ю╤В╨╝╨╡╨╜╨░"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success",
    onClick: saveMenuItem
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-check"
  }), " ╨б╨╛╤Е╤А╨░╨╜╨╕╤В╤М")))), staffModal && /*#__PURE__*/React.createElement("div", {
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
  }), "╨Ф╨╛╨▒╨░╨▓╨╕╤В╤М ╤Б╨╛╤В╤А╤Г╨┤╨╜╨╕╨║╨░"), /*#__PURE__*/React.createElement("input", {
    placeholder: "VK ID (╤З╨╕╤Б╨╗╨╛)",
    type: "number",
    value: newStaff.vk_id,
    onChange: e => setNewStaff({
      ...newStaff,
      vk_id: e.target.value
    })
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "╨Ш╨╝╤П (╨╜╨╡╨╛╨▒╤П╨╖╨░╤В╨╡╨╗╤М╨╜╨╛)",
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
  }, "ЁЯСС ╨Р╨┤╨╝╨╕╨╜"), /*#__PURE__*/React.createElement("option", {
    value: "kitchen"
  }, "ЁЯСитАНЁЯН│ ╨Ъ╤Г╤Е╨╜╤П"), /*#__PURE__*/React.createElement("option", {
    value: "courier"
  }, "ЁЯЪЧ ╨Ъ╤Г╤А╤М╨╡╤А")), /*#__PURE__*/React.createElement("div", {
    className: "btn-row"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    onClick: () => setStaffModal(false)
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-xmark"
  }), " ╨Ю╤В╨╝╨╡╨╜╨░"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success",
    onClick: addStaffMember
  }, /*#__PURE__*/React.createElement("i", {
    className: "fa-solid fa-check"
  }), " ╨Ф╨╛╨▒╨░╨▓╨╕╤В╤М")))));
};
ReactDOM.render(/*#__PURE__*/React.createElement(App, null), document.getElementById('root'));
