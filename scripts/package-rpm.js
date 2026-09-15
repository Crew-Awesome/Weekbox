const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const {
  SHIM_NAME,
  ensureLinuxAppIdShim,
  copyLinuxAppIdShim,
  linuxDesktopEntry,
  linuxPreloadSnippet,
} = require("./linux-window-icon.js");

function resolveArchitecture(opts = {}) {
  const cliArchArg = process.argv.find((arg) => arg.startsWith("--arch="));
  const archIdx = process.argv.indexOf("--arch");
  const cliArch = cliArchArg
    ? cliArchArg.split("=")[1]
    : archIdx !== -1 && archIdx + 1 < process.argv.length
      ? process.argv[archIdx + 1]
      : null;

  let arch = opts.arch || cliArch || (process.arch === "arm64" ? "aarch64" : "x86_64");
  if (arch === "arm64") arch = "aarch64";
  const neuArch = arch === "aarch64" ? "arm64" : "x64";

  return { arch, neuArch };
}

function verifyBuildOutputs(files) {
  for (const file of files) {
    if (!fs.existsSync(file)) {
      throw new Error(`Missing build output: ${file}. Please run 'npm run build' first.`);
    }
  }
}

function copyBundle(sourceBinary, sourceResources, sourceExtensions, targetDir, shimFile, iconSource) {
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(sourceBinary, path.join(targetDir, "WeekBox"));
  fs.copyFileSync(sourceResources, path.join(targetDir, "resources.neu"));
  if (fs.existsSync(sourceExtensions)) {
    fs.cpSync(sourceExtensions, path.join(targetDir, "extensions"), {
      recursive: true,
    });
  }
  if (shimFile) copyLinuxAppIdShim(targetDir, shimFile);
  if (iconSource && fs.existsSync(iconSource)) {
    fs.copyFileSync(iconSource, path.join(targetDir, "launcher-icon.png"));
  }
  fs.chmodSync(path.join(targetDir, "WeekBox"), 0o755);
}

function stageRpmFiles(stageDir, sourceBinary, sourceResources, sourceExtensions, iconSource, shimFile) {
  fs.rmSync(stageDir, { recursive: true, force: true });

  const stageLib = path.join(stageDir, "usr", "lib", "weekbox");
  copyBundle(sourceBinary, sourceResources, sourceExtensions, stageLib, shimFile, iconSource);

  const stageBin = path.join(stageDir, "usr", "bin");
  fs.mkdirSync(stageBin, { recursive: true });
  const wrapperScript = `#!/bin/sh
# Prevent WebKitGTK Wayland explicit-sync crash (Error 71) on modern compositors
export WEBKIT_DISABLE_DMABUF_RENDERER="\${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"
${linuxPreloadSnippet('"/usr/lib/weekbox/' + SHIM_NAME + '"')}exec /usr/lib/weekbox/WeekBox --data-location=system "$@"
`;
  fs.writeFileSync(path.join(stageBin, "weekbox"), wrapperScript);
  fs.chmodSync(path.join(stageBin, "weekbox"), 0o755);

  const uppercaseBin = path.join(stageBin, "WeekBox");
  if (fs.existsSync(uppercaseBin)) {
    fs.rmSync(uppercaseBin);
  }
  fs.symlinkSync("weekbox", uppercaseBin);

  const stageApps = path.join(stageDir, "usr", "share", "applications");
  fs.mkdirSync(stageApps, { recursive: true });
  const desktopEntry = linuxDesktopEntry({ exec: "/usr/bin/weekbox %u" });
  fs.writeFileSync(path.join(stageApps, "weekbox.desktop"), desktopEntry);
  fs.writeFileSync(
    path.join(stageApps, "WeekBox.desktop"),
    linuxDesktopEntry({ exec: "/usr/bin/weekbox %u", noDisplay: true }),
  );

  const stageIconHicolor = path.join(
    stageDir,
    "usr",
    "share",
    "icons",
    "hicolor",
    "256x256",
    "apps",
  );
  fs.mkdirSync(stageIconHicolor, { recursive: true });
  fs.copyFileSync(iconSource, path.join(stageIconHicolor, "weekbox.png"));

  const stagePixmaps = path.join(stageDir, "usr", "share", "pixmaps");
  fs.mkdirSync(stagePixmaps, { recursive: true });
  fs.copyFileSync(iconSource, path.join(stagePixmaps, "weekbox.png"));
}

function getChangelogDate() {
  const now = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[now.getUTCDay()]} ${months[now.getUTCMonth()]} ${String(now.getUTCDate()).padStart(2, "0")} ${now.getUTCFullYear()}`;
}

function generateSpec(version, release, arch, description, homepage, license) {
  const changelogDate = getChangelogDate();
  return `Name:           weekbox
Version:        ${version}
Release:        ${release}%{?dist}
Summary:        ${description}
License:        ${license}
URL:            ${homepage}
Vendor:         Crew Awesome
Group:          Amusements/Games
BuildArch:      ${arch}

%define debug_package %{nil}
%define _build_id_links none
%define __strip /bin/true

Requires:       (libwebkit2gtk-4.1.so.0()(64bit) or libwebkit2gtk-4.0.so.37()(64bit) or webkit2gtk4.1 or webkit2gtk4.0 or webkit2gtk3)

%description
WeekBox is a re-imagined Friday Night Funkin' mod launcher and manager.
Browse, download, and manage FNF mods easily on Linux.

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}
cp -a %{stagedir}/* %{buildroot}/

%files
%defattr(-,root,root,-)
%{_bindir}/weekbox
%{_bindir}/WeekBox
/usr/lib/weekbox/
%{_datadir}/applications/weekbox.desktop
%{_datadir}/applications/WeekBox.desktop
%{_datadir}/icons/hicolor/256x256/apps/weekbox.png
%{_datadir}/pixmaps/weekbox.png

%post
/bin/touch --no-create %{_datadir}/icons/hicolor &>/dev/null || :
if [ -x %{_bindir}/gtk-update-icon-cache ]; then
  %{_bindir}/gtk-update-icon-cache %{_datadir}/icons/hicolor &>/dev/null || :
fi
if [ -x %{_bindir}/update-desktop-database ]; then
  %{_bindir}/update-desktop-database &>/dev/null || :
fi

%postun
/bin/touch --no-create %{_datadir}/icons/hicolor &>/dev/null || :
if [ -x %{_bindir}/gtk-update-icon-cache ]; then
  %{_bindir}/gtk-update-icon-cache %{_datadir}/icons/hicolor &>/dev/null || :
fi
if [ -x %{_bindir}/update-desktop-database ]; then
  %{_bindir}/update-desktop-database &>/dev/null || :
fi

%changelog
* ${changelogDate} Crew Awesome <info@weekbox.app> - ${version}-${release}
- Release ${version}
`;
}

function findRpms(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findRpms(full));
    } else if (entry.isFile() && entry.name.endsWith(".rpm")) {
      results.push(full);
    }
  }
  return results;
}

function packageRpm(opts = {}) {
  const root = path.resolve(__dirname, "..");
  const config = JSON.parse(
    fs.readFileSync(path.join(root, "neutralino.config.json"), "utf8"),
  );
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );

  const version = opts.version || config.version || pkg.version;
  const release = opts.release || process.env.RPM_RELEASE || "2";
  const { arch, neuArch } = resolveArchitecture(opts);

  const sourceRoot = path.join(root, "dist", "WeekBox");
  const sourceBinary = path.join(sourceRoot, `WeekBox-linux_${neuArch}`);
  const sourceResources = path.join(sourceRoot, "resources.neu");
  const sourceExtensions = path.join(sourceRoot, "extensions");
  const iconSource = path.join(root, "app", "assets", "icons", "launcher-icon.png");
  const shimFile = ensureLinuxAppIdShim(
    path.join(root, ".tmp", "linux", SHIM_NAME),
  );

  verifyBuildOutputs([sourceBinary, sourceResources, iconSource, shimFile]);

  const packageRoot = path.join(root, "dist", "packages");
  const rpmStageDir = path.join(packageRoot, "WeekBox-rpm");
  const rpmbuildDir = path.join(packageRoot, "rpmbuild");
  const releaseAssetsDir = path.join(root, "dist", "release-assets");

  stageRpmFiles(
    rpmStageDir,
    sourceBinary,
    sourceResources,
    sourceExtensions,
    iconSource,
    shimFile,
  );
  console.log(`Staged RPM package files at: ${rpmStageDir}`);

  fs.rmSync(rpmbuildDir, { recursive: true, force: true });
  for (const subdir of ["BUILD", "RPMS", "SOURCES", "SPECS", "SRPMS", "BUILDROOT"]) {
    fs.mkdirSync(path.join(rpmbuildDir, subdir), { recursive: true });
  }

  const specContent = generateSpec(
    version,
    release,
    arch,
    pkg.description || "A Re-Imagined Original FNF Mod Launcher",
    pkg.homepage || "https://github.com/Crew-Awesome/Weekbox",
    pkg.license || "ISC",
  );

  const specFile = path.join(rpmbuildDir, "SPECS", "weekbox.spec");
  fs.writeFileSync(specFile, specContent);
  console.log(`Generated RPM spec file: ${specFile}`);

  let hasRpmbuild = false;
  try {
    execSync("which rpmbuild", { stdio: "ignore" });
    hasRpmbuild = true;
  } catch {
    hasRpmbuild = false;
  }

  if (!hasRpmbuild) {
    console.warn(
      "[WARN] 'rpmbuild' not found. To build the RPM package, install rpm-build (e.g. 'sudo dnf install -y rpm-build') and run:",
    );
    console.warn(
      `rpmbuild -bb --target ${arch} --define "_topdir ${rpmbuildDir}" --define "stagedir ${rpmStageDir}" "${specFile}"`,
    );
    return { packageRoot, releaseAssetsDir, rpms: [] };
  }

  console.log(`Building RPM package for ${arch}...`);
  execSync(
    `rpmbuild -bb --target ${arch} --define "_topdir ${rpmbuildDir}" --define "stagedir ${rpmStageDir}" "${specFile}"`,
    { stdio: "inherit" },
  );

  fs.mkdirSync(releaseAssetsDir, { recursive: true });
  const foundRpms = findRpms(path.join(rpmbuildDir, "RPMS"));
  if (foundRpms.length === 0) {
    throw new Error(`rpmbuild finished but no .rpm was found`);
  }

  for (const rpmPath of foundRpms) {
    const fileName = path.basename(rpmPath);
    const targetPackageRpm = path.join(packageRoot, fileName);
    fs.copyFileSync(rpmPath, targetPackageRpm);

    const releaseAssetName = `WeekBox-${version}-linux-${arch}.rpm`;
    const targetReleaseAsset = path.join(releaseAssetsDir, releaseAssetName);
    fs.copyFileSync(rpmPath, targetReleaseAsset);

    console.log(`Created RPM package: ${targetPackageRpm}`);
    console.log(`Created release asset: ${targetReleaseAsset}`);
  }

  return { packageRoot, releaseAssetsDir, rpms: foundRpms };
}

if (require.main === module) {
  packageRpm();
}

module.exports = { packageRpm };
