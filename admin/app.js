/**
 * 涅凰智农 管理端 — 应用逻辑
 * Hash 路由： #login | #dashboard | #users | #gateways | #bindings | #logs
 */

(function () {
  'use strict';

  // ============================================================
  // 状态
  // ============================================================
  var currentPage = '';

  // ============================================================
  // 工具
  // ============================================================
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function showToast(msg, type) {
    type = type || 'info';
    var el = $('#toast');
    el.textContent = msg;
    el.className = 'toast ' + type + ' show';
    clearTimeout(el._timeout);
    el._timeout = setTimeout(function () { el.className = 'toast'; }, 2500);
  }

  function formatTime(iso) {
    if (!iso) return '--';
    try {
      var d = new Date(iso);
      var pad = function (n) { return n.toString().padStart(2, '0'); };
      return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) { return iso; }
  }

  function formatFullTime(iso) {
    if (!iso) return '--';
    try {
      var d = new Date(iso);
      var pad = function (n) { return n.toString().padStart(2, '0'); };
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    } catch (e) { return iso; }
  }

  function escHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ============================================================
  // 导航
  // ============================================================
  function navigate(page) {
    window.location.hash = '#' + page;
  }

  function setActiveNav(page) {
    $$('.nav-item').forEach(function (item) {
      item.classList.toggle('active', item.dataset.page === page);
    });
  }

  function updatePageTitle(title) {
    $('#topbar-page-title').textContent = title;
  }

  function parseHash() {
    var hash = window.location.hash.replace('#', '') || 'dashboard';
    return { page: hash };
  }

  // ============================================================
  // 页面渲染
  // ============================================================
  function renderPage() {
    var route = parseHash();
    currentPage = route.page;
    var container = $('#main-content');

    if (route.page !== 'login' && !localStorage.getItem('admin_token')) {
      navigate('login');
      return;
    }

    setActiveNav(route.page);

    switch (route.page) {
      case 'login': renderLogin(container); updatePageTitle('登录'); break;
      case 'dashboard': renderDashboard(container); updatePageTitle('Dashboard'); break;
      case 'users': renderUsers(container); updatePageTitle('用户管理'); break;
      case 'gateways': renderGateways(container); updatePageTitle('设备管理'); break;
      case 'bindings': renderBindings(container); updatePageTitle('绑定管理'); break;
      case 'logs': renderLogs(container); updatePageTitle('控制日志'); break;
      default: renderDashboard(container); updatePageTitle('Dashboard');
    }
  }

  // ---------- 登录 ----------
  function renderLogin(container) {
    $('#sidebar').style.display = 'none';
    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;min-height:80vh">' +
        '<div style="width:360px;background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-md);padding:36px 28px">' +
          '<div style="text-align:center;margin-bottom:24px">' +
            '<h2 style="font-size:22px;font-weight:700;color:var(--color-primary-dark)">涅凰智农</h2>' +
            '<p style="font-size:13px;color:var(--color-text-muted);margin-top:4px">管理后台</p>' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">用户名</label>' +
            '<input class="form-input" id="login-username" type="text" placeholder="请输入用户名" value="admin">' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">密码</label>' +
            '<input class="form-input" id="login-password" type="password" placeholder="请输入密码" value="admin123">' +
          '</div>' +
          '<button class="btn btn-primary btn-block" id="login-submit" style="margin-top:8px">登录</button>' +
          '<p style="font-size:11px;color:var(--color-text-muted);text-align:center;margin-top:12px">测试账号：admin / admin123</p>' +
        '</div>' +
      '</div>';

    // Safari 安全策略：innerHTML 动态插入的 password input 会丢失 value
    // 必须通过 JS 显式设置，不能依赖 HTML value 属性
    var usernameInput = $('#login-username');
    var passwordInput = $('#login-password');
    usernameInput.value = 'admin';
    passwordInput.value = 'admin123';

    $('#login-submit').onclick = function () {
      // 每次点击时重新从 DOM 获取值（避免 Safari 引用丢失问题）
      var username = ($('#login-username') || {}).value || '';
      var password = ($('#login-password') || {}).value || '';
      username = (username || '').trim();
      password = (password || '').trim();
      console.debug('[Login] username=', username, 'password_len=', password.length);
      if (!username || !password) { showToast('请输入用户名和密码', 'error'); return; }
      doAdminLogin(username, password);
    };

    // 回车登录
    passwordInput.onkeydown = function (e) {
      if (e.key === 'Enter') $('#login-submit').click();
    };
  }

  async function doAdminLogin(username, password) {
    var btn = $('#login-submit');
    btn.disabled = true;
    btn.textContent = '登录中...';
    try {
      var res = await MockAPI.login('admin', { username: username, password: password });
      if (res.data && res.data.token) {
        localStorage.setItem('admin_token', res.data.token);
        localStorage.setItem('admin_user', JSON.stringify(res.data));
        MockAPI.setUserId(res.data.user_id);
        updateSidebarUser(res.data);
        showToast('登录成功', 'success');
        $('#sidebar').style.display = '';
        navigate('dashboard');
      } else {
        showToast(res.message || '登录失败', 'error');
      }
    } catch (e) {
      // 显示具体错误原因，方便调试（CORS/超时/mock 密码错误等）
      var msg = e.message || '网络异常，请重试';
      console.error('[AdminLogin] 登录失败:', e);
      showToast(msg, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '登录';
    }
  }

  function updateSidebarUser(user) {
    if (!user) return;
    var initial = (user.display_name || '管').charAt(0);
    $('#sidebar-user-avatar').textContent = initial;
    $('#sidebar-user-name').textContent = user.display_name;
    $('#sidebar-user-role').textContent = user.role === 1 ? '超级管理员' : '管理员';
  }

  function doLogout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    showToast('已退出登录', 'info');
    navigate('login');
  }

  // ---------- Dashboard ----------
  async function renderDashboard(container) {
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>加载仪表盘...</p></div>';
    try {
      var res = await MockAPI.getDashboard();
      if (!res.data) { container.innerHTML = '<div class="error-state"><p>加载失败</p><button class="btn btn-outline btn-sm" onclick="renderPage()">重试</button></div>'; return; }
      var d = res.data;

      var html = '<div class="stat-grid">' +
        '<div class="stat-card"><div class="stat-card-label">在线云边设备</div><div class="stat-card-value">' + d.online_gateways + '<span style="font-size:16px;font-weight:400;color:var(--color-text-muted)"> / ' + d.total_gateways + '</span></div></div>' +
        '<div class="stat-card"><div class="stat-card-label">采集执行器</div><div class="stat-card-value">' + d.total_collectors + '</div><div class="stat-card-sub">功能点数</div></div>' +
        '<div class="stat-card"><div class="stat-card-label">农户数量</div><div class="stat-card-value">' + d.farmer_count + '</div></div>' +
        '<div class="stat-card"><div class="stat-card-label">今日上报数据</div><div class="stat-card-value">' + d.today_reports.toLocaleString() + '</div><div class="stat-card-sub">最近上报：' + formatTime(d.last_report_time) + '</div></div>' +
      '</div>';

      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = '<div class="error-state"><p>加载失败</p><button class="btn btn-outline btn-sm" onclick="renderPage()">重试</button></div>';
    }
  }

  // ---------- 用户管理（农户列表） ----------
  async function renderUsers(container) {
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>加载农户列表...</p></div>';
    try {
      var res = await MockAPI.getFarmers();
      if (!res.data) {
        // fallback：使用 getUsers 接口，前端过滤 user_type=2
        var usersRes = await MockAPI.getUsers();
        if (!usersRes.data) { container.innerHTML = '<div class="error-state"><p>加载失败</p><button class="btn btn-outline btn-sm" onclick="renderPage()">重试</button></div>'; return; }
        var farmers = usersRes.data.filter(function (u) { return u.user_type === 2; });
      } else {
        var farmers = res.data;
      }

      var html = '<div class="table-section">' +
        '<div class="table-header">' +
          '<h3>农户列表</h3>' +
          '<div class="table-header-right">' +
            '<input class="table-search" id="user-search" type="text" placeholder="搜索姓名/手机号/微信OpenID...">' +
            '<span class="table-count">共 ' + farmers.length + ' 户</span>' +
          '</div>' +
        '</div>' +
        '<div class="table-wrap"><table>' +
          '<thead><tr><th>ID</th><th>姓名</th><th>手机号</th><th>地址</th><th>微信OpenID</th><th>绑定设备</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>' +
          '<tbody id="user-tbody">' +
            farmers.map(function (u) {
              var statusBadge = u.status === 1 ? 'badge-success' : u.status === 2 ? 'badge-warning' : 'badge-muted';
              return '<tr>' +
                '<td>' + u.user_id + '</td>' +
                '<td>' + escHtml(u.display_name) + '</td>' +
                '<td>' + escHtml(u.mobile || '--') + '</td>' +
                '<td>' + escHtml(u.address || '--') + '</td>' +
                '<td><span style="font-size:11px;word-break:break-all">' + escHtml(u.wechat_openid || '--') + '</span></td>' +
                '<td>' + (u.binding_count || 0) + ' 台</td>' +
                '<td><span class="badge ' + statusBadge + '">' + escHtml(u.status_label || '正常') + '</span></td>' +
                '<td>' + formatTime(u.created_at) + '</td>' +
                '<td><button class="btn btn-outline btn-sm" onclick="openEditFarmerModal(' + u.user_id + ')">编辑</button></td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table></div>' +
      '</div>';

      container.innerHTML = html;

      // 搜索：优先通过后端 keyword 参数搜索，降级为前端过滤
      var searchTimer = null;
      $('#user-search').oninput = function () {
        var q = this.value.trim();
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          if (q) {
            // 优先使用后端搜索
            searchFarmers(q);
          } else {
            // 空关键词：重新加载全部
            renderPage();
          }
        }, 400);
      };

      // 存储当前 farmer 列表以便搜索降级
      container._farmers = farmers;
    } catch (e) {
      container.innerHTML = '<div class="error-state"><p>加载失败</p><button class="btn btn-outline btn-sm" onclick="renderPage()">重试</button></div>';
    }
  }

  async function searchFarmers(keyword) {
    var tbody = $('#user-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" class="table-empty">搜索中...</td></tr>';
    try {
      var res = await MockAPI.getFarmers(keyword);
      if (res.data && res.data.length > 0) {
        renderFarmerTableBody(res.data);
      } else if (res.data && res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="table-empty">未找到匹配的农户</td></tr>';
      } else {
        // fallback：前端过滤
        var container = $('#main-content');
        var farmers = container._farmers || [];
        var kw = keyword.toLowerCase();
        var filtered = farmers.filter(function (u) {
          return (u.display_name && u.display_name.toLowerCase().includes(kw)) ||
                 (u.mobile && u.mobile.toLowerCase().includes(kw)) ||
                 (u.wechat_openid && u.wechat_openid.toLowerCase().includes(kw));
        });
        renderFarmerTableBody(filtered);
      }
    } catch (e) {
      // 降级前端过滤
      var container = $('#main-content');
      var farmers = container._farmers || [];
      var kw = keyword.toLowerCase();
      var filtered = farmers.filter(function (u) {
        return (u.display_name && u.display_name.toLowerCase().includes(kw)) ||
               (u.mobile && u.mobile.toLowerCase().includes(kw)) ||
               (u.wechat_openid && u.wechat_openid.toLowerCase().includes(kw));
      });
      renderFarmerTableBody(filtered);
    }
  }

  function renderFarmerTableBody(farmers) {
    var tbody = $('#user-tbody');
    if (!tbody) return;
    if (farmers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="table-empty">未找到匹配的农户</td></tr>';
      return;
    }
    tbody.innerHTML = farmers.map(function (u) {
      var statusBadge = u.status === 1 ? 'badge-success' : u.status === 2 ? 'badge-warning' : 'badge-muted';
      return '<tr>' +
        '<td>' + u.user_id + '</td>' +
        '<td>' + escHtml(u.display_name) + '</td>' +
        '<td>' + escHtml(u.mobile || '--') + '</td>' +
        '<td>' + escHtml(u.address || '--') + '</td>' +
        '<td><span style="font-size:11px;word-break:break-all">' + escHtml(u.wechat_openid || '--') + '</span></td>' +
        '<td>' + (u.binding_count || 0) + ' 台</td>' +
        '<td><span class="badge ' + statusBadge + '">' + escHtml(u.status_label || '正常') + '</span></td>' +
        '<td>' + formatTime(u.created_at) + '</td>' +
        '<td><button class="btn btn-outline btn-sm" onclick="openEditFarmerModal(' + u.user_id + ')">编辑</button></td>' +
      '</tr>';
    }).join('');
  }

  // ---------- 编辑农户 Modal ----------
  function openEditFarmerModal(userId) {
    var overlay = $('#modal-overlay');
    overlay.style.display = 'flex';
    overlay.innerHTML =
      '<div class="modal">' +
        '<h3>编辑农户信息</h3>' +
        '<div class="form-group" style="display:none"><label class="form-label">用户 ID</label><input class="form-input" id="edit-farmer-id" type="number" readonly></div>' +
        '<div class="form-group"><label class="form-label">姓名</label><input class="form-input" id="edit-farmer-name" placeholder="请输入姓名"></div>' +
        '<div class="form-group"><label class="form-label">手机号</label><input class="form-input" id="edit-farmer-mobile" placeholder="请输入手机号"></div>' +
        '<div class="form-group"><label class="form-label">地址</label><input class="form-input" id="edit-farmer-address" placeholder="请输入地址"></div>' +
        '<div class="form-group"><label class="form-label">备注</label><input class="form-input" id="edit-farmer-remark" placeholder="请输入备注"></div>' +
        '<div class="form-group"><label class="form-label">状态</label><select class="form-select" id="edit-farmer-status"><option value="1">正常</option><option value="2">已禁用</option></select></div>' +
        '<div class="modal-actions">' +
          '<button class="btn btn-outline btn-sm" onclick="closeModal()">取消</button>' +
          '<button class="btn btn-primary btn-sm" onclick="doUpdateFarmer()">保存</button>' +
        '</div>' +
      '</div>';

    // 加载农户详情
    (async function () {
      try {
        var res = await MockAPI.getFarmerDetail(userId);
        if (res.data) {
          $('#edit-farmer-id').value = res.data.user_id;
          $('#edit-farmer-name').value = res.data.display_name || '';
          $('#edit-farmer-mobile').value = res.data.mobile || '';
          $('#edit-farmer-address').value = res.data.address || '';
          $('#edit-farmer-remark').value = res.data.remark || '';
          $('#edit-farmer-status').value = res.data.status || 1;
        } else {
          showToast('加载农户详情失败', 'error');
        }
      } catch (e) {
        showToast('加载农户详情失败', 'error');
      }
    })();
  }

  async function doUpdateFarmer() {
    var userId = parseInt($('#edit-farmer-id').value);
    if (!userId) { showToast('用户 ID 无效', 'error'); return; }

    var data = {
      display_name: $('#edit-farmer-name').value.trim(),
      mobile: $('#edit-farmer-mobile').value.trim(),
      address: $('#edit-farmer-address').value.trim(),
      remark: $('#edit-farmer-remark').value.trim(),
      status: parseInt($('#edit-farmer-status').value),
    };

    if (!data.display_name) { showToast('请输入姓名', 'error'); return; }

    try {
      var res = await MockAPI.updateFarmer(userId, data);
      if (res.data) {
        showToast('保存成功', 'success');
        closeModal();
        renderPage();
      } else {
        showToast(res.message || '保存失败', 'error');
      }
    } catch (e) {
      showToast('操作异常', 'error');
    }
  }

  // ---------- 设备管理 ----------
  async function renderGateways(container) {
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>加载设备数据...</p></div>';
    try {
      var gwRes = await MockAPI.getGateways();
      var clRes = await MockAPI.getCollectors();
      if (!gwRes.data || !clRes.data) { container.innerHTML = '<div class="error-state"><p>加载失败</p><button class="btn btn-outline btn-sm" onclick="renderPage()">重试</button></div>'; return; }
      var gateways = gwRes.data;
      var collectors = clRes.data;

      // 云边设备表
      var html = '<div class="table-section" style="margin-bottom:18px">' +
        '<div class="table-header"><h3>云边设备</h3><span class="table-count">共 ' + gateways.length + ' 台</span></div>' +
        '<div class="table-wrap"><table>' +
          '<thead><tr><th>ID</th><th>设备名称</th><th>IP</th><th>端口</th><th>SN</th><th>状态</th><th>最近心跳</th></tr></thead>' +
          '<tbody>' +
            gateways.map(function (g) {
              var statusHtml = g.online_status === 1
                ? '<span class="status-dot status-dot-online"></span>在线'
                : '<span class="status-dot status-dot-offline"></span>离线';
              return '<tr>' +
                '<td>' + g.gateway_id + '</td>' +
                '<td>' + escHtml(g.gateway_name) + '</td>' +
                '<td>' + escHtml(g.ip) + '</td>' +
                '<td>' + g.port + '</td>' +
                '<td>' + escHtml(g.gateway_sn || '--') + '</td>' +
                '<td>' + statusHtml + '</td>' +
                '<td>' + formatTime(g.last_heartbeat_at_ms) + '</td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table></div>' +
      '</div>';

      // 采集执行器表
      html += '<div class="table-section">' +
        '<div class="table-header">' +
          '<h3>采集执行器 / 功能点</h3>' +
          '<div class="table-header-right">' +
            '<input class="table-search" id="collector-search" type="text" placeholder="搜索棚号/设备...">' +
            '<span class="table-count">共 ' + collectors.length + ' 个</span>' +
          '</div>' +
        '</div>' +
        '<div class="table-wrap"><table>' +
          '<thead><tr><th>ID</th><th>云边设备</th><th>棚号</th><th>频点</th><th>设备ID</th><th>功能</th><th>实时值</th><th>单位</th><th>状态</th><th>更新时间</th></tr></thead>' +
          '<tbody id="collector-tbody">' +
            collectors.map(function (c) {
              var statusClass = 'status-dot-' + (c.status === 'normal' || c.status === 'on' ? 'normal' : c.status === 'offline' ? 'offline' : 'warning');
              return '<tr>' +
                '<td>' + c.de_re_id + '</td>' +
                '<td>' + escHtml(c.gateway_name) + '</td>' +
                '<td>' + escHtml(c.shed_no) + '</td>' +
                '<td>' + c.freq + '</td>' +
                '<td>' + c.devid + '</td>' +
                '<td>' + escHtml(c.func_name) + '</td>' +
                '<td>' + (c.real_value != null ? c.real_value : '--') + '</td>' +
                '<td>' + escHtml(c.unit) + '</td>' +
                '<td><span class="status-dot ' + statusClass + '"></span>' + escHtml(c.status_label) + '</td>' +
                '<td>' + formatTime(c.updated_at) + '</td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table></div>' +
      '</div>';

      container.innerHTML = html;

      $('#collector-search').oninput = function () {
        var q = this.value.toLowerCase();
        $$('#collector-tbody tr').forEach(function (tr) {
          tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      };
    } catch (e) {
      container.innerHTML = '<div class="error-state"><p>加载失败</p><button class="btn btn-outline btn-sm" onclick="renderPage()">重试</button></div>';
    }
  }

  // ---------- 绑定管理 ----------
  var deviceTreeData = null; // 缓存设备树

  async function renderBindings(container) {
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>加载绑定关系...</p></div>';
    try {
      var res = await MockAPI.getBindings();
      if (!res.data) { container.innerHTML = '<div class="error-state"><p>加载失败</p><button class="btn btn-outline btn-sm" onclick="renderPage()">重试</button></div>'; return; }
      var bindings = res.data;

      var html = '<div class="table-section">' +
        '<div class="table-header">' +
          '<h3>绑定关系</h3>' +
          '<div class="table-header-right">' +
            '<button class="btn btn-primary btn-sm" onclick="openAddBindingModal()">+ 新增绑定</button>' +
            '<span class="table-count">共 ' + bindings.length + ' 条</span>' +
          '</div>' +
        '</div>' +
        '<div class="table-wrap"><table>' +
          '<thead><tr><th>ID</th><th>农户</th><th>云边设备ID</th><th>棚号</th><th>频点</th><th>设备ID</th><th>功能</th><th>操作</th></tr></thead>' +
          '<tbody>' +
            bindings.map(function (b) {
              var funcName = b.collector ? b.collector.func_name : ('功能' + b.func);
              return '<tr>' +
                '<td>' + b.bind_id + '</td>' +
                '<td>' + escHtml(b.bind_usr_name) + '</td>' +
                '<td>' + b.gateway_id + '</td>' +
                '<td>' + escHtml(b.shed_no) + '</td>' +
                '<td>' + b.freq + '</td>' +
                '<td>' + b.devid + '</td>' +
                '<td>' + escHtml(funcName) + '</td>' +
                '<td><button class="btn btn-danger btn-sm" onclick="doRemoveBinding(' + b.bind_id + ')">解绑</button></td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table></div>' +
      '</div>';

      container.innerHTML = html;

      // 预加载设备树
      loadDeviceTree();
    } catch (e) {
      container.innerHTML = '<div class="error-state"><p>加载失败</p><button class="btn btn-outline btn-sm" onclick="renderPage()">重试</button></div>';
    }
  }

  async function loadDeviceTree() {
    try {
      var res = await MockAPI.getDeviceTree();
      if (res.data) {
        deviceTreeData = res.data;
      }
    } catch (e) {
      console.warn('加载设备树失败:', e);
    }
  }

  function openAddBindingModal() {
    var overlay = $('#modal-overlay');
    overlay.style.display = 'flex';

    if (!deviceTreeData || deviceTreeData.length === 0) {
      overlay.innerHTML =
        '<div class="modal">' +
          '<h3>新增绑定</h3>' +
          '<p style="color:var(--color-text-muted);font-size:13px;text-align:center;padding:20px">设备树加载中，请稍后重试...</p>' +
          '<div class="modal-actions">' +
            '<button class="btn btn-outline btn-sm" onclick="closeModal()">取消</button>' +
          '</div>' +
        '</div>';
      // 重新加载设备树
      loadDeviceTree().then(function () { openAddBindingModal(); });
      return;
    }

    // 获取已绑定的 point_id 列表
    var boundPointIds = [];
    // 通过全局 bindings 数据获取（从 DOM 或重新请求）
    MockAPI.getBindings().then(function (res) {
      if (res.data) {
        boundPointIds = res.data.map(function (b) { return b.point_id; }).filter(Boolean);
        // 刷新已绑定的标记
        refreshBindingTreeSelection(boundPointIds);
      }
    });

    overlay.innerHTML = buildDeviceTreeModal();
    overlay._boundPointIds = boundPointIds;
  }

  function buildDeviceTreeModal() {
    var html = '<div class="modal" style="width:520px;max-width:95vw">' +
      '<h3>新增绑定 — 设备树选择</h3>' +
      '<p style="font-size:12px;color:var(--color-text-muted);margin-bottom:14px">选择采集点与农户进行绑定（灰色项表示已绑定）</p>' +
      '<div class="form-group">' +
        '<label class="form-label">农户</label>' +
        '<select class="form-select" id="bind-farmer-select"><option value="">请选择农户...</option></select>' +
      '</div>' +
      '<div class="device-tree" id="device-tree-container" style="max-height:320px;overflow-y:auto;border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:10px">' +
        '<p style="font-size:12px;color:var(--color-text-muted);text-align:center">加载设备树...</p>' +
      '</div>' +
      '<input type="hidden" id="bind-point-id" value="">' +
      '<div class="modal-actions">' +
        '<button class="btn btn-outline btn-sm" onclick="closeModal()">取消</button>' +
        '<button class="btn btn-primary btn-sm" id="btn-confirm-binding" disabled onclick="doAddBinding()">确认绑定</button>' +
      '</div>' +
    '</div>';

    // 异步加载农户列表到下拉框
    setTimeout(async function () {
      try {
        var farmersRes = await MockAPI.getFarmers();
        var farmers = farmersRes.data || [];
        var select = $('#bind-farmer-select');
        if (select) {
          farmers.forEach(function (f) {
            var opt = document.createElement('option');
            opt.value = f.user_id;
            opt.textContent = f.display_name + ' (' + (f.mobile || '--') + ')';
            select.appendChild(opt);
          });
        }
      } catch (e) {
        // fallback：使用 getUsers
        try {
          var usersRes = await MockAPI.getUsers();
          var users = (usersRes.data || []).filter(function (u) { return u.user_type === 2; });
          var select = $('#bind-farmer-select');
          if (select) {
            users.forEach(function (u) {
              var opt = document.createElement('option');
              opt.value = u.user_id;
              opt.textContent = u.display_name;
              select.appendChild(opt);
            });
          }
        } catch (e2) {}
      }
    }, 50);

    // 异步渲染设备树
    setTimeout(function () {
      renderDeviceTreeInModal();
    }, 80);

    return html;
  }

  function renderDeviceTreeInModal(boundPointIds) {
    var container = $('#device-tree-container');
    if (!container) return;
    boundPointIds = boundPointIds || [];

    if (!deviceTreeData || deviceTreeData.length === 0) {
      container.innerHTML = '<p style="font-size:12px;color:var(--color-text-muted);text-align:center;padding:20px">暂无设备树数据</p>';
      return;
    }

    var html = '';
    deviceTreeData.forEach(function (gw) {
      var gwOnline = gw.online_status === 1;
      html += '<div class="tree-gateway" style="margin-bottom:8px">' +
        '<div class="tree-gateway-header" style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--color-bg);border-radius:var(--radius-sm);cursor:pointer;font-weight:600;font-size:13px" onclick="toggleTreeNode(this)">' +
          '<span style="font-size:10px;transition:transform 0.2s;display:inline-block" class="tree-arrow">▶</span>' +
          '<span class="status-dot ' + (gwOnline ? 'status-dot-online' : 'status-dot-offline') + '"></span>' +
          escHtml(gw.gateway_name) + ' (ID:' + gw.gateway_id + ')' +
        '</div>' +
        '<div class="tree-children" style="display:none;margin-left:20px;border-left:1px solid var(--color-border);padding-left:10px">';

      (gw.collectors || []).forEach(function (cl) {
        html += '<div class="tree-collector" style="margin:4px 0">' +
          '<div class="tree-collector-header" style="display:flex;align-items:center;gap:6px;padding:4px 8px;cursor:pointer;font-size:12px;font-weight:500;color:var(--color-text-secondary)" onclick="toggleTreeNode(this)">' +
            '<span style="font-size:10px;transition:transform 0.2s;display:inline-block" class="tree-arrow">▶</span>' +
            escHtml(cl.shed_no) + ' · ' + escHtml(cl.collector_no) +
          '</div>' +
          '<div class="tree-children" style="display:none;margin-left:16px;border-left:1px solid var(--color-border);padding-left:8px">';

        (cl.points || []).forEach(function (pt) {
          var isBound = boundPointIds.indexOf(pt.point_id) >= 0;
          var boundStyle = isBound ? 'color:var(--color-text-muted);cursor:not-allowed;opacity:0.55' : 'cursor:pointer';
          html += '<div class="tree-point" data-point-id="' + pt.point_id + '" data-gateway-id="' + gw.gateway_id + '" style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;margin:2px 0;border-radius:4px;' + boundStyle + '" onclick="' + (isBound ? '' : 'selectBindingPoint(this,' + pt.point_id + ',' + gw.gateway_id + ')') + '">' +
            '<span style="font-size:12px">' +
              escHtml(pt.func_name) + ' · 频点' + pt.freq + ' · DevID:' + pt.devid +
              (pt.unit ? ' (' + escHtml(pt.unit) + ')' : '') +
            '</span>' +
            (isBound ? '<span class="badge badge-muted" style="font-size:10px">已绑定</span>' : '') +
          '</div>';
        });

        html += '</div></div>';
      });

      html += '</div></div>';
    });

    container.innerHTML = html;
  }

  function refreshBindingTreeSelection(boundPointIds) {
    var container = $('#device-tree-container');
    if (!container) return;
    // 简单重新渲染
    renderDeviceTreeInModal(boundPointIds);
  }

  function toggleTreeNode(headerEl) {
    var arrow = headerEl.querySelector('.tree-arrow');
    var children = headerEl.parentElement.querySelector('.tree-children');
    if (children) {
      var isHidden = children.style.display === 'none';
      children.style.display = isHidden ? 'block' : 'none';
      if (arrow) {
        arrow.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
      }
    }
  }

  function selectBindingPoint(el, pointId, gatewayId) {
    // 取消之前选中
    var allPoints = $$('.tree-point');
    allPoints.forEach(function (p) { p.style.background = ''; p.style.fontWeight = ''; });

    el.style.background = 'var(--color-primary-light)';
    el.style.fontWeight = '600';

    $('#bind-point-id').value = pointId;
    // 也存 gateway_id 以备后续使用
    el.setAttribute('data-selected', 'true');

    var btn = $('#btn-confirm-binding');
    if (btn) btn.disabled = false;
  }

  function closeModal() {
    $('#modal-overlay').style.display = 'none';
  }

  async function doAddBinding() {
    var userId = parseInt($('#bind-farmer-select').value);
    var pointId = parseInt($('#bind-point-id').value);

    if (!userId) { showToast('请选择农户', 'error'); return; }
    if (!pointId) { showToast('请选择一个采集点', 'error'); return; }

    // 从设备树中查找 point 详细信息
    var pointInfo = null;
    if (deviceTreeData) {
      for (var gi = 0; gi < deviceTreeData.length; gi++) {
        var gw = deviceTreeData[gi];
        for (var ci = 0; ci < (gw.collectors || []).length; ci++) {
          var cl = gw.collectors[ci];
          for (var pi = 0; pi < (cl.points || []).length; pi++) {
            if (cl.points[pi].point_id === pointId) {
              pointInfo = cl.points[pi];
              pointInfo._gateway_id = gw.gateway_id;
              pointInfo._gateway_name = gw.gateway_name;
              pointInfo._shed_no = cl.shed_no;
              break;
            }
          }
          if (pointInfo) break;
        }
        if (pointInfo) break;
      }
    }

    var data = {
      user_id: userId,
      point_id: pointId,
    };

    if (pointInfo) {
      data.gateway_id = pointInfo._gateway_id;
      data.shed_no = pointInfo._shed_no;
      data.freq = pointInfo.freq;
      data.devid = pointInfo.devid;
      data.func = pointInfo.func;
    }

    try {
      var res = await MockAPI.addBinding(data);
      if (res.data) {
        showToast('绑定成功', 'success');
        closeModal();
        renderPage();
      } else {
        showToast(res.message || '绑定失败', 'error');
      }
    } catch (e) {
      showToast('操作异常', 'error');
    }
  }

  async function doRemoveBinding(id) {
    if (!confirm('确认解除该绑定关系？')) return;
    try {
      var res = await MockAPI.removeBinding(id);
      if (res.data && res.data.deleted) {
        showToast('解绑成功', 'success');
        renderPage();
      } else {
        showToast(res.message || '解绑失败', 'error');
      }
    } catch (e) {
      showToast('操作异常', 'error');
    }
  }

  // ---------- 控制日志 ----------
  async function renderLogs(container) {
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>加载控制日志...</p></div>';
    try {
      var res = await MockAPI.getControlLogs();
      if (!res.data) { container.innerHTML = '<div class="error-state"><p>加载失败</p><button class="btn btn-outline btn-sm" onclick="renderPage()">重试</button></div>'; return; }
      var logs = res.data;

      var html = '<div class="table-section">' +
        '<div class="table-header">' +
          '<h3>控制日志</h3>' +
          '<div class="table-header-right">' +
            '<input class="table-search" id="log-search" type="text" placeholder="搜索操作人/设备...">' +
            '<span class="table-count">共 ' + logs.length + ' 条</span>' +
          '</div>' +
        '</div>' +
        '<div class="table-wrap"><table>' +
          '<thead><tr><th>ID</th><th>操作人</th><th>设备</th><th>功能</th><th>操作类型</th><th>命令状态</th><th>结果</th><th>操作时间</th></tr></thead>' +
          '<tbody id="log-tbody">' +
            logs.map(function (l) {
              var statusBadge = l.cmd_status === 'succeeded' ? 'badge-success' : l.cmd_status === 'failed' ? 'badge-danger' : 'badge-warning';
              return '<tr>' +
                '<td>' + l.op_id + '</td>' +
                '<td>' + escHtml(l.bind_usr_name) + '</td>' +
                '<td>' + escHtml(l.gateway_name) + ' / ' + l.freq + ' / ' + l.devid + '</td>' +
                '<td>' + escHtml(l.func_name) + '</td>' +
                '<td>' + escHtml(l.op_type) + '</td>' +
                '<td><span class="badge ' + statusBadge + '">' + escHtml(l.cmd_status_label) + '</span></td>' +
                '<td>' + escHtml(l.result) + '</td>' +
                '<td>' + formatFullTime(l.op_time) + '</td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table></div>' +
      '</div>';

      container.innerHTML = html;

      $('#log-search').oninput = function () {
        var q = this.value.toLowerCase();
        $$('#log-tbody tr').forEach(function (tr) {
          tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      };
    } catch (e) {
      container.innerHTML = '<div class="error-state"><p>加载失败</p><button class="btn btn-outline btn-sm" onclick="renderPage()">重试</button></div>';
    }
  }

  // ============================================================
  // 初始化
  // ============================================================

  // 更新时间
  function updateClock() {
    var now = new Date();
    var pad = function (n) { return n.toString().padStart(2, '0'); };
    $('#topbar-time').textContent = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  }
  setInterval(updateClock, 1000);
  updateClock();

  // 版本号（控制台 + 页脚 + 右下角浮标）
  console.info('%c涅凰智农 IoT v' + (window.APP_VERSION_STRING || '?'), 'color:#2ecc71;font-weight:bold');
  // 侧边栏页脚
  var versionEl = document.getElementById('app-version');
  if (versionEl) versionEl.textContent = 'v' + (window.APP_VERSION || '?');
  // 登录页也能看到的右下角浮标
  var badge = document.getElementById('version-badge');
  if (badge && window.APP_VERSION) badge.textContent = 'v' + window.APP_VERSION;

  window.addEventListener('hashchange', renderPage);
  window.addEventListener('load', function () {
    var token = localStorage.getItem('admin_token');
    var userJson = localStorage.getItem('admin_user');
    if (token && userJson) {
      try {
        var user = JSON.parse(userJson);
        MockAPI.setUserId(user.user_id);
        updateSidebarUser(user);
        $('#sidebar').style.display = '';
      } catch (e) {}
    }
    renderPage();
  });

  // 点击 modal 遮罩关闭
  document.addEventListener('click', function (e) {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  // 暴露
  window.navigate = navigate;
  window.renderPage = renderPage;
  window.doLogout = doLogout;
  window.doRemoveBinding = doRemoveBinding;
  window.openAddBindingModal = openAddBindingModal;
  window.closeModal = closeModal;
  window.doAddBinding = doAddBinding;
  window.openEditFarmerModal = openEditFarmerModal;
  window.doUpdateFarmer = doUpdateFarmer;
  window.toggleTreeNode = toggleTreeNode;
  window.selectBindingPoint = selectBindingPoint;

})();
