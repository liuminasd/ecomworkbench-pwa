/**
 * EcomWorkbench PWA → APK 构建脚本（复用仰止AI的 bubblewrap 程序化流程）
 * 前置：JDK 21 + Android SDK + Gradle 8.11.1 + 本地 3000 端口跑着 manifest.json
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const { TwaManifest, TwaGenerator, Config, JdkHelper, ConsoleLog } = require('@bubblewrap/core');

const ANDROID_HOME = path.join(os.homedir(), 'android-sdk');
const JAVA_HOME = 'C:\\Program Files\\Microsoft\\jdk-21.0.12.8-hotspot';
const OUTPUT_DIR = path.join(process.cwd(), 'apk-output');
const PROJECT_DIR = path.join(OUTPUT_DIR, 'project');

// Git Bash PATH/Path 冲突修复
if (process.platform === 'win32') {
  if (!process.env.Path && process.env.PATH) process.env.Path = process.env.PATH;
}

async function main() {
  const log = new ConsoleLog('ew-build');

  if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 从本地 manifest 拉取（绕过 TLS），再覆盖为生产地址
  log.info('获取 Web Manifest...');
  const twaManifest = await TwaManifest.fromWebManifest('http://localhost:3001/manifest.json');
  twaManifest.host = 'liuminasd.github.io';
  twaManifest.startUrl = '/ecomworkbench-pwa/';
  twaManifest.packageId = 'com.ecomworkbench.app';
  twaManifest.name = 'EcomWorkbench';
  twaManifest.launcherName = '工作台';
  twaManifest.appVersionCode = 1;
  twaManifest.appVersionName = '1.0.0';
  twaManifest.fallbackType = 'webview';
  twaManifest.enableNotifications = false;
  twaManifest.enableSiteSettingsShortcut = true;
  log.info(`  包名: ${twaManifest.packageId}  起始页: ${twaManifest.startUrl}`);

  // 生成签名密钥
  log.info('生成签名密钥...');
  const keystorePath = path.join(OUTPUT_DIR, 'ecomworkbench.keystore');
  const keyAlias = 'ecomworkbench';
  // 签名密码从环境变量读取（默认仅为开发占位，生产发布前务必更换密钥与密码）
  const keyPassword = process.env.KEYSTORE_PASSWORD || 'dev-password-change-me';
  const keystorePassword = process.env.KEYSTORE_PASSWORD || 'dev-password-change-me';
  const keytoolExe = path.join(JAVA_HOME, 'bin', 'keytool.exe');
  execSync([
    `"${keytoolExe}"`, '-genkeypair',
    '-dname', '"cn=EcomWorkbench Dev, ou=Dev, o=EcomWorkbench, c=CN"',
    '-alias', keyAlias, '-keypass', keyPassword,
    '-keystore', keystorePath, '-storepass', keystorePassword,
    '-validity', '20000', '-keyalg', 'RSA',
  ].join(' '), { stdio: 'inherit' });
  twaManifest.signingKey = { path: keystorePath, alias: keyAlias };

  // 生成 TWA 项目
  log.info('生成 Android 项目...');
  const generator = new TwaGenerator();
  await generator.createTwaProject(PROJECT_DIR, twaManifest, log);

  // 写签名配置
  const keystorePathUnix = keystorePath.replace(/\\/g, '/');
  const signingBlock = `
    signingConfigs {
        release {
            storeFile file('${keystorePathUnix}')
            storePassword '${keystorePassword}'
            keyAlias '${keyAlias}'
            keyPassword '${keyPassword}'
        }
    }
`;
  const buildGradlePath = path.join(PROJECT_DIR, 'app', 'build.gradle');
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
  buildGradle = buildGradle.replace('buildTypes {', signingBlock + '    buildTypes {');
  // 在 buildTypes 的 release 块内加 signingConfig（锚定 buildTypes，避免误匹配 signingConfigs 的 release）
  buildGradle = buildGradle.replace(/(buildTypes\s*\{\s*release\s*\{)/, '$1\n            signingConfig signingConfigs.release');
  // 禁用 R8 混淆（TWA 无需混淆）
  buildGradle = buildGradle.replace('minifyEnabled true', 'minifyEnabled false');
  // androidbrowserhelper 2.7.x 要求 minSdk ≥ 24
  buildGradle = buildGradle.replace('minSdkVersion 21', 'minSdkVersion 24');
  fs.writeFileSync(buildGradlePath, buildGradle);

  // 构建 APK
  log.info('构建 APK (assembleRelease)... 首次约 5-10 分钟...');
  const gradleExe = path.join(os.homedir(), 'gradle', 'gradle-8.11.1', 'bin', 'gradle.bat');
  const buildEnv = { ...process.env };
  buildEnv.Path = buildEnv.Path || buildEnv.PATH || '';
  buildEnv.JAVA_HOME = JAVA_HOME;
  buildEnv.ANDROID_HOME = ANDROID_HOME;
  buildEnv.ANDROID_SDK_ROOT = ANDROID_HOME;
  buildEnv.GRADLE_OPTS = '-Dorg.gradle.jvmargs="-Xmx2048m"';

  const gradlePropsPath = path.join(PROJECT_DIR, 'gradle.properties');
  let gradleProps = fs.readFileSync(gradlePropsPath, 'utf8');
  if (!gradleProps.includes('org.gradle.jvmargs')) {
    gradleProps += '\norg.gradle.jvmargs=-Xmx2048m';
    fs.writeFileSync(gradlePropsPath, gradleProps);
  }

  execSync(`"${gradleExe}" assembleRelease --stacktrace --no-daemon`, {
    cwd: PROJECT_DIR, env: buildEnv, stdio: 'inherit', timeout: 1800000,
  });
  log.info('Gradle 构建完成');

  // 复制 APK
  const apkDir = path.join(PROJECT_DIR, 'app', 'build', 'outputs', 'apk', 'release');
  if (fs.existsSync(apkDir)) {
    const apkFiles = fs.readdirSync(apkDir).filter(f => f.endsWith('.apk'));
    for (const apk of apkFiles) {
      const dest = path.join(OUTPUT_DIR, 'EcomWorkbench-v1.0.0.apk');
      fs.copyFileSync(path.join(apkDir, apk), dest);
      const sizeMB = (fs.statSync(dest).size / (1024 * 1024)).toFixed(2);
      log.info(`[SUCCESS] APK: ${dest} (${sizeMB} MB)`);
    }
  } else {
    log.error('未找到 APK 输出目录: ' + apkDir);
  }
}

main().catch(err => {
  console.error('构建失败:', err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
