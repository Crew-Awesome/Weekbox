# Copr uses rpkg: this directory is a plain "spec + sources" folder.
# Version must match the GitHub release tag v%{version}.
# Sources are the CI zips. Build Copr AFTER those zips exist on the release.

Name:           weekbox
Version:        2.3.4
Release:        5%{?dist}
Summary:        A re-imagined Friday Night Funkin' mod launcher
License:        MIT
URL:            https://github.com/Crew-Awesome/Weekbox
ExclusiveArch:  x86_64 aarch64

Source0:        https://github.com/Crew-Awesome/Weekbox/releases/download/v%{version}/WeekBox-%{version}-linux-x64.zip
Source1:        https://github.com/Crew-Awesome/Weekbox/releases/download/v%{version}/WeekBox-%{version}-linux-arm64.zip
Source2:        weekbox-appid.c
Source3:        launcher-icon.png
Source4:        LICENSE
Source5:        weekbox-wrapper.sh
Source6:        weekbox.desktop

BuildRequires:  gcc
BuildRequires:  unzip
BuildRequires:  make

Requires:       (webkit2gtk4.1 or webkit2gtk4.0 or webkit2gtk3)
Requires:       gtk3
Requires:       (libayatana-appindicator-gtk3 or libappindicator-gtk3)
Recommends:     python3

%define debug_package %{nil}
%define _build_id_links none
%define __strip /bin/true

%description
WeekBox is a re-imagined Friday Night Funkin' mod launcher and manager.
Browse, download, and manage FNF mods on Linux.

This package is built for Fedora Copr so WeekBox updates with dnf.

%prep
# RPM 4.20 unpacks the flat zip into %{builddir} (parent), then cds into
# %{name}-%{version}. -c creates that directory so the cd succeeds.
%setup -q -c -n %{name}-%{version}
%ifarch x86_64
if [ ! -f WeekBox-linux_x64 ] && [ -f ../WeekBox-linux_x64 ]; then
  mv ../WeekBox-linux_x64 ../resources.neu .
fi
if [ ! -f WeekBox-linux_x64 ]; then
  unzip -qo %{SOURCE0}
fi
%endif
%ifarch aarch64
if [ ! -f WeekBox-linux_arm64 ] && [ -f ../WeekBox-linux_arm64 ]; then
  mv ../WeekBox-linux_arm64 ../resources.neu .
fi
if [ ! -f WeekBox-linux_arm64 ]; then
  unzip -qo %{SOURCE1}
fi
%endif
cp -a %{SOURCE2} %{SOURCE3} %{SOURCE4} %{SOURCE5} %{SOURCE6} .

%build
gcc -shared -fPIC -O2 -o libweekbox-appid.so weekbox-appid.c -ldl

%install
%ifarch x86_64
install -D -m 0755 WeekBox-linux_x64 %{buildroot}/usr/lib/weekbox/WeekBox
%endif
%ifarch aarch64
install -D -m 0755 WeekBox-linux_arm64 %{buildroot}/usr/lib/weekbox/WeekBox
%endif
install -D -m 0644 resources.neu %{buildroot}/usr/lib/weekbox/resources.neu
install -D -m 0755 libweekbox-appid.so %{buildroot}/usr/lib/weekbox/libweekbox-appid.so
install -D -m 0755 weekbox-wrapper.sh %{buildroot}%{_bindir}/weekbox
ln -s weekbox %{buildroot}%{_bindir}/WeekBox
install -D -m 0644 weekbox.desktop %{buildroot}%{_datadir}/applications/weekbox.desktop
install -D -m 0644 launcher-icon.png %{buildroot}%{_datadir}/icons/hicolor/256x256/apps/weekbox.png
install -D -m 0644 launcher-icon.png %{buildroot}%{_datadir}/pixmaps/weekbox.png
install -D -m 0644 launcher-icon.png %{buildroot}/usr/lib/weekbox/launcher-icon.png

%post
/bin/touch --no-create %{_datadir}/icons/hicolor &>/dev/null || :
if [ -x %{_bindir}/gtk-update-icon-cache ]; then
  %{_bindir}/gtk-update-icon-cache %{_datadir}/icons/hicolor &>/dev/null || :
fi
if [ -x %{_bindir}/update-desktop-database ]; then
  %{_bindir}/update-desktop-database &>/dev/null || :
fi
if [ -x %{_bindir}/xdg-mime ]; then
  %{_bindir}/xdg-mime default weekbox.desktop x-scheme-handler/weekbox &>/dev/null || :
fi

%postun
/bin/touch --no-create %{_datadir}/icons/hicolor &>/dev/null || :
if [ -x %{_bindir}/gtk-update-icon-cache ]; then
  %{_bindir}/gtk-update-icon-cache %{_datadir}/icons/hicolor &>/dev/null || :
fi
if [ -x %{_bindir}/update-desktop-database ]; then
  %{_bindir}/update-desktop-database &>/dev/null || :
fi

%files
%license LICENSE
%{_bindir}/weekbox
%{_bindir}/WeekBox
/usr/lib/weekbox/
%{_datadir}/applications/weekbox.desktop
%{_datadir}/icons/hicolor/256x256/apps/weekbox.png
%{_datadir}/pixmaps/weekbox.png

%changelog
* Mon Sep 14 2026 Crew Awesome <info@weekbox.app> - 2.3.4-5
- Linux close-to-tray and AppIndicator tray menu (same as Windows)

* Mon Sep 14 2026 Crew Awesome <info@weekbox.app> - 2.3.4-4
- Quit the GTK window on Linux close (Wayland/KDE X button)

* Tue Sep 15 2026 Crew Awesome <info@weekbox.app> - 2.3.4-3
- Add aarch64 (ARM 64-bit) build support alongside x86_64
* Sun Sep 13 2026 Crew Awesome <info@weekbox.app> - 2.3.4-2
- Move the flat linux zip into the RPM 4.20 build directory after %setup -c
