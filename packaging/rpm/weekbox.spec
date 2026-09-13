# Copr uses rpkg: this directory is a plain "spec + sources" folder.
# Version must match the GitHub release tag v%{version}.
# Source0 is the CI zip. Build Copr AFTER that zip exists on the release.

Name:           weekbox
Version:        2.3.4
Release:        1%{?dist}
Summary:        A re-imagined Friday Night Funkin' mod launcher
License:        MIT
URL:            https://github.com/Crew-Awesome/Weekbox
ExclusiveArch:  x86_64

Source0:        https://github.com/Crew-Awesome/Weekbox/releases/download/v%{version}/WeekBox-%{version}-linux-x64.zip
Source1:        weekbox-appid.c
Source2:        launcher-icon.png
Source3:        LICENSE
Source4:        weekbox-wrapper.sh
Source5:        weekbox.desktop

BuildRequires:  gcc
BuildRequires:  unzip
BuildRequires:  make

Requires:       (webkit2gtk4.1 or webkit2gtk4.0 or webkit2gtk3)
Requires:       gtk3
Recommends:     python3

%define debug_package %{nil}
%define _build_id_links none
%define __strip /bin/true

%description
WeekBox is a re-imagined Friday Night Funkin' mod launcher and manager.
Browse, download, and manage FNF mods on Linux.

This package is built for Fedora Copr so WeekBox updates with dnf.

%prep
# Fedora 44+ %setup unpacks the zip, then creates %{name}-%{version} and cds
# into the empty dir. Unzip ourselves after entering that directory.
%setup -q -T -c -n weekbox-%{version}
unzip -qo %{SOURCE0}
cp -a %{SOURCE1} %{SOURCE2} %{SOURCE3} %{SOURCE4} %{SOURCE5} .

%build
gcc -shared -fPIC -O2 -o libweekbox-appid.so weekbox-appid.c -ldl

%install
install -D -m 0755 WeekBox-linux_x64 %{buildroot}/usr/lib/weekbox/WeekBox
install -D -m 0644 resources.neu %{buildroot}/usr/lib/weekbox/resources.neu
install -D -m 0755 libweekbox-appid.so %{buildroot}/usr/lib/weekbox/libweekbox-appid.so
install -D -m 0755 weekbox-wrapper.sh %{buildroot}%{_bindir}/weekbox
ln -s weekbox %{buildroot}%{_bindir}/WeekBox
install -D -m 0644 weekbox.desktop %{buildroot}%{_datadir}/applications/weekbox.desktop
install -D -m 0644 launcher-icon.png %{buildroot}%{_datadir}/icons/hicolor/256x256/apps/weekbox.png
install -D -m 0644 launcher-icon.png %{buildroot}%{_datadir}/pixmaps/weekbox.png

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
* Sun Sep 13 2026 Crew Awesome <info@weekbox.app> - 2.3.4-1
- Package the 2.3.4 linux-x64 zip
- Unpack the zip inside the build directory (Fedora 44 %setup layout)
