import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function capture() {
  const screenshotsDir = path.resolve(process.cwd(), 'screenshots');
  const publicScreenshotsDir = path.resolve(process.cwd(), 'public/screenshots');
  
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  if (!fs.existsSync(publicScreenshotsDir)) fs.mkdirSync(publicScreenshotsDir, { recursive: true });

  console.log('Launching browser to capture Reddit Orbit screenshots...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Desktop context
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  // 1. Dashboard Overview
  console.log('1. Capturing Dashboard Overview...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  const dashPath = path.join(screenshotsDir, 'reddit_orbit_dashboard.png');
  const dashPublic = path.join(publicScreenshotsDir, 'reddit_orbit_dashboard.png');
  await page.screenshot({ path: dashPath });
  fs.copyFileSync(dashPath, dashPublic);

  // 2. Compact Density View
  console.log('2. Capturing Compact Density View...');
  const compactBtn = await page.$('button[title*="Compact mode"]');
  if (compactBtn) {
    await compactBtn.click();
    await page.waitForTimeout(600);
    const compactPath = path.join(screenshotsDir, 'reddit_orbit_compact_density.png');
    const compactPublic = path.join(publicScreenshotsDir, 'reddit_orbit_compact_density.png');
    await page.screenshot({ path: compactPath });
    fs.copyFileSync(compactPath, compactPublic);
  }

  // 3. Workspace Manager Modal
  console.log('3. Capturing Workspace Manager Modal...');
  const workspaceBtn = await page.$('button:has-text("WORKSPACE:")');
  if (workspaceBtn) {
    await workspaceBtn.click();
    await page.waitForTimeout(300);
    const manageBtn = await page.$('button:has-text("MANAGE WORKSPACES")');
    if (manageBtn) {
      await manageBtn.click();
      await page.waitForTimeout(500);
      const mgrPath = path.join(screenshotsDir, 'reddit_orbit_workspace_manager.png');
      const mgrPublic = path.join(publicScreenshotsDir, 'reddit_orbit_workspace_manager.png');
      await page.screenshot({ path: mgrPath });
      fs.copyFileSync(mgrPath, mgrPublic);

      // Close modal
      const closeBtn = await page.$('button[aria-label="Close dialog"]');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // 4. Auth Modal
  console.log('4. Capturing Auth Modal...');
  const signInBtn = await page.$('button:has-text("SIGN IN")');
  if (signInBtn) {
    await signInBtn.click();
    await page.waitForTimeout(500);
    const authPath = path.join(screenshotsDir, 'reddit_orbit_auth_modal.png');
    const authPublic = path.join(publicScreenshotsDir, 'reddit_orbit_auth_modal.png');
    await page.screenshot({ path: authPath });
    fs.copyFileSync(authPath, authPublic);

    const closeBtn = await page.$('button[aria-label="Close dialog"]');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(300);
  }

  // 5. Mobile Viewport
  console.log('5. Capturing Mobile Viewport...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);
  const mobilePath = path.join(screenshotsDir, 'reddit_orbit_mobile.png');
  const mobilePublic = path.join(publicScreenshotsDir, 'reddit_orbit_mobile.png');
  await mobilePage.screenshot({ path: mobilePath });
  fs.copyFileSync(mobilePath, mobilePublic);

  await browser.close();
  console.log('Successfully captured all high-resolution PNG screenshots in both /screenshots and /public/screenshots!');
}

capture().catch((err) => {
  console.error('Error during screenshot generation:', err);
  process.exit(1);
});
