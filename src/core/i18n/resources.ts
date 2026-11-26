export type SupportedLanguage =
  | 'en'
  | 'zh'
  | 'zh-TW'
  | 'ru'
  | 'tr'
  | 'pl'
  | 'id'
  | 'es'
  | 'it'
  | 'fr'
  | 'pt-BR'
  | 'de'

export interface LanguageOptionMeta {
  code: SupportedLanguage
  englishName: string
  nativeName: string
  regionLabel: string
}

export const SUPPORTED_LANGUAGES: LanguageOptionMeta[] = [
  {
    code: 'en',
    englishName: 'English',
    nativeName: 'English',
    regionLabel: 'United States',
  },
  {
    code: 'zh',
    englishName: 'Chinese (Simplified)',
    nativeName: '简体中文',
    regionLabel: '中国',
  },
  {
    code: 'zh-TW',
    englishName: 'Chinese (Traditional)',
    nativeName: '繁體中文',
    regionLabel: '台灣',
  },
  {
    code: 'ru',
    englishName: 'Russian',
    nativeName: 'Русский',
    regionLabel: 'Россия',
  },
  {
    code: 'tr',
    englishName: 'Turkish',
    nativeName: 'Türkçe',
    regionLabel: 'Türkiye',
  },
  {
    code: 'pl',
    englishName: 'Polish',
    nativeName: 'Polski',
    regionLabel: 'Polska',
  },
  {
    code: 'id',
    englishName: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    regionLabel: 'Indonesia',
  },
  {
    code: 'es',
    englishName: 'Spanish',
    nativeName: 'Español',
    regionLabel: 'México / LATAM',
  },
  {
    code: 'it',
    englishName: 'Italian',
    nativeName: 'Italiano',
    regionLabel: 'Italia',
  },
  {
    code: 'fr',
    englishName: 'French',
    nativeName: 'Français',
    regionLabel: 'France',
  },
  {
    code: 'pt-BR',
    englishName: 'Portuguese',
    nativeName: 'Português',
    regionLabel: 'Brasil',
  },
  {
    code: 'de',
    englishName: 'German',
    nativeName: 'Deutsch',
    regionLabel: 'Deutschland',
  },
]

export const resources = {
  en: {
    translation: {
      setup: {
        nav: {
          back: 'Back',
          next: 'Next',
          finish: 'Finish',
          stepLabel: '{{current}}/{{total}}',
        },
        welcome: {
          title: 'Welcome to WeekBox, weekboxer.',
          subtitle: "Let's configure your setup.",
        },
        about: {
          title: 'What is WeekBox?',
          description:
            "It's a Friday Night Funkin' launcher (inspired by Minecraft launchers) that lets you install mods, run any engine on any version, track your playtime, and move your mods wherever you want without limits—making mod installation effortless on any engine. Built by the community for the community, led by Britex and Malloy.",
          features: {
            mods: 'Mods & Packs',
            engines: 'Any Engine & Version',
            playtime: 'Playtime Tracking',
            community: 'Community Led',
          },
          placeholderCaption: 'WeekBox Workspace Preview',
        },
        language: {
          title: 'Select your preferred language',
          subtitle:
            'Choose the language for the interface. The setup updates immediately after selecting.',
          selected: 'Selected',
        },
        theme: {
          title: 'Choose your UI theme',
          subtitle:
            'Pick light mode, dark mode, or let your device decide automatically.',
          options: {
            light: {
              title: 'Light',
              description: 'Crisp high-brightness Material 3 surfaces.',
            },
            dark: {
              title: 'Dark',
              description: 'Low-glare dark surfaces easy on the eyes.',
            },
            system: {
              title: 'System',
              description: 'Matches your device appearance ({{mode}}).',
            },
          },
          modes: {
            light: 'Light',
            dark: 'Dark',
          },
        },
        scale: {
          title: 'Scale the UI to your liking',
          subtitle:
            'Drag the slider to adjust text, spacing, and controls to fit your screen.',
          currentScale: 'Current scale',
          reset: 'Reset to 100%',
          previewTitle: 'Live Preview Card',
          previewBody:
            'Titles, badges, and buttons scale proportionally in real time.',
          previewAction: 'Sample Action',
        },
        style: {
          title: 'Choose your WeekBox style',
          subtitle:
            'Compare both styles live behind this screen and pick the one you like best.',
          options: {
            default: {
              title: 'WeekBox Style',
              description:
                'Full Material 3 Expressive experience with wavy progress, animated shapes, and custom SVG chrome.',
            },
            home: {
              title: 'WeekBox Home',
              description:
                'Cleaner, simpler classic layout with flat progress bars, crisp dialogs, and a minimal sidebar.',
            },
          },
        },
        finish: {
          title: "You're all set!",
          subtitle:
            "Your WeekBox setup is complete and ready. Click Finish to start exploring mods and engines.",
          summaryLanguage: 'Language',
          summaryTheme: 'Theme',
          summaryScale: 'UI Scale',
          summaryStyle: 'Style',
        },
      },
      settings: {
        title: 'Settings',
        saveAndClose: 'Save & Close',
        themeTitle: 'Application Theme',
        themeSubtitle: 'Select Light, Dark, or follow your device theme',
        lightMode: 'Light',
        darkMode: 'Dark',
        systemMode: 'System',
        languageTitle: 'Language',
        languageSubtitle: 'Interface display language',
        scaleTitle: 'Interface Scale',
        scaleSubtitle: 'Adjust overall UI size ({{scale}}%)',
        setupTitle: 'Welcome Setup',
        setupSubtitle: 'Re-run the initial WeekBox configuration wizard',
        restartSetup: 'Open Setup',
        protocolLinksTitle: 'Open WeekBox links',
        protocolLinksSubtitle: 'Register weekbox:// links (e.g. weekbox://mod/1757143) for one-click install',
        webInspectorTitle: 'Web Inspector',
        webInspectorSubtitle: 'Enabled for runtime development and debugging',
        aboutTitle: 'About WeekBox',
        aboutSubtitle: 'App version, architecture, and platform info',
        viewInfo: 'View Info',
      },
    },
  },
  es: {
    translation: {
      setup: {
        nav: {
          back: 'Atrás',
          next: 'Siguiente',
          finish: 'Finalizar',
          stepLabel: '{{current}}/{{total}}',
        },
        welcome: {
          title: 'Bienvenido a WeekBox, weekboxer.',
          subtitle: 'Vamos a configurar tu setup.',
        },
        about: {
          title: '¿Qué es WeekBox?',
          description:
            "Es un launcher de Friday Night Funkin' (como los de Minecraft) que te permite instalar mods, usar cualquier engine en cualquier versión, ver su tiempo de ejecución y cambiar de ubicación tus mods sin límites, facilitándote la instalación en cualquier motor. Esta es una herramienta creada por la comunidad para la comunidad, liderada por Britex y Malloy.",
          features: {
            mods: 'Mods y Packs',
            engines: 'Cualquier Engine y Versión',
            playtime: 'Tiempo de Juego',
            community: 'Hecho por la Comunidad',
          },
          placeholderCaption: 'Vista previa de WeekBox',
        },
        language: {
          title: 'Selecciona tu idioma preferido',
          subtitle:
            'Elige el idioma de la interfaz. Todo se ajusta automáticamente al seleccionarlo.',
          selected: 'Seleccionado',
        },
        theme: {
          title: 'Selecciona el tema de la UI',
          subtitle:
            'Elige modo claro, oscuro o deja que tu dispositivo decida automáticamente.',
          options: {
            light: {
              title: 'Claro',
              description: 'Superficies Material 3 brillantes y limpias.',
            },
            dark: {
              title: 'Oscuro',
              description: 'Superficies oscuras descansadas para la vista.',
            },
            system: {
              title: 'Dispositivo',
              description: 'Sigue el tema de tu sistema ({{mode}}).',
            },
          },
          modes: {
            light: 'Claro',
            dark: 'Oscuro',
          },
        },
        scale: {
          title: 'Escala la interfaz a tu gusto',
          subtitle:
            'Mueve el control deslizante para ajustar textos, espaciados y botones a tu pantalla.',
          currentScale: 'Escala actual',
          reset: 'Restablecer al 100%',
          previewTitle: 'Tarjeta de vista previa',
          previewBody:
            'Los títulos, etiquetas y botones escalan proporcionalmente en tiempo real.',
          previewAction: 'Botón de ejemplo',
        },
        style: {
          title: 'Elige tu estilo preferido',
          subtitle:
            'Observa el cambio en vivo detrás del panel y selecciona la interfaz que más te guste.',
          options: {
            default: {
              title: 'WeekBox Style',
              description:
                'Diseño Material 3 Expressive completo con barras onduladas, formas animadas y detalles SVG.',
            },
            home: {
              title: 'WeekBox Home',
              description:
                'Interfaz clásica más simple y limpia, con barras rectas, botones sutiles y barra lateral sencilla.',
            },
          },
        },
        finish: {
          title: '¡Todo está listo!',
          subtitle:
            'La configuración de WeekBox ha finalizado. Pulsa Finalizar para comenzar a explorar mods y engines.',
          summaryLanguage: 'Idioma',
          summaryTheme: 'Tema',
          summaryScale: 'Escala UI',
          summaryStyle: 'Estilo',
        },
      },
      settings: {
        title: 'Configuración',
        saveAndClose: 'Guardar y cerrar',
        themeTitle: 'Tema de la aplicación',
        themeSubtitle: 'Selecciona claro, oscuro o según tu dispositivo',
        lightMode: 'Claro',
        darkMode: 'Oscuro',
        systemMode: 'Sistema',
        languageTitle: 'Idioma',
        languageSubtitle: 'Idioma de la interfaz',
        scaleTitle: 'Escala de interfaz',
        scaleSubtitle: 'Ajusta el tamaño de la UI ({{scale}}%)',
        setupTitle: 'Asistente de bienvenida',
        setupSubtitle: 'Volver a abrir la configuración inicial de WeekBox',
        restartSetup: 'Abrir setup',
        protocolLinksTitle: 'Abrir enlaces de WeekBox',
        protocolLinksSubtitle: 'Registrar enlaces weekbox:// (ej. weekbox://mod/1757143) para instalación en un clic',
        webInspectorTitle: 'Inspector web',
        webInspectorSubtitle: 'Habilitado para desarrollo y depuración',
        aboutTitle: 'Acerca de WeekBox',
        aboutSubtitle: 'Versión, arquitectura e información de plataforma',
        viewInfo: 'Ver info',
      },
    },
  },
  fr: {
    translation: {
      setup: {
        nav: {
          back: 'Retour',
          next: 'Suivant',
          finish: 'Terminer',
          stepLabel: '{{current}}/{{total}}',
        },
        welcome: {
          title: 'Bienvenue dans WeekBox, weekboxer.',
          subtitle: 'Configurons votre installation.',
        },
        about: {
          title: "Qu'est-ce que WeekBox ?",
          description:
            "C'est un lanceur Friday Night Funkin' (inspiré des lanceurs Minecraft) qui vous permet d'installer des mods, d'utiliser n'importe quel moteur dans n'importe quelle version, de suivre votre temps de jeu et de déplacer vos mods où vous voulez sans limites. Un outil créé par la communauté pour la communauté, dirigé par Britex et Malloy.",
          features: {
            mods: 'Mods & Packs',
            engines: 'Tous Moteurs & Versions',
            playtime: 'Temps de Jeu',
            community: 'Par la Communauté',
          },
          placeholderCaption: 'Aperçu de WeekBox',
        },
        language: {
          title: 'Sélectionnez votre langue préférée',
          subtitle:
            "Choisissez la langue de l'interface. Le texte s'adapte immédiatement.",
          selected: 'Sélectionné',
        },
        theme: {
          title: "Choisissez le thème de l'interface",
          subtitle:
            'Optez pour le thème clair, sombre ou suivez automatiquement votre appareil.',
          options: {
            light: {
              title: 'Clair',
              description: 'Surfaces Material 3 lumineuses et nettes.',
            },
            dark: {
              title: 'Sombre',
              description: 'Surfaces sombres confortables pour les yeux.',
            },
            system: {
              title: 'Appareil',
              description: 'Suit le thème de votre appareil ({{mode}}).',
            },
          },
          modes: {
            light: 'Clair',
            dark: 'Sombre',
          },
        },
        scale: {
          title: "Ajustez la taille de l'interface",
          subtitle:
            'Faites glisser le curseur pour adapter les textes et contrôles à votre écran.',
          currentScale: 'Échelle actuelle',
          reset: 'Réinitialiser à 100%',
          previewTitle: "Carte d'aperçu en direct",
          previewBody:
            'Les titres, badges et boutons se redimensionnent en temps réel.',
          previewAction: 'Bouton test',
        },
        style: {
          title: 'Choisissez votre style WeekBox',
          subtitle:
            "Comparez les deux styles en direct à l'arrière-plan et sélectionnez celui que vous préférez.",
          options: {
            default: {
              title: 'WeekBox Style',
              description:
                'Expérience Material 3 Expressive complète avec barres ondulées, formes animées et SVG personnalisés.',
            },
            home: {
              title: 'WeekBox Home',
              description:
                'Interface classique plus simple et épurée avec barres droites, modales sobres et barre latérale minimale.',
            },
          },
        },
        finish: {
          title: 'Tout est prêt !',
          subtitle:
            'Votre configuration WeekBox est terminée. Cliquez sur Terminer pour commencer.',
          summaryLanguage: 'Langue',
          summaryTheme: 'Thème',
          summaryScale: 'Échelle UI',
          summaryStyle: 'Style',
        },
      },
      settings: {
        title: 'Paramètres',
        saveAndClose: 'Enregistrer et fermer',
        themeTitle: "Thème de l'application",
        themeSubtitle: 'Clair, sombre ou automatique selon votre appareil',
        lightMode: 'Clair',
        darkMode: 'Sombre',
        systemMode: 'Système',
        languageTitle: 'Langue',
        languageSubtitle: "Langue d'affichage de l'interface",
        scaleTitle: "Échelle de l'interface",
        scaleSubtitle: "Ajuster la taille de l'interface ({{scale}}%)",
        setupTitle: 'Assistant de bienvenue',
        setupSubtitle: 'Relancer la configuration initiale de WeekBox',
        restartSetup: 'Ouvrir setup',
        webInspectorTitle: 'Inspecteur Web',
        webInspectorSubtitle: 'Activé pour le développement et le débogage',
        aboutTitle: 'À propos de WeekBox',
        aboutSubtitle: 'Version, architecture et plateforme',
        viewInfo: 'Voir infos',
      },
    },
  },
  zh: {
    translation: {
      setup: {
        nav: {
          back: '返回',
          next: '下一步',
          finish: '完成',
          stepLabel: '{{current}}/{{total}}',
        },
        welcome: {
          title: '欢迎来到 WeekBox，weekboxer。',
          subtitle: '让我们一起完成初始设置。',
        },
        about: {
          title: '什么是 WeekBox？',
          description:
            "这是一款 Friday Night Funkin' 启动器（灵感源自 Minecraft 启动器），让你可以轻松安装模组、下载任意引擎的任意版本、查看游玩时长，并自由迁移模组存储位置，让各类引擎的模组安装更加简单。由 Britex 和 Malloy 领衔、社区共同打造并服务于社区。",
          features: {
            mods: '模组与整合包',
            engines: '多引擎与全版本',
            playtime: '运行计时统计',
            community: '社区驱动开发',
          },
          placeholderCaption: 'WeekBox 界面预览',
        },
        language: {
          title: '选择您的首选语言',
          subtitle: '选择后界面文字会立即自动切换为所选语言。',
          selected: '已选择',
        },
        theme: {
          title: '选择界面主题',
          subtitle: '选择浅色、深色，或跟随系统设备外观自动切换。',
          options: {
            light: {
              title: '浅色',
              description: '明亮清晰的 Material 3 表面风格。',
            },
            dark: {
              title: '深色',
              description: '柔和护眼的深色界面外观。',
            },
            system: {
              title: '跟随系统',
              description: '自动同步设备当前主题（{{mode}}）。',
            },
          },
          modes: {
            light: '浅色',
            dark: '深色',
          },
        },
        scale: {
          title: '自由缩放界面大小',
          subtitle: '拖动滑块以实时调整字体、间距与控件大小。',
          currentScale: '当前缩放',
          reset: '重置为 100%',
          previewTitle: '实时预览卡片',
          previewBody: '标题、徽章与按钮将按比例实时缩放。',
          previewAction: '示例按钮',
        },
        style: {
          title: '选择界面风格',
          subtitle: '可在背景中实时预览两种风格的效果，选择您更喜欢的一种。',
          options: {
            default: {
              title: 'WeekBox Style',
              description:
                '完整的 Material 3 Expressive 风格，包含波浪进度条、动态形状与自定义 SVG 装饰。',
            },
            home: {
              title: 'WeekBox Home',
              description:
                '更简洁传统的界面样式，采用直线进度条、简约弹窗以及无装饰侧边栏。',
            },
          },
        },
        finish: {
          title: '设置已全部完成！',
          subtitle:
            'WeekBox 已准备就绪，点击“完成”即可开始探索并管理您的 FNF 模组与引擎。',
          summaryLanguage: '语言',
          summaryTheme: '主题',
          summaryScale: '界面缩放',
          summaryStyle: '界面风格',
        },
      },
      settings: {
        title: '设置',
        saveAndClose: '保存并关闭',
        themeTitle: '应用主题',
        themeSubtitle: '选择浅色、深色或跟随系统设备',
        lightMode: '浅色',
        darkMode: '深色',
        systemMode: '系统',
        languageTitle: '界面语言',
        languageSubtitle: '选择应用的显示语言',
        scaleTitle: '界面缩放',
        scaleSubtitle: '调整界面整体大小 ({{scale}}%)',
        setupTitle: '欢迎配置向导',
        setupSubtitle: '重新打开 WeekBox 初始配置向导',
        restartSetup: '运行向导',
        webInspectorTitle: 'Web 检查器',
        webInspectorSubtitle: '已启用用于运行时开发与调试',
        aboutTitle: '关于 WeekBox',
        aboutSubtitle: '应用版本、架构及平台信息',
        viewInfo: '查看详情',
      },
    },
  },
  'zh-TW': {
    translation: {
      setup: {
        nav: {
          back: '返回',
          next: '下一步',
          finish: '完成',
          stepLabel: '{{current}}/{{total}}',
        },
        welcome: {
          title: '歡迎來到 WeekBox，weekboxer。',
          subtitle: '讓我們開始設定您的環境。',
        },
        about: {
          title: '什麼是 WeekBox？',
          description:
            "這是一款 Friday Night Funkin' 啟動器（靈感來自 Minecraft 啟動器），讓您可以安裝模組、執行任何版本的任何引擎、追蹤遊玩時間，並無限制地移動模組位置，讓在任何引擎上安裝模組變得輕鬆簡單。由 Britex 與 Malloy 領銜，社群為社群打造的工具。",
          features: {
            mods: '模組與整合包',
            engines: '支援任何引擎與版本',
            playtime: '遊玩時間統計',
            community: '社群驅動',
          },
          placeholderCaption: 'WeekBox 工作區預覽',
        },
        language: {
          title: '選擇您的偏好語言',
          subtitle: '選擇介面顯示語言，選取後設定精靈會立即更新。',
          selected: '已選擇',
        },
        theme: {
          title: '選擇介面主題',
          subtitle: '選擇淺色模式、深色模式，或讓您的裝置自動決定。',
          options: {
            light: {
              title: '淺色',
              description: '明亮清晰的 Material 3 介面。',
            },
            dark: {
              title: '深色',
              description: '低眩光深色介面，保護眼睛。',
            },
            system: {
              title: '系統預設',
              description: '與您的裝置外觀保持一致（{{mode}}）。',
            },
          },
          modes: {
            light: '淺色',
            dark: '深色',
          },
        },
        scale: {
          title: '依喜好調整介面縮放',
          subtitle: '拖動滑桿即可即時調整文字、間距與控制項大小以符合您的螢幕。',
          currentScale: '目前縮放比例',
          reset: '重設為 100%',
          previewTitle: '即時預覽卡片',
          previewBody: '標題、標籤與按鈕會即時等比例縮放。',
          previewAction: '範例按鈕',
        },
        style: {
          title: '選擇您的 WeekBox 風格',
          subtitle: '可在畫面後方即時比較兩種風格，挑選您最喜歡的一種。',
          options: {
            default: {
              title: 'WeekBox Style',
              description:
                '完整的 Material 3 Expressive 體驗，包含波浪進度條、動態形狀與自訂 SVG 外觀。',
            },
            home: {
              title: 'WeekBox Home',
              description:
                '更簡潔傳統的版面配置，搭配平直進度條、清爽對話框與極簡側邊欄。',
            },
          },
        },
        finish: {
          title: '一切就緒！',
          subtitle:
            '您的 WeekBox 設定已完成並準備好使用。點擊「完成」即可開始探索模組與引擎。',
          summaryLanguage: '語言',
          summaryTheme: '主題',
          summaryScale: '介面縮放',
          summaryStyle: '風格',
        },
      },
      settings: {
        title: '設定',
        saveAndClose: '儲存並關閉',
        themeTitle: '應用程式主題',
        themeSubtitle: '選擇淺色、深色或跟隨裝置主題',
        lightMode: '淺色',
        darkMode: '深色',
        systemMode: '系統',
        languageTitle: '語言',
        languageSubtitle: '介面顯示語言',
        scaleTitle: '介面縮放',
        scaleSubtitle: '調整整體介面大小 ({{scale}}%)',
        setupTitle: '歡迎設定精靈',
        setupSubtitle: '重新執行 WeekBox 初始設定精靈',
        restartSetup: '開啟設定精靈',
        webInspectorTitle: '網頁檢查器',
        webInspectorSubtitle: '已啟用於執行階段開發與除錯',
        aboutTitle: '關於 WeekBox',
        aboutSubtitle: '應用程式版本、架構與平台資訊',
        viewInfo: '檢視資訊',
      },
    },
  },
  ru: {
    translation: {
      setup: {
        nav: {
          back: 'Назад',
          next: 'Далее',
          finish: 'Готово',
          stepLabel: '{{current}}/{{total}}',
        },
        welcome: {
          title: 'Добро пожаловать в WeekBox, weekboxer.',
          subtitle: 'Давайте настроим всё под вас.',
        },
        about: {
          title: 'Что такое WeekBox?',
          description:
            "Это лаунчер для Friday Night Funkin' (вдохновлённый лаунчерами Minecraft), который позволяет устанавливать моды, запускать любой движок любой версии, отслеживать время игры и свободно перемещать моды без ограничений. Создано сообществом для сообщества под руководством Britex и Malloy.",
          features: {
            mods: 'Моды и сборки',
            engines: 'Любой движок и версия',
            playtime: 'Учёт времени игры',
            community: 'От сообщества',
          },
          placeholderCaption: 'Предпросмотр WeekBox',
        },
        language: {
          title: 'Выберите предпочитаемый язык',
          subtitle:
            'Выберите язык интерфейса. Текст обновится сразу после выбора.',
          selected: 'Выбрано',
        },
        theme: {
          title: 'Выберите тему интерфейса',
          subtitle:
            'Выберите светлую, тёмную тему или позвольте устройству решать автоматически.',
          options: {
            light: {
              title: 'Светлая',
              description: 'Чёткие и яркие поверхности Material 3.',
            },
            dark: {
              title: 'Тёмная',
              description: 'Комфортная тёмная тема без лишней нагрузки на глаза.',
            },
            system: {
              title: 'Системная',
              description: 'Совпадает с темой вашего устройства ({{mode}}).',
            },
          },
          modes: {
            light: 'Светлая',
            dark: 'Тёмная',
          },
        },
        scale: {
          title: 'Настройте масштаб интерфейса',
          subtitle:
            'Передвигайте ползунок, чтобы подогнать размер текста, отступов и элементов под ваш экран.',
          currentScale: 'Текущий масштаб',
          reset: 'Сбросить на 100%',
          previewTitle: 'Карточка предпросмотра',
          previewBody:
            'Заголовки, значки и кнопки масштабируются пропорционально в реальном времени.',
          previewAction: 'Пример кнопки',
        },
        style: {
          title: 'Выберите стиль WeekBox',
          subtitle:
            'Сравните оба стиля вживую на фоне и выберите тот, который нравится больше.',
          options: {
            default: {
              title: 'WeekBox Style',
              description:
                'Полноценный Material 3 Expressive с волнистыми индикаторами, анимированными формами и SVG-деталями.',
            },
            home: {
              title: 'WeekBox Home',
              description:
                'Более простой классический вид с прямыми полосами загрузки, аккуратными окнами и минимальной боковой панелью.',
            },
          },
        },
        finish: {
          title: 'Всё готово!',
          subtitle:
            'Настройка WeekBox завершена. Нажмите «Готово», чтобы начать обзор модов и движков.',
          summaryLanguage: 'Язык',
          summaryTheme: 'Тема',
          summaryScale: 'Масштаб UI',
          summaryStyle: 'Стиль',
        },
      },
      settings: {
        title: 'Настройки',
        saveAndClose: 'Сохранить и закрыть',
        themeTitle: 'Тема приложения',
        themeSubtitle: 'Выберите светлую, тёмную или системную тему',
        lightMode: 'Светлая',
        darkMode: 'Тёмная',
        systemMode: 'Системная',
        languageTitle: 'Язык',
        languageSubtitle: 'Язык отображения интерфейса',
        scaleTitle: 'Масштаб интерфейса',
        scaleSubtitle: 'Настройка общего размера UI ({{scale}}%)',
        setupTitle: 'Мастер настройки',
        setupSubtitle: 'Повторно запустить начальную настройку WeekBox',
        restartSetup: 'Открыть мастер',
        webInspectorTitle: 'Веб-инспектор',
        webInspectorSubtitle: 'Включён для разработки и отладки',
        aboutTitle: 'О WeekBox',
        aboutSubtitle: 'Версия, архитектура и информация о платформе',
        viewInfo: 'Подробнее',
      },
    },
  },
  tr: {
    translation: {
      setup: {
        nav: {
          back: 'Geri',
          next: 'İleri',
          finish: 'Bitir',
          stepLabel: '{{current}}/{{total}}',
        },
        welcome: {
          title: "WeekBox'a hoş geldin, weekboxer.",
          subtitle: 'Kurulumunu yapılandıralım.',
        },
        about: {
          title: 'WeekBox nedir?',
          description:
            "Mod kurmanı, her engine'i istediğin sürümde çalıştırmanı, oynama süreni takip etmeni ve modlarını sınırsızca taşımanı sağlayan bir Friday Night Funkin' başlatıcısıdır (Minecraft başlatıcılarından esinlenmiştir). Britex ve Malloy liderliğinde topluluk tarafından topluluk için geliştirilmiştir.",
          features: {
            mods: 'Modlar ve Paketler',
            engines: 'Her Engine ve Sürüm',
            playtime: 'Oyun Süresi Takibi',
            community: 'Topluluk Odaklı',
          },
          placeholderCaption: 'WeekBox Çalışma Alanı Önizlemesi',
        },
        language: {
          title: 'Tercih ettiğin dili seç',
          subtitle:
            'Arayüz dilini seç. Seçim yaptıktan hemen sonra kurulum güncellenir.',
          selected: 'Seçildi',
        },
        theme: {
          title: 'Arayüz temanı seç',
          subtitle:
            'Açık mod, koyu mod seç veya cihazının otomatik belirlemesine izin ver.',
          options: {
            light: {
              title: 'Açık',
              description: 'Canlı ve parlak Material 3 yüzeyleri.',
            },
            dark: {
              title: 'Koyu',
              description: 'Gözü yormayan düşük parlamalı koyu yüzeyler.',
            },
            system: {
              title: 'Sistem',
              description: 'Cihazının görünümüyle eşleşir ({{mode}}).',
            },
          },
          modes: {
            light: 'Açık',
            dark: 'Koyu',
          },
        },
        scale: {
          title: 'Arayüzü isteğine göre ölçeklendir',
          subtitle:
            'Metinleri, boşlukları ve kontrolleri ekranına göre ayarlamak için kaydırıcıyı sürükle.',
          currentScale: 'Geçerli ölçek',
          reset: "%100'e sıfırla",
          previewTitle: 'Canlı Önizleme Kartı',
          previewBody:
            'Başlıklar, rozetler ve düğmeler gerçek zamanlı olarak orantılı ölçeklenir.',
          previewAction: 'Örnek İşlem',
        },
        style: {
          title: 'WeekBox stilini seç',
          subtitle:
            'Her iki stili de arka planda canlı karşılaştır ve en beğendiğini seç.',
          options: {
            default: {
              title: 'WeekBox Style',
              description:
                'Dalgalı ilerleme çubukları, animasyonlu şekiller ve özel SVG detaylarıyla tam Material 3 Expressive deneyimi.',
            },
            home: {
              title: 'WeekBox Home',
              description:
                'Düz ilerleme çubukları, sade pencereler ve minimal kenar çubuğuyla daha temiz, klasik düzen.',
            },
          },
        },
        finish: {
          title: 'Her şey hazır!',
          subtitle:
            "WeekBox kurulumun tamamlandı. Modları ve engine'leri keşfetmeye başlamak için Bitir'e tıkla.",
          summaryLanguage: 'Dil',
          summaryTheme: 'Tema',
          summaryScale: 'Arayüz Ölçeği',
          summaryStyle: 'Stil',
        },
      },
      settings: {
        title: 'Ayarlar',
        saveAndClose: 'Kaydet ve Kapat',
        themeTitle: 'Uygulama Teması',
        themeSubtitle: 'Açık, Koyu seç veya cihaz temanı takip et',
        lightMode: 'Açık',
        darkMode: 'Koyu',
        systemMode: 'Sistem',
        languageTitle: 'Dil',
        languageSubtitle: 'Arayüz görüntüleme dili',
        scaleTitle: 'Arayüz Ölçeği',
        scaleSubtitle: 'Genel arayüz boyutunu ayarla ({{scale}}%)',
        setupTitle: 'Hoş Geldin Kurulumu',
        setupSubtitle: 'WeekBox başlangıç yapılandırma sihirbazını yeniden çalıştır',
        restartSetup: 'Kurulumu Aç',
        webInspectorTitle: 'Web Denetçisi',
        webInspectorSubtitle: 'Çalışma zamanı geliştirme ve hata ayıklama için etkin',
        aboutTitle: 'WeekBox Hakkında',
        aboutSubtitle: 'Uygulama sürümü, mimari ve platform bilgisi',
        viewInfo: 'Bilgiyi Gör',
      },
    },
  },
  pl: {
    translation: {
      setup: {
        nav: {
          back: 'Wstecz',
          next: 'Dalej',
          finish: 'Zakończ',
          stepLabel: '{{current}}/{{total}}',
        },
        welcome: {
          title: 'Witaj w WeekBox, weekboxerze.',
          subtitle: 'Skonfigurujmy Twoją aplikację.',
        },
        about: {
          title: 'Czym jest WeekBox?',
          description:
            "To launcher do Friday Night Funkin' (inspirowany launcherami Minecrafta), który pozwala instalować mody, uruchamiać dowolny silnik w dowolnej wersji, śledzić czas gry i przenosić mody bez ograniczeń. Narzędzie stworzone przez społeczność dla społeczności, pod przewodnictwem Britex i Malloy.",
          features: {
            mods: 'Mody i paczki',
            engines: 'Dowolny silnik i wersja',
            playtime: 'Czas gry',
            community: 'Dla społeczności',
          },
          placeholderCaption: 'Podgląd przestrzeni WeekBox',
        },
        language: {
          title: 'Wybierz preferowany język',
          subtitle:
            'Wybierz język interfejsu. Kreator zaktualizuje się natychmiast po wyborze.',
          selected: 'Wybrano',
        },
        theme: {
          title: 'Wybierz motyw interfejsu',
          subtitle:
            'Wybierz tryb jasny, ciemny lub dopasuj go automatycznie do urządzenia.',
          options: {
            light: {
              title: 'Jasny',
              description: 'Wyraźne, jasne powierzchnie Material 3.',
            },
            dark: {
              title: 'Ciemny',
              description: 'Przyjemny dla oczu, stonowany ciemny motyw.',
            },
            system: {
              title: 'Systemowy',
              description: 'Dopasowuje się do wyglądu urządzenia ({{mode}}).',
            },
          },
          modes: {
            light: 'Jasny',
            dark: 'Ciemny',
          },
        },
        scale: {
          title: 'Dostosuj skalę interfejsu',
          subtitle:
            'Przesuń suwak, aby dopasować tekst, odstępy i przyciski do swojego ekranu.',
          currentScale: 'Aktualna skala',
          reset: 'Przywróć 100%',
          previewTitle: 'Karta podglądu na żywo',
          previewBody:
            'Nagłówki, etykiety i przyciski skalują się proporcjonalnie w czasie rzeczywistym.',
          previewAction: 'Przykładowy przycisk',
        },
        style: {
          title: 'Wybierz swój styl WeekBox',
          subtitle:
            'Porównaj oba style na żywo w tle i wybierz ten, który bardziej Ci odpowiada.',
          options: {
            default: {
              title: 'WeekBox Style',
              description:
                'Pełny styl Material 3 Expressive z falistymi paskami postępu, animowanymi kształtami i detalami SVG.',
            },
            home: {
              title: 'WeekBox Home',
              description:
                'Prostszy, klasyczny układ z prostymi paskami, przejrzystymi oknami i minimalistycznym paskiem bocznym.',
            },
          },
        },
        finish: {
          title: 'Wszystko gotowe!',
          subtitle:
            'Konfiguracja WeekBox dobiegła końca. Kliknij Zakończ, aby zacząć przeglądać mody i silniki.',
          summaryLanguage: 'Język',
          summaryTheme: 'Motyw',
          summaryScale: 'Skala UI',
          summaryStyle: 'Styl',
        },
      },
      settings: {
        title: 'Ustawienia',
        saveAndClose: 'Zapisz i zamknij',
        themeTitle: 'Motyw aplikacji',
        themeSubtitle: 'Wybierz jasny, ciemny lub zgodnie z urządzeniem',
        lightMode: 'Jasny',
        darkMode: 'Ciemny',
        systemMode: 'Systemowy',
        languageTitle: 'Język',
        languageSubtitle: 'Język wyświetlania interfejsu',
        scaleTitle: 'Skala interfejsu',
        scaleSubtitle: 'Dostosuj ogólny rozmiar UI ({{scale}}%)',
        setupTitle: 'Kreator powitalny',
        setupSubtitle: 'Uruchom ponownie początkową konfigurację WeekBox',
        restartSetup: 'Otwórz kreator',
        webInspectorTitle: 'Inspektor sieciowy',
        webInspectorSubtitle: 'Włączony do celów programistycznych i debugowania',
        aboutTitle: 'O WeekBox',
        aboutSubtitle: 'Wersja aplikacji, architektura i informacje o platformie',
        viewInfo: 'Zobacz informacje',
      },
    },
  },
  id: {
    translation: {
      setup: {
        nav: {
          back: 'Kembali',
          next: 'Lanjut',
          finish: 'Selesai',
          stepLabel: '{{current}}/{{total}}',
        },
        welcome: {
          title: 'Selamat datang di WeekBox, weekboxer.',
          subtitle: 'Mari atur konfigurasi awal Anda.',
        },
        about: {
          title: 'Apa itu WeekBox?',
          description:
            "Ini adalah launcher Friday Night Funkin' (terinspirasi dari launcher Minecraft) yang memungkinkan Anda memasang mod, menjalankan engine apa pun di versi mana saja, melacak waktu bermain, dan memindahkan mod tanpa batas. Dibuat oleh komunitas untuk komunitas, dipimpin oleh Britex dan Malloy.",
          features: {
            mods: 'Mod & Paket',
            engines: 'Semua Engine & Versi',
            playtime: 'Pelacakan Waktu Main',
            community: 'Dikelola Komunitas',
          },
          placeholderCaption: 'Pratinjau Ruang Kerja WeekBox',
        },
        language: {
          title: 'Pilih bahasa pilihan Anda',
          subtitle:
            'Pilih bahasa antarmuka. Tampilan akan langsung diperbarui setelah dipilih.',
          selected: 'Dipilih',
        },
        theme: {
          title: 'Pilih tema antarmuka',
          subtitle:
            'Pilih mode terang, mode gelap, atau biarkan perangkat menentukan otomatis.',
          options: {
            light: {
              title: 'Terang',
              description: 'Tampilan Material 3 yang cerah dan bersih.',
            },
            dark: {
              title: 'Gelap',
              description: 'Tampilan gelap redup silau yang nyaman di mata.',
            },
            system: {
              title: 'Sistem',
              description: 'Mengikuti tampilan perangkat Anda ({{mode}}).',
            },
          },
          modes: {
            light: 'Terang',
            dark: 'Gelap',
          },
        },
        scale: {
          title: 'Atur skala antarmuka sesuai selera',
          subtitle:
            'Geser pengatur untuk menyesuaikan ukuran teks, jarak, dan kontrol ke layar Anda.',
          currentScale: 'Skala saat ini',
          reset: 'Kembalikan ke 100%',
          previewTitle: 'Kartu Pratinjau Langsung',
          previewBody:
            'Judul, lencana, dan tombol berubah ukuran secara proporsional dan langsung.',
          previewAction: 'Contoh Tombol',
        },
        style: {
          title: 'Pilih gaya WeekBox Anda',
          subtitle:
            'Bandingkan kedua gaya secara langsung di belakang layar ini dan pilih yang paling Anda sukai.',
          options: {
            default: {
              title: 'WeekBox Style',
              description:
                'Pengalaman Material 3 Expressive penuh dengan bilah bergelombang, bentuk animasi, dan elemen SVG khusus.',
            },
            home: {
              title: 'WeekBox Home',
              description:
                'Tata letak klasik yang lebih bersih dan sederhana dengan bilah datar, dialog rapi, dan bilah samping minimal.',
            },
          },
        },
        finish: {
          title: 'Semua siap!',
          subtitle:
            'Pengaturan WeekBox selesai dan siap digunakan. Klik Selesai untuk mulai menjelajahi mod dan engine.',
          summaryLanguage: 'Bahasa',
          summaryTheme: 'Tema',
          summaryScale: 'Skala UI',
          summaryStyle: 'Gaya',
        },
      },
      settings: {
        title: 'Pengaturan',
        saveAndClose: 'Simpan & Tutup',
        themeTitle: 'Tema Aplikasi',
        themeSubtitle: 'Pilih Terang, Gelap, atau ikuti tema perangkat',
        lightMode: 'Terang',
        darkMode: 'Gelap',
        systemMode: 'Sistem',
        languageTitle: 'Bahasa',
        languageSubtitle: 'Bahasa tampilan antarmuka',
        scaleTitle: 'Skala Antarmuka',
        scaleSubtitle: 'Atur ukuran keseluruhan UI ({{scale}}%)',
        setupTitle: 'Panduan Awal',
        setupSubtitle: 'Jalankan ulang panduan konfigurasi awal WeekBox',
        restartSetup: 'Buka Setup',
        webInspectorTitle: 'Inspektor Web',
        webInspectorSubtitle: 'Diaktifkan untuk pengembangan dan debugging runtime',
        aboutTitle: 'Tentang WeekBox',
        aboutSubtitle: 'Versi aplikasi, arsitektur, dan info platform',
        viewInfo: 'Lihat Info',
      },
    },
  },
  it: {
    translation: {
      setup: {
        nav: {
          back: 'Indietro',
          next: 'Avanti',
          finish: 'Fine',
          stepLabel: '{{current}}/{{total}}',
        },
        welcome: {
          title: 'Benvenuto su WeekBox, weekboxer.',
          subtitle: 'Configuriamo il tuo ambiente.',
        },
        about: {
          title: "Cos'è WeekBox?",
          description:
            "È un launcher per Friday Night Funkin' (ispirato ai launcher di Minecraft) che ti permette di installare mod, usare qualsiasi engine in qualsiasi versione, monitorare il tempo di gioco e spostare le mod dove vuoi senza limiti. Creato dalla community per la community, guidato da Britex e Malloy.",
          features: {
            mods: 'Mod e Pacchetti',
            engines: 'Ogni Engine e Versione',
            playtime: 'Tempo di Gioco',
            community: 'Guidato dalla Community',
          },
          placeholderCaption: 'Anteprima Area di Lavoro WeekBox',
        },
        language: {
          title: 'Seleziona la tua lingua preferita',
          subtitle:
            "Scegli la lingua dell'interfaccia. La configurazione si aggiorna subito dopo la selezione.",
          selected: 'Selezionato',
        },
        theme: {
          title: "Scegli il tema dell'interfaccia",
          subtitle:
            'Scegli la modalità chiara, scura o lascia decidere al tuo dispositivo.',
          options: {
            light: {
              title: 'Chiaro',
              description: 'Superfici Material 3 luminose e nitide.',
            },
            dark: {
              title: 'Scuro',
              description: 'Superfici scure riposanti per la vista.',
            },
            system: {
              title: 'Sistema',
              description: 'Segue il tema del tuo dispositivo ({{mode}}).',
            },
          },
          modes: {
            light: 'Chiaro',
            dark: 'Scuro',
          },
        },
        scale: {
          title: "Ridimensiona l'interfaccia a piacere",
          subtitle:
            'Trascina il cursore per adattare testi, spaziature e controlli al tuo schermo.',
          currentScale: 'Scala attuale',
          reset: 'Ripristina al 100%',
          previewTitle: 'Scheda di anteprima dal vivo',
          previewBody:
            'Titoli, badge e pulsanti vengono scalati proporzionalmente in tempo reale.',
          previewAction: 'Azione di esempio',
        },
        style: {
          title: 'Scegli il tuo stile WeekBox',
          subtitle:
            'Confronta entrambi gli stili dal vivo sullo sfondo e scegli quello che preferisci.',
          options: {
            default: {
              title: 'WeekBox Style',
              description:
                'Esperienza Material 3 Expressive completa con barre ondulate, forme animate e dettagli SVG.',
            },
            home: {
              title: 'WeekBox Home',
              description:
                'Layout classico più semplice e pulito con barre dritte, finestre sobrie e barra laterale minimale.',
            },
          },
        },
        finish: {
          title: 'È tutto pronto!',
          subtitle:
            'La configurazione di WeekBox è completata. Fai clic su Fine per iniziare a esplorare mod ed engine.',
          summaryLanguage: 'Lingua',
          summaryTheme: 'Tema',
          summaryScale: 'Scala UI',
          summaryStyle: 'Stile',
        },
      },
      settings: {
        title: 'Impostazioni',
        saveAndClose: 'Salva e chiudi',
        themeTitle: "Tema dell'applicazione",
        themeSubtitle: 'Scegli Chiaro, Scuro o segui il tema del dispositivo',
        lightMode: 'Chiaro',
        darkMode: 'Scuro',
        systemMode: 'Sistema',
        languageTitle: 'Lingua',
        languageSubtitle: "Lingua di visualizzazione dell'interfaccia",
        scaleTitle: 'Scala interfaccia',
        scaleSubtitle: "Regola la dimensione generale della UI ({{scale}}%)",
        setupTitle: 'Configurazione iniziale',
        setupSubtitle: 'Riavvia la procedura guidata iniziale di WeekBox',
        restartSetup: 'Apri setup',
        webInspectorTitle: 'Web Inspector',
        webInspectorSubtitle: 'Abilitato per sviluppo e debug a runtime',
        aboutTitle: 'Informazioni su WeekBox',
        aboutSubtitle: 'Versione, architettura e info sulla piattaforma',
        viewInfo: 'Vedi info',
      },
    },
  },
  'pt-BR': {
    translation: {
      setup: {
        nav: {
          back: 'Voltar',
          next: 'Avançar',
          finish: 'Concluir',
          stepLabel: '{{current}}/{{total}}',
        },
        welcome: {
          title: 'Bem-vindo ao WeekBox, weekboxer.',
          subtitle: 'Vamos configurar o seu ambiente.',
        },
        about: {
          title: 'O que é o WeekBox?',
          description:
            "É um launcher de Friday Night Funkin' (inspirado nos launchers de Minecraft) que permite instalar mods, rodar qualquer engine em qualquer versão, acompanhar seu tempo de jogo e mover seus mods para onde quiser sem limites. Feito pela comunidade para a comunidade, liderado por Britex e Malloy.",
          features: {
            mods: 'Mods e Pacotes',
            engines: 'Qualquer Engine e Versão',
            playtime: 'Tempo de Jogo',
            community: 'Feito pela Comunidade',
          },
          placeholderCaption: 'Prévia do WeekBox',
        },
        language: {
          title: 'Selecione seu idioma preferido',
          subtitle:
            'Escolha o idioma da interface. Tudo é atualizado imediatamente após a seleção.',
          selected: 'Selecionado',
        },
        theme: {
          title: 'Escolha o tema da interface',
          subtitle:
            'Escolha o modo claro, escuro ou deixe seu dispositivo decidir automaticamente.',
          options: {
            light: {
              title: 'Claro',
              description: 'Superfícies Material 3 claras e nítidas.',
            },
            dark: {
              title: 'Escuro',
              description: 'Superfícies escuras confortáveis para os olhos.',
            },
            system: {
              title: 'Sistema',
              description: 'Segue a aparência do seu dispositivo ({{mode}}).',
            },
          },
          modes: {
            light: 'Claro',
            dark: 'Escuro',
          },
        },
        scale: {
          title: 'Ajuste a escala da interface',
          subtitle:
            'Arraste o controle deslizante para adaptar textos, espaçamentos e botões à sua tela.',
          currentScale: 'Escala atual',
          reset: 'Redefinir para 100%',
          previewTitle: 'Cartão de pré-visualização',
          previewBody:
            'Títulos, selos e botões são redimensionados proporcionalmente em tempo real.',
          previewAction: 'Botão de exemplo',
        },
        style: {
          title: 'Escolha seu estilo do WeekBox',
          subtitle:
            'Compare os dois estilos ao vivo atrás desta tela e escolha o que você mais gosta.',
          options: {
            default: {
              title: 'WeekBox Style',
              description:
                'Experiência Material 3 Expressive completa com barras onduladas, formas animadas e detalhes em SVG.',
            },
            home: {
              title: 'WeekBox Home',
              description:
                'Layout clássico mais limpo e simples, com barras retas, diálogos diretos e barra lateral minimalista.',
            },
          },
        },
        finish: {
          title: 'Tudo pronto!',
          subtitle:
            'A configuração do WeekBox foi concluída. Clique em Concluir para começar a explorar mods e engines.',
          summaryLanguage: 'Idioma',
          summaryTheme: 'Tema',
          summaryScale: 'Escala UI',
          summaryStyle: 'Estilo',
        },
      },
      settings: {
        title: 'Configurações',
        saveAndClose: 'Salvar e fechar',
        themeTitle: 'Tema do aplicativo',
        themeSubtitle: 'Escolha Claro, Escuro ou siga o tema do dispositivo',
        lightMode: 'Claro',
        darkMode: 'Escuro',
        systemMode: 'Sistema',
        languageTitle: 'Idioma',
        languageSubtitle: 'Idioma de exibição da interface',
        scaleTitle: 'Escala da interface',
        scaleSubtitle: 'Ajustar tamanho geral da UI ({{scale}}%)',
        setupTitle: 'Assistente de boas-vindas',
        setupSubtitle: 'Executar novamente a configuração inicial do WeekBox',
        restartSetup: 'Abrir setup',
        webInspectorTitle: 'Inspetor Web',
        webInspectorSubtitle: 'Ativado para desenvolvimento e depuração em execução',
        aboutTitle: 'Sobre o WeekBox',
        aboutSubtitle: 'Versão do app, arquitetura e informações da plataforma',
        viewInfo: 'Ver info',
      },
    },
  },
  de: {
    translation: {
      setup: {
        nav: {
          back: 'Zurück',
          next: 'Weiter',
          finish: 'Fertig',
          stepLabel: '{{current}}/{{total}}',
        },
        welcome: {
          title: 'Willkommen bei WeekBox, Weekboxer.',
          subtitle: 'Lass uns dein Setup einrichten.',
        },
        about: {
          title: 'Was ist WeekBox?',
          description:
            "Ein Launcher für Friday Night Funkin' (inspiriert von Minecraft-Launchern), mit dem du Mods installieren, jede Engine in jeder Version starten, deine Spielzeit erfassen und Mods grenzenlos verschieben kannst. Von der Community für die Community, geleitet von Britex und Malloy.",
          features: {
            mods: 'Mods & Pakete',
            engines: 'Jede Engine & Version',
            playtime: 'Spielzeiterfassung',
            community: 'Community-geführt',
          },
          placeholderCaption: 'WeekBox-Vorschau',
        },
        language: {
          title: 'Wähle deine bevorzugte Sprache',
          subtitle:
            'Wähle die Sprache der Oberfläche. Das Setup aktualisiert sich direkt nach der Auswahl.',
          selected: 'Ausgewählt',
        },
        theme: {
          title: 'Wähle dein UI-Design',
          subtitle:
            'Wähle den hellen Modus, den dunklen Modus oder lass dein Gerät automatisch entscheiden.',
          options: {
            light: {
              title: 'Hell',
              description: 'Klare, helle Material-3-Oberflächen.',
            },
            dark: {
              title: 'Dunkel',
              description: 'Augenschonende, blendfreie dunkle Oberflächen.',
            },
            system: {
              title: 'System',
              description: 'Passt sich deinem Gerät an ({{mode}}).',
            },
          },
          modes: {
            light: 'Hell',
            dark: 'Dunkel',
          },
        },
        scale: {
          title: 'UI-Skalierung nach Wunsch anpassen',
          subtitle:
            'Ziehe den Schieberegler, um Text, Abstände und Steuerelemente an deinen Bildschirm anzupassen.',
          currentScale: 'Aktuelle Skalierung',
          reset: 'Auf 100 % zurücksetzen',
          previewTitle: 'Live-Vorschaukarte',
          previewBody:
            'Titel, Badges und Schaltflächen skalieren proportional in Echtzeit.',
          previewAction: 'Beispiel-Aktion',
        },
        style: {
          title: 'Wähle deinen WeekBox-Stil',
          subtitle:
            'Vergleiche beide Stile live im Hintergrund und wähle deinen Favoriten.',
          options: {
            default: {
              title: 'WeekBox Style',
              description:
                'Volles Material-3-Expressive-Erlebnis mit wellenförmigem Fortschritt, animierten Formen und eigenem SVG-Design.',
            },
            home: {
              title: 'WeekBox Home',
              description:
                'Schlichteres, klassisches Layout mit geraden Fortschrittsbalken, klaren Dialogen und minimaler Seitenleiste.',
            },
          },
        },
        finish: {
          title: 'Alles bereit!',
          subtitle:
            'Dein WeekBox-Setup ist abgeschlossen. Klicke auf Fertig, um Mods und Engines zu entdecken.',
          summaryLanguage: 'Sprache',
          summaryTheme: 'Design',
          summaryScale: 'UI-Skalierung',
          summaryStyle: 'Stil',
        },
      },
      settings: {
        title: 'Einstellungen',
        saveAndClose: 'Speichern & Schließen',
        themeTitle: 'App-Design',
        themeSubtitle: 'Wähle Hell, Dunkel oder folge deinem Gerät',
        lightMode: 'Hell',
        darkMode: 'Dunkel',
        systemMode: 'System',
        languageTitle: 'Sprache',
        languageSubtitle: 'Anzeigesprache der Benutzeroberfläche',
        scaleTitle: 'Oberflächen-Skalierung',
        scaleSubtitle: 'Gesamtgröße der UI anpassen ({{scale}}%)',
        setupTitle: 'Einrichtungsassistent',
        setupSubtitle: 'Ersteinrichtung von WeekBox erneut starten',
        restartSetup: 'Setup öffnen',
        webInspectorTitle: 'Web-Inspektor',
        webInspectorSubtitle: 'Für Entwicklung und Debugging zur Laufzeit aktiviert',
        aboutTitle: 'Über WeekBox',
        aboutSubtitle: 'App-Version, Architektur und Plattforminfos',
        viewInfo: 'Infos anzeigen',
      },
    },
  },
} as const
