/**
 * 涅凰智农 IoT 云平台 — Mock API 层
 *
 * 用法：
 *   <script src="../mock/mock-api.js"></script>
 *   后续通过 window.MockAPI 调用。
 *
 * 切换真实后端：
 *   修改 API_BASE 为真实 Go 服务地址即可，
 *   所有 fetch 调用已统一封装。
 */

(function (global) {
  'use strict';

  // ============================================================
  // 配置
  // ============================================================
  const API_BASE = ''; // 空字符串表示使用 mock；真实后端如 'http://localhost:8080'
  const MOCK_DELAY = 200; // 模拟网络延迟（ms）

  // ============================================================
  // Mock 数据
  // ============================================================

  // ---------- 用户 ----------
  const MOCK_USERS = [
    { user_id: 1, user_type: 1, role: 1, username: 'admin', display_name: '超级管理员', status: 1 },
    { user_id: 2, user_type: 1, role: 2, username: 'operator', display_name: '运维管理员', status: 1 },
    { user_id: 3, user_type: 2, role: 3, display_name: '张三农场', status: 1 },
    { user_id: 4, user_type: 2, role: 3, display_name: '李四果园', status: 1 },
    { user_id: 5, user_type: 2, role: 3, display_name: '王五蔬菜基地', status: 1 },
    { user_id: 6, user_type: 2, role: 3, display_name: '赵六水产', status: 2 },
  ];

  // ---------- 云边设备 ----------
  const MOCK_GATEWAYS = [
    { gateway_id: 1, gateway_external_id: 'TEST_ADMIN_001', gateway_name: 'FP_TEST_ADMIN_001', ip: '123.190.0.47', port: 40000, gateway_sn: '', online_status: 1, last_heartbeat_at_ms: '2026-06-28T21:50:00.000Z' },
    { gateway_id: 2, gateway_external_id: 'TEST_ADMIN_002', gateway_name: 'FP_TEST_ADMIN_002', ip: '123.190.0.48', port: 40001, gateway_sn: '', online_status: 1, last_heartbeat_at_ms: '2026-06-28T21:51:00.000Z' },
    { gateway_id: 3, gateway_external_id: 'TEST_ADMIN_003', gateway_name: 'FP_TEST_ADMIN_003', ip: '123.190.0.49', port: 40002, gateway_sn: '', online_status: 0, last_heartbeat_at_ms: '2026-06-28T20:30:00.000Z' },
  ];

  // ---------- 采集执行器/功能点 ----------
  function generateCollectors() {
    const funcTypes = [
      { func: 1, name: '温度', unit: '℃', best_min: 18, best_max: 30, run_mode: 1, real_value: 25.6, status: 'normal' },
      { func: 2, name: '墒情', unit: '%', best_min: 40, best_max: 80, run_mode: 1, real_value: 55.2, status: 'normal' },
      { func: 3, name: '限位', unit: '', best_min: 0, best_max: 1, run_mode: 1, real_value: 0, status: 'normal' },
      { func: 4, name: '水泵', unit: '', best_min: 0, best_max: 1, run_mode: 2, real_value: 1, status: 'on' },
      { func: 5, name: '风机', unit: '', best_min: 0, best_max: 1, run_mode: 2, real_value: 0, status: 'off' },
      { func: 6, name: '继电器', unit: '', best_min: 0, best_max: 1, run_mode: 2, real_value: 1, status: 'on' },
    ];

    const statusMap = {
      normal: '正常', low: '偏低', high: '偏高', offline: '离线', on: '开启', off: '关闭',
    };

    const collectors = [];
    let id = 0;
    for (let g = 0; g < MOCK_GATEWAYS.length; g++) {
      const gw = MOCK_GATEWAYS[g];
      // 每个云边设备下 3~6 个采集执行器
      const count = 3 + Math.floor(Math.random() * 4);
      for (let c = 0; c < count; c++) {
        id++;
        const ft = funcTypes[c % funcTypes.length];
        // 制造一些异常状态
        let realValue = ft.real_value;
        let status = ft.status;
        if (id === 2) { realValue = 35.2; status = 'high'; }
        if (id === 8) { realValue = 15.3; status = 'low'; }
        if (id === 15) { status = 'offline'; }
        if (gw.online_status === 0) { status = 'offline'; }

        collectors.push({
          de_re_id: id,
          gateway_id: gw.gateway_id,
          gateway_name: gw.gateway_name,
          shed_no: '棚' + (g + 1) + '-' + (c + 1).toString().padStart(2, '0'),
          collector_no: 'DEV-' + id.toString().padStart(4, '0'),
          freq: 1 + (c % 6),
          devid: 1000 + id,
          func: ft.func,
          func_name: ft.name,
          best_min: ft.best_min,
          best_max: ft.best_max,
          unit: ft.unit,
          real_temp: realValue,
          real_value: realValue,
          run_mode: ft.run_mode,
          run_mode_label: ft.run_mode === 1 ? '自动' : '手动',
          rel1: 0,
          rel2: 0,
          poll_interval: 300,
          status: status,
          status_label: statusMap[status] || '未知',
          updated_at: '2026-06-28T21:' + (50 - id).toString().padStart(2, '0') + ':00.000Z',
        });
      }
    }
    return collectors;
  }

  const MOCK_COLLECTORS = generateCollectors();

  // ---------- 绑定关系 ----------
  const MOCK_BINDINGS = [
    { bind_id: 1, user_id: 3, gateway_id: 1, shed_no: '棚1-01', freq: 1, devid: 1001, func: 1, bind_usr_name: '张三农场' },
    { bind_id: 2, user_id: 3, gateway_id: 1, shed_no: '棚1-02', freq: 2, devid: 1002, func: 2, bind_usr_name: '张三农场' },
    { bind_id: 3, user_id: 3, gateway_id: 1, shed_no: '棚1-03', freq: 3, devid: 1003, func: 3, bind_usr_name: '张三农场' },
    { bind_id: 4, user_id: 3, gateway_id: 2, shed_no: '棚2-01', freq: 1, devid: 1004, func: 4, bind_usr_name: '张三农场' },
    { bind_id: 5, user_id: 4, gateway_id: 1, shed_no: '棚1-04', freq: 4, devid: 1005, func: 5, bind_usr_name: '李四果园' },
    { bind_id: 6, user_id: 4, gateway_id: 1, shed_no: '棚1-05', freq: 5, devid: 1006, func: 6, bind_usr_name: '李四果园' },
    { bind_id: 7, user_id: 5, gateway_id: 2, shed_no: '棚2-02', freq: 2, devid: 1007, func: 1, bind_usr_name: '王五蔬菜基地' },
    { bind_id: 8, user_id: 5, gateway_id: 2, shed_no: '棚2-03', freq: 3, devid: 1008, func: 2, bind_usr_name: '王五蔬菜基地' },
    { bind_id: 9, user_id: 5, gateway_id: 2, shed_no: '棚2-04', freq: 4, devid: 1009, func: 3, bind_usr_name: '王五蔬菜基地' },
  ];

  // ---------- 控制日志 ----------
  function generateControlLogs() {
    const ops = ['开启', '停止', '关闭'];
    const statuses = ['succeeded', 'failed', 'timeout'];
    const statusLabels = { succeeded: '成功', failed: '失败', timeout: '超时' };
    const logs = [];
    for (let i = 0; i < 25; i++) {
      const collector = MOCK_COLLECTORS[i % MOCK_COLLECTORS.length];
      const opType = ops[i % 3];
      const cmdStatus = statuses[i % 3];
      logs.push({
        op_id: i + 1,
        gateway_id: collector.gateway_id,
        gateway_name: collector.gateway_name,
        bind_usr_name: ['张三农场', '李四果园', '王五蔬菜基地'][i % 3],
        freq: collector.freq,
        devid: collector.devid,
        func: collector.func,
        func_name: collector.func_name,
        op_type: opType,
        run_mode: collector.run_mode,
        cmd_status: cmdStatus,
        cmd_status_label: statusLabels[cmdStatus],
        result: cmdStatus === 'succeeded' ? '执行成功' : cmdStatus === 'failed' ? '设备无响应' : '超时未确认',
        op_time: '2026-06-28T' + (20 + Math.floor(i / 6)).toString().padStart(2, '0') + ':' + ((i * 7) % 60).toString().padStart(2, '0') + ':00.000Z',
      });
    }
    return logs;
  }

  const MOCK_CONTROL_LOGS = generateControlLogs();

  // ---------- 历史数据 ----------
  function generateHistory(range) {
    const points = [];
    const now = new Date('2026-06-28T21:54:00.000Z');
    let count, stepMs;
    switch (range) {
      case '1h': count = 60; stepMs = 60 * 1000; break;
      case '24h': count = 144; stepMs = 10 * 60 * 1000; break;
      case '7d': count = 168; stepMs = 60 * 60 * 1000; break;
      default: count = 60; stepMs = 60 * 1000;
    }
    let baseTemp = 25 + Math.random() * 2;
    let baseHumidity = 55 + Math.random() * 5;
    for (let i = count - 1; i >= 0; i--) {
      const t = new Date(now.getTime() - i * stepMs);
      baseTemp += (Math.random() - 0.5) * 0.8;
      baseTemp = Math.max(10, Math.min(40, baseTemp));
      baseHumidity += (Math.random() - 0.5) * 2;
      baseHumidity = Math.max(20, Math.min(90, baseHumidity));
      points.push({
        time: t.toISOString(),
        real_temp: Math.round(baseTemp * 10) / 10,
        real_humidity: Math.round(baseHumidity * 10) / 10,
      });
    }
    return points;
  }

  // ---------- Dashboard ----------
  function getDashboard() {
    const onlineGateways = MOCK_GATEWAYS.filter(g => g.online_status === 1).length;
    const totalCollectors = MOCK_COLLECTORS.length;
    const farmerCount = MOCK_USERS.filter(u => u.user_type === 2 && u.status === 1).length;
    const todayReports = 12847;
    const lastReportTime = '2026-06-28T21:53:45.000Z';
    return {
      online_gateways: onlineGateways,
      total_gateways: MOCK_GATEWAYS.length,
      total_collectors: totalCollectors,
      farmer_count: farmerCount,
      today_reports: todayReports,
      last_report_time: lastReportTime,
    };
  }

  // ============================================================
  // Mock 路由
  // ============================================================
  let nextBindId = 10;

  const mockRoutes = {
    // ---- C 端 ----
    'POST /api/v1/mini/mock-login': function (body) {
      const id = body.mock_openid || body.phone || 'mock_user_001';
      // 查找对应用户
      let user = MOCK_USERS.find(u => u.user_type === 2 && u.status === 1);
      if (!user) user = MOCK_USERS[2]; // fallback
      return { data: { token: 'mock_mini_token_' + user.user_id, user_id: user.user_id, is_new_user: false } };
    },

    'GET /api/v1/mini/me': function () {
      const uid = getCurrentUserId();
      const user = MOCK_USERS.find(u => u.user_id === uid) || MOCK_USERS[2];
      const bindingCount = MOCK_BINDINGS.filter(b => b.user_id === uid).length;
      return { data: { user_id: user.user_id, display_name: user.display_name, role: user.role, binding_count: bindingCount } };
    },

    'GET /api/v1/mini/devices': function () {
      const uid = getCurrentUserId();
      const bindings = MOCK_BINDINGS.filter(b => b.user_id === uid);
      const devices = bindings.map(b => {
        const c = MOCK_COLLECTORS.find(x => x.gateway_id === b.gateway_id && x.freq === b.freq && x.devid === b.devid);
        if (!c) return null;
        return {
          de_re_id: c.de_re_id,
          gateway_name: c.gateway_name,
          shed_no: c.shed_no,
          collector_no: c.collector_no,
          freq: c.freq,
          devid: c.devid,
          func: c.func,
          func_name: c.func_name,
          real_value: c.real_value,
          unit: c.unit,
          status: c.status,
          status_label: c.status_label,
          run_mode: c.run_mode,
          run_mode_label: c.run_mode_label,
          updated_at: c.updated_at,
        };
      }).filter(Boolean);
      return { data: devices };
    },

    'GET /api/v1/mini/devices/:id/realtime': function (params) {
      const c = MOCK_COLLECTORS.find(x => x.de_re_id === parseInt(params.id));
      if (!c) return { code: 404, message: 'device not found' };
      return { data: c };
    },

    'GET /api/v1/mini/devices/:id/history': function (params, query) {
      const c = MOCK_COLLECTORS.find(x => x.de_re_id === parseInt(params.id));
      if (!c) return { code: 404, message: 'device not found' };
      const range = query.range || '24h';
      const points = generateHistory(range);
      return { data: { de_re_id: c.de_re_id, func_name: c.func_name, unit: c.unit, best_min: c.best_min, best_max: c.best_max, points } };
    },

    'POST /api/v1/mini/devices/:id/control': function (params, body) {
      const c = MOCK_COLLECTORS.find(x => x.de_re_id === parseInt(params.id));
      if (!c) return { code: 404, message: 'device not found' };
      const action = body.action || 'stop';
      const actionLabels = { start: '开启', stop: '停止', close: '关闭' };
      // 模拟控制结果
      const success = Math.random() > 0.1;
      if (success) {
        if (action === 'start') { c.real_value = 1; c.status = 'on'; c.status_label = '开启'; }
        else if (action === 'close') { c.real_value = 0; c.status = 'off'; c.status_label = '关闭'; }
        else { c.real_value = 0; c.status = 'off'; c.status_label = '关闭'; }
      }
      return {
        data: {
          command_id: Date.now(),
          action: action,
          action_label: actionLabels[action] || action,
          status: success ? 'succeeded' : 'failed',
          message: success ? '操作成功' : '设备无响应，请重试',
        },
      };
    },

    // ---- 管理端 ----
    'POST /api/v1/admin/login': function (body) {
      if (!body.username || !body.password) return { code: 400, message: '用户名和密码不能为空' };
      if (body.password !== 'admin123') return { code: 4013, message: '用户名或密码错误' };
      const user = MOCK_USERS.find(u => u.username === body.username && (u.role === 1 || u.role === 2));
      if (!user) return { code: 4013, message: '用户名或密码错误' };
      return { data: { token: 'mock_admin_token_' + user.user_id, user_id: user.user_id, role: user.role, display_name: user.display_name } };
    },

    'GET /api/v1/admin/me': function () {
      const uid = getCurrentUserId();
      const user = MOCK_USERS.find(u => u.user_id === uid) || MOCK_USERS[0];
      return { data: { user_id: user.user_id, username: user.username || '', role: user.role, display_name: user.display_name } };
    },

    'GET /api/v1/admin/dashboard': function () {
      return { data: getDashboard() };
    },

    'GET /api/v1/admin/users': function () {
      const users = MOCK_USERS.map(u => {
        const bindingCount = MOCK_BINDINGS.filter(b => b.user_id === u.user_id).length;
        return {
          user_id: u.user_id,
          username: u.username || '',
          display_name: u.display_name,
          role: u.role,
          role_label: { 1: '超级管理员', 2: '管理员', 3: '农户' }[u.role] || '',
          user_type: u.user_type,
          status: u.status,
          status_label: { 1: '正常', 2: '已禁用', 3: '已删除' }[u.status] || '',
          binding_count: bindingCount,
        };
      });
      return { data: users };
    },

    'GET /api/v1/admin/gateways': function () {
      return { data: MOCK_GATEWAYS.map(g => ({
        ...g,
        online_label: g.online_status === 1 ? '在线' : '离线',
      })) };
    },

    'GET /api/v1/admin/collectors': function () {
      return { data: MOCK_COLLECTORS };
    },

    'GET /api/v1/admin/bindings': function () {
      return { data: MOCK_BINDINGS.map(b => {
        const c = MOCK_COLLECTORS.find(x => x.gateway_id === b.gateway_id && x.freq === b.freq && x.devid === b.devid);
        return { ...b, collector: c || null };
      }) };
    },

    'POST /api/v1/admin/bindings': function (body) {
      const newBinding = {
        bind_id: nextBindId++,
        user_id: body.user_id,
        gateway_id: body.gateway_id,
        shed_no: body.shed_no || '',
        freq: body.freq,
        devid: body.devid,
        func: body.func,
        bind_usr_name: body.bind_usr_name || '',
      };
      MOCK_BINDINGS.push(newBinding);
      return { data: newBinding };
    },

    'DELETE /api/v1/admin/bindings/:id': function (params) {
      const idx = MOCK_BINDINGS.findIndex(b => b.bind_id === parseInt(params.id));
      if (idx < 0) return { code: 404, message: 'binding not found' };
      MOCK_BINDINGS.splice(idx, 1);
      return { data: { deleted: true } };
    },

    'GET /api/v1/admin/control-logs': function () {
      return { data: MOCK_CONTROL_LOGS };
    },
  };

  // ============================================================
  // 请求封装
  // ============================================================

  let currentUserId = 3; // 默认 C 端用户

  function getCurrentUserId() {
    return currentUserId;
  }

  function setCurrentUserId(uid) {
    currentUserId = uid;
  }

  function matchRoute(method, path) {
    // 路径参数匹配：/api/v1/mini/devices/3/realtime -> /api/v1/mini/devices/:id/realtime
    for (const key of Object.keys(mockRoutes)) {
      const [m, routePath] = key.split(' ');
      if (m !== method) continue;

      const routeParts = routePath.split('/');
      const pathParts = path.split('/');
      if (routeParts.length !== pathParts.length) continue;

      const params = {};
      let match = true;
      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          params[routeParts[i].slice(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          match = false;
          break;
        }
      }
      if (match) return { key, params };
    }
    return null;
  }

  async function request(method, path, body) {
    if (API_BASE) {
      // 真实后端请求
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const opts = { method, headers };
      if (body && method !== 'GET') opts.body = JSON.stringify(body);

      const res = await fetch(API_BASE + path, opts);
      return res.json();
    }

    // Mock 请求
    await new Promise(r => setTimeout(r, MOCK_DELAY));

    // 解析 query string
    let query = {};
    const qsIdx = path.indexOf('?');
    const cleanPath = qsIdx >= 0 ? path.substring(0, qsIdx) : path;
    if (qsIdx >= 0) {
      const qs = path.substring(qsIdx + 1);
      qs.split('&').forEach(p => {
        const [k, v] = p.split('=');
        query[k] = decodeURIComponent(v || '');
      });
    }

    const route = matchRoute(method, cleanPath);
    if (!route) {
      return { code: 404, message: 'mock route not found: ' + method + ' ' + cleanPath };
    }

    const handler = mockRoutes[route.key];
    if (!handler) {
      return { code: 404, message: 'mock handler not found' };
    }

    try {
      const result = handler(route.params, body || query);
      return result;
    } catch (e) {
      return { code: 500, message: e.message };
    }
  }

  // ============================================================
  // 公开 API
  // ============================================================
  global.MockAPI = {
    get: function (path) { return request('GET', path); },
    post: function (path, body) { return request('POST', path, body); },
    delete: function (path) { return request('DELETE', path); },

    setUserId: setCurrentUserId,
    getUserId: getCurrentUserId,

    // 便捷方法
    login: async function (type, credentials) {
      if (type === 'mini') {
        return request('POST', '/api/v1/mini/mock-login', credentials || { mock_openid: 'mock_user_001', mock_nickname: '测试农户' });
      }
      return request('POST', '/api/v1/admin/login', credentials);
    },

    getMe: async function (type) {
      return request('GET', '/api/v1/' + type + '/me');
    },

    getDevices: async function () {
      return request('GET', '/api/v1/mini/devices');
    },

    getDeviceRealtime: async function (id) {
      return request('GET', '/api/v1/mini/devices/' + id + '/realtime');
    },

    getDeviceHistory: async function (id, range) {
      return request('GET', '/api/v1/mini/devices/' + id + '/history?range=' + (range || '24h'));
    },

    controlDevice: async function (id, action) {
      return request('POST', '/api/v1/mini/devices/' + id + '/control', { action });
    },

    getDashboard: async function () {
      return request('GET', '/api/v1/admin/dashboard');
    },

    getUsers: async function () {
      return request('GET', '/api/v1/admin/users');
    },

    getGateways: async function () {
      return request('GET', '/api/v1/admin/gateways');
    },

    getCollectors: async function () {
      return request('GET', '/api/v1/admin/collectors');
    },

    getBindings: async function () {
      return request('GET', '/api/v1/admin/bindings');
    },

    addBinding: async function (data) {
      return request('POST', '/api/v1/admin/bindings', data);
    },

    removeBinding: async function (id) {
      return request('DELETE', '/api/v1/admin/bindings/' + id);
    },

    getControlLogs: async function () {
      return request('GET', '/api/v1/admin/control-logs');
    },
  };

})(window);
