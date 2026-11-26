#define _GNU_SOURCE
#include <dlfcn.h>
#include <pthread.h>
#include <unistd.h>

/*
 * Neutralino calls gtk_init_check(0, NULL) and never sets g_set_prgname().
 * On Wayland, GTK uses that name as xdg_toplevel app_id. When it is unset,
 * compositors show a generic icon instead of weekbox.png.
 */

static pthread_t main_thread;
static int main_thread_captured = 0;

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

  main_thread = pthread_self();
  main_thread_captured = 1;

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

/*
 * Neutralino calls window methods from worker threads; GTK requires the main loop.
 */

typedef int (*GSourceFunc)(void *);
typedef unsigned int (*g_idle_add_fn)(GSourceFunc, void *);
typedef void (*gtk_widget_fn)(void *);

static int is_main_thread(void) {
  if (!main_thread_captured) return 1;
  return pthread_equal(pthread_self(), main_thread);
}

static g_idle_add_fn get_g_idle_add(void) {
  static g_idle_add_fn fn;
  if (!fn) {
    fn = (g_idle_add_fn)dlsym(RTLD_DEFAULT, "g_idle_add");
    if (!fn) {
      void *glib = dlopen("libglib-2.0.so.0", RTLD_LAZY | RTLD_NOLOAD);
      if (glib) fn = (g_idle_add_fn)dlsym(glib, "g_idle_add");
    }
  }
  return fn;
}

static gtk_widget_fn get_real_hide(void) {
  static gtk_widget_fn fn;
  if (!fn) {
    fn = (gtk_widget_fn)dlsym(RTLD_NEXT, "gtk_widget_hide");
    if (!fn) {
      void *gtk = dlopen("libgtk-3.so.0", RTLD_LAZY | RTLD_NOLOAD);
      if (gtk) fn = (gtk_widget_fn)dlsym(gtk, "gtk_widget_hide");
    }
  }
  return fn;
}

static gtk_widget_fn get_real_show(void) {
  static gtk_widget_fn fn;
  if (!fn) {
    fn = (gtk_widget_fn)dlsym(RTLD_NEXT, "gtk_widget_show");
    if (!fn) {
      void *gtk = dlopen("libgtk-3.so.0", RTLD_LAZY | RTLD_NOLOAD);
      if (gtk) fn = (gtk_widget_fn)dlsym(gtk, "gtk_widget_show");
    }
  }
  return fn;
}

static gtk_widget_fn get_real_present(void) {
  static gtk_widget_fn fn;
  if (!fn) {
    fn = (gtk_widget_fn)dlsym(RTLD_NEXT, "gtk_window_present");
    if (!fn) {
      void *gtk = dlopen("libgtk-3.so.0", RTLD_LAZY | RTLD_NOLOAD);
      if (gtk) fn = (gtk_widget_fn)dlsym(gtk, "gtk_window_present");
    }
  }
  return fn;
}

static int idle_hide_cb(void *widget) {
  gtk_widget_fn real_hide = get_real_hide();
  if (real_hide && widget) real_hide(widget);
  return 0;
}

void gtk_widget_hide(void *widget) {
  if (!widget) return;
  gtk_widget_fn real_hide = get_real_hide();
  if (!real_hide) return;

  if (is_main_thread()) {
    real_hide(widget);
  } else {
    g_idle_add_fn idle_add = get_g_idle_add();
    if (idle_add) {
      idle_add(idle_hide_cb, widget);
    } else {
      real_hide(widget);
    }
  }
}

static int idle_show_cb(void *widget) {
  gtk_widget_fn real_show = get_real_show();
  if (real_show && widget) real_show(widget);
  return 0;
}

void gtk_widget_show(void *widget) {
  if (!widget) return;
  gtk_widget_fn real_show = get_real_show();
  if (!real_show) return;

  if (is_main_thread()) {
    real_show(widget);
  } else {
    g_idle_add_fn idle_add = get_g_idle_add();
    if (idle_add) {
      idle_add(idle_show_cb, widget);
    } else {
      real_show(widget);
    }
  }
}

static int idle_present_cb(void *window) {
  gtk_widget_fn real_present = get_real_present();
  if (real_present && window) real_present(window);
  return 0;
}

void gtk_window_present(void *window) {
  if (!window) return;
  gtk_widget_fn real_present = get_real_present();
  if (!real_present) return;

  if (is_main_thread()) {
    real_present(window);
  } else {
    g_idle_add_fn idle_add = get_g_idle_add();
    if (idle_add) {
      idle_add(idle_present_cb, window);
    } else {
      real_present(window);
    }
  }
}

/*
 * Fall back to the installed icon name if the temporary file is missing.
 */

typedef void *(*app_indicator_new_fn)(const char *, const char *, int);
typedef void (*app_indicator_set_icon_fn)(void *, const char *);
typedef void (*app_indicator_set_icon_theme_path_fn)(void *, const char *);

static const char *resolve_indicator_icon(const char *icon_name) {
  if (icon_name && icon_name[0] == '/' && access(icon_name, R_OK) == 0) {
    return icon_name;
  }
  if (access("/usr/share/pixmaps/weekbox.png", R_OK) == 0) {
    return "weekbox";
  }
  return icon_name ? icon_name : "weekbox";
}

void *app_indicator_new(const char *id, const char *icon_name, int category) {
  static app_indicator_new_fn real_fn;
  if (!real_fn) real_fn = (app_indicator_new_fn)dlsym(RTLD_NEXT, "app_indicator_new");

  const char *resolved = resolve_indicator_icon(icon_name);
  void *indicator = real_fn ? real_fn(id, resolved, category) : NULL;

  if (indicator) {
    app_indicator_set_icon_theme_path_fn set_path =
        (app_indicator_set_icon_theme_path_fn)dlsym(RTLD_DEFAULT, "app_indicator_set_icon_theme_path");
    if (set_path) {
      set_path(indicator, "/usr/share/pixmaps");
      set_path(indicator, "/usr/share/icons/hicolor/256x256/apps");
    }
  }
  return indicator;
}

void app_indicator_set_icon(void *self, const char *icon_name) {
  static app_indicator_set_icon_fn real_fn;
  if (!real_fn) real_fn = (app_indicator_set_icon_fn)dlsym(RTLD_NEXT, "app_indicator_set_icon");
  if (!real_fn || !self) return;

  const char *resolved = resolve_indicator_icon(icon_name);
  real_fn(self, resolved);
}
