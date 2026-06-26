import { jsxDEV as _jsxDEV, Fragment as _Fragment } from "react/jsx-dev-runtime";
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
  new: 'РќРѕРІС‹Р№',
  confirmed: 'РџРѕРґС‚РІРµСЂР¶РґРµРЅ',
  preparing: 'Р“РѕС‚РѕРІРёС‚СЃСЏ',
  ready: 'Р“РѕС‚РѕРІ',
  delivering: 'Р’ РґРѕСЃС‚Р°РІРєРµ',
  delivered: 'Р”РѕСЃС‚Р°РІР»РµРЅ',
  cancelled: 'РћС‚РјРµРЅС‘РЅ'
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
  card: 'РљР°СЂС‚Р°',
  cash: 'РќР°Р»РёС‡РЅС‹Рµ',
  online: 'РћРЅР»Р°Р№РЅ'
};
const CAT_MAP = {
  'РџРёС†С†Р°': 'cat-pizza',
  'Р Р°РјРµРЅ': 'cat-ramen',
  'РЎР°Р»Р°С‚С‹': 'cat-salads',
  'Р‘СѓСЂРіРµСЂС‹': 'cat-burgers',
  'РЎРЅСЌРєРё': 'cat-snacks',
  'РќР°РїРёС‚РєРё': 'cat-drinks'
};
const CAT_ICON = {
  'РџРёС†С†Р°': 'fa-pizza-slice',
  'Р Р°РјРµРЅ': 'fa-bowl-food',
  'РЎР°Р»Р°С‚С‹': 'fa-leaf',
  'Р‘СѓСЂРіРµСЂС‹': 'fa-burger',
  'РЎРЅСЌРєРё': 'fa-french-fries',
  'РќР°РїРёС‚РєРё': 'fa-wine-glass'
};
const STATUS_LABEL_PICKUP = {
  delivered: 'Р’С‹РґР°С‚СЊ'
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
    category: 'РџРёС†С†Р°'
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
      category: 'РџРёС†С†Р°'
    });
    load();
  };
  const deleteMenuItem = async id => {
    if (!confirm('РЈРґР°Р»РёС‚СЊ Р±Р»СЋРґРѕ?')) return;
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
    if (isNaN(body.vk_id)) return alert('Р’РІРµРґРёС‚Рµ С‡РёСЃР»РѕРІРѕР№ VK ID');
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
    if (!confirm('РЈР±СЂР°С‚СЊ СЃРѕС‚СЂСѓРґРЅРёРєР°? РћРЅ СЃС‚Р°РЅРµС‚ РєР»РёРµРЅС‚РѕРј.')) return;
    await fetch(`${API}/staff/${id}`, {
      method: 'DELETE'
    });
    loadStaff();
  };
  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  return /*#__PURE__*/_jsxDEV("div", {
    className: "app",
    children: [/*#__PURE__*/_jsxDEV("div", {
      className: "header glass",
      children: [/*#__PURE__*/_jsxDEV("h1", {
        children: [/*#__PURE__*/_jsxDEV("i", {
          className: "fa-solid fa-burger",
          style: {
            marginRight: 10
          }
        }, void 0, false), "Р’РєСѓСЃРЅР°СЏ Р”РѕСЃС‚Р°РІРєР° вЂ” CRM"]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: "refresh",
        onClick: load,
        children: [/*#__PURE__*/_jsxDEV("i", {
          className: "fa-solid fa-rotate"
        }, void 0, false), " РћР±РЅРѕРІРёС‚СЊ"]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "stats",
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "stat-card glass neo",
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "icon c1",
          children: /*#__PURE__*/_jsxDEV("i", {
            className: "fa-solid fa-receipt"
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV("h3", {
          children: "Р—Р°РєР°Р·РѕРІ СЃРµРіРѕРґРЅСЏ"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "value c1",
          children: stats.orders
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "stat-card glass neo",
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "icon c2",
          children: /*#__PURE__*/_jsxDEV("i", {
            className: "fa-solid fa-ruble-sign"
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV("h3", {
          children: "Р’С‹СЂСѓС‡РєР° СЃРµРіРѕРґРЅСЏ"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "value c2",
          children: [stats.revenue, "в‚Ѕ"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "stat-card glass neo",
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "icon c3",
          children: /*#__PURE__*/_jsxDEV("i", {
            className: "fa-solid fa-calendar-week"
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV("h3", {
          children: "Р—Р° РЅРµРґРµР»СЋ"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "value c3",
          children: [weekStats.orders, " Р·Р°РєР°Р·РѕРІ"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "stat-card glass neo",
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "icon c4",
          children: /*#__PURE__*/_jsxDEV("i", {
            className: "fa-solid fa-chart-line"
          }, void 0, false)
        }, void 0, false), /*#__PURE__*/_jsxDEV("h3", {
          children: "Р’С‹СЂСѓС‡РєР° Р·Р° РЅРµРґРµР»СЋ"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "value c4",
          children: [weekStats.revenue, "в‚Ѕ"]
        }, void 0, true)]
      }, void 0, true)]
    }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
      className: "tabs",
      children: [/*#__PURE__*/_jsxDEV("button", {
        className: `tab ${tab === 'orders' ? 'active' : ''}`,
        onClick: () => setTab('orders'),
        children: [/*#__PURE__*/_jsxDEV("i", {
          className: "fa-solid fa-box"
        }, void 0, false), " Р—Р°РєР°Р·С‹ ", /*#__PURE__*/_jsxDEV("span", {
          className: "badge",
          children: activeOrders.length
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: `tab ${tab === 'menu' ? 'active' : ''}`,
        onClick: () => setTab('menu'),
        children: [/*#__PURE__*/_jsxDEV("i", {
          className: "fa-solid fa-utensils"
        }, void 0, false), " РњРµРЅСЋ ", /*#__PURE__*/_jsxDEV("span", {
          className: "badge",
          children: menu.length
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: `tab ${tab === 'bot' ? 'active' : ''}`,
        onClick: () => setTab('bot'),
        children: [/*#__PURE__*/_jsxDEV("i", {
          className: "fa-solid fa-robot"
        }, void 0, false), " Р‘РѕС‚ ", /*#__PURE__*/_jsxDEV("span", {
          className: "badge",
          style: {
            background: botStatus.running ? 'rgba(64,192,87,0.25)' : 'rgba(180,60,60,0.2)',
            color: botStatus.running ? '#40C057' : '#e88'
          },
          children: botStatus.running ? 'ON' : 'OFF'
        }, void 0, false)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
        className: `tab ${tab === 'staff' ? 'active' : ''}`,
        onClick: () => setTab('staff'),
        children: [/*#__PURE__*/_jsxDEV("i", {
          className: "fa-solid fa-users"
        }, void 0, false), " РЎРѕС‚СЂСѓРґРЅРёРєРё"]
      }, void 0, true)]
    }, void 0, true), tab === 'orders' && /*#__PURE__*/_jsxDEV("div", {
      className: "panel glass",
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "panel-header",
        children: /*#__PURE__*/_jsxDEV("h2", {
          children: "Р—Р°РєР°Р·С‹"
        }, void 0, false)
      }, void 0, false), orders.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
        className: "empty",
        children: [/*#__PURE__*/_jsxDEV("i", {
          className: "fa-solid fa-inbox",
          style: {
            fontSize: 32,
            marginBottom: 12,
            display: 'block'
          }
        }, void 0, false), "РќРµС‚ Р·Р°РєР°Р·РѕРІ"]
      }, void 0, true) : orders.map(order => /*#__PURE__*/_jsxDEV("div", {
        className: "order-item",
        onClick: () => openOrderDetail(order.id),
        children: [/*#__PURE__*/_jsxDEV("div", {
          style: {
            flex: 1
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("span", {
              className: "order-id",
              children: ["#", order.id]
            }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
              className: `order-badge badge-${order.status}`,
              style: {
                marginLeft: 8
              },
              children: STATUS_MAP[order.status]
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "order-meta",
            children: [/*#__PURE__*/_jsxDEV("span", {
              children: [/*#__PURE__*/_jsxDEV("i", {
                className: `fa-solid ${DELIVERY_ICON[order.delivery_type]}`
              }, void 0, false), " ", order.delivery_type === 'delivery' ? 'Р”РѕСЃС‚Р°РІРєР°' : 'РЎР°РјРѕРІС‹РІРѕР·']
            }, void 0, true), order.address && /*#__PURE__*/_jsxDEV("span", {
              children: [/*#__PURE__*/_jsxDEV("i", {
                className: "fa-solid fa-location-dot"
              }, void 0, false), " ", order.address]
            }, void 0, true), order.payment_method && /*#__PURE__*/_jsxDEV("span", {
              children: [/*#__PURE__*/_jsxDEV("i", {
                className: `fa-solid ${PAYMENT_ICON[order.payment_method]}`
              }, void 0, false), " ", PAYMENT_LABEL[order.payment_method]]
            }, void 0, true), order.created_at && /*#__PURE__*/_jsxDEV("span", {
              children: [/*#__PURE__*/_jsxDEV("i", {
                className: "fa-regular fa-clock"
              }, void 0, false), " ", new Date(order.created_at).toLocaleString('ru-RU')]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          style: {
            textAlign: 'right'
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "order-price",
            children: [order.total_price, "в‚Ѕ"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "actions",
            children: [order.status !== 'delivered' && order.status !== 'cancelled' && nextStatus(order.status, order.delivery_type) && /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-success",
              onClick: e => {
                e.stopPropagation();
                updateStatus(order.id, nextStatus(order.status, order.delivery_type));
              },
              children: [/*#__PURE__*/_jsxDEV("i", {
                className: "fa-solid fa-arrow-right"
              }, void 0, false), order.delivery_type === 'pickup' && STATUS_LABEL_PICKUP[nextStatus(order.status, order.delivery_type)] || STATUS_MAP[nextStatus(order.status, order.delivery_type)]]
            }, void 0, true), order.status !== 'delivered' && order.status !== 'cancelled' && /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-danger",
              onClick: e => {
                e.stopPropagation();
                updateStatus(order.id, 'cancelled');
              },
              children: /*#__PURE__*/_jsxDEV("i", {
                className: "fa-solid fa-xmark"
              }, void 0, false)
            }, void 0, false)]
          }, void 0, true)]
        }, void 0, true)]
      }, order.id, true))]
    }, void 0, true), tab === 'menu' && /*#__PURE__*/_jsxDEV("div", {
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "panel-header glass",
        style: {
          marginBottom: 16,
          borderRadius: 16
        },
        children: [/*#__PURE__*/_jsxDEV("h2", {
          children: [/*#__PURE__*/_jsxDEV("i", {
            className: "fa-solid fa-utensils",
            style: {
              marginRight: 8
            }
          }, void 0, false), "РњРµРЅСЋ"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
          className: "btn btn-success",
          onClick: () => {
            setNewItem({
              name: '',
              description: '',
              price: '',
              category: 'РџРёС†С†Р°'
            });
            setMenuModal('new');
          },
          children: [/*#__PURE__*/_jsxDEV("i", {
            className: "fa-solid fa-plus"
          }, void 0, false), " Р”РѕР±Р°РІРёС‚СЊ"]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "menu-grid",
        children: menu.map(item => /*#__PURE__*/_jsxDEV("div", {
          className: `menu-card glass neo ${CAT_MAP[item.category] || ''}`,
          children: [/*#__PURE__*/_jsxDEV("div", {
            className: "card-top",
            children: [/*#__PURE__*/_jsxDEV("h4", {
              children: item.name
            }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
              className: "category-tag",
              children: [/*#__PURE__*/_jsxDEV("i", {
                className: `fa-solid ${CAT_ICON[item.category] || 'fa-utensils'}`,
                style: {
                  marginRight: 4
                }
              }, void 0, false), item.category]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "desc",
            children: item.description
          }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
            className: "price",
            children: [item.price, "в‚Ѕ"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            className: "card-actions",
            children: [/*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-primary",
              onClick: () => openEdit(item),
              children: [/*#__PURE__*/_jsxDEV("i", {
                className: "fa-solid fa-pen"
              }, void 0, false), " Р\xA0РµРґ."]
            }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-danger",
              onClick: () => deleteMenuItem(item.id),
              children: /*#__PURE__*/_jsxDEV("i", {
                className: "fa-solid fa-trash"
              }, void 0, false)
            }, void 0, false)]
          }, void 0, true)]
        }, item.id, true))
      }, void 0, false)]
    }, void 0, true), tab === 'bot' && /*#__PURE__*/_jsxDEV("div", {
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "panel glass",
        style: {
          marginBottom: 16
        },
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "panel-header",
          children: /*#__PURE__*/_jsxDEV("h2", {
            children: [/*#__PURE__*/_jsxDEV("i", {
              className: "fa-solid fa-robot",
              style: {
                marginRight: 8
              }
            }, void 0, false), "РЈРїСЂР°РІР»РµРЅРёРµ Р±РѕС‚РѕРј"]
          }, void 0, true)
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            padding: 24
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 20
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: botStatus.running ? '#40C057' : '#e55',
                boxShadow: botStatus.running ? '0 0 12px rgba(64,192,87,0.5)' : '0 0 12px rgba(238,85,85,0.5)'
              }
            }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
              style: {
                fontSize: 18,
                fontWeight: 600
              },
              children: botStatus.running ? 'Р‘РѕС‚ СЂР°Р±РѕС‚Р°РµС‚' : 'Р‘РѕС‚ РѕСЃС‚Р°РЅРѕРІР»РµРЅ'
            }, void 0, false)]
          }, void 0, true), botStatus.running && /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 16,
              marginBottom: 20
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                background: 'rgba(64,192,87,0.08)',
                padding: 14,
                borderRadius: 12
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: '#95D5B2',
                  textTransform: 'uppercase',
                  marginBottom: 4
                },
                children: "PID"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 18,
                  fontWeight: 700
                },
                children: botStatus.pid
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                background: 'rgba(64,192,87,0.08)',
                padding: 14,
                borderRadius: 12
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: '#95D5B2',
                  textTransform: 'uppercase',
                  marginBottom: 4
                },
                children: "Р’СЂРµРјСЏ СЂР°Р±РѕС‚С‹"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 18,
                  fontWeight: 700
                },
                children: botStatus.uptime || 'вЂ”'
              }, void 0, false)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                background: 'rgba(64,192,87,0.08)',
                padding: 14,
                borderRadius: 12
              },
              children: [/*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 11,
                  color: '#95D5B2',
                  textTransform: 'uppercase',
                  marginBottom: 4
                },
                children: "RAM"
              }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
                style: {
                  fontSize: 18,
                  fontWeight: 700
                },
                children: botStatus.ram_mb ? botStatus.ram_mb + ' MB' : 'вЂ”'
              }, void 0, false)]
            }, void 0, true)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            style: {
              display: 'flex',
              gap: 10
            },
            children: [!botStatus.running ? /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-success",
              onClick: () => botAction('start'),
              style: {
                padding: '12px 28px',
                fontSize: 14
              },
              children: [/*#__PURE__*/_jsxDEV("i", {
                className: "fa-solid fa-play"
              }, void 0, false), " Р—Р°РїСѓСЃС‚РёС‚СЊ"]
            }, void 0, true) : /*#__PURE__*/_jsxDEV(_Fragment, {
              children: [/*#__PURE__*/_jsxDEV("button", {
                className: "btn btn-danger",
                onClick: () => botAction('stop'),
                style: {
                  padding: '12px 28px',
                  fontSize: 14
                },
                children: [/*#__PURE__*/_jsxDEV("i", {
                  className: "fa-solid fa-stop"
                }, void 0, false), " РћСЃС‚Р°РЅРѕРІРёС‚СЊ"]
              }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
                className: "btn btn-primary",
                onClick: () => botAction('restart'),
                style: {
                  padding: '12px 28px',
                  fontSize: 14
                },
                children: [/*#__PURE__*/_jsxDEV("i", {
                  className: "fa-solid fa-rotate"
                }, void 0, false), " РџРµСЂРµР·Р°РїСѓСЃС‚РёС‚СЊ"]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
              className: "btn btn-ghost",
              onClick: () => {
                loadBotStatus();
                loadBotLogs();
              },
              style: {
                padding: '12px 28px',
                fontSize: 14
              },
              children: [/*#__PURE__*/_jsxDEV("i", {
                className: "fa-solid fa-rotate"
              }, void 0, false), " РћР±РЅРѕРІРёС‚СЊ"]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        className: "panel glass",
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "panel-header",
          children: /*#__PURE__*/_jsxDEV("h2", {
            children: [/*#__PURE__*/_jsxDEV("i", {
              className: "fa-solid fa-terminal",
              style: {
                marginRight: 8
              }
            }, void 0, false), "Р›РѕРіРё Р±РѕС‚Р°"]
          }, void 0, true)
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          style: {
            padding: 16,
            maxHeight: 400,
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: 12,
            lineHeight: 1.6,
            color: '#95D5B2'
          },
          children: botLogs.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
            style: {
              textAlign: 'center',
              padding: 20,
              opacity: 0.5
            },
            children: "РќРµС‚ Р»РѕРіРѕРІ"
          }, void 0, false) : botLogs.map((line, i) => /*#__PURE__*/_jsxDEV("div", {
            style: {
              padding: '2px 0',
              borderBottom: '1px solid rgba(119,200,148,0.05)'
            },
            children: line
          }, i, false))
        }, void 0, false)]
      }, void 0, true)]
    }, void 0, true), tab === 'staff' && /*#__PURE__*/_jsxDEV("div", {
      children: [/*#__PURE__*/_jsxDEV("div", {
        className: "panel glass",
        children: [/*#__PURE__*/_jsxDEV("div", {
          className: "panel-header",
          children: [/*#__PURE__*/_jsxDEV("h2", {
            children: [/*#__PURE__*/_jsxDEV("i", {
              className: "fa-solid fa-users",
              style: {
                marginRight: 8
              }
            }, void 0, false), "РЎРѕС‚СЂСѓРґРЅРёРєРё"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-success",
            onClick: () => setStaffModal(true),
            children: [/*#__PURE__*/_jsxDEV("i", {
              className: "fa-solid fa-plus"
            }, void 0, false), " Р”РѕР±Р°РІРёС‚СЊ"]
          }, void 0, true)]
        }, void 0, true), staff.length === 0 ? /*#__PURE__*/_jsxDEV("div", {
          className: "empty",
          children: [/*#__PURE__*/_jsxDEV("i", {
            className: "fa-solid fa-user-slash",
            style: {
              fontSize: 32,
              marginBottom: 12,
              display: 'block'
            }
          }, void 0, false), "РќРµС‚ СЃРѕС‚СЂСѓРґРЅРёРєРѕРІ. Р”РѕР±Р°РІСЊС‚Рµ РєСѓС…РЅСЋ Рё РєСѓСЂСЊРµСЂР° РїРѕ VK ID."]
        }, void 0, true) : staff.map(s => /*#__PURE__*/_jsxDEV("div", {
          style: {
            padding: '16px 24px',
            borderBottom: '1px solid rgba(119,200,148,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          },
          children: [/*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              style: {
                fontWeight: 600,
                fontSize: 15
              },
              children: [s.name || 'Р‘РµР· РёРјРµРЅРё', /*#__PURE__*/_jsxDEV("span", {
                style: {
                  marginLeft: 8,
                  fontSize: 12,
                  color: '#95D5B2',
                  fontWeight: 400
                },
                children: ["VK ID: ", s.vk_id]
              }, void 0, true)]
            }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
              style: {
                marginTop: 4
              },
              children: /*#__PURE__*/_jsxDEV("span", {
                style: {
                  padding: '3px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  background: s.role === 'admin' ? 'rgba(64,192,87,0.2)' : s.role === 'kitchen' ? 'rgba(255,193,7,0.2)' : 'rgba(82,183,136,0.2)',
                  color: s.role === 'admin' ? '#40C057' : s.role === 'kitchen' ? '#FFC107' : '#52B788'
                },
                children: s.role === 'admin' ? 'рџ‘‘ РђРґРјРёРЅ' : s.role === 'kitchen' ? 'рџ‘ЁвЂЌрџЌі РљСѓС…РЅСЏ' : 'рџљ— РљСѓСЂСЊРµСЂ'
              }, void 0, false)
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-danger",
            onClick: () => removeStaffMember(s.id),
            children: /*#__PURE__*/_jsxDEV("i", {
              className: "fa-solid fa-trash"
            }, void 0, false)
          }, void 0, false)]
        }, s.id, true))]
      }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
        style: {
          marginTop: 16,
          padding: 16,
          background: 'rgba(119,200,148,0.06)',
          borderRadius: 12,
          fontSize: 13,
          color: '#95D5B2',
          lineHeight: 1.6
        },
        children: [/*#__PURE__*/_jsxDEV("i", {
          className: "fa-solid fa-info-circle",
          style: {
            marginRight: 6
          }
        }, void 0, false), "РЎРѕС‚СЂСѓРґРЅРёРєРё РїРѕР»СѓС‡Р°СЋС‚ СѓРІРµРґРѕРјР»РµРЅРёСЏ РІ Р»РёС‡РЅС‹Рµ СЃРѕРѕР±С‰РµРЅРёСЏ VK. Р§С‚РѕР±С‹ СѓР·РЅР°С‚СЊ VK ID вЂ” РїРѕРїСЂРѕСЃРёС‚Рµ СЃРѕС‚СЂСѓРґРЅРёРєР° РЅР°РїРёСЃР°С‚СЊ Р±РѕС‚Сѓ ", /*#__PURE__*/_jsxDEV("code", {
          style: {
            background: 'rgba(64,192,87,0.15)',
            padding: '2px 6px',
            borderRadius: 4
          },
          children: "/start"
        }, void 0, false), ", Р·Р°С‚РµРј РїРѕСЃРјРѕС‚СЂРёС‚Рµ Р»РѕРіРё Р±РѕС‚Р°."]
      }, void 0, true)]
    }, void 0, true), orderDetail && /*#__PURE__*/_jsxDEV("div", {
      className: "modal-overlay",
      onClick: () => setOrderDetail(null),
      children: /*#__PURE__*/_jsxDEV("div", {
        className: "modal glass neo",
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("h2", {
          children: [/*#__PURE__*/_jsxDEV("i", {
            className: "fa-solid fa-box",
            style: {
              marginRight: 8
            }
          }, void 0, false), "Р—Р°РєР°Р· #", orderDetail.id]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "detail-grid",
          children: [/*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              className: "order-detail-label",
              children: "РЎС‚Р°С‚СѓСЃ"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              className: "order-detail-value",
              children: /*#__PURE__*/_jsxDEV("span", {
                className: `order-badge badge-${orderDetail.status}`,
                children: STATUS_MAP[orderDetail.status]
              }, void 0, false)
            }, void 0, false)]
          }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              className: "order-detail-label",
              children: "РџРѕР»СѓС‡РµРЅРёРµ"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              className: "order-detail-value",
              children: [/*#__PURE__*/_jsxDEV("i", {
                className: `fa-solid ${DELIVERY_ICON[orderDetail.delivery_type]}`,
                style: {
                  marginRight: 6
                }
              }, void 0, false), orderDetail.delivery_type === 'delivery' ? 'Р”РѕСЃС‚Р°РІРєР°' : 'РЎР°РјРѕРІС‹РІРѕР·']
            }, void 0, true)]
          }, void 0, true), orderDetail.address && /*#__PURE__*/_jsxDEV("div", {
            style: {
              gridColumn: '1/3'
            },
            children: [/*#__PURE__*/_jsxDEV("div", {
              className: "order-detail-label",
              children: "РђРґСЂРµСЃ"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              className: "order-detail-value",
              children: [/*#__PURE__*/_jsxDEV("i", {
                className: "fa-solid fa-location-dot",
                style: {
                  marginRight: 6
                }
              }, void 0, false), orderDetail.address]
            }, void 0, true)]
          }, void 0, true), orderDetail.payment_method && /*#__PURE__*/_jsxDEV("div", {
            children: [/*#__PURE__*/_jsxDEV("div", {
              className: "order-detail-label",
              children: "РћРїР»Р°С‚Р°"
            }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
              className: "order-detail-value",
              children: [/*#__PURE__*/_jsxDEV("i", {
                className: `fa-solid ${PAYMENT_ICON[orderDetail.payment_method]}`,
                style: {
                  marginRight: 6
                }
              }, void 0, false), PAYMENT_LABEL[orderDetail.payment_method]]
            }, void 0, true)]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "order-detail-label",
          children: "РЎРѕСЃС‚Р°РІ Р·Р°РєР°Р·Р°"
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "order-detail-items",
          children: orderDetail.items && orderDetail.items.map((item, idx) => /*#__PURE__*/_jsxDEV("div", {
            className: "order-detail-row",
            children: [/*#__PURE__*/_jsxDEV("span", {
              children: item.name
            }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
              className: "order-detail-qty",
              children: ["Г—", item.quantity]
            }, void 0, true), /*#__PURE__*/_jsxDEV("span", {
              style: {
                fontWeight: 600
              },
              children: [item.price * item.quantity, "в‚Ѕ"]
            }, void 0, true)]
          }, idx, true))
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "order-detail-total",
          children: [/*#__PURE__*/_jsxDEV("span", {
            children: "РС‚РѕРіРѕ"
          }, void 0, false), /*#__PURE__*/_jsxDEV("span", {
            style: {
              color: '#40C057'
            },
            children: [orderDetail.total_price, "в‚Ѕ"]
          }, void 0, true)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "btn-row",
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setOrderDetail(null),
            children: [/*#__PURE__*/_jsxDEV("i", {
              className: "fa-solid fa-xmark"
            }, void 0, false), " Р—Р°РєСЂС‹С‚СЊ"]
          }, void 0, true), orderDetail.status !== 'delivered' && orderDetail.status !== 'cancelled' && nextStatus(orderDetail.status, orderDetail.delivery_type) && /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-success",
            onClick: () => {
              updateStatus(orderDetail.id, nextStatus(orderDetail.status, orderDetail.delivery_type));
              setOrderDetail(null);
            },
            children: [/*#__PURE__*/_jsxDEV("i", {
              className: "fa-solid fa-arrow-right"
            }, void 0, false), orderDetail.delivery_type === 'pickup' && STATUS_LABEL_PICKUP[nextStatus(orderDetail.status, orderDetail.delivery_type)] || STATUS_MAP[nextStatus(orderDetail.status, orderDetail.delivery_type)]]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false), menuModal !== null && /*#__PURE__*/_jsxDEV("div", {
      className: "modal-overlay",
      onClick: () => setMenuModal(null),
      children: /*#__PURE__*/_jsxDEV("div", {
        className: "modal glass neo",
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("h2", {
          children: [/*#__PURE__*/_jsxDEV("i", {
            className: `fa-solid ${menuModal === 'new' ? 'fa-plus' : 'fa-pen'}`,
            style: {
              marginRight: 8
            }
          }, void 0, false), menuModal === 'new' ? 'РќРѕРІРѕРµ Р±Р»СЋРґРѕ' : 'Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ']
        }, void 0, true), /*#__PURE__*/_jsxDEV("input", {
          placeholder: "РќР°Р·РІР°РЅРёРµ",
          value: newItem.name,
          onChange: e => setNewItem({
            ...newItem,
            name: e.target.value
          })
        }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
          placeholder: "РћРїРёСЃР°РЅРёРµ",
          value: newItem.description,
          onChange: e => setNewItem({
            ...newItem,
            description: e.target.value
          })
        }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
          placeholder: "Р¦РµРЅР° (в‚Ѕ)",
          type: "number",
          value: newItem.price,
          onChange: e => setNewItem({
            ...newItem,
            price: e.target.value
          })
        }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
          value: newItem.category,
          onChange: e => setNewItem({
            ...newItem,
            category: e.target.value
          }),
          children: ['РџРёС†С†Р°', 'Р Р°РјРµРЅ', 'РЎР°Р»Р°С‚С‹', 'Р‘СѓСЂРіРµСЂС‹', 'РЎРЅСЌРєРё', 'РќР°РїРёС‚РєРё'].map(c => /*#__PURE__*/_jsxDEV("option", {
            value: c,
            children: c
          }, c, false))
        }, void 0, false), /*#__PURE__*/_jsxDEV("div", {
          className: "btn-row",
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setMenuModal(null),
            children: [/*#__PURE__*/_jsxDEV("i", {
              className: "fa-solid fa-xmark"
            }, void 0, false), " РћС‚РјРµРЅР°"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-success",
            onClick: saveMenuItem,
            children: [/*#__PURE__*/_jsxDEV("i", {
              className: "fa-solid fa-check"
            }, void 0, false), " РЎРѕС…СЂР°РЅРёС‚СЊ"]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false), staffModal && /*#__PURE__*/_jsxDEV("div", {
      className: "modal-overlay",
      onClick: () => setStaffModal(false),
      children: /*#__PURE__*/_jsxDEV("div", {
        className: "modal glass neo",
        onClick: e => e.stopPropagation(),
        children: [/*#__PURE__*/_jsxDEV("h2", {
          children: [/*#__PURE__*/_jsxDEV("i", {
            className: "fa-solid fa-user-plus",
            style: {
              marginRight: 8
            }
          }, void 0, false), "Р”РѕР±Р°РІРёС‚СЊ СЃРѕС‚СЂСѓРґРЅРёРєР°"]
        }, void 0, true), /*#__PURE__*/_jsxDEV("input", {
          placeholder: "VK ID (С‡РёСЃР»Рѕ)",
          type: "number",
          value: newStaff.vk_id,
          onChange: e => setNewStaff({
            ...newStaff,
            vk_id: e.target.value
          })
        }, void 0, false), /*#__PURE__*/_jsxDEV("input", {
          placeholder: "РРјСЏ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)",
          value: newStaff.name,
          onChange: e => setNewStaff({
            ...newStaff,
            name: e.target.value
          })
        }, void 0, false), /*#__PURE__*/_jsxDEV("select", {
          value: newStaff.role,
          onChange: e => setNewStaff({
            ...newStaff,
            role: e.target.value
          }),
          children: [/*#__PURE__*/_jsxDEV("option", {
            value: "admin",
            children: "рџ‘‘ РђРґРјРёРЅ"
          }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
            value: "kitchen",
            children: "рџ‘ЁвЂЌрџЌі РљСѓС…РЅСЏ"
          }, void 0, false), /*#__PURE__*/_jsxDEV("option", {
            value: "courier",
            children: "рџљ— РљСѓСЂСЊРµСЂ"
          }, void 0, false)]
        }, void 0, true), /*#__PURE__*/_jsxDEV("div", {
          className: "btn-row",
          children: [/*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-ghost",
            onClick: () => setStaffModal(false),
            children: [/*#__PURE__*/_jsxDEV("i", {
              className: "fa-solid fa-xmark"
            }, void 0, false), " РћС‚РјРµРЅР°"]
          }, void 0, true), /*#__PURE__*/_jsxDEV("button", {
            className: "btn btn-success",
            onClick: addStaffMember,
            children: [/*#__PURE__*/_jsxDEV("i", {
              className: "fa-solid fa-check"
            }, void 0, false), " Р”РѕР±Р°РІРёС‚СЊ"]
          }, void 0, true)]
        }, void 0, true)]
      }, void 0, true)
    }, void 0, false)]
  }, void 0, true);
};
ReactDOM.render(/*#__PURE__*/_jsxDEV(App, {}, void 0, false), document.getElementById('root'));
