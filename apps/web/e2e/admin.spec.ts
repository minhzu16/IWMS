import { test, expect, Page } from '@playwright/test';

/*
 * Auth is rate limited (10 logins/min per IP): tests 1-3 go through the login form,
 * and tests 4, 5, 7 log in through page.request (= 6 logins per run).
 */

const SEED_PASSWORD = 'Password123!';
const ADMIN_EMAIL = 'admin@iwms.local';
const VIEWER_EMAIL = 'viewer@iwms.local';

async function openAdmin(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('#nav-tab-admin').click();
}

async function loginAdmin(
  page: Page,
  email = ADMIN_EMAIL,
  password = SEED_PASSWORD,
): Promise<void> {
  await page.locator('#admin-login-email').fill(email);
  await page.locator('#admin-login-password').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập quản trị' }).click();
}

async function openAdminAsAdmin(page: Page): Promise<void> {
  const res = await page.request.post('/api/v1/auth/login', {
    data: { email: ADMIN_EMAIL, password: SEED_PASSWORD },
  });
  expect(res.ok()).toBe(true);
  await page.addInitScript(() => localStorage.setItem('iwms_has_session', '1'));
  await openAdmin(page);
  await expect(page.getByRole('heading', { name: 'Quản trị hệ thống' })).toBeVisible();
}

test.describe('admin view', () => {
  test('1. wrong password shows role="alert" error, dashboard not shown', async ({ page }) => {
    await openAdmin(page);
    await loginAdmin(page, ADMIN_EMAIL, 'WrongPassword123!');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quản trị hệ thống' })).not.toBeVisible();
  });

  test('2. non-admin cannot use admin view and shows 403 error message', async ({ page }) => {
    await openAdmin(page);
    await loginAdmin(page, VIEWER_EMAIL, SEED_PASSWORD);

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Phiên đăng nhập hết hạn hoặc không có quyền quản trị (401/403).');
    await expect(page.getByRole('heading', { name: 'Quản trị hệ thống' })).not.toBeVisible();
  });

  test('3. admin logs in and sees dashboard stats and user table with admin', async ({ page }) => {
    await openAdmin(page);
    await loginAdmin(page);

    await expect(page.getByRole('heading', { name: 'Quản trị hệ thống' })).toBeVisible();

    await expect(page.locator('.stat-card', { hasText: 'Người dùng' })).toBeVisible();
    await expect(page.locator('.stat-card', { hasText: 'Sản phẩm đang bán' })).toBeVisible();
    await expect(page.locator('.stat-card', { hasText: 'Kho hoạt động' })).toBeVisible();
    await expect(page.locator('.stat-card', { hasText: 'Giá trị tồn kho' })).toBeVisible();

    await expect(page.locator('tr', { hasText: ADMIN_EMAIL })).toBeVisible();
  });

  test('4. admin own row controls are disabled by isSelf logic', async ({ page }) => {
    await openAdminAsAdmin(page);

    const adminRow = page.locator('tr', { hasText: ADMIN_EMAIL });
    await expect(adminRow).toBeVisible();
    await expect(adminRow.locator('select')).toBeDisabled();
    await expect(adminRow.getByRole('button', { name: /Khoá|Mở khoá/ })).toBeDisabled();
  });

  test('5. create a user, then deactivate and reactivate it', async ({ page }) => {
    const createdUserEmail = `e2e-${Date.now()}@iwms.local`;
    await openAdminAsAdmin(page);

    await page.getByRole('button', { name: 'Thêm người dùng' }).click();
    await page.locator('#create-user-fullname').fill('E2E Test User');
    await page.locator('#create-user-email').fill(createdUserEmail);
    await page.locator('#create-user-role').selectOption('VIEWER');
    await page.locator('#create-user-password').fill(SEED_PASSWORD);
    await page.getByRole('button', { name: 'Lưu' }).click();

    const status = page.getByRole('status');
    await expect(status).toBeVisible();
    await expect(status).toContainText('Đã thêm người dùng mới thành công');
    await expect(page.locator('table')).toContainText(createdUserEmail);

    await page.locator('#admin-search-input').fill(createdUserEmail);
    const userRow = page.locator('tr', { hasText: createdUserEmail });
    await expect(userRow).toBeVisible();

    await expect(userRow.getByText('Hoạt động')).toBeVisible();
    await userRow.getByRole('button', { name: 'Khoá' }).click();
    await expect(userRow.getByText('Đã khoá')).toBeVisible();
    await expect(userRow.getByRole('button', { name: 'Mở khoá' })).toBeVisible();

    await userRow.getByRole('button', { name: 'Mở khoá' }).click();
    await expect(userRow.getByText('Hoạt động')).toBeVisible();
    await expect(userRow.getByRole('button', { name: 'Khoá' })).toBeVisible();
  });

  test('6. navbar header has glass backdrop-filter', async ({ page }) => {
    await page.goto('/');

    const header = page.locator('header');
    await expect(header).toBeVisible();

    const hasBackdropFilter = await header.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const filter =
        style.backdropFilter ||
        (style as unknown as Record<string, string>)['-webkit-backdrop-filter'] ||
        (style as unknown as Record<string, string>)['webkitBackdropFilter'];
      return Boolean(filter && filter !== 'none');
    });

    expect(hasBackdropFilter).toBe(true);
  });

  test('7. mobile viewport 375x800 has no horizontal overflow after admin login', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await openAdminAsAdmin(page);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(376);
  });
});
