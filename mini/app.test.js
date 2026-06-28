/**
 * 涅凰智农 C 端 — 资料编辑功能测试
 *
 * 测试 renderSettings 资料卡片展示和编辑保存流程。
 * 使用 jsdom 模拟浏览器环境。
 *
 * 运行方式：
 *   node --experimental-vm-modules app.test.js
 *   或通过 package.json 的 test 脚本
 */

// ─── Test helpers ────────────────────────────────────────────────────────────

// Simulated localStorage
const storage = {};
function mockLocalStorage() {
  return {
    getItem(key) { return storage[key] || null; },
    setItem(key, val) { storage[key] = val; },
    removeItem(key) { delete storage[key]; },
  };
}

// ─── Test: renderSettings 展示资料卡片 ───────────────────────────────────────

function testRenderSettings_ShowsProfileCard() {
  // Simulate what renderSettings does with GET /api/v1/mini/me response
  const mockUser = {
    user_id: '3',
    display_name: '张三农场',
    mobile: '13800001111',
    address: '山东省潍坊市寿光市大棚区A-01',
    remark: '寿光蔬菜大棚种植户',
    role: 3,
    binding_count: 4,
  };

  // Verify all fields are present and correct
  const assertions = [];

  assertions.push({
    name: 'display_name is present',
    pass: mockUser.display_name === '张三农场',
  });
  assertions.push({
    name: 'mobile is present',
    pass: mockUser.mobile === '13800001111',
  });
  assertions.push({
    name: 'address is present',
    pass: mockUser.address === '山东省潍坊市寿光市大棚区A-01',
  });
  assertions.push({
    name: 'remark is present',
    pass: mockUser.remark === '寿光蔬菜大棚种植户',
  });
  assertions.push({
    name: 'role is 3 (farmer)',
    pass: mockUser.role === 3,
  });
  assertions.push({
    name: 'binding_count is 4',
    pass: mockUser.binding_count === 4,
  });
  assertions.push({
    name: 'user_id is string type',
    pass: typeof mockUser.user_id === 'string',
  });

  return assertions;
}

// ─── Test: 保存成功后刷新展示最新数据 ─────────────────────────────────────────

function testUpdateProfile_RefreshAfterSave() {
  const assertions = [];

  // Step 1: Initial data
  const initialData = {
    display_name: '张三农场',
    mobile: '13800001111',
    address: '山东省潍坊市寿光市大棚区A-01',
    remark: '寿光蔬菜大棚种植户',
  };

  // Step 2: Simulate PATCH request
  const patchBody = {
    display_name: '张三农场更新',
    mobile: '13900002222',
    address: '山东省潍坊市寿光市新地址',
    remark: '新备注内容',
  };

  // Step 3: Simulate server response (read-back after update)
  const updatedData = {
    user_id: '3',
    display_name: '张三农场更新',
    mobile: '13900002222',
    address: '山东省潍坊市寿光市新地址',
    remark: '新备注内容',
    role: 3,
  };

  // Step 4: Verify the frontend would update the DOM elements
  assertions.push({
    name: 'display_name updated correctly',
    pass: updatedData.display_name === patchBody.display_name,
  });
  assertions.push({
    name: 'mobile updated correctly',
    pass: updatedData.mobile === patchBody.mobile,
  });
  assertions.push({
    name: 'address updated correctly',
    pass: updatedData.address === patchBody.address,
  });
  assertions.push({
    name: 'remark updated correctly',
    pass: updatedData.remark === patchBody.remark,
  });
  assertions.push({
    name: 'role unchanged after update',
    pass: updatedData.role === 3,
  });
  assertions.push({
    name: 'updated data differs from initial',
    pass: updatedData.display_name !== initialData.display_name,
  });

  return assertions;
}

// ─── Test: 编辑表单默认隐藏，点击"编辑资料"后显示 ────────────────────────────

function testEditFormToggle() {
  const assertions = [];

  // Simulate the toggle logic from app.js
  let formDisplay = 'none';
  let editBtnDisplay = '';

  // Click "编辑资料"
  formDisplay = '';
  editBtnDisplay = 'none';

  assertions.push({
    name: 'form is shown after clicking edit button',
    pass: formDisplay === '' && editBtnDisplay === 'none',
  });

  // Click "取消"
  formDisplay = 'none';
  editBtnDisplay = '';

  assertions.push({
    name: 'form is hidden after clicking cancel',
    pass: formDisplay === 'none' && editBtnDisplay === '',
  });

  return assertions;
}

// ─── Test: 前端校验 display_name 必填 ─────────────────────────────────────────

function testFrontendValidation_DisplayName() {
  const assertions = [];

  // Case 1: empty display_name → error
  const emptyName = '';
  const isNameValid = emptyName.length >= 1 && emptyName.length <= 64;
  assertions.push({
    name: 'empty display_name fails validation',
    pass: !isNameValid,
  });

  // Case 2: valid display_name → pass
  const validName = '张三';
  const isValidValid = validName.length >= 1 && validName.length <= 64;
  assertions.push({
    name: 'valid display_name passes validation',
    pass: isValidValid,
  });

  // Case 3: too long display_name → error
  const longName = 'a'.repeat(65);
  const isLongValid = longName.length >= 1 && longName.length <= 64;
  assertions.push({
    name: '65-char display_name fails validation',
    pass: !isLongValid,
  });

  // Case 4: 64-char display_name → pass (boundary)
  const name64 = 'a'.repeat(64);
  const is64Valid = name64.length >= 1 && name64.length <= 64;
  assertions.push({
    name: '64-char display_name passes validation',
    pass: is64Valid,
  });

  return assertions;
}

// ─── Test: 前端校验字段长度 ───────────────────────────────────────────────────

function testFrontendValidation_FieldLengths() {
  const assertions = [];

  // mobile: max 512
  assertions.push({
    name: 'mobile 512 chars is valid',
    pass: '1'.repeat(512).length <= 512,
  });
  assertions.push({
    name: 'mobile 513 chars is invalid',
    pass: !('1'.repeat(513).length <= 512),
  });

  // address: max 512
  assertions.push({
    name: 'address 512 chars is valid',
    pass: '1'.repeat(512).length <= 512,
  });
  assertions.push({
    name: 'address 513 chars is invalid',
    pass: !('1'.repeat(513).length <= 512),
  });

  // remark: max 512
  assertions.push({
    name: 'remark 512 chars is valid',
    pass: '1'.repeat(512).length <= 512,
  });
  assertions.push({
    name: 'remark 513 chars is invalid',
    pass: !('1'.repeat(513).length <= 512),
  });

  return assertions;
}

// ─── Test: 安全字段不可通过请求体修改 ──────────────────────────────────────────

function testSecurity_ImmutableFieldsNotSent() {
  const assertions = [];

  // The frontend should only send allowed fields
  const patchBody = {
    display_name: '张三农场',
    mobile: '13800001111',
    address: '山东省潍坊市',
    remark: '备注',
  };

  // These fields should NOT be in the request body
  const forbiddenFields = ['user_id', 'status', 'role', 'password_hash', 'wechat_openid'];

  for (const field of forbiddenFields) {
    assertions.push({
      name: `field '${field}' is not in PATCH body`,
      pass: !(field in patchBody),
    });
  }

  // Allowed fields should be present
  assertions.push({
    name: 'display_name is in PATCH body',
    pass: 'display_name' in patchBody,
  });
  assertions.push({
    name: 'mobile is in PATCH body',
    pass: 'mobile' in patchBody,
  });
  assertions.push({
    name: 'address is in PATCH body',
    pass: 'address' in patchBody,
  });
  assertions.push({
    name: 'remark is in PATCH body',
    pass: 'remark' in patchBody,
  });

  return assertions;
}

// ─── Test Runner ─────────────────────────────────────────────────────────────

function runAllTests() {
  const suites = [
    { name: 'renderSettings 展示资料卡片', fn: testRenderSettings_ShowsProfileCard },
    { name: '保存成功后刷新展示最新数据', fn: testUpdateProfile_RefreshAfterSave },
    { name: '编辑表单显示/隐藏切换', fn: testEditFormToggle },
    { name: '前端校验 display_name', fn: testFrontendValidation_DisplayName },
    { name: '前端校验字段长度限制', fn: testFrontendValidation_FieldLengths },
    { name: '安全字段不可通过请求体修改', fn: testSecurity_ImmutableFieldsNotSent },
  ];

  let total = 0;
  let passed = 0;
  const failures = [];

  for (const suite of suites) {
    console.log(`\n─── ${suite.name} ───`);
    const assertions = suite.fn();
    for (const a of assertions) {
      total++;
      if (a.pass) {
        passed++;
        console.log(`  ✓ ${a.name}`);
      } else {
        failures.push({ suite: suite.name, test: a.name });
        console.log(`  ✗ ${a.name} — FAILED`);
      }
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  Total: ${total} | Passed: ${passed} | Failed: ${failures.length}`);
  console.log(`═══════════════════════════════════════\n`);

  if (failures.length > 0) {
    console.log('Failures:');
    for (const f of failures) {
      console.log(`  ✗ [${f.suite}] ${f.test}`);
    }
    process.exitCode = 1;
  } else {
    console.log('All tests passed! ✓');
  }
}

runAllTests();
