#define _GNU_SOURCE
#include <dlfcn.h>

/*
 * Neutralino calls gtk_init_check(0, NULL) and never sets g_set_prgname().
 * On Wayland, GTK uses that name as xdg_toplevel app_id. When it is unset,
 * KDE/other compositors show the generic Wayland icon instead of weekbox.png.
 *
 * This library is LD_PRELOAD'd by the WeekBox launcher so app_id matches
 * weekbox.desktop (Icon=weekbox).
 */

static void weekbox_apply_app_id(void) {
  void (*g_set_prgname)(const char *);
  void (*gdk_set_program_class)(const char *);
  void (*gtk_window_set_default_icon_name)(const char *);

  g_set_prgname = dlsym(RTLD_DEFAULT, "g_set_prgname");
  if (g_set_prgname) g_set_prgname("weekbox");

  gdk_set_program_class = dlsym(RTLD_DEFAULT, "gdk_set_program_class");
  if (gdk_set_program_class) gdk_set_program_class("weekbox");

  gtk_window_set_default_icon_name =
      dlsym(RTLD_DEFAULT, "gtk_window_set_default_icon_name");
  if (gtk_window_set_default_icon_name)
    gtk_window_set_default_icon_name("weekbox");
}

typedef int (*gtk_init_check_fn)(int *, char ***);

int gtk_init_check(int *argc, char ***argv) {
  static gtk_init_check_fn real_gtk_init_check;
  int result = 0;

  if (!real_gtk_init_check) {
    real_gtk_init_check = (gtk_init_check_fn)dlsym(RTLD_NEXT, "gtk_init_check");
    if (!real_gtk_init_check) {
      void *gtk = dlopen("libgtk-3.so.0", RTLD_LAZY | RTLD_NOLOAD);
      if (gtk)
        real_gtk_init_check = (gtk_init_check_fn)dlsym(gtk, "gtk_init_check");
    }
  }

  if (real_gtk_init_check) result = real_gtk_init_check(argc, argv);
  weekbox_apply_app_id();
  return result;
}
