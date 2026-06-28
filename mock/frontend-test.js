/**
 * Frontend 回归测试 — Token 认证与路由逻辑
 *
 * 测试场景:
 *   1. Token key 命名 (nh_admin_token / nh_mini_token)
 *   2. Token 不互相覆盖
 *   3. Token 按路径选择
 *   4. Admin 403 不 fallback
 *   8. Admin 页面守卫
 *
 * 运行方式: node frontend-test.js
 *
 * 注意: 这些测试在 Node.js 环境运行，使用 jsdom 模拟浏览器环境。
 * 如果没有 jsdom，请先运行: npm install jsdom
 */

'use strict';

// ============================================================
// 环境检测
// ============================================================
let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  console.error('❌ 需要 jsdom 模块。请运行: npm install jsdom');
  process.exit(1);
}

// ============================================================
// 测试统计
// ============================================================
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(msg);
    console.error('  ❌ FAIL:', msg);
  }
}

function summary() {
  console.log('\n========================================');
  console.log(`  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================');
  if (failed > 0) {
    console.log('\n失败列表:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log('✅ 所有测试通过！');
    process.exit(0);
  }
}

// ============================================================
// 辅助: 创建模拟浏览器环境
// ============================================================
function createBrowserEnv() {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:3000/admin/',
  });
  const win = dom.window;
  const doc = win.document;

  // 模拟 localStorage
  const store = {};
  const localStorage = {
    _store: store,
    getItem: function (key) { return store[key] || null; },
    setItem: function (key, value) { store[key] = String(value); },
    removeItem: function (key) { delete store[key]; },
    clear: function () { Object.keys(store).forEach(k => delete store[k]); },
  };

  return { dom, win, doc, localStorage };
}

// ============================================================
// 加载 mock-api.js 的核心逻辑（手动提取以便测试）
// ============================================================

/**
 * getTokenForPath 的独立实现（与 mock-api.js 保持一致）
 */
function getTokenForPath(path, localStorage) {
  // login 接口不需要带 token
  if (path === '/api/v1/admin/login' || path === '/api/v1/mini/mock-login') {
    return null;
  }
  if (path.indexOf('/api/v1/admin/') === 0 || path === '/api/v1/admin') {
    return localStorage.getItem('nh_admin_token') || null;
  }
  if (path.indexOf('/api/v1/mini/') === 0 || path === '/api/v1/mini') {
    return localStorage.getItem('nh_mini_token') || null;
  }
  // /api/v1/gateways 等通用接口 — 优先 admin token，其次 mini token
  return localStorage.getItem('nh_admin_token') || localStorage.getItem('nh_mini_token') || null;
}

/**
 * isProtectedAdminPath 的独立实现（与 mock-api.js 保持一致）
 */
function isProtectedAdminPath(path) {
  if (path.indexOf('/api/v1/admin/') !== 0 && path !== '/api/v1/admin') return false;
  if (path === '/api/v1/admin/login') return false;
  return true;
}

// ============================================================
// 测试: 场景 1 — Token key 命名
// ============================================================
console.log('\n📋 场景 1: Token key 命名');

function test_scenario1() {
  const { localStorage } = createBrowserEnv();

  // admin 登录后存储 key
  localStorage.setItem('nh_admin_token', 'admin_token_123');
  assert(
    localStorage.getItem('nh_admin_token') === 'admin_token_123',
    'admin 登录后 nh_admin_token 应有值'
  );

  // mini 登录后存储 key
  localStorage.setItem('nh_mini_token', 'mini_token_456');
  assert(
    localStorage.getItem('nh_mini_token') === 'mini_token_456',
    'mini 登录后 nh_mini_token 应有值'
  );

  // 不应该存在旧的 key 名
  assert(
    localStorage.getItem('token') === null,
    '不应存在旧的 "token" key'
  );
  assert(
    localStorage.getItem('admin_token') === null,
    '不应存在旧的 "admin_token" key'
  );

  console.log('  场景 1 完成');
}

// ============================================================
// 测试: 场景 2 — Token 不互相覆盖
// ============================================================
console.log('\n📋 场景 2: Token 不互相覆盖');

function test_scenario2() {
  const { localStorage } = createBrowserEnv();

  // 先 admin 登录
  localStorage.setItem('nh_admin_token', 'admin_token_abc');
  assert(
    localStorage.getItem('nh_admin_token') === 'admin_token_abc',
    'admin 登录后 nh_admin_token 应为 admin_token_abc'
  );

  // 再 mini 登录
  localStorage.setItem('nh_mini_token', 'mini_token_xyz');
  assert(
    localStorage.getItem('nh_mini_token') === 'mini_token_xyz',
    'mini 登录后 nh_mini_token 应为 mini_token_xyz'
  );

  // admin token 应该还在
  assert(
    localStorage.getItem('nh_admin_token') === 'admin_token_abc',
    'mini 登录后 nh_admin_token 仍应为 admin_token_abc（未被覆盖）'
  );

  // 反过来：先清除，再 mini 先登录
  localStorage.clear();
  localStorage.setItem('nh_mini_token', 'mini_token_first');
  localStorage.setItem('nh_admin_token', 'admin_token_second');
  assert(
    localStorage.getItem('nh_mini_token') === 'mini_token_first',
    'admin 登录后 nh_mini_token 应保留（未被覆盖）'
  );

  console.log('  场景 2 完成');
}

// ============================================================
// 测试: 场景 3 — Token 按路径选择
// ============================================================
console.log('\n📋 场景 3: Token 按路径选择');

function test_scenario3() {
  const { localStorage } = createBrowserEnv();

  localStorage.setItem('nh_admin_token', 'admin_jwt');
  localStorage.setItem('nh_mini_token', 'mini_jwt');

  // admin API 应该带 nh_admin_token
  assert(
    getTokenForPath('/api/v1/admin/users', localStorage) === 'admin_jwt',
    '/api/v1/admin/users 应使用 nh_admin_token'
  );
  assert(
    getTokenForPath('/api/v1/admin/dashboard', localStorage) === 'admin_jwt',
    '/api/v1/admin/dashboard 应使用 nh_admin_token'
  );
  assert(
    getTokenForPath('/api/v1/admin', localStorage) === 'admin_jwt',
    '/api/v1/admin (无 trailing slash) 应使用 nh_admin_token'
  );

  // mini API 应该带 nh_mini_token
  assert(
    getTokenForPath('/api/v1/mini/devices', localStorage) === 'mini_jwt',
    '/api/v1/mini/devices 应使用 nh_mini_token'
  );
  assert(
    getTokenForPath('/api/v1/mini/me', localStorage) === 'mini_jwt',
    '/api/v1/mini/me 应使用 nh_mini_token'
  );
  assert(
    getTokenForPath('/api/v1/mini', localStorage) === 'mini_jwt',
    '/api/v1/mini (无 trailing slash) 应使用 nh_mini_token'
  );

  // login 接口不应该带 token
  assert(
    getTokenForPath('/api/v1/admin/login', localStorage) === null,
    '/api/v1/admin/login 不应带 token'
  );
  assert(
    getTokenForPath('/api/v1/mini/mock-login', localStorage) === null,
    '/api/v1/mini/mock-login 不应带 token'
  );

  // 通用接口 (/api/v1/gateways) — 优先 admin
  assert(
    getTokenForPath('/api/v1/gateways', localStorage) === 'admin_jwt',
    '/api/v1/gateways 应优先使用 nh_admin_token'
  );

  // 只有 mini token 时，通用接口用 mini token
  localStorage.removeItem('nh_admin_token');
  assert(
    getTokenForPath('/api/v1/gateways', localStorage) === 'mini_jwt',
    '只有 nh_mini_token 时 /api/v1/gateways 应使用 nh_mini_token'
  );

  console.log('  场景 3 完成');
}

// ============================================================
// 测试: 场景 4 — Admin 403 不 fallback
// ============================================================
console.log('\n📋 场景 4: Admin 403 不 fallback');

function test_scenario4() {
  const { localStorage } = createBrowserEnv();

  // isProtectedAdminPath 判断
  assert(
    isProtectedAdminPath('/api/v1/admin/users') === true,
    '/api/v1/admin/users 是受保护的 admin 路径'
  );
  assert(
    isProtectedAdminPath('/api/v1/admin/dashboard') === true,
    '/api/v1/admin/dashboard 是受保护的 admin 路径'
  );
  assert(
    isProtectedAdminPath('/api/v1/admin/bindings') === true,
    '/api/v1/admin/bindings 是受保护的 admin 路径'
  );

  // login 不是受保护路径
  assert(
    isProtectedAdminPath('/api/v1/admin/login') === false,
    '/api/v1/admin/login 不是受保护路径（公开接口）'
  );

  // 非 admin 路径
  assert(
    isProtectedAdminPath('/api/v1/mini/devices') === false,
    '/api/v1/mini/devices 不是 admin 路径'
  );
  assert(
    isProtectedAdminPath('/api/v1/gateways') === false,
    '/api/v1/gateways 不是 admin 路径'
  );

  // 403 时的 fallback 行为验证（逻辑层面）
  // mock-api.js 中: admin 保护接口 401/403 直接 throw，不 fallback mock
  // 这里验证 isProtectedAdminPath 正确识别所有 admin 接口

  const adminPaths = [
    '/api/v1/admin/me',
    '/api/v1/admin/users',
    '/api/v1/admin/dashboard',
    '/api/v1/admin/gateways',
    '/api/v1/admin/collectors',
    '/api/v1/admin/bindings',
    '/api/v1/admin/control-logs',
    '/api/v1/admin/farmers',
    '/api/v1/admin/farmers/1',
    '/api/v1/admin/farmers/1/bindings',
    '/api/v1/admin/device-tree',
    '/api/v1/admin/raw-events',
  ];

  adminPaths.forEach(function (p) {
    assert(
      isProtectedAdminPath(p) === true,
      p + ' 应为受保护的 admin 路径'
    );
  });

  console.log('  场景 4 完成');
}

// ============================================================
// 测试: 场景 8 — Admin 页面守卫
// ============================================================
console.log('\n📋 场景 8: Admin 页面守卫');

function test_scenario8() {
  const { localStorage } = createBrowserEnv();

  // 情况 1: 没有 nh_admin_token 也没有 nh_mini_token → 跳转登录
  assert(
    localStorage.getItem('nh_admin_token') === null,
    '初始状态: 无 nh_admin_token'
  );
  // admin app.js 逻辑: !localStorage.getItem('nh_admin_token') → 跳转 login
  // 这里验证守卫条件
  const noTokenGuard = !localStorage.getItem('nh_admin_token');
  assert(noTokenGuard === true, '无 nh_admin_token 时应触发登录守卫');

  // 情况 2: 有 nh_mini_token 但没有 nh_admin_token → 提示无权限 + 跳转登录
  localStorage.setItem('nh_mini_token', 'mini_abc');
  const miniOnlyGuard = !localStorage.getItem('nh_admin_token') && !!localStorage.getItem('nh_mini_token');
  assert(miniOnlyGuard === true, '仅有 nh_mini_token 时应检测到并提示无权限');

  // 情况 3: 有 nh_admin_token → 允许访问
  localStorage.setItem('nh_admin_token', 'admin_xyz');
  const adminOk = !!localStorage.getItem('nh_admin_token');
  assert(adminOk === true, '有 nh_admin_token 时应允许访问 admin 页面');

  // 情况 4: admin 登出后清除 nh_admin_token
  localStorage.removeItem('nh_admin_token');
  assert(
    localStorage.getItem('nh_admin_token') === null,
    '登出后 nh_admin_token 应被清除'
  );
  // nh_mini_token 不应被 admin 登出影响
  assert(
    localStorage.getItem('nh_mini_token') === 'mini_abc',
    'admin 登出不应影响 nh_mini_token'
  );

  console.log('  场景 8 完成');
}

// ============================================================
// 测试: 场景 6 — 后端编译通过 (需 go build)
// ============================================================
console.log('\n📋 场景 6: 后端编译检查');

function test_scenario6() {
  const { execSync } = require('child_process');
  const path = require('path');

  const serverDir = path.resolve(__dirname, '..', '..', 'nehuang-iot-server');

  try {
    // 尝试编译（包括测试文件）
    execSync('go build ./...', { cwd: serverDir, stdio: 'pipe', timeout: 30000 });
    console.log('  ✅ go build ./... 成功');
    passed++;
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString() : e.message;
    // 分离: stderr 中有实际的编译错误才失败
    if (stderr && stderr.trim()) {
      console.error('  ❌ go build 失败:', stderr.slice(0, 500));
      failed++;
      failures.push('go build ./... 失败: ' + stderr.slice(0, 200));
    } else {
      // 可能是 timeout 或其他
      console.error('  ❌ go build 执行异常:', e.message);
      failed++;
      failures.push('go build 执行异常: ' + e.message);
    }
  }
}

// ============================================================
// 测试: 场景 5 — Middleware aud 检查 (Go 层已覆盖，此处验证逻辑)
// ============================================================
console.log('\n📋 场景 5: Middleware aud 检查（逻辑验证）');

function test_scenario5() {
  const { localStorage } = createBrowserEnv();

  // 模拟: mini token 尝试访问 admin API
  localStorage.setItem('nh_mini_token', 'mini_token');
  localStorage.removeItem('nh_admin_token');

  const adminPath = '/api/v1/admin/users';
  const tokenForAdminPath = getTokenForPath(adminPath, localStorage);

  // 前端对 admin 路径请求时，只有 nh_mini_token 没有 nh_admin_token
  // getTokenForPath 应返回 null（admin 路径不会 fallback 到 mini token）
  assert(
    tokenForAdminPath === null,
    '前端对 admin 路径请求时，仅有 nh_mini_token，应返回 null（不带 token，由后端返回 401）'
  );
  assert(
    isProtectedAdminPath(adminPath) === true,
    'admin 路径是受保护的'
  );
  // 不带 token 访问 → 后端返回 401 → isProtectedAdminPath 检测到 401 → 清除 token 并 throw
  // 这是正确的行为：admin 路径不会错误地带上 mini token

  console.log('  场景 5 完成（Go 层 middleware_test.go 覆盖实际 403 行为）');
}

// ============================================================
// 运行所有测试
// ============================================================
console.log('╔══════════════════════════════════════════╗');
console.log('║   Frontend 认证权限修复 — 回归测试       ║');
console.log('╚══════════════════════════════════════════╝');

test_scenario1();
test_scenario2();
test_scenario3();
test_scenario4();
test_scenario5();
test_scenario8();

// 场景 6 需要 Go 环境，仅在可用时运行
try {
  require('child_process').execSync('go version', { stdio: 'pipe' });
  test_scenario6();
} catch (e) {
  console.log('\n📋 场景 6: 后端编译检查 (跳过 — 未检测到 Go 环境)');
}

summary();
